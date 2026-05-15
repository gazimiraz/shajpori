import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InventoryTransactionType } from '@prisma/client';

export class AdjustStockDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({ description: 'Variant ID' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ description: 'Warehouse ID' })
  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ description: 'Quantity to adjust (positive number)', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ enum: InventoryTransactionType, description: 'Type of inventory transaction' })
  @IsEnum(InventoryTransactionType)
  type: InventoryTransactionType;

  @ApiPropertyOptional({ description: 'Notes or reason for the adjustment' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class BulkAdjustItemDto extends AdjustStockDto {}

export class BulkAdjustDto {
  @ApiProperty({ type: [BulkAdjustItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkAdjustItemDto)
  items: BulkAdjustItemDto[];
}
