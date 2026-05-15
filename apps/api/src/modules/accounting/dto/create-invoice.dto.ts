import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsDateString,
  IsEmail,
  ValidateNested,
  ArrayMinSize,
  Min,
  Max,
  MaxLength,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class InvoiceItemDto {
  @ApiProperty({ example: 'Premium Cotton T-Shirt (L/Blue)' })
  @IsString()
  @MaxLength(255)
  description: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: 1500.0, description: 'Price per unit (BDT)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  unitPrice: number;

  @ApiPropertyOptional({ example: 15, description: 'VAT / tax rate in percent' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxRate?: number;
}

export class CreateInvoiceDto {
  @ApiPropertyOptional({ description: 'Existing customer id (optional)' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ example: 'Rahim Uddin' })
  @IsString()
  @MaxLength(200)
  customerName: string;

  @ApiPropertyOptional({ example: 'rahim@example.com' })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional({ example: '+8801700000000' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  customerPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerAddress?: string;

  @ApiProperty({ type: [InvoiceItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @ApiPropertyOptional({ example: '2024-02-15' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Linked order id' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateInvoiceDto extends PartialType(CreateInvoiceDto) {}

export class RecordPaymentDto {
  @ApiProperty({ example: 3000.0, description: 'Amount being paid' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ example: 'BKASH-TXN-123456' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  transactionRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
