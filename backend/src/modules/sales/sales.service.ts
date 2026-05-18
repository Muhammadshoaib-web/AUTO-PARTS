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
      // Validate and deduct stock for each item (FIFO from first location with enough qty)
      const items: SaleItem[] = [];
      let total = 0;

      for (const itemDto of dto.items) {
        const unitPrice = itemDto.unitPrice;
        const discountPct = itemDto.discountPct ?? 0;
        const lineTotal = itemDto.quantity * unitPrice * (1 - discountPct / 100);
        total += lineTotal;

        // Find stock with sufficient quantity
        const stock = await manager.findOne(Stock, {
          where: { partId: itemDto.partId },
          order: { quantity: 'DESC' },
        });
        if (!stock || stock.quantity < itemDto.quantity) {
          throw new UnprocessableEntityException(`Insufficient stock for part ${itemDto.partId}`);
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
      const netTotal = total - discount + tax;
      const invoiceNo = generateInvoiceNumber('INV');

      const sale = await manager.save(
        manager.create(Sale, {
          ...dto,
          invoiceNo,
          date: new Date(),
          total,
          netTotal,
          items,
          createdById,
          status: SaleStatus.COMPLETED,
        }),
      );
      return sale;
    });
  }

  findAll(): Promise<Sale[]> {
    return this.saleRepo.find({ relations: ['customer', 'items', 'items.part', 'createdBy'], order: { createdAt: 'DESC' }, take: 100 });
  }

  async findOne(id: string): Promise<Sale> {
    const s = await this.saleRepo.findOne({ where: { id }, relations: ['customer', 'items', 'items.part', 'createdBy'] });
    if (!s) throw new NotFoundException(`Sale ${id} not found.`);
    return s;
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
