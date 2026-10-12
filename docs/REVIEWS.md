# Independent reviews

Two separate agents reviewed the root implementation commit 7cf8093 against the written specification and coding standards, then reviewed fixes. Because this is a new repository, the baseline was the empty tree rather than a previous project.

## Standards
The independent code reviewer found two actionable issues: dismissible campaign progression and cash-changing commands that could complete objectives without changing outcome status. Fixed persistent results actions, checked outcomes after grants/sales, and added regression tests. Reviewer reproduced the paused grant completion through public commands and verified its save reloads. No remaining hard standards violations or actionable smell findings.

## Specification
The independent specification reviewer found the campaign progression issue, a hidden narrow-screen Restart control, insufficient patient-progress/accounting validation in saves, and a mismatch between documented and actual selling behavior. Fixed the first three and clarified the specification that selling moves service occupants to the former door before rerouting. Follow-up review confirmed all four findings resolved, 23/23 tests passed, and no remaining specification blocker.

## Limits
These are independent source/domain reviews, separate from supported Chrome visible-control gameplay. The final QA report records browser checks and their limits.
