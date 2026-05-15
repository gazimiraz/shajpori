export type OrderStatus =
  | 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'PACKED' | 'SHIPPED'
  | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED'
  | 'PARTIALLY_REFUNDED' | 'RETURN_REQUESTED' | 'RETURN_IN_TRANSIT'
  | 'RETURNED' | 'FAILED';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
  PARTIALLY_REFUNDED: 'Partially Refunded',
  RETURN_REQUESTED: 'Return Requested',
  RETURN_IN_TRANSIT: 'Return in Transit',
  RETURNED: 'Returned',
  FAILED: 'Failed',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'yellow',
  CONFIRMED: 'blue',
  PROCESSING: 'indigo',
  PACKED: 'violet',
  SHIPPED: 'cyan',
  OUT_FOR_DELIVERY: 'orange',
  DELIVERED: 'green',
  CANCELLED: 'red',
  REFUNDED: 'gray',
  PARTIALLY_REFUNDED: 'amber',
  RETURN_REQUESTED: 'pink',
  RETURN_IN_TRANSIT: 'purple',
  RETURNED: 'slate',
  FAILED: 'red',
};

export const ALLOWED_NEXT_STATUSES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED'],
  DELIVERED: ['RETURN_REQUESTED', 'REFUNDED'],
  RETURN_REQUESTED: ['RETURN_IN_TRANSIT', 'CANCELLED'],
  RETURN_IN_TRANSIT: ['RETURNED'],
};

export function canTransitionTo(current: OrderStatus, next: OrderStatus): boolean {
  return ALLOWED_NEXT_STATUSES[current]?.includes(next) ?? false;
}
