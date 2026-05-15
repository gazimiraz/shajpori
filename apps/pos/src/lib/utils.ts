import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBDT(amount: number): string {
  return new Intl.NumberFormat('bn-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount);
}

export function formatReceiptDate(date?: string | Date): string {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' });
}
