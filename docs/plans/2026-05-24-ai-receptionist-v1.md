# AI Receptionist V1 Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add a production-ready foundation for a Golden State Epoxy AI receptionist that captures inbound phone leads, codifies business rules, and stores structured voice-agent intake in the CRM.

**Architecture:** Keep v1 narrow and safe. First codify the business rules and call flow as typed configuration in the app, then expose read-only blueprint endpoints and a dedicated voice intake API that writes qualified lead data into the existing CRM tables. Avoid raw realtime telephony implementation in this phase; prepare the application layer so Twilio + Retell can connect cleanly next.

**Tech Stack:** Next.js 14 app router, TypeScript, Supabase REST/JS client, existing CRM schema, Twilio-compatible payload handling, Retell-oriented orchestration plan.

---

## Scope

This plan covers:
- Voice-agent business rules and call flow config in code
- CRM-ready voice intake endpoint
- Read-only blueprint endpoint for orchestration layer consumption
- Project documentation for implementation and rollout

This plan explicitly does **not** yet cover:
- Live Twilio voice webhooks
- Retell agent provisioning
- Real transfer bridging
- Automated booking in calendar
- Full analytics dashboard for call performance

---

## Existing Project Context

- Repo: `/home/josep/b2b-leadgen`
- Existing quote flow: `src/app/api/quote/route.ts`
- Existing appointment flow: `src/app/api/appointments/route.ts`
- Existing CRM schema: `src/lib/db/schema.ts`
- Existing project currently has no test harness configured in `package.json`
- Existing API routes use lazy `getSupabase()` helpers to avoid build-time crashes

---

## Task 1: Add typed voice-agent domain model

**Objective:** Create the shared TypeScript types used by the voice-agent configuration and future telephony integration.

**Files:**
- Create: `src/lib/voice-agent/types.ts`

**Steps:**
1. Create `src/lib/voice-agent/types.ts`.
2. Add types for provider stack, intake fields, transfer triggers, restricted claims, business rules, and call-flow steps.
3. Keep the types limited to v1 needs only.
4. Verify imports resolve cleanly in the app.

**Verification:**
- Run: `npm run build`
- Expected: TypeScript compiles with no path or type errors introduced by the new file.

---

## Task 2: Add voice-agent blueprint configuration

**Objective:** Encode the approved Golden State Epoxy receptionist rules and call flow into a single source of truth.

**Files:**
- Create: `src/lib/voice-agent/config.ts`
- Depends on: `src/lib/voice-agent/types.ts`

**Steps:**
1. Create `src/lib/voice-agent/config.ts`.
2. Define provider strategy for Twilio + Retell + GPT-4.1 mini.
3. Encode service areas, accepted/disallowed project types, required intake fields, transfer triggers, restricted claims, and success criteria.
4. Add the v1 call flow stages: greeting, classification, intake, qualification, resolution.
5. Export `getVoiceAgentBlueprint()` for route and integration use.

**Verification:**
- Run: `npm run build`
- Expected: Blueprint compiles and exports successfully.

---

## Task 3: Expose read-only blueprint endpoint

**Objective:** Provide a stable API route that returns the receptionist blueprint for future orchestration and debugging.

**Files:**
- Create: `src/app/api/voice-agent/blueprint/route.ts`
- Uses: `src/lib/voice-agent/config.ts`

**Steps:**
1. Create the route file.
2. Return `NextResponse.json({ blueprint })` from `getVoiceAgentBlueprint()`.
3. Keep the route read-only and force-dynamic.

**Verification:**
- Run: `npm run build`
- After dev/deploy, GET `/api/voice-agent/blueprint`
- Expected: JSON payload with provider stack, business rules, and call flow.

---

## Task 4: Add dedicated voice intake API route

**Objective:** Capture structured inbound voice-agent leads into the existing CRM tables without touching the website quote flow.

**Files:**
- Create: `src/app/api/voice-agent/intake/route.ts`
- Reference patterns from: `src/app/api/quote/route.ts`, `src/app/api/appointments/route.ts`

**Steps:**
1. Create a lazy `getSupabase()` helper inside the route.
2. Validate the minimum required fields: full name, callback phone, service city, project type.
3. Normalize phone numbers and infer priority (`hot` vs `standard`).
4. Insert records into `leads`, `contacts`, `deals`, `lead_scores`, and `activities`.
5. Mark source as `voice_agent`.
6. Store rich metadata in the activity record, including raw payload, timeline, coating interest, and service-area match.
7. Return JSON with `leadId`, `dealId`, `priority`, and `nextAction`.

**Verification:**
- Run: `npm run build`
- Manual POST to `/api/voice-agent/intake` with sample payload
- Expected: 201 response and CRM records created.

---

## Task 5: Add implementation documentation to the repo

**Objective:** Document what was added, what is still pending, and how future phases connect.

**Files:**
- Create: `docs/plans/2026-05-24-ai-receptionist-v1.md`
- Optionally update later: `README.md`

**Steps:**
1. Save this implementation plan to the repo.
2. Document scope boundaries clearly.
3. Include next planned phases: Twilio webhook, Retell integration, booking, transfer, analytics.

**Verification:**
- Confirm the plan file is present in the repo and readable.

---

## Task 6: Verify end-to-end foundation

**Objective:** Make sure the new foundation builds cleanly and fits the existing CRM architecture.

**Files:**
- Review all new files

**Steps:**
1. Run `npm run build`.
2. Review for any import-time env issues.
3. Check route naming and path consistency.
4. Confirm no existing quote or appointment behavior was changed.

**Verification:**
- Build passes.
- Existing routes remain untouched.
- New routes are isolated and ready for phase 2 execution.

---

## Phase 2 Progress Update

The following live-telephony scaffolding has now been added after the initial foundation work:

1. Twilio inbound voice webhook route: `src/app/api/voice-agent/twilio/incoming/route.ts`
2. Twilio dial action fallback route: `src/app/api/voice-agent/twilio/dial-action/route.ts`
3. Retell inbound webhook override route: `src/app/api/voice-agent/retell/inbound/route.ts`
4. Retell signed event receiver route: `src/app/api/voice-agent/retell/events/route.ts`
5. Shared decision engine: `src/lib/voice-agent/decision.ts`
6. Shared Retell/TwiML helpers: `src/lib/voice-agent/retell.ts`, `src/lib/voice-agent/twilio.ts`

## Future Tasks (Not in this commit)

1. Configure real Twilio number webhook to point at `/api/voice-agent/twilio/incoming`
2. Configure Retell inbound webhook URL and account/agent event webhook URL
3. Persist Twilio ↔ Retell ↔ CRM ID mapping more explicitly for perfect event reconciliation
4. Add live-transfer handler to bridge hot leads to Joseph directly
5. Add booking-to-appointments integration
6. Add call transcript storage table and reporting
7. Add UI surfaces for voice-agent leads and call summaries
8. Use the provider hookup runbook at `docs/plans/2026-05-24-provider-hookup.md` to finish go-live setup

---

## Notes / Constraints

- Do not mention warranty in any voice prompt logic.
- Do not provide hard pricing by phone in v1.
- Keep source-specific routing isolated from `/api/quote` to avoid regressions.
- Prefer lazy Supabase client creation in any new route.
- Because the repo lacks a configured test runner, use build verification and targeted manual endpoint validation for this phase.
