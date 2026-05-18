import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(@InjectRepository(Customer) private readonly repo: Repository<Customer>) {}

  create(dto: CreateCustomerDto): Promise<Customer> { return this.repo.save(this.repo.create(dto)); }

  findAll(q?: string): Promise<Customer[]> {
    return this.repo.find({
      where: q ? [{ name: ILike(`%${q}%`), isActive: true }, { phone: ILike(`%${q}%`), isActive: true }] : { isActive: true },
      order: { name: 'ASC' },
    });
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

  async remove(id: string): Promise<void> {
    const c = await this.findOne(id);
    c.isActive = false;
    await this.repo.save(c);
  }

  async adjustBalance(id: string, amount: number): Promise<void> {
    await this.repo.increment({ id }, 'balance', amount);
  }
}
