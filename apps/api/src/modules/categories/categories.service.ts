import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const CATEGORY_CACHE_TTL = 600; // 10 minutes

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ----------------------------------------------------------------
  // Get full tree (nested)
  // ----------------------------------------------------------------
  async getTree(): Promise<any[]> {
    return this.redis.getOrSet('categories:tree', CATEGORY_CACHE_TTL, async () => {
      const all = await this.prisma.category.findMany({
        where: { isActive: true },
        include: { _count: { select: { products: true } } },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
      return this.buildTree(all, null);
    });
  }

  // ----------------------------------------------------------------
  // Get all with product count (flat)
  // ----------------------------------------------------------------
  async getWithProductCount() {
    return this.redis.getOrSet('categories:with-count', CATEGORY_CACHE_TTL, async () => {
      return this.prisma.category.findMany({
        where: { isActive: true },
        include: {
          _count: { select: { products: true } },
          parent: { select: { id: true, name: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
    });
  }

  // ----------------------------------------------------------------
  // Find all (flat, paginated)
  // ----------------------------------------------------------------
  async findAll(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.category.findMany({
        skip,
        take: limit,
        include: {
          parent: { select: { id: true, name: true } },
          _count: { select: { products: true, children: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.category.count(),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ----------------------------------------------------------------
  // Find one
  // ----------------------------------------------------------------
  async findOne(idOrSlug: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
        _count: { select: { products: true } },
      },
    });
    if (!category) throw new NotFoundException(`Category '${idOrSlug}' not found`);
    return category;
  }

  // ----------------------------------------------------------------
  // Create
  // ----------------------------------------------------------------
  async create(dto: CreateCategoryDto) {
    const slug = await this.generateSlug(dto.name);

    // Validate parentId exists if provided
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException(`Parent category '${dto.parentId}' not found`);
    }

    const category = await this.prisma.category.create({
      data: {
        ...dto,
        slug,
        isActive: dto.isActive ?? true,
        isFeatured: dto.isFeatured ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: { parent: true },
    });

    await this.invalidateCache();
    return category;
  }

  // ----------------------------------------------------------------
  // Update
  // ----------------------------------------------------------------
  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);

    // Prevent circular parent references
    if (dto.parentId === id) {
      throw new ConflictException('A category cannot be its own parent');
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: dto,
      include: { parent: true, _count: { select: { products: true } } },
    });

    await this.invalidateCache();
    return updated;
  }

  // ----------------------------------------------------------------
  // Delete
  // ----------------------------------------------------------------
  async delete(id: string) {
    await this.findOne(id);

    const hasChildren = await this.prisma.category.findFirst({ where: { parentId: id } });
    if (hasChildren) {
      throw new ConflictException('Cannot delete a category that has sub-categories');
    }

    const hasProducts = await this.prisma.productCategory.findFirst({ where: { categoryId: id } });
    if (hasProducts) {
      throw new ConflictException('Cannot delete a category that has assigned products');
    }

    await this.prisma.category.delete({ where: { id } });
    await this.invalidateCache();
    return { success: true, message: 'Category deleted successfully' };
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------
  private buildTree(categories: any[], parentId: string | null): any[] {
    return categories
      .filter((c) => c.parentId === parentId)
      .map((c) => ({
        ...c,
        children: this.buildTree(categories, c.id),
      }));
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
      const exists = await this.prisma.category.findFirst({ where: { slug: candidate } });
      if (!exists) return candidate;
      counter++;
    }
  }

  private async invalidateCache(): Promise<void> {
    await Promise.all([
      this.redis.del('categories:tree'),
      this.redis.del('categories:with-count'),
    ]);
  }
}
