# Variable room blueprints and chosen doors

2026-10-15. Baseline `aca8681bef7f035bb1f111b7eccc74190b88e9b0`; repository `2026-10-11/task-22/kata-inspired-by-theme-hospital-codex-dot`. Preview PID 4270, http://localhost:5206, preserved. Local source changes only; no commit or push.

## Research and focused contract

Read the original [Bullfrog Theme Hospital manual](https://retrogamer.biz/wp-content/uploads/2015/10/Theme-Hospital-manual.pdf), room-building pages 17–19 and tutorial 44–45, before planning. Its rectangle blueprint, invalid/valid feedback, confirmation and separate wall-door placement make floor planning an active part of patient flow. Optional windows and furniture come afterward. Oddwell implements the rectangle and door decisions with automatic equipment; its original art and conditions remain.

The user delegates recommended Grill with Docs/Implement choices. A 2×2–4×4 rectangle is dragged in either direction, then a corridor tile immediately beside any wall selects that door. The blueprint remains unpaid until Confirm room. Redraw, Cancel and Escape are available. Labeled coordinate, width, height, wall and offset fields provide a keyboard alternative. Base prices remain identical for 2×2 rooms; each extra tile costs $80, shown before purchase. Selling refunds 70% of the stored purchase price.

Confirmation atomically validates size, footprint, entrance/garden/room overlap, chosen door, all existing door paths, occupied corridor paths and cash. The same live-state validation runs again at confirmation, so time advancing during a draft cannot trap a patient. Patients queue and enter at the chosen door; room size and wall choice therefore change route length.

## Save compatibility

The existing `oddwell-hospital-v1` storage key remains. Version 1 rooms migrate to width 2, height 2, south offset 0, preserving their old door `(x,y+2)`, original purchase price, cash ledger, staff, patients and objectives. Version 2 persists validated dimensions, door and exact price. Unknown fields are discarded. Invalid saves leave the running clinic intact. A genuine populated v1 fixture is generated from baseline HEAD, rather than fabricated from the new implementation.

## Checks and handoff

Strict typecheck and **32/32 tests** pass: all 23 retained cases, all four wall orientations and larger rectangles, bounds/offset/overlap/access rejection without charge, draft validation purity, price/refund, populated v1 migration, variable-door staffed diagnosis/treatment to accreditation with repeated reload, occupied sale and the genuine baseline fixture to a win. Source simulation is not browser E2E. The final original checkout strict typecheck, all 32 tests and production build passed (6 modules, 43.21 kB JS; Vite 62 ms), including the reverse-drag anchor correction. Independent review passed with no remaining blockers. Normal-input browser acceptance passed after the renewed unlock and exclusive handoff, as recorded below. Native acceptance is recorded below; no preview restart was needed.

Normal-input acceptance route, using **one-based** floor columns/rows:

1. Close the initial briefing; remain paused. Choose Consultation. Drag column 2,row 2 through column 4,row 3 (3×2), click column 5,row 3 to choose its east door. Observe $1,010 and no cash change. Cancel; balance stays $5,500. Repeat and Confirm; balance becomes $4,490.
2. Choose Resonance booth. Drag column 7,row 3 through column 9,row 5 (3×3), click column 6,row 4 for its west door; Confirm at $1,500. Alternatively use Column 7 / Row 3 / Width 3 / Height 3 / west / Door tile 2 fields. Observe visible room dimensions and wall doors.
3. Staff tab: hire a clinician and technician, assign them to Consultation and Resonance respectively. Open clinic at 4×. Observe patients walk to the east consultation door, receive diagnosis, cross the corridor to the west treatment door, cure and exit. The room queue/en-route count and service inspector are available.
4. Save, load and confirm the dialog; the same geometry, doors, balance and people return paused. Open again and reach accreditation (the domain route wins with 8 cures and $8,634). Before accreditation, optionally sell an occupied room through its confirmation: patient exits via its chosen door and remains reachable; staff becomes unassigned. Restart provides a fresh attempt.
5. Invalid check: draft a north-door room against the top boundary or cover an existing door. Confirm must report the access error and spend nothing. Escape must clear the blueprint. Keyboard Tab/number/select/Confirm must also construct a room without dragging.

## Limits

Orthographic grid remains; no original isometric camera, irregular footprints, wall relocation after construction, manual furniture/windows, new illness systems or broader campaign claims. Larger rooms affect cost and routing rather than treatment speed. Automated checks establish domain reachability; visible drag behavior and the focused browser treatment loop passed as recorded below.

## Native browser acceptance passed — 2026-10-15

The earlier 17:08 UTC locked-Mac inventory is historical. After the user confirmed unlock and the parent explicitly regranted exclusive access at 17:30 UTC, native inventory succeeded. The worker used only its new tab `222225564` at `http://fidelity-gta-worker-20261015.localhost:5206/`. Existing user/root/Witness tabs, original save origins and preview listeners were preserved. No game-state/model/DOM event injection or clock manipulation was used.

A native 3×2 drag with east door produced an unpaid $1,010 blueprint; Cancel retained $5,500. Repeated drag/door confirmation built it for $1,010. Keyboard fields produced a 3×3 west-door treatment room for $1,500. Hired/assigned staff diagnosed and treated patients, yielding one cure at 0:36 ($3,036, 90% satisfaction). Save/browser Reload/Load restored geometry, doors, staff, patients, finances and paused state. Resuming built-in 4× reached first-scenario accreditation: eight cures, 90% satisfaction and $8,634.

Fixed orthographic floor, native dragging/corridor door click and the numeric keyboard alternative were exercised. Later scenarios, occupied sale, invalid corridor traps and maximum reverse-drag edges remain source-test evidence. No source fix, test/build rerun or preview restart was required by native QA.

See [detailed local acceptance](LOCAL_ACCEPTANCE_2026-10-15.md) and the [screenshots and acceptance record](LOCAL_ACCEPTANCE_2026-10-15.md). Simulated guides and historical fixtures remain source-only evidence; the native results above are a separate observed pass. After all four projects, the worker closed only its own QA tab and explicitly released native ownership.
