import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatar: true,
  role: true,
  isActive: true,
  isEmailVerified: true,
  twoFactorEnabled: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ----------------------------------------------------------------
  // Find by ID (used by JwtStrategy)
  // ----------------------------------------------------------------
  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { ...USER_SELECT, password: true, twoFactorSecret: true },
    });
  }

  // ----------------------------------------------------------------
  // Find by email (used by AuthService)
  // ----------------------------------------------------------------
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { ...USER_SELECT, password: true, twoFactorSecret: true },
    });
  }

  // ----------------------------------------------------------------
  // Admin: paginated user list
  // ----------------------------------------------------------------
  async findAll(filters: PaginationDto & { role?: string; isActive?: boolean }) {
    const where: any = {};
    if (filters.role) where.role = filters.role;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        skip: filters.skip,
        take: filters.take,
        orderBy: { [filters.sortBy ?? 'createdAt']: filters.sortOrder ?? 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: filters.page ?? 1,
        limit: filters.limit ?? 20,
        totalPages: Math.ceil(total / (filters.limit ?? 20)),
      },
    };
  }

  // ----------------------------------------------------------------
  // Update profile
  // ----------------------------------------------------------------
  async update(id: string, dto: UpdateUserDto) {
    await this.assertExists(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: USER_SELECT,
    });
    await this.redis.del(`user:${id}`);
    return updated;
  }

  // ----------------------------------------------------------------
  // Upload avatar
  // ----------------------------------------------------------------
  async updateAvatar(id: string, file: Express.Multer.File) {
    await this.assertExists(id);
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    const updated = await this.prisma.user.update({
      where: { id },
      data: { avatar: avatarUrl },
      select: USER_SELECT,
    });
    await this.redis.del(`user:${id}`);
    return updated;
  }

  // ----------------------------------------------------------------
  // Deactivate account
  // ----------------------------------------------------------------
  async delete(id: string) {
    await this.assertExists(id);
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    // Invalidate all sessions
    await this.redis.flushPattern(`refresh:${id}:*`);
    return { success: true, message: 'User account deactivated' };
  }

  // ----------------------------------------------------------------
  // Addresses
  // ----------------------------------------------------------------
  async getAddresses(userId: string) {
    await this.assertExists(userId);
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    await this.assertExists(userId);

    // If new address is default, unset previous default
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.create({
      data: { ...dto, userId, isDefault: dto.isDefault ?? false },
    });
  }

  async updateAddress(addressId: string, dto: UpdateAddressDto) {
    const address = await this.prisma.address.findUnique({ where: { id: addressId } });
    if (!address) throw new NotFoundException(`Address '${addressId}' not found`);

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId: address.userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({ where: { id: addressId }, data: dto });
  }

  async deleteAddress(addressId: string) {
    const address = await this.prisma.address.findUnique({ where: { id: addressId } });
    if (!address) throw new NotFoundException(`Address '${addressId}' not found`);
    await this.prisma.address.delete({ where: { id: addressId } });
    return { success: true, message: 'Address deleted' };
  }

  async setDefaultAddress(userId: string, addressId: string) {
    // Verify address belongs to user
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) throw new NotFoundException('Address not found or does not belong to user');

    await this.prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    return this.prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });
  }

  // ----------------------------------------------------------------
  // Order history
  // ----------------------------------------------------------------
  async getOrderHistory(userId: string, filters: PaginationDto) {
    await this.assertExists(userId);
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { customerId: userId },
        include: {
          items: { include: { product: { select: { id: true, name: true } } } },
          payment: true,
        },
        skip: filters.skip,
        take: filters.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where: { customerId: userId } }),
    ]);

    return {
      data,
      meta: {
        total,
        page: filters.page ?? 1,
        limit: filters.limit ?? 20,
        totalPages: Math.ceil(total / (filters.limit ?? 20)),
      },
    };
  }

  // ----------------------------------------------------------------
  // Loyalty
  // ----------------------------------------------------------------
  async getLoyaltyBalance(userId: string) {
    await this.assertExists(userId);
    const loyalty = await this.prisma.loyaltyAccount.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    return loyalty ?? { userId, points: 0, tier: 'BRONZE', transactions: [] };
  }

  // ----------------------------------------------------------------
  // Wishlist
  // ----------------------------------------------------------------
  async getWishlist(userId: string) {
    await this.assertExists(userId);
    return this.prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          include: { images: { where: { isPrimary: true }, take: 1 } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleWishlist(userId: string, productId: string) {
    await this.assertExists(userId);

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.wishlistItem.findFirst({
      where: { userId, productId },
    });

    if (existing) {
      await this.prisma.wishlistItem.delete({ where: { id: existing.id } });
      return { action: 'removed', productId };
    }

    await this.prisma.wishlistItem.create({ data: { userId, productId } });
    return { action: 'added', productId };
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------
  private async assertExists(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException(`User '${id}' not found`);
  }
}
