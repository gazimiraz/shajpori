import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PurchasingService } from './purchasing.service';
import { CreatePODto, UpdatePODto } from './dto/create-po.dto';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/create-supplier.dto';
import { CreateGRNDto } from './dto/create-grn.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Purchasing')
@ApiBearerAuth()
@Auth('ADMIN', 'MANAGER')
@Controller('purchasing')
export class PurchasingController {
  constructor(private readonly purchasingService: PurchasingService) {}

  // ─── PURCHASE ORDERS ─────────────────────────────────────────────────────

  @Get('purchase-orders')
  @ApiOperation({ summary: 'List purchase orders (paginated)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getPurchaseOrders(
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.purchasingService.getPurchaseOrders({
      status,
      supplierId,
      warehouseId,
      page,
      limit,
    });
  }

  @Get('purchase-orders/stats')
  @ApiOperation({ summary: 'Get purchase order statistics' })
  getPOStats() {
    return this.purchasingService.getPOStats();
  }

  @Post('purchase-orders')
  @ApiOperation({ summary: 'Create a purchase order' })
  createPurchaseOrder(@Body() dto: CreatePODto) {
    return this.purchasingService.createPurchaseOrder(dto);
  }

  @Get('purchase-orders/:id')
  @ApiOperation({ summary: 'Get purchase order by ID (with items)' })
  @ApiParam({ name: 'id' })
  getPurchaseOrder(@Param('id') id: string) {
    return this.purchasingService.getPurchaseOrder(id);
  }

  @Patch('purchase-orders/:id')
  @ApiOperation({ summary: 'Update a purchase order' })
  @ApiParam({ name: 'id' })
  updatePurchaseOrder(@Param('id') id: string, @Body() dto: UpdatePODto) {
    return this.purchasingService.updatePurchaseOrder(id, dto);
  }

  @Post('purchase-orders/:id/send')
  @ApiOperation({ summary: 'Send a purchase order (DRAFT → SENT)' })
  @ApiParam({ name: 'id' })
  sendPurchaseOrder(@Param('id') id: string) {
    return this.purchasingService.sendPurchaseOrder(id);
  }

  @Post('purchase-orders/:id/cancel')
  @ApiOperation({ summary: 'Cancel a purchase order' })
  @ApiParam({ name: 'id' })
  cancelPurchaseOrder(@Param('id') id: string) {
    return this.purchasingService.cancelPurchaseOrder(id);
  }

  // ─── SUPPLIERS ────────────────────────────────────────────────────────────

  @Get('suppliers')
  @ApiOperation({ summary: 'List suppliers (paginated)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getSuppliers(
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.purchasingService.getSuppliers({ search, isActive, page, limit });
  }

  @Post('suppliers')
  @ApiOperation({ summary: 'Create a supplier' })
  createSupplier(@Body() dto: CreateSupplierDto) {
    return this.purchasingService.createSupplier(dto);
  }

  @Get('suppliers/:id')
  @ApiOperation({ summary: 'Get supplier by ID' })
  @ApiParam({ name: 'id' })
  getSupplier(@Param('id') id: string) {
    return this.purchasingService.getSupplier(id);
  }

  @Patch('suppliers/:id')
  @ApiOperation({ summary: 'Update a supplier' })
  @ApiParam({ name: 'id' })
  updateSupplier(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.purchasingService.updateSupplier(id, dto);
  }

  @Delete('suppliers/:id')
  @Auth('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a supplier' })
  @ApiParam({ name: 'id' })
  deleteSupplier(@Param('id') id: string) {
    return this.purchasingService.deleteSupplier(id);
  }

  // ─── GRN ─────────────────────────────────────────────────────────────────

  @Get('grn')
  @ApiOperation({ summary: 'List goods received notes (paginated)' })
  @ApiQuery({ name: 'purchaseOrderId', required: false })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getGRNs(
    @Query('purchaseOrderId') purchaseOrderId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.purchasingService.getGRNs({ purchaseOrderId, warehouseId, page, limit });
  }

  @Post('grn')
  @ApiOperation({ summary: 'Create a goods received note' })
  createGRN(@Body() dto: CreateGRNDto, @CurrentUser('id') userId: string) {
    return this.purchasingService.createGRN(dto, userId);
  }

  @Get('grn/:id')
  @ApiOperation({ summary: 'Get GRN by ID (with items)' })
  @ApiParam({ name: 'id' })
  getGRN(@Param('id') id: string) {
    return this.purchasingService.getGRN(id);
  }
}
