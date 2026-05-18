import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  create(@Body() dto: CreatePartDto) { return this.svc.create(dto); }

  @Get()
  @ApiOperation({ summary: 'List parts with filters & pagination' })
  findAll(@Query() filter: FilterPartsDto) { return this.svc.findAll(filter); }

  @Get('low-stock')
  @ApiOperation({ summary: 'Parts below minimum stock threshold' })
  lowStock() { return this.svc.findLowStock(); }

  @Get(':id')
  @ApiOperation({ summary: 'Get part by ID (with stock per location)' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Patch(':id')
  @ApiOperation({ summary: 'Update part' })
  update(@Param('id') id: string, @Body() dto: UpdatePartDto) { return this.svc.update(id, dto); }

  @Post(':id/image')
  @ApiOperation({ summary: 'Upload part image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  uploadImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.svc.updateImage(id, file.path);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete part' })
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}
