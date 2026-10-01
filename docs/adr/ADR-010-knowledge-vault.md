# ADR-010: Knowledge Vault as Canonical Truth Store

**Status:** Accepted
**Date:** 2026-07-06

---

## Context

Knowledge was stored as transient conversation history, a flat JSON store for
transactions/loops/events, and personal records as JSON blobs. None of these was
content-addressed, so the same fact could be written twice and never reconciled.

## Decision

The vault is the canonical truth store. Every note is written as markdown with
frontmatter, addressed by a content checksum, and projected from a single
`pipeline.ingest()` path.

## Consequences

- Deduplication is checksum-scoped and therefore per source.
- Re-reading a vault projection must reproduce the original checksum.
- Callers normalise bodies so trailing whitespace cannot fork a checksum.
