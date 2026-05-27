# Setup Guide — End-to-End

## Prerequisites

- Docker Desktop (for self-hosted n8n)
- Apify account (free tier OK)
- Google account (for Sheets) — or Supabase project (for SQL storage)
- ngrok account (free) — needed only because Apify must POST to your local n8n

---

## 1. Start self-hosted n8n (free)

```powershell
cd c:\Users\as\OneDrive\Desktop\LeadsGenerator\n8n
# Edit docker-compose.yml — set N8N_BASIC_AUTH_PASSWORD and NGROK_AUTHTOKEN
docker compose up -d
```

Open http://localhost:5678 → log in (admin / your password) → complete first-run owner setup.

Find your public webhook URL:
```powershell
docker logs n8n_ngrok | Select-String "url="
# Example output: url=https://abc-123.ngrok-free.app
```

Your webhook URL is: `https://abc-123.ngrok-free.app/webhook/leads-ingest`

---

## 2. Import the workflow

1. n8n UI → **Workflows** → **Import from file** → select `n8n/workflow.json`.
2. Fix the three credential placeholders:
   - **Fetch Apify Dataset** → create Header Auth credential, header `Authorization`, value `Bearer <APIFY_TOKEN>` (get from apify.com → Settings → Integrations → API tokens).
   - **Google Sheets — Append** → OAuth2 sign-in, then paste your Sheet ID into `documentId`.
   - **Supabase — Upsert** → replace `<YOUR-PROJECT-REF>` and `<SUPABASE_SERVICE_ROLE_KEY>` (Supabase → Project Settings → API).
3. Toggle the workflow **Active**.

---

## 3. Prepare storage

**Google Sheets**: create a sheet, rename Sheet1 → `leads`, paste header row from [sheets/schema.md](../sheets/schema.md).

**Supabase**: SQL Editor → run [supabase/schema.sql](../supabase/schema.sql).

You can use one or both — the workflow writes to whichever is wired.

---

## 4. Configure the Apify Actor

1. apify.com → Store → search **"Google Maps Scraper"** (`compass/crawler-google-places`).
2. Click **Try for free** → opens the actor input page.
3. Paste contents of [apify/input.json](../apify/input.json) into the JSON tab. Edit `searchStringsArray` and `locationQuery` for your niche/city.
4. Click **Save & Start** to do a smoke test (20 places).
5. Once the run finishes successfully, go to actor **Integrations → Webhooks → Add**:
   - **Event**: `ACTOR.RUN.SUCCEEDED`
   - **URL**: paste your ngrok webhook URL from step 1.
   - **Payload template**: keep default — it includes `resource.defaultDatasetId` which the workflow needs.

---

## 5. Run the tests

```powershell
node tests/test-runner.js
```

Expected: `6/6 passed`. Re-run after any change to `filter/filter.js`.

---

## 6. Go live

In Apify: schedule the actor (e.g. once a week per city) or trigger ad-hoc runs.
Each run pushes results into n8n → filter → Sheets/Supabase.

Inspect results in Supabase:
```sql
select count(*), outreach_status from public.leads group by 2;
select * from public.high_priority_leads limit 20;
```

---

## 7. Hook outreach (next phase)

Downstream consumers should:
- Read from `public.high_priority_leads` (or the Sheet's filtered view).
- After contact: `update public.leads set outreach_status='contacted', last_contacted_at=now() where id=$1`.

For WhatsApp: use Twilio WhatsApp API or wa.me deep links.
For email: keep finding email via [hunter.io](https://hunter.io) or skip and stick to WhatsApp/phone.
