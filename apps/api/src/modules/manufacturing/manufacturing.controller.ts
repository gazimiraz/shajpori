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
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ManufacturingService } from './manufacturing.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  IsDateString,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class BOMComponentDto {
  @ApiProperty() @IsString() productId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiProperty() @IsNumber() @Min(0.0001) quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

class CreateBOMDto {
  @ApiProperty({ description: 'Finished product ID this BOM produces' })
  @IsString()
  productId: string;

  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() estimatedCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  @ApiProperty({ type: [BOMComponentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BOMComponentDto)
  components: BOMComponentDto[];
}

class UpdateBOMDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() estimatedCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;

  @ApiPropertyOptional({ type: [BOMComponentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BOMComponentDto)
  components?: BOMComponentDto[];
}

class CreateMODto {
  @ApiProperty() @IsString() bomId: string;
  @ApiProperty() @IsString() productId: string;
  @ApiProperty() @IsNumber() @Min(1) quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() plannedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

@ApiTags('Manufacturing')
@ApiBearerAuth()
@Auth('ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER')
@Controller('manufacturing')
export class ManufacturingController {
  constructor(private readonly manufacturingService: ManufacturingService) {}

  // ─── BOMs ─────────────────────────────────────────────────────────────────

  @Get('boms')
  @ApiOperation({ summary: 'List Bills of Materials' })
  @ApiQuery({ name: 'productId', required: false })
  getBOMs(@Query('productId') productId?: string) {
    return this.manufacturingService.getBOMs(productId);
  }

  @Post('boms')
  @ApiOperation({ summary: 'Create a new Bill of Materials' })
  createBOM(@Body() dto: CreateBOMDto) {
    return this.manufacturingService.createBOM(dto.productId, dto);
  }

  @Get('boms/:id')
  @ApiOperation({ summary: 'Get a BOM by ID' })
  @ApiParam({ name: 'id' })
  getBOM(@Param('id') id: string) {
    return this.manufacturingService.getBOM(id);
  }

  @Get('boms/:id/cost')
  @ApiOperation({ summary: 'Calculate total BOM component cost' })
  @ApiParam({ name: 'id' })
  getBOMCost(@Param('id') id: string) {
    return this.manufacturingService.getBOMCost(id);
  }

  @Patch('boms/:id')
  @ApiOperation({ summary: 'Update a BOM' })
  @ApiParam({ name: 'id' })
  updateBOM(@Param('id') id: string, @Body() dto: UpdateBOMDto) {
    return this.manufacturingService.updateBOM(id, dto);
  }

  @Delete('boms/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a BOM' })
  @ApiParam({ name: 'id' })
  deleteBOM(@Param('id') id: string) {
    return this.manufacturingService.deleteBOM(id);
  }

  // ─── Manufacturing Orders ─────────────────────────────────────────────────

  @Get('orders')
  @ApiOperation({ summary: 'List Manufacturing Orders (paginated)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMOs(
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.manufacturingService.getMOs({ status, page, limit });
  }

  @Post('orders')
  @ApiOperation({ summary: 'Create a new Manufacturing Order' })
  createMO(@Body() dto: CreateMODto, @CurrentUser('id') userId: string) {
    return this.manufacturingService.createMO(dto, userId);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get Manufacturing Order details' })
  @ApiParam({ name: 'id' })
  getMO(@Param('id') id: string) {
    return this.manufacturingService.getMO(id);
  }

  @Patch('orders/:id/start')
  @ApiOperation({ summary: 'Start a Manufacturing Order (PLANNED -> IN_PROGRESS)' })
  @ApiParam({ name: 'id' })
  startMO(@Param('id') id: string) {
    return this.manufacturingService.startMO(id);
  }

  @Patch('orders/:id/complete')
  @ApiOperation({ summary: 'Complete a Manufacturing Order — adds finished goods, deducts raw materials' })
  @ApiParam({ name: 'id' })
  completeMO(@Param('id') id: string) {
    return this.manufacturingService.completeMO(id);
  }

  @Patch('orders/:id/cancel')
  @ApiOperation({ summary: 'Cancel a Manufacturing Order' })
  @ApiParam({ name: 'id' })
  cancelMO(@Param('id') id: string) {
    return this.manufacturingService.cancelMO(id);
  }
}
