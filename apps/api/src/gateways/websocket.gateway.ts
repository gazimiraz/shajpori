import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WsResponse,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/ws' })
export class WebSocketGatewayService
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGatewayService.name);

  /** userId -> Set of connected socket IDs */
  private readonly userSockets = new Map<string, Set<string>>();

  afterInit(_server: Server): void {
    this.logger.log('WebSocket gateway initialized on namespace /ws');
  }

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Clean up user socket map
    for (const [userId, sockets] of this.userSockets.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
        this.logger.debug(`Removed socket ${client.id} from user ${userId}`);
        break;
      }
    }
  }

  /**
   * Client emits `join` with their userId to register the socket.
   */
  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() userId: string,
    @ConnectedSocket() client: Socket,
  ): void {
    if (!userId) return;
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);
    client.join(`user:${userId}`);
    this.logger.log(`Socket ${client.id} joined as user ${userId}`);
  }

  /**
   * Client emits `ping`, server responds with `pong`.
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): WsResponse<{ time: string }> {
    return {
      event: 'pong',
      data: { time: new Date().toISOString() },
    };
  }

  // ----------------------------------------------------------------
  //  Emit helpers
  // ----------------------------------------------------------------

  /** Emit an event to all sockets belonging to a specific user. */
  emitToUser(userId: string, event: string, data: any): void {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /** Broadcast an event to every connected socket. */
  emitToAll(event: string, data: any): void {
    this.server.emit(event, data);
  }

  /** Emit to a named room. */
  emitToRoom(room: string, event: string, data: any): void {
    this.server.to(room).emit(event, data);
  }

  emitNewOrder(order: Record<string, any>): void {
    this.server.emit('new-order', order);
    this.server.to('admin').emit('new-order', order);
  }

  emitOrderStatusChanged(orderId: string, status: string, userId?: string): void {
    if (userId) {
      this.emitToUser(userId, 'order-status-changed', { orderId, status });
    }
    this.server.to('admin').emit('order-status-changed', { orderId, status });
  }

  emitInventoryAlert(alert: {
    productId: string;
    productName: string;
    warehouseId: string;
    currentStock: number;
    threshold: number;
  }): void {
    this.server.to('admin').emit('inventory-alert', alert);
    this.server.to('warehouse').emit('inventory-alert', alert);
  }

  emitLowStockWarning(items: any[]): void {
    const payload = { items, timestamp: new Date().toISOString() };
    this.server.to('admin').emit('low-stock-warning', payload);
    this.server.to('warehouse').emit('low-stock-warning', payload);
  }

  emitPaymentReceived(payment: Record<string, any>): void {
    this.server.to('admin').emit('payment-received', payment);
  }

  emitStockTransferUpdate(transfer: Record<string, any>): void {
    this.server.to('admin').emit('stock-transfer-update', transfer);
    this.server.to('warehouse').emit('stock-transfer-update', transfer);
  }
}
