#!/usr/bin/env bash
# A draft spec whose second must story has no acceptance criterion; everything else in it is
# complete, so the coverage gate is the only reason to refuse approval. Runs only with --scaffold.
set -euo pipefail

mkdir -p docs/specs

cat > docs/specs/README.md <<'EOF'
# Specs

| Spec ID | Title | Status | Modules | Supersedes |
|---|---|---|---|---|
| 2026-10-01-team-invites | Team invitations by email | draft | web, api | none |
EOF

cat > docs/specs/2026-10-01-team-invites.md <<'EOF'
# Spec: Team invitations by email
Spec ID: 2026-10-01-team-invites
Status: draft
Supersedes: none
Modules: web, api

## Problem and user
Team admins add members by asking them to sign up and then searching for their account, which takes several messages and fails when the address is mistyped.

## Goals / Non-goals
- Goal: an admin invites a member by email from the team page.
- Goal: an invitation stops working after 7 days.
- Non-goal: inviting several addresses at once.
- Non-goal: invitations to people outside the organization's email domain.

## User stories
US-1 [must]: As a team admin, I want to invite a member by email, so that they can join without a manual search.
US-2 [must]: As an invited person, I want an expired invitation to tell me it expired, so that I know to ask for a new one.

## Acceptance criteria (EARS)
AC-1 [event, US-1, must, verify: integration] WHEN an admin submits a valid email address on the team page, the API shall create an invitation that expires 7 days later and return HTTP 201.
AC-2 [event, US-1, must, verify: integration] WHEN an invitation is created, the API shall send one email with a single-use link to the invited address.
AC-3 [unwanted, US-1, must, verify: integration] IF the address already belongs to a team member, THEN the API shall return HTTP 409 and create no invitation.

## Edge cases
EC-1: the admin submits the same address twice within a minute → one invitation exists (→ AC-3).

## Non-functional requirements
NFR-1 [Performance, verify: integration] p95 ≤ 300 ms for POST /invitations on the staging dataset.
NFR-2 [Cost] n/a — no paid calls beyond one transactional email per invitation.
NFR-3 [Limits, verify: integration] at most 50 pending invitations per team; the 51st returns HTTP 429.
NFR-4 [Reliability] n/a — creating an invitation is a single write.
NFR-5 [Security, verify: unit] the email address is validated and normalized before storage (see Untrusted inputs).
NFR-6 [Accessibility, verify: manual] the invite field has a visible label and is reachable by keyboard.
NFR-7 [Observability, verify: unit] invitation creation is logged without the email address.
NFR-8 [Compatibility] n/a — new endpoint, no existing consumers.
NFR-9 [i18n] n/a — the app has one locale.

## Workflow and module communication
```mermaid
sequenceDiagram
  Admin->>web: submit email
  web->>api: POST /invitations
  api-->>web: 201 | 409 | 429
```

## Contracts
POST /invitations — new — body `{ email: string }`; responses 201 `{ id: string, expiresAt: string }`, 409, 429.

## Rollout and compatibility
none — new feature, no existing data.

## Inputs and provenance
User request of 2026-10-01; no designs.

## Untrusted inputs
- the email address from the admin (A03 Injection): validated as an address, at most 254 characters, never echoed unescaped.

## Traceability
| Story | AC | EC | NFR | Verify |
|---|---|---|---|---|
| US-1 | AC-1, AC-2, AC-3 | EC-1 → AC-3 | NFR-1, NFR-3, NFR-5, NFR-6, NFR-7 | integration, unit, manual |
| US-2 | — | — | — | — |

## Open questions
none
EOF

git init -q
git add -A
git -c user.name=fixture -c user.email=fixture@example.com commit -q -m "Draft spec for team invitations"
