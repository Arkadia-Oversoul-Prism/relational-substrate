# relational-substrate

The executable backend of Arkadia, extracted as a standalone repository.

`https://github.com/Arkadia-Oversoul-Prism/relational-substrate`

This repository contains **no frontend**. It is the backend only: the API
surface, the Knowledge OS, the causal-lineage substrate, the governance and
authority boundary, and the execution spine.

## What this is

A relational substrate. Facts enter through a declared source, become
content-addressed captures, are interpreted into canonical records, and every
downstream action is traceable back to that origin. The lineage is enforced by
code, not convention.

```
SOURCE → CAPTURE → CANONICAL RECORD → PROVENANCE → INTERPRETATION
       → AUTHORITY → AUTHORIZATION → EXECUTION → EVIDENCE → VERIFICATION
```

The reverse direction is equally load-bearing: any record can be walked back to
its origin, and authorship is stored **exactly as declared, or UNKNOWN** — never
inferred.

## Authority ceiling

This substrate cannot originate authority. It represents authority up to a
ceiling (`LAB_AUTHORITY_CEILING = 2`), and every execution run terminates at
`READY_FOR_REVIEW`. It cannot merge, deploy, or self-authorize. The transition
`READY_FOR_REVIEW → COMPLETED` is forbidden by construction.

That is a design invariant of the code in this repository, not a policy layered
on top of it.

## Layout

| Tree | Contents |
|---|---|
| `api/` | FastAPI application, routers, composition root |
| `knowledge/` | Knowledge OS — capture, pipeline, vault, context engine, ingestion |
| `kernel/` | Runtime kernel — workers, goals, jobs, execution, TTS, celestial readout |
| `solspire/` | Project, enterprise, and WorkEvent surfaces |
| `weaver/` | Governance, continuation, reconciliation, execution |
| `lab/` | Engineering Lab — bounded sandbox execution substrate |
| `providers/` | Provider-neutral model gateway |
| `corpus/`, `forge/`, `spiral_grove/`, `sanctum/` | Corpus management, generation, registry, status |
| `tests/` | Backend test suite (108 modules) + architecture fitness tests |
| `scripts/` | Verification harnesses |

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env      # fill in what you need; nothing is required to boot
```

The service boots with no credentials. Model-backed features degrade to their
deterministic paths until a provider key is supplied.

```bash
python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8080
```

## Verify

```bash
# backend test suite
python3 -m pytest tests/ -q

# causal lineage — forward and reverse
python3 scripts/verify_causal_lineage.py
```

The lineage script exercises the real Knowledge OS and SolSpire code paths
against an isolated SQLite file. It asserts both directions of the chain and
exits non-zero on any gap.

## Health

| Route | Purpose |
|---|---|
| `GET /health` | Liveness. Returns `{"status":"radiant","path":"/health"}` |
| `GET /api/heartbeat` | Heartbeat |
| `GET /api/stellar-cartography` | Celestial readout |
| `GET /openapi.json` | Full route surface |

## Environment

See `.env.example`. Notable variables:

- `GOOGLE_API_KEY` — Gemini. Without it the planner uses its deterministic path.
- `ARKADIA_DB_PATH` — Knowledge OS SQLite location.
- `SOLSPIRE_PROJECTS_DB` / `SOLSPIRE_DATA_DIR` — project store location.
- `SOVEREIGN_KEY` — gates the generation endpoint.
- `FIREBASE_SERVICE_ACCOUNT_JSON` — optional; without it state is local-only.

## Extraction provenance

Extracted from `Arkadia-Oversoul-Prism/Arkadia` @
`3e1cd007c93fcfe5a73fb3dc81fd65644b06306f`.

See `EXTRACTION_REPORT.md` for what was carried over, what was excluded, how
identity-bearing corpus was sanitized, and the findings recorded against the
extracted source — including two genuine couplings that remain open.
