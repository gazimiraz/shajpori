import {
  Controller,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { Auth } from '../../common/decorators/auth.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@Auth('ADMIN', 'MANAGER', 'ACCOUNTANT')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @ApiOperation({ summary: 'Sales report grouped by day/week/month' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['day', 'week', 'month'] })
  getSalesReport(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('groupBy') groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    return this.reportsService.getSalesReport(new Date(from), new Date(to), groupBy);
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Inventory valuation report' })
  @ApiQuery({ name: 'warehouseId', required: false })
  getInventoryReport(@Query('warehouseId') warehouseId?: string) {
    return this.reportsService.getInventoryReport(warehouseId);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Customer acquisition and retention report' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  getCustomerReport(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getCustomerReport(new Date(from), new Date(to));
  }

  @Get('products')
  @ApiOperation({ summary: 'Product revenue and unit sales report' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  getProductReport(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getProductReport(new Date(from), new Date(to));
  }

  @Get('export')
  @ApiOperation({ summary: 'Export report as CSV or Excel file download' })
  @ApiQuery({ name: 'type', required: true, enum: ['sales', 'inventory', 'customers', 'products'] })
  @ApiQuery({ name: 'format', required: true, enum: ['csv', 'xlsx'] })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'groupBy', required: false })
  @ApiQuery({ name: 'warehouseId', required: false })
  async exportReport(
    @Query('type') type: string,
    @Query('format') format: string,
    @Query() filters: Record<string, any>,
    @Res() res: Response,
  ) {
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${type}-report-${timestamp}`;

    if (format === 'csv') {
      const csv = await this.reportsService.exportToCSV(type, filters);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}.csv"`,
      );
      return res.send(csv);
    }

    const buffer = await this.reportsService.exportToExcel(type, filters);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}.xlsx"`,
    );
    return res.send(buffer);
  }
}
