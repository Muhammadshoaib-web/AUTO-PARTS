import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateStockTransferDto {
  @ApiProperty() @IsUUID() partId: string;
  @ApiProperty() @IsUUID() fromLocationId: string;
  @ApiProperty() @IsUUID() toLocationId: string;
  @ApiProperty() @IsInt() @Min(1) quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
