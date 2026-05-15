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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get approved reviews for a product' })
  @ApiQuery({ name: 'productId', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getReviews(
    @Query('productId') productId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.reviewsService.getReviews(productId, Number(page), Number(limit));
  }

  @Auth()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a product review (authenticated)' })
  createReview(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(userId, dto);
  }

  @Auth()
  @Patch(':id/helpful')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a review as helpful' })
  markHelpful(@Param('id') id: string) {
    return this.reviewsService.markHelpful(id);
  }

  // ─── Admin endpoints ──────────────────────────────────────────────────────

  @Auth('ADMIN', 'MANAGER')
  @Get('admin')
  @ApiOperation({ summary: 'List all reviews for moderation (admin)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'approved', required: false, type: Boolean })
  getAdminReviews(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('approved') approved?: string,
  ) {
    const approvedBool = approved === undefined ? undefined : approved === 'true';
    return this.reviewsService.getAdminReviews(Number(page), Number(limit), approvedBool);
  }

  @Auth('ADMIN', 'MANAGER')
  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a review (admin)' })
  approveReview(@Param('id') id: string) {
    return this.reviewsService.approveReview(id);
  }

  @Auth('ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a review (admin)' })
  deleteReview(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewsService.deleteReview(id);
  }
}
