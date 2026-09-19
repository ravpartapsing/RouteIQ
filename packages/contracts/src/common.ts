import { z } from 'zod';

export const Email = z.string().trim().toLowerCase().email().max(254);

/** 12+ characters, no composition rules — length is what actually resists guessing (NIST 800-63B). */
export const Password = z.string().min(12, 'At least 12 characters').max(200);

/** The carrier code drivers type on the sign-in screen. */
export const CarrierCode = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/, '3–32 letters, digits or dashes');

/** XXXX-XXXX, case-insensitive; the dash is optional when typed. */
export const ActivationCode = z
  .string()
  .trim()
  .toUpperCase()
  .transform((s) => s.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^[0-9A-Z]{8}$/, 'Enter the 8-character code from your dispatcher'));

export const Name = z.string().trim().min(1).max(80);

export const ErrorBody = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
    fields: z.record(z.string()).optional(),
  }),
});
export type ErrorBody = z.infer<typeof ErrorBody>;
