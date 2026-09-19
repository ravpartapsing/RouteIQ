import { key, sortableName } from '../keys.js';
import type { EntityBase, EntitySpec } from './entities.js';

export type AssetStatus = 'ACTIVE' | 'MAINTENANCE' | 'OUT_OF_SERVICE' | 'INACTIVE';
const ASSET_STATUSES = ['ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE', 'INACTIVE'] as const;

/** Units sort as people expect: "7" before "12", then anything non-numeric alphabetically. */
function unitSort(unit: string): string {
  return /^\d+$/.test(unit) ? unit.padStart(10, '0') : `~${unit.toUpperCase()}`;
}

export interface TruckRecord extends EntityBase {
  status: AssetStatus;
  unitNumber: string;
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  plate: string | null;
  plateState: string | null;
  ownership: 'COMPANY' | 'OWNER_OPERATOR' | 'LEASED';
  assignedDriverId: string | null;
  odometer: number | null;
  registrationExpiry: string | null;
  insuranceExpiry: string | null;
  inspectionExpiry: string | null;
  notes: string | null;
}

export const TRUCK: EntitySpec<TruckRecord> = {
  entity: 'TRUCK',
  type: 'TRUCK',
  key: key.truck,
  statuses: ASSET_STATUSES,
  sortKey: (r) => unitSort(r.unitNumber),
  guard: { kind: 'TRUCK_UNIT', value: (r) => r.unitNumber },
  dues: {
    entityType: 'TRUCK',
    kinds: ['REGISTRATION', 'INSURANCE', 'INSPECTION'],
    dates: (r) => ({
      REGISTRATION: r.registrationExpiry,
      INSURANCE: r.insuranceExpiry,
      INSPECTION: r.inspectionExpiry,
    }),
    label: (r) => `Truck ${r.unitNumber}`,
    inactive: ['INACTIVE'],
  },
};

export interface TrailerRecord extends EntityBase {
  status: AssetStatus;
  unitNumber: string;
  trailerType: 'DRY_VAN' | 'REEFER' | 'FLATBED' | 'STEP_DECK' | 'TANKER' | 'CONTAINER' | 'OTHER';
  lengthFt: number | null;
  vin: string | null;
  year: number | null;
  make: string | null;
  plate: string | null;
  plateState: string | null;
  registrationExpiry: string | null;
  inspectionExpiry: string | null;
  notes: string | null;
}

export const TRAILER: EntitySpec<TrailerRecord> = {
  entity: 'TRAILER',
  type: 'TRAILER',
  key: key.trailer,
  statuses: ASSET_STATUSES,
  sortKey: (r) => unitSort(r.unitNumber),
  guard: { kind: 'TRAILER_UNIT', value: (r) => r.unitNumber },
  dues: {
    entityType: 'TRAILER',
    kinds: ['REGISTRATION', 'INSPECTION'],
    dates: (r) => ({ REGISTRATION: r.registrationExpiry, INSPECTION: r.inspectionExpiry }),
    label: (r) => `Trailer ${r.unitNumber}`,
    inactive: ['INACTIVE'],
  },
};

export interface Address {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
}

export interface CustomerRecord extends EntityBase {
  status: 'ACTIVE' | 'INACTIVE';
  name: string;
  mcNumber: string | null;
  dotNumber: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  billingEmail: string | null;
  billingAddress: Address | null;
  paymentTermsDays: number;
  /** Cents, so money is never a float. */
  creditLimitCents: number | null;
  notes: string | null;
}

export const CUSTOMER: EntitySpec<CustomerRecord> = {
  entity: 'CUSTOMER',
  type: 'CUSTOMER',
  key: key.customer,
  statuses: ['ACTIVE', 'INACTIVE'],
  sortKey: (r) => sortableName(r.name),
};

export interface LocationRecord extends EntityBase {
  status: 'ACTIVE' | 'INACTIVE';
  name: string;
  address: Address;
  customerId: string | null;
  contactName: string | null;
  contactPhone: string | null;
  hours: string | null;
  appointmentRequired: boolean;
  notes: string | null;
  /** Cached geocode. Null until resolved; `geocodeSource` says who resolved it. */
  lat: number | null;
  lng: number | null;
  geocodeSource: 'CENSUS' | 'MANUAL' | null;
  geocodedAddress: string | null;
}

export const LOCATION: EntitySpec<LocationRecord> = {
  entity: 'LOCATION',
  type: 'LOCATION',
  key: key.location,
  statuses: ['ACTIVE', 'INACTIVE'],
  sortKey: (r) => sortableName(r.name, r.address.city),
};
