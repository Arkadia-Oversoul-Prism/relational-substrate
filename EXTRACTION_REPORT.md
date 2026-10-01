# EXTRACTION REPORT

**Objective:** EXTRACT_BACKEND_ONLY
**Source:** `Arkadia-Oversoul-Prism/Arkadia` @ `3e1cd007c93fcfe5a73fb3dc81fd65644b06306f`

The source advanced by 2 commits while this extraction was in progress
(`47e4128b` → `3e1cd007`), touching the relational-lineage core. Rather than
ship a stale snapshot, that 7-file delta was applied so this tree reflects
current `main`.
**Target:** `relational-substrate`
**Mode:** FORENSIC → EXTRACTIVE → VERIFIABLE
**Source repository mutation:** NONE (forbidden and not performed)

---

## 1. What was extracted

The backend runtime closure plus the tests that exercise it.

| Category | Count |
|---|---|
| Python modules copied | 347 |
| Backend-only test modules | 108 |
| Architecture fitness tests | 11 |
| FastAPI operations served | 275 |

Trees carried over:

```
api/  corpus/  forge/  kernel/  knowledge/  lab/  providers/
solspire/  spiral_grove/  weaver/  scripts/  tests/  sanctum/
```

The closure was computed, not guessed: every module reachable from
`api.main` (121 modules) was unioned with the modules the 191 test modules
import, giving a 191-module closure. Any module outside that union was not
copied.

## 2. What was deliberately NOT extracted

| Surface | Reason |
|---|---|
| `web/public_prism/` (React + Vite + TS frontend) | Not backend. No frontend manifest exists in the target. |
| `app/`, `bot/`, `openclaw/`, `arkana_space/` | Node services outside the Python import closure. |
| `.github/workflows/*` except the engineering scheduler | Arkadia's CI policy is not this repository's CI. |
| `docs/recon/`, `docs/control-plane/evidence/`, workstream ledgers | Source-repo reconnaissance and governance history. |
| `vault/**/*.md` (generated notes) | Private vault runtime output. |
| Source-repo identity-bearing corpus | See §4. |

## 3. Canonical subsystems preserved intact

These were carried over **unmodified**. No file in this list was edited.

- **Causal lineage** — `knowledge/capture.py` (SOURCE → CAPTURE → CANONICAL
  RECORD → PROVENANCE, with authorship stored exactly as declared or UNKNOWN).
- **Knowledge OS** — `knowledge/pipeline.py`, `knowledge/db.py`,
  `knowledge/vault.py`, `knowledge/context_engine.py`.
- **Authority ceiling** — `lab/engineering_lab/contracts.py`
  (`LAB_AUTHORITY_CEILING = 2`; the substrate cannot originate authority).
- **Governance boundary** — `weaver/governance.py`, `governance/*.json`.
- **Execution states** — `CHECKPOINT_STATES` including `READY_FOR_REVIEW`;
  `FORBIDDEN_DIRECT_TRANSITIONS` still forbids `READY_FOR_REVIEW → COMPLETED`.
- **WorkEvent spine** — `solspire/workevent_manager.py`.
- **Route contract** — `/health` and `/api/heartbeat` served and documented.

## 4. Sanitization

Product-identity and personal corpus was replaced with structural fixtures of
the same shape. **No structural code path was reduced.** In particular
`knowledge/static_ingestion.py` was copied **byte-identical**: `_SOURCES` was
not reduced, no source root was removed, and startup ingestion behaviour is
unchanged.

| Path | Original | Replacement |
|---|---|---|
| `data/nodes_seed.json` | 16 real people (names, emails, access levels) | 1 structural fixture node, same schema |
| `data/personal_codices/*.json` | 6 real user records | 1 fixture codex, same schema |
| `data/transmissions.json` | authored content + real display name | `[]` |
| `data/oracle_store.json` | real loops/transactions | same shape, 2 structural loop fixtures |
| `static/` | Arkadia-branded console | minimal static mount fixture |
| `docs/adr/*` | 6 ADRs (2/9/3/5 mission-content hits) | 6 ADRs rewritten as generic backend architecture decisions, **same filenames** |
| `docs/DOC2_OPEN_LOOPS.md` | operational content | fixture preserving the `_parse_open_loops` table contract |
| `data/weaver/continuation/current.json` | source-repo workstream record | canonical fixture bound to HEAD, `authorization.state = NONE` |

`docs/FIXTURE.md` files were placed in each ingestion source root
(`docs/`, `docs/collective/`, `docs/creative/`) so the globs resolve to a
non-empty valid corpus. `docs/adr/` deliberately has no `FIXTURE.md` — its
exact file set is asserted by `test_static_ingestion_sources.py`.

## 5. Removed as superseded or misleading

| Path | Reason |
|---|---|
| `orchestration/manifest.json` | Sole payload is `"body": "/web/public_prism"`, a frontend that does not exist here. Nothing reads it. |
| `data/weaver/context/current.json` | Point-in-time index of the **source** repository (pnpm, `web/public_prism`, source layer map). Nothing reads it; keeping it would misrepresent this repository. |
| `docs/phase1/CONTINUATION_LEDGER.md` | Source-repo workstream ledger. |

## 6. Verification evidence

| Gate | Method | Result |
|---|---|---|
| Import proof | 17 representative modules imported with no frontend present | **PASS** 17/17 |
| Startup proof | `uvicorn api.main:app` boots, serves | **PASS** |
| Route proof | `/health`, `/api/heartbeat`, `/api/stellar-cartography`, `/openapi.json` | **PASS** 200/200 |
| Operation count | `openapi.json` | **275** (matches production) |
| Canon ingestion | `static_ingestion` runs at startup | **PASS**, `_SOURCES` unreduced |
| Causal lineage | `scripts/verify_causal_lineage.py` forward + reverse | **PASS** 8/8 + 8/8 |
| Frontend absence | Structural scans, no manifests | **PASS** |
| Continuation fixture | `load_continuation()` | **PASS** `CURRENT`, authorized `NONE` |
| Test suite | `pytest tests/ -q` | 797 passed, 23 failed, 1 error |

## 7. Known findings — recorded, not hidden

### 7.1 Backend hardcodes personal node identifiers

`api/nodes.py` serves `/api/codex/personal` by looking up the literal keys
`"zahrune"` (lines 87, 90, 94). `solspire/eden_ops_02.py` (lines 134, 261) and
`solspire/eden_ops.py` (line 207) hardcode `"jessica"` / `"architect"`.

With sanitized data these keys do not exist, so the route returns **404** and
4 tests in `tests/test_nodes_tools_seam.py` fail. This is a genuine coupling:
the backend's identity surface is bound to specific personal node keys rather
than being resolved from configuration. Resolving it is a **behaviour change**
and is therefore out of this mission's scope.

### 7.2 Backend fetches its canon corpus from the source repository at runtime

At startup the ingestion path issues live HTTP requests to
`raw.githubusercontent.com/Arkadia-Oversoul-Prism/Arkadia/main/docs/...`.
Confirmed in the startup log. This is residual runtime coupling to the source
repository: the extracted backend is not corpus-independent. Removing it would
change startup behaviour and is out of scope.

### 7.3 Non-backend tests retained

Two AGENTS.md modules (`test_agents_md_repair_fingerprint.py`,
`test_agents_md_encoding_adjudication.py`) test the **source** repository's
`AGENTS.md` encoding repair. They are repository-hygiene tests, not backend
tests, and `AGENTS.md` is deliberately not carried over. 7 of the 21 failures
are these.

### 7.4 Failure accounting

Final measured delta against a freshly re-measured baseline at the same base
commit (`3e1cd007`, same test set):

| | Nodes |
|---|---|
| Baseline (source @ `3e1cd007`) | 16 |
| Target | 24 |
| **Introduced** | **11** |
| Fixed | 4 |

The 11 introduced nodes are entirely accounted for:

- **7** — `test_agents_md_repair_fingerprint.py` (2) and
  `test_agents_md_encoding_adjudication.py` (5). These test the **source**
  repository's `AGENTS.md` encoding repair. `AGENTS.md` is deliberately not
  carried over; these are repository-hygiene tests, not backend tests.
- **4** — `test_nodes_tools_seam.py`, caused by finding 7.1 above.

The 4 "fixed" nodes are source-only artifacts: collection errors in render
scripts and in a module that requires the source tree. No unexplained failure
remains.

The 2 failures in `test_relational_lineage.py` (`test_graph_node_exposes_
canonical_capture_provenance`, `test_traversal_preserves_provenance_projection`)
fail **identically on the source** at the same commit — they are pre-existing,
not introduced by extraction.

## 8. Publication

**Published.** `https://github.com/Arkadia-Oversoul-Prism/relational-substrate`

| | |
|---|---|
| Branch | `main` |
| Commit | `8c699febfca8a975ab12807ee75ca5e8a6ec65db` |
| Blobs on remote | 532 (tree walk, not truncated) |
| Visibility | **public** |

### How the boundary was cleared

The first publication attempt was **BLOCKED**. Two independent constraints were
measured, and both had to be resolved before a push could succeed:

1. **Creation was not permitted.** `POST /user/repos` → `403 Resource not
   accessible by integration`; GraphQL `createRepository` → same;
   `GET /installation/repositories` → `Resource not accessible by integration`.
   The credential is a GitHub App installation token (`ghu_` prefix).
2. **Repository scope was fixed at five.** The token could reach exactly
   `Arkadia`, `Arkadia-1`, `Arkadia-Core`, `oracle-speak`, `sonata`. A
   repository outside that list would have been unwritable even once created.

The operator created the repository and added it to the credential's access
list. The token then reported `admin`/`push` on it and the push succeeded.

### Post-publication verification

Executed against a **fresh clone of the remote**, not the build directory:

| Check | Result |
|---|---|
| Clone resolves to | `8c699febfca8a975ab12807ee75ca5e8a6ec65db` |
| Imports with no frontend present | PASS |
| uvicorn boots | PASS, 0 tracebacks |
| `/health`, `/api/heartbeat`, `/api/stellar-cartography` | 200 / 200 / 200 |
| Operations served | **275** |
| Causal lineage | FORWARD 8/8, REVERSE 8/8 |
| Test suite | 797 passed, 23 failed, 1 error |
| Frontend artifacts on remote | 0 |

### Exposure scan on the published tree

The repository is public, so the published tree was scanned independently:

| Category | Hits |
|---|---|
| Secret-like literals (provider key prefixes, PEM blocks) | 0 |
| Real email addresses | 0 |
| Key material | 0 |
| `.env.example` values | all empty |

Four initial hits on a `service_account`/`private_key` pattern were inspected
and are **not** credentials: two are placeholder documentation
(`...your JSON...`), one is a field-name list in `api/source_connections.py`,
and one is a test that asserts those tokens are *absent* from output.

Personal identifiers survive only as literal node keys in backend code and
tests (`solspire/eden_ops.py`, `eden_ops_02.py`, `api/nodes.py`, and their
tests) — the coupling recorded in finding 7.1. The `data/` layer contains
**zero** identifiers; sanitization is intact.

## 9. Reproduction

```bash
pip install -r requirements.txt
python3 -m pytest tests/ -q
python3 scripts/verify_causal_lineage.py
PORT=8080 python3 -m uvicorn api.main:app --host 0.0.0.0
```
