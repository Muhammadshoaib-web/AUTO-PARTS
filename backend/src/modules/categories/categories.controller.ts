import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('Categories')
@ApiBearerAuth('access-token')
@Controller({ path: 'categories', version: '1' })
export class CategoriesController {
  constructor(private readonly svc: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create category' })
  create(@Body() dto: CreateCategoryDto, @CurrentUser() user: any) {
    return this.svc.create(dto, user?.shopId);
  }

  @Get()
  @ApiOperation({ summary: 'List categories' })
  @ApiQuery({ name: 'search', required: false })
  findAll(@CurrentUser() user: any, @Query('search') search?: string) {
    return this.svc.findAll(user?.shopId, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.findOne(id, user?.shopId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update category' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto, @CurrentUser() user: any) {
    return this.svc.update(id, dto, user?.shopId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete category' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.remove(id, user?.shopId);
  }
}
