// ============================================================
// SHAJ ECOM - Shared TypeScript Types
// ============================================================

// --- API Response Types ---
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// --- Auth Types ---
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl?: string;
  tenantId?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  tenantId?: string;
  iat?: number;
  exp?: number;
}

export interface LoginDto {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  referralCode?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// --- Enums (mirrors Prisma enums) ---
export type UserRole =
  | 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'STAFF'
  | 'VENDOR' | 'CUSTOMER' | 'POS_OPERATOR' | 'ACCOUNTANT'
  | 'WAREHOUSE_MANAGER';

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'OUT_OF_STOCK';
export type ProductType = 'SIMPLE' | 'VARIABLE' | 'GROUPED' | 'VIRTUAL' | 'DOWNLOADABLE' | 'BUNDLE';
export type StockStatus = 'IN_STOCK' | 'OUT_OF_STOCK' | 'ON_BACKORDER' | 'DISCONTINUED';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'PACKED' | 'SHIPPED'
  | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
  | 'RETURN_REQUESTED' | 'RETURN_IN_TRANSIT' | 'RETURNED' | 'FAILED';
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'CANCELLED' | 'DISPUTED';
export type PaymentMethod = 'CASH' | 'CARD_CREDIT' | 'CARD_DEBIT' | 'STRIPE' | 'PAYPAL'
  | 'SSLCOMMERZ' | 'BKASH' | 'NAGAD' | 'ROCKET' | 'BANK_TRANSFER' | 'CHEQUE'
  | 'MOBILE_BANKING' | 'WALLET' | 'SPLIT';

// --- Product Types ---
export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  sku?: string;
  price: number;
  compareAtPrice?: number;
  stockQuantity: number;
  stockStatus: StockStatus;
  status: ProductStatus;
  imageUrl?: string;
  rating: number;
  reviewCount: number;
  salesCount: number;
  brandName?: string;
  categoryNames: string[];
  createdAt: string;
}

export interface ProductDetail extends ProductListItem {
  description?: string;
  shortDescription?: string;
  type: ProductType;
  barcode?: string;
  costPrice?: number;
  weight?: number;
  variants: ProductVariantDto[];
  images: ProductImageDto[];
  attributes: ProductAttributeDto[];
  tags: string[];
  isFeatured: boolean;
  isNew: boolean;
  isBestSeller: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export interface ProductVariantDto {
  id: string;
  sku: string;
  barcode?: string;
  name?: string;
  price: number;
  compareAtPrice?: number;
  stockQuantity: number;
  imageUrl?: string;
  attributes: Array<{ name: string; value: string }>;
}

export interface ProductImageDto {
  id: string;
  url: string;
  altText?: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductAttributeDto {
  name: string;
  slug: string;
  values: Array<{ value: string; colorHex?: string }>;
}

// --- Order Types ---
export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  currency: string;
  itemCount: number;
  customerName?: string;
  createdAt: string;
}

export interface OrderDetail extends OrderSummary {
  items: OrderItemDto[];
  shippingAddress?: AddressDto;
  billingAddress?: AddressDto;
  payments: PaymentDto[];
  shipments: ShipmentDto[];
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  notes?: string;
}

export interface OrderItemDto {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  sku: string;
  imageUrl?: string;
  quantity: number;
  price: number;
  totalAmount: number;
}

export interface AddressDto {
  id: string;
  label: string;
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country: string;
  phone?: string;
}

export interface PaymentDto {
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  transactionId?: string;
  paidAt?: string;
}

export interface ShipmentDto {
  id: string;
  trackingNumber?: string;
  carrier?: string;
  status: string;
  shippedAt?: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
}

// --- Inventory Types ---
export interface InventoryItemDto {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  sku: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  reservedQty: number;
  availableQty: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  costPrice?: number;
}

export interface StockMovementDto {
  type: string;
  quantity: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
}

// --- POS Types ---
export interface POSCartItem {
  productId: string;
  variantId?: string;
  name: string;
  sku: string;
  barcode?: string;
  imageUrl?: string;
  price: number;
  quantity: number;
  discount: number;
  total: number;
}

export interface POSTransaction {
  items: POSCartItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  payments: Array<{ method: PaymentMethod; amount: number }>;
  customerId?: string;
  customerName?: string;
  notes?: string;
}

// --- Analytics Types ---
export interface DashboardStats {
  today: {
    revenue: number;
    orders: number;
    newCustomers: number;
    avgOrderValue: number;
  };
  yesterday: {
    revenue: number;
    orders: number;
    newCustomers: number;
    avgOrderValue: number;
  };
  thisMonth: {
    revenue: number;
    orders: number;
    newCustomers: number;
  };
  growth: {
    revenue: number;
    orders: number;
    customers: number;
  };
}

export interface RevenueChartData {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  id: string;
  name: string;
  imageUrl?: string;
  revenue: number;
  unitsSold: number;
  orderCount: number;
}

export interface SalesByCategory {
  categoryName: string;
  revenue: number;
  percentage: number;
}

// --- Accounting Types ---
export interface AccountBalanceDto {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  debitTotal: number;
  creditTotal: number;
  balance: number;
}

export interface ProfitLossReport {
  period: string;
  revenue: {
    salesRevenue: number;
    otherRevenue: number;
    totalRevenue: number;
  };
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  expenses: {
    category: string;
    amount: number;
  }[];
  totalExpenses: number;
  netProfit: number;
  netMargin: number;
}

// --- AI Intelligence Types ---
export interface AIInsightDto {
  id: string;
  type: 'forecast' | 'alert' | 'recommendation' | 'anomaly';
  title: string;
  description: string;
  confidence?: number;
  data: unknown;
  createdAt: string;
}

export interface SalesForecastDto {
  period: string;
  dates: string[];
  predicted: number[];
  confidence: number;
  trend: 'up' | 'down' | 'stable';
}

// --- Filter Types ---
export interface ProductFilters extends PaginationQuery {
  categoryId?: string;
  brandId?: string;
  status?: ProductStatus;
  stockStatus?: StockStatus;
  minPrice?: number;
  maxPrice?: number;
  vendorId?: string;
  isFeatured?: boolean;
  tags?: string[];
}

export interface OrderFilters extends PaginationQuery {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  isPOS?: boolean;
}

// --- Notification Types ---
export interface PushNotificationPayload {
  title: string;
  body: string;
  imageUrl?: string;
  actionUrl?: string;
  data?: Record<string, string>;
}

// --- Plugin Types ---
export interface PluginManifest {
  name: string;
  slug: string;
  version: string;
  description: string;
  author: string;
  category: 'payment' | 'shipping' | 'marketing' | 'analytics' | 'crm' | 'other';
  icon?: string;
  hooks: string[];
  settings: PluginSettingSchema[];
  permissions: string[];
}

export interface PluginSettingSchema {
  key: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'boolean' | 'select';
  required: boolean;
  default?: unknown;
  options?: Array<{ label: string; value: string }>;
}

// --- Webhook Types ---
export interface WebhookEvent {
  id: string;
  type: string;
  payload: unknown;
  timestamp: string;
  signature: string;
}

// --- Export ---
export * from './filters';
