import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  IsPositive,
  Min,
  MaxLength,
  ValidateNested,
  ArrayNotEmpty,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ProductType {
  SIMPLE = 'SIMPLE',
  VARIABLE = 'VARIABLE',
  GROUPED = 'GROUPED',
  DIGITAL = 'DIGITAL',
  SERVICE = 'SERVICE',
}

export enum ProductStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export class ProductDimensionsDto {
  @ApiPropertyOptional({ description: 'Length in cm' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  length?: number;

  @ApiPropertyOptional({ description: 'Width in cm' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  width?: number;

  @ApiPropertyOptional({ description: 'Height in cm' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  height?: number;
}

export class ProductAttributeValueDto {
  @ApiProperty({ description: 'Attribute ID' })
  @IsUUID()
  attributeId: string;

  @ApiProperty({ type: [String], description: 'Selected value IDs for this attribute' })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  valueIds: string[];
}

export class CreateProductDto {
  @ApiProperty({ example: 'Premium Wireless Headphones' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Full HTML product description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Short plain-text description shown in listings' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescription?: string;

  @ApiPropertyOptional({ enum: ProductType, default: ProductType.SIMPLE })
  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType = ProductType.SIMPLE;

  @ApiPropertyOptional({ enum: ProductStatus, default: ProductStatus.DRAFT })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus = ProductStatus.DRAFT;

  @ApiPropertyOptional({ description: 'Stock-keeping unit (must be unique)', example: 'WH-PRO-001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiPropertyOptional({ description: 'EAN / UPC barcode', example: '5901234123457' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  barcode?: string;

  @ApiProperty({ description: 'Selling price', example: 9999 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Original / compare-at price (for crossed-out display)', example: 12999 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  compareAtPrice?: number;

  @ApiPropertyOptional({ description: 'Cost price for margin calculations', example: 4500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({ description: 'Weight in grams', example: 280 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({ type: () => ProductDimensionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductDimensionsDto)
  dimensions?: ProductDimensionsDto;

  @ApiPropertyOptional({ description: 'Available stock quantity', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number = 0;

  @ApiPropertyOptional({ description: 'Alert when stock falls below this level', default: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number = 5;

  @ApiPropertyOptional({ description: 'Enable inventory tracking', default: true })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean = true;

  @ApiPropertyOptional({ description: 'Show in featured section', default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean = false;

  @ApiPropertyOptional({ description: 'Tag as new arrival', default: false })
  @IsOptional()
  @IsBoolean()
  isNew?: boolean = false;

  @ApiPropertyOptional({ type: [String], description: 'Searchable tags', example: ['wireless', 'audio'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Category IDs to assign' })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ description: 'Brand ID' })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ description: 'Tax class ID' })
  @IsOptional()
  @IsUUID()
  taxClassId?: string;

  @ApiPropertyOptional({
    type: [ProductAttributeValueDto],
    description: 'Attribute/value assignments for the product',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeValueDto)
  attributes?: ProductAttributeValueDto[];

  @ApiPropertyOptional({ description: 'SEO meta title', example: 'Buy Premium Wireless Headphones' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'SEO meta description', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  metaDescription?: string;
}
