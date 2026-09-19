import { gsi1, key, scopedGuardValue, type DueKind, type EntityName, type Key, type UniqueKind } from '../keys.js';
import { del, getItem, put, queryIndex, transact, type TransactItem } from '../db.js';
import { syncDues, type DueDates, type DueRecord } from './dues.js';
import { strip } from './types.js';

export interface EntityBase {
  id: string;
  tenantId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Everything that differs between trucks, trailers, customers and locations. The repository
 * code below is shared, so uniqueness, status listing and expiry tracking behave identically.
 */
export interface EntitySpec<T extends EntityBase> {
  entity: EntityName;
  type: string;
  key: (id: string) => Key;
  statuses: readonly string[];
  /** GSI1 sort: what the list is ordered by within a status. */
  sortKey: (r: T) => string;
  /** A carrier-scoped unique value, e.g. the unit number. */
  guard?: { kind: UniqueKind; value: (r: T) => string };
  dues?: {
    entityType: DueRecord['entityType'];
    kinds: readonly DueKind[];
    dates: (r: T) => DueDates;
    label: (r: T) => string;
    /** Statuses whose dates are not worth chasing. */
    inactive: readonly string[];
  };
}

export type SaveResult<T> = { ok: true; record: T } | { ok: false; conflict: 'DUPLICATE' };

function metaItem<T extends EntityBase>(spec: EntitySpec<T>, r: T): Record<string, unknown> {
  return {
    ...spec.key(r.id),
    type: spec.type,
    ...gsi1.byStatus(r.tenantId, spec.entity, r.status, spec.sortKey(r), r.id),
    ...(r as unknown as Record<string, unknown>),
  };
}

function guardKey<T extends EntityBase>(spec: EntitySpec<T>, r: T): Key | null {
  if (!spec.guard) return null;
  return key.unique(spec.guard.kind, scopedGuardValue(r.tenantId, spec.guard.value(r)));
}

function dueItems<T extends EntityBase>(spec: EntitySpec<T>, r: T): TransactItem[] {
  const d = spec.dues;
  if (!d) return [];
  const dates = d.inactive.includes(r.status) ? {} : d.dates(r);
  return syncDues(
    { tenantId: r.tenantId, entityType: d.entityType, entityId: r.id, label: d.label(r) },
    spec.key(r.id).PK,
    d.kinds,
    dates,
  );
}

export async function createEntity<T extends EntityBase>(spec: EntitySpec<T>, r: T): Promise<SaveResult<T>> {
  const g = guardKey(spec, r);
  const items: TransactItem[] = [];
  if (g) items.push(put({ ...g, type: 'UNIQUE', ownerId: r.id, tenantId: r.tenantId }, true));
  items.push(put(metaItem(spec, r), true), ...dueItems(spec, r));
  const result = await transact(items);
  return result.ok ? { ok: true, record: r } : { ok: false, conflict: 'DUPLICATE' };
}

/**
 * Replaces the record. If the unique value changed, the old guard is released and the new one
 * claimed in the same transaction — so a unit number is never briefly held by nobody, or by two.
 */
export async function updateEntity<T extends EntityBase>(spec: EntitySpec<T>, before: T, after: T): Promise<SaveResult<T>> {
  const items: TransactItem[] = [];
  const oldGuard = guardKey(spec, before);
  const newGuard = guardKey(spec, after);
  if (oldGuard && newGuard && oldGuard.PK !== newGuard.PK) {
    items.push(
      del(oldGuard, { expression: 'ownerId = :id', values: { ':id': before.id } }),
      put({ ...newGuard, type: 'UNIQUE', ownerId: after.id, tenantId: after.tenantId }, true),
    );
  }
  items.push(
    {
      Put: {
        ...put(metaItem(spec, after)).Put!,
        // Optimistic concurrency: two dispatchers editing the same truck cannot silently overwrite.
        ConditionExpression: 'updatedAt = :prev',
        ExpressionAttributeValues: { ':prev': before.updatedAt },
      },
    },
    ...dueItems(spec, after),
  );
  const result = await transact(items);
  return result.ok ? { ok: true, record: after } : { ok: false, conflict: 'DUPLICATE' };
}

export async function getEntity<T extends EntityBase>(spec: EntitySpec<T>, id: string): Promise<T | undefined> {
  return strip<T>(await getItem(spec.key(id)));
}

/** Loads a record only if it belongs to the carrier; anything else is simply "not there". */
export async function getOwned<T extends EntityBase>(spec: EntitySpec<T>, tenantId: string, id: string): Promise<T | undefined> {
  const r = await getEntity(spec, id);
  return r && r.tenantId === tenantId ? r : undefined;
}

export async function listEntities<T extends EntityBase>(spec: EntitySpec<T>, tenantId: string): Promise<T[]> {
  const pages = await Promise.all(
    spec.statuses.map((s) => queryIndex<Record<string, unknown>>('GSI1', `TENANT#${tenantId}#${spec.entity}#${s}`)),
  );
  return pages.flat().map((i) => strip<T>(i)!);
}
