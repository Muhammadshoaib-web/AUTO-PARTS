import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(@InjectRepository(Expense) private readonly repo: Repository<Expense>) {}

  create(dto: CreateExpenseDto, createdById?: string): Promise<Expense> {
    return this.repo.save(this.repo.create({ ...dto, createdById }));
  }

  findAll(): Promise<Expense[]> {
    return this.repo.find({ order: { date: 'DESC' }, take: 200 });
  }
}
