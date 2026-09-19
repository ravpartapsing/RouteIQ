# RouteIQ — architecture decisions

Short entries. Each records what was chosen, and the reason that would have to stop being true
for the choice to be wrong.

---

## D1 — Serverless: Lambda + DynamoDB + S3

API Gateway HTTP API → Lambda (Node 22, TypeScript) → DynamoDB single table, with S3 for
documents. On-demand billing throughout, so a pre-revenue month costs near nothing and capacity
is never a decision.

**Reverses if:** GPS ingest volume makes per-invocation pricing worse than a box. Batching
(D4) pushes that crossover far out, and D2 keeps the escape hatch open.

## D2 — The API does not know it is on Lambda

`apps/api/src/app.ts` is a plain Fastify instance. `lambda.ts` wraps it for API Gateway;
`local.ts` listens on a port. Tests call `app.inject()` with no AWS in the loop.

The point is optionality: the same build runs on Lambda now and on a €47 dedicated box later
without a rewrite. Business logic must never import an AWS-only primitive directly — it goes
behind a port in `packages/data` or a small adapter.

## D3 — US market first

Schema carries FMCSA/HOS, IFTA, EDI, USD and imperial units from day one. India (GST, e-way
bill, INR) is a later adapter behind a tax/compliance interface, not a rewrite.

## D4 — GPS is uploaded in batches, and raw traces expire

One DynamoDB item per uploaded batch, not per ping; TTL 90 days; a nightly job rolls up
per-state daily mileage that lives forever for IFTA.

This is the single largest cost lever in the system — ~13 M writes/month instead of ~40 M at
1,000 drivers. The mobile app has to buffer for offline anyway, so it costs nothing in design.

## D5 — Drivers sign in with dispatcher-issued credentials

Carrier code + driver code + one-time activation code, exchanged for a long-lived
device-bound refresh token. No SMS provider, no per-login cost, nothing to bill per driver.

Implemented in Phase 1:

- Codes are 8 characters from Crockford base32 (no I/L/O/U to misread), shown as `XXXX-XXXX`.
  ~40 bits is enough because a code is **single use, expires in 7 days, and is burned after 5
  wrong tries**. Only its SHA-256 is stored; the portal shows it once.
- Activation binds the driver to one device id. **Reissuing a code unbinds the old phone and ends
  its sessions** — the answer to a lost phone. Deactivating a driver does the same.
- Driver refresh tokens last 180 days; web users' 30. The phone/OTP screens are gone.
- Web users invited by an admin use the same mechanism to set their first password.

## D6 — Reporting is not a DynamoDB query

Revenue by lane, driver scorecards, AR aging beyond the GSI4 buckets, quarterly IFTA and any
custom report builder go through **PITR incremental export → S3 → Glue → Athena**, not scans.
Reports are batch by nature and Athena bills per compressed byte scanned. Phase 11.

---

## D7 — Maps: OpenStreetMap only, and every map feature is a switch

Nothing paid, and nothing that needs a running server, is on today.

| Feature | Env switch | Default | What runs when on |
|---|---|---|---|
| `maps` | `FEATURE_MAPS` | **on** | MapLibre (web) / flutter_map (mobile) showing where the driver is, on free OpenFreeMap tiles. No key, no server of ours. |
| `routing` | `FEATURE_ROUTING` | **off — on hold** | Truck-legal routes and billable miles from Valhalla |
| `mapMatching` | `FEATURE_MAP_MATCHING` | **off — on hold** | Snapping GPS traces to roads, for automatic IFTA state mileage |

A tenant can switch a feature off for itself (`TENANT#<id> / SETTINGS#features`), but **can never
switch on what the platform has off** — no tenant can enable routing when no routing service
exists. `GET /config` tells the apps what is on; when maps are off it returns `map: null`, so a
client never even loads a tile style.

Routing and map-matching both need `VALHALLA_URL`, and **the API refuses to start** if either is
switched on without it — a failed deploy is better than a feature that silently does nothing.

### Tiles

OpenFreeMap (`tiles.openfreemap.org`) — free, no API key, no request quota. Not the
`tile.openstreetmap.org` servers: OSM's own usage policy rules those out for an app with real
traffic. The style URL is `MAP_STYLE_URL`, so switching to self-hosted Protomaps PMTiles on S3
later is a config change.

### While routing and map-matching are off

- **Billable miles are entered by the dispatcher.** Every order records the source of its miles
  (`MANUAL` now; `VALHALLA` or `PCMILER` later), so turning routing on is an addition, not a
  data migration.
- **IFTA state mileage is not automatic.** Raw GPS is still stored (D4), so switching
  map-matching on later can back-fill up to the 90-day TTL. Anything older has to come from
  driver trip sheets.
- **The driver map shows position and stops, not a drawn route.** A straight line between stops
  is free; a road-following route needs `routing`.

### When they come back

Valhalla, self-hosted on one small box (~€8–17/mo): the only open-source engine with truck
costing (height/weight/hazmat) *and* map-matching. OpenRouteService's free tier can stand in for
testing. Set `VALHALLA_URL`, flip the switch.

**Billable-miles caveat, unchanged:** US freight is invoiced on PC\*MILER miles and broker
contracts name it. Irrelevant until you sell to brokers; the recorded mileage source keeps the
option open.

---

## D8 — Sessions: short access tokens, rotating refresh tokens

- **Access token:** HS256 JWT, 15 minutes. The signing secret is a SecureString in SSM Parameter
  Store, read once per Lambda container — never in the function's configuration.
- **Refresh token:** `rt1.<U|D>.<principalId>.<sessionId>.<secret>`. Only the secret's hash is
  stored, so a table export yields nothing usable. It **rotates on every use**, conditional on the
  old hash; presenting an already-rotated token is treated as theft and **revokes every session
  that person has**.
- Every refresh re-checks the person, so deactivation or a code reissue takes effect within one
  access-token lifetime.
- **Passwords:** scrypt (N=2¹⁵, r=8, p=1) from Node's standard library — no native module to break
  on Lambda. 12+ characters, no composition rules (NIST 800-63B). 5 failures lock the account for
  15 minutes. Unknown email and wrong password return the same message and take the same time.
- **Web portal:** the refresh token sits in `localStorage` — fine for UAT on one Mac. Before a
  public launch it should move to an httpOnly cookie on an API domain the portal shares.

---

## D9 — Documents go straight to S3; the API only signs and checks

Upload is three calls: `upload-url` (the API checks the entity belongs to the carrier, the type is
PDF/JPEG/PNG/HEIC/WebP and the size ≤ 20 MB, then signs a 10-minute PUT with **content type and
length in the signature**), the client PUTs to S3, then `complete` (the API HEADs the object and
**rejects and deletes it if the size differs** from what was approved). Downloads are 5-minute
signed GETs. Bytes never pass through Lambda — no 6 MB payload limit, no Lambda time spent
shovelling files.

A document record starts `PENDING` with a one-day TTL, so abandoned uploads clean themselves up.

**Gotcha, fixed:** recent AWS SDK v3 releases sign a CRC32 of the *empty* body into presigned
PUT URLs, so every real upload fails. The S3 client sets `requestChecksumCalculation:
'WHEN_REQUIRED'`. Tests use an in-memory store, so this was caught by a manual round trip
against LocalStack, then confirmed on real S3 — which also refuses a larger body on the same URL.

## D10 — Geocoding: US Census, once per address

A location is geocoded by the Census Bureau geocoder (free, no key) when it is created or its
address changes, and the result is cached on the item. Unchanged address → no call. A pin set by
hand wins. A slow or failed lookup never blocks saving: the location is stored without
coordinates and the portal says so.
