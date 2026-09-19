import { gsi4, isoDate, key, type DueKind } from '../keys.js';
import { del, put, queryIndexUpTo, type TransactItem } from '../db.js';

export interface DueRecord {
  tenantId: string;
  entityType: 'DRIVER' | 'TRUCK' | 'TRAILER';
  entityId: string;
  kind: DueKind;
  dueOn: string;
  /** What a person reads in the list: "Unit 101", "James Davidson (D-0001)". */
  label: string;
}

export type DueDates = Partial<Record<DueKind, string | null | undefined>>;

/**
 * Transaction items that make the entity's due items match `dates`: a date writes (or rewrites)
 * the item, null removes it. An inactive entity passes all-null — nothing to chase.
 */
export function syncDues(
  base: Omit<DueRecord, 'kind' | 'dueOn'>,
  entityPk: string,
  kinds: readonly DueKind[],
  dates: DueDates,
): TransactItem[] {
  return kinds.map((kind) => {
    const dueOn = dates[kind];
    const k = key.due(entityPk, kind);
    if (!dueOn) return del(k);
    const record: DueRecord = { ...base, kind, dueOn: isoDate(dueOn) };
    return put({ ...k, type: 'DUE', ...gsi4.dueOn(base.tenantId, kind, dueOn, base.entityId), ...record });
  });
}

/** Everything of these kinds due on or before `cutoff` (overdue included), soonest first. */
export async function listDue(tenantId: string, kinds: readonly DueKind[], cutoff: string): Promise<DueRecord[]> {
  const pages = await Promise.all(
    kinds.map((kind) =>
      queryIndexUpTo<Record<string, unknown>>('GSI4', `TENANT#${tenantId}#DUE#${kind}`, `${isoDate(cutoff)}#~`),
    ),
  );
  return pages
    .flat()
    // Older driver items carried GSI4 keys on the profile itself; only DUE items count.
    .filter((i) => i['type'] === 'DUE')
    .map((i) => ({
      tenantId: i['tenantId'] as string,
      entityType: i['entityType'] as DueRecord['entityType'],
      entityId: i['entityId'] as string,
      kind: i['kind'] as DueKind,
      dueOn: i['dueOn'] as string,
      label: i['label'] as string,
    }))
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn));
}
