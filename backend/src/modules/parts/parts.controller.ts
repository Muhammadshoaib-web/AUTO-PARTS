import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PartsService } from './parts.service';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import { FilterPartsDto } from './dto/filter-parts.dto';

@ApiTags('Parts')
@ApiBearerAuth('access-token')
@Controller({ path: 'parts', version: '1' })
export class PartsController {
  constructor(private readonly svc: PartsService) {}

  @Post()
  @ApiOperation({ summary: 'Create part' })
  create(@Body() dto: CreatePartDto, @CurrentUser() user: any) {
    return this.svc.create(dto, user?.shopId, user?.id);
  }

  @Get()
  @ApiOperation({ summary: 'List parts with filters & pagination' })
  findAll(@Query() filter: FilterPartsDto, @CurrentUser() user: any) {
    return this.svc.findAll(filter, user?.shopId);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Parts below minimum stock threshold' })
  lowStock(@CurrentUser() user: any) {
    return this.svc.findLowStock(user?.shopId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get part by ID (with stock per location)' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.findOne(id, user?.shopId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update part' })
  update(@Param('id') id: string, @Body() dto: UpdatePartDto, @CurrentUser() user: any) {
    return this.svc.update(id, dto, user?.shopId, user?.id);
  }

  @Post(':id/image')
  @ApiOperation({ summary: 'Upload part image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  uploadImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @CurrentUser() user: any) {
    return this.svc.updateImage(id, file.path, user?.shopId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete part' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.remove(id, user?.shopId, user?.id);
  }
}
