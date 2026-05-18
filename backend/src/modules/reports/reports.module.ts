import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from '../sales/entities/sale.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { Purchase } from '../purchases/entities/purchase.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { Stock } from '../stock/entities/stock.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, SaleItem, Purchase, Expense, Stock])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
