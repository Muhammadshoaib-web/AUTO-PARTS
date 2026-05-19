import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@autoparts/shared-types';
import { ShopsService } from './shops.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';

@ApiTags('Shops')
@ApiBearerAuth('access-token')
@Roles(UserRole.SUPER_ADMIN)
@Controller({ path: 'shops', version: '1' })
export class ShopsController {
  constructor(private readonly svc: ShopsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new shop (platform admin only)' })
  create(@Body() dto: CreateShopDto) { return this.svc.create(dto); }

  @Get()
  @ApiOperation({ summary: 'List all shops' })
  findAll() { return this.svc.findAll(); }

  @Get(':id')
  @ApiOperation({ summary: 'Get shop by ID' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Patch(':id')
  @ApiOperation({ summary: 'Update shop' })
  update(@Param('id') id: string, @Body() dto: UpdateShopDto) { return this.svc.update(id, dto); }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate shop' })
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}
