# AI Receptionist Provider Hookup Runbook

## Goal
Connect the newly built CRM voice-agent scaffolding to Twilio and Retell so real inbound calls can reach the AI receptionist and generate CRM activity.

## Current Code Endpoints

- Twilio incoming voice webhook:
  - `https://b2b-leadgen-kappa.vercel.app/api/voice-agent/twilio/incoming`
- Twilio dial action fallback:
  - `https://b2b-leadgen-kappa.vercel.app/api/voice-agent/twilio/dial-action`
- Retell inbound webhook:
  - `https://b2b-leadgen-kappa.vercel.app/api/voice-agent/retell/inbound`
- Retell signed event webhook:
  - `https://b2b-leadgen-kappa.vercel.app/api/voice-agent/retell/events`
- Provider readiness/status endpoint:
  - `https://b2b-leadgen-kappa.vercel.app/api/voice-agent/status`
- Voice blueprint endpoint:
  - `https://b2b-leadgen-kappa.vercel.app/api/voice-agent/blueprint`

---

## Required Environment Variables

Add these to Vercel production:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `RETELL_API_KEY`
- `RETELL_AGENT_ID` (or `RETELL_DEFAULT_AGENT_ID`)
- `APP_BASE_URL=https://b2b-leadgen-kappa.vercel.app`

Optional but useful:
- `TWILIO_MESSAGING_SERVICE_SID`
- `NOTIFY_PHONE`

---

## Provider Setup Steps

### 1. Twilio phone number setup
In Twilio for the business phone number:
- Voice Configuration
- A call comes in
- Webhook
- Method: `HTTP POST`
- URL:
  - `https://b2b-leadgen-kappa.vercel.app/api/voice-agent/twilio/incoming`

No TwiML Bin is needed if the webhook is set directly.

### 2. Retell setup
In Retell:
- Set or confirm your agent ID
- Configure inbound webhook URL:
  - `https://b2b-leadgen-kappa.vercel.app/api/voice-agent/retell/inbound`
- Configure event webhook URL (account-level or agent-level):
  - `https://b2b-leadgen-kappa.vercel.app/api/voice-agent/retell/events`

### 3. Verify provider readiness
Check:
- `GET /api/voice-agent/status`

Expected:
- Twilio configured = true
- Retell configured = true
- endpoint URLs visible in response

---

## Test Plan

### Test A — Configuration check
1. Open `/api/voice-agent/status`
2. Confirm no critical vars are missing
3. Confirm all callback URLs are what you expect

### Test B — Manual intake API test
POST to `/api/voice-agent/intake`:

```json
{
  "fullName": "Test Caller",
  "callbackPhone": "+19255550123",
  "serviceCity": "Livermore",
  "projectType": "Residential garage floor",
  "propertyType": "residential",
  "squareFootage": "450",
  "timeline": "this week",
  "notes": "Testing voice intake flow"
}
```

Expected:
- 201 response
- new CRM lead with source `voice_agent`
- activity record with assessment metadata

### Test C — Real inbound phone call
1. Call the Twilio number from a real phone
2. Twilio should POST to `/api/voice-agent/twilio/incoming`
3. The route should register the call with Retell
4. Twilio should receive TwiML that dials the Retell SIP URI
5. Retell should handle the call and send event webhooks

Expected:
- call reaches AI receptionist
- at least one Retell event arrives at `/api/voice-agent/retell/events`
- if lead is linked in metadata later, CRM activity logging will persist those events cleanly

---

## Known Gaps

These are still pending after hookup:

1. Direct appointment booking from live calls
2. Call transcript/recording dashboard UI
3. More robust event-to-lead reconciliation when Retell events arrive before a CRM lead exists
4. Optional: make transfer eligibility sensitive to business hours and richer caller context from real provider payloads

## Voice Call Persistence Layer

A `voice_calls` table is now expected by the app to reconcile Twilio, Retell, and CRM records.

Ways to get the SQL:
- `GET /api/voice-agent/migrate`
- `GET /api/voice-agent/status` → `migrations.voiceCallsSql`

Run that SQL in the Supabase SQL Editor before expecting full call reconciliation to persist.

---

## Recommended Immediate Next Step After Hookup

After the providers are connected and a real call is tested:

1. capture one successful real inbound call
2. inspect Twilio request + Retell event payloads
3. patch reconciliation logic if needed
4. implement hot-lead live transfer

---

## Notes

- Retell webhook signature verification is already implemented in `/api/voice-agent/retell/events`
- Twilio incoming voice route already returns TwiML XML
- The app currently defaults to `https://b2b-leadgen-kappa.vercel.app` if `APP_BASE_URL` is not set, but setting `APP_BASE_URL` explicitly is recommended
