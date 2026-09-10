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

**Consequence:** the existing `phone_login_screen.dart` and `otp_screen.dart` in the Flutter app
are obsolete and get rewritten in Phase 1.

## D6 — Reporting is not a DynamoDB query

Revenue by lane, driver scorecards, AR aging beyond the GSI4 buckets, quarterly IFTA and any
custom report builder go through **PITR incremental export → S3 → Glue → Athena**, not scans.
Reports are batch by nature and Athena bills per compressed byte scanned. Phase 11.

---

## D7 — Maps: OpenStreetMap the whole way down, no Google

Four separate needs, routinely conflated. Each gets its own answer.

### Basemap tiles — MapLibre GL JS + Protomaps (PMTiles)

[MapLibre GL JS](https://maplibre.org) is the BSD-licensed fork of Mapbox GL JS, so there is no
per-map-load fee and no licence rug-pull to worry about.

For tiles, **Protomaps PMTiles**: the entire basemap is *one file* served over HTTP range
requests. It needs no tile server at all — put the North America extract in S3 behind CloudFront
and the cost is storage plus requests. That is an unusually good fit for a serverless
architecture, because it is the one map component that introduces no running process.

Dev can point at [OpenFreeMap](https://openfreemap.org) (public, no API key) until the extract
is built.

### Geocoding — cache first, then self-host

A TMS geocodes the same few thousand facilities over and over, so **the cache is the strategy**:
the resolved point is stored on the `LOCATION#<id>` item and a facility is geocoded once, ever.
Real volume ends up in the low thousands per month, not per day.

That makes the provider question small. Order of preference: cached hit → **US Census Geocoder**
(free, unlimited, excellent US street coverage, bulk endpoint) → self-hosted **Photon** when
international addresses start appearing. Public Nominatim is fine for development but its usage
policy rules it out for production traffic.

### Routing, truck restrictions and map-matching — Valhalla

**[Valhalla](https://valhalla.github.io/valhalla/)** is the only open-source engine that does all
three things a TMS needs:

- **Truck costing** honouring OSM `maxheight` / `maxweight` / `maxlength` / `hazmat` tags — a car
  route that sends a 13'6" trailer under a 12' bridge is a claim, not an inconvenience.
  (Google has no truck routing either, so this is not a compromise versus the paid option.)
- **Meili map-matching** — snapping raw GPS traces to roads. This is exactly the tool that turns
  the batched traces from D4 into **per-state mileage for IFTA**, which is otherwise a genuinely
  hard problem.
- Isochrones and matrix calls for the dispatch board's "which driver is closest" suggestions.

OSRM is faster but ships no truck profile, which disqualifies it here.

**Valhalla needs a process, and this is the one exception to D1.** It is a C++ service holding
routing tiles on disk (~10–20 GB for North America) — a poor fit for Lambda, and EFS-mounted
tiles would be slow and not obviously cheaper. Volume is tiny in server terms: ~1,500 orders/day
× a few route calls is well under 1 request/second, plus one nightly map-matching batch. **One
small always-on box (Hetzner CPX21/CPX31, ~€8–17/mo) carries it comfortably.**

Until that box exists, **OpenRouteService** — also open source, also OSM, with a `driving-hgv`
truck profile — has a free API tier that covers development and early pilots. Same data, same
lineage, so moving to self-hosted Valhalla later is a config change, not a migration.

### Billable miles — the commercial caveat

US freight is invoiced on **PC\*MILER** (Trimble) miles, and broker and shipper contracts name it
explicitly. OSM-derived mileage will differ by a small percentage, and on a disputed invoice the
counterparty will quote PC\*MILER.

This is a **business** decision, not a technical one, and it does not block anything now:

- Small asset-based carriers billing their own customers rarely care.
- Anyone hauling for brokers eventually will.

So: build on Valhalla, store the mileage **and its source** on the order, and keep the mileage
calculation behind an interface so a per-tenant PC\*MILER Web Services option can be added later
for the customers who demand it. Recording the source from day one is what makes that possible
without a data migration.

**Net effect:** zero map licensing cost, no Google, truck-legal routing, and IFTA state mileage
falls out of a tool we were already running.
