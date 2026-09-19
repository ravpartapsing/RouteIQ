export type PersonStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE';
export type UserRole = 'OWNER' | 'ADMIN' | 'DISPATCHER' | 'ACCOUNTING';

export interface TenantRecord {
  id: string;
  name: string;
  carrierCode: string;
  dotNumber: string | null;
  featureOverrides: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface UserRecord {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: PersonStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Secrets and counters for a web user or a driver. Stored apart from the profile. */
export interface CredentialRecord {
  tenantId: string;
  passwordHash: string | null;
  activationHash: string | null;
  activationExpiresAt: string | null;
  failedAttempts: number;
  lockedUntil: string | null;
  deviceId: string | null;
}

export interface DriverRecord {
  id: string;
  tenantId: string;
  driverCode: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  cdlNumber: string | null;
  cdlState: string | null;
  cdlExpiry: string | null;
  medicalCardExpiry: string | null;
  status: PersonStatus;
  activatedAt: string | null;
  deviceName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionRecord {
  id: string;
  principalKind: 'USER' | 'DRIVER';
  principalId: string;
  tenantId: string;
  secretHash: string;
  deviceId: string | null;
  deviceName: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
}

/** Strips key and index attributes so records never leak storage layout to callers. */
export function strip<T>(item: Record<string, unknown> | undefined): T | undefined {
  if (!item) return undefined;
  const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, GSI4PK, GSI4SK, type, ttl, ...rest } = item;
  return rest as T;
}

export function emptyCredential(tenantId: string): CredentialRecord {
  return {
    tenantId,
    passwordHash: null,
    activationHash: null,
    activationExpiresAt: null,
    failedAttempts: 0,
    lockedUntil: null,
    deviceId: null,
  };
}
