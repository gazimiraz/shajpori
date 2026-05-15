export interface DateRangeFilter {
  from?: string;
  to?: string;
}

export interface NumberRangeFilter {
  min?: number;
  max?: number;
}

export type SortDirection = 'asc' | 'desc';

export interface BaseFilter {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: SortDirection;
}

export interface InventoryFilter extends BaseFilter {
  warehouseId?: string;
  isLowStock?: boolean;
  categoryId?: string;
}

export interface CustomerFilter extends BaseFilter {
  status?: string;
  hasOrders?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export interface TransactionFilter extends BaseFilter {
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  accountId?: string;
}
