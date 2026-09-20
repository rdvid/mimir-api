# Mimir — personal finance API (MVP)

Minimal JWT-authenticated API for tracking income/expenses with filterable lists and summaries (bot/dashboard ready).

## Quick start (Docker + hot reload)

```bash
make nuke   # wipe old schema after MVP rewrite
make up     # or: make dev
```

- API: http://localhost:5000  
- Swagger: http://localhost:5000/api/docs  

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | `/auth/register` | — |
| POST | `/auth/login` | — |
| POST | `/transactions` | JWT |
| GET | `/transactions` | JWT |
| GET | `/transactions/:id` | JWT |
| PATCH | `/transactions/:id` | JWT |
| DELETE | `/transactions/:id` | JWT |
| GET | `/summary` | JWT |
| GET | `/summary/categories` | JWT |
| GET | `/summary/monthly` | JWT |
| GET | `/categories` | JWT |
| POST | `/categories` | JWT |

### List / summary filters

`GET /transactions`, `GET /summary`, `GET /summary/categories`:

- `from`, `to` — `YYYY-MM-DD` (inclusive)
- `type` — `expense` \| `income`
- `categoryId` — UUID
- `limit` / `offset` — list only (default limit 50, max 200)

`GET /summary/monthly`: `year` (required), optional `type`.

Example — past 7 days spend:

```http
GET /summary?from=2026-09-12&to=2026-09-19&type=expense
Authorization: Bearer <token>
```

## Make targets

| Command | Description |
|---------|-------------|
| `make help` | List targets |
| `make up` / `make dev` | Start stack (background / foreground) |
| `make down` | Stop |
| `make logs` | API logs |
| `make nuke` | Wipe volumes (required after schema changes) |

## Environment

Copy from `.env.default` via `make setup` → `.local.env`:

- `PORT`
- `DATABASE_URL`
- `ACCESS_TOKEN_SECRET_KEY`
- `ACCESS_TOKEN_SECRET_EXPIRY`

## Stack

Node 24 · Express · PostgreSQL · Knex · JWT · bcrypt · Swagger UI
