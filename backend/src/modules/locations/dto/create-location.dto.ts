import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { LocationType } from '@autoparts/shared-types';

export class CreateLocationDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiPropertyOptional({ enum: LocationType, default: LocationType.WAREHOUSE })
  @IsOptional() @IsEnum(LocationType) type?: LocationType;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() parentId?: string;
}
