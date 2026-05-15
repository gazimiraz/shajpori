export function formatCurrency(amount: number, currency = 'BDT', locale = 'bn-BD'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatBDT(amount: number): string {
  return `৳${amount.toLocaleString('en-BD')}`;
}

export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[^0-9.-]/g, ''));
}

export function calculateDiscount(original: number, discounted: number): number {
  if (original <= 0) return 0;
  return Math.round(((original - discounted) / original) * 100);
}

export function applyDiscount(price: number, discountPercent: number): number {
  return price - (price * discountPercent) / 100;
}

export function calculateTax(amount: number, taxRate: number): number {
  return (amount * taxRate) / 100;
}
