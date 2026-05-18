import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Purchase } from './entities/purchase.entity';
import { PurchaseItem } from './entities/purchase-item.entity';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { StockService } from '../stock/stock.service';
import { PurchaseStatus } from '@autoparts/shared-types';
import { generateInvoiceNumber } from '@autoparts/utils';

@Injectable()
export class PurchasesService {
  constructor(
    @InjectRepository(Purchase) private readonly repo: Repository<Purchase>,
    @InjectRepository(PurchaseItem) private readonly itemRepo: Repository<PurchaseItem>,
    private readonly stockService: StockService,
  ) {}

  async create(dto: CreatePurchaseDto, createdById?: string): Promise<Purchase> {
    const invoiceNo = generateInvoiceNumber('PUR');
    const items = dto.items.map((i) => this.itemRepo.create(i));
    const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const netTotal = total - (dto.discount ?? 0) + (dto.tax ?? 0);

    const purchase = this.repo.create({
      ...dto,
      invoiceNo,
      total,
      netTotal,
      items,
      createdById,
      status: PurchaseStatus.PENDING,
    });
    return this.repo.save(purchase);
  }

  findAll(): Promise<Purchase[]> {
    return this.repo.find({ relations: ['supplier', 'items', 'items.part'], order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Purchase> {
    const p = await this.repo.findOne({ where: { id }, relations: ['supplier', 'items', 'items.part', 'items.location', 'createdBy'] });
    if (!p) throw new NotFoundException(`Purchase ${id} not found.`);
    return p;
  }

  async receive(id: string, userId?: string): Promise<Purchase> {
    const purchase = await this.findOne(id);
    for (const item of purchase.items) {
      await this.stockService.addStock(item.partId, item.locationId ?? '', item.quantity, id, userId, `Received from purchase ${purchase.invoiceNo}`);
    }
    purchase.status = PurchaseStatus.RECEIVED;
    return this.repo.save(purchase);
  }
}
