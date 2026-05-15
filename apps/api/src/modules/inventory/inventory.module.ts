import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { WebSocketGatewayService } from '../../gateways/websocket.gateway';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, WebSocketGatewayService],
  exports: [InventoryService],
})
export class InventoryModule {}
