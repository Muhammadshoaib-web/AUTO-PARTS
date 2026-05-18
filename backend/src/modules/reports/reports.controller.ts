import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Get('sales')
  @ApiOperation({ summary: 'Sales report for date range' })
  sales(@Query('from') from: string, @Query('to') to: string) {
    return this.svc.salesReport(new Date(from), new Date(to));
  }

  @Get('stock-valuation')
  @ApiOperation({ summary: 'Current stock valuation at cost and retail' })
  stockValuation() { return this.svc.stockValuation(); }

  @Get('top-selling')
  @ApiOperation({ summary: 'Top selling parts by quantity' })
  topSelling(@Query('from') from: string, @Query('to') to: string, @Query('limit') limit?: string) {
    return this.svc.topSellingParts(new Date(from), new Date(to), limit ? parseInt(limit, 10) : 10);
  }
}
