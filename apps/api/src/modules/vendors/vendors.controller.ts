import {
  Controller,
  Get,
  Post,
  Patch,
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
import { VendorsService } from './vendors.service';
import { CreateVendorDto, UpdateVendorDto } from './dto/create-vendor.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class RejectVendorDto {
  reason: string;
}

class SuspendVendorDto {
  reason: string;
}

class CreatePayoutDto {
  amount: number;
  method: string;
}

class UpdatePayoutStatusDto {
  status: string;
  reference?: string;
}

@ApiTags('Vendors')
@ApiBearerAuth()
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'List all vendors' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  getVendors(
    @Query('status') status?: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.vendorsService.getVendors({ status, page, limit, search });
  }

  @Get('my')
  @Auth('VENDOR')
  @ApiOperation({ summary: 'Get current user vendor profile' })
  getMyVendor(@CurrentUser('id') userId: string) {
    return this.vendorsService.getVendorByUserId(userId);
  }

  @Get('my/dashboard')
  @Auth('VENDOR')
  @ApiOperation({ summary: "Get current vendor's dashboard" })
  async getMyDashboard(@CurrentUser('id') userId: string) {
    const vendor = await this.vendorsService.getVendorByUserId(userId);
    return this.vendorsService.getVendorDashboard(vendor.id);
  }

  @Post('register')
  @Auth('CUSTOMER')
  @ApiOperation({ summary: 'Register current user as vendor' })
  registerAsVendor(@CurrentUser('id') userId: string, @Body() dto: CreateVendorDto) {
    return this.vendorsService.createVendor(userId, dto);
  }

  @Patch('payouts/:id')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Update payout status' })
  @ApiParam({ name: 'id' })
  updatePayoutStatus(
    @Param('id') payoutId: string,
    @Body() dto: UpdatePayoutStatusDto,
  ) {
    return this.vendorsService.updatePayoutStatus(payoutId, dto.status, dto.reference);
  }

  @Get(':id')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get vendor by ID' })
  @ApiParam({ name: 'id' })
  getVendor(@Param('id') id: string) {
    return this.vendorsService.getVendor(id);
  }

  @Patch(':id')
  @Auth('ADMIN', 'VENDOR')
  @ApiOperation({ summary: 'Update vendor profile' })
  @ApiParam({ name: 'id' })
  updateVendor(@Param('id') id: string, @Body() dto: UpdateVendorDto) {
    return this.vendorsService.updateVendor(id, dto);
  }

  @Post(':id/approve')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Approve a vendor' })
  @ApiParam({ name: 'id' })
  approveVendor(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.vendorsService.approveVendor(id, userId);
  }

  @Post(':id/reject')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Reject a vendor application' })
  @ApiParam({ name: 'id' })
  rejectVendor(@Param('id') id: string, @Body() dto: RejectVendorDto) {
    return this.vendorsService.rejectVendor(id, dto.reason);
  }

  @Post(':id/suspend')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Suspend a vendor' })
  @ApiParam({ name: 'id' })
  suspendVendor(@Param('id') id: string, @Body() dto: SuspendVendorDto) {
    return this.vendorsService.suspendVendor(id, dto.reason);
  }

  @Get(':id/products')
  @Auth('ADMIN', 'VENDOR')
  @ApiOperation({ summary: "List vendor's products" })
  @ApiParam({ name: 'id' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  getVendorProducts(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.vendorsService.getVendorProducts(id, { page, limit, search, status });
  }

  @Get(':id/stats')
  @Auth('ADMIN', 'VENDOR')
  @ApiOperation({ summary: 'Get vendor statistics' })
  @ApiParam({ name: 'id' })
  getVendorStats(@Param('id') id: string) {
    return this.vendorsService.getVendorStats(id);
  }

  @Get(':id/payouts')
  @Auth('ADMIN', 'VENDOR')
  @ApiOperation({ summary: 'List vendor payouts' })
  @ApiParam({ name: 'id' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  getPayouts(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.vendorsService.getPayouts(id, { page, limit, status });
  }

  @Post(':id/payouts')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Create payout for vendor' })
  @ApiParam({ name: 'id' })
  createPayout(@Param('id') id: string, @Body() dto: CreatePayoutDto) {
    return this.vendorsService.createPayout(id, dto.amount, dto.method);
  }

  @Get(':id/dashboard')
  @Auth('ADMIN', 'VENDOR')
  @ApiOperation({ summary: "Get vendor's dashboard summary" })
  @ApiParam({ name: 'id' })
  getVendorDashboard(@Param('id') id: string) {
    return this.vendorsService.getVendorDashboard(id);
  }
}
