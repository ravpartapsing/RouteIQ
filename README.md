# RouteIQ

Transportation Management System — web dashboard for carriers, Flutter app for drivers.

Serverless: API Gateway → Lambda (Node 22 / TypeScript) → DynamoDB single table, S3 for
documents. See [`docs/DECISIONS.md`](docs/DECISIONS.md) and
[`docs/DATA_MODEL.md`](docs/DATA_MODEL.md).

## Bring the local stack up

Local development needs no AWS account and no network access.

```bash
cp .env.example .env
pnpm install
pnpm up                 # DynamoDB Local + LocalStack S3 + a table browser
pnpm bootstrap:local    # create the table, its 4 GSIs, and the bucket
pnpm dev                # api on http://localhost:8180
```

Verify:

```bash
curl localhost:8180/health/ready
```

should report `"tableStatus":"ACTIVE"` and list `GSI1..GSI4`.

**Ports are offset from the AWS defaults on purpose** — the Inkto stack on this machine holds
8000, 4566 and 8080, and both projects need to run at once.

| | Port |
|---|---|
| API | 8180 |
| DynamoDB Local | 8200 |
| Table browser | 8201 |
| LocalStack S3 | 4666 |

`pnpm nuke` deletes the volumes; re-run `pnpm bootstrap:local` after one.

## Layout

```
apps/
  api/        Fastify. app.ts is host-agnostic; lambda.ts wraps it, local.ts serves it.
  web/        React dashboard (not started)
  mobile/     Flutter driver app — 15 of 34 screens, still on mock data
packages/
  data/       Table definition + every key builder in the system
  contracts/  Shared request/response schemas (not started)
infra/docker/ Local stack
scripts/      Table and bucket bootstrap
docs/         Decisions, data model
```

## The one rule worth knowing

**No module builds a DynamoDB key by hand.** Every key comes from
`packages/data/src/keys.ts`, so a prefix change is one edit and the compiler finds every caller.

## Design source material

The product design is complete and lives in
`~/Documents/research/DRIVERCONNECT/immplementation /` — web dashboard (42 screens), mobile
(34 screens), plus the competitive blueprint. Build against those documents; they are the spec.
