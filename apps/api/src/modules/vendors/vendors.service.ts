import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CreateVendorDto, UpdateVendorDto } from './dto/create-vendor.dto';

export type VendorStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

interface VendorFilters {
  status?: VendorStatus;
  page?: number;
  limit?: number;
  search?: string;
}

interface VendorProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

interface PayoutFilters {
  page?: number;
  limit?: number;
  status?: string;
}

@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getVendors(filters: VendorFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { storeName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { storeSlug: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          _count: { select: { products: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.vendor.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getVendor(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, createdAt: true },
        },
        _count: { select: { products: true, payouts: true } },
      },
    });
    if (!vendor) throw new NotFoundException(`Vendor ${id} not found`);

    // Total sales
    const salesAgg = await this.prisma.orderItem.aggregate({
      where: { vendorId: id },
      _sum: { totalPrice: true },
      _count: { id: true },
    });

    return {
      ...vendor,
      totalSales: Number(salesAgg._sum.totalPrice ?? 0),
      totalOrders: salesAgg._count.id,
    };
  }

  async getVendorByUserId(userId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        _count: { select: { products: true } },
      },
    });
    if (!vendor) throw new NotFoundException(`No vendor profile found for user ${userId}`);
    return vendor;
  }

  async createVendor(userId: string, dto: CreateVendorDto) {
    // Check user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    // Check if user already has a vendor profile
    const existing = await this.prisma.vendor.findUnique({ where: { userId } });
    if (existing) {
      throw new ConflictException('User already has a vendor profile');
    }

    // Check slug uniqueness
    const slugExists = await this.prisma.vendor.findUnique({ where: { storeSlug: dto.storeSlug } });
    if (slugExists) {
      throw new ConflictException(`Store slug '${dto.storeSlug}' is already taken`);
    }

    const vendor = await this.prisma.vendor.create({
      data: {
        userId,
        storeName: dto.storeName,
        storeSlug: dto.storeSlug,
        description: dto.description,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        country: dto.country,
        logoUrl: dto.logoUrl,
        bannerUrl: dto.bannerUrl,
        taxId: dto.taxId,
        bankAccount: dto.bankAccount,
        status: 'PENDING',
        rating: 0,
        totalSales: 0,
        totalOrders: 0,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Update user role
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: 'VENDOR' },
    });

    return vendor;
  }

  async updateVendor(id: string, dto: UpdateVendorDto) {
    await this.getVendor(id);

    if (dto.storeSlug) {
      const slugExists = await this.prisma.vendor.findFirst({
        where: { storeSlug: dto.storeSlug, id: { not: id } },
      });
      if (slugExists) {
        throw new ConflictException(`Store slug '${dto.storeSlug}' is already taken`);
      }
    }

    return this.prisma.vendor.update({
      where: { id },
      data: {
        ...(dto.storeName !== undefined && { storeName: dto.storeName }),
        ...(dto.storeSlug !== undefined && { storeSlug: dto.storeSlug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.bannerUrl !== undefined && { bannerUrl: dto.bannerUrl }),
        ...(dto.taxId !== undefined && { taxId: dto.taxId }),
        ...(dto.bankAccount !== undefined && { bankAccount: dto.bankAccount }),
      },
    });
  }

  async approveVendor(id: string, approverId: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id } });
    if (!vendor) throw new NotFoundException(`Vendor ${id} not found`);
    if (vendor.status === 'APPROVED') {
      throw new BadRequestException('Vendor is already approved');
    }

    return this.prisma.vendor.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: approverId,
        approvedAt: new Date(),
        rejectionReason: null,
      },
    });
  }

  async rejectVendor(id: string, reason: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id } });
    if (!vendor) throw new NotFoundException(`Vendor ${id} not found`);

    return this.prisma.vendor.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
      },
    });
  }

  async suspendVendor(id: string, reason: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id } });
    if (!vendor) throw new NotFoundException(`Vendor ${id} not found`);

    return this.prisma.vendor.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
        suspendedReason: reason,
        suspendedAt: new Date(),
      },
    });
  }

  async getVendorProducts(vendorId: string, filters: VendorProductFilters) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException(`Vendor ${vendorId} not found`);

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { vendorId };
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          category: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getVendorStats(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException(`Vendor ${vendorId} not found`);

    const [orderStats, productCount, pendingPayouts] = await Promise.all([
      this.prisma.orderItem.aggregate({
        where: { vendorId },
        _sum: { totalPrice: true },
        _count: { id: true },
      }),
      this.prisma.product.count({ where: { vendorId } }),
      this.prisma.vendorPayout.aggregate({
        where: { vendorId, status: 'PENDING' },
        _sum: { amount: true },
      }),
    ]);

    const totalRevenue = Number(orderStats._sum.totalPrice ?? 0);
    const totalOrders = orderStats._count.id;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const pendingPayoutAmount = Number(pendingPayouts._sum.amount ?? 0);

    return {
      vendorId,
      storeName: vendor.storeName,
      totalRevenue,
      totalOrders,
      avgOrderValue,
      productCount,
      pendingPayoutAmount,
      rating: Number(vendor.rating),
      status: vendor.status,
    };
  }

  async createPayout(vendorId: string, amount: number, method: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException(`Vendor ${vendorId} not found`);

    if (amount <= 0) {
      throw new BadRequestException('Payout amount must be greater than 0');
    }

    return this.prisma.vendorPayout.create({
      data: {
        vendorId,
        amount,
        method,
        status: 'PENDING',
        currency: 'BDT',
      },
    });
  }

  async getPayouts(vendorId: string, filters: PayoutFilters) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException(`Vendor ${vendorId} not found`);

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { vendorId };
    if (filters.status) where.status = filters.status;

    const [items, total] = await Promise.all([
      this.prisma.vendorPayout.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.vendorPayout.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async updatePayoutStatus(payoutId: string, status: string, reference?: string) {
    const payout = await this.prisma.vendorPayout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException(`Payout ${payoutId} not found`);

    return this.prisma.vendorPayout.update({
      where: { id: payoutId },
      data: {
        status: status as any,
        reference: reference ?? payout.reference,
        processedAt: status === 'PAID' ? new Date() : undefined,
      },
    });
  }

  async getVendorDashboard(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException(`Vendor ${vendorId} not found`);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      currentMonthStats,
      lastMonthStats,
      recentOrders,
      topProducts,
      pendingPayouts,
      productCount,
    ] = await Promise.all([
      this.prisma.orderItem.aggregate({
        where: { product: { vendorId }, createdAt: { gte: startOfMonth } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.orderItem.aggregate({
        where: { product: { vendorId }, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.orderItem.findMany({
        where: { product: { vendorId } },
        include: {
          order: { select: { id: true, orderNumber: true, status: true, createdAt: true } },
          product: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: { product: { vendorId } },
        _sum: { quantity: true, totalAmount: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 5,
      }),
      this.prisma.vendorPayout.aggregate({
        where: { vendorId, status: 'PENDING' },
        _sum: { amount: true },
      }),
      this.prisma.product.count({ where: { vendorId } }),
    ]);

    const currentRevenue = Number(currentMonthStats._sum.totalAmount ?? 0);
    const lastRevenue = Number(lastMonthStats._sum.totalAmount ?? 0);
    const revenueGrowth =
      lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0;

    return {
      vendor: {
        id: vendor.id,
        storeName: vendor.storeName,
        status: vendor.status,
        rating: Number(vendor.rating),
      },
      thisMonth: {
        revenue: currentRevenue,
        orders: currentMonthStats._count.id,
      },
      lastMonth: {
        revenue: lastRevenue,
        orders: lastMonthStats._count.id,
      },
      revenueGrowth: parseFloat(revenueGrowth.toFixed(2)),
      productCount,
      pendingPayoutAmount: Number(pendingPayouts._sum.amount ?? 0),
      recentOrders,
      topProducts,
    };
  }
}
