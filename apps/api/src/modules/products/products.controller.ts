import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ----------------------------------------------------------------
  // GET /products (public)
  // ----------------------------------------------------------------
  @Public()
  @Get()
  @ApiOperation({ summary: 'List products with filtering and pagination' })
  @ApiOkResponse({ description: 'Paginated product list' })
  findAll(@Query() filters: ProductFilterDto) {
    return this.productsService.findAll(filters);
  }

  // ----------------------------------------------------------------
  // GET /products/stats (admin)
  // ----------------------------------------------------------------
  @Auth('ADMIN', 'MANAGER')
  @Get('stats')
  @ApiOperation({ summary: 'Get product inventory statistics' })
  getStats() {
    return this.productsService.getStats();
  }

  // ----------------------------------------------------------------
  // PATCH /products/bulk-status (admin)
  // ----------------------------------------------------------------
  @Auth('ADMIN')
  @Patch('bulk-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk update product status' })
  bulkUpdateStatus(
    @Body('ids') ids: string[],
    @Body('status') status: string,
  ) {
    return this.productsService.bulkUpdateStatus(ids, status);
  }

  // ----------------------------------------------------------------
  // GET /products/barcode/:barcode (public)
  // ----------------------------------------------------------------
  @Public()
  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Find product by barcode (EAN/UPC)' })
  findByBarcode(@Param('barcode') barcode: string) {
    return this.productsService.findByBarcode(barcode);
  }

  // ----------------------------------------------------------------
  // GET /products/sku/:sku (authenticated)
  // ----------------------------------------------------------------
  @Auth()
  @Get('sku/:sku')
  @ApiOperation({ summary: 'Find product by SKU' })
  findBySku(@Param('sku') sku: string) {
    return this.productsService.findBySku(sku);
  }

  // ----------------------------------------------------------------
  // GET /products/:id (public)
  // ----------------------------------------------------------------
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get product detail by ID or slug' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  // ----------------------------------------------------------------
  // GET /products/:id/related (public)
  // ----------------------------------------------------------------
  @Public()
  @Get(':id/related')
  @ApiOperation({ summary: 'Get related products in the same category' })
  getRelated(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit = 8,
  ) {
    return this.productsService.getRelated(id, Number(limit));
  }

  // ----------------------------------------------------------------
  // POST /products (admin / manager)
  // ----------------------------------------------------------------
  @Auth('ADMIN', 'MANAGER')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product' })
  @ApiCreatedResponse({ description: 'Product created successfully' })
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.create(dto, userId);
  }

  // ----------------------------------------------------------------
  // PATCH /products/:id (admin / manager)
  // ----------------------------------------------------------------
  @Auth('ADMIN', 'MANAGER')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  // ----------------------------------------------------------------
  // DELETE /products/:id (admin)
  // ----------------------------------------------------------------
  @Auth('ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete (archive) a product' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.delete(id);
  }

  // ----------------------------------------------------------------
  // POST /products/:id/images (authenticated)
  // ----------------------------------------------------------------
  @Auth('ADMIN', 'MANAGER')
  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('images', 10))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ description: 'Product images (max 10 files)' })
  @ApiOperation({ summary: 'Upload images for a product' })
  uploadImages(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.productsService.uploadImages(id, files);
  }

  // ----------------------------------------------------------------
  // POST /products/:id/duplicate (admin)
  // ----------------------------------------------------------------
  @Auth('ADMIN')
  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Duplicate a product as a draft' })
  duplicate(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.duplicate(id);
  }
}
