import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@ApiTags('Locations')
@ApiBearerAuth('access-token')
@Controller({ path: 'locations', version: '1' })
export class LocationsController {
  constructor(private readonly svc: LocationsService) {}

  @Post()
  create(@Body() dto: CreateLocationDto, @CurrentUser() user: any) {
    return this.svc.create(dto, user?.shopId);
  }

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('branchId') branchId?: string,
  ) {
    const effectiveBranchId: string | undefined = user?.branchId ?? branchId;
    return this.svc.findAll(user?.shopId, effectiveBranchId);
  }

  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateLocationDto) { return this.svc.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}
