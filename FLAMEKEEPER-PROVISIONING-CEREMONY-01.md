# FLAMEKEEPER-PROVISIONING-CEREMONY-01

**Type:** governance procedure specification (specify, do not execute)
**Status:** SPECIFIED — NOT EXECUTED
**Companion:** `AUTHORIZATION-BOUNDARY-01.md`, `AUTHORITY-CLOSURE-01.md`

> The system now declares what requires sovereign authority and honestly reports
> that **no principal currently possesses it**. This document specifies how the
> first Flamekeeper would be established. It is deliberately **not executed**.
> Manufacturing a sovereign silently would be a worse outcome than having none.

---

## 0. Why this is a ceremony and not a config change

`governance/roles.json` grants the `Govern` permission to the Flamekeeper only.
`fde9a1b` made `/api/approvals/{id}/{approve,reject}` enforce that. The live
registry contains no node with the `Flamekeeper` role or `access_level >= 3`
(`GET /api/nodes/public` → one `Structural Fixture`, `role=None`,
`access_level=None`).

So today the system is coherent: it knows what needs sovereign authority, and it
refuses to fabricate a holder. Provisioning the first holder is the moment the
substrate acquires a sovereign — it should be explicit, evidenced, reversible,
and human-initiated.

---

## 1. Preconditions

- [ ] Production posture is enabled (`PRODUCTION-POSTURE-ENABLEMENT-01.md`).
      Provisioning an authority while identity is forgeable would bind
      sovereign power to an unverified subject. **This is the hard precondition.**
- [ ] The provisioning actor's identity is signed and verified (not dev-mode).
- [ ] The Arkadia subject store is reachable and the target subject does not
      already hold `Govern`.
- [ ] The node registry is writable by the provisioning path only (admin-set
      `node_key` claim; see §4).
- [ ] The ceremony is being run by a human with §2 authority, not by an agent.

---

## 2. Who is permitted to initiate provisioning

This is the hardest question, and it must be answered **before** the first
Flamekeeper exists — because at that moment there is, by definition, no in-system
authority to appeal to.

- **Initiating authority is out-of-band and human.** The first Flamekeeper is
  established by the human sovereign who controls the deployment and the
  Firebase project, not by any in-system principal.
- **No agent may self-initiate.** `fde9a1b` removed agent self-approval; the
  same principle forbids an agent from minting the authority that would let it
  self-approve.
- **GitHub (or any identity provider) may attest, never own.** An identity
  provider can confirm *who* a human is. It does not confer *authority*; the
  authority comes from the human governance act. (This preserves the larger
  distinction: identity provider ≠ identity ≠ authority.)

---

## 3. Canonical identity of the first Flamekeeper

The first Flamekeeper's canonical identity is a **Firebase subject (`uid`)**
bound to an Arkadia node record. Concretely:

- a real Firebase-authenticated account (a `uid` that survives verification);
- optionally linked to a human-readable handle via `api/auth.resolve_uid_by_handle`;
- **not** an email alone, **not** a display name, **not** a GitHub login.

The canonical key is the `uid` — because that is the value `require_auth`
returns and the value `subject_ref` records on approvals. Binding authority to
anything else would create a second identity that the enforcement path does not
check.

---

## 4. How the identity becomes bound to the Arkadia subject

Authority is derived from the node registry, keyed by an **admin-set Firebase
custom claim**, not from self-assertion:

1. An admin sets the custom claim `node_key` (or `arkadia_node`) on the
   Firebase account (`api/auth.build_user_profile`, lines 316–317).
2. A node record is registered under that key with `role: "Flamekeeper"` and
   `access_level: 3` (`data/nodes_seed.json` shape; `get_node_by_key`).
3. On each request, `require_auth` → `build_user_profile` resolves the node and
   returns `role` + `access_level`; `_require_govern_authority` then accepts the
   principal.

**Invariant:** a user cannot grant themselves authority, because the claim is
set only by an admin and the node record is not client-writable.

---

## 5. Assigned role and access level

- `role`: `"Flamekeeper"`
- `access_level`: `3` (the sovereign tier; `api.auth.require_sovereign` gates on
  `>= 3`)
- Either is sufficient for `_require_govern_authority`; setting both is
  recommended so the two encodings agree.

---

## 6. Evidence that records the provisioning

The ceremony must leave a durable record before it takes effect:

- the **Firebase `uid`** provisioned;
- the **`node_key`** and node record created;
- the **actor** who initiated it and the **timestamp**;
- the **justification** (why this subject, at this time);
- a **commit or change record** adding the node to the registry.

Recommended: append the record to the existing evidence chain (this file's
siblings) so authority events are auditable alongside the boundary evidence.

---

## 7. Independent verification

- [ ] `GET /api/auth/me` (or equivalent) for the provisioned subject returns
      `role == "Flamekeeper"` and `access_level == 3`.
- [ ] That subject can `POST /api/approvals/{id}/approve` and receives **200**.
- [ ] An ordinary authenticated subject still receives **403** on the same route.
- [ ] `GET /api/approvals` for the Flamekeeper returns **all** pending approvals;
      for an ordinary subject, only its own.
- [ ] The approval is single-use: a second run with the same `approval_id`
      returns **403**.

Verification is performed by someone **other than** the provisioning actor where
possible.

---

## 8. Revocation and transfer

- **Revocation:** clear the `node_key` custom claim on the Firebase account
  and/or mark the node record revoked. The next request fails
  `_require_govern_authority`; no restart is required because authority is
  resolved per-request from claims + registry.
- **Transfer:** provision the successor (a new `uid` → node), verify (§7), then
  revoke the predecessor. There must never be a window with **zero** sovereign
  holders *during* a transfer unless that gap is intentional; and never more
  than the intended number at rest.
- **Self-revocation of the last Flamekeeper:** permitted, and it returns the
  system to the current honest state ("nobody holds sovereign authority").

---

## 9. If provisioning is interrupted

- **Interrupted before the node record is written:** the claim exists but no
  node resolves → `role` stays `Guest`, authority is **not** granted. Fail-safe.
- **Interrupted after the node record is written but before verification:** a
  sovereign exists but is unverified. The system is *more* privileged than
  intended — this is the only dangerous window. Mitigation: write the node
  record **last**, and treat §7 verification as blocking.
- **Partial claim (role set, level unset):** `_has_govern_authority` still
  accepts on the role encoding. This is intended (either encoding is
  sufficient), but it means the two must be set consistently to avoid confusion.

---

## 10. Operations that become newly available afterward

Once a Flamekeeper exists, and only then:

- approving and rejecting queued approvals (`/api/approvals/{id}/approve|reject`);
- therefore, spending an approval to execute an approval-gated tool
  (e.g. `execute_shell`) through `POST /api/tools/{tool}/run`;
- the cross-subject reviewer view of pending approvals.

Nothing else changes: authentication, ownership isolation, single-use approval,
and tool guardrails remain enforced for all principals including the Flamekeeper.
**Sovereign authority is not a bypass** — it is the missing link in a chain that
still requires identity, a recorded approval, and the tool's own guardrails.

---

## 11. Explicit non-actions

- The agent did **not** create a node record, set a claim, or mint any principal.
- The agent did **not** add an auto-provisioning path for authority.
- The ceremony is **not executed**. It awaits a human authority decision.
