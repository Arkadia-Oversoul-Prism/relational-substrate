"""Plan execution surface: POST /api/plan/run.

Extracted from api/main.py to respect the 2600-line architecture budget
(tests/architecture/test_layer_boundaries.py::test_api_main_line_count_within_budget).
Route path and response shape are unchanged.

This is a tool-execution surface — `execute_plan` runs each step's tool — so it
requires authentication and validates any caller-supplied plan before running it.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request

from api.auth import require_auth

logger = logging.getLogger("arkadia")

router = APIRouter(tags=["Plan"])


@router.post("/api/plan/run")
async def run_plan(request: Request, user: dict = Depends(require_auth)):
    """Plan (or accept) a tool chain and execute it."""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    # `execute_plan` lives in kernel.planner, not kernel.execution; importing it
    # from the wrong module was a latent 500.
    from kernel.planner import execute_plan, plan_or_fallback, validate_plan

    try:
        prebuilt = body.get("plan")
        if isinstance(prebuilt, dict):
            # A caller-supplied plan must be validated before it runs — the same
            # gate the kernel bridge applies. Without this, arbitrary tool chains
            # (e.g. execute_shell) could be executed unvalidated.
            ok, reason = validate_plan(prebuilt)
            if not ok:
                raise HTTPException(status_code=400, detail=f"Plan rejected: {reason}")
            plan = prebuilt
        else:
            user_input = (body.get("input") or "").strip()
            if not user_input:
                raise HTTPException(status_code=400, detail="input is required")
            plan = plan_or_fallback(user_input)

        result = execute_plan(plan)
        return {
            "success":  bool(result.get("success")),
            "summary":  result.get("summary", ""),
            "steps":    result.get("steps", []),
            "plan":     plan,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("[PLAN/RUN] Error")
        raise HTTPException(status_code=500, detail=str(e))
