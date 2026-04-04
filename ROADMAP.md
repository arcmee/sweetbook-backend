# SweetBook Backend Roadmap

## Goal

Build the backend MVP for SweetBook using a clean-architecture structure, with test-first delivery and explicit validation around security and dependency boundaries.

## Backend Scope

This repository owns the backend responsibilities only:

- group and event management
- photo upload metadata and storage coordination
- photo likes and aggregation
- album selection rules and candidate generation
- SweetBook payload generation
- SweetBook API integration
- order state tracking and webhook handling

## Non-Goals

- frontend UI implementation
- cross-repo documentation work outside backend planning artifacts
- advanced editor workflows or non-MVP album features

## Architecture Direction

- presentation layer exposes API endpoints and request validation
- domain layer holds business rules and framework-independent models
- data layer implements repositories, external clients, and persistence
- application services orchestrate use cases without leaking infrastructure concerns
- tests cover domain rules first, then integration points, then security and architecture checks

## Delivery Phases

### Phase 1: Repository Bootstrap

- confirm backend stack and project conventions
- establish clean architecture folder structure
- create baseline test harness and configuration entrypoints
- define module boundaries and dependency direction

### Phase 2: Core Domain

- model users, groups, group members, events, photos, and photo likes
- define album project, album page candidate, selection rule, book job, and order entities
- codify invariant rules and domain services

### Phase 3: Selection Engine

- implement album selection rules
- derive selected-photo output and page-candidate structure
- add RED-to-GREEN test coverage for ranking, tie-breaking, and validation rules

### Phase 4: SweetBook Integration

- generate SweetBook payloads from internal album models
- build API client boundaries for quotes, finalization, and order submission
- model response mapping and failure handling

### Phase 5: Order Lifecycle

- store order state changes
- process webhook callbacks and reconcile external updates
- ensure idempotency and safe retries

### Phase 6: Validation and Hardening

- run security checks for secrets, injection, auth misuse, and sensitive logging
- verify clean-architecture dependencies and layer boundaries
- review scope, regressions, and release readiness

## Key Risks

- backend stack is not yet represented in the repo, so bootstrap work must confirm the runtime and test tooling before implementation accelerates
- SweetBook integration may require contract validation against the external API shape
- selection rules may change after product decisions are finalized
- webhook and order state logic can become inconsistent without idempotency controls

## Completion Criteria

- backend MVP use cases are implemented with tests
- external integration is isolated behind adapters
- security and architecture checks pass
- task execution artifacts are updated for each completed task

