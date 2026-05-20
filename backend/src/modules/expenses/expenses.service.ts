import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense) private readonly repo: Repository<Expense>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateExpenseDto, shopId?: string | null, createdById?: string, branchId?: string | null): Promise<Expense> {
    const expense = await this.repo.save(this.repo.create({ ...dto, shopId: shopId ?? null, createdById, branchId: branchId ?? null }));
    void this.auditService.log({
      userId: createdById,
      shopId: shopId ?? null,
      action: 'CREATE',
      resourceType: 'expense',
      resourceId: expense.id,
      newData: { category: expense.category, amount: expense.amount, description: expense.description },
    });
    return expense;
  }

  async findAll(shopId?: string | null, page = 1, limit = 20, category?: string, from?: string, to?: string, branchId?: string) {
    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.createdBy', 'createdBy')
      .orderBy('e.date', 'DESC')
      .addOrderBy('e.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (shopId) qb.andWhere('e.shopId = :shopId', { shopId });
    if (category) qb.andWhere('e.category = :category', { category });
    if (from) qb.andWhere('e.date >= :from', { from });
    if (to) qb.andWhere('e.date <= :to', { to });
    if (branchId) qb.andWhere('e.branchId = :branchId', { branchId });

    const [items, total] = await qb.getManyAndCount();
    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string): Promise<Expense> {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException(`Expense ${id} not found.`);
    return e;
  }

  async update(id: string, dto: UpdateExpenseDto, requesterId?: string): Promise<Expense> {
    const e = await this.findOne(id);
    const oldData = { category: e.category, amount: e.amount, description: e.description };
    Object.assign(e, dto);
    const saved = await this.repo.save(e);
    void this.auditService.log({
      userId: requesterId,
      shopId: e.shopId ?? null,
      action: 'UPDATE',
      resourceType: 'expense',
      resourceId: id,
      oldData,
      newData: { category: saved.category, amount: saved.amount, description: saved.description },
    });
    return saved;
  }

  async remove(id: string, requesterId?: string): Promise<{ message: string }> {
    const e = await this.findOne(id);
    const oldData = { category: e.category, amount: e.amount, description: e.description };
    await this.repo.remove(e);
    void this.auditService.log({
      userId: requesterId,
      shopId: e.shopId ?? null,
      action: 'DELETE',
      resourceType: 'expense',
      resourceId: id,
      oldData,
    });
    return { message: 'Expense deleted.' };
  }

  async getSummary(shopId?: string | null) {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);

    const baseQb = () => {
      const qb = this.repo.createQueryBuilder('e');
      if (shopId) qb.andWhere('e.shopId = :shopId', { shopId });
      return qb;
    };

    const [monthly, yearly, byCategory] = await Promise.all([
      baseQb()
        .select('COALESCE(SUM(e.amount), 0)', 'total')
        .addSelect('COUNT(*)', 'count')
        .andWhere('e.date >= :from AND e.date <= :to', { from: monthStart, to: today })
        .getRawOne<{ total: string; count: string }>(),

      baseQb()
        .select('COALESCE(SUM(e.amount), 0)', 'total')
        .addSelect('COUNT(*)', 'count')
        .andWhere('e.date >= :from AND e.date <= :to', { from: yearStart, to: today })
        .getRawOne<{ total: string; count: string }>(),

      baseQb()
        .select('e.category', 'category')
        .addSelect('COALESCE(SUM(e.amount), 0)', 'total')
        .addSelect('COUNT(*)', 'count')
        .andWhere('e.date >= :from AND e.date <= :to', { from: yearStart, to: today })
        .groupBy('e.category')
        .orderBy('total', 'DESC')
        .getRawMany<{ category: string; total: string; count: string }>(),
    ]);

    return {
      monthly: {
        total: parseFloat(monthly?.total ?? '0'),
        count: parseInt(monthly?.count ?? '0', 10),
      },
      yearly: {
        total: parseFloat(yearly?.total ?? '0'),
        count: parseInt(yearly?.count ?? '0', 10),
      },
      byCategory: byCategory.map((r) => ({
        category: r.category,
        total: parseFloat(r.total),
        count: parseInt(r.count, 10),
      })),
    };
  }
}
