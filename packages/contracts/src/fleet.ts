import { z } from 'zod';
import { Email, Name } from './common.js';

const UsState = z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, 'Two-letter state');
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
const Unit = z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{1,12}$/, 'Letters, digits and dashes, up to 12');
/** VINs are 17 characters and never contain I, O or Q. */
const Vin = z.string().trim().toUpperCase().regex(/^[A-HJ-NPR-Z0-9]{17}$/, '17 characters, no I, O or Q');
const Year = z.coerce.number().int().min(1980).max(new Date().getFullYear() + 2);
const opt = <T extends z.ZodTypeAny>(s: T) => s.nullable().optional();
const text = (max: number) => z.string().trim().max(max);

export const AssetStatus = z.enum(['ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE', 'INACTIVE']);
export type AssetStatus = z.infer<typeof AssetStatus>;

export const TruckInput = z.object({
  unitNumber: Unit,
  status: AssetStatus.default('ACTIVE'),
  vin: opt(Vin),
  year: opt(Year),
  make: opt(text(40)),
  model: opt(text(40)),
  plate: opt(text(12)),
  plateState: opt(UsState),
  ownership: z.enum(['COMPANY', 'OWNER_OPERATOR', 'LEASED']).default('COMPANY'),
  assignedDriverId: opt(z.string()),
  odometer: opt(z.coerce.number().int().min(0).max(5_000_000)),
  registrationExpiry: opt(IsoDate),
  insuranceExpiry: opt(IsoDate),
  inspectionExpiry: opt(IsoDate),
  notes: opt(text(1000)),
});
export type TruckInput = z.input<typeof TruckInput>;

export const Truck = z.object({
  id: z.string(),
  unitNumber: z.string(),
  status: AssetStatus,
  vin: z.string().nullable(),
  year: z.number().nullable(),
  make: z.string().nullable(),
  model: z.string().nullable(),
  plate: z.string().nullable(),
  plateState: z.string().nullable(),
  ownership: z.enum(['COMPANY', 'OWNER_OPERATOR', 'LEASED']),
  assignedDriverId: z.string().nullable(),
  odometer: z.number().nullable(),
  registrationExpiry: z.string().nullable(),
  insuranceExpiry: z.string().nullable(),
  inspectionExpiry: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Truck = z.infer<typeof Truck>;

export const TrailerType = z.enum(['DRY_VAN', 'REEFER', 'FLATBED', 'STEP_DECK', 'TANKER', 'CONTAINER', 'OTHER']);
export type TrailerType = z.infer<typeof TrailerType>;

export const TrailerInput = z.object({
  unitNumber: Unit,
  status: AssetStatus.default('ACTIVE'),
  trailerType: TrailerType.default('DRY_VAN'),
  lengthFt: opt(z.coerce.number().int().min(10).max(60)),
  vin: opt(Vin),
  year: opt(Year),
  make: opt(text(40)),
  plate: opt(text(12)),
  plateState: opt(UsState),
  registrationExpiry: opt(IsoDate),
  inspectionExpiry: opt(IsoDate),
  notes: opt(text(1000)),
});
export type TrailerInput = z.input<typeof TrailerInput>;

export const Trailer = z.object({
  id: z.string(),
  unitNumber: z.string(),
  status: AssetStatus,
  trailerType: TrailerType,
  lengthFt: z.number().nullable(),
  vin: z.string().nullable(),
  year: z.number().nullable(),
  make: z.string().nullable(),
  plate: z.string().nullable(),
  plateState: z.string().nullable(),
  registrationExpiry: z.string().nullable(),
  inspectionExpiry: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Trailer = z.infer<typeof Trailer>;

export const Address = z.object({
  line1: z.string().trim().min(1, 'Required').max(100),
  line2: opt(text(100)),
  city: z.string().trim().min(1, 'Required').max(60),
  state: UsState,
  postalCode: z.string().trim().regex(/^\d{5}(-\d{4})?$/, 'ZIP like 60601 or 60601-1234'),
});
export type Address = z.infer<typeof Address>;

export const CustomerInput = z.object({
  name: Name,
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  mcNumber: opt(z.string().trim().regex(/^\d{1,8}$/, 'Digits only')),
  dotNumber: opt(z.string().trim().regex(/^\d{1,8}$/, 'Digits only')),
  contactName: opt(text(80)),
  contactEmail: opt(Email),
  contactPhone: opt(text(30)),
  billingEmail: opt(Email),
  billingAddress: opt(Address),
  paymentTermsDays: z.coerce.number().int().min(0).max(180).default(30),
  creditLimitCents: opt(z.coerce.number().int().min(0).max(100_000_000_00)),
  notes: opt(text(2000)),
});
export type CustomerInput = z.input<typeof CustomerInput>;

export const Customer = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  mcNumber: z.string().nullable(),
  dotNumber: z.string().nullable(),
  contactName: z.string().nullable(),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
  billingEmail: z.string().nullable(),
  billingAddress: Address.nullable(),
  paymentTermsDays: z.number(),
  creditLimitCents: z.number().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Customer = z.infer<typeof Customer>;

export const LocationInput = z.object({
  name: Name,
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  address: Address,
  customerId: opt(z.string()),
  contactName: opt(text(80)),
  contactPhone: opt(text(30)),
  hours: opt(text(200)),
  appointmentRequired: z.boolean().default(false),
  notes: opt(text(2000)),
  /** Set both to pin the location by hand; otherwise it is geocoded from the address. */
  lat: opt(z.number().min(-90).max(90)),
  lng: opt(z.number().min(-180).max(180)),
});
export type LocationInput = z.input<typeof LocationInput>;

export const Location = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  address: Address,
  customerId: z.string().nullable(),
  contactName: z.string().nullable(),
  contactPhone: z.string().nullable(),
  hours: z.string().nullable(),
  appointmentRequired: z.boolean(),
  notes: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  geocodeSource: z.enum(['CENSUS', 'MANUAL']).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Location = z.infer<typeof Location>;

export const DueKind = z.enum(['CDL', 'MEDICAL', 'REGISTRATION', 'INSURANCE', 'INSPECTION', 'INVOICE_DUE']);
export type DueKind = z.infer<typeof DueKind>;

export const DueItem = z.object({
  entityType: z.enum(['DRIVER', 'TRUCK', 'TRAILER']),
  entityId: z.string(),
  kind: DueKind,
  dueOn: z.string(),
  label: z.string(),
  /** Negative when overdue. */
  daysLeft: z.number(),
});
export type DueItem = z.infer<typeof DueItem>;
