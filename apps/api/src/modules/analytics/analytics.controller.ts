import {
  Controller,
  Get,
  Query,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import {
  RevenueChartPeriod,
  ChartGranularity,
  ExportFormat,
  DashboardStatsDto,
  RevenueChartQueryDto,
  TopProductsQueryDto,
  DateRangeDto,
  ExportReportDto,
} from './dto/analytics-query.dto';
import { Auth } from '../../common/decorators/auth.decorator';

@ApiTags('Analytics')
@ApiBearerAuth()
@Auth('ADMIN', 'MANAGER')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard KPI stats (today, yesterday, this month)' })
  getDashboardStats(@Query() query: DashboardStatsDto) {
    return this.analyticsService.getDashboardStats(query.storeId, query);
  }

  @Get('revenue-chart')
  @ApiOperation({ summary: 'Time-series revenue chart' })
  getRevenueChart(@Query() query: RevenueChartQueryDto) {
    return this.analyticsService.getRevenueChart(
      query.period ?? RevenueChartPeriod.THIRTY_DAYS,
      query.granularity ?? ChartGranularity.DAY,
    );
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Top products by revenue' })
  getTopProducts(@Query() query: TopProductsQueryDto) {
    return this.analyticsService.getTopProducts(query.limit ?? 10, query);
  }

  @Get('top-categories')
  @ApiOperation({ summary: 'Top categories by revenue' })
  getTopCategories(@Query() query: DateRangeDto) {
    return this.analyticsService.getTopCategories(query);
  }

  @Get('top-customers')
  @ApiOperation({ summary: 'Top customers by lifetime value' })
  @ApiQuery({ name: 'limit', required: false })
  getTopCustomers(@Query() query: TopProductsQueryDto) {
    return this.analyticsService.getTopCustomers(query.limit ?? 10, query);
  }

  @Get('orders-by-status')
  @ApiOperation({ summary: 'Orders grouped by status (pie chart data)' })
  getOrdersByStatus(@Query() query: DateRangeDto) {
    return this.analyticsService.getOrdersByStatus(query);
  }

  @Get('sales-by-channel')
  @ApiOperation({ summary: 'Sales breakdown by channel (web, pos, mobile)' })
  getSalesByChannel(@Query() query: DateRangeDto) {
    return this.analyticsService.getSalesByChannel(query);
  }

  @Get('conversion-funnel')
  @ApiOperation({ summary: 'Conversion funnel: views → cart → checkout → purchase' })
  getConversionFunnel(@Query() query: DateRangeDto) {
    return this.analyticsService.getConversionFunnel(query);
  }

  @Get('customer-stats')
  @ApiOperation({ summary: 'New vs returning customers, churn rate' })
  getCustomerStats(@Query() query: DateRangeDto) {
    return this.analyticsService.getCustomerStats(query);
  }

  @Get('inventory-stats')
  @ApiOperation({ summary: 'Inventory summary: totals, low stock, out of stock, value' })
  getInventoryStats() {
    return this.analyticsService.getInventoryStats();
  }

  @Get('product-performance')
  @ApiOperation({ summary: 'Per-product views, add-to-cart, conversion' })
  getProductPerformance(@Query() query: DateRangeDto) {
    return this.analyticsService.getProductPerformance(query);
  }

  @Get('hourly-heatmap')
  @ApiOperation({ summary: 'Sales heatmap by hour of day and day of week' })
  getHourlyHeatmap(@Query() query: DateRangeDto) {
    return this.analyticsService.getHourlyHeatmap(query);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export a report as CSV, Excel, or PDF' })
  @ApiQuery({ name: 'type', required: false, description: 'sales | products | customers' })
  @ApiQuery({ name: 'format', enum: ExportFormat, required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async exportReport(@Query() query: ExportReportDto, @Res() res: Response) {
    const { buffer, mimeType, filename } = await this.analyticsService.exportReport(query);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(buffer);
  }
}
