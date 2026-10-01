"""P1 regression — the kernel-loop perimeter.

Acceptance tests for ``AUTHORIZATION-BOUNDARY-01.md`` findings AB-6, AB-7, AB-8:
``/api/goals`` (and the rest of the kernel-loop router), ``/api/agent/spawn``,
and ``/api/plan/run`` mutated state with no authentication.

These surfaces are *not* per-subject resources — goals and jobs are global
scheduler state with no owner field — so the boundary is authentication (who may
touch the kernel loop at all), not ownership scoping.

``/api/plan/run`` additionally executes tool chains, making it a tool-execution
surface; a caller-supplied plan must be validated before it runs.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.auth import require_auth
from api.main import app
from kernel.tools_real import register_real_tools


@pytest.fixture(scope="module", autouse=True)
def _tools_registered():
    register_real_tools()


@pytest.fixture(scope="module", autouse=True)
def _isolate_dependency_overrides():
    app.dependency_overrides.pop(require_auth, None)
    yield
    app.dependency_overrides.pop(require_auth, None)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def as_user():
    app.dependency_overrides[require_auth] = lambda: {"uid": "loop-subject"}
    yield
    app.dependency_overrides.pop(require_auth, None)


# ── 1. Anonymous denial ───────────────────────────────────────────────────────

@pytest.mark.parametrize(
    "method,path",
    [
        ("get", "/api/goals"),
        ("post", "/api/goals"),
        ("patch", "/api/goals/goal_x"),
        ("delete", "/api/goals/goal_x"),
        ("get", "/api/jobs"),
        ("post", "/api/job/create"),
        ("get", "/api/job/job_x"),
        ("get", "/api/job/job_x/trace"),
    ],
)
def test_kernel_loop_routes_require_auth(client, method, path):
    r = getattr(client, method)(path)
    assert r.status_code == 401, f"{method} {path} -> {r.status_code}"


def test_plan_run_requires_auth(client):
    r = client.post("/api/plan/run", json={"input": "hello"})
    assert r.status_code == 401


def test_agent_spawn_requires_auth(client):
    r = client.post("/api/agent/spawn", json={"intent": "hello"})
    assert r.status_code == 401


# ── 2. Authenticated access works ────────────────────────────────────────────

def test_authenticated_can_list_goals(client, as_user):
    assert client.get("/api/goals").status_code == 200


def test_authenticated_can_list_jobs(client, as_user):
    assert client.get("/api/jobs").status_code == 200


# ── 3. plan/run: validation and execution ────────────────────────────────────

def test_plan_run_requires_input_when_no_plan(client, as_user):
    r = client.post("/api/plan/run", json={})
    assert r.status_code == 400
    assert "input is required" in r.json()["detail"]


def test_plan_run_rejects_unvalidated_caller_plan(client, as_user):
    """A caller-supplied plan naming an unregistered tool must be rejected
    before any execution."""
    r = client.post(
        "/api/plan/run",
        json={"plan": {"steps": [{"tool": "__not_a_tool__", "input": {}}]}},
    )
    assert r.status_code == 400
    assert "Plan rejected" in r.json()["detail"]


def test_plan_run_rejects_malformed_plan(client, as_user):
    r = client.post("/api/plan/run", json={"plan": {"steps": []}})
    assert r.status_code == 400
    assert "Plan rejected" in r.json()["detail"]


def test_plan_run_executes_validated_readonly_plan(client, as_user):
    r = client.post(
        "/api/plan/run",
        json={"plan": {"steps": [{"tool": "list_directory", "input": {"path": "."}}]}},
    )
    assert r.status_code == 200, r.text
    assert r.json()["success"] is True


# ── 4. agent/spawn validates its input once authenticated ────────────────────

def test_agent_spawn_requires_intent_when_authenticated(client, as_user):
    r = client.post("/api/agent/spawn", json={})
    assert r.status_code == 400
    assert "'intent' field is required" in r.json()["detail"]
