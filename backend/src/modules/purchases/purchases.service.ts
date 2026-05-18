import {
  Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Purchase } from './entities/purchase.entity';
import { PurchaseItem } from './entities/purchase-item.entity';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { StockService } from '../stock/stock.service';
import { LedgerService } from '../ledger/ledger.service';
import { PurchaseStatus } from '@autoparts/shared-types';
import { generateInvoiceNumber } from '@autoparts/utils';

@Injectable()
export class PurchasesService {
  constructor(
    @InjectRepository(Purchase) private readonly repo: Repository<Purchase>,
    @InjectRepository(PurchaseItem) private readonly itemRepo: Repository<PurchaseItem>,
    private readonly stockService: StockService,
    private readonly ledgerService: LedgerService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreatePurchaseDto, createdById?: string): Promise<Purchase> {
    const result = await this.dataSource.transaction(async (manager) => {
      const items: PurchaseItem[] = dto.items.map((i) => {
        const total = i.quantity * i.unitPrice;
        return manager.create(PurchaseItem, { ...i, total });
      });

      const subtotal = items.reduce((sum, i) => sum + Number(i.total), 0);
      const discount = dto.discount ?? 0;
      const tax = dto.tax ?? 0;
      const netTotal = subtotal - discount + tax;
      const paidAmount = dto.paidAmount ?? 0;
      const invoiceNo = generateInvoiceNumber('PUR');

      const purchase = await manager.save(
        manager.create(Purchase, {
          supplierId: dto.supplierId,
          invoiceNo,
          date: new Date(dto.date),
          total: subtotal,
          discount,
          tax,
          netTotal,
          paidAmount,
          paymentMethod: dto.paymentMethod,
          notes: dto.notes ?? null,
          items,
          createdById,
          status: PurchaseStatus.PENDING,
        }),
      );

      return manager.findOne(Purchase, {
        where: { id: purchase.id },
        relations: ['supplier', 'items', 'items.part', 'items.location', 'createdBy'],
      }) as Promise<Purchase>;
    });

    if (dto.supplierId) {
      const unpaid = parseFloat(String(result.netTotal)) - parseFloat(String(result.paidAmount));
      if (unpaid > 0) {
        await this.ledgerService.recordCreditPurchase(dto.supplierId, unpaid, result.id);
      }
    }

    return result;
  }

  async findAll(page = 1, limit = 20, supplierId?: string, status?: string, from?: string, to?: string) {
    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.supplier', 'supplier')
      .leftJoinAndSelect('p.items', 'items')
      .leftJoinAndSelect('items.part', 'part')
      .orderBy('p.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (supplierId) qb.andWhere('p.supplierId = :supplierId', { supplierId });
    if (status) qb.andWhere('p.status = :status', { status });
    if (from) qb.andWhere('DATE(p.createdAt) >= :from', { from });
    if (to) qb.andWhere('DATE(p.createdAt) <= :to', { to });

    const [items, total] = await qb.getManyAndCount();
    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string): Promise<Purchase> {
    const p = await this.repo.findOne({
      where: { id },
      relations: ['supplier', 'items', 'items.part', 'items.location', 'createdBy'],
    });
    if (!p) throw new NotFoundException(`Purchase ${id} not found.`);
    return p;
  }

  async receive(id: string, userId?: string): Promise<Purchase> {
    const purchase = await this.findOne(id);

    if (purchase.status === PurchaseStatus.RECEIVED) {
      throw new UnprocessableEntityException('Purchase has already been received.');
    }
    if (purchase.status === PurchaseStatus.CANCELLED) {
      throw new UnprocessableEntityException('Cannot receive a cancelled purchase.');
    }

    for (const item of purchase.items) {
      if (!item.locationId) {
        throw new UnprocessableEntityException(
          `Part "${item.part?.nameEn ?? item.partId}" has no destination location set.`,
        );
      }
      await this.stockService.addStock(
        item.partId,
        item.locationId,
        item.quantity,
        purchase.id,
        userId,
        `Received from ${purchase.invoiceNo}`,
      );
    }

    purchase.status = PurchaseStatus.RECEIVED;
    return this.repo.save(purchase);
  }

  async cancel(id: string): Promise<Purchase> {
    const purchase = await this.findOne(id);

    if (purchase.status === PurchaseStatus.RECEIVED) {
      throw new UnprocessableEntityException('Cannot cancel a received purchase.');
    }
    if (purchase.status === PurchaseStatus.CANCELLED) {
      throw new UnprocessableEntityException('Purchase is already cancelled.');
    }

    purchase.status = PurchaseStatus.CANCELLED;
    return this.repo.save(purchase);
  }
}
