"""P0 regression — the tool execution perimeter.

Acceptance tests for the boundary hardened in response to
``AUTHORIZATION-BOUNDARY-01.md`` (finding AB-1: ``POST /api/tools/{tool}/run``
executed any registered tool with no authentication and ignored
``requires_approval``).

The perimeter composes three checks and none substitutes for another:

  * **authentication** — ``Depends(require_auth)`` establishes *who* is calling;
  * **authorization**  — the tool must exist, and the caller must present a
    valid approval reference for approval-gated tools;
  * **approval**       — a tool declaring ``requires_approval`` is denied until a
    recorded, unconsumed, same-subject approval exists.

Anonymous-denial cases exercise the *real* dependency (no override) so the
assertion is about the boundary itself. Authenticated cases override
``require_auth`` so the authorization/approval logic is tested deterministically
without real Firebase credentials — the override is the identity under test, not
a stand-in for the boundary being verified.
"""
from __future__ import annotations

import inspect

import pytest
from fastapi.testclient import TestClient

from api.approval_routes import APPROVAL_LOCK, PENDING_APPROVALS
from api.auth import require_auth
from api.main import app
from kernel.tools_real import register_real_tools

RUN = "/api/tools/{}/run"


@pytest.fixture(scope="module", autouse=True)
def _tools_registered():
    """Register the real executable tools (normally done in the app lifespan)."""
    register_real_tools()


@pytest.fixture(scope="module", autouse=True)
def _isolate_dependency_overrides():
    """Guarantee this module's anonymous tests exercise the real auth boundary,
    regardless of overrides another module may have left on the global app."""
    app.dependency_overrides.pop(require_auth, None)
    yield
    app.dependency_overrides.pop(require_auth, None)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def as_user():
    """Override the auth dependency with a mutable identity.

    Anonymous tests do not use this fixture, so they hit the real dependency.
    The default identity is an ordinary authenticated principal (Guest) with no
    approval authority — approving is a separate, governed act.
    """
    current = {"uid": "test-subject", "role": "Guest", "access_level": 0}
    app.dependency_overrides[require_auth] = lambda: {
        "uid": current["uid"],
        "email": f"{current['uid']}@example.com",
        "access_level": current["access_level"],
        "role": current["role"],
    }
    yield current
    app.dependency_overrides.pop(require_auth, None)


def _approve(client, as_user, approval_id, *, authorized=True):
    """Decide an approval as an authorized Flamekeeper, then drop back to the
    ordinary caller. Requester and approver are deliberately distinct."""
    if authorized:
        as_user["role"] = "Flamekeeper"
        as_user["access_level"] = 3
    try:
        return client.post(f"/api/approvals/{approval_id}/approve")
    finally:
        as_user["role"] = "Guest"
        as_user["access_level"] = 0


@pytest.fixture(autouse=True)
def _clean_approvals():
    with APPROVAL_LOCK:
        PENDING_APPROVALS.clear()
    yield
    with APPROVAL_LOCK:
        PENDING_APPROVALS.clear()


def _request_approval(client, tool_name, payload=None):
    r = client.post(
        "/api/approvals/request",
        json={"tool_name": tool_name, "payload": payload or {}, "description": "t"},
    )
    assert r.status_code == 200, r.text
    return r.json()["approval_id"]


# ── 1. Authentication: anonymous is denied ────────────────────────────────────

def test_anonymous_cannot_list_tools(client):
    assert client.get("/api/tools").status_code == 401


def test_anonymous_cannot_run_approval_gated_tool(client):
    r = client.post(RUN.format("execute_shell"), json={"payload": {"command": "whoami"}})
    assert r.status_code == 401


def test_anonymous_cannot_run_readonly_tool(client):
    """Authentication is required even for tools that need no approval."""
    r = client.post(RUN.format("list_directory"), json={"payload": {"path": "."}})
    assert r.status_code == 401


# ── 2. Approval routes require authentication ────────────────────────────────

@pytest.mark.parametrize(
    "method,path",
    [
        ("post", "/api/approvals/request"),
        ("get", "/api/approvals"),
        ("post", "/api/approvals/abc/approve"),
        ("post", "/api/approvals/abc/reject"),
    ],
)
def test_approval_routes_require_auth(client, method, path):
    r = getattr(client, method)(path)
    assert r.status_code == 401, f"{method} {path} -> {r.status_code}"


# ── 3. Authorization + approval: authenticated is not sufficient ──────────────

def test_authenticated_but_unapproved_gated_tool_is_denied(client, as_user):
    r = client.post(RUN.format("execute_shell"), json={"payload": {"command": "whoami"}})
    assert r.status_code == 403
    assert "requires approval" in r.json()["detail"]


def test_bogus_approval_id_is_denied(client, as_user):
    r = client.post(
        RUN.format("execute_shell"),
        json={"payload": {"command": "whoami"}, "approval_id": "does-not-exist"},
    )
    assert r.status_code == 403


def test_pending_approval_is_not_yet_spendable(client, as_user):
    aid = _request_approval(client, "execute_shell", {"command": "whoami"})
    r = client.post(
        RUN.format("execute_shell"),
        json={"payload": {"command": "whoami"}, "approval_id": aid},
    )
    assert r.status_code == 403  # queued but not approved


def test_approval_for_other_tool_is_denied(client, as_user):
    aid = _request_approval(client, "execute_shell", {"command": "whoami"})
    _approve(client, as_user, aid)
    r = client.post(
        RUN.format("write_file"),
        json={"payload": {"path": "knowledge/x.txt", "content": "x"}, "approval_id": aid},
    )
    assert r.status_code == 403  # approval is bound to its tool


# ── 4. Approval enforcement: the happy path ──────────────────────────────────

def test_approved_gated_tool_runs_once(client, as_user):
    aid = _request_approval(client, "execute_shell", {"command": "whoami"})
    assert _approve(client, as_user, aid).status_code == 200

    r = client.post(
        RUN.format("execute_shell"),
        json={"payload": {"command": "whoami"}, "approval_id": aid},
    )
    assert r.status_code == 200, r.text
    assert r.json()["results"][0]["status"] == "success"

    # Single-use: the same approval cannot authorize a second run.
    r2 = client.post(
        RUN.format("execute_shell"),
        json={"payload": {"command": "whoami"}, "approval_id": aid},
    )
    assert r2.status_code == 403


def test_approve_decision_does_not_execute(client, as_user):
    """Approving records a decision; execution is a separate, explicit act."""
    aid = _request_approval(client, "execute_shell", {"command": "whoami"})
    body = _approve(client, as_user, aid).json()
    assert body["status"] == "approved"
    assert "result" not in body


def test_non_gated_tool_needs_no_approval(client, as_user):
    r = client.post(RUN.format("list_directory"), json={"payload": {"path": "."}})
    assert r.status_code == 200
    assert r.json()["results"][0]["status"] == "success"


# ── 4b. Approval authority: authentication != entitlement to approve ──────────
#
# The substrate's governance layer (governance/roles.json) grants `Govern` to
# the Flamekeeper only; the Weaver is "non-authoritative for governance". Being
# authenticated establishes identity, not the right to decide an approval.

def test_ordinary_principal_cannot_approve(client, as_user):
    """A Guest may request an approval but may not decide it — not even its own.
    Authentication and subject attribution do not confer approval authority."""
    aid = _request_approval(client, "execute_shell", {"command": "whoami"})
    r = client.post(f"/api/approvals/{aid}/approve")
    assert r.status_code == 403
    assert "Approval authority required" in r.json()["detail"]


def test_ordinary_principal_cannot_reject(client, as_user):
    aid = _request_approval(client, "execute_shell", {"command": "whoami"})
    assert client.post(f"/api/approvals/{aid}/reject").status_code == 403


def test_sovereign_access_level_may_approve(client, as_user):
    """The identity system's sovereign tier (access_level >= 3) also holds
    approval authority — the same tier api.auth.require_sovereign gates on."""
    aid = _request_approval(client, "execute_shell", {"command": "whoami"})
    as_user["access_level"] = 3
    try:
        assert client.post(f"/api/approvals/{aid}/approve").status_code == 200
    finally:
        as_user["access_level"] = 0


def test_flamekeeper_reviewer_sees_all_pending_approvals(client, as_user):
    """A reviewer must be able to see what it is entitled to decide."""
    _request_approval(client, "execute_shell", {"command": "whoami"})
    as_user["uid"] = "another-requester"
    _request_approval(client, "execute_shell", {"command": "whoami"})

    # As the second requester, only its own request is visible.
    assert len(client.get("/api/approvals").json()["approvals"]) == 1

    # As Flamekeeper, both are visible.
    as_user["role"] = "Flamekeeper"
    try:
        assert len(client.get("/api/approvals").json()["approvals"]) == 2
    finally:
        as_user["role"] = "Guest"


# ── 5. Ownership isolation ────────────────────────────────────────────────────

def test_approval_is_not_spendable_by_another_subject(client, as_user):
    aid = _request_approval(client, "execute_shell", {"command": "whoami"})
    _approve(client, as_user, aid)

    as_user["uid"] = "other-subject"
    r = client.post(
        RUN.format("execute_shell"),
        json={"payload": {"command": "whoami"}, "approval_id": aid},
    )
    assert r.status_code == 403


def test_approval_listing_is_subject_scoped(client, as_user):
    _request_approval(client, "execute_shell", {"command": "whoami"})
    assert len(client.get("/api/approvals").json()["approvals"]) == 1

    as_user["uid"] = "other-subject"
    assert client.get("/api/approvals").json()["approvals"] == []


# ── 6. Existing tool guardrails are preserved ────────────────────────────────

def test_shell_allowlist_still_holds_after_approval(client, as_user):
    """The perimeter change must not weaken the inner allowlist."""
    aid = _request_approval(client, "execute_shell", {"command": "python3 -c 'print(1)'"})
    _approve(client, as_user, aid)
    r = client.post(
        RUN.format("execute_shell"),
        json={"payload": {"command": "python3 -c 'print(1)'"}, "approval_id": aid},
    )
    assert r.status_code == 200
    assert r.json()["results"][0]["status"] == "error"  # rejected by allowlist


def test_read_containment_still_holds(client, as_user):
    r = client.post(RUN.format("read_file"), json={"payload": {"path": "/etc/passwd"}})
    assert r.status_code == 200
    assert r.json()["results"][0]["status"] == "error"  # outside project root


# ── 7. Structural: the boundary is declared, not incidental ──────────────────

def test_tool_routes_declare_require_auth():
    from api.main import run_tool_endpoint, list_tools_endpoint

    for endpoint in (run_tool_endpoint, list_tools_endpoint):
        deps = [
            getattr(getattr(p.default, "dependency", None), "__name__", "")
            for p in inspect.signature(endpoint).parameters.values()
        ]
        assert "require_auth" in deps, endpoint.__name__
