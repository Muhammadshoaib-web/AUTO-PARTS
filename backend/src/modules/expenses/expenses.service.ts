import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(@InjectRepository(Expense) private readonly repo: Repository<Expense>) {}

  create(dto: CreateExpenseDto, createdById?: string): Promise<Expense> {
    return this.repo.save(this.repo.create({ ...dto, createdById }));
  }

  async findAll(page = 1, limit = 20, category?: string, from?: string, to?: string) {
    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.createdBy', 'createdBy')
      .orderBy('e.date', 'DESC')
      .addOrderBy('e.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (category) qb.andWhere('e.category = :category', { category });
    if (from) qb.andWhere('e.date >= :from', { from });
    if (to) qb.andWhere('e.date <= :to', { to });

    const [items, total] = await qb.getManyAndCount();
    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string): Promise<Expense> {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException(`Expense ${id} not found.`);
    return e;
  }

  async update(id: string, dto: UpdateExpenseDto): Promise<Expense> {
    const e = await this.findOne(id);
    Object.assign(e, dto);
    return this.repo.save(e);
  }

  async remove(id: string): Promise<{ message: string }> {
    const e = await this.findOne(id);
    await this.repo.remove(e);
    return { message: 'Expense deleted.' };
  }

  async getSummary() {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);

    const [monthly, yearly, byCategory] = await Promise.all([
      this.repo
        .createQueryBuilder('e')
        .select('COALESCE(SUM(e.amount), 0)', 'total')
        .addSelect('COUNT(*)', 'count')
        .where('e.date >= :from AND e.date <= :to', { from: monthStart, to: today })
        .getRawOne<{ total: string; count: string }>(),

      this.repo
        .createQueryBuilder('e')
        .select('COALESCE(SUM(e.amount), 0)', 'total')
        .addSelect('COUNT(*)', 'count')
        .where('e.date >= :from AND e.date <= :to', { from: yearStart, to: today })
        .getRawOne<{ total: string; count: string }>(),

      this.repo
        .createQueryBuilder('e')
        .select('e.category', 'category')
        .addSelect('COALESCE(SUM(e.amount), 0)', 'total')
        .addSelect('COUNT(*)', 'count')
        .where('e.date >= :from AND e.date <= :to', { from: yearStart, to: today })
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
