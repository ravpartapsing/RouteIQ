/**
 * Writes the table definition as JSON for Terraform to read, so the deployed table is built from
 * the same object as the local one. Re-run after any change to table-definition.ts; CI fails if
 * the committed file is stale.
 */
import { writeFileSync } from 'node:fs';
import { TABLE_DEFINITION } from '../packages/data/src/table-definition.js';

const out = new URL('../infra/terraform/generated/table.json', import.meta.url);
writeFileSync(out, `${JSON.stringify(TABLE_DEFINITION, null, 2)}\n`);
console.log(`wrote ${out.pathname}`);
