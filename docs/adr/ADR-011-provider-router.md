# ADR-011: Provider Router as the Single Model Boundary

**Status:** Accepted
**Date:** 2026-07-06

---

## Context

Model calls were made directly from call sites, each with its own credential
lookup, retry behaviour, and error shape.

## Decision

All model traffic goes through `providers/router.py`. Callers name a provider;
the router owns credential resolution, key rotation, health, and failure
reporting.

## Consequences

- A new provider is added in one place.
- Credential rotation is uniform across surfaces.
- Callers cannot silently bypass health checks.
