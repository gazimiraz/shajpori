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
import { MarketingService } from './marketing.service';
import {
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
  ApplyCouponDto,
} from './dto/create-coupon.dto';
import { CreateFlashSaleDto, UpdateFlashSaleDto } from './dto/create-flash-sale.dto';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/create-campaign.dto';
import { AddPointsDto, RedeemPointsDto } from './dto/loyalty.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Marketing')
@Controller('marketing')
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  // ─── COUPONS ─────────────────────────────────────────────────────────────

  @Get('coupons')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'List coupons (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  getCoupons(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.marketingService.getCoupons({ page, limit, search, isActive });
  }

  @Post('coupons')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a coupon' })
  createCoupon(@Body() dto: CreateCouponDto) {
    return this.marketingService.createCoupon(dto);
  }

  @Post('coupons/validate')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a coupon code (public)' })
  validateCoupon(@Body() dto: ValidateCouponDto) {
    return this.marketingService.validateCoupon(dto.code, dto.userId, dto.orderAmount);
  }

  @Post('coupons/apply')
  @Auth()
  @ApiOperation({ summary: 'Apply a coupon to a cart' })
  applyCoupon(@Body() dto: ApplyCouponDto, @CurrentUser('id') userId: string) {
    return this.marketingService.applyCoupon(dto.code, dto.cartId, userId);
  }

  @Get('coupons/:id')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get a coupon by ID' })
  @ApiParam({ name: 'id' })
  getCoupon(@Param('id') id: string) {
    return this.marketingService.getCoupon(id);
  }

  @Patch('coupons/:id')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a coupon' })
  @ApiParam({ name: 'id' })
  updateCoupon(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.marketingService.updateCoupon(id, dto);
  }

  @Delete('coupons/:id')
  @Auth('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a coupon' })
  @ApiParam({ name: 'id' })
  deleteCoupon(@Param('id') id: string) {
    return this.marketingService.deleteCoupon(id);
  }

  // ─── FLASH SALES ─────────────────────────────────────────────────────────

  @Get('flash-sales')
  @Public()
  @ApiOperation({ summary: 'Get active flash sales (public)' })
  getActiveFlashSales() {
    return this.marketingService.getActiveFlashSales();
  }

  @Post('flash-sales')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Create a flash sale' })
  createFlashSale(@Body() dto: CreateFlashSaleDto) {
    return this.marketingService.createFlashSale(dto);
  }

  @Get('flash-sales/:id')
  @Public()
  @ApiOperation({ summary: 'Get flash sale by ID (public)' })
  @ApiParam({ name: 'id' })
  getFlashSale(@Param('id') id: string) {
    return this.marketingService.getFlashSale(id);
  }

  @Patch('flash-sales/:id')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a flash sale' })
  @ApiParam({ name: 'id' })
  updateFlashSale(@Param('id') id: string, @Body() dto: UpdateFlashSaleDto) {
    return this.marketingService.updateFlashSale(id, dto);
  }

  @Delete('flash-sales/:id')
  @Auth('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'End / delete a flash sale' })
  @ApiParam({ name: 'id' })
  endFlashSale(@Param('id') id: string) {
    return this.marketingService.endFlashSale(id);
  }

  // ─── LOYALTY ─────────────────────────────────────────────────────────────

  @Get('loyalty/balance')
  @Auth('CUSTOMER', 'ADMIN')
  @ApiOperation({ summary: 'Get loyalty points balance for current user' })
  getLoyaltyBalance(@CurrentUser('id') userId: string) {
    return this.marketingService.getLoyaltyBalance(userId);
  }

  @Get('loyalty/history')
  @Auth()
  @ApiOperation({ summary: 'Get loyalty points history for current user' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getLoyaltyHistory(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.marketingService.getLoyaltyHistory(userId, { page, limit, type, from, to });
  }

  @Post('loyalty/add-points')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Manually add loyalty points to a user (admin)' })
  addPoints(@Body() dto: AddPointsDto) {
    return this.marketingService.addPoints(
      dto.userId,
      dto.points,
      dto.reason,
      dto.referenceId,
    );
  }

  @Post('loyalty/redeem')
  @Auth('CUSTOMER', 'ADMIN')
  @ApiOperation({ summary: 'Redeem loyalty points' })
  redeemPoints(@CurrentUser('id') userId: string, @Body() dto: RedeemPointsDto) {
    return this.marketingService.redeemPoints(userId, dto.points, dto.orderId);
  }

  // ─── ABANDONED CARTS ─────────────────────────────────────────────────────

  @Get('abandoned-carts')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get abandoned carts' })
  @ApiQuery({ name: 'hoursSince', required: false, type: Number })
  getAbandonedCarts(@Query('hoursSince') hoursSince?: number) {
    return this.marketingService.getAbandonedCarts(hoursSince ?? 24);
  }

  @Post('abandoned-carts/:cartId/email')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Send abandoned cart recovery email' })
  @ApiParam({ name: 'cartId' })
  sendAbandonedCartEmail(
    @Param('cartId') cartId: string,
    @Query('userId') userId: string,
  ) {
    return this.marketingService.sendAbandonedCartEmail(userId, cartId);
  }

  // ─── CAMPAIGNS ────────────────────────────────────────────────────────────

  @Get('campaigns')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'List campaigns' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  getCampaigns(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.marketingService.getCampaigns({ page, limit, type, status });
  }

  @Post('campaigns')
  @Auth('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a campaign' })
  createCampaign(@Body() dto: CreateCampaignDto) {
    return this.marketingService.createCampaign(dto);
  }

  @Get('campaigns/:id')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Get campaign by ID' })
  @ApiParam({ name: 'id' })
  getCampaign(@Param('id') id: string) {
    return this.marketingService.getCampaignStats(id);
  }

  @Patch('campaigns/:id')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Update a campaign' })
  @ApiParam({ name: 'id' })
  updateCampaign(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.marketingService.updateCampaign(id, dto);
  }

  @Delete('campaigns/:id')
  @Auth('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a campaign' })
  @ApiParam({ name: 'id' })
  deleteCampaign(@Param('id') id: string) {
    return this.marketingService.deleteCampaign(id);
  }

  @Post('campaigns/:id/send')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Send a campaign' })
  @ApiParam({ name: 'id' })
  sendCampaign(@Param('id') id: string) {
    return this.marketingService.sendCampaign(id);
  }

  // ─── NEWSLETTER ───────────────────────────────────────────────────────────

  @Public()
  @Post('newsletter')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Subscribe to newsletter (public)' })
  subscribeNewsletter(@Body('email') email: string) {
    return this.marketingService.subscribeNewsletter(email);
  }


}
