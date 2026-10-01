# Arkadia Substrate Console (`web/`)

Independently derived React + Vite + TypeScript operator console for the
`relational-substrate` FastAPI backend (Arkadia Mind — Cycle 11). The backend is
the source of truth; the console mirrors its live OpenAPI surface.

## Commands

- `npm install`
- `npm run dev` — dev server (port 5173; proxy host exposes it on 12000)
- `npm run build` — `tsc -b && vite build` into `dist/`
- `npx tsc -b` — typecheck only

`ARKADIA_BACKEND` selects the proxy target (default `http://localhost:8080`).

## Backend contract notes (verified against the live surface)

- Live OpenAPI: 235 paths / 275 operations / 60 schemas, title
  "Arkadia Mind — Cycle 11" v0.1.0.
- Auth is bearer-token; the backend decodes the JWT payload without verifying
  the signature in dev-mode. The console mints an unsigned JWT
  (`AuthContext.mintDevToken`) for local boot; it 401s against a production
  backend, which is the correct behavior.
- `GET /api/knowledge/notes` returns a **bare array** (not `{notes:[...]}`) and
  rejects `limit > 200` with a 422. Keep client limits <= 200.
- Graph payload uses `source_note_id` / `target_note_id` on edges (not
  `source` / `target`). Node keys: `id, uuid, title, note_type, project_id,
  created_at, user_id, provenance`.
- `Job` carries `source`, `trace`, `retries`, `error` at the top level;
  `intent` has only `type` and `payload`.
- `GET /api/knowledge/graph/health` currently returns `overall: "error"` from a
  backend division bug (`unsupported operand type(s) for /: 'str' and 'str'`).
  The console surfaces this verbatim rather than hiding it.

## Routing caveat (important)

The dev server proxies the backend prefixes (`/api`, `/solspire`, `/health`,
`/openapi.json`, `/docs`, `/static`) using **anchored regex keys** in
`vite.config.ts`. A plain string prefix like `"/api"` also matches SPA routes
and shadows them. Consequently the SPA must NOT use top-level paths that collide
with backend prefixes:

- SolSpire page lives at `/spire` (not `/solspire`).
- API explorer lives at `/routes` (not `/api-explorer`).

When adding a route, avoid `/api*`, `/solspire*`, `/health`, `/openapi.json`,
`/docs*`, `/static*`.
