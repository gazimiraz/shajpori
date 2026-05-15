import { IsString, IsOptional, IsNumber, IsPositive, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SalesForecastQueryDto {
  @ApiPropertyOptional({ default: 30, minimum: 1, maximum: 365, description: 'Number of days to forecast' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  days?: number;
}

export class ProductRecommendationsDto {
  @ApiPropertyOptional({ description: 'User id for personalised recommendations' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Seed product id for item-based recommendations' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class NLPQueryDto {
  @ApiProperty({ example: 'show low performing products last 90 days' })
  @IsString()
  @MaxLength(500)
  query: string;
}

export class BestSellerPredictionsDto {
  @ApiPropertyOptional({ description: 'Filter predictions to a specific category' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class DeadStockQueryDto {
  @ApiPropertyOptional({ default: 90, description: 'Days without a sale to qualify as dead stock' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  threshold?: number;
}
