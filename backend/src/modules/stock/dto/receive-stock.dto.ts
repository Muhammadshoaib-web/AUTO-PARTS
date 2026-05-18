import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ReceiveStockDto {
  @ApiProperty() @IsUUID() partId: string;
  @ApiProperty() @IsUUID() locationId: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
