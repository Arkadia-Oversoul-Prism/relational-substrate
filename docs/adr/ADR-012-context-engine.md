# ADR-012: Context Engine Owns Retrieval Assembly

**Status:** Accepted
**Date:** 2026-07-06

---

## Context

Retrieval was assembled ad hoc at each call site, mixing graph traversal, vector
search, and recency in different orders, producing different answers to the same
question.

## Decision

`knowledge/context_engine.py` is the only assembly point for retrieved context.
Callers supply a query and a budget; the engine returns a bounded context.

## Consequences

- Retrieval order is deterministic and testable.
- Budgeting is enforced centrally.
- Call sites cannot re-rank privately.
