import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Purchase } from './entities/purchase.entity';
import { PurchaseItem } from './entities/purchase-item.entity';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { StockModule } from '../stock/stock.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { LedgerModule } from '../ledger/ledger.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Purchase, PurchaseItem]), StockModule, SuppliersModule, LedgerModule, AuditModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
