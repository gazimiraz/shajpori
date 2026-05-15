import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { InventoryFiltersDto } from './dto/inventory-filters.dto';
import { AdjustStockDto, BulkAdjustDto } from './dto/adjust-stock.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Auth('ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER', 'STAFF')
  @ApiOperation({ summary: 'List all inventory items (paginated)' })
  getInventory(@Query() filters: InventoryFiltersDto) {
    return this.inventoryService.getInventory(filters);
  }

  @Get('low-stock')
  @Auth('ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Get products below low-stock threshold' })
  @ApiQuery({ name: 'threshold', required: false, type: Number })
  getLowStockAlerts(@Query('threshold') threshold?: number) {
    return this.inventoryService.getLowStockAlerts(threshold ? Number(threshold) : undefined);
  }

  @Get('value')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get total inventory value by warehouse' })
  getInventoryValue() {
    return this.inventoryService.getInventoryValue();
  }

  @Get('products/:productId')
  @Auth('ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Get inventory levels for a specific product' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiQuery({ name: 'warehouseId', required: false })
  getByProduct(
    @Param('productId') productId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.inventoryService.getByProduct(productId, warehouseId);
  }

  @Get('products/:productId/movements')
  @Auth('ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Stock movement report for a product' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getMovementReport(
    @Param('productId') productId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.inventoryService.getStockMovementReport(productId, { startDate, endDate });
  }

  @Get(':id')
  @Auth('ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Get inventory item by ID' })
  @ApiParam({ name: 'id', description: 'Inventory item ID' })
  getItemById(@Param('id') id: string) {
    return this.inventoryService.getItemById(id);
  }

  @Post('adjust')
  @Auth('ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Adjust stock for a product in a warehouse' })
  @ApiResponse({ status: 201, description: 'Stock adjusted successfully' })
  adjustStock(@Body() dto: AdjustStockDto, @CurrentUser('sub') userId: string) {
    return this.inventoryService.adjustStock(dto, userId);
  }

  @Post('adjust/bulk')
  @Auth('ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Bulk stock adjustment' })
  bulkAdjust(@Body() dto: BulkAdjustDto, @CurrentUser('sub') userId: string) {
    return this.inventoryService.bulkAdjust(dto, userId);
  }

  @Post('reserve')
  @Auth('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Reserve stock for an order' })
  reserveStock(
    @Body()
    body: {
      productId: string;
      variantId?: string;
      warehouseId: string;
      quantity: number;
    },
  ) {
    return this.inventoryService.reserveStock(
      body.productId,
      body.variantId,
      body.warehouseId,
      body.quantity,
    );
  }

  @Post('release')
  @Auth('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Release a stock reservation' })
  releaseReservation(
    @Body()
    body: {
      productId: string;
      variantId?: string;
      warehouseId: string;
      quantity: number;
    },
  ) {
    return this.inventoryService.releaseReservation(
      body.productId,
      body.variantId,
      body.warehouseId,
      body.quantity,
    );
  }
}
