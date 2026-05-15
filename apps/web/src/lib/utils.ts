import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBDT(amount: number): string {
  return '৳' + new Intl.NumberFormat('en-BD').format(amount);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-BD', { year: 'numeric', month: 'short', day: 'numeric' });
}
