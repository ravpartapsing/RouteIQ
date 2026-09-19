# RouteIQ — DynamoDB single-table design

One table, four GSIs, `PAY_PER_REQUEST`. Keys are built only by `packages/data/src/keys.ts`.

## The rule that drives every choice below

**Every GSI multiplies the write cost of any item that populates it.** At 1,000 drivers the
system writes ~13 M GPS batches a month, so raw track segments populate *no* index at all, and
the live map is folded into GSI1 rather than earning an index of its own.

Two decisions do most of the cost work:

1. **GPS uploads are batched.** One item holds a whole uploaded batch, not one ping. That is
   13 M writes/month instead of 40 M — roughly **$50/mo instead of $150** at 1,000 drivers — and
   the mobile app must buffer for offline anyway, so it costs nothing in design terms.
2. **Raw tracks carry a TTL of 90 days.** IFTA needs four years of *state mileage*, not four
   years of 30-second pings. A nightly roll-up writes per-state daily totals that live forever;
   the raw trace expires itself at no cost. The roll-up needs the `mapMatching` feature, which is
   **off for now** (DECISIONS D7) — until it is on, raw traces are simply kept for 90 days.

## Item collections

Everything sharing a `PK` is one collection, readable in a single query.

| PK | SK | Item |
|---|---|---|
| `TENANT#<id>` | `META` · `SETTINGS#<area>` · `SEQ#<name>` | Carrier record, settings, number sequences |
| `USER#<id>` | `META` · `CRED` · `SESSION#<id>` | Web user, credentials, live refresh sessions |
| `DRIVER#<id>` | `META` · `CRED` · `HOS#<date>` · `SESSION#<id>` | Driver, credentials, daily HOS, sessions |
| `UNIQUE#<kind>#<value>` | `META` | Uniqueness guard + lookup: `EMAIL`, `CARRIER_CODE`, `DRIVER_CODE` (value `<tenant>#<code>`) |
| `TRUCK#<id>` | `META` · `POS#LATEST` | Truck + its current position |
| `TRAILER#<id>` | `META` | |
| `CUSTOMER#<id>` | `META` · `CONTACT#<id>` | |
| `LOCATION#<id>` | `META` | Facility, with the geocode cached on it |
| `ORDER#<id>` | `META` · `STOP#<seq>` · `ACC#<id>` · `EVENT#<ts>#<id>` | **Order, stops, accessorials and status trail in one read** |
| `TRIP#<id>` | `META` · `ORDER#<seq>#<id>` | Trip and the orders it carries |
| `INVOICE#<id>` | `META` · `LINE#<seq>` | |
| `SETTLEMENT#<id>` | `META` · `LINE#<seq>` | |
| `DOC#<id>` | `META` | Pointer to the S3 object; bytes never touch DynamoDB |
| `GPS#<truckId>#<date>` | `<iso ts>` | One uploaded batch. **TTL 90 d. No GSI.** |
| `CONV#<tenant>#<driver>` | `MSG#<ts>#<id>` | Dispatcher ↔ driver thread |
| `NOTIF#<principal>` | `<ts>#<id>` | TTL'd |
| `IDEMP#<scope>#<key>` | `META` | Retry guard. TTL'd |

Partitioning GPS per truck **per UTC day** is what keeps any single partition bounded — a truck
reporting all day tops out around 2,880 pings, far inside the 10 GB partition limit.

## Access patterns → index

| # | Access pattern | Index | Key |
|---|---|---|---|
| 1 | Order with its stops, charges and history | table | `PK = ORDER#<id>` |
| 2 | Orders by status, by pickup date (dispatch board) | GSI1 | `TENANT#<t>#ORDER#AVAILABLE` / `<date>#<id>` |
| 3 | Drivers by status, alphabetical | GSI1 | `TENANT#<t>#DRIVER#ACTIVE` / `<NAME>#<id>` |
| 4 | Trucks by status, by unit number | GSI1 | `TENANT#<t>#TRUCK#ACTIVE` / `<unit>#<id>` |
| 5 | Invoices by status, by date (AR) | GSI1 | `TENANT#<t>#INVOICE#OPEN` / `<date>#<id>` |
| 6 | **Live map — every truck's latest position** | GSI1 | `TENANT#<t>#POS#ACTIVE` / `<updatedAt>#<truckId>` |
| 7 | Orders for a customer | GSI2 | `CUSTOMER#<id>` / `ORDER#<date>#<id>` |
| 8 | Trips for a driver | GSI2 | `DRIVER#<id>` / `TRIP#<date>#<id>` |
| 9 | Documents attached to anything | GSI2 | `ORDER#<id>` / `DOC#<date>#<id>` |
| 10 | Settlements for a driver | GSI2 | `DRIVER#<id>` / `SETTLEMENT#<period>#<id>` |
| 11 | Order by order number | GSI3 | `TENANT#<t>#ORDERNO#RQ-100234` |
| 12 | Driver by driver code, within a carrier | table (guard) | `UNIQUE#DRIVER_CODE#<tenant>#D-0014` |
| 13 | Web login by email (cross-tenant) | table (guard) | `UNIQUE#EMAIL#<email>` |
| 14 | Carrier code → tenant (driver sign-in) | table (guard) | `UNIQUE#CARRIER_CODE#<code>` |
| 15 | Refresh session | table | `<USER\|DRIVER>#<id>` / `SESSION#<sessionId>` — ids are inside the token |
| 16 | **Expiry sweep** — CDL, medical, registration, insurance | GSI4 (sparse) | `TENANT#<t>#DUE#CDL` / `<date>#<id>` |
| 17 | Invoice due dates / AR aging buckets | GSI4 (sparse) | `TENANT#<t>#DUE#INVOICE_DUE` / `<date>#<id>` |
| 18 | GPS history for a truck on a day (IFTA, replay) | table | `PK = GPS#<truck>#<date>` |
| 19 | Driver message thread, newest first | table | `PK = CONV#<t>#<driver>`, scan backwards |

**Uniqueness is enforced with guard items, not GSI lookups.** DynamoDB has no unique
constraint and GSI reads are eventually consistent, so two sign-ups racing for the same carrier
code could both "see" it free. Instead the guard item is written with `attribute_not_exists` in
the same transaction as the thing it guards, and it doubles as the lookup — one strongly
consistent GetItem from email (or carrier code, or driver code) to its owner.

**Credentials live in a separate `CRED` item**, never on the profile. Listing users or drivers
through GSI1 therefore cannot return a password hash or activation-code hash, whatever a
future developer projects.

GSI4 is **sparse on purpose**: the keys are written only when there *is* a date to watch, so the
nightly compliance sweep is a small query rather than a scan of the whole table.

## What this model deliberately does not do

Ad-hoc analytics — revenue by lane, driver scorecards, quarterly IFTA, custom report builder —
are **not** DynamoDB queries and should never be attempted as scans.

The plan is the standard serverless one: **point-in-time-recovery incremental export to S3 →
Glue catalog → Athena**. Reports are batch by nature, Athena is charged per byte scanned against
compressed Parquet, and the export costs a fraction of a cent per GB. That work lands in Phase 11
alongside Reports & IFTA; nothing before then needs it.

The live operational reads above stay on DynamoDB and stay fast.
