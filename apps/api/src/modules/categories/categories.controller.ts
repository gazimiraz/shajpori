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
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Auth } from '../../common/decorators/auth.decorator';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ----------------------------------------------------------------
  // GET /categories/tree (public)
  // ----------------------------------------------------------------
  @Public()
  @Get('tree')
  @ApiOperation({ summary: 'Get the full category hierarchy as a nested tree' })
  @ApiOkResponse({ description: 'Nested category tree' })
  getTree() {
    return this.categoriesService.getTree();
  }

  // ----------------------------------------------------------------
  // GET /categories/with-count (public)
  // ----------------------------------------------------------------
  @Public()
  @Get('with-count')
  @ApiOperation({ summary: 'Get flat category list with product counts' })
  getWithProductCount() {
    return this.categoriesService.getWithProductCount();
  }

  // ----------------------------------------------------------------
  // GET /categories (public, paginated flat list)
  // ----------------------------------------------------------------
  @Public()
  @Get()
  @ApiOperation({ summary: 'List all categories (flat, paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.categoriesService.findAll(Number(page), Number(limit));
  }

  // ----------------------------------------------------------------
  // GET /categories/:id (public)
  // ----------------------------------------------------------------
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get category detail by ID or slug' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  // ----------------------------------------------------------------
  // POST /categories (admin/manager)
  // ----------------------------------------------------------------
  @Auth('ADMIN', 'MANAGER')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new category' })
  @ApiCreatedResponse({ description: 'Category created' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  // ----------------------------------------------------------------
  // PATCH /categories/:id (admin/manager)
  // ----------------------------------------------------------------
  @Auth('ADMIN', 'MANAGER')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, dto);
  }

  // ----------------------------------------------------------------
  // DELETE /categories/:id (admin)
  // ----------------------------------------------------------------
  @Auth('ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a category (must have no children or products)' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.delete(id);
  }
}
