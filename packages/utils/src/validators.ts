import { z } from 'zod';

export const emailSchema = z.string().email('Invalid email address');
export const phoneSchema = z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number');
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export function isValidEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

export function isValidPhone(phone: string): boolean {
  return phoneSchema.safeParse(phone).success;
}

export function isBangladeshPhone(phone: string): boolean {
  return /^(\+88)?01[3-9]\d{8}$/.test(phone);
}

export function sanitizeInput(input: string): string {
  return input.replace(/[<>'"]/g, '').trim();
}

export function isValidBDNationalId(nid: string): boolean {
  return /^\d{10}$|^\d{17}$/.test(nid);
}
