import { z } from 'zod';
import { ActivationCode, CarrierCode, Email, Name, Password } from './common.js';

export const UserRole = z.enum(['OWNER', 'ADMIN', 'DISPATCHER', 'ACCOUNTING']);
export type UserRole = z.infer<typeof UserRole>;

export const RegisterRequest = z.object({
  companyName: Name,
  carrierCode: CarrierCode,
  dotNumber: z.string().trim().regex(/^\d{1,8}$/, 'USDOT number is digits only').optional(),
  owner: z.object({ firstName: Name, lastName: Name, email: Email, password: Password }),
});
export type RegisterRequest = z.infer<typeof RegisterRequest>;

export const LoginRequest = z.object({ email: Email, password: z.string().min(1).max(200) });
export type LoginRequest = z.infer<typeof LoginRequest>;

/** A web user invited by an admin sets their password with the code they were given. */
export const ActivateUserRequest = z.object({ email: Email, code: ActivationCode, password: Password });
export type ActivateUserRequest = z.infer<typeof ActivateUserRequest>;

export const ActivateDriverRequest = z.object({
  carrierCode: CarrierCode,
  driverCode: z.string().trim().toUpperCase().min(1).max(20),
  code: ActivationCode,
  deviceId: z.string().trim().min(8).max(100),
  deviceName: z.string().trim().max(100).optional(),
});
export type ActivateDriverRequest = z.infer<typeof ActivateDriverRequest>;

export const RefreshRequest = z.object({ refreshToken: z.string().min(20).max(500) });
export type RefreshRequest = z.infer<typeof RefreshRequest>;

export const TokenPair = z.object({
  accessToken: z.string(),
  /** Seconds until the access token expires. */
  expiresIn: z.number(),
  refreshToken: z.string(),
});
export type TokenPair = z.infer<typeof TokenPair>;

export const Principal = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('USER'),
    id: z.string(),
    tenantId: z.string(),
    role: UserRole,
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }),
  z.object({
    kind: z.literal('DRIVER'),
    id: z.string(),
    tenantId: z.string(),
    driverCode: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }),
]);
export type Principal = z.infer<typeof Principal>;

export const MeResponse = z.object({
  principal: Principal,
  tenant: z.object({ id: z.string(), name: z.string(), carrierCode: z.string() }),
});
export type MeResponse = z.infer<typeof MeResponse>;
