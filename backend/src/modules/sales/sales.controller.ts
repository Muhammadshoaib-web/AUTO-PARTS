import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Sales')
@ApiBearerAuth('access-token')
@Controller({ path: 'sales', version: '1' })
export class SalesController {
  constructor(private readonly svc: SalesService) {}

  @Post()
  @ApiOperation({ summary: 'Create sale (full POS transaction)' })
  create(@Body() dto: CreateSaleDto, @CurrentUser() user: any) {
    return this.svc.create(dto, user?.id, user?.shopId, user?.branchId);
  }

  @Get()
  @ApiOperation({ summary: 'List sales (paginated)' })
  findAll(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
  ) {
    const effectiveBranchId: string | undefined = user?.branchId ?? branchId;
    return this.svc.findAll(user?.shopId, page ? +page : 1, limit ? +limit : 20, from, to, status, effectiveBranchId);
  }

  @Get('daily-summary')
  @ApiOperation({ summary: "Today's revenue summary" })
  dailySummary(@CurrentUser() user: any) {
    return this.svc.getDailySummary(user?.shopId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sale by ID' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a sale and restore stock' })
  cancel(@Param('id') id: string) { return this.svc.cancel(id); }
}
