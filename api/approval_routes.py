"""
Approval gate for sensitive tool calls.
Extracted from api/main.py (Phase 2 decomposition) — paths unchanged.

Pending approvals live in memory (good enough for single-instance use).
Both the /api/approvals endpoints and CEO chat (api/main.py) share this
module-level state.
"""
import logging
import threading
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from api.auth import require_auth

logger = logging.getLogger("arkadia")

PENDING_APPROVALS: dict = {}
APPROVAL_LOCK = threading.Lock()

router = APIRouter()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def queue_approval(
    tool_name: str, payload: dict, description: str, subject_ref: str | None = None
) -> str:
    """Create a pending approval entry; returns the approval_id.

    ``subject_ref`` records the identity on whose behalf the approval was
    requested. The tool-run boundary requires this to match the executing
    caller, so an approval can never be spent by a different subject.
    """
    approval_id = str(uuid.uuid4())[:12]
    with APPROVAL_LOCK:
        PENDING_APPROVALS[approval_id] = {
            "id": approval_id,
            "tool_name": tool_name,
            "payload": payload,
            "description": description,
            "status": "pending",
            "created_at": _now_iso(),
            "decided_at": None,
            "subject_ref": subject_ref,
            "decided_by": None,
            "consumed_at": None,
            "consumed_by": None,
        }
    return approval_id


@router.post("/api/approvals/request")
async def api_request_approval(request: Request, user: dict = Depends(require_auth)):
    """Queue a tool call for approval. Returns approval_id.

    Requires authentication so every approval is attributable to a subject.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    tool_name = body.get("tool_name", "")
    payload = body.get("payload", {})
    description = body.get("description", f"Run {tool_name}")
    approval_id = queue_approval(tool_name, payload, description, subject_ref=user["uid"])
    logger.info(
        "[APPROVAL] created %s for tool=%s subject=%s", approval_id, tool_name, user["uid"]
    )
    return {"approval_id": approval_id, "status": "pending"}


@router.get("/api/approvals")
async def api_list_approvals(status: str | None = None, user: dict = Depends(require_auth)):
    """List approvals visible to the caller (its own requests).

    NOTE (P1): retrieval is currently scoped to the requesting subject. A
    reviewer view that spans subjects requires an approver-authority tier that
    does not yet exist; until then, callers only see approvals they originated.
    """
    with APPROVAL_LOCK:
        items = [a for a in PENDING_APPROVALS.values() if a.get("subject_ref") == user["uid"]]
    if status:
        items = [a for a in items if a["status"] == status]
    return {"approvals": sorted(items, key=lambda a: a["created_at"], reverse=True)}


@router.post("/api/approvals/{approval_id}/approve")
async def api_approve(approval_id: str, user: dict = Depends(require_auth)):
    """Record an approval decision. Does NOT execute the tool.

    Execution is the caller's act, performed at POST /api/tools/{tool_name}/run
    with this approval_id. Separating the decision from the execution keeps the
    recorded authorization distinct from the permitted action.
    """
    with APPROVAL_LOCK:
        approval = PENDING_APPROVALS.get(approval_id)
        if not approval:
            raise HTTPException(status_code=404, detail="Approval not found")
        approval["status"] = "approved"
        approval["decided_at"] = _now_iso()
        approval["decided_by"] = user["uid"]
    logger.info(
        "[APPROVAL] %s approved by %s for tool=%s",
        approval_id, user["uid"], approval["tool_name"],
    )
    return {"approval_id": approval_id, "status": "approved"}


@router.post("/api/approvals/{approval_id}/reject")
async def api_reject(approval_id: str, user: dict = Depends(require_auth)):
    with APPROVAL_LOCK:
        approval = PENDING_APPROVALS.get(approval_id)
        if not approval:
            raise HTTPException(status_code=404, detail="Approval not found")
        approval["status"] = "rejected"
        approval["decided_at"] = _now_iso()
        approval["decided_by"] = user["uid"]
    return {"approval_id": approval_id, "status": "rejected"}
