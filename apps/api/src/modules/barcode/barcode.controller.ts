import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiProduces,
} from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsInt, IsEnum, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BarcodeService, BarcodeType } from './barcode.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { Public } from '../../common/decorators/public.decorator';

class GenerateBarcodeDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  variantId?: string;

  @ApiPropertyOptional({ enum: ['EAN13', 'CODE128', 'QR'] })
  @IsEnum(['EAN13', 'CODE128', 'QR'])
  @IsOptional()
  type?: BarcodeType;
}

class BulkBarcodeItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  variantId?: string;

  @ApiPropertyOptional({ enum: ['EAN13', 'CODE128', 'QR'] })
  @IsEnum(['EAN13', 'CODE128', 'QR'])
  @IsOptional()
  type?: BarcodeType;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;
}

class GenerateBulkDto {
  @ApiProperty({ type: [BulkBarcodeItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkBarcodeItemDto)
  items: BulkBarcodeItemDto[];
}

class LabelPDFItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  variantId?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;
}

class GenerateLabelPDFDto {
  @ApiProperty({ type: [LabelPDFItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabelPDFItemDto)
  items: LabelPDFItemDto[];
}

class CreateLabelTemplateDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  width: number;

  @ApiProperty()
  height: number;

  @ApiProperty()
  columns: number;

  @ApiProperty()
  rows: number;

  @ApiPropertyOptional()
  @IsOptional()
  config?: Record<string, any>;
}

@ApiTags('Barcode')
@ApiBearerAuth()
@Controller('barcode')
export class BarcodeController {
  constructor(private readonly barcodeService: BarcodeService) {}

  @Post('generate')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Generate a barcode for a product or variant' })
  generateBarcode(@Body() dto: GenerateBarcodeDto) {
    return this.barcodeService.generateBarcode(dto.productId, dto.variantId, dto.type);
  }

  @Post('generate-bulk')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Generate barcodes in bulk' })
  generateBulk(@Body() dto: GenerateBulkDto) {
    const items = dto.items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      type: (i.type ?? 'CODE128') as BarcodeType,
      quantity: i.quantity ?? 1,
    }));
    return this.barcodeService.generateBulk(items);
  }

  @Get('lookup/:code')
  @Public()
  @ApiOperation({ summary: 'Look up a product by barcode (public)' })
  @ApiParam({ name: 'code', description: 'Barcode string' })
  getByCode(@Param('code') code: string) {
    return this.barcodeService.getByCode(code);
  }

  @Get('qr/:productId')
  @Public()
  @ApiOperation({ summary: 'Get QR code data URL for a product (public)' })
  @ApiParam({ name: 'productId' })
  generateQRCode(@Param('productId') productId: string) {
    return this.barcodeService.generateQRCode(productId).then((dataUrl) => ({
      productId,
      qrCode: dataUrl,
    }));
  }

  @Post('labels/generate-pdf')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Generate a PDF sheet of product labels' })
  @ApiProduces('application/pdf')
  @HttpCode(HttpStatus.OK)
  async generateLabelPDF(
    @Body() dto: GenerateLabelPDFDto,
    @Res() res: Response,
  ) {
    const buffer = await this.barcodeService.generateLabelPDF(
      dto.items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity ?? 1,
      })),
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="labels.pdf"',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('templates')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'List label templates' })
  getLabelTemplates() {
    return this.barcodeService.getLabelTemplates();
  }

  @Post('templates')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a label template' })
  createLabelTemplate(@Body() dto: CreateLabelTemplateDto) {
    return this.barcodeService.createLabelTemplate(dto);
  }

  @Get('sku/generate')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Generate a unique SKU' })
  @ApiQuery({ name: 'prefix', required: false, description: 'SKU prefix (e.g. SKU, PROD)' })
  generateSKU(@Query('prefix') prefix?: string) {
    return this.barcodeService.generateSKU(prefix).then((sku) => ({ sku }));
  }

  @Post('validate')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a barcode format and check if registered (public)' })
  validateBarcode(@Body('code') code: string) {
    return this.barcodeService.validateBarcode(code);
  }
}
