import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Expenses')
@ApiBearerAuth('access-token')
@Controller({ path: 'expenses', version: '1' })
export class ExpensesController {
  constructor(private readonly svc: ExpensesService) {}

  @Post()
  @ApiOperation({ summary: 'Create expense' })
  create(@Body() dto: CreateExpenseDto, @CurrentUser() user: any) {
    return this.svc.create(dto, user?.shopId, user?.id, user?.branchId);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Monthly / yearly expense summary' })
  summary(@CurrentUser() user: any) {
    return this.svc.getSummary(user?.shopId);
  }

  @Get()
  @ApiOperation({ summary: 'List expenses (paginated, filterable)' })
  findAll(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('branchId') branchId?: string,
  ) {
    const effectiveBranchId: string | undefined = user?.branchId ?? branchId;
    return this.svc.findAll(user?.shopId, page ? +page : 1, limit ? +limit : 20, category, from, to, effectiveBranchId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update expense' })
  update(@Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete expense' })
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}
