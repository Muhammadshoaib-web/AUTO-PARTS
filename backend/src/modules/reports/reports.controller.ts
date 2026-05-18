import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Business KPI overview (today / month / year)' })
  overview() { return this.svc.getOverview(); }

  @Get('sales-trend')
  @ApiOperation({ summary: 'Daily sales trend for a date range' })
  salesTrend(@Query('from') from: string, @Query('to') to: string) {
    return this.svc.getSalesTrend(from, to);
  }

  @Get('profit-loss')
  @ApiOperation({ summary: 'P&L statement for a date range' })
  profitLoss(@Query('from') from: string, @Query('to') to: string) {
    return this.svc.getProfitLoss(from, to);
  }

  @Get('stock-valuation')
  @ApiOperation({ summary: 'Current stock valuation at cost and retail' })
  stockValuation() { return this.svc.getStockValuation(); }

  @Get('top-parts')
  @ApiOperation({ summary: 'Top selling parts by revenue' })
  topParts(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.getTopParts(from, to, limit ? parseInt(limit, 10) : 10);
  }
}
