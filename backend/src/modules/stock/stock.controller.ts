import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StockService } from './stock.service';
import { ReceiveStockDto } from './dto/receive-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Stock')
@ApiBearerAuth('access-token')
@Controller({ path: 'stock', version: '1' })
export class StockController {
  constructor(private readonly svc: StockService) {}

  @Get('levels')
  @ApiOperation({ summary: 'All stock rows across all parts and locations' })
  levels(@CurrentUser() user: any, @Query('q') q?: string, @Query('branchId') branchId?: string) {
    const effectiveBranchId: string | undefined = user?.branchId ?? branchId;
    return this.svc.getAllStockLevels(user?.shopId, q, effectiveBranchId);
  }

  @Get('summary/:partId')
  @ApiOperation({ summary: 'Stock for a single part across all locations' })
  summary(@Param('partId') partId: string) { return this.svc.getStockForPart(partId); }

  @Post('receive')
  @ApiOperation({ summary: 'Receive stock into a location' })
  receive(@Body() dto: ReceiveStockDto, @CurrentUser() user: any) {
    return this.svc.receiveStock(dto, user?.shopId, user?.id);
  }

  @Post('adjust')
  @ApiOperation({ summary: 'Manual stock adjustment (positive or negative)' })
  adjust(@Body() dto: AdjustStockDto, @CurrentUser() user: any) {
    return this.svc.adjustStock(dto, user?.shopId, user?.id);
  }

  @Get('movements')
  @ApiOperation({ summary: 'Paginated stock movement history' })
  movements(
    @CurrentUser() user: any,
    @Query('partId') partId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('branchId') branchId?: string,
  ) {
    const effectiveBranchId: string | undefined = user?.branchId ?? branchId;
    return this.svc.getMovements(user?.shopId, partId, page ? +page : 1, limit ? +limit : 50, effectiveBranchId);
  }
}
