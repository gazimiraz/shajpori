import {
  IsString,
  IsDateString,
  IsArray,
  IsOptional,
  IsNumber,
  IsUUID,
  ValidateNested,
  ArrayMinSize,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JournalLineDto {
  @ApiProperty({ description: 'AccountChart id' })
  @IsString()
  accountId: string;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  debit?: number;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  credit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class CreateJournalEntryDto {
  @ApiProperty({ example: '2024-01-15', description: 'Entry date (ISO 8601)' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'Cash sale for order #1234' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiProperty({ type: [JournalLineDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines: JournalLineDto[];

  @ApiPropertyOptional({
    example: 'ORDER',
    description: 'Source entity type (ORDER, INVOICE, EXPENSE, etc.)',
  })
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiPropertyOptional({ description: 'Id of the source entity' })
  @IsOptional()
  @IsString()
  referenceId?: string;
}

export class VoidJournalEntryDto {
  @ApiProperty({ example: 'Duplicate entry' })
  @IsString()
  @MaxLength(500)
  reason: string;
}
