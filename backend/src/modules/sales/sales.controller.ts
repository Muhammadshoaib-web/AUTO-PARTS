import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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
  @ApiOperation({ summary: 'List sales' })
  findAll() { return this.svc.findAll(); }

  @Get('daily-summary')
  @ApiOperation({ summary: "Today's revenue summary" })
  dailySummary() { return this.svc.getDailySummary(); }

  @Get(':id')
  @ApiOperation({ summary: 'Get sale by ID' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }
}
