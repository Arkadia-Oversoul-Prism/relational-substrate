# AUTHORITY-CLOSURE-01

**Type:** state-of-the-system evidence record (not an architecture document)
**As of:** commit `b2b9495` (local `main`), 2026-10-01
**Purpose:** a current authority map — every line carries an evidence reference.

## STATE := PRE-PRODUCTION

> The code-level perimeter is substantially improved and the governance model is
> partially enforced. **The Arkadia authority plane is not production-ready.**
> The live process is still running with development authentication (E2, E3,
> E16). Read every line below through that lens.

This state is deliberately loud, because the distinction must be impossible to
miss: strong enforcement in code does not become a production posture until the
environment is changed and independently verified.

```
PRE-PRODUCTION                    ◀── we are here
    │
    │ human-authorized deployment configuration   (PRODUCTION-POSTURE-ENABLEMENT-01)
    ▼
PRODUCTION-AUTHENTICATED
    │
    │ independent verification                    (§5 checklist)
    ▼
PRODUCTION-AUTHENTICATED / VERIFIED
    │
    │ human authority ceremony                    (FLAMEKEEPER-PROVISIONING-CEREMONY-01)
    ▼
SOVEREIGN AUTHORITY PROVISIONED
```

The marker is removed only when the environment is genuinely
production-authenticated **and** independently verified — not when the code is
merged.

---

## The map

```
IDENTITY
  authenticated?              YES                     [E1]
  identity forgeability?      DEV CONFIG BLOCKER      [E2]
  production posture?         NOT ENABLED             [E3]

AUTHORITY
  human-only operations?      DECLARED                [E4]
  server enforcement?         PARTIAL → IMPROVED      [E5]
  approval authority?         NONE PROVISIONED        [E6]

EXECUTION
  authentication boundary?    ENFORCED                [E7]
  approval boundary?          ENFORCED                [E8]
  approval single-use?        ENFORCED                [E9]
  ownership isolation?        ENFORCED                [E10]
  tool guardrails?            ENFORCED                [E11]

GOVERNANCE
  forbidden transitions?      RUNTIME ENFORCED        [E12]
  non-collapses?              MACHINE CHECKED         [E13]
  authority ceiling?          DECLARED                [E14]
  sovereign principal?        NOT PROVISIONED         [E15]

DEPLOYMENT
  production authentication?  NOT ENABLED             [E16]
  dev fallback active?        YES                     [E17]
```

---

## Evidence references

**E1 — authenticated? YES**
`api/auth.py` `require_auth`; enforced on the tool perimeter by `ff9d1b5` and on
the kernel-loop/plan surfaces by `f537bba`. Tests:
`tests/test_tool_execution_perimeter.py::test_anonymous_cannot_list_tools`,
`tests/test_kernel_loop_perimeter.py::test_kernel_loop_routes_require_auth`.

**E2 — identity forgeability? DEV CONFIG BLOCKER**
`api/auth.py` dev-mode branch (lines 51–64) decodes JWTs without signature
verification (`_decode_jwt_payload_unsafe`). Live probe: an unsigned
`alg:"none"` token authenticated. This is the deployment's posture, not a code
defect — the guard is correct (E3 note).

**E3 — production posture? NOT ENABLED**
`/proc/<uvicorn-pid>/environ` (live process): `ENVIRONMENT` and
`FIREBASE_SERVICE_ACCOUNT_JSON` both unset. The production guard fails closed
when engaged: `tests/test_auth_deployment_posture.py` (3 passing, commit
`dc8e987`). Specification: `PRODUCTION-POSTURE-ENABLEMENT-01.md`.

**E4 — human-only operations? DECLARED**
`governance/roles.json`: the `Govern` permission ("approve or modify governance
definitions and policies") is held by `Flamekeeper` only; `Weaver` is
"non-authoritative for governance". `governance/vows.md` ("Sovereignty: The
Flamekeeper maintains oversight"). Declared in data, not yet exhaustive in
enforcement.

**E5 — server enforcement? PARTIAL → IMPROVED**
Improved: `fde9a1b` enforces `Govern` authority on
`/api/approvals/{id}/{approve,reject}` (`api/approval_routes.py`
`_require_govern_authority`). Still partial: the substrate's *other* human-only
operations are not yet enumerated as an enforceable list, so "human-only" is not
uniformly a server-side predicate.

**E6 — approval authority? NONE PROVISIONED**
Live `GET /api/nodes/public` returns one node: `role="Structural Fixture"`,
`access_level=None`. No `Flamekeeper` / sovereign principal exists, so no caller
can approve. This is coherent (the system reports what it lacks) and is the
subject of `FLAMEKEEPER-PROVISIONING-CEREMONY-01.md`.

**E7 — authentication boundary? ENFORCED**
`ff9d1b5` (`/api/tools`, `/api/tools/{tool}/run`), `f537bba` (kernel-loop router,
`/api/agent/spawn`, `/api/plan/run`). Tests:
`tests/test_tool_execution_perimeter.py`, `tests/test_kernel_loop_perimeter.py`.
Live: anonymous → 401 across the perimeter.

**E8 — approval boundary? ENFORCED**
`api/main.py` `_approval_is_valid` + the run route: a tool declaring
`requires_approval` is denied (403) without a recorded, unconsumed, same-subject
approval. Tests:
`::test_authenticated_but_unapproved_gated_tool_is_denied`,
`::test_pending_approval_is_not_yet_spendable`.

**E9 — approval single-use? ENFORCED**
`ff9d1b5` consumes the approval (`consumed_at`) on the run. Test:
`::test_approved_gated_tool_runs_once` (second run → 403).

**E10 — ownership isolation? ENFORCED**
Approval subject must match the executing caller (`_approval_is_valid`).
Tests: `::test_approval_is_not_spendable_by_another_subject`,
`::test_approval_listing_is_subject_scoped`.

**E11 — tool guardrails? ENFORCED**
Inner guardrails are unchanged by the perimeter work:
`::test_shell_allowlist_still_holds_after_approval`,
`::test_read_containment_still_holds`. Authentication and approval are added
*above* the guardrails, not in place of them.

**E12 — forbidden transitions? RUNTIME ENFORCED**
`weaver/enterprise_orchestration.py`: execution requires a valid authorization
("valid matching authorization required before execution", line 377) and success
requires evidence ("execution success requires EvidenceRecord", line 384). Tests:
`tests/test_enterprise_orchestration.py` (86 passing, incl.
`test_transition_contracts_and_reverse_walk`,
`test_execution_success_requires_evidence`).

**E13 — non-collapses? MACHINE CHECKED**
`tests/test_engineering_lab_substrate.py::test_state_non_collapse_is_enforced`
(AUTHORIZED may not collapse straight to COMPLETED).

**E14 — authority ceiling? DECLARED**
`governance/boundaries.json` (`allowed_roles` per boundary),
`tests/test_phase3_council.py` (`authority_ceiling`),
`tests/test_engineering_lab_substrate.py::test_agent_capability_cannot_exceed_role_ceiling`,
`tests/test_engineering_lab_agent_loop.py::test_weaver_ceiling_excludes_terminal_run`.
The ceiling is machine-checked **within** the enterprise/lab subsystem, and
declared for the substrate — but it is **not yet wired into the HTTP tool
perimeter** (see Gap G3).

**E15 — sovereign principal? NOT PROVISIONED**
Same evidence as E6. Absence is deliberate and documented, not accidental.

**E16 — production authentication? NOT ENABLED**
Same evidence as E3. Specification prepared, not applied
(`PRODUCTION-POSTURE-ENABLEMENT-01.md`).

**E17 — dev fallback active? YES**
`api/auth.py` dev-mode branch taken (no credentials, non-production); live probe
accepted an unsigned token.

---

## What this map does NOT claim

- It does not claim the deployment is secure. It claims the *code* enforces a
  boundary and the *deployment* has not yet adopted it (E2, E3, E16).
- It does not claim "human-only operations" are fully enforced (E5). One class
  (approvals) is enforced; the full class is declared, not enumerated.
- It does not claim an authority ceiling governs the HTTP perimeter (E14, G3).
- It does not claim a sovereign exists (E6, E15). None does.

---

## Open gaps (ranked)

| # | Gap | Severity | Owner |
| --- | --- | --- | --- |
| G1 | Deployment runs in dev-mode; identity forgeable (E2/E3/E16) | **Blocker** | human deployment decision |
| G2 | No sovereign principal provisioned; approval-gated tools unavailable (E6/E15) | Operational | human authority decision |
| G3 | Authority ceiling / human-only list not enforced on the HTTP perimeter (E5/E14) | Medium | engineering (deferred) |
| G4 | `tests/test_autonomy.py` collection error (pre-existing, unrelated) | Low | engineering (deferred) |
| G5 | 23 pre-existing test failures unrelated to the perimeter (pre-existing) | Low | engineering (deferred) |

G1 and G2 are **human authority decisions** and are intentionally not resolved by
the agent. G3–G5 are engineering follow-ups, explicitly deferred.

---

## The distinctions this record preserves

```
identity provider  ≠  identity
identity           ≠  authority
authority          ≠  approval
approval           ≠  execution
execution          ≠  evidence
evidence           ≠  verification
```

Each `≠` above is now backed by an enforced boundary or a machine-checked test
(E1, E4/E5, E6/E8, E9/E12, E12/E13). That is the closure: the separations are
executable, not philosophical.

---

## Evidence chain

| Artifact / commit | Role |
| --- | --- |
| `RECONCILIATION-01.md` (`88f0456`) | capability reconciliation |
| `AUTHORIZATION-BOUNDARY-01.md` (`5798fe6`) | boundary findings AB-1…AB-9 |
| `ff9d1b5` | P0 remediation — auth + approval on tool execution |
| `dc8e987` | deployment-posture contract pinned (AB-9) |
| `f537bba` | kernel-loop + plan surfaces authenticated |
| `fde9a1b` | approval authority from the declared governance model |
| `PRODUCTION-POSTURE-ENABLEMENT-01.md` | G1 enablement spec (not applied) |
| `FLAMEKEEPER-PROVISIONING-CEREMONY-01.md` | G2 ceremony spec (not executed) |
| **`AUTHORITY-CLOSURE-01.md`** | this map |

All commits are **local**; nothing is pushed, no PR is open, nothing is deployed.
