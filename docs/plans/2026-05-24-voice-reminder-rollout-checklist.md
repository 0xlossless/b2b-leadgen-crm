# Voice Reminder Automation Production Rollout Checklist

**Goal:** Safely deploy and validate the Golden State Epoxy voice reminder automation in production.

**Scope:** Twilio/Retell configuration validation, Vercel cron verification, manual reminder endpoint test, and one end-to-end live booking reminder check.

---

## Prerequisites

Make sure these are present in Vercel production:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `RETELL_API_KEY`
- `RETELL_AGENT_ID` or `RETELL_DEFAULT_AGENT_ID`
- `APP_BASE_URL=https://b2b-leadgen-kappa.vercel.app`
- `CRON_SECRET`

Optional but recommended:

- `TWILIO_MESSAGING_SERVICE_SID`
- `NOTIFY_PHONE`
- `VOICE_REMINDER_WINDOW_HOURS=24`
- `VOICE_REMINDER_CRON_SCHEDULE=0 16 * * *`

---

## Step 1 — Deploy the current code

1. Deploy the latest branch containing:
   - `vercel.json`
   - `/api/voice-agent/reminders`
   - booking confirmation/reminder SMS support
2. Wait for the deployment to complete.
3. Confirm the deployment URL is the production URL.

**Expected:**
- deployment succeeds
- `/api/voice-agent/status` returns 200
- `/api/voice-agent/reminders` exists

---

## Step 2 — Validate environment + provider readiness

Open:
- `/api/voice-agent/status`

Confirm:
- Twilio configured = true
- Retell configured = true
- `CRON_SECRET` status shows configured
- reminder schedule and window values are visible
- reminder endpoint URL is correct

**If not ready:**
- fix env vars in Vercel first
- redeploy if needed

---

## Step 3 — Verify Vercel cron registration

In the Vercel project dashboard:

1. Open Cron Jobs
2. Confirm there is a job for:
   - `/api/voice-agent/reminders`
3. Confirm the schedule is:
   - `0 16 * * *`
4. Remember this runs in UTC

**Expected:**
- cron job appears after deploy
- no path mismatch
- schedule matches the intended reminder cadence

---

## Step 4 — Manual reminder endpoint test

Before waiting for cron, test the route directly.

### GET example
```bash
curl -i \
  -H "Authorization: Bearer <CRON_SECRET>" \
  "https://b2b-leadgen-kappa.vercel.app/api/voice-agent/reminders?windowHours=24"
```

### POST example
```bash
curl -i -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -d '{"windowHours":24}' \
  "https://b2b-leadgen-kappa.vercel.app/api/voice-agent/reminders"
```

**Expected:**
- 200 response
- JSON includes:
  - `processed`
  - `sent`
  - `skipped`
  - `failed`
- unauthorized request returns 401 when `CRON_SECRET` is set

---

## Step 5 — Create one real voice-booked appointment

Use a real or controlled test phone call to create:
- a lead via voice agent
- a booked estimate within the next 24 hours

Confirm in CRM:
- appointment exists
- `voice_calls.appointment_id` is set
- `booking_status = scheduled`
- `confirmation_sms_status` updated appropriately

---

## Step 6 — Validate reminder delivery manually first

Run the reminder endpoint manually after the appointment exists.

Confirm:
- matching `voice_calls` row gets `reminder_sms_status`
- `reminder_sms_sent_at` is written when successful
- activity log entry is created
- no-phone cases become `skipped`

**Expected successful path:**
- customer receives reminder SMS
- CRM activity notes the reminder send
- dashboard shows reminder status

---

## Step 7 — Validate actual cron execution

After manual success, let Vercel cron run normally.

Check:
- Vercel cron logs
- function logs for `/api/voice-agent/reminders`
- `voice_calls` row changes
- received SMS on the test handset

**Expected:**
- cron invokes the route automatically
- bearer auth is accepted
- logs show explicit success/failure counts
- no silent failures

---

## Step 8 — Final production signoff

Mark rollout complete only if all are true:

- [ ] Twilio configured
- [ ] Retell configured
- [ ] `CRON_SECRET` configured
- [ ] Vercel cron job visible
- [ ] manual reminder endpoint returns 200
- [ ] one real reminder SMS was delivered
- [ ] reminder status persisted to `voice_calls`
- [ ] CRM activity log captured the reminder attempt
- [ ] dashboard reflects reminder state correctly

---

## Recommended follow-up after signoff

1. Add transcript/recording UI polish
2. Improve event reconciliation from live provider payloads
3. Add richer operational analytics for booked / transferred / callback outcomes
