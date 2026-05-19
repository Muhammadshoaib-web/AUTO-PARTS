import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(@InjectRepository(Supplier) private readonly repo: Repository<Supplier>) {}

  create(dto: CreateSupplierDto, shopId?: string | null): Promise<Supplier> {
    return this.repo.save(this.repo.create({ ...dto, shopId: shopId ?? null }));
  }

  async findAll(shopId?: string | null, q?: string, page = 1, limit = 20) {
    const qb = this.repo
      .createQueryBuilder('s')
      .where('s.isActive = true')
      .orderBy('s.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (shopId) qb.andWhere('s.shopId = :shopId', { shopId });
    if (q) {
      qb.andWhere(
        '(s.name ILIKE :q OR s.phone ILIKE :q OR s.email ILIKE :q OR s.ntn ILIKE :q)',
        { q: `%${q}%` },
      );
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, shopId?: string | null): Promise<Supplier> {
    const s = await this.repo.findOne({ where: { id, ...(shopId ? { shopId } : {}) } });
    if (!s) throw new NotFoundException(`Supplier ${id} not found.`);
    return s;
  }

  async update(id: string, dto: UpdateSupplierDto, shopId?: string | null): Promise<Supplier> {
    const s = await this.findOne(id, shopId);
    Object.assign(s, dto);
    return this.repo.save(s);
  }

  async remove(id: string, shopId?: string | null): Promise<{ message: string }> {
    const s = await this.findOne(id, shopId);
    s.isActive = false;
    await this.repo.save(s);
    return { message: `Supplier "${s.name}" deleted.` };
  }

  async adjustBalance(id: string, amount: number): Promise<void> {
    await this.repo.increment({ id }, 'balance', amount);
  }
}
