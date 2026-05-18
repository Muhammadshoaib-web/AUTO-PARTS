import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StockService } from './stock.service';
import { ReceiveStockDto } from './dto/receive-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@ApiTags('Stock')
@ApiBearerAuth('access-token')
@Controller({ path: 'stock', version: '1' })
export class StockController {
  constructor(private readonly svc: StockService) {}

  @Get('levels')
  @ApiOperation({ summary: 'All stock rows across all parts and locations' })
  levels(@Query('q') q?: string) { return this.svc.getAllStockLevels(q); }

  @Get('summary/:partId')
  @ApiOperation({ summary: 'Stock for a single part across all locations' })
  summary(@Param('partId') partId: string) { return this.svc.getStockForPart(partId); }

  @Post('receive')
  @ApiOperation({ summary: 'Receive stock into a location' })
  receive(@Body() dto: ReceiveStockDto) { return this.svc.receiveStock(dto); }

  @Post('adjust')
  @ApiOperation({ summary: 'Manual stock adjustment (positive or negative)' })
  adjust(@Body() dto: AdjustStockDto) { return this.svc.adjustStock(dto); }

  @Get('movements')
  @ApiOperation({ summary: 'Paginated stock movement history' })
  movements(
    @Query('partId') partId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.getMovements(partId, page ? +page : 1, limit ? +limit : 50);
  }
}
