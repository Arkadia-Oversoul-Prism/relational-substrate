# PRODUCTION-POSTURE-ENABLEMENT-01

**Type:** enablement specification (prepare, do not apply)
**Status:** SPECIFIED — NOT APPLIED
**Scope:** the running deployment's authentication posture (finding AB-9)
**Companion:** `AUTHORIZATION-BOUNDARY-01.md`, `AUTHORITY-CLOSURE-01.md`

> This document states what must be true for the deployment to authenticate
> callers. It does not change the environment. Applying it is a human
> deployment decision; the agent's role ends at specifying and verifying.

---

## 1. Current verified state (the reason this exists)

Direct inspection of the running process (not inference):

| Fact | Evidence |
| --- | --- |
| `ENVIRONMENT` is unset in the live process | `/proc/<uvicorn-pid>/environ` read; no `ENVIRONMENT` entry |
| `FIREBASE_SERVICE_ACCOUNT_JSON` is unset | same |
| `_init_firebase()` therefore takes the dev-mode branch | `api/auth.py` lines 51–64 |
| Dev-mode decodes JWTs **without signature verification** | `api/auth.py` `_decode_jwt_payload_unsafe`, `get_current_user` |
| An unsigned `alg:"none"` token authenticates | live probe returned 200 on protected routes |
| The production guard itself is correct and fails closed | `tests/test_auth_deployment_posture.py` (3 passing) |

Conclusion: **the code is ready; the deployment is misconfigured.** The exposure
is that the host runs in dev-mode, where identity is forgeable.

---

## 2. Required configuration

### 2.1 `ENVIRONMENT=production`

- **Value:** the literal string `production` (case-insensitive; compared after
  `.strip().lower()`, `api/auth.py:48`).
- **Effect:** selects the fail-closed branch of `_init_firebase()`.
- **Any other value or absence:** dev-mode fallback (the current state).

### 2.2 `FIREBASE_SERVICE_ACCOUNT_JSON`

- **Accepted forms** (`api/auth.py:75–78`):
  - an inline JSON **object** (starts with `{`) → parsed via
    `credentials.Certificate(json.loads(...))`;
  - a **filesystem path** to a service-account JSON file → `credentials.Certificate(path)`.
- **Required claims:** a valid Firebase/Google service-account key with
  `client_email`, `private_key`, `token_uri`, `project_id` — the exact fields
  the Admin SDK validates (a key missing them is a hard failure; see §4).
- **Never in the repository.** Not in `.env` committed to git, not in any
  tracked file. See §3.

### 2.3 Value precedence and isolation

- The two variables are read from the **process environment** at import time
  (`_init_firebase()` runs at module import, `api/auth.py:92`).
- Values injected after process start have no effect; the process must be
  restarted for the posture to change.

---

## 3. Where each value must live

| Value | Location | Must NOT be |
| --- | --- | --- |
| `ENVIRONMENT=production` | deployment environment configuration for the backend service | committed config that also runs locally |
| Service-account JSON | the deployment's **secret store** (platform secret manager / injected secret volume), exposed to the backend process as `FIREBASE_SERVICE_ACCOUNT_JSON` | in the git tree, in `data/`, in logs, in the frontend bundle |
| Firebase Web API key / client config | frontend build env (client-side, non-secret) | — |

**Placement is platform-specific and is a human decision.** This document
deliberately does not name the secret manager or apply a change, because the
deployment's own secret boundary is exactly what we are establishing.

---

## 4. Expected startup behaviour

### 4.1 With valid credentials present

- `_init_firebase()` initialises the Admin SDK and logs
  `[AUTH] Firebase Admin SDK initialised`.
- `_dev_mode` is `False`; `verify_firebase_token()` verifies signatures.
- No dev-mode warning is emitted.

### 4.2 With credentials missing or invalid (must fail closed)

| Case | Required behaviour | Evidence |
| --- | --- | --- |
| `ENVIRONMENT=production`, no credentials | **Hard error at import**; process must not start | `tests/test_auth_deployment_posture.py::test_production_without_credentials_refuses_to_start` |
| `ENVIRONMENT=production`, invalid credentials | **Hard error at import**; never a silent downgrade to dev-mode | `::test_production_with_invalid_credentials_refuses_to_start` |
| non-production, no credentials | dev-mode fallback (documented, not a production state) | `::test_non_production_without_credentials_falls_back_to_dev_mode` |

The guard's contract is: **if you set `ENVIRONMENT=production`, the server will
not run unauthenticated.** There is no path from "configured for production" to
"running insecurely".

---

## 5. Post-change verification checklist

Run **after** the environment is changed and the backend restarted. Each item
maps to an observable result; none requires reading the source.

- [ ] **Unsigned token is rejected.** A token with `alg:"none"` and no signature
      returns **401** on a protected route (e.g. `GET /api/tools`).
- [ ] **A valid signed token authenticates normally.** A token minted by the
      Firebase project returns **200** on the same route.
- [ ] **Protected routes remain protected.** Anonymous requests return **401**
      on the perimeter: `/api/tools`, `/api/tools/{tool}/run`, `/api/approvals*`,
      `/api/goals`, `/api/jobs*`, `/api/plan/run`, `/api/agent/spawn`.
- [ ] **No silent fallback.** The startup log does **not** contain
      `running in dev-mode`; it contains `Firebase Admin SDK initialised`.
- [ ] **Startup fails closed when misconfigured.** With
      `ENVIRONMENT=production` and credentials removed, the process refuses to
      start (repeatable in a staging slot).
- [ ] **Approval-gated tools still deny without approval.** Authenticated but
      unapproved `POST /api/tools/execute_shell/run` returns **403**.
- [ ] **The frontend still authenticates.** The console obtains a token and
      `GET /api/tools` loads the catalog (client sends the bearer token,
      `web/src/api/endpoints.ts`).

**Pass condition:** all boxes checked, and the dev-mode warning is absent from
startup logs.

---

## 6. Rollback

Reverting the environment to its prior state (unset `ENVIRONMENT`) restores
dev-mode. This is a one-variable change; there is no schema or data migration.
Rollback is therefore trivial — which is precisely why the risk sits entirely in
*failing to apply it*, not in applying it.

---

## 7. Explicit non-actions

- The agent did **not** set `ENVIRONMENT`, **did not** provision credentials,
  and **did not** restart the deployment for this purpose.
- The agent did **not** weaken the production guard to make local running easier.
- Applying this specification is the human authority decision named in
  `AUTHORITY-CLOSURE-01.md` §DEPLOYMENT.
