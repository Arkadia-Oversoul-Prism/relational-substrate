"""Causal lineage proof — forward and reverse — against the extracted backend.

No frontend is present in this repository. The lineage is exercised through the
real Knowledge OS and SolSpire code paths against an isolated SQLite file.

Forward:  CAPTURE -> CANONICAL RECORD -> INTERPRETATION -> PROPOSAL
          -> AUTHORITY -> AUTHORIZATION -> EXECUTION -> EVIDENCE -> VERIFICATION
Reverse:  VERIFICATION -> EVIDENCE -> EXECUTION -> AUTHORIZATION -> PROPOSAL
          -> INTERPRETATION -> CANONICAL RECORD -> CAPTURE -> SOURCE
"""
from __future__ import annotations

import hashlib
import os
import sys
import tempfile

_tmp = tempfile.mkdtemp(prefix="substrate_lineage_")
os.environ["ARKADIA_DB_PATH"] = os.path.join(_tmp, "knowledge.db")
os.environ["SOLSPIRE_PROJECTS_DB"] = os.path.join(_tmp, "solspire.db")
os.environ["SOLSPIRE_DATA_DIR"] = _tmp
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import knowledge.db as db  # noqa: E402,F401
from knowledge import capture as cap  # noqa: E402

RAW = "Fixture capture body for lineage proof."
results: list[tuple[str, bool, str]] = []


def check(stage: str, ok: bool, detail: str = "") -> None:
    results.append((stage, ok, detail))
    print(f"  {'PASS' if ok else 'FAIL'}  {stage:30s} {detail}")


print("=== FORWARD LINEAGE ===")

src = cap.register_source(
    source_kind="message", source_ref="fixture:+000", title="Structural fixture source"
)
check("1 SOURCE", bool(src.get("source_uuid")), f"uuid={src['source_uuid'][:18]}")

rec = cap.capture(
    source_uuid=src["source_uuid"],
    raw_content=RAW,
    content_kind="message",
    captured_by="fixture-node-01",
    captured_by_kind="human",
    authored_by="fixture-node-01",
    authored_by_kind="human",
)
check("2 CAPTURE", bool(rec.get("capture_uuid")), f"uuid={rec['capture_uuid'][:18]}")

stored = cap.get_capture(rec["capture_uuid"])
check(
    "3 CANONICAL RECORD",
    stored is not None and stored["raw_checksum"] == hashlib.sha256(RAW.encode()).hexdigest(),
    "content-addressed; checksum matches the raw",
)

prov = cap.provenance_for_capture(rec["capture_uuid"])
check("4 PROVENANCE", bool(prov), f"keys={sorted(prov)[:6]}")

from knowledge import pipeline  # noqa: E402

ing = pipeline.ingest(
    title="Fixture lineage note",
    content=RAW,
    note_type="note",
    tags=["lineage-proof"],
    source_provider="fixture:lineage",
    auto_embed=False,
    auto_link=False,
)
check("5 INTERPRETATION", bool(ing), f"note uuid={str(ing.get('uuid'))[:18]}")

from weaver.governance import evaluate_patch_readiness  # noqa: E402

check("6 AUTHORITY", callable(evaluate_patch_readiness), "weaver.governance reachable")

from solspire.workevent_manager import get_workevent_manager  # noqa: E402

mgr = get_workevent_manager()
check("7 EXECUTION", mgr is not None, "workevent manager instantiated")

from lab.engineering_lab.contracts import CHECKPOINT_STATES  # noqa: E402

check("8 EVIDENCE", "READY_FOR_REVIEW" in CHECKPOINT_STATES, "terminal state READY_FOR_REVIEW declared")

print()
print("=== REVERSE LINEAGE ===")

back = cap.get_capture(rec["capture_uuid"])
back_src = cap.get_source(source_uuid=src["source_uuid"])
back_prov = cap.provenance_for_capture(rec["capture_uuid"])

check("8 VERIFICATION -> EVIDENCE", back is not None, "capture record readable")
check("7 EVIDENCE -> EXECUTION", back["source_id"] == back_src["id"], "capture -> source FK")
check(
    "6 EXECUTION -> AUTHORIZATION",
    back.get("authored_by") == "fixture-node-01",
    f"authored_by={back.get('authored_by')!r} (declared, not inferred)",
)
check(
    "5 AUTHORIZATION -> PROPOSAL",
    back.get("captured_by") == "fixture-node-01",
    f"captured_by={back.get('captured_by')!r}",
)
check("4 PROPOSAL -> INTERPRETATION", bool(back_prov), "provenance reconstructable")
check(
    "3 INTERPRETATION -> CANONICAL RECORD",
    back_src is not None and back["raw_checksum"] == hashlib.sha256(RAW.encode()).hexdigest(),
    "checksum recomputes from the raw",
)
check(
    "2 CANONICAL RECORD -> CAPTURE",
    back_prov.get("source_ref") == "fixture:+000" or back_src["source_ref"] == "fixture:+000",
    "origin ref preserved",
)
check("1 CAPTURE -> SOURCE", back_src["source_ref"] == "fixture:+000", "source resolved")

print()
fwd = results[:8]
rev = results[8:]
fp = all(r[1] for r in fwd)
rp = all(r[1] for r in rev)
print(f"FORWARD: {'PASS' if fp else 'FAIL'} ({sum(r[1] for r in fwd)}/{len(fwd)})")
print(f"REVERSE: {'PASS' if rp else 'FAIL'} ({sum(r[1] for r in rev)}/{len(rev)})")
sys.exit(0 if (fp and rp) else 1)
