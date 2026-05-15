import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ShippingService } from './shipping.service';
import {
  CreateShipmentDto,
  UpdateShipmentDto,
  AddTrackingEventDto,
} from './dto/create-shipment.dto';
import { Auth } from '../../common/decorators/auth.decorator';

@ApiTags('Shipping')
@ApiBearerAuth()
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get('rates')
  @ApiOperation({ summary: 'Get available shipping rates for weight and destination' })
  @ApiQuery({ name: 'weight', required: true, type: Number })
  @ApiQuery({ name: 'destination', required: true, type: String })
  getRates(
    @Query('weight') weight: string,
    @Query('destination') destination: string,
  ) {
    return this.shippingService.getRates(parseFloat(weight) || 0.5, destination);
  }

  @Post()
  @Auth('ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Create a shipment for an order' })
  createShipment(@Body() dto: CreateShipmentDto) {
    return this.shippingService.createShipment(dto);
  }

  @Get()
  @Auth('ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'List shipments (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'orderId', required: false })
  getShipments(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('orderId') orderId?: string,
  ) {
    return this.shippingService.getShipments({ page, limit, status, orderId });
  }

  @Get('tracking/:trackingNumber')
  @ApiOperation({ summary: 'Get shipment by tracking number (public lookup)' })
  @ApiParam({ name: 'trackingNumber' })
  getTrackingByNumber(@Param('trackingNumber') trackingNumber: string) {
    return this.shippingService.getTrackingByNumber(trackingNumber);
  }

  @Get(':id')
  @Auth('ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Get shipment details with tracking events' })
  @ApiParam({ name: 'id' })
  getShipment(@Param('id') id: string) {
    return this.shippingService.getShipment(id);
  }

  @Patch(':id')
  @Auth('ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Update shipment tracking / carrier' })
  @ApiParam({ name: 'id' })
  updateShipment(@Param('id') id: string, @Body() dto: UpdateShipmentDto) {
    return this.shippingService.updateShipment(id, dto);
  }

  @Post(':id/tracking')
  @Auth('ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Add a tracking event to a shipment' })
  @ApiParam({ name: 'id' })
  addTrackingEvent(
    @Param('id') id: string,
    @Body() dto: AddTrackingEventDto,
  ) {
    return this.shippingService.addTrackingEvent(
      id,
      dto.status,
      dto.location,
      dto.message,
    );
  }
}
