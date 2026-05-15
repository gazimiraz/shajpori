import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { VariantsService, CreateVariantDto, UpdateVariantDto } from './variants.service';
import { Auth } from '../../../common/decorators/auth.decorator';
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('Product Variants')
@Controller('products/:productId/variants')
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  // ----------------------------------------------------------------
  // GET /products/:productId/variants (public)
  // ----------------------------------------------------------------
  @Public()
  @Get()
  @ApiOperation({ summary: 'List all variants for a product' })
  @ApiOkResponse({ description: 'List of variants' })
  findAll(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.variantsService.findByProduct(productId);
  }

  // ----------------------------------------------------------------
  // GET /products/:productId/variants/:id (public)
  // ----------------------------------------------------------------
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a single variant by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.variantsService.findOne(id);
  }

  // ----------------------------------------------------------------
  // POST /products/:productId/variants (admin/manager)
  // ----------------------------------------------------------------
  @Auth('ADMIN', 'MANAGER')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new variant for a product' })
  @ApiCreatedResponse({ description: 'Variant created' })
  create(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.variantsService.create(productId, dto);
  }

  // ----------------------------------------------------------------
  // PATCH /products/:productId/variants/:id (admin/manager)
  // ----------------------------------------------------------------
  @Auth('ADMIN', 'MANAGER')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a product variant' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.variantsService.update(id, dto);
  }

  // ----------------------------------------------------------------
  // DELETE /products/:productId/variants/:id (admin)
  // ----------------------------------------------------------------
  @Auth('ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a product variant' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.variantsService.delete(id);
  }
}
