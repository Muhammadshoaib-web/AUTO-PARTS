import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ntn?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cnic?: string;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) discountSlab?: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) creditLimit?: number;
}
