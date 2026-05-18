import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min,
} from 'class-validator';

export class CreatePartDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  partNumber: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  oemNumber?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nameEn: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameUr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ default: 'piece' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  buyPrice: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sellPrice: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minStock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;
}
