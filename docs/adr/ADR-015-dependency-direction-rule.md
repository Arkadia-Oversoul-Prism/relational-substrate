# ADR-015: Dependency Direction Rule

**Status:** Accepted
**Date:** 2026-07-06

---

## Context

Layers had begun importing upward, so a kernel module could depend on the API
surface it was composed with.

## Decision

Dependencies point downward only. Where an upper layer must be composed, the
lower layer exposes a configuration seam and the composition root injects the
dependency before the router is mounted.

## Consequences

- Import direction is a fitness-test invariant, not a convention.
- Inversions are either fixed or registered as explicit, justified debt.
