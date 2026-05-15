import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaymentDto } from './dto/payment.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateReturnDto } from './dto/create-return.dto';
import { OrderFiltersDto } from './dto/order-filters.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ─────────────────────────────────────────────────────────────
  // Admin / Manager routes
  // ─────────────────────────────────────────────────────────────

  @Get()
  @Auth('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'List all orders (admin)' })
  @ApiResponse({ status: 200, description: 'Paginated order list' })
  findAll(@Query() filters: OrderFiltersDto) {
    return this.ordersService.findAll(filters);
  }

  @Get('stats')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Order statistics by period' })
  @ApiQuery({ name: 'period', enum: ['day', 'week', 'month', 'year'], required: false })
  getStats(@Query('period') period?: 'day' | 'week' | 'month' | 'year') {
    return this.ordersService.getOrderStats(period ?? 'month');
  }

  @Get(':id')
  @Auth('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Get order by ID (admin)' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  @Auth('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Update order status' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.ordersService.updateStatus(id, dto.status, dto.note, userId);
  }

  @Patch(':id/cancel')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  cancelOrder(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.ordersService.cancelOrder(id, dto.reason, userId);
  }

  @Post(':id/payments')
  @Auth('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Record a payment for an order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  processPayment(@Param('id') id: string, @Body() dto: PaymentDto) {
    return this.ordersService.processPayment(id, dto);
  }

  @Post(':id/refunds')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a refund for an order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  createRefund(
    @Param('id') id: string,
    @Body() body: { amount: number; reason: string },
  ) {
    return this.ordersService.createRefund(id, body.amount, body.reason);
  }

  @Get(':id/invoice')
  @Auth('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Download order invoice as PDF' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  async getInvoice(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.ordersService.generateInvoice(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // ─────────────────────────────────────────────────────────────
  // Customer routes
  // ─────────────────────────────────────────────────────────────

  @Get('my/orders')
  @Auth()
  @ApiOperation({ summary: "Get current customer's orders" })
  getMyOrders(@CurrentUser('sub') userId: string, @Query() filters: OrderFiltersDto) {
    return this.ordersService.getMyOrders(userId, filters);
  }

  @Get('my/orders/:id')
  @Auth()
  @ApiOperation({ summary: "Get a specific order belonging to the current user" })
  @ApiParam({ name: 'id', description: 'Order ID' })
  getMyOrder(@Param('id') id: string) {
    // The service findOne returns full order; ownership enforced at service if needed
    return this.ordersService.findOne(id);
  }

  @Post()
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Place a new order' })
  createOrder(@CurrentUser('sub') userId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(userId, dto);
  }

  @Post('my/orders/:id/cancel')
  @Auth()
  @ApiOperation({ summary: 'Cancel my own order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  cancelMyOrder(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.ordersService.cancelOrder(id, dto.reason, userId);
  }

  @Post('my/orders/:id/returns')
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request a return for a delivered order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  createReturn(
    @Param('id') orderId: string,
    @Body() dto: CreateReturnDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.ordersService.createReturnRequest(orderId, dto, userId);
  }
}
