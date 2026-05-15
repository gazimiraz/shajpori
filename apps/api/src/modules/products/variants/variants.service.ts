import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsBoolean,
  IsArray,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PrismaService } from '../../../prisma/prisma.service';

// DTO defined inline for simplicity
export class CreateVariantDto {
  @ApiProperty({ example: 'Red / XL' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'SKU-RED-XL' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiProperty({ description: 'Price in smallest currency unit', example: 9999 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  compareAtPrice?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Attribute value IDs for this variant' })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  attributeValueIds?: string[];
}

export class UpdateVariantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  compareAtPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  attributeValueIds?: string[];
}

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProduct(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product '${productId}' not found`);

    return this.prisma.productVariant.findMany({
      where: { productId },
      include: {
        attributeValues: {
          include: {
            attributeValue: { include: { attribute: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
      include: {
        attributeValues: {
          include: {
            attributeValue: { include: { attribute: true } },
          },
        },
      },
    });
    if (!variant) throw new NotFoundException(`Variant '${id}' not found`);
    return variant;
  }

  async create(productId: string, dto: CreateVariantDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product '${productId}' not found`);

    if (dto.sku) {
      const skuExists = await this.prisma.productVariant.findFirst({ where: { sku: dto.sku } });
      if (skuExists) throw new ConflictException(`SKU '${dto.sku}' is already in use`);
    }

    const { attributeValueIds, ...rest } = dto;

    return this.prisma.productVariant.create({
      data: {
        ...rest,
        productId,
        stockQuantity: dto.stockQuantity ?? 0,
        isActive: dto.isActive ?? true,
        ...(attributeValueIds?.length && {
          attributeValues: {
            create: attributeValueIds.map((valueId) => ({ attributeValueId: valueId })),
          },
        }),
      },
      include: {
        attributeValues: {
          include: { attributeValue: { include: { attribute: true } } },
        },
      },
    });
  }

  async update(id: string, dto: UpdateVariantDto) {
    await this.findOne(id);
    const { attributeValueIds, ...rest } = dto;

    return this.prisma.productVariant.update({
      where: { id },
      data: {
        ...rest,
        ...(attributeValueIds !== undefined && {
          attributeValues: {
            deleteMany: {},
            create: attributeValueIds.map((valueId) => ({ attributeValueId: valueId })),
          },
        }),
      },
      include: {
        attributeValues: {
          include: { attributeValue: { include: { attribute: true } } },
        },
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    await this.prisma.productVariant.delete({ where: { id } });
    return { success: true, message: 'Variant deleted successfully' };
  }
}
