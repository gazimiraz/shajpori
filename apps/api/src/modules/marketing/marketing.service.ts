import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import {
  CreateCouponDto,
  UpdateCouponDto,
  DiscountType,
} from './dto/create-coupon.dto';
import { CreateFlashSaleDto, UpdateFlashSaleDto } from './dto/create-flash-sale.dto';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/create-campaign.dto';

interface CouponFilters {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

interface LoyaltyHistoryFilters {
  page?: number;
  limit?: number;
  type?: string;
  from?: string;
  to?: string;
}

interface CampaignFilters {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
}

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─── COUPONS ─────────────────────────────────────────────────────────────

  async getCoupons(filters: CouponFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getCoupon(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException(`Coupon ${id} not found`);
    return coupon;
  }

  async createCoupon(dto: CreateCouponDto) {
    const existing = await this.prisma.coupon.findUnique({
      where: { code: dto.code.toUpperCase() },
    });
    if (existing) {
      throw new BadRequestException(`Coupon code '${dto.code}' already exists`);
    }

    return this.prisma.coupon.create({
      data: {
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description,
        discountType: dto.discountType as any,
        discountValue: dto.discountValue,
        minOrderAmount: dto.minOrderAmount ?? 0,
        maxDiscountAmount: dto.maxDiscountAmount,
        usageLimit: dto.usageLimit,
        userUsageLimit: dto.userUsageLimit,
        isActive: dto.isActive ?? true,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        usageCount: 0,
      },
    });
  }

  async updateCoupon(id: string, dto: UpdateCouponDto) {
    await this.getCoupon(id);
    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...(dto.code !== undefined && { code: dto.code.toUpperCase() }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.discountType !== undefined && { discountType: dto.discountType as any }),
        ...(dto.discountValue !== undefined && { discountValue: dto.discountValue }),
        ...(dto.minOrderAmount !== undefined && { minOrderAmount: dto.minOrderAmount }),
        ...(dto.maxDiscountAmount !== undefined && { maxDiscountAmount: dto.maxDiscountAmount }),
        ...(dto.usageLimit !== undefined && { usageLimit: dto.usageLimit }),
        ...(dto.userUsageLimit !== undefined && { userUsageLimit: dto.userUsageLimit }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.startsAt !== undefined && { startsAt: new Date(dto.startsAt) }),
        ...(dto.expiresAt !== undefined && { expiresAt: new Date(dto.expiresAt) }),
      },
    });
  }

  async deleteCoupon(id: string) {
    await this.getCoupon(id);
    return this.prisma.coupon.delete({ where: { id } });
  }

  async validateCoupon(
    code: string,
    userId: string,
    orderAmount: number,
  ): Promise<{ valid: boolean; discount: number; message?: string }> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return { valid: false, discount: 0, message: 'Coupon not found' };
    }

    if (!coupon.isActive) {
      return { valid: false, discount: 0, message: 'Coupon is not active' };
    }

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
      return { valid: false, discount: 0, message: 'Coupon has not started yet' };
    }

    if (coupon.expiresAt && coupon.expiresAt < now) {
      return { valid: false, discount: 0, message: 'Coupon has expired' };
    }

    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      return { valid: false, discount: 0, message: 'Coupon usage limit reached' };
    }

    if (coupon.minOrderAmount !== null && orderAmount < Number(coupon.minOrderAmount)) {
      return {
        valid: false,
        discount: 0,
        message: `Minimum order amount of ${coupon.minOrderAmount} required`,
      };
    }

    // Check per-user usage limit
    if (coupon.userUsageLimit !== null) {
      const userUsageCount = await this.prisma.couponUsage.count({
        where: { couponId: coupon.id, userId },
      });
      if (userUsageCount >= coupon.userUsageLimit) {
        return {
          valid: false,
          discount: 0,
          message: 'You have already used this coupon the maximum number of times',
        };
      }
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discount = (orderAmount * Number(coupon.discountValue)) / 100;
      if (coupon.maxDiscountAmount !== null) {
        discount = Math.min(discount, Number(coupon.maxDiscountAmount));
      }
    } else if (coupon.discountType === DiscountType.FIXED) {
      discount = Math.min(Number(coupon.discountValue), orderAmount);
    } else if (coupon.discountType === DiscountType.FREE_SHIPPING) {
      discount = 0; // shipping discount applied at order level
    }

    return { valid: true, discount };
  }

  async applyCoupon(code: string, cartId: string, userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    });
    if (!cart) throw new NotFoundException(`Cart ${cartId} not found`);

    const cartTotal = cart.items.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0,
    );

    const validation = await this.validateCoupon(code, userId, cartTotal);
    if (!validation.valid) {
      throw new BadRequestException(validation.message ?? 'Invalid coupon');
    }

    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    // Update cart with coupon
    return this.prisma.cart.update({
      where: { id: cartId },
      data: {
        couponId: coupon!.id,
        couponCode: coupon!.code,
        discountAmount: validation.discount,
      },
    });
  }

  // ─── FLASH SALES ─────────────────────────────────────────────────────────

  async getActiveFlashSales() {
    const now = new Date();
    return this.prisma.flashSale.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        },
      },
      orderBy: { endsAt: 'asc' },
    });
  }

  async getFlashSale(id: string) {
    const sale = await this.prisma.flashSale.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        },
      },
    });
    if (!sale) throw new NotFoundException(`Flash sale ${id} not found`);
    return sale;
  }

  async createFlashSale(dto: CreateFlashSaleDto) {
    const { products, ...saleData } = dto;

    return this.prisma.flashSale.create({
      data: {
        name: saleData.name,
        description: saleData.description,
        startsAt: new Date(saleData.startsAt),
        endsAt: new Date(saleData.endsAt),
        isActive: saleData.isActive ?? true,
        products: products
          ? {
              create: products.map((p) => ({
                productId: p.productId,
                variantId: p.variantId,
                discountPercent: p.discountPercent,
                stockLimit: p.stockLimit,
                soldCount: 0,
              })),
            }
          : undefined,
      },
      include: { products: true },
    });
  }

  async updateFlashSale(id: string, dto: UpdateFlashSaleDto) {
    await this.getFlashSale(id);
    const { products, ...saleData } = dto;

    return this.prisma.flashSale.update({
      where: { id },
      data: {
        ...(saleData.name !== undefined && { name: saleData.name }),
        ...(saleData.description !== undefined && { description: saleData.description }),
        ...(saleData.startsAt !== undefined && { startsAt: new Date(saleData.startsAt) }),
        ...(saleData.endsAt !== undefined && { endsAt: new Date(saleData.endsAt) }),
        ...(saleData.isActive !== undefined && { isActive: saleData.isActive }),
      },
      include: { products: true },
    });
  }

  async endFlashSale(id: string) {
    await this.getFlashSale(id);
    return this.prisma.flashSale.update({
      where: { id },
      data: { isActive: false, endsAt: new Date() },
    });
  }

  // ─── LOYALTY ─────────────────────────────────────────────────────────────

  async getLoyaltyBalance(userId: string): Promise<{ points: number; value: number }> {
    const result = await this.prisma.loyaltyTransaction.aggregate({
      where: {
        userId,
        status: 'ACTIVE',
      },
      _sum: { points: true },
    });

    const points = Number(result._sum.points ?? 0);
    // Value: 1 point = 0.01 currency unit (configurable)
    const value = points * 0.01;

    return { points, value };
  }

  async getLoyaltyHistory(userId: string, filters: LoyaltyHistoryFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (filters.type) where.type = filters.type;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const [items, total] = await Promise.all([
      this.prisma.loyaltyTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.loyaltyTransaction.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async addPoints(
    userId: string,
    points: number,
    reason: string,
    referenceId?: string,
  ) {
    if (points <= 0) {
      throw new BadRequestException('Points must be greater than 0');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const [transaction] = await this.prisma.$transaction([
      this.prisma.loyaltyTransaction.create({
        data: {
          userId,
          type: 'ADD',
          points,
          reason,
          referenceId: referenceId ?? null,
          status: 'ACTIVE',
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { loyaltyPoints: { increment: points } },
      }),
    ]);

    return transaction;
  }

  async redeemPoints(userId: string, points: number, orderId?: string) {
    if (points <= 0) {
      throw new BadRequestException('Points to redeem must be greater than 0');
    }

    const balance = await this.getLoyaltyBalance(userId);
    if (balance.points < points) {
      throw new BadRequestException(
        `Insufficient loyalty points. Available: ${balance.points}, Requested: ${points}`,
      );
    }

    const [transaction] = await this.prisma.$transaction([
      this.prisma.loyaltyTransaction.create({
        data: {
          userId,
          type: 'REDEEM',
          points: -points,
          reason: orderId ? `Redeemed for order ${orderId}` : 'Points redeemed',
          referenceId: orderId ?? null,
          status: 'ACTIVE',
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { loyaltyPoints: { decrement: points } },
      }),
    ]);

    return transaction;
  }

  // ─── ABANDONED CART ───────────────────────────────────────────────────────

  async getAbandonedCarts(hoursSince: number = 24) {
    const cutoff = new Date(Date.now() - hoursSince * 60 * 60 * 1000);

    return this.prisma.cart.findMany({
      where: {
        updatedAt: { lt: cutoff },
        items: { some: {} },
        user: { email: { not: null } },
        orderId: null,
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true, images: { where: { isPrimary: true }, take: 1 } },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async sendAbandonedCartEmail(userId: string, cartId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        user: { select: { id: true, email: true, firstName: true } },
        items: { include: { product: { select: { id: true, name: true, price: true } } } },
      },
    });

    if (!cart) throw new NotFoundException(`Cart ${cartId} not found`);
    if (cart.userId !== userId) {
      throw new BadRequestException('Cart does not belong to specified user');
    }

    // Log the send action — actual email would be sent via an email service
    this.logger.log(
      `Sending abandoned cart email to ${cart.user?.email} for cart ${cartId}`,
    );

    // Create notification record
    await this.prisma.notification.create({
      data: {
        userId,
        type: 'ABANDONED_CART',
        title: 'You left items in your cart',
        message: `You have ${cart.items.length} item(s) waiting in your cart.`,
        data: { cartId },
      },
    });

    return { success: true, recipient: cart.user?.email, itemCount: cart.items.length };
  }

  // ─── CAMPAIGNS ────────────────────────────────────────────────────────────

  async getCampaigns(filters: CampaignFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;

    const [items, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async createCampaign(dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type as any,
        audience: (dto.audience ?? 'ALL') as any,
        subject: dto.subject,
        content: dto.content,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        recipientIds: dto.recipientIds ?? [],
        metadata: dto.metadata ?? {},
        status: 'DRAFT',
        sentCount: 0,
        openCount: 0,
        clickCount: 0,
      },
    });
  }

  async updateCampaign(id: string, dto: UpdateCampaignDto) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);

    if (campaign.status === 'SENT') {
      throw new BadRequestException('Cannot update a campaign that has already been sent');
    }

    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.type !== undefined && { type: dto.type as any }),
        ...(dto.audience !== undefined && { audience: dto.audience as any }),
        ...(dto.subject !== undefined && { subject: dto.subject }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.scheduledAt !== undefined && { scheduledAt: new Date(dto.scheduledAt) }),
        ...(dto.recipientIds !== undefined && { recipientIds: dto.recipientIds }),
        ...(dto.metadata !== undefined && { metadata: dto.metadata }),
      },
    });
  }

  async deleteCampaign(id: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);
    return this.prisma.campaign.delete({ where: { id } });
  }

  async sendCampaign(id: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);

    if (campaign.status === 'SENT') {
      throw new BadRequestException('Campaign has already been sent');
    }

    // Determine recipient count
    let recipientCount = 0;
    if (campaign.audience === 'ALL' || campaign.audience === 'CUSTOMERS') {
      recipientCount = await this.prisma.user.count({
        where: campaign.audience === 'CUSTOMERS' ? { role: 'CUSTOMER' } : {},
      });
    } else if (Array.isArray(campaign.recipientIds) && (campaign.recipientIds as string[]).length > 0) {
      recipientCount = (campaign.recipientIds as string[]).length;
    }

    this.logger.log(`Sending campaign ${id} to ~${recipientCount} recipients`);

    return this.prisma.campaign.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        sentCount: recipientCount,
      },
    });
  }

  async getCampaignStats(id: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);

    const openRate =
      campaign.sentCount > 0
        ? ((campaign.openCount / campaign.sentCount) * 100).toFixed(2)
        : '0.00';
    const clickRate =
      campaign.sentCount > 0
        ? ((campaign.clickCount / campaign.sentCount) * 100).toFixed(2)
        : '0.00';

    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      sentAt: campaign.sentAt,
      sentCount: campaign.sentCount,
      openCount: campaign.openCount,
      clickCount: campaign.clickCount,
      openRate: parseFloat(openRate),
      clickRate: parseFloat(clickRate),
    };
  }

  async subscribeNewsletter(email: string) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Invalid email address');
    }
    const redis = this.redis.getClient();
    await redis.sadd('newsletter_subscribers', email.toLowerCase().trim());
    this.logger.log(`Newsletter subscription: ${email}`);
    return { message: 'Subscribed successfully' };
  }

}
