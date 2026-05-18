import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('Customers')
@ApiBearerAuth('access-token')
@Controller({ path: 'customers', version: '1' })
export class CustomersController {
  constructor(private readonly svc: CustomersService) {}
  @Post() create(@Body() dto: CreateCustomerDto) { return this.svc.create(dto); }
  @Get() findAll(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.findAll(q, page ? +page : 1, limit ? +limit : 20);
  }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) { return this.svc.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}
