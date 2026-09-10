/**
 * **The single source of truth for the table schema.**
 *
 * Terraform reads this (via `scripts/emit-table-json.ts`) to build the deployed table, and
 * `scripts/create-table.ts` reads the same object to create the table in DynamoDB Local. Local
 * and deployed schemas therefore cannot drift — a GSI change is a change to one file.
 *
 * Expressed as plain data, not IaC constructs, so the local script imports nothing heavy.
 */

export interface AttributeDef {
  name: string;
  type: 'S' | 'N' | 'B';
}

export interface IndexDef {
  name: string;
  partitionKey: AttributeDef;
  sortKey: AttributeDef;
  projection: 'ALL' | 'KEYS_ONLY';
}

export interface TableDef {
  partitionKey: AttributeDef;
  sortKey: AttributeDef;
  ttlAttribute: string;
  billing: 'PAY_PER_REQUEST';
  pointInTimeRecovery: boolean;
  streams: boolean;
  globalSecondaryIndexes: IndexDef[];
}

/**
 * Four indexes, deliberately. Every GSI multiplies the write cost of any item that populates it,
 * and GPS is 40 M writes/month at 1,000 drivers — so raw track segments populate **no** index at
 * all, and the whole live-map read is folded into GSI1 rather than earning an index of its own.
 *
 * See `docs/DATA_MODEL.md` for the access pattern → key mapping.
 */
export const TABLE_DEFINITION: TableDef = {
  partitionKey: { name: 'PK', type: 'S' },
  sortKey: { name: 'SK', type: 'S' },
  ttlAttribute: 'ttl',
  billing: 'PAY_PER_REQUEST',
  pointInTimeRecovery: true,
  streams: true,
  globalSecondaryIndexes: [
    {
      // Tenant listings: "orders AVAILABLE by pickup date", "drivers ACTIVE by name",
      // "trucks by unit", and the live map ("latest position per truck, by recency").
      name: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: 'S' },
      sortKey: { name: 'GSI1SK', type: 'S' },
      projection: 'ALL',
    },
    {
      // Child-of-parent: orders for a customer, trips for a driver, documents for an order,
      // settlements for a driver. Parent id in, chronological children out.
      name: 'GSI2',
      partitionKey: { name: 'GSI2PK', type: 'S' },
      sortKey: { name: 'GSI2SK', type: 'S' },
      projection: 'ALL',
    },
    {
      // Business-key lookup: order number, driver code, truck unit, invoice number, and the
      // cross-tenant login keys (user email, tenant slug, refresh-token hash).
      name: 'GSI3',
      partitionKey: { name: 'GSI3PK', type: 'S' },
      sortKey: { name: 'GSI3SK', type: 'S' },
      projection: 'ALL',
    },
    {
      // SPARSE. Only items with something that falls due: CDL and medical-card expiry,
      // registration, insurance, invoice due date (AR aging). Stays tiny, so the nightly
      // compliance sweep is a cheap query instead of a table scan.
      name: 'GSI4',
      partitionKey: { name: 'GSI4PK', type: 'S' },
      sortKey: { name: 'GSI4SK', type: 'S' },
      projection: 'ALL',
    },
  ],
};

/** Shape accepted by `CreateTableCommand`, derived from the definition above. */
export function createTableInput(tableName: string) {
  const attributes = new Map<string, AttributeDef>();
  const add = (attr: AttributeDef) => attributes.set(attr.name, attr);
  add(TABLE_DEFINITION.partitionKey);
  add(TABLE_DEFINITION.sortKey);
  for (const gsi of TABLE_DEFINITION.globalSecondaryIndexes) {
    add(gsi.partitionKey);
    add(gsi.sortKey);
  }

  return {
    TableName: tableName,
    BillingMode: TABLE_DEFINITION.billing,
    AttributeDefinitions: [...attributes.values()].map((a) => ({
      AttributeName: a.name,
      AttributeType: a.type,
    })),
    KeySchema: [
      { AttributeName: TABLE_DEFINITION.partitionKey.name, KeyType: 'HASH' as const },
      { AttributeName: TABLE_DEFINITION.sortKey.name, KeyType: 'RANGE' as const },
    ],
    GlobalSecondaryIndexes: TABLE_DEFINITION.globalSecondaryIndexes.map((gsi) => ({
      IndexName: gsi.name,
      KeySchema: [
        { AttributeName: gsi.partitionKey.name, KeyType: 'HASH' as const },
        { AttributeName: gsi.sortKey.name, KeyType: 'RANGE' as const },
      ],
      Projection: { ProjectionType: gsi.projection },
    })),
  };
}
