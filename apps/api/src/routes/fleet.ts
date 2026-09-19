import type { FastifyInstance } from 'fastify';
import { CustomerInput, LocationInput, TrailerInput, TruckInput } from '@routeiq/contracts';
import {
  CUSTOMER,
  LOCATION,
  TRAILER,
  TRUCK,
  drivers,
  getOwned,
  type CustomerRecord,
  type LocationRecord,
} from '@routeiq/data';
import { crudRoutes, n } from '../lib/crud.js';
import { ApiError } from '../lib/errors.js';
import { geocode } from '../lib/geocode.js';

const byUnit = (a: { unitNumber: string }, b: { unitNumber: string }) =>
  a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true });

export async function fleetRoutes(app: FastifyInstance): Promise<void> {
  crudRoutes(app, {
    path: '/v1/trucks',
    label: 'Truck',
    spec: TRUCK,
    input: TruckInput,
    sort: byUnit,
    duplicateMessage: { code: 'UNIT_TAKEN', message: 'Another truck already has that unit number', field: 'unitNumber' },
    prepare: async (i, { tenantId }) => {
      if (i.assignedDriverId) {
        const d = await drivers.getDriver(i.assignedDriverId);
        if (!d || d.tenantId !== tenantId) {
          throw new ApiError(400, 'VALIDATION_FAILED', 'Some fields are invalid', { assignedDriverId: 'Driver not found' });
        }
      }
      return {
        unitNumber: i.unitNumber,
        status: i.status,
        vin: n(i.vin),
        year: n(i.year),
        make: n(i.make),
        model: n(i.model),
        plate: n(i.plate),
        plateState: n(i.plateState),
        ownership: i.ownership,
        assignedDriverId: n(i.assignedDriverId),
        odometer: n(i.odometer),
        registrationExpiry: n(i.registrationExpiry),
        insuranceExpiry: n(i.insuranceExpiry),
        inspectionExpiry: n(i.inspectionExpiry),
        notes: n(i.notes),
      };
    },
  });

  crudRoutes(app, {
    path: '/v1/trailers',
    label: 'Trailer',
    spec: TRAILER,
    input: TrailerInput,
    sort: byUnit,
    duplicateMessage: { code: 'UNIT_TAKEN', message: 'Another trailer already has that unit number', field: 'unitNumber' },
    prepare: async (i) => ({
      unitNumber: i.unitNumber,
      status: i.status,
      trailerType: i.trailerType,
      lengthFt: n(i.lengthFt),
      vin: n(i.vin),
      year: n(i.year),
      make: n(i.make),
      plate: n(i.plate),
      plateState: n(i.plateState),
      registrationExpiry: n(i.registrationExpiry),
      inspectionExpiry: n(i.inspectionExpiry),
      notes: n(i.notes),
    }),
  });

  crudRoutes(app, {
    path: '/v1/customers',
    label: 'Customer',
    spec: CUSTOMER,
    input: CustomerInput,
    sort: (a: CustomerRecord, b: CustomerRecord) => a.name.localeCompare(b.name),
    prepare: async (i) => ({
      name: i.name,
      status: i.status,
      mcNumber: n(i.mcNumber),
      dotNumber: n(i.dotNumber),
      contactName: n(i.contactName),
      contactEmail: n(i.contactEmail),
      contactPhone: n(i.contactPhone),
      billingEmail: n(i.billingEmail),
      billingAddress: i.billingAddress ? { ...i.billingAddress, line2: n(i.billingAddress.line2) } : null,
      paymentTermsDays: i.paymentTermsDays,
      creditLimitCents: n(i.creditLimitCents),
      notes: n(i.notes),
    }),
  });

  crudRoutes(app, {
    path: '/v1/locations',
    label: 'Location',
    spec: LOCATION,
    input: LocationInput,
    sort: (a: LocationRecord, b: LocationRecord) => a.name.localeCompare(b.name),
    prepare: async (i, { tenantId, existing }) => {
      if (i.customerId && !(await getOwned(CUSTOMER, tenantId, i.customerId))) {
        throw new ApiError(400, 'VALIDATION_FAILED', 'Some fields are invalid', { customerId: 'Customer not found' });
      }
      const address = { ...i.address, line2: n(i.address.line2) };
      const oneLine = `${address.line1}, ${address.city}, ${address.state} ${address.postalCode}`;

      // Pinned by hand wins. Otherwise reuse the cached geocode while the address is unchanged,
      // and only ask the geocoder when it is new — that is what keeps geocoding effectively free.
      let geo: Pick<LocationRecord, 'lat' | 'lng' | 'geocodeSource' | 'geocodedAddress'>;
      if (i.lat != null && i.lng != null) {
        geo = { lat: i.lat, lng: i.lng, geocodeSource: 'MANUAL', geocodedAddress: oneLine };
      } else if (existing && existing.geocodedAddress === oneLine && existing.lat != null) {
        geo = { lat: existing.lat, lng: existing.lng, geocodeSource: existing.geocodeSource, geocodedAddress: oneLine };
      } else {
        const g = await geocode(address);
        geo = g
          ? { lat: g.lat, lng: g.lng, geocodeSource: 'CENSUS', geocodedAddress: oneLine }
          : { lat: null, lng: null, geocodeSource: null, geocodedAddress: null };
      }
      return {
        name: i.name,
        status: i.status,
        address,
        customerId: n(i.customerId),
        contactName: n(i.contactName),
        contactPhone: n(i.contactPhone),
        hours: n(i.hours),
        appointmentRequired: i.appointmentRequired,
        notes: n(i.notes),
        ...geo,
      };
    },
  });
}
