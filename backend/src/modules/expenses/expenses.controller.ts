import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Expenses')
@ApiBearerAuth('access-token')
@Controller({ path: 'expenses', version: '1' })
export class ExpensesController {
  constructor(private readonly svc: ExpensesService) {}
  @Post() create(@Body() dto: CreateExpenseDto, @CurrentUser() user: { id: string }) { return this.svc.create(dto, user?.id); }
  @Get() @ApiOperation({ summary: 'List expenses' }) findAll() { return this.svc.findAll(); }
}
