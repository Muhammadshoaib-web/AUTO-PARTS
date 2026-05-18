import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { Stock } from '../stock/entities/stock.entity';
import { StockMovement } from '../stock/entities/stock-movement.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleStatus, StockMovementType } from '@autoparts/shared-types';
import { generateInvoiceNumber } from '@autoparts/utils';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale) private readonly saleRepo: Repository<Sale>,
    @InjectRepository(SaleItem) private readonly itemRepo: Repository<SaleItem>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateSaleDto, createdById?: string): Promise<Sale> {
    return this.dataSource.transaction(async (manager) => {
      const items: SaleItem[] = [];
      let subtotal = 0;

      for (const itemDto of dto.items) {
        const unitPrice = itemDto.unitPrice;
        const discountPct = itemDto.discountPct ?? 0;
        const lineTotal = itemDto.quantity * unitPrice * (1 - discountPct / 100);
        subtotal += lineTotal;

        const stock = await manager.findOne(Stock, {
          where: { partId: itemDto.partId },
          order: { quantity: 'DESC' },
        });
        if (!stock || stock.quantity < itemDto.quantity) {
          throw new UnprocessableEntityException(
            `Insufficient stock for part ${itemDto.partId}. Available: ${stock?.quantity ?? 0}`,
          );
        }
        stock.quantity -= itemDto.quantity;
        await manager.save(stock);

        await manager.save(
          manager.create(StockMovement, {
            partId: itemDto.partId,
            fromLocationId: stock.locationId,
            quantity: itemDto.quantity,
            type: StockMovementType.OUT,
            createdById,
          }),
        );

        items.push(manager.create(SaleItem, { ...itemDto, unitPrice, discountPct, total: lineTotal }));
      }

      const discount = dto.discount ?? 0;
      const tax = dto.tax ?? 0;
      const netTotal = subtotal - discount + tax;
      const paidAmount = dto.paidAmount ?? netTotal;
      const changeAmount = Math.max(0, paidAmount - netTotal);
      const invoiceNo = generateInvoiceNumber('INV');

      const sale = await manager.save(
        manager.create(Sale, {
          customerId: dto.customerId,
          paymentMethod: dto.paymentMethod,
          invoiceNo,
          date: new Date(),
          total: subtotal,
          discount,
          tax,
          netTotal,
          paidAmount,
          changeAmount,
          items,
          createdById,
          status: SaleStatus.COMPLETED,
        }),
      );
      return manager.findOne(Sale, {
        where: { id: sale.id },
        relations: ['customer', 'items', 'items.part', 'createdBy'],
      }) as Promise<Sale>;
    });
  }

  async findAll(page = 1, limit = 20, from?: string, to?: string, status?: string) {
    const qb = this.saleRepo
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.customer', 'customer')
      .leftJoinAndSelect('sale.items', 'items')
      .leftJoinAndSelect('items.part', 'part')
      .leftJoinAndSelect('sale.createdBy', 'createdBy')
      .orderBy('sale.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (from) qb.andWhere('DATE(sale.createdAt) >= :from', { from });
    if (to) qb.andWhere('DATE(sale.createdAt) <= :to', { to });
    if (status) qb.andWhere('sale.status = :status', { status });

    const [items, total] = await qb.getManyAndCount();
    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string): Promise<Sale> {
    const s = await this.saleRepo.findOne({
      where: { id },
      relations: ['customer', 'items', 'items.part', 'createdBy'],
    });
    if (!s) throw new NotFoundException(`Sale ${id} not found.`);
    return s;
  }

  async cancel(id: string): Promise<Sale> {
    return this.dataSource.transaction(async (manager) => {
      const sale = await manager.findOne(Sale, { where: { id }, relations: ['items'] });
      if (!sale) throw new NotFoundException(`Sale ${id} not found.`);
      if (sale.status === SaleStatus.CANCELLED) {
        throw new UnprocessableEntityException('Sale is already cancelled.');
      }
      if (sale.status === SaleStatus.REFUNDED) {
        throw new UnprocessableEntityException('Cannot cancel a refunded sale.');
      }

      for (const item of sale.items) {
        const stock = await manager.findOne(Stock, {
          where: { partId: item.partId },
          order: { quantity: 'DESC' },
        });
        if (stock) {
          stock.quantity += item.quantity;
          await manager.save(stock);
          await manager.save(
            manager.create(StockMovement, {
              partId: item.partId,
              toLocationId: stock.locationId,
              quantity: item.quantity,
              type: StockMovementType.RETURN,
              notes: `Cancelled sale ${sale.invoiceNo}`,
            }),
          );
        }
      }

      sale.status = SaleStatus.CANCELLED;
      return manager.save(sale);
    });
  }

  async getDailySummary(): Promise<{ total: number; count: number }> {
    const today = new Date().toISOString().slice(0, 10);
    const result = await this.saleRepo
      .createQueryBuilder('sale')
      .select('COALESCE(SUM(sale.netTotal), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('DATE(sale.createdAt) = :today', { today })
      .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
      .getRawOne<{ total: string; count: string }>();
    return { total: parseFloat(result?.total ?? '0'), count: parseInt(result?.count ?? '0', 10) };
  }
}
