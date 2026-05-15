import { IsOptional, IsString, IsEnum, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum RevenueChartPeriod {
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
  NINETY_DAYS = '90d',
  YEAR = 'year',
}

export enum ChartGranularity {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export enum ExportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
}

export class DateRangeDto {
  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class DashboardStatsDto extends DateRangeDto {
  @ApiPropertyOptional({ description: 'Filter by specific store id' })
  @IsOptional()
  @IsString()
  storeId?: string;
}

export class RevenueChartQueryDto {
  @ApiPropertyOptional({ enum: RevenueChartPeriod, default: RevenueChartPeriod.THIRTY_DAYS })
  @IsOptional()
  @IsEnum(RevenueChartPeriod)
  period?: RevenueChartPeriod;

  @ApiPropertyOptional({ enum: ChartGranularity, default: ChartGranularity.DAY })
  @IsOptional()
  @IsEnum(ChartGranularity)
  granularity?: ChartGranularity;
}

export class TopProductsQueryDto extends DateRangeDto {
  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ExportReportDto {
  @ApiPropertyOptional({ example: 'sales' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ enum: ExportFormat, default: ExportFormat.CSV })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storeId?: string;
}
