# 0003 — Explicit room geometry and door corridor

Accepted 2026-10-15. Store width, height, door wall/offset and purchasePrice on each room. `door` returns the outside corridor tile, and one footprint predicate drives collision, planning and save validation. Drafts are UI state; they cannot change the ledger. Confirmation calls the same public atomic build command used by tests. Existing 2×2 call signatures retain a south-left default.

Use version 2 within the existing save key, upgrading v1 geometry before validation. Exact prior door coordinates and base prices preserve active service and accounting. Derive the refund from stored validated purchase price. Automatic equipment bounds the change; minimum/maximum size keeps the authored 12×8 scenarios viable.
