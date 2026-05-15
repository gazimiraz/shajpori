import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class POSItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({ description: 'Variant ID' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ description: 'Quantity', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Unit price at time of sale' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number;

  @ApiPropertyOptional({ description: 'Line-level discount amount' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ description: 'SKU (optional, resolved from product if not provided)' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ description: 'Product name (optional snapshot)' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class POSPaymentDto {
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ description: 'Amount tendered', minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ description: 'Transaction reference (card last 4, mobile number, etc.)' })
  @IsOptional()
  @IsString()
  reference?: string;
}

export class POSTransactionDto {
  @ApiProperty({ type: [POSItemDto], description: 'Items being sold' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => POSItemDto)
  items: POSItemDto[];

  @ApiProperty({ type: [POSPaymentDto], description: 'Payments tendered (supports split)' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => POSPaymentDto)
  payments: POSPaymentDto[];

  @ApiPropertyOptional({ description: 'Customer user ID (for loyalty points)' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Walk-in customer name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerName?: string;

  @ApiPropertyOptional({ description: 'Order-level discount amount' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Internal notes for this transaction' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
