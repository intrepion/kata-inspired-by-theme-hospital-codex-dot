# Verification report

## Supported Chrome: actual visible-control gameplay
Used the connected local Chrome extension through its supported browser API. Built rooms by clicking floor tiles, hired staff with displayed buttons, assigned via native selects, and ran at the visible 4× speed. No game-state injection or test-only win control was used.

| Scenario | Cures | Satisfaction | Final cash | Result |
|---|---:|---:|---:|---|
| A little peculiar | 8 | 91% | $9,322 | Accreditation |
| Creases & crises | 14 | 89% | $15,450 | Accreditation |
| The grand oddening | 20 | 88% | $22,884 | Campaign complete |

Ordinary layout: Consultation at tile (2,2); Resonance at (4,4); Unfolding at (8,2); Groove at (9,4), where applicable. One clinician and one technician per treatment. No grants or experts were needed to win. Scenario 1 was saved at 01:27 with six cures/$7,632, reloaded after an actual page reload, and completed from the restored paused state.

### Interaction checks
- Paused construction and hiring preserved 00:00; repeated room-tile clicks did not duplicate rooms or costs.
- Building across reception rejected with no spending; covering an existing door rejected visibly.
- Technician assignment options excluded Consultation; attempts to take an occupied room were rejected without changing existing assignments. Reassignment freed the former room and showed the missing-staff bottleneck.
- Save/Load restored cash, cures, rooms and staff. The load confirmation was reviewed; actual reload started paused.
- Restart confirmation canceled on desktop and 390px layout without state loss. Sell confirmation interrupted with Escape preserved both room and cash. Staff dismissal canceled safely.
- Double-clicked emergency grant awarded exactly one $1,800 grant and disabled the button.
- Handbook opened while running at 00:01; it remained 00:01 during intervening work, and resumed only after closure.
- Dismissed accreditation dialog; persistent Continue action reopened it and advanced to scenario 2. Dismissed final campaign dialog; persistent View award reopened the ending.
- Empty clinic reached twelve walkouts and failed. Dismissed the dialog, reopened persistent results, retried and received a fresh budget/floor/grant.
- Thirteen unassigned experts caused wage bankruptcy below −$500. Saw the overdraft failure and retried through visible controls.
- At 390×844, controls stacked, Restart remained visible, the body did not overflow horizontally, and the floor had its own horizontal scroll (341px viewport / 594px content). Clicked and inspected the far-right Groove lab. Reset the temporary viewport afterward.
- Inspected screenshots of the dashboard, room furniture, patients in corridors and service, queue badges, narrow layout, both failures and campaign award.

## Automated domain checks
23 tests exercise public commands and returned state: room overlap/doors/occupied corridors; route access; staff eligibility, occupied-room rejection, reassignment/dismissal; differentiated treatment routes; service suspension; exact diagnosis/cure costs and revenues; expert speed/wages; grants and refunds; inclusive objective boundaries; strict overdraft, walkouts and inspection deadline; stopped outcomes; all three scenario wins; conserved patient totals and single-room occupancy under congestion; tick batching equivalence; save/reload determinism; malformed, oversized and inconsistent save schemas.

The initial floor-placement seam was written first and failed before the simulation module existed, then passed with implementation. Later red checks exposed incorrect worked-example assumptions (second diagnosis revenue and newly arrived patients not yet diagnosed); corrected those examples. Independent reviews prompted targeted regressions for paused grant/sale accreditation and impossible saved progress/totals. These automated simulations are distinct from the actual Chrome campaign above.

## Build, security and delivery
Strict TypeScript check and production build pass. Dependency audit: zero vulnerabilities after upgrading the initially affected test tooling. Independent specification and standards reviews resolved their findings; see REVIEWS.md. GitHub Actions runs tests, types, build and an audit for pushes. Final exact-commit run and remote SHA are reported in the delivery response.

Production is served only on 127.0.0.1:5206 by a detached session process. The repository's serve launcher creates no boot/login autostart. It refuses occupied ports and checks process identity before stopping its own server. Page and generated bundle HTTP checks and final Chrome load are recorded in delivery.

## Evidence and limits
Screenshots: [campaign award](qa/campaign-complete.jpg), [walkout failure](qa/walkout-failure.jpg), [bankruptcy](qa/bankruptcy-failure.jpg), [desktop hospital](qa/desktop-hospital.jpg), [narrow hospital](qa/narrow-hospital.jpg).

No native physical mouse/keyboard, touch hardware, screen-reader, other-browser, or audio-device verification is claimed. Browser interaction used semantic locators/extension actions and screenshots; the Mac was not unlocked or its protections bypassed. The game intentionally contains no audio. Narrow layout was tested using a supported viewport override, not a physical phone. No public publication, paid services, sidebar registration, or changes to earlier projects/servers.

Intentional scope: three compact deterministic scenarios; fixed 2×2 rooms and downward doors; fictional guaranteed cures, no deaths, epidemics, research or cross-scenario balance. Multiple viable layouts and staffing choices exist, but this is a small complete game rather than the breadth of a commercial hospital simulation.
