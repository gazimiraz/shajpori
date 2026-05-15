import { Module } from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import { WarehouseController } from './warehouse.controller';
import { WebSocketGatewayService } from '../../gateways/websocket.gateway';

@Module({
  controllers: [WarehouseController],
  providers: [WarehouseService, WebSocketGatewayService],
  exports: [WarehouseService],
})
export class WarehouseModule {}
