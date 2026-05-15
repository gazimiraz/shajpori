import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { POSService } from './pos.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { POSTransactionDto } from './dto/pos-transaction.dto';
import { CashMovementDto } from './dto/cash-movement.dto';
import { TransactionFiltersDto } from './dto/transaction-filters.dto';

@ApiTags('POS')
@ApiBearerAuth()
@Controller('pos')
export class POSController {
  constructor(private readonly posService: POSService) {}

  @Post('shifts/open')
  @Auth('POS_OPERATOR', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Open a new POS shift' })
  openShift(@Body() dto: OpenShiftDto, @CurrentUser('id') userId: string) {
    return this.posService.openShift(dto.storeId, userId, dto.openingCash);
  }

  @Post('shifts/:id/close')
  @Auth('POS_OPERATOR', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Close a POS shift' })
  closeShift(@Param('id') id: string, @Body() dto: CloseShiftDto) {
    return this.posService.closeShift(id, dto.closingCash, dto.notes);
  }

  @Get('shifts/active')
  @Auth('POS_OPERATOR', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get active shift for current operator' })
  getActiveShift(@CurrentUser('id') userId: string) {
    return this.posService.getActiveShift(userId);
  }

  @Get('shifts')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'List all shifts' })
  getShifts(@Query() filters: any) {
    return this.posService.getShifts(filters);
  }

  @Get('shifts/:id/report')
  @Auth('POS_OPERATOR', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get shift report' })
  getShiftReport(@Param('id') id: string) {
    return this.posService.getShiftReport(id);
  }

  @Post('transactions')
  @Auth('POS_OPERATOR', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a POS transaction (sale)' })
  createTransaction(@Body() dto: POSTransactionDto) {
    return this.posService.createTransaction(dto.shiftId, dto);
  }

  @Post('transactions/:id/void')
  @Auth('POS_OPERATOR', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Void a transaction' })
  voidTransaction(@Param('id') id: string, @Body('reason') reason: string) {
    return this.posService.voidTransaction(id, reason);
  }

  @Post('transactions/:id/return')
  @Auth('POS_OPERATOR', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Process return for a transaction' })
  processReturn(@Param('id') id: string, @Body() body: { items: any[]; reason: string }) {
    return this.posService.processReturn(id, body.items, body.reason);
  }

  @Get('transactions')
  @Auth('POS_OPERATOR', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get transactions' })
  getTransactions(@Query() filters: TransactionFiltersDto) {
    return this.posService.getTransactions(filters.shiftId, filters);
  }

  @Post('cash-movements')
  @Auth('POS_OPERATOR', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Record cash movement (cash in/out)' })
  addCashMovement(@Body() dto: CashMovementDto, @CurrentUser('id') userId: string) {
    return this.posService.addCashMovement(dto.shiftId, dto.type, dto.amount, dto.reason, userId);
  }

  @Get('search')
  @Auth('POS_OPERATOR', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Search products for POS' })
  searchProduct(@Query('q') query: string) {
    return this.posService.searchProduct(query);
  }

  @Get('barcode/:code')
  @Auth('POS_OPERATOR', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get product by barcode' })
  getByBarcode(@Param('code') code: string) {
    return this.posService.getProductByBarcode(code);
  }

  @Get('daily-report')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get daily POS report' })
  getDailyReport(@Query('storeId') storeId: string, @Query('date') date: string) {
    return this.posService.getDailyReport(storeId, date ? new Date(date) : new Date());
  }
}
