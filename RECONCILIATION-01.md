# RECONCILIATION-01 — Arkadia frontend ⇄ relational-substrate console ⇄ substrate

**Mission:** Compare the existing Arkadia frontend against the independently
derived relational-substrate console *and* against the substrate itself.
Produce an evidence-backed semantic, capability, workflow, authorization and
presentation reconciliation. Do not modify either implementation.

**Status:** evidence artifact only. No source file in either frontend or the
backend was modified.

---

## 0. Provenance and method

### 0.1 Artifacts compared

| Ref | Artifact | Revision / locator | How obtained |
|---|---|---|---|
| **[S]** | Existing Arkadia frontend (`web/public_prism/`, React+Vite+TS) | `Arkadia-Oversoul-Prism/Arkadia@main` (pushed 2026-10-01T18:14:26Z), 144 files / 25,377 LOC | sparse `git clone` (`web/public_prism` only) |
| **[D]** | Independently derived console (`web/`, React+Vite+TS) | `relational-substrate@28d32ad` (HEAD of `main`), 25 files / 4,237 LOC | local working tree |
| **[B]** | Substrate backend (FastAPI, "Arkadia Mind — Cycle 11" v0.1.0) | `relational-substrate@28d32ad` | `web/openapi.snapshot.json` + `api/**` + `lab/engineering_lab/contracts.py` + `governance/*.json` |
| **[L]** | Live deployment probe | `https://work-1-ebzexyppcbabiatu.prod-runtime.all-hands.dev` (port 12000) | `curl` HTTP probes |

**[S] was excluded from the extraction** by design — `EXTRACTION_REPORT.md` §2:
*"`web/public_prism/` (React + Vite + TS frontend) — Not backend. No frontend
manifest exists in the target."* So [S] is the "existing Arkadia frontend" the
mission refers to; it is not present in the extracted repository and was fetched
separately for this reconciliation.

### 0.2 Method

1. Enumerated the backend surface from `openapi.snapshot.json`
   (**235 paths / 275 operations / 60 schemas** — matches `AGENTS.md` and the
   extraction report).
2. Extracted every HTTP path literal from both frontends and normalized
   `{param}` ↔ `${expr}` placeholders; classified matched / phantom.
3. Diffed the two frontends' called-path sets against each other and against
   [B] to derive overlap, source-only, derived-only and backend-only sets.
4. Diffed *hardcoded vocabulary* (governance constants) against the substrate's
   authoritative constants by parsing both.
5. Read the authorization dependency graph in `api/**` and confirmed it with
   live HTTP probes.
6. Compared presentation primitives, design tokens, navigation IA and routing
   constraints.

### 0.3 Evidence classes

- **CODE** — read directly from a cited file/line. Deterministic.
- **OPENAPI** — read from the served schema snapshot. Deterministic.
- **PROBE** — live HTTP result against [L]. Environment-dependent; see caveat.
- **INFER** — reasoning over the above, explicitly labelled.

> **PROBE caveat.** [L] is a runtime deployment whose `ENVIRONMENT` /
> `FIREBASE_SERVICE_ACCOUNT_JSON` / `SOVEREIGN_KEY` settings were not directly
> inspected. All PROBE results are reported verbatim; conclusions drawn from
> them are labelled INFER and should be re-run against a known-configuration
> instance before being treated as production truths.

---

## 1. Semantic reconciliation

Semantics = what each frontend says a thing *is*, versus what the substrate says.

### 1.1 Governance vocabulary — the strongest convergence in the corpus

[D] `src/pages/Governance.tsx` hardcodes governance constants with the comment
*"Vocabulary mirrored from `lab/engineering_lab/contracts.py`."* Every constant
was parsed from both files and compared element-by-element.

| Constant | [B] source | [S] | [D] | Result |
|---|---|---|---|---|
| `NON_COLLAPSES` (8 pairs) | `contracts.py` L32-45 | absent | `Governance.tsx` L6-17 | **exact match** (order + content) |
| `FORBIDDEN_DIRECT_TRANSITIONS` (3 pairs) | `contracts.py` L104-110 | absent as such | `Governance.tsx` `FORBIDDEN` | **exact match** |
| `HUMAN_ONLY` (5) | `contracts.py` L49-52 | absent | `Governance.tsx` `HUMAN_ONLY` | **exact match** (set) |
| `CHECKPOINT_STATES` (13, ordered) | `contracts.py` L89-101 | partial (11 in a runtime colour map) | `Governance.tsx` `CHECKPOINT_STATES` | **exact match** (order + content) |
| `AUTHORITY_LEVELS` 0–7 | `contracts.py` L73-83 | absent | `Governance.tsx` `AUTHORITY_LEVELS` | **exact match** (0-7 names) |
| `LAB_AUTHORITY_CEILING = 2` | `contracts.py` L86 | absent | rendered as literal pill | match (constant) |
| `roles.json` 4 roles | `governance/roles.json` | absent (`Flamekeeper` = 0 hits) | `Governance.tsx` `ROLES` | keys + permissions match; 3/4 descriptions paraphrased |
| `boundaries.json` 3 scopes | `governance/boundaries.json` | absent | `Governance.tsx` `BOUNDARIES` | keys match; Gate/Sanctum verbatim, Engine paraphrased |

**Convergence.** [D] reproduces the substrate's authority doctrine *exactly* for
the machine-checkable constants, and paraphrases only prose. This is the single
highest-fidelity correspondence found anywhere in the corpus, and it is
independently derived (the doc comment states the source file, not a shared
module).

**Divergence.** [D]'s role/boundary *descriptions* are close paraphrases rather
than verbatim, so a diff against `governance/*.json` would show drift. [D]
nevertheless labels the manifest itself as not served by a dedicated route
(`Governance.tsx` "Governance manifest" card) — a truthful admission, not a
fabrication.

### 1.2 Identity semantics

| Concept | [B] | [S] | [D] |
|---|---|---|---|
| Profile source | `build_user_profile()` — user store > **explicit `node_key` claim** > Firebase name > email local-part > uid | `AuthContext.fetchProfile()` → `/api/me`; email-hint matching assumed | `/api/me` → `User`; renders `access_level`, `role_sigil`, `ims_id` |
| Codex | `get_personal_codex()`; 404 if none | treats 404 as a valid "no codex" state | states 404 is truthful, does not synthesize |
| Identity spine | `/api/me/identity-spine` | hydrates `IdentitySpine` into `identityState` ∈ {unauthenticated, loading, ready, degraded, auth-error, backend-unavailable} | renders spine JSON + key fields |

**Convergence.** Both frontends call `/api/me`, `/api/me/codex`,
`/api/me/identity-spine` and both treat a 404 codex as a legitimate state.

**Divergence.** [S] carries a rich `IdentityHydrationState` machine
(`AuthContext.tsx` L31) and a `readableIdentityError()` mapper; [D] has a single
`authFailed` boolean plus an `error` string. [S]'s identity model is strictly
more expressive. Note the substrate's P1-A rule (`api/auth.py`
`build_user_profile`): *"email-hint matching no longer populates display
identity"* — [S]'s `NodeProfile` still exposes `node_key`/`ims_id` as if a node
could be email-matched, which is now only true under an explicit `node_key`
claim.

### 1.3 Authority semantics — the sharpest semantic divergence

| Claim | [S] | [D] | Substrate [B] |
|---|---|---|---|
| "Sovereign" = ? | `isSovereign = sovereignToken.trim().length > 0` — **any non-empty local string** (`ArkanaCommune.tsx` L306) | `user.access_level >= 3` from `/api/me` (`Identity.tsx`) | `require_sovereign` = `access_level >= 3` (`api/auth.py` L402-408) |
| Authority ceiling | read at runtime from `/api/lab/engineering/overview` → `governance.maximum_authority` | hardcoded `LAB_AUTHORITY_CEILING = 2` + also reads live | `contracts.LAB_AUTHORITY_CEILING = 2` |

**Divergence (material).** [S] conflates a *local UI preference token* with
sovereign authority. A non-empty string typed into the Commune settings toggles
the label `ARKANA // SOVEREIGN` and the gold accent. That token is only checked
server-side at `/api/dashboard/loops` (against `SOVEREIGN_KEY`); every other
"sovereign" affordance in [S] is cosmetic. [D] derives sovereign state from the
resolved `access_level`, which is the substrate's actual definition.

### 1.4 Lifecycle semantics — a forbidden edge rendered as adjacency

| Artifact | Sequence | Substrate verdict |
|---|---|---|
| [B] `LEGAL_TRANSITIONS` (`contracts.py` L113-129) | `VERIFYING → {READY_FOR_REVIEW, REVISION_REQUIRED, BLOCKED, FAILED}`; `READY_FOR_REVIEW → {REVISION_REQUIRED, ABORTED, EXPIRED}`; `COMPLETED → ∅` | `READY_FOR_REVIEW → COMPLETED` is **forbidden** |
| [S] `WEAVER_LIFECYCLE` (`SolariunGrammar.tsx` L28-38) | `PROPOSED → AUTHORIZED → QUEUED → RUNNING → CHECKPOINTED → VERIFYING → READY FOR REVIEW → COMPLETED → ACCEPTED` | presents the forbidden edge as the next step |
| [S] `EngineeringLabRuntimeLens.tsx` L39-42 | colour map includes `COMPLETED: '#22c55e'` alongside `READY_FOR_REVIEW: '#00D4AA'` | same adjacency |
| [D] `Governance.tsx` | renders `FORBIDDEN` as `READY_FOR_REVIEW ⇏ COMPLETED`; `Chain` marks `READY_FOR_REVIEW` active | matches substrate |

**Divergence (material).** [S] renders the human-only terminal `COMPLETED` as
the natural successor to `READY FOR REVIEW`, i.e. it visually asserts the exact
collapse the substrate fails closed on. [D] renders the non-collapse explicitly.
[S] does carry correct non-collapse *doctrine* elsewhere — `ProjectDashboard.tsx`
L246/L338/L1043 render `UI STATE ≠ AUTHORIZATION`, `PROPOSED ≠ APPROVED ≠
EXECUTED ≠ VERIFIED`, `WorkEvent ≠ provenance proof` — so [S] is doctrinally
aware but its lifecycle widgets contradict the doctrine at the state-machine
level. (INFER: this is the kind of drift that arises when a UI is written before
the backend contract is frozen; [D], derived *from* the contract, does not drift.)

### 1.5 Data-shape semantics

| Contract | [B] | [S] | [D] |
|---|---|---|---|
| `GET /api/knowledge/notes` | bare array; `limit > 200` → 422 | calls with `limit={…}` | calls with `limit=200`; `AGENTS.md` documents the 422 |
| Graph edges | `source_note_id`/`target_note_id` | typed via `knowledgeApi` | `AGENTS.md` documents the field names |
| `GET /api/knowledge/graph/health` | returns `overall: "error"` from a division bug | consumes it | surfaces verbatim and documents the bug in `AGENTS.md` |
| WorkEvent envelope | `{work_events?, workevents?, count?}` | reads `/solspire/workevents?limit=` | reads both key spellings defensively (`endpoints.ts` `workevents`) |

**Convergence.** Both correctly target the bare-array notes endpoint and the
`/solspire/workevents` envelope. **Divergence:** [D] documents the backend
defects in-repo; [S] does not.

---

## 2. Capability reconciliation

Capability = which substrate operations each frontend can actually invoke.

### 2.1 Quantitative coverage

Normalized placeholder comparison ([S] vs [D] vs [B]):

Path extraction from source is not exact, so two independent metrics are
reported. **A** = conservative *call-site* extraction (only `apiRequest`/`apiFetch`
/ `api.get…` invocations and named path constants resolved to their literal). **B**
= generous *textual-reference* metric (a backend path counts as referenced if its
static segment appears anywhere in the frontend source). The truth lies between;
every qualitative finding below rests on explicit file citations, not on these
counts.

| Metric | [S] | [D] |
|---|---|---|
| Distinct paths, metric A (call sites) | 84 | 63 |
| Distinct paths, metric B (textual references) | 156 | 78 |
| Phantom paths, metric A | 1 | 1 (`/openapi.json`, intentional schema fetch) |

| Set | Metric A | Metric B |
|---|---|---|
| [B] total | 235 | 235 |
| Called/referenced by both | 24 | 55 |
| Source-only | 59 | 101 |
| Derived-only | 38 | 23 |
| **Backend-only** (neither) | **114** | **56** |

**Reading.** Between **56 and 114** of 235 paths (24–49%) have no frontend
caller. Metric B's 56 are *definitely unmentioned* anywhere in either frontend
(the conservative floor). Metric A's 114 is the set with no extractable call
site; the ~58 difference is paths that appear only inside longer paths, comments
or type names. §2.5 enumerates the metric-A set — the actionable "no caller"
list — so it is the **upper bound** on backend-only capability.

> Superseded: an earlier naive literal sweep reported [S]=136/phantom=11; it
> counted route constants, static-asset URLs and template fragments. Both metrics
> above supersede it.

### 2.2 Mutation capability — the structural asymmetry

Method verbs appearing in each frontend's call/definition sites (grep of
`method:` and `api.<verb>`). For [D] the POST/PATCH figures are *bound helper
definitions*; the only one actually invoked at runtime is the single PATCH:

| Verb | [S] (issued) | [D] (bound) | [D] (issued) |
|---|---|---|---|
| POST | 65 | 7 | 0 |
| PATCH | 13 | 1 | 1 |
| PUT | 2 | 0 | 0 |
| DELETE | 10 | 0 | 0 |
| GET | (via `apiRequest` default) | 61 | 61 |

**Finding.** [D] is a **read-mostly observatory**: its only mutating UI path in
the entire application is `Identity.tsx` → `ep.patchMe()` → `PATCH /api/me`
(display name + username). Every other write helper in `src/api/endpoints.ts`
(`createGoal`, `createSession`, `transitionSession`, `authorizeSession`,
`createWorkEvent`, `createWorkload`, `ingestNote`) is **defined but never
referenced** by any page or component (verified by grep across
`src/pages` + `src/components`; the only live write call site in the whole
application is `Identity.tsx:35`). [D] therefore *binds* write helpers — including
`transitionSession`/`authorizeSession` on `/api/lab/engineering/sessions/{}/…` —
without exposing any UI control that invokes them.

[S] by contrast is a **full application**: 90 mutating calls across commerce
(`/api/products/purchase`, `/api/orders`), distribution
(`/api/distribution/submit|upload|covenant/sign`), TTS key management
(`/api/tts/keys/*`), provider keys (`/api/provider-keys/*`), knowledge ingestion
(`/api/knowledge/ingest`), oracle chat (`/api/commune/resonance`), and the
SolSpire project workspace (`/solspire/projects/*/tasks|files|memory|run`).

### 2.3 Derived-only capability (metric A: 38 paths [D] reaches that [S] does not)

The metric-A set is:
`/health` · `/api/approvals` · `/api/codex/github-tree` ·
`/api/commune/threads/{}/messages` · `/api/goals` · `/api/jobs` ·
`/api/knowledge/{status,notes,notes/{},personas,providers,providers/health,relationships,timeline,embeddings/status}` ·
`/api/knowledge/graph` · `/api/knowledge/graph/{}/traverse` · `/api/knowledge/ingest` ·
`/api/knowledge/search/{fulltext,semantic}` ·
`/api/lab/engineering/{overview,agents,artifacts,automations,gateway,integrations,loop,sessions,voice}` ·
`/api/lab/engineering/sessions/{}/authorize` · `/api/lab/engineering/sessions/{}/transition` ·
`/api/metrics` · `/api/nodes/public` · `/api/tools` ·
`/solspire/{status,providers,executions,pulses,syntheses}`

The most consequential derived-only capabilities are the **Engineering Lab
session read surface** ([S] reaches only `/api/lab/engineering/overview`; [D] adds
`sessions`, `agents`, `artifacts`, `automations`, `gateway`, `integrations`,
`loop`, `voice`) and the **semantic/fulltext search pair**. [D] also *binds*
`authorize`/`transition` on `/api/lab/engineering/sessions/{}/...`, which no UI
invokes.

> Metric-B note: under the generous textual-reference metric the derived-only set
> is 23, because metric B credits [S] with knowledge-API path constants that
> metric A resolves only for the shared `knowledgeApi.ts` helpers. The set above
> is the metric-A view — the *larger*, more conservative claim.

### 2.4 Phantom capability in [S] (1 path with no backend match)

Verified against the served schema:

| Phantom path | Verdict |
|---|---|
| `/api/codex/categories` | **ABSENT** from [B] — a genuine 404 |

Earlier sweeps also flagged `/api/goals{}`, `/solspire/projects/${id}/weaver`,
`/solspire/projects/${id}/events${filter}`, and `/static/ims/*.html`; on
call-site inspection these are **not** phantom API calls — they are template
fragments the parser over-captured, static assets, or route constants. They are
excluded here to avoid over-claiming. ([D]'s only unmatched literal is
`/openapi.json`, which is intentional: `ApiExplorer.tsx` fetches the schema.)

**Finding.** The one genuine phantom (`/api/codex/categories`) is a call [S]
makes that the substrate cannot serve. This is the observable fingerprint of a
frontend written against a *moving* backend — the same failure mode the
extraction report's §7.1/§7.2 describe from the backend side.

### 2.5 Backend-only capability (metric A: 114 paths neither frontend calls)

Grouped by subsystem — capabilities with **no UI anywhere**. Metric-A counts
sum to 114 (the metric-B floor is 56; see §2.1):

| Subsystem | Count | Notable |
|---|---|---|
| Webhooks / misc / root | 21 | `/api/webhook/github`, `/api/github/webhook`, `/api/echoes`, `/api/job/create`, `/`, `/api/tts/voices`, `/api/tools/{tool_name}/run`, `/api/codex/personal`, `/api/commune/threads/{thread_uuid}` |
| Knowledge OS advanced | 20 | `/graph/edge`, `/graph/{id}/path/{target}`, `/enrich/{id}`, `/enrich/orphans`, `/context`, `/ingest/conversation`, `/timeline/replay/{id}`, `/personas/{name}`, `/projects/{name_or_uuid}`, `/embeddings/process`, `/neighbors/{id}`, `/node/{id}`, `/path`, `/projects`, `/providers/send`, `/graph/health`, `/migrate/edges/*`, `/timeline/recent` |
| SolSpire project internals | 12 | `/projects/{id}` + `archive`, `events`, `files/{id}`, `files/{id}/copy`, `knowledge`, `knowledge/{embeddings,search}`, `memory/{id}`, `repositories[/{id}]`, `run` |
| Weaver execution chain | 9 | `/weaver/{analyze,capabilities,context,validation,knowledge-summary}`, `/weaver/execution/{readiness,pass-spec,approval,execute}` |
| Lab unwired | 8 | `/sessions/{id}`, `/sessions/{id}/execute`, `/automations/{id}/state`, `/canvas/{id}`, `/pr/{number}`, `/voice/resolve`, `/android`, `/android/session/{id}` (`authorize`/`transition` are [D]-bound, so they are derived-only in §2.3) |
| SolSpire fs/GitHub tools | 7 | `/tools/fs/{list,read,write}`, `/tools/github/{read,tree,repos,commit}` |
| SolSpire provider routing | 6 | `/providers/{select,model,fallback,keys,keys/{id},keys/{id}/activate}` |
| Approvals & agent control | 5 | `/api/approvals/{request,{id}/approve,{id}/reject}`, `/api/agent/spawn`, `/api/ceo/chat` |
| IMS / TTS | 5 | `/api/ims/{inquiry,inquiries,recommendations}`, `/api/tts/voices`, `/api/echoes` |
| Identity development | 5 | `/api/me/identity-spine/{development,relational-observation}`, `/api/nodes`, `/api/nodes/{key}`, `/api/nodes/{key}/codex` |
| SolSpire enterprise | 5 | `/enterprise/workspaces/{id}` + `members`, `members/{handle}/desks/{desk}`, `tasks`, `tasks/{task_id}` |
| Social / users | 4 | `/api/social/nodes/{uid}`, `/api/social/handle/{handle}`, `/api/users/search`, `/api/users/by-handle/{handle}` |
| SolSpire execution control | 4 | `/executions/{id}` + `cancel`, `pause`, `resume` |
| Distribution / commerce | 3 | `/api/distribution/release/{id}`, `/api/products/deliver/{id}`, `/api/paystack/initialize` |

**Finding.** Under metric A, **114 of 235 paths** have no extractable frontend
call site; under metric B, **56** are unmentioned anywhere. Either way a large
minority of the substrate has no operator UI. The highest-risk members are the
**approvals decision endpoints** (§4.4) and the **agent-spawn / plan-run /
ceo-chat** entry points.

---

## 3. Workflow reconciliation

### 3.1 Authentication workflow

| Step | [S] | [D] | Substrate [B] |
|---|---|---|---|
| Credential | Firebase email+password, **magic link**, register | pasted bearer token, or minted unsigned dev JWT | `require_auth` reads `Authorization: Bearer` |
| Verification | Firebase client SDK → `getIdToken()` | none client-side | `verify_firebase_token()`; dev-mode decodes payload **without signature** |
| Token storage | `localStorage['arkadia_token']` (`apiClient.ts` L24) | `localStorage['arkadia.console.token']` | n/a |
| Identity hydration | `/api/me` → `/api/me/codex` → `/api/me/identity-spine`, with a 6-state machine | `/api/me` → `user` | same endpoints |
| Failure UX | `readableIdentityError()` maps 401/network/5xx to prose | `authFailed` boolean; 401 vs 403 message | 401 / 403 |
| Dev affordance | none (needs real Firebase) | `mintDevToken()` builds `alg:"none"` JWT, refuses prod | dev-mode accepts unsigned JWT |

**Convergence.** Same three identity endpoints, same storage idiom, same bearer
contract.

**Divergence.** [S] implements a **complete credential lifecycle** (register,
password reset via magic link, sign-out). [D] implements **no credential
acquisition at all** — it cannot create an account, cannot recover one, and its
only "sign-in" is pasting a token or minting one that a production backend will
reject. [D]'s `AuthContext.tsx` documents this honestly: *"The builder refuses to
run against a production backend, where such a token would (correctly) 401."*

**Divergence (workflow-level).** The substrate *is* the authority on identity,
yet neither frontend calls the two identity-development endpoints
(`/api/me/identity-spine/development`, `/relational-observation`) that would let
a user grow the spine. [S] substitutes a **client-side 12-question A.I.S
questionnaire** (`NodeEntry.tsx`) whose result it writes to
`/api/me/ais-profile` — a frontend-only abstraction layered over a backend
storage slot.

### 3.2 Engineering-Lab governed-session workflow

Canonical substrate sequence (`contracts.LEGAL_TRANSITIONS` + `lab_routes.py`):

```
PROPOSED --(authorize: record_authorization + transition)--> AUTHORIZED
AUTHORIZED --> QUEUED --> RUNNING --> CHECKPOINTED --> VERIFYING
VERIFYING --> READY_FOR_REVIEW | REVISION_REQUIRED
READY_FOR_REVIEW -/-> COMPLETED            (FORBIDDEN)
MERGE / PRODUCTION_DEPLOY / AUTHORIZE / SCOPE_EXPANSION / IDENTITY_BOUNDARY  = HUMAN_ONLY
```

| Frontend | Sessions list | Open session | Authorize | Transition | Execute bounded |
|---|---|---|---|---|---|
| [S] | via `/api/lab/engineering/overview` only | ✗ | ✗ | ✗ | ✗ |
| [D] | `/api/lab/engineering/sessions` (read) | helper defined, unused | helper defined, unused | helper defined, unused | ✗ |
| [B] | `GET /sessions` | `POST /sessions` | `POST /sessions/{id}/authorize` | `POST /sessions/{id}/transition` | `POST /sessions/{id}/execute` |

**Finding.** **Neither frontend can drive a governed session end-to-end.** [D]
is closest — it is the only frontend that *binds* `authorize` and `transition` —
but it exposes no control that invokes them. The substrate's flagship governance
workflow is therefore **backend-only in practice**, and the one UI that shows
the lifecycle ([S]'s `SolariunGrammar`) shows it with the forbidden edge
included (§1.4).

### 3.3 Knowledge workflow

| Step | [S] | [D] | [B] |
|---|---|---|---|
| Browse notes | `knowledgeApi` notes list | `KnowledgeNotes.tsx` (`/api/knowledge/notes?limit=200`) | `GET /api/knowledge/notes` |
| Full-text search | `GET /api/knowledge/search` (POST variant) | `GET /api/knowledge/search/fulltext` | both exist |
| Semantic search | — | `GET /api/knowledge/search/semantic` | exists |
| Graph | `KnowledgeGraphView` + health + traverse + path + neighbors | `KnowledgeGraph.tsx` + traverse | all exist |
| Ingest | `POST /api/knowledge/ingest`, `/api/personal/ingest-file`, `/api/personal/ingest-note` | helper defined, unused | all exist |
| Enrich / replay | — | — | `/enrich/*`, `/timeline/replay/*` (backend-only) |

**Divergence.** [S] can **write** knowledge (ingest, personal upload) and reach
`/api/knowledge/graph/health`, `/path`, `/neighbors`. [D] can **read** more
(search/semantic/fulltext) but cannot write, and never calls `graph/health`.
Neither reaches the enrich/replay surface.

### 3.4 Commune / messaging workflow

| Step | [S] | [D] |
|---|---|---|
| Chat with the Oracle | `POST /api/commune/resonance` (+ `sovereign_token` field) | — |
| Threads | `GET /api/commune/threads` | `GET /api/commune/threads` + `/threads/{}/messages` |
| Messages | `GET /api/messages`, `/inbox`, `/thread/{id}` | `GET /api/messages/inbox` only |
| Transmissions | `GET /api/transmissions` + `POST /{}/comment` + `POST /{}/react` | `GET /api/transmissions` only |

**Divergence.** [S] has a live conversational Oracle with key-pool resolution and
a `sovereign_token` mode; [D] has a read-only thread browser. [D] reaches the
per-thread message route [S] does not; [S] reaches every social *write*.

### 3.5 Release / distribution workflow

[S] `DistributePage` calls `/api/distribution/{submit,upload,covenant/sign,
analytics/{id},releases/{id}}` — a complete release pipeline. [D] renders a
static `Empty` card in `Sources.tsx` stating the routes exist but *"are currently
empty on this deployment."* **Divergence:** [S] implements; [D] truthfully
declares non-implementation rather than faking it.

---

## 4. Authorization reconciliation

### 4.1 The substrate's authorization model

| Mechanism | Definition | Location |
|---|---|---|
| Optional auth | `get_current_user` — returns `None` if no/invalid token | `api/auth.py` L383-403 |
| Required auth | `require_auth` — 401 if unresolved | `api/auth.py` L406-411 |
| Sovereign | `require_sovereign` — 401 / 403 unless `access_level >= 3` | `api/auth.py` L414-421 |
| Dev-mode | signature **not** verified; payload decoded | `api/auth.py` L31-70, L394-400 |
| Production guard | missing Firebase creds ⇒ **hard startup failure** | `api/auth.py` L46-52 |
| Sovereign-key gate | `SOVEREIGN_KEY` env compared for `/api/dashboard/loops` and one other route | `api/main.py` L1406-1413, L1289 |
| Authority ceiling | substrate may represent ≤ level 2 | `contracts.LAB_AUTHORITY_CEILING` |
| Human-only ops | MERGE / PRODUCTION_DEPLOY / AUTHORIZE / SCOPE_EXPANSION / IDENTITY_BOUNDARY | `contracts.HUMAN_ONLY` |

Dependency usage by module (grep counts): `require_auth` — `lab_routes` (19),
`ais_profile` (6), `social` (5), `source_routes` (5), `messages` (4), `nodes`
(4), `echofeild` (4). `require_sovereign` — `nodes.py` only (4 call sites).
`get_current_user` — `transmissions` (7), `key_routes` (6), `main` (7), etc.

### 4.2 Frontend authorization handling

| Aspect | [S] | [D] |
|---|---|---|
| Client gate | `isSovereign = access_level >= 3` (`AuthContext.tsx` L206) **and** `isSovereign = sovereignToken non-empty` (`ArkanaCommune.tsx` L306) | `user.access_level >= 3` for a display pill only |
| 401/403 handling | `ApiError.kind ∈ {AUTH_REQUIRED, FORBIDDEN}` → prose | `ApiError.isAuth` / `isForbidden` → banner + sign-in link |
| Route guards | `SolariunConsole` renders an auth threshold if `!isAuthenticated` | no route guard; `Layout` renders for all, pages degrade individually |
| `require_sovereign` surface | **not reachable** — [S] never calls `/api/nodes*` | calls `GET /api/nodes` (Admin), expects 403 for non-sovereign |
| Write-authority encoding | UI never upgrades state (documented in `ProjectDashboard.tsx` L338) | `AGENTS.md`/`Governance.tsx` encode the ceiling as a rendered invariant |

**Convergence.** Both correctly treat 401 and 403 as distinct and both refuse to
"upgrade" a state in the UI. [D] is the only frontend that *binds* the
`require_sovereign` surface (`/api/nodes`).

**Divergence (material).** [S]'s `isSovereign` (Commune) is derived from a
**purely local string**. It grants no server capability — the substrate's
sovereign key check is on `/api/dashboard/loops`, not `/api/commune/resonance`,
and the `sovereign_token` field [S] posts to `/api/commune/resonance` is not
read by that handler at all (`api/main.py` L1063-1075 reads only
`message/history/session_id/project_id`). So the "sovereign" mode in [S] is a
**cosmetic client-side abstraction** with a misleading label.

### 4.3 Frontend ↔ authority mapping table

| Backend authority construct | [S] surfaces it? | [D] surfaces it? |
|---|---|---|
| `require_auth` (401) | yes — error prose | yes — banner |
| `require_sovereign` (403) | **no** | yes (`/api/nodes` + `Identity` pill) |
| `access_level` | yes (badge, `isSovereign`) | yes (pill) |
| `LAB_AUTHORITY_CEILING = 2` | live value only | hardcoded **and** live |
| `HUMAN_ONLY` | **no** | yes (Governance card) |
| `FORBIDDEN_DIRECT_TRANSITIONS` | **no** (contradicted by lifecycle UI) | yes (Governance card) |
| `NON_COLLAPSES` | partial (project-scoped `≠` blocks) | yes (full doctrine) |
| `roles.json` / `boundaries.json` | **no** (`Flamekeeper` = 0 hits) | yes |
| `SOVEREIGN_KEY` gate | partially (local token, wrong route) | **no** (not surfaced) |

### 4.4 Authority gaps — empirical

**PROBE results (verbatim).** Anonymous vs dev-token, against [L]:

| Endpoint | anon | dev-token | Expected by contract |
|---|---|---|---|
| `GET /api/me` | 401 | 200 | 401 / 200 ✔ |
| `GET /api/approvals` | **200** | 200 | should require auth ✗ |
| `GET /api/nodes` | 401 | **403** | 401 / 403 ✔ |
| `GET /api/codex/personal` | 404 | 404 | 404 (hardcoded keys) ✔ (report §7.1) |
| `GET /api/dashboard/loops` | 403 | 403 | 403 without sovereign key ✔ |
| `POST /api/approvals/request` | **200** | — | should require auth ✗ |
| `POST /api/approvals/{id}/approve` | **404** (not 401) | — | should require auth ✗ |
| `POST /api/approvals/{id}/reject` | **404** (not 401) | — | should require auth ✗ |
| `POST /api/goals` | **400** (not 401) | — | should require auth ✗ |
| `POST /api/agent/spawn` | **400** (not 401) | — | should require auth ✗ |
| `POST /api/plan/run` | 400 (not 401) | — | should require auth ✗ |
| `POST /api/knowledge/ingest` | 422 (not 401) | — | rate-limited, auth unproven ✗ |
| `POST /solspire/workevents` | 401 | — | 401 ✔ |
| `POST /api/lab/engineering/sessions` | 401 | — | 401 ✔ |

**CODE corroboration.** `api/approval_routes.py`: `api_request_approval`
(L44), `api_list_approvals` (L58), `api_approve` (L68), `api_reject` (L88) carry
**no `Depends(require_auth)`**. `api_approve` *executes a tool*
(`tool.run(approval["payload"])`, L78). `api/loop_routes.py` `POST /api/goals`
(L78) is likewise undecorated. `api/main.py` `POST /api/agent/spawn` (L2221) and
`POST /api/plan/run` (L2169) are undecorated.

**Finding — authority gap (high materiality).** The approval queue — whose
semantic purpose is *human* authorization of consequential tool calls — is fully
open to anonymous callers: any client can enqueue an approval, list the queue,
and approve one, which causes a registered tool to execute. This contradicts
`contracts.HUMAN_ONLY` (`AUTHORIZE`) and the module's own doctrine that the
substrate must never originate authority. INFER: the extraction report's §7.1
("identity surface bound to literal keys") is the same class of defect — the
authorization surface is bound to *deployment configuration* rather than to a
consistent dependency. This is a backend defect, not a frontend one; **neither
frontend is implicated**, and [D]'s `AGENTS.md` does not claim these endpoints
are protected.

**Finding — frontend authority gap.** [S]'s "sovereign" mode is decorative
(§4.2). A user who sees `ARKANA // SOVEREIGN` holds no additional server
authority. This is a **frontend-only abstraction that misrepresents authority**.

---

## 5. Presentation reconciliation

### 5.1 Stack and shell

| Aspect | [S] | [D] |
|---|---|---|
| Framework | React 18 + Vite 5 + TS | React 18 + Vite 5 + TS |
| Router | **hand-rolled** `resolvePath` + `history.pushState` (`App.tsx`) | `react-router-dom` 6 |
| State/data | `@tanstack/react-query` + custom hooks | hand-rolled `useAsync` / `usePolling` |
| Styling | Tailwind 3 + bespoke CSS (`arkadia-core.css`, `arkana-density.css`, `solspire.css`) | one hand-authored `styles.css` token system |
| Motion | `framer-motion` 12 (`AnimatePresence`) | none |
| Charts | `recharts` 3 + `d3` 7 | none |
| Icons | `lucide-react` | Unicode glyphs (`◉ ✦ ⌘ ❖ ⁂ ⌕ ⚙ ◇ ∞ ✉ § ◈ ⇄`) |
| Markdown | `react-markdown` + `remark-gfm` | none |
| Auth SDK | `firebase` 12 | none |
| Node engine | `node 24.x`, pnpm 10 | npm, no engine pin |
| Title | `ARKADIA — SolSpire` | `Arkadia Substrate Console` |
| theme-color | `#080A11` | `#0a0b12` |

### 5.2 Design tokens

| Token | [S] (`index.css`) | [D] (`styles.css`) |
|---|---|---|
| Background | `#0A0A0F` / `#080A11` | `--bg: #0a0b12`, `--bg-raised: #10121c` |
| Primary accent | `--teal: #00D4AA` | `--cyan: #4fd6e0` |
| Secondary accent | `#C9A84C` (gold) | `--ember: #ff7a45`, `--violet: #a98bff` |
| Ink | `--text: #E9E7DF` | `--ink: #e7e9f5` |
| Line | `rgba(255,255,255,.075)` | `--line: #232742` |
| Typography | serif display + sans body + mono data | `--sans: Inter`, `--mono: ui-monospace` |

**Divergence.** Both are dark "observatory" themes, but [S] is a **brand system**
(serif `ARKADIA` wordmark, gold/teal dual accent, aurora background, motion) while
[D] is an **operator system** (monospace-forward, ember/cyan/violet, dense
tables, `JsonBlock` for raw payloads). They are not visually reconcilable, and
[D] was not derived from [S] — consistent with the independent-derivation
requirement.

### 5.3 Navigation IA

| [S] `ArkadiaNavigation` | [D] `Layout` |
|---|---|
| Home, Oracle, Living Gate, Nexus, NovaNet, Workspaces, Solariun, SolSpire, System, About, SCI, Settings, Profile | **Observatory**: Overview, Celestial, Route Surface · **Knowledge OS**: Notes, Graph, Search · **Substrate**: Engineering Lab, SolSpire, Kernel Loop, Commune · **Boundary**: Governance, Identity, Sources |
| Personal/enterprise/product framing | Substrate/inspection framing |
| `SolSpireLens` = 13 sub-sections | `MOBILE_TABS` = 5 primary destinations + More |

### 5.4 Routing constraint (a derived-only hazard)

[D] `vite.config.ts` proxies backend prefixes with **anchored regex keys**
(`/api`, `/solspire`, `/health`, `/openapi.json`, `/docs`, `/static`). Because a
plain prefix would shadow SPA routes, [D] moved SolSpire to `/spire` and the API
explorer to `/routes`, and documented the constraint in `AGENTS.md`. [S] avoids
the collision differently: its dev proxy forwards only `/api` and it keeps
`/solspire` as a *client* route (no `/solspire` proxy). **Divergence in
approach; both are internally consistent.**

### 5.5 Mobile / PWA

[D] implements a full mobile shell (`@media (max-width: 820px)`): off-canvas
drawer, 5-tab bottom nav, safe-area insets, `.table-wrap` scroll containers on 16
tables, PWA manifest + maskable icon, `viewport-fit=cover`. [S] has a plain
`width=device-width, initial-scale=1.0` viewport, no manifest, no bottom nav, and
several fixed-width inline-style layouts (e.g. `NodeEntry.tsx`, `SpiralGrovePage`)
that are desktop-shaped. **Capability divergence:** [D] is mobile-calibrated; [S]
is not.

---

## 6. Findings register

### 6.1 Convergence

| # | Finding | Evidence |
|---|---|---|
| C1 | Governance constants reproduced exactly (8 non-collapses, 3 forbidden transitions, 5 human-only ops, 13 checkpoint states, authority levels 0–7, ceiling 2) | `contracts.py` ↔ `Governance.tsx` (parsed diff) |
| C2 | 24 backend paths (metric A) called by both — incl. all 3 identity endpoints and the same auth envelope; 55 under metric B | path-set intersection; `api/auth.py` |
| C3 | Both treat 401 ≠ 403 and refuse UI state-upgrades | `ui.tsx` `ErrorBanner`; `ProjectDashboard.tsx` L338 |
| C4 | Both read the same live governance telemetry (`governance.maximum_authority` etc.) | `/api/lab/engineering/overview`, `/api/lab/overview` |
| C5 | Both accept that the Personal Codex may legitimately 404 | `AuthContext.tsx`; `Identity.tsx` |
| C6 | Same framework/runtime (React 18 + Vite 5 + TS), same dark observatory theme family | `package.json` both |

### 6.2 Divergence

| # | Finding | Evidence |
|---|---|---|
| D1 | [S] renders `READY FOR REVIEW → COMPLETED` as a legal step; [B] forbids it; [D] renders it forbidden | `SolariunGrammar.tsx` L28-38 vs `contracts.py` L104-110 vs `Governance.tsx` |
| D2 | [S] `isSovereign` = non-empty local string; [B] = `access_level >= 3`; [D] = `access_level >= 3` | `ArkanaCommune.tsx` L306 vs `api/auth.py` L402 |
| D3 | [S] is write-capable (90 mutations); [D] has exactly 1 mutating UI path | verb counts; grep |
| D4 | [S] has a full credential lifecycle; [D] has none | `LoginPage.tsx` vs `AuthContext.tsx` |
| D5 | [D] binds `require_sovereign` (`/api/nodes`); [S] never calls it | endpoint usage |
| D6 | [D] documents backend defects in-repo; [S] does not | `web/AGENTS.md` |
| D7 | [D] is mobile-calibrated + PWA; [S] is not | `styles.css` media queries; `index.html` |
| D8 | [S] is brand/motion/recharts/d3; [D] is token/table/monospace | `package.json`; `styles.css` |

### 6.3 Backend-only capability (no UI in either frontend)

- **Between 56 (metric B) and 114 (metric A) of 235 paths** have no frontend
  caller (§2.1/§2.5).
- Highest-materiality clusters: approvals decision (`approve`/`reject`),
  agent-spawn / plan-run / ceo-chat, the 9-path Weaver execution chain, Lab
  Android surface, SolSpire enterprise members/desks/tasks, SolSpire execution
  control (pause/resume/cancel), provider routing (select/model/fallback),
  filesystem & GitHub write tools, knowledge enrich/replay, identity
  development.
- The substrate's **flagship governed-session workflow is end-to-end
  backend-only** — no frontend can open → authorize → execute a session
  (`/api/lab/engineering/sessions/{id}` and `/execute` have no caller;
  [D] binds `authorize`/`transition` but exposes no control that calls them).

### 6.4 Frontend-only abstraction

| # | Abstraction | Where | Relationship to substrate |
|---|---|---|---|
| F1 | Cosmetic "sovereign mode" | [S] `ArkanaCommune.tsx` L306 | no server capability; `sovereign_token` field is ignored by `/api/commune/resonance` |
| F2 | 12-question A.I.S questionnaire → `/api/me/ais-profile` | [S] `NodeEntry.tsx` | client-side scoring persisted into a backend slot; the substrate never computes it |
| F3 | Client-side `resolvePath` router with compatibility aliases (`/codex`, `/loops`, `/dashboard`, `/personal-echofeild` → Solariun lenses) | [S] `App.tsx` | frontend-only URL surface, no backend counterpart |
| F4 | `WEAVER_LIFECYCLE` incl. `ACCEPTED` | [S] `SolariunGrammar.tsx` | vocabulary not in `CHECKPOINT_STATES` (adds `ACCEPTED`, drops 5 states) |
| F5 | Phantom API call `/api/codex/categories` (plus static IMS HTML pages) | [S] | no backend route; genuine 404 |
| F6 | `Empty` "declared non-implementation" cards (distribution, governance manifest) | [D] `Sources.tsx`, `Governance.tsx` | truthful frontend admission, not a fake surface |
| F7 | Unused write bindings (`createGoal`, `createSession`, `transitionSession`, `authorizeSession`, `createWorkEvent`, `createWorkload`, `ingestNote`) | [D] `endpoints.ts` | bound capability with no UI control |

### 6.5 Authority gaps

| # | Gap | Class | Evidence | Materiality |
|---|---|---|---|---|
| A1 | Approval queue open to anonymous: enqueue, list, **approve (executes a tool)**, reject — no `require_auth` | backend | `api/approval_routes.py` L44/58/68/88; PROBE 200/200/404/404 | **high** — contradicts `HUMAN_ONLY: AUTHORIZE` |
| A2 | `POST /api/goals`, `/api/agent/spawn`, `/api/plan/run` unauthenticated | backend | `api/loop_routes.py` L78; `api/main.py` L2169, L2221; PROBE 400 | high — anonymous job/goal creation |
| A3 | [S] "sovereign" label grants no authority; `sovereign_token` posted to a route that ignores it | frontend | `ArkanaCommune.tsx` L306/L580; `api/main.py` L1063-1075 | medium — misleading authority UI |
| A4 | `require_sovereign` is used in **one** module (`nodes.py`) while 7 modules use `require_auth`; no module uses a tier above `require_auth` for approvals/agent control | backend | grep counts | high — authority model applied unevenly |
| A5 | `SOVEREIGN_KEY` gate protects 2 routes; if unset it degrades to "gate closed" (403) but the surrounding write surface is unaffected | backend | `api/main.py` L48-60, L1406 | medium |
| A6 | Dev-mode decodes JWTs **without signature verification**; [D] actively mints `alg:"none"` tokens | backend + frontend | `api/auth.py` L72-84; `AuthContext.tsx` `mintDevToken` | high if dev-mode ever runs in prod; guarded by `ENVIRONMENT=production` hard-fail |

### 6.6 Unresolved questions

1. **Does [L] run in dev-mode?** `GET /api/me` returned 200 for an unsigned
   token, which is dev-mode behaviour. If [L] is a production deployment, the
   `ENVIRONMENT=production` guard is not engaged. Needs direct inspection of the
   deployment's env.
2. **Is A1 (open approvals) intentional?** The module docstring calls approvals a
   *human* gate, but no dependency enforces it. Is this a deliberate
   "trusted-network" assumption, or a missing `Depends(require_auth)`?
3. **Was `/api/approvals/*` ever protected in the source repo?** The extraction
   says the closure was copied unmodified; a source-side diff would settle
   whether this is a pre-existing defect or an extraction artifact.
4. **Which frontend is canonical?** [S] is the shipped product surface; [D] is an
   operator console. The mission frames them as reconcilable, but they serve
   different roles — is the intended end state one console or two?
5. **Is `ACCEPTED` ([S] `WEAVER_LIFECYCLE`) a real backend state?** It is absent
   from `CHECKPOINT_STATES`; if it exists elsewhere it should be reconciled.
6. **`/api/codex/categories` and `/solspire/projects/{id}/weaver`:** removed
   backend routes or never-implemented frontend stubs? Determines whether [S] has
   two live 404s.
7. **`/api/knowledge/search` (POST) vs `/search/fulltext` (GET):** [S] uses the
   POST form, [D] the GET form. Are they equivalent, or does one supersede the
   other?
8. **The 4 failing `test_nodes_tools_seam.py` tests** (report §7.1) and the
   hardcoded `"zahrune"`/`"jessica"`/`"architect"` keys: does the operator
   console need to surface `/api/nodes/{node_key}` even though the sanitized data
   makes it 404? [D] calls `/api/nodes` (list) and expects 403 for non-sovereign.

---

## Appendix A — called-path sets (normalized)

**Called by both — metric A (24):**
`/api/ark-date` `/api/commune/threads` `/api/heartbeat` `/api/keys/pool`
`/api/lab/engineering/overview` `/api/lab/overview` `/api/me`
`/api/me/ais-profile` `/api/me/codex` `/api/me/identity-spine`
`/api/messages/inbox` `/api/open-loops` `/api/provider-keys` `/api/sources`
`/api/stellar-cartography` `/api/transmissions` `/api/tts/status`
`/solspire/enterprise/workspaces` `/solspire/projects` `/solspire/proposals`
`/solspire/sources` `/solspire/workevents` `/solspire/workloads`
`/solspire/workspace`

(Metric B raises this to 55 — see §2.1.)

**Derived-only:** see §2.3.

**Backend-only:** see §2.5.

---

## Appendix B — reproduction

```bash
# [S] fetch
git clone --depth 1 --filter=blob:none --sparse \
  https://github.com/Arkadia-Oversoul-Prism/Arkadia.git arkadia_src
cd arkadia_src && git sparse-checkout set web/public_prism

# path-set comparison (normalized {param} <-> ${expr})
# governance-constant comparison (parse contracts.py vs Governance.tsx)
# live authorization probes
for p in /api/me /api/approvals /api/nodes /api/dashboard/loops; do
  curl -s -o /dev/null -w "$p %{http_code}\n" "$HOST$p"
done
```

---

*End of RECONCILIATION-01. Evidence artifact only; neither implementation was
modified.*
