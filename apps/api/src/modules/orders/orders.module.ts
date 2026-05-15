import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { WebSocketGatewayService } from '../../gateways/websocket.gateway';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, WebSocketGatewayService],
  exports: [OrdersService],
})
export class OrdersModule {}
