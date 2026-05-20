import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StockTransfersService } from './stock-transfers.service';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Stock Transfers')
@ApiBearerAuth('access-token')
@Controller({ path: 'stock-transfers', version: '1' })
export class StockTransfersController {
  constructor(private readonly svc: StockTransfersService) {}

  @Post()
  @ApiOperation({ summary: 'Transfer stock between locations' })
  transfer(@Body() dto: CreateStockTransferDto, @CurrentUser() user: any) {
    return this.svc.transfer(dto, user?.shopId, user?.id);
  }

  @Get()
  @ApiOperation({ summary: 'List transfer history (paginated)' })
  findAll(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('branchId') branchId?: string,
  ) {
    const effectiveBranchId: string | undefined = user?.branchId ?? branchId;
    return this.svc.findAll(user?.shopId, page ? +page : 1, limit ? +limit : 20, effectiveBranchId);
  }
}
