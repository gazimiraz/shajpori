import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { WarehouseService } from './warehouse.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { InitiateTransferDto } from './dto/stock-transfer.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Warehouse')
@Controller('warehouses')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  // ─────────────────────────────────────────────────────────────
  // Warehouse CRUD
  // ─────────────────────────────────────────────────────────────

  @Get()
  @Auth('ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER', 'STAFF')
  @ApiOperation({ summary: 'List all warehouses' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'storeId', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('isActive') isActive?: string,
    @Query('storeId') storeId?: string,
    @Query('search') search?: string,
  ) {
    return this.warehouseService.findAll({
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      storeId,
      search,
    });
  }

  @Get(':id')
  @Auth('ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Get warehouse by ID' })
  @ApiParam({ name: 'id', description: 'Warehouse ID' })
  findOne(@Param('id') id: string): Promise<any> {
    return this.warehouseService.findOne(id);
  }

  @Post()
  @Auth('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new warehouse' })
  @ApiResponse({ status: 201, description: 'Warehouse created' })
  create(@Body() dto: CreateWarehouseDto) {
    return this.warehouseService.create(dto);
  }

  @Patch(':id')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a warehouse' })
  @ApiParam({ name: 'id', description: 'Warehouse ID' })
  update(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.warehouseService.update(id, dto);
  }

  @Delete(':id')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Delete a warehouse (only if empty)' })
  @ApiParam({ name: 'id', description: 'Warehouse ID' })
  remove(@Param('id') id: string) {
    return this.warehouseService.remove(id);
  }

  // ─────────────────────────────────────────────────────────────
  // Stock Transfers
  // ─────────────────────────────────────────────────────────────

  @Get('transfers/list')
  @Auth('ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'List stock transfers' })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listTransfers(
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.warehouseService.listTransfers({
      warehouseId,
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('transfers/:transferId')
  @Auth('ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Get a specific stock transfer' })
  @ApiParam({ name: 'transferId', description: 'Transfer ID' })
  getTransfer(@Param('transferId') transferId: string) {
    return this.warehouseService.getTransferById(transferId);
  }

  @Post('transfers')
  @Auth('ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initiate a stock transfer between warehouses' })
  @ApiResponse({ status: 201, description: 'Transfer initiated' })
  initiateTransfer(
    @Body() dto: InitiateTransferDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.warehouseService.initiateTransfer(dto, userId);
  }

  @Patch('transfers/:transferId/approve')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Approve a pending stock transfer' })
  @ApiParam({ name: 'transferId', description: 'Transfer ID' })
  approveTransfer(
    @Param('transferId') transferId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.warehouseService.approveTransfer(transferId, userId);
  }

  @Patch('transfers/:transferId/complete')
  @Auth('ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Complete an approved stock transfer (moves stock)' })
  @ApiParam({ name: 'transferId', description: 'Transfer ID' })
  completeTransfer(
    @Param('transferId') transferId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.warehouseService.completeTransfer(transferId, userId);
  }
}
