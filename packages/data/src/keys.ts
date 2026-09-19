/**
 * Every key string in the system is built here, and nowhere else.
 *
 * The rule that makes single-table design survivable: no module ever concatenates a key by hand.
 * If a prefix changes, it changes in this file and the compiler finds every caller.
 *
 * Sort keys are built so that **lexicographic order equals the order a human wants**:
 * dates are ISO-8601 UTC, numbers are zero-padded, names are upper-cased.
 */

export const ENTITY = {
  TENANT: 'TENANT',
  USER: 'USER',
  DRIVER: 'DRIVER',
  TRUCK: 'TRUCK',
  TRAILER: 'TRAILER',
  CUSTOMER: 'CUSTOMER',
  LOCATION: 'LOCATION',
  ORDER: 'ORDER',
  TRIP: 'TRIP',
  DOC: 'DOC',
  INVOICE: 'INVOICE',
  SETTLEMENT: 'SETTLEMENT',
} as const;

export type EntityName = (typeof ENTITY)[keyof typeof ENTITY];

/** Values that must be unique. Tenant-scoped kinds embed the tenant id in the value. */
export type UniqueKind = 'EMAIL' | 'CARRIER_CODE' | 'DRIVER_CODE' | 'TRUCK_UNIT' | 'TRAILER_UNIT';

/** Guard value for something unique only within one carrier (driver code, unit number). */
export function scopedGuardValue(tenantId: string, value: string): string {
  return `${tenantId}#${value}`;
}

/** @deprecated use scopedGuardValue */
export const driverCodeGuardValue = scopedGuardValue;

/** Things that fall due, each tracked as its own item so one entity can have several. */
export type DueKind = 'CDL' | 'MEDICAL' | 'REGISTRATION' | 'INSURANCE' | 'INSPECTION' | 'INVOICE_DUE';

export interface Key {
  PK: string;
  SK: string;
}

export interface Gsi1 {
  GSI1PK: string;
  GSI1SK: string;
}
export interface Gsi2 {
  GSI2PK: string;
  GSI2SK: string;
}
export interface Gsi3 {
  GSI3PK: string;
  GSI3SK: string;
}
export interface Gsi4 {
  GSI4PK: string;
  GSI4SK: string;
}

// ---------------------------------------------------------------------------
// Sortable-string helpers
// ---------------------------------------------------------------------------

/** Zero-pads to 16 digits so string ordering matches numeric ordering (money in cents, bytes). */
export function padNumber(value: number): string {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`not a sortable number: ${value}`);
  return Math.floor(value).toString().padStart(16, '0');
}

/** Zero-pads a small ordinal (stop sequence, invoice line). */
export function padSeq(value: number): string {
  return Math.floor(value).toString().padStart(4, '0');
}

/** `2026-09-11T08:30:00.000Z` — full precision, UTC, always the same length. */
export function isoTimestamp(value: Date | string): string {
  return (typeof value === 'string' ? new Date(value) : value).toISOString();
}

/** `2026-09-11` — for expiry sweeps and period buckets, where time of day is noise. */
export function isoDate(value: Date | string): string {
  return isoTimestamp(value).slice(0, 10);
}

/** Names sort case-insensitively and predictably; falls back cleanly on empty input. */
export function sortableName(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' ').trim().toUpperCase() || 'ZZZ-UNNAMED';
}

// ---------------------------------------------------------------------------
// Primary keys — item collections
// ---------------------------------------------------------------------------
// An "item collection" is everything sharing a PK. Reading an order and its stops, accessorials
// and events is ONE query, not four. That is the whole reason these are grouped this way.

export const key = {
  /** Tenant config, settings and the id sequences that mint order/invoice numbers. */
  tenant: (tenantId: string): Key => ({ PK: `TENANT#${tenantId}`, SK: 'META' }),
  tenantSettings: (tenantId: string, area: string): Key => ({
    PK: `TENANT#${tenantId}`,
    SK: `SETTINGS#${area}`,
  }),
  /** Atomic counter behind human-facing numbers (RQ-100234). Incremented with ADD, never read-then-write. */
  sequence: (tenantId: string, name: string): Key => ({
    PK: `TENANT#${tenantId}`,
    SK: `SEQ#${name}`,
  }),

  /** Web user (owner / dispatcher / accounting). */
  user: (userId: string): Key => ({ PK: `USER#${userId}`, SK: 'META' }),
  /** Password hash, activation code hash, lockout counters. Never listed, never projected. */
  userCredential: (userId: string): Key => ({ PK: `USER#${userId}`, SK: 'CRED' }),

  /**
   * Driver. `CRED` holds the dispatcher-issued activation code and, once activated, the
   * device-bound secret — kept as a separate item so listing drivers never reads credentials.
   */
  driver: (driverId: string): Key => ({ PK: `DRIVER#${driverId}`, SK: 'META' }),
  driverCredential: (driverId: string): Key => ({ PK: `DRIVER#${driverId}`, SK: 'CRED' }),
  driverHosDay: (driverId: string, date: string): Key => ({
    PK: `DRIVER#${driverId}`,
    SK: `HOS#${isoDate(date)}`,
  }),

  /** Refresh-token sessions hang off whoever owns them, so "revoke all my devices" is one query. */
  session: (principalKind: 'USER' | 'DRIVER', principalId: string, tokenId: string): Key => ({
    PK: `${principalKind}#${principalId}`,
    SK: `SESSION#${tokenId}`,
  }),

  truck: (truckId: string): Key => ({ PK: `TRUCK#${truckId}`, SK: 'META' }),
  /** One item per truck, overwritten in place. This is what the live map reads. */
  truckLatestPosition: (truckId: string): Key => ({ PK: `TRUCK#${truckId}`, SK: 'POS#LATEST' }),
  trailer: (trailerId: string): Key => ({ PK: `TRAILER#${trailerId}`, SK: 'META' }),

  customer: (customerId: string): Key => ({ PK: `CUSTOMER#${customerId}`, SK: 'META' }),
  customerContact: (customerId: string, contactId: string): Key => ({
    PK: `CUSTOMER#${customerId}`,
    SK: `CONTACT#${contactId}`,
  }),

  /** Shipper/consignee facility. Geocode is cached on this item, so we pay Mapbox once. */
  location: (locationId: string): Key => ({ PK: `LOCATION#${locationId}`, SK: 'META' }),

  order: (orderId: string): Key => ({ PK: `ORDER#${orderId}`, SK: 'META' }),
  orderStop: (orderId: string, sequence: number): Key => ({
    PK: `ORDER#${orderId}`,
    SK: `STOP#${padSeq(sequence)}`,
  }),
  orderAccessorial: (orderId: string, accessorialId: string): Key => ({
    PK: `ORDER#${orderId}`,
    SK: `ACC#${accessorialId}`,
  }),
  /** Append-only status trail. Same partition as the order, so history is free to read. */
  orderEvent: (orderId: string, at: Date | string, eventId: string): Key => ({
    PK: `ORDER#${orderId}`,
    SK: `EVENT#${isoTimestamp(at)}#${eventId}`,
  }),

  trip: (tripId: string): Key => ({ PK: `TRIP#${tripId}`, SK: 'META' }),
  /** A trip can carry several orders (multi-stop, LTL consolidation). */
  tripOrder: (tripId: string, sequence: number, orderId: string): Key => ({
    PK: `TRIP#${tripId}`,
    SK: `ORDER#${padSeq(sequence)}#${orderId}`,
  }),

  document: (documentId: string): Key => ({ PK: `DOC#${documentId}`, SK: 'META' }),

  invoice: (invoiceId: string): Key => ({ PK: `INVOICE#${invoiceId}`, SK: 'META' }),
  invoiceLine: (invoiceId: string, sequence: number): Key => ({
    PK: `INVOICE#${invoiceId}`,
    SK: `LINE#${padSeq(sequence)}`,
  }),

  settlement: (settlementId: string): Key => ({ PK: `SETTLEMENT#${settlementId}`, SK: 'META' }),
  settlementLine: (settlementId: string, sequence: number): Key => ({
    PK: `SETTLEMENT#${settlementId}`,
    SK: `LINE#${padSeq(sequence)}`,
  }),

  /**
   * Raw GPS, partitioned per truck per UTC day so no partition grows unbounded.
   *
   * One item holds a whole uploaded **batch**, not a single ping. At 1,000 drivers that is the
   * difference between 40 M and 13 M writes a month — the single largest cost lever in the
   * system — and the mobile app has to buffer for offline anyway. Carries a TTL: raw tracks
   * expire at 90 days, after which the rolled-up per-state daily mileage is what IFTA uses.
   */
  gpsSegment: (truckId: string, at: Date | string): Key => ({
    PK: `GPS#${truckId}#${isoDate(at)}`,
    SK: isoTimestamp(at),
  }),

  /** Dispatcher ↔ driver thread. Newest-first reads are a backwards query on the same partition. */
  message: (tenantId: string, driverId: string, at: Date | string, messageId: string): Key => ({
    PK: `CONV#${tenantId}#${driverId}`,
    SK: `MSG#${isoTimestamp(at)}#${messageId}`,
  }),

  notification: (principalId: string, at: Date | string, notificationId: string): Key => ({
    PK: `NOTIF#${principalId}`,
    SK: `${isoTimestamp(at)}#${notificationId}`,
  }),

  /**
   * Uniqueness guard. DynamoDB has no unique constraint and a GSI read can be stale, so anything
   * that must be unique — a login email, a carrier code, a driver code within a carrier — gets a
   * guard item written with `attribute_not_exists` in the same transaction as the thing it guards.
   * It doubles as the lookup: one strongly-consistent GetItem from value to owner.
   */
  unique: (kind: UniqueKind, value: string): Key => ({
    PK: `UNIQUE#${kind}#${value.trim().toUpperCase()}`,
    SK: 'META',
  }),

  /**
   * One date that falls due on an entity — a truck's registration, a driver's CDL. Lives in the
   * entity's own collection and carries the sparse GSI4 keys. Separate items because an index
   * entry holds one date, and a truck has three.
   */
  due: (entityPk: string, kind: DueKind): Key => ({ PK: entityPk, SK: `DUE#${kind}` }),

  /** Write-once guard so a retried mobile upload never double-posts a delivery. */
  idempotency: (scope: string, idempotencyKey: string): Key => ({
    PK: `IDEMP#${scope}#${idempotencyKey}`,
    SK: 'META',
  }),
} as const;

// ---------------------------------------------------------------------------
// GSI1 — tenant listings, ordered
// ---------------------------------------------------------------------------

export const gsi1 = {
  /** `orders in tenant t, status AVAILABLE, by pickup date` — the dispatch board's main read. */
  byStatus: (tenantId: string, entity: EntityName, status: string, sort: string, id: string): Gsi1 => ({
    GSI1PK: `TENANT#${tenantId}#${entity}#${status.toUpperCase()}`,
    GSI1SK: `${sort}#${id}`,
  }),
  /**
   * Live map: every truck's latest position in one query, most recently reported first.
   * Folded in here rather than given its own index — one item per truck, so it costs almost
   * nothing to carry, and an extra GSI would tax every position write.
   */
  livePosition: (tenantId: string, updatedAt: Date | string, truckId: string): Gsi1 => ({
    GSI1PK: `TENANT#${tenantId}#POS#ACTIVE`,
    GSI1SK: `${isoTimestamp(updatedAt)}#${truckId}`,
  }),
} as const;

// ---------------------------------------------------------------------------
// GSI2 — children of a parent, chronological
// ---------------------------------------------------------------------------

export const gsi2 = {
  /** `orders for customer c`, `trips for driver d`, `documents for order o`. */
  ofParent: (
    parentEntity: EntityName,
    parentId: string,
    childEntity: EntityName,
    sort: string,
    childId: string,
  ): Gsi2 => ({
    GSI2PK: `${parentEntity}#${parentId}`,
    GSI2SK: `${childEntity}#${sort}#${childId}`,
  }),
} as const;

// ---------------------------------------------------------------------------
// GSI3 — business-key lookups (order number, truck unit, invoice number)
// ---------------------------------------------------------------------------

export const gsi3 = {
  /** Human-facing identifiers that must resolve to exactly one item within a tenant. */
  businessKey: (tenantId: string, keyType: string, value: string): Gsi3 => ({
    GSI3PK: `TENANT#${tenantId}#${keyType.toUpperCase()}#${value.toUpperCase()}`,
    GSI3SK: 'META',
  }),
} as const;

// ---------------------------------------------------------------------------
// GSI4 — sparse "falls due" index
// ---------------------------------------------------------------------------

export const gsi4 = {
  /**
   * Only ever set when there is a date to watch, which is what keeps this index small enough
   * that the nightly sweep is a query rather than a scan of the whole table.
   *
   * `kind` is CDL | MEDICAL | REGISTRATION | INSURANCE | INVOICE_DUE.
   */
  dueOn: (tenantId: string, kind: string, dueDate: Date | string, id: string): Gsi4 => ({
    GSI4PK: `TENANT#${tenantId}#DUE#${kind.toUpperCase()}`,
    GSI4SK: `${isoDate(dueDate)}#${id}`,
  }),
} as const;
