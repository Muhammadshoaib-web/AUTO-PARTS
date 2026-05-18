import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sale } from '../sales/entities/sale.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { Purchase } from '../purchases/entities/purchase.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { Stock } from '../stock/entities/stock.entity';
import { PurchaseStatus, SaleStatus } from '@autoparts/shared-types';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Sale)     private readonly saleRepo: Repository<Sale>,
    @InjectRepository(SaleItem) private readonly saleItemRepo: Repository<SaleItem>,
    @InjectRepository(Purchase) private readonly purchaseRepo: Repository<Purchase>,
    @InjectRepository(Expense)  private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(Stock)    private readonly stockRepo: Repository<Stock>,
  ) {}

  // ── Overview (single call for the dashboard) ────────────────────────────

  async getOverview() {
    const now  = new Date();
    const today      = now.toISOString().slice(0, 10);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const yearStart  = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);

    const [todayRow, monthRow, yearRow, expRow, purRow, lowStock, stockVal] = await Promise.all([
      this.saleRepo.createQueryBuilder('s')
        .select('COALESCE(SUM(s.netTotal),0)', 'revenue').addSelect('COUNT(*)', 'count')
        .where('DATE(s.createdAt) = :d', { d: today })
        .andWhere('s.status = :st', { st: SaleStatus.COMPLETED })
        .getRawOne<{ revenue: string; count: string }>(),

      this.saleRepo.createQueryBuilder('s')
        .select('COALESCE(SUM(s.netTotal),0)', 'revenue').addSelect('COUNT(*)', 'count')
        .where('DATE(s.createdAt) BETWEEN :from AND :to', { from: monthStart, to: today })
        .andWhere('s.status = :st', { st: SaleStatus.COMPLETED })
        .getRawOne<{ revenue: string; count: string }>(),

      this.saleRepo.createQueryBuilder('s')
        .select('COALESCE(SUM(s.netTotal),0)', 'revenue').addSelect('COUNT(*)', 'count')
        .where('DATE(s.createdAt) BETWEEN :from AND :to', { from: yearStart, to: today })
        .andWhere('s.status = :st', { st: SaleStatus.COMPLETED })
        .getRawOne<{ revenue: string; count: string }>(),

      this.expenseRepo.createQueryBuilder('e')
        .select('COALESCE(SUM(e.amount),0)', 'total')
        .where('e.date BETWEEN :from AND :to', { from: monthStart, to: today })
        .getRawOne<{ total: string }>(),

      this.purchaseRepo.createQueryBuilder('p')
        .select('COALESCE(SUM(p.netTotal),0)', 'total')
        .where('DATE(p.createdAt) BETWEEN :from AND :to', { from: monthStart, to: today })
        .andWhere('p.status != :st', { st: PurchaseStatus.CANCELLED })
        .getRawOne<{ total: string }>(),

      this.stockRepo.createQueryBuilder('s')
        .leftJoin('s.part', 'part')
        .where('s.quantity > 0').andWhere('s.quantity <= part.minStock')
        .getCount(),

      this.stockRepo.createQueryBuilder('s')
        .leftJoin('s.part', 'part')
        .select('COALESCE(SUM(CAST(s.quantity AS DECIMAL) * CAST(part.buyPrice AS DECIMAL)),0)', 'costValue')
        .addSelect('COALESCE(SUM(CAST(s.quantity AS DECIMAL) * CAST(part.sellPrice AS DECIMAL)),0)', 'retailValue')
        .where('s.quantity > 0')
        .getRawOne<{ costValue: string; retailValue: string }>(),
    ]);

    const monthRevenue  = parseFloat(monthRow?.revenue  ?? '0');
    const monthExpenses = parseFloat(expRow?.total      ?? '0');

    return {
      today:          { revenue: parseFloat(todayRow?.revenue ?? '0'), orders: parseInt(todayRow?.count  ?? '0', 10) },
      month:          { revenue: monthRevenue,                          orders: parseInt(monthRow?.count  ?? '0', 10) },
      year:           { revenue: parseFloat(yearRow?.revenue  ?? '0'), orders: parseInt(yearRow?.count   ?? '0', 10) },
      monthExpenses,
      monthPurchases: parseFloat(purRow?.total ?? '0'),
      grossProfitMonth: monthRevenue - monthExpenses,
      lowStockCount:  lowStock,
      stock: {
        costValue:   parseFloat(stockVal?.costValue   ?? '0'),
        retailValue: parseFloat(stockVal?.retailValue ?? '0'),
      },
    };
  }

  // ── Daily sales trend ───────────────────────────────────────────────────

  async getSalesTrend(from: string, to: string) {
    const rows = await this.saleRepo
      .createQueryBuilder('s')
      .select('DATE(s.createdAt)', 'date')
      .addSelect('COALESCE(SUM(s.netTotal),0)', 'revenue')
      .addSelect('COUNT(*)', 'orders')
      .where('DATE(s.createdAt) BETWEEN :from AND :to', { from, to })
      .andWhere('s.status = :st', { st: SaleStatus.COMPLETED })
      .groupBy('DATE(s.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; revenue: string; orders: string }>();

    return rows.map((r) => ({
      date:    r.date,
      revenue: parseFloat(r.revenue),
      orders:  parseInt(r.orders, 10),
    }));
  }

  // ── Profit & Loss ───────────────────────────────────────────────────────

  async getProfitLoss(from: string, to: string) {
    const [salesRow, expRow, purRow] = await Promise.all([
      this.saleRepo.createQueryBuilder('s')
        .select('COALESCE(SUM(s.netTotal),0)', 'revenue')
        .where('DATE(s.createdAt) BETWEEN :from AND :to', { from, to })
        .andWhere('s.status = :st', { st: SaleStatus.COMPLETED })
        .getRawOne<{ revenue: string }>(),

      this.expenseRepo.createQueryBuilder('e')
        .select('COALESCE(SUM(e.amount),0)', 'total')
        .addSelect('e.category', 'category')
        .where('e.date BETWEEN :from AND :to', { from, to })
        .groupBy('e.category')
        .orderBy('total', 'DESC')
        .getRawMany<{ total: string; category: string }>(),

      this.purchaseRepo.createQueryBuilder('p')
        .select('COALESCE(SUM(p.netTotal),0)', 'total')
        .where('DATE(p.createdAt) BETWEEN :from AND :to', { from, to })
        .andWhere('p.status = :st', { st: PurchaseStatus.RECEIVED })
        .getRawOne<{ total: string }>(),
    ]);

    const revenue  = parseFloat(salesRow?.revenue ?? '0');
    const cogs     = parseFloat(purRow?.total     ?? '0');
    const expenses = expRow.reduce((s, r) => s + parseFloat(r.total), 0);
    const grossProfit = revenue - cogs;
    const netProfit   = grossProfit - expenses;

    return {
      revenue,
      cogs,
      grossProfit,
      expenses,
      netProfit,
      expenseBreakdown: expRow.map((r) => ({ category: r.category, total: parseFloat(r.total) })),
    };
  }

  // ── Stock valuation ─────────────────────────────────────────────────────

  async getStockValuation() {
    const rows = await this.stockRepo
      .createQueryBuilder('s')
      .leftJoin('s.part', 'part')
      .leftJoin('s.location', 'location')
      .select('part.nameEn',   'partName')
      .addSelect('part.partNumber', 'partNumber')
      .addSelect('s.quantity', 'quantity')
      .addSelect('part.buyPrice',  'buyPrice')
      .addSelect('part.sellPrice', 'sellPrice')
      .addSelect('location.name',  'locationName')
      .addSelect('CAST(s.quantity AS DECIMAL) * CAST(part.buyPrice AS DECIMAL)',  'costValue')
      .addSelect('CAST(s.quantity AS DECIMAL) * CAST(part.sellPrice AS DECIMAL)', 'retailValue')
      .where('s.quantity > 0')
      .orderBy('costValue', 'DESC')
      .getRawMany<{
        partName: string; partNumber: string; quantity: string;
        buyPrice: string; sellPrice: string; locationName: string;
        costValue: string; retailValue: string;
      }>();

    const items = rows.map((r) => ({
      partName:     r.partName,
      partNumber:   r.partNumber,
      locationName: r.locationName,
      quantity:     parseInt(r.quantity, 10),
      buyPrice:     parseFloat(r.buyPrice),
      sellPrice:    parseFloat(r.sellPrice),
      costValue:    parseFloat(r.costValue),
      retailValue:  parseFloat(r.retailValue),
    }));

    const totalCost   = items.reduce((s, i) => s + i.costValue, 0);
    const totalRetail = items.reduce((s, i) => s + i.retailValue, 0);

    return { items, totalCost, totalRetail, potentialMargin: totalRetail - totalCost };
  }

  // ── Top selling parts ────────────────────────────────────────────────────

  async getTopParts(from: string, to: string, limit = 10) {
    const rows = await this.saleItemRepo
      .createQueryBuilder('si')
      .leftJoin('si.sale', 'sale')
      .leftJoin('si.part', 'part')
      .select('part.nameEn',           'partName')
      .addSelect('part.partNumber',     'partNumber')
      .addSelect('SUM(si.quantity)',    'totalQty')
      .addSelect('SUM(si.total)',       'totalRevenue')
      .where('DATE(sale.createdAt) BETWEEN :from AND :to', { from, to })
      .andWhere('sale.status = :st', { st: SaleStatus.COMPLETED })
      .groupBy('part.id')
      .addGroupBy('part.nameEn')
      .addGroupBy('part.partNumber')
      .orderBy('totalRevenue', 'DESC')
      .limit(limit)
      .getRawMany<{ partName: string; partNumber: string; totalQty: string; totalRevenue: string }>();

    return rows.map((r) => ({
      partName:     r.partName,
      partNumber:   r.partNumber,
      totalQty:     parseInt(r.totalQty, 10),
      totalRevenue: parseFloat(r.totalRevenue),
    }));
  }
}
