import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { LedgerEntryType, LedgerEntityType } from '@autoparts/shared-types';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Customer } from '../customers/entities/customer.entity';

export interface CreateAuditDto {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  ipAddress?: string;
}

@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(LedgerEntry) private readonly repo: Repository<LedgerEntry>,
    @InjectRepository(Supplier)    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(Customer)    private readonly customerRepo: Repository<Customer>,
    private readonly dataSource: DataSource,
  ) {}

  async getBalance(entityType: LedgerEntityType, entityId: string): Promise<number> {
    const last = await this.repo.findOne({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
    });
    return last?.balanceAfter ?? 0;
  }

  async addEntry(
    entityType: LedgerEntityType,
    entityId: string,
    type: LedgerEntryType,
    amount: number,
    referenceType: string,
    referenceId?: string,
    notes?: string,
  ): Promise<LedgerEntry> {
    const currentBalance = await this.getBalance(entityType, entityId);
    const balanceAfter =
      type === LedgerEntryType.DEBIT ? currentBalance + amount : currentBalance - amount;

    return this.repo.save(
      this.repo.create({ entityType, entityId, type, amount, referenceType, referenceId, balanceAfter, notes }),
    );
  }

  getLedger(entityType: LedgerEntityType, entityId: string): Promise<LedgerEntry[]> {
    return this.repo.find({ where: { entityType, entityId }, order: { createdAt: 'ASC' } });
  }

  async getSummary(shopId?: string | null) {
    const payablesQb = this.supplierRepo
      .createQueryBuilder('s')
      .select('COALESCE(SUM(CAST(s.balance AS DECIMAL)), 0)', 'total')
      .where('s.isActive = true AND s.balance > 0');
    if (shopId) payablesQb.andWhere('s.shopId = :shopId', { shopId });

    const receivablesQb = this.customerRepo
      .createQueryBuilder('c')
      .select('COALESCE(SUM(CAST(c.balance AS DECIMAL)), 0)', 'total')
      .where('c.isActive = true AND c.balance > 0');
    if (shopId) receivablesQb.andWhere('c.shopId = :shopId', { shopId });

    const [payables, receivables] = await Promise.all([
      payablesQb.getRawOne<{ total: string }>(),
      receivablesQb.getRawOne<{ total: string }>(),
    ]);

    const totalPayables    = parseFloat(payables?.total   ?? '0');
    const totalReceivables = parseFloat(receivables?.total ?? '0');
    return {
      totalPayables,
      totalReceivables,
      netPosition: totalReceivables - totalPayables,
    };
  }

  async getSuppliers(shopId?: string | null, q?: string, page = 1, limit = 30) {
    const qb = this.supplierRepo
      .createQueryBuilder('s')
      .where('s.isActive = true')
      .orderBy('CAST(s.balance AS DECIMAL)', 'DESC')
      .addOrderBy('s.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (shopId) qb.andWhere('s.shopId = :shopId', { shopId });
    if (q) qb.andWhere('(s.name ILIKE :q OR s.phone ILIKE :q OR s.email ILIKE :q)', { q: `%${q}%` });

    const [items, total] = await qb.getManyAndCount();
    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getCustomers(shopId?: string | null, q?: string, page = 1, limit = 30) {
    const qb = this.customerRepo
      .createQueryBuilder('c')
      .where('c.isActive = true')
      .orderBy('CAST(c.balance AS DECIMAL)', 'DESC')
      .addOrderBy('c.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (shopId) qb.andWhere('c.shopId = :shopId', { shopId });
    if (q) qb.andWhere('(c.name ILIKE :q OR c.phone ILIKE :q OR c.email ILIKE :q)', { q: `%${q}%` });

    const [items, total] = await qb.getManyAndCount();
    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getEntries(entityType: LedgerEntityType, entityId: string, page = 1, limit = 25) {
    const [items, total] = await this.repo.findAndCount({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async recordCreditPurchase(supplierId: string, amount: number, purchaseId: string): Promise<void> {
    if (amount <= 0) return;
    const supplier = await this.supplierRepo.findOne({ where: { id: supplierId }, select: ['id', 'balance'] });
    if (!supplier) return;
    const currentBalance = parseFloat(String(supplier.balance));
    const newBalance = parseFloat((currentBalance + amount).toFixed(2));
    await this.repo.save(this.repo.create({
      entityType:    LedgerEntityType.SUPPLIER,
      entityId:      supplierId,
      type:          LedgerEntryType.DEBIT,
      amount,
      referenceType: 'purchase',
      referenceId:   purchaseId,
      balanceAfter:  newBalance,
      notes:         null,
    }));
    await this.supplierRepo.update(supplierId, { balance: newBalance });
  }

  async recordCreditSale(customerId: string, amount: number, saleId: string): Promise<void> {
    if (amount <= 0) return;
    const customer = await this.customerRepo.findOne({ where: { id: customerId }, select: ['id', 'balance'] });
    if (!customer) return;
    const currentBalance = parseFloat(String(customer.balance));
    const newBalance = parseFloat((currentBalance + amount).toFixed(2));
    await this.repo.save(this.repo.create({
      entityType:    LedgerEntityType.CUSTOMER,
      entityId:      customerId,
      type:          LedgerEntryType.DEBIT,
      amount,
      referenceType: 'sale',
      referenceId:   saleId,
      balanceAfter:  newBalance,
      notes:         null,
    }));
    await this.customerRepo.update(customerId, { balance: newBalance });
  }

  async recordSupplierPayment(supplierId: string, amount: number, notes?: string) {
    const supplier = await this.supplierRepo.findOne({ where: { id: supplierId } });
    if (!supplier) throw new NotFoundException(`Supplier ${supplierId} not found.`);
    if (amount > supplier.balance) {
      throw new UnprocessableEntityException(
        `Payment amount (${amount}) exceeds outstanding balance (${supplier.balance}).`,
      );
    }

    return this.dataSource.transaction(async (em) => {
      const newBalance = parseFloat(String(supplier.balance)) - amount;
      const entry = em.create(LedgerEntry, {
        entityType:    LedgerEntityType.SUPPLIER,
        entityId:      supplierId,
        type:          LedgerEntryType.CREDIT,
        amount,
        referenceType: 'payment',
        balanceAfter:  newBalance,
        notes:         notes ?? null,
      });
      await em.save(entry);
      await em.update(Supplier, supplierId, { balance: newBalance });
      return { message: 'Payment recorded.', newBalance, entry };
    });
  }

  async recordCustomerPayment(customerId: string, amount: number, notes?: string) {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException(`Customer ${customerId} not found.`);
    if (amount > customer.balance) {
      throw new UnprocessableEntityException(
        `Payment amount (${amount}) exceeds outstanding balance (${customer.balance}).`,
      );
    }

    return this.dataSource.transaction(async (em) => {
      const newBalance = parseFloat(String(customer.balance)) - amount;
      const entry = em.create(LedgerEntry, {
        entityType:    LedgerEntityType.CUSTOMER,
        entityId:      customerId,
        type:          LedgerEntryType.CREDIT,
        amount,
        referenceType: 'payment',
        balanceAfter:  newBalance,
        notes:         notes ?? null,
      });
      await em.save(entry);
      await em.update(Customer, customerId, { balance: newBalance });
      return { message: 'Payment recorded.', newBalance, entry };
    });
  }
}
