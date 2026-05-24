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
- `CRON_SECRET` (recommended — Vercel cron will send this as `Authorization: Bearer <CRON_SECRET>`)


Optional but useful:
- `TWILIO_MESSAGING_SERVICE_SID`
- `NOTIFY_PHONE`
- `VOICE_REMINDER_WINDOW_HOURS=24`
- `VOICE_REMINDER_CRON_SCHEDULE=0 16 * * *`

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

### Test D — Reminder endpoint (manual)
1. Ensure `CRON_SECRET` is set in Vercel
2. Create a voice-booked estimate within the next 24 hours
3. Send a GET or POST request to `/api/voice-agent/reminders`
4. Include `Authorization: Bearer <CRON_SECRET>`
5. Optionally override the scan window with `windowHours`

Expected:
- endpoint returns processed reminder counts
- matching `voice_calls` rows update `reminder_sms_status`
- reminder attempt is logged as CRM activity
- callers with missing numbers are marked `skipped`, not silently ignored

### Test E — Vercel cron automation
1. Deploy `vercel.json` with the reminder cron entry
2. Confirm the cron job appears in the Vercel dashboard
3. Verify the cron path is `/api/voice-agent/reminders`
4. Confirm schedule is interpreted in UTC
5. Inspect cron logs after the first run

Expected:
- Vercel invokes the reminder endpoint automatically
- `CRON_SECRET` is passed as bearer auth
- reminder endpoint runs without manual intervention
- logs show success or explicit failures for follow-up

---

## Known Gaps

These are still pending after hookup:

1. Call transcript/recording dashboard UI
2. More robust event-to-lead reconciliation when Retell events arrive before a CRM lead exists
3. Optional: make transfer eligibility sensitive to business hours and richer caller context from real provider payloads
4. UI for orchestration outcomes (booked vs transferred vs callback)

## Voice Call Persistence Layer

A `voice_calls` table is now expected by the app to reconcile Twilio, Retell, and CRM records.

Ways to get the SQL:
- `GET /api/voice-agent/migrate`
- `GET /api/voice-agent/status` → `migrations.voiceCallsSql`

Run that SQL in the Supabase SQL Editor before expecting full call reconciliation to persist.

---

## Scheduled Reminder Automation

The repo now includes a Vercel cron definition in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/voice-agent/reminders",
      "schedule": "0 16 * * *"
    }
  ]
}
```

Notes:
- Vercel cron schedules run in UTC
- `0 16 * * *` = 16:00 UTC daily
- secure the route with `CRON_SECRET`
- the reminder endpoint accepts both `GET` and `POST`
- override the default scan window with `VOICE_REMINDER_WINDOW_HOURS`

## Recommended Immediate Next Step After Hookup

After the providers are connected and a real call is tested:

1. capture one successful real inbound call
2. inspect Twilio request + Retell event payloads
3. patch reconciliation logic if needed
4. validate reminder cron behavior in production logs
5. implement any follow-up UX polish needed for call outcomes

---

## Notes

- Retell webhook signature verification is already implemented in `/api/voice-agent/retell/events`
- Twilio incoming voice route already returns TwiML XML
- The app currently defaults to `https://b2b-leadgen-kappa.vercel.app` if `APP_BASE_URL` is not set, but setting `APP_BASE_URL` explicitly is recommended
