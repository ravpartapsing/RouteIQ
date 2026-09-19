import { z } from 'zod';
import { Email, Name } from './common.js';
import { UserRole } from './auth.js';

export const PersonStatus = z.enum(['PENDING', 'ACTIVE', 'INACTIVE']);
export type PersonStatus = z.infer<typeof PersonStatus>;

/** Returned exactly once — when issued. The server keeps only a hash. */
export const IssuedCode = z.object({ code: z.string(), expiresAt: z.string() });
export type IssuedCode = z.infer<typeof IssuedCode>;

export const User = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  role: UserRole,
  status: PersonStatus,
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
});
export type User = z.infer<typeof User>;

export const InviteUserRequest = z.object({
  email: Email,
  firstName: Name,
  lastName: Name,
  role: UserRole.exclude(['OWNER']),
});
export type InviteUserRequest = z.infer<typeof InviteUserRequest>;

export const InviteUserResponse = z.object({ user: User, activation: IssuedCode });
export type InviteUserResponse = z.infer<typeof InviteUserResponse>;

export const Driver = z.object({
  id: z.string(),
  driverCode: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  cdlNumber: z.string().nullable(),
  cdlState: z.string().nullable(),
  cdlExpiry: z.string().nullable(),
  medicalCardExpiry: z.string().nullable(),
  status: PersonStatus,
  /** When the driver's current device was activated; null until they sign in. */
  activatedAt: z.string().nullable(),
  deviceName: z.string().nullable(),
  createdAt: z.string(),
});
export type Driver = z.infer<typeof Driver>;

const UsState = z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, 'Two-letter state');
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');

export const CreateDriverRequest = z.object({
  firstName: Name,
  lastName: Name,
  /** Optional: the carrier's own id for the driver. Generated (D-0001…) when omitted. */
  driverCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{1,20}$/, 'Letters, digits and dashes')
    .optional(),
  phone: z.string().trim().max(30).optional(),
  email: Email.optional(),
  cdlNumber: z.string().trim().max(30).optional(),
  cdlState: UsState.optional(),
  cdlExpiry: IsoDate.optional(),
  medicalCardExpiry: IsoDate.optional(),
});
export type CreateDriverRequest = z.infer<typeof CreateDriverRequest>;

export const CreateDriverResponse = z.object({ driver: Driver, activation: IssuedCode });
export type CreateDriverResponse = z.infer<typeof CreateDriverResponse>;

/** Profile edit. Omitted fields are cleared, so the form always sends the whole profile. */
export const UpdateDriverRequest = z.object({
  firstName: Name,
  lastName: Name,
  phone: z.string().trim().max(30).nullable().optional(),
  email: Email.nullable().optional(),
  cdlNumber: z.string().trim().max(30).nullable().optional(),
  cdlState: UsState.nullable().optional(),
  cdlExpiry: IsoDate.nullable().optional(),
  medicalCardExpiry: IsoDate.nullable().optional(),
});
export type UpdateDriverRequest = z.infer<typeof UpdateDriverRequest>;

export const UpdateStatusRequest = z.object({ status: z.enum(['ACTIVE', 'INACTIVE']) });
export type UpdateStatusRequest = z.infer<typeof UpdateStatusRequest>;

export const ListResponse = <T extends z.ZodTypeAny>(item: T) => z.object({ items: z.array(item) });
