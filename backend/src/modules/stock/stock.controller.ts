import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StockService } from './stock.service';

@ApiTags('Stock')
@ApiBearerAuth('access-token')
@Controller({ path: 'stock', version: '1' })
export class StockController {
  constructor(private readonly svc: StockService) {}

  @Get('summary/:partId')
  @ApiOperation({ summary: 'Total stock for a part across all locations' })
  summary(@Param('partId') partId: string) { return this.svc.getStockForPart(partId); }

  @Get('movements')
  @ApiOperation({ summary: 'Stock movement history' })
  movements(@Query('partId') partId?: string) { return this.svc.getMovements(partId); }
}
