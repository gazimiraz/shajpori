import { nanoid } from 'nanoid';

export function generateSKU(prefix = 'SKU'): string {
  return `${prefix}-${nanoid(8).toUpperCase()}`;
}

export function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = nanoid(6).toUpperCase();
  return `ORD-${year}${month}${day}-${random}`;
}

export function generatePONumber(): string {
  const date = new Date();
  const timestamp = date.getTime().toString().slice(-8);
  return `PO-${timestamp}`;
}

export function generateGRNNumber(): string {
  return `GRN-${nanoid(10).toUpperCase()}`;
}

export function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = nanoid(6).toUpperCase();
  return `INV-${year}${month}-${random}`;
}

export function generateReceiptNumber(): string {
  return `RCP-${nanoid(10).toUpperCase()}`;
}

export function generateEmployeeId(): string {
  return `EMP-${nanoid(6).toUpperCase()}`;
}
