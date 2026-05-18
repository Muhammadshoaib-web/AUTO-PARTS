import {
  Body, Controller, Get, Param, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@autoparts/shared-types';
import { LedgerEntityType } from '@autoparts/shared-types';
import { LedgerService } from './ledger.service';
import { RecordPaymentDto } from './dto/record-payment.dto';

@ApiTags('Ledger')
@ApiBearerAuth('access-token')
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
@Controller({ path: 'ledger', version: '1' })
export class LedgerController {
  constructor(private readonly svc: LedgerService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Total payables, receivables and net position' })
  getSummary() {
    return this.svc.getSummary();
  }

  @Get('suppliers')
  @ApiOperation({ summary: 'Suppliers with outstanding balance (payables)' })
  getSuppliers(
    @Query('q')     q?: string,
    @Query('page')  page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.getSuppliers(q, page ? +page : 1, limit ? +limit : 30);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Customers with outstanding balance (receivables)' })
  getCustomers(
    @Query('q')     q?: string,
    @Query('page')  page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.getCustomers(q, page ? +page : 1, limit ? +limit : 30);
  }

  @Get('suppliers/:id/entries')
  @ApiOperation({ summary: 'Paginated ledger entries for a supplier' })
  getSupplierEntries(
    @Param('id')    id: string,
    @Query('page')  page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.getEntries(LedgerEntityType.SUPPLIER, id, page ? +page : 1, limit ? +limit : 25);
  }

  @Get('customers/:id/entries')
  @ApiOperation({ summary: 'Paginated ledger entries for a customer' })
  getCustomerEntries(
    @Param('id')    id: string,
    @Query('page')  page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.getEntries(LedgerEntityType.CUSTOMER, id, page ? +page : 1, limit ? +limit : 25);
  }

  @Post('suppliers/:id/payment')
  @ApiOperation({ summary: 'Record payment to a supplier (reduces payable)' })
  recordSupplierPayment(@Param('id') id: string, @Body() dto: RecordPaymentDto) {
    return this.svc.recordSupplierPayment(id, dto.amount, dto.notes);
  }

  @Post('customers/:id/payment')
  @ApiOperation({ summary: 'Record payment from a customer (reduces receivable)' })
  recordCustomerPayment(@Param('id') id: string, @Body() dto: RecordPaymentDto) {
    return this.svc.recordCustomerPayment(id, dto.amount, dto.notes);
  }
}
