# SweetBook Backend Task List

This list is ordered. Execute one task at a time using the task loop:
Planner -> Test -> Implementation -> Security -> Architecture -> Review -> Git -> PR.

## Tasks

| ID | Task | Purpose | Depends On | Output |
| --- | --- | --- | --- | --- |
| T1 | Backend bootstrap and stack confirmation | Establish the backend runtime, project structure, and test foundation | none | clean architecture skeleton and confirmed toolchain |
| T2 | Core domain model and ports | Define backend entities, invariants, repository contracts, and application boundaries | T1 | domain model, use-case contracts, and repository ports |
| T3 | Group, event, photo, and like workflows | Implement the core MVP CRUD and aggregation flows with tests | T2 | API/use-case flows for groups, events, photos, and likes |
| T4 | Album selection engine | Implement photo ranking, selection rules, tie-breaking, and page-candidate generation | T3 | selection service plus RED/GREEN test coverage |
| T5 | SweetBook payload and API adapter | Convert internal album models into SweetBook input and integrate external calls safely | T4 | payload mapper and client adapter |
| T6 | Order lifecycle and webhook handling | Track order state, reconcile remote updates, and handle callbacks idempotently | T5 | order persistence and webhook processing |
| T7 | Validation and hardening pass | Complete security, architecture, and regression validation before delivery | T6 | hardened backend with final verification evidence |

## Notes

- T1 must settle the backend stack before deeper implementation work begins.
- T2 through T6 should preserve clean architecture boundaries and keep infrastructure behind adapters.
- T7 is mandatory before any PR-ready delivery.

