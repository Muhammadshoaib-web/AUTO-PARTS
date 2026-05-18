import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AdjustStockDto {
  @ApiProperty() @IsUUID() partId: string;
  @ApiProperty() @IsUUID() locationId: string;
  /** Positive to add, negative to deduct */
  @ApiProperty() @Type(() => Number) @IsInt() quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
