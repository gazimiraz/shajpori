import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async getReviews(productId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId, isApproved: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.review.count({ where: { productId, isApproved: true } }),
    ]);
    return {
      data,
      meta: { total, page, limit: Number(limit), totalPages: Math.ceil(total / limit) },
    };
  }

  async createReview(userId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.review.findFirst({
      where: { productId: dto.productId, userId },
    });
    if (existing) throw new ConflictException('You have already reviewed this product');

    const isVerified = dto.orderId
      ? !!(await this.prisma.order.findFirst({
          where: {
            id: dto.orderId,
            userId,
            items: { some: { productId: dto.productId } },
          },
        }))
      : !!(await this.prisma.order.findFirst({
          where: {
            userId,
            status: { in: ['DELIVERED', 'COMPLETED'] },
            items: { some: { productId: dto.productId } },
          },
        }));

    const review = await this.prisma.review.create({
      data: {
        productId: dto.productId,
        userId,
        orderId: dto.orderId,
        rating: dto.rating,
        title: dto.title,
        body: dto.body,
        isVerified,
        isApproved: false,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return { data: review };
  }

  async markHelpful(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    return this.prisma.review.update({
      where: { id },
      data: { helpfulCount: { increment: 1 } },
    });
  }

  async getAdminReviews(page = 1, limit = 20, approved?: boolean) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (approved !== undefined) where.isApproved = approved;

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          product: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);
    return {
      data,
      meta: { total, page, limit: Number(limit), totalPages: Math.ceil(total / limit) },
    };
  }

  async approveReview(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    const [updated] = await Promise.all([
      this.prisma.review.update({ where: { id }, data: { isApproved: true } }),
      this.prisma.product.update({
        where: { id: review.productId },
        data: {
          reviewCount: { increment: 1 },
          rating: await this.recomputeRating(review.productId, true, review.rating),
        },
      }),
    ]);
    return updated;
  }

  async deleteReview(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    await this.prisma.review.delete({ where: { id } });

    if (review.isApproved) {
      await this.prisma.product.update({
        where: { id: review.productId },
        data: {
          reviewCount: { decrement: 1 },
        },
      });
    }
    return { message: 'Review deleted' };
  }

  private async recomputeRating(productId: string, isNew: boolean, newRating: number): Promise<number> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) return newRating;
    const currentCount = product.reviewCount ?? 0;
    const currentRating = product.rating ?? 0;
    if (isNew) {
      return parseFloat(((currentRating * currentCount + newRating) / (currentCount + 1)).toFixed(2));
    }
    return currentRating;
  }
}
