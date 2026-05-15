export function generateEAN13(): string {
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
  const checkDigit = calculateEAN13CheckDigit(digits);
  return [...digits, checkDigit].join('');
}

function calculateEAN13CheckDigit(digits: number[]): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

export function validateEAN13(barcode: string): boolean {
  if (!/^\d{13}$/.test(barcode)) return false;
  const digits = barcode.split('').map(Number);
  const expected = calculateEAN13CheckDigit(digits.slice(0, 12));
  return digits[12] === expected;
}

export function generateEAN8(): string {
  const digits = Array.from({ length: 7 }, () => Math.floor(Math.random() * 10));
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    sum += digits[i] * (i % 2 === 0 ? 3 : 1);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return [...digits, checkDigit].join('');
}

export function generateCode128(prefix = 'SHJ'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${prefix}${timestamp}`;
}

export function parseBarcodeType(barcode: string): 'EAN13' | 'EAN8' | 'CODE128' | 'UNKNOWN' {
  if (/^\d{13}$/.test(barcode)) return 'EAN13';
  if (/^\d{8}$/.test(barcode)) return 'EAN8';
  if (barcode.length >= 6) return 'CODE128';
  return 'UNKNOWN';
}
