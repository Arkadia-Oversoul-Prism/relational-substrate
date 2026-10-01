# ADR-014: Phase 1 Kernel Stabilisation

**Status:** Accepted
**Date:** 2026-07-06

---

## Context

Background workers, the goal scheduler, and the job store each held their own
lifecycle and could be started more than once.

## Decision

The kernel owns worker lifecycle. Startup is idempotent: starting the kernel
twice does not double-schedule goals or spawn duplicate workers.

## Consequences

- Lifespan is the single startup seam.
- Store backends are selected, not duplicated.
