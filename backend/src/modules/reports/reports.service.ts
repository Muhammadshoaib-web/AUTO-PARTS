import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Sale } from '../sales/entities/sale.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { Stock } from '../stock/entities/stock.entity';
import { SaleStatus } from '@autoparts/shared-types';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Sale) private readonly saleRepo: Repository<Sale>,
    @InjectRepository(SaleItem) private readonly saleItemRepo: Repository<SaleItem>,
    @InjectRepository(Expense) private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(Stock) private readonly stockRepo: Repository<Stock>,
  ) {}

  async salesReport(from: Date, to: Date) {
    return this.saleRepo.find({
      where: { createdAt: Between(from, to), status: SaleStatus.COMPLETED },
      relations: ['customer', 'items', 'items.part'],
      order: { createdAt: 'ASC' },
    });
  }

  async stockValuation() {
    return this.stockRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.part', 'part')
      .leftJoinAndSelect('s.location', 'location')
      .select([
        's.id', 'part.id', 'part.nameEn', 'part.buyPrice', 'part.sellPrice',
        's.quantity', 'location.name',
        '(s.quantity * part.buyPrice) AS costValue',
        '(s.quantity * part.sellPrice) AS retailValue',
      ])
      .where('s.quantity > 0')
      .getRawMany();
  }

  async topSellingParts(from: Date, to: Date, limit: number = 10) {
    return this.saleItemRepo
      .createQueryBuilder('si')
      .leftJoin('si.sale', 'sale')
      .leftJoinAndSelect('si.part', 'part')
      .select(['part.id', 'part.nameEn', 'SUM(si.quantity) AS totalQty', 'SUM(si.total) AS totalRevenue'])
      .where('sale.createdAt BETWEEN :from AND :to', { from, to })
      .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
      .groupBy('part.id')
      .orderBy('totalQty', 'DESC')
      .limit(limit)
      .getRawMany();
  }
}
