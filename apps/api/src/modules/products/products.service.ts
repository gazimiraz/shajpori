import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CreateProductDto, ProductStatus } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto, StockStatus } from './dto/product-filter.dto';

const PRODUCT_CACHE_TTL = 300; // 5 minutes
const PRODUCT_LIST_CACHE_TTL = 120; // 2 minutes

const PRODUCT_INCLUDE = {
  images: { orderBy: { position: 'asc' as const } },
  variants: {
    include: {
      attributeValues: { include: { attributeValue: { include: { attribute: true } } } },
    },
  },
  categories: { include: { category: true } },
  brand: true,
  productAttributes: {
    include: { attribute: true, values: { include: { attributeValue: true } } },
  },
};

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ----------------------------------------------------------------
  // Find all (paginated, filtered)
  // ----------------------------------------------------------------
  async findAll(filters: ProductFilterDto) {
    const cacheKey = `products:list:${JSON.stringify(filters)}`;
    return this.redis.getOrSet(cacheKey, PRODUCT_LIST_CACHE_TTL, async () => {
      const where = this.buildWhereClause(filters);
      const orderBy = this.buildOrderBy(filters);

      const [data, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          orderBy,
          skip: filters.skip,
          take: filters.take,
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            categories: { include: { category: { select: { id: true, name: true } } } },
            brand: { select: { id: true, name: true } },
            _count: { select: { variants: true } },
          },
        }),
        this.prisma.product.count({ where }),
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
    });
  }

  // ----------------------------------------------------------------
  // Find one by id or slug
  // ----------------------------------------------------------------
  async findOne(idOrSlug: string) {
    const cacheKey = `products:detail:${idOrSlug}`;
    return this.redis.getOrSet(cacheKey, PRODUCT_CACHE_TTL, async () => {
      const product = await this.prisma.product.findFirst({
        where: {
          OR: [{ id: idOrSlug }, { slug: idOrSlug }],
          status: { not: ProductStatus.ARCHIVED },
        },
        include: PRODUCT_INCLUDE,
      });
      if (!product) throw new NotFoundException(`Product '${idOrSlug}' not found`);
      return product;
    });
  }

  // ----------------------------------------------------------------
  // Find by barcode
  // ----------------------------------------------------------------
  async findByBarcode(barcode: string) {
    const product = await this.prisma.product.findFirst({
      where: { barcode },
      include: { images: { where: { isPrimary: true }, take: 1 }, brand: true },
    });
    if (!product) throw new NotFoundException(`No product with barcode '${barcode}'`);
    return product;
  }

  // ----------------------------------------------------------------
  // Find by SKU
  // ----------------------------------------------------------------
  async findBySku(sku: string) {
    const product = await this.prisma.product.findFirst({
      where: { sku },
      include: { images: { where: { isPrimary: true }, take: 1 }, brand: true },
    });
    if (!product) throw new NotFoundException(`No product with SKU '${sku}'`);
    return product;
  }

  // ----------------------------------------------------------------
  // Create
  // ----------------------------------------------------------------
  async create(dto: CreateProductDto, userId: string) {
    // Ensure SKU uniqueness
    if (dto.sku) {
      const existing = await this.prisma.product.findFirst({ where: { sku: dto.sku } });
      if (existing) throw new ConflictException(`SKU '${dto.sku}' is already in use`);
    }

    const slug = await this.generateSlug(dto.name);
    const { categoryIds, attributes, dimensions, ...rest } = dto;

    const product = await this.prisma.product.create({
      data: {
        ...rest,
        slug,
        dimensions: dimensions ? JSON.stringify(dimensions) : undefined,
        createdById: userId,
        ...(categoryIds?.length && {
          categories: {
            create: categoryIds.map((id) => ({ categoryId: id })),
          },
        }),
        ...(attributes?.length && {
          productAttributes: {
            create: attributes.map((a) => ({
              attributeId: a.attributeId,
              values: {
                create: a.valueIds.map((vId) => ({ attributeValueId: vId })),
              },
            })),
          },
        }),
      },
      include: PRODUCT_INCLUDE,
    });

    await this.redis.flushPattern('products:list:*');
    return product;
  }

  // ----------------------------------------------------------------
  // Update
  // ----------------------------------------------------------------
  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    const { categoryIds, attributes, dimensions, ...rest } = dto;

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...rest,
        dimensions: dimensions ? JSON.stringify(dimensions) : undefined,
        ...(categoryIds !== undefined && {
          categories: {
            deleteMany: {},
            create: categoryIds.map((cid) => ({ categoryId: cid })),
          },
        }),
      },
      include: PRODUCT_INCLUDE,
    });

    await this.invalidateProductCache(id, updated.slug ?? undefined);
    return updated;
  }

  // ----------------------------------------------------------------
  // Delete (soft delete -> ARCHIVED)
  // ----------------------------------------------------------------
  async delete(id: string) {
    await this.findOne(id);
    const archived = await this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.ARCHIVED },
    });
    await this.invalidateProductCache(id, archived.slug ?? undefined);
    return { success: true, message: 'Product archived successfully' };
  }

  // ----------------------------------------------------------------
  // Update stock
  // ----------------------------------------------------------------
  async updateStock(
    id: string,
    variantId: string | null,
    qty: number,
    type: 'increment' | 'decrement' | 'set',
  ) {
    if (variantId) {
      const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
      if (!variant) throw new NotFoundException('Variant not found');

      const newQty =
        type === 'set'
          ? qty
          : type === 'increment'
          ? variant.stockQuantity + qty
          : Math.max(0, variant.stockQuantity - qty);

      return this.prisma.productVariant.update({
        where: { id: variantId },
        data: { stockQuantity: newQty },
      });
    }

    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    const newQty =
      type === 'set'
        ? qty
        : type === 'increment'
        ? (product.stockQuantity ?? 0) + qty
        : Math.max(0, (product.stockQuantity ?? 0) - qty);

    const updated = await this.prisma.product.update({
      where: { id },
      data: { stockQuantity: newQty },
    });

    await this.invalidateProductCache(id, updated.slug ?? undefined);
    return updated;
  }

  // ----------------------------------------------------------------
  // Upload images
  // ----------------------------------------------------------------
  async uploadImages(id: string, files: Express.Multer.File[]) {
    await this.findOne(id);

    const hasPrimary = await this.prisma.productImage.findFirst({
      where: { productId: id, isPrimary: true },
    });

    const images = await Promise.all(
      files.map((file, index) =>
        this.prisma.productImage.create({
          data: {
            productId: id,
            url: `/uploads/products/${file.filename}`,
            altText: file.originalname,
            isPrimary: !hasPrimary && index === 0,
            position: index,
          },
        }),
      ),
    );

    await this.invalidateProductCache(id);
    return images;
  }

  // ----------------------------------------------------------------
  // Get related products (same category)
  // ----------------------------------------------------------------
  async getRelated(id: string, limit = 8) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { categories: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const categoryIds = product.categories.map((c: any) => c.categoryId);

    return this.prisma.product.findMany({
      where: {
        id: { not: id },
        status: ProductStatus.ACTIVE,
        categories: { some: { categoryId: { in: categoryIds } } },
      },
      take: limit,
      include: { images: { where: { isPrimary: true }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ----------------------------------------------------------------
  // Duplicate
  // ----------------------------------------------------------------
  async duplicate(id: string) {
    const original = await this.prisma.product.findUnique({
      where: { id },
      include: { categories: true, productAttributes: { include: { values: true } } },
    });
    if (!original) throw new NotFoundException('Product not found');

    const newSku = original.sku ? `${original.sku}-COPY-${Date.now()}` : undefined;
    const newSlug = await this.generateSlug(`${original.name} copy`);

    const { id: _id, createdAt, updatedAt, slug, sku, ...data } = original as any;

    const copy = await this.prisma.product.create({
      data: {
        ...data,
        name: `${original.name} (Copy)`,
        slug: newSlug,
        sku: newSku,
        status: ProductStatus.DRAFT,
        categories: {
          create: original.categories.map((c: any) => ({ categoryId: c.categoryId })),
        },
      },
      include: PRODUCT_INCLUDE,
    });

    await this.redis.flushPattern('products:list:*');
    return copy;
  }

  // ----------------------------------------------------------------
  // Bulk update status
  // ----------------------------------------------------------------
  async bulkUpdateStatus(ids: string[], status: string) {
    const result = await this.prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { status: status as ProductStatus },
    });
    // Flush list cache after bulk operation
    await this.redis.flushPattern('products:list:*');
    return { updated: result.count };
  }

  // ----------------------------------------------------------------
  // Stats
  // ----------------------------------------------------------------
  async getStats() {
    const [total, active, outOfStock, featured, lowStock] = await Promise.all([
      this.prisma.product.count({ where: { status: { not: ProductStatus.ARCHIVED } } }),
      this.prisma.product.count({ where: { status: ProductStatus.ACTIVE } }),
      this.prisma.product.count({
        where: { status: ProductStatus.ACTIVE, stockQuantity: { lte: 0 }, trackInventory: true },
      }),
      this.prisma.product.count({
        where: { status: ProductStatus.ACTIVE, isFeatured: true },
      }),
      this.prisma.product.count({
        where: {
          status: ProductStatus.ACTIVE,
          trackInventory: true,
          AND: [
            { stockQuantity: { gt: 0 } },
            { stockQuantity: { lte: this.prisma.product.fields.lowStockThreshold as any } },
          ],
        },
      }),
    ]);

    return { total, active, outOfStock, featured, lowStock };
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------
  private buildWhereClause(filters: ProductFilterDto): any {
    const where: any = {
      status: { not: ProductStatus.ARCHIVED },
    };

    if (filters.status) where.status = filters.status;

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { barcode: { contains: filters.search, mode: 'insensitive' } },
        { tags: { has: filters.search } },
      ];
    }

    if (filters.categoryId) {
      where.categories = { some: { categoryId: filters.categoryId } };
    }

    if (filters.brandId) {
      where.brandId = filters.brandId;
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) where.price.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice;
    }

    if (filters.isFeatured !== undefined) {
      where.isFeatured = filters.isFeatured;
    }

    if (filters.stockStatus === StockStatus.OUT_OF_STOCK) {
      where.stockQuantity = { lte: 0 };
      where.trackInventory = true;
    } else if (filters.stockStatus === StockStatus.LOW_STOCK) {
      where.trackInventory = true;
      where.stockQuantity = { gt: 0, lte: 10 }; // default threshold
    } else if (filters.stockStatus === StockStatus.IN_STOCK) {
      where.OR = [{ trackInventory: false }, { stockQuantity: { gt: 0 } }];
    }

    if (filters.tags?.length) {
      where.tags = { hasSome: filters.tags };
    }

    return where;
  }

  private buildOrderBy(filters: ProductFilterDto): any {
    const field = filters.sortBy ?? 'createdAt';
    const direction = filters.sortOrder ?? 'desc';
    return { [field]: direction };
  }

  private async generateSlug(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    let slug = base;
    let counter = 0;
    while (true) {
      const candidate = counter === 0 ? slug : `${slug}-${counter}`;
      const exists = await this.prisma.product.findFirst({ where: { slug: candidate } });
      if (!exists) return candidate;
      counter++;
    }
  }

  private async invalidateProductCache(id: string, slug?: string): Promise<void> {
    await Promise.all([
      this.redis.del(`products:detail:${id}`),
      slug ? this.redis.del(`products:detail:${slug}`) : Promise.resolve(),
      this.redis.flushPattern('products:list:*'),
    ]);
  }
}
