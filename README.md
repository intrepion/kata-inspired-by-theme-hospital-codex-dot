# Oddwell Hospital

A complete original hospital management game for the browser. Build a warm, peculiar clinic, hire a crew, diagnose fictional ailments, and shepherd patients toward increasingly absurd cures across three hospitals.

Private repository: https://github.com/intrepion/kata-inspired-by-theme-hospital-codex-dot

## Play locally

```sh
npm ci
npm run build
npm run preview
```

Open **http://127.0.0.1:5206/**. This serves the production build, bound to localhost. The game needs no account, backend, paid service, or external runtime asset. Other series projects and ports 5173–5205 are untouched.

For a session-only detached production server, use `npm run serve:detached`. To restart only this game's server:

```sh
cd /Users/intrepion/Documents/Codex/2026-10-11/task-22/kata-inspired-by-theme-hospital-codex-dot
npm run build && npm run serve:restart
```

Log: `/tmp/oddwell-hospital-5206.log`. Stop: `npm run serve:stop`. These commands create no boot/login service and refuse to stop a process whose identity does not match this repository's preview.

Development: `npm run dev`. Tests: `npm test`. Types: `npm run typecheck`. Security: `npm audit`.

## How to play

1. Build while paused: Consultation plus each available treatment. Drag a 2–4 tile rectangle, choose any wall door, then confirm. Coordinate/size/door fields also work with a keyboard. The base 2×2 price grows by $80 per extra tile; canceling costs nothing. Every door and occupied corridor must stay connected to reception.
2. Hire one clinician for Consultation and technicians for treatments. Assign them using the Staff panel or room inspector. Experts work faster and earn more. Idle staff still earn wages.
3. Open the clinic. Watch patients walk, queue, receive diagnosis, seek their matching treatment and head home cured. Short routes improve satisfaction. Queue badges reveal congestion.
4. Meet all accreditation goals: cures, satisfaction and cash reserve. Continue to the next hospital via the results dialog or persistent results button. Complete all three to win the campaign.
5. Recover by reassigning staff, selling rooms for 70%, dismissing idle staff, or taking one emergency $1,800 grant. A balance below −$500, twelve walkouts or 12:00 inspection failure ends the challenge. Retry is always available.

Space pauses; Escape cancels a dialog or building. Speed buttons control game time. The handbook explains the loop. Manual Save/Load uses this browser's local storage, validates state, and loads paused. Reset confirmations can be canceled safely. The floor scrolls horizontally on narrow displays.

## Design and verification

- [Specification and autonomous design interview](docs/SPEC.md)
- [Domain vocabulary](GLOSSARY.md)
- [Architecture decisions](docs/adr/)
- [Independent reviews](docs/REVIEWS.md)
- [QA report](docs/QA.md)

Built with strict TypeScript and Vite. Deterministic simulation is isolated from rendering, storage and wall-clock time. Vitest tests exercise public management commands, routing, accounting, save validation and campaign objectives.

All names, fictional ailments, visuals and maps are original. Theme Hospital inspired the broad room/staff/queue management loop; no commercial art, illness names, characters, maps, music or code are included. This is entertainment, not medical advice. No audio is included. Intentional simplifications: automatic equipment, 2–4 tile room dimensions, deterministic arrivals, certain cures, no epidemics, research, mortality, or carry-over finances.

Focused correction: [room blueprint research, checks and acceptance route](docs/BLUEPRINT_FIDELITY.md). Legacy saves keep their original footprint, door coordinates and finances.

## Play online

[Play the hosted game](https://intrepion.github.io/kata-inspired-by-theme-hospital-codex-dot/)
