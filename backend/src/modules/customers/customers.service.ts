import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(@InjectRepository(Customer) private readonly repo: Repository<Customer>) {}

  create(dto: CreateCustomerDto): Promise<Customer> { return this.repo.save(this.repo.create(dto)); }

  async findAll(q?: string, page = 1, limit = 20) {
    const qb = this.repo
      .createQueryBuilder('c')
      .where('c.isActive = true')
      .orderBy('c.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (q) {
      qb.andWhere(
        '(c.name ILIKE :q OR c.phone ILIKE :q OR c.email ILIKE :q OR c.cnic ILIKE :q OR c.ntn ILIKE :q)',
        { q: `%${q}%` },
      );
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string): Promise<Customer> {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException(`Customer ${id} not found.`);
    return c;
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    const c = await this.findOne(id);
    Object.assign(c, dto);
    return this.repo.save(c);
  }

  async remove(id: string): Promise<{ message: string }> {
    const c = await this.findOne(id);
    c.isActive = false;
    await this.repo.save(c);
    return { message: `Customer "${c.name}" deleted.` };
  }

  async adjustBalance(id: string, amount: number): Promise<void> {
    await this.repo.increment({ id }, 'balance', amount);
  }
}
