# ADR-013: Phase 0 Security Hardening

**Status:** Accepted
**Date:** 2026-07-06

---

## Context

Several routes were unauthenticated by default, secrets were read from
environment variables without validation, and error responses echoed internal
state.

## Decision

- Authentication is explicit per route; unauthenticated surfaces are named.
- Secrets are read once and never logged.
- Error responses carry a status and a reason, not a stack.

## Consequences

- Adding a route requires a deliberate auth decision.
- Log inspection cannot leak credentials.
