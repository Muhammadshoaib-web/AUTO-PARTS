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
  create(@Body() dto: CreateSaleDto, @CurrentUser() user: { id: string }) {
    return this.svc.create(dto, user?.id);
  }

  @Get()
  @ApiOperation({ summary: 'List sales (paginated)' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.findAll(page ? +page : 1, limit ? +limit : 20, from, to, status);
  }

  @Get('daily-summary')
  @ApiOperation({ summary: "Today's revenue summary" })
  dailySummary() { return this.svc.getDailySummary(); }

  @Get(':id')
  @ApiOperation({ summary: 'Get sale by ID' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a sale and restore stock' })
  cancel(@Param('id') id: string) { return this.svc.cancel(id); }
}
