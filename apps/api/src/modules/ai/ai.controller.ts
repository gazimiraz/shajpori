import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AIService } from './ai.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { AIQueryDto } from './dto/ai-query.dto';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Get('forecast')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get sales forecast' })
  getSalesForecast(@Query('days') days: number = 30) {
    return this.aiService.getSalesForecast(days);
  }

  @Get('churn-risk')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get customers at churn risk' })
  getChurnRisk() {
    return this.aiService.getChurnRisk();
  }

  @Get('recommendations')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get AI product recommendations' })
  getRecommendations(@Query('userId') userId?: string, @Query('productId') productId?: string) {
    return this.aiService.getProductRecommendations(userId, productId);
  }

  @Get('dead-stock')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get dead stock (no sales in 90 days)' })
  getDeadStock(@Query('days') days: number = 90) {
    return this.aiService.getDeadStock(days);
  }

  @Get('segments')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get customer RFM segments' })
  getCustomerSegments() {
    return this.aiService.getCustomerSegments();
  }

  @Get('insights')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get curated AI insights' })
  getInsights() {
    return this.aiService.getAIInsights();
  }

  @Get('best-sellers')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get best seller predictions' })
  getBestSellers(@Query('categoryId') categoryId?: string) {
    return this.aiService.getBestSellerPredictions(categoryId);
  }

  @Get('clv/:userId')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get customer lifetime value' })
  getCLV(@Query('userId') userId: string) {
    return this.aiService.getCustomerLifetimeValue(userId);
  }

  @Post('query')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Natural language query for business intelligence' })
  nlpQuery(@Body() dto: AIQueryDto) {
    return this.aiService.getNLPQuery(dto.query);
  }
}
