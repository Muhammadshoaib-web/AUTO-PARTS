import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Business KPI overview (today / month / year)' })
  overview(@CurrentUser() user: any, @Query('branchId') branchId?: string) {
    const effectiveBranchId: string | undefined = user?.branchId ?? branchId;
    return this.svc.getOverview(user?.shopId, effectiveBranchId);
  }

  @Get('sales-trend')
  @ApiOperation({ summary: 'Daily sales trend for a date range' })
  salesTrend(
    @CurrentUser() user: any,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('branchId') branchId?: string,
  ) {
    const effectiveBranchId: string | undefined = user?.branchId ?? branchId;
    return this.svc.getSalesTrend(from, to, user?.shopId, effectiveBranchId);
  }

  @Get('profit-loss')
  @ApiOperation({ summary: 'P&L statement for a date range' })
  profitLoss(
    @CurrentUser() user: any,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('branchId') branchId?: string,
  ) {
    const effectiveBranchId: string | undefined = user?.branchId ?? branchId;
    return this.svc.getProfitLoss(from, to, user?.shopId, effectiveBranchId);
  }

  @Get('stock-valuation')
  @ApiOperation({ summary: 'Current stock valuation at cost and retail' })
  stockValuation(@CurrentUser() user: any) {
    return this.svc.getStockValuation(user?.shopId);
  }

  @Get('top-parts')
  @ApiOperation({ summary: 'Top selling parts by revenue' })
  topParts(
    @CurrentUser() user: any,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('limit') limit?: string,
    @Query('branchId') branchId?: string,
  ) {
    const effectiveBranchId: string | undefined = user?.branchId ?? branchId;
    return this.svc.getTopParts(from, to, user?.shopId, limit ? parseInt(limit, 10) : 10, effectiveBranchId);
  }
}
