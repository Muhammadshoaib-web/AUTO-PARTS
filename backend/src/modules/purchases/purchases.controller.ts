import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Purchases')
@ApiBearerAuth('access-token')
@Controller({ path: 'purchases', version: '1' })
export class PurchasesController {
  constructor(private readonly svc: PurchasesService) {}

  @Post()
  @ApiOperation({ summary: 'Create purchase order' })
  create(@Body() dto: CreatePurchaseDto, @CurrentUser() user: { id: string }) {
    return this.svc.create(dto, user?.id);
  }

  @Get()
  @ApiOperation({ summary: 'List purchases (paginated)' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.findAll(page ? +page : 1, limit ? +limit : 20, supplierId, status, from, to);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase by ID' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post(':id/receive')
  @ApiOperation({ summary: 'Mark purchase received — adds stock' })
  receive(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.svc.receive(id, user?.id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a pending purchase order' })
  cancel(@Param('id') id: string) { return this.svc.cancel(id); }
}
