# LeadsGenerator

[![Tests](https://github.com/Mohid59/LeadsGenerator/actions/workflows/test.yml/badge.svg)](https://github.com/Mohid59/LeadsGenerator/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![n8n](https://img.shields.io/badge/n8n-self--hosted-EA4B71)](https://n8n.io)
[![Apify](https://img.shields.io/badge/Apify-Google%20Maps%20Scraper-orange)](https://apify.com)

> An automated pipeline that scrapes Google Maps, filters small businesses that **don't have a website**, and lands them in Google Sheets ready for outreach.

Designed for solo operators and agencies who do "we'll build you a website / WhatsApp funnel" outreach. Instead of manually searching Maps and copy-pasting phone numbers, it runs end-to-end on a schedule and only surfaces leads that fit a real outreach profile (no site, phone present, small enough to actually convert).

---

## Why it exists

Most ready-made "lead scrapers" output 10,000 rows of noise — businesses with thriving websites, 500+ reviews, and a marketing team. Useless if your offer is *"let me build you a website."*

This pipeline inverts that. It actively **rejects** the strong ones and keeps the ones that need help:

| Filter rule | Why |
|---|---|
| `website is null/empty` | Primary signal — your actual offer |
| `phone exists (≥ 7 digits)` | You need a way to reach them |
| `rating < 4.2` or missing | High-rated businesses already have momentum |
| `reviews_count < 50` | Small operations = real opportunity |
| `business_name exists` | Unusable without it |

A 10-place test scrape of dental clinics in Karachi yielded **2 high-quality leads** — both with phone numbers, 3.x ratings, and zero web presence.

---

## Architecture

```
┌──────────────┐   webhook   ┌──────────────┐   HTTPS   ┌──────────────┐
│   Apify      │  ─────────► │   n8n        │  ──────►  │  Apify API   │
│   Google     │  RUN.       │   Webhook    │  Bearer   │  /datasets/  │
│   Maps       │  SUCCEEDED  │   (self-     │  token    │   :id/items  │
│   Scraper    │             │    hosted)   │           └──────────────┘
└──────────────┘             └──────┬───────┘
                                    ▼
                          ┌─────────────────────┐
                          │ Clean & Normalize   │  Handles nulls,
                          │ (n8n Code node, JS) │  Apify field drift,
                          └─────────┬───────────┘  phone formatting
                                    ▼
                          ┌─────────────────────┐
                          │ Filter              │  6/6 test cases
                          │ (no-website rules)  │  pass — null-safe
                          └─────────┬───────────┘
                                    ▼
                          ┌─────────────────────┐
                          │ Google Sheets       │  Dedup by place_id,
                          │ append/upsert       │  no duplicates on rerun
                          └─────────┬───────────┘
                                    ▼ (optional)
                          ┌─────────────────────┐
                          │ Supabase            │  Outreach state machine
                          │ (Postgres + RLS)    │  new → contacted → converted
                          └─────────────────────┘
```

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Scraping | [Apify](https://apify.com) Google Maps Scraper (`compass/crawler-google-places`) | Maintained, handles rotation/proxies, $4 per 1k places |
| Automation | [n8n](https://n8n.io) self-hosted (Docker) | Free, owns your data, no vendor lock-in |
| Public tunnel | [ngrok](https://ngrok.com) free tier | Lets Apify cloud reach your local n8n |
| Primary storage | Google Sheets | Zero setup, share with non-technical teammates |
| Optional storage | [Supabase](https://supabase.com) | Real DB with outreach state machine + RLS |
| Filter logic | Vanilla JavaScript inside n8n Code node | Same code runs in Node.js for unit tests |
| Tests | Node.js script over 6 fixtures | No framework dependency, CI-friendly |

---

## Multi-region support

The pipeline is **not city- or country-specific**. The filter, n8n workflow, schemas, and tests are all region-agnostic — only the Apify *input* changes.

Three ready presets live in [`apify/`](apify/):

| Preset | Countries | Searches | Cost per run* |
|---|---|---|---|
| [`input.json`](apify/input.json) | Pakistan (single-city smoke test) | 3 | ~$0.40 |
| [`input.pakistan.json`](apify/input.pakistan.json) | 8 Pakistani cities × 3 niches | 24 | ~$1.92 |
| [`input.gulf.json`](apify/input.gulf.json) | UAE / KSA / Qatar / Bahrain / Kuwait / Oman | 21 | ~$3.36 |
| [`input.global-en.json`](apify/input.global-en.json) | UK / US / Canada / Australia / NZ / Ireland | 16 | ~$2.56 |

\* At Apify's $4 per 1,000 places pricing.

Switching cities is one edit to `searchStringsArray` — no other code or config touched.

---

## Project layout

```
LeadsGenerator/
├── apify/                  Multi-region scraper presets
├── n8n/
│   ├── workflow.json       Importable n8n workflow (7 nodes)
│   └── docker-compose.yml  Self-hosted stack: n8n + ngrok tunnel
├── filter/
│   ├── filter.js           Filtering logic (also embedded in n8n)
│   └── filter-standalone.js  Run filter without n8n on raw Apify JSON
├── supabase/
│   └── schema.sql          Tables, indexes, dedup, outreach state machine
├── sheets/
│   └── schema.md           Google Sheets column spec
├── tests/
│   ├── sample-input.json   6 fixtures covering null-handling + edge cases
│   └── test-runner.js      CI-friendly test runner
└── docs/
    ├── SETUP.md            End-to-end setup guide
    └── TROUBLESHOOTING.md  16 documented failure modes + fixes
```

---

## Quick start

Full guide in [`docs/SETUP.md`](docs/SETUP.md). TL;DR:

```bash
# 1. Self-host n8n (free)
cd n8n
cp .env.example .env          # set basic-auth password + ngrok token
docker compose --profile tunnel up -d

# 2. Run the filter tests
node tests/test-runner.js     # expect: 6/6 passing

# 3. Open n8n at http://localhost:5678 → import workflow.json
# 4. Add credentials (Apify token, Google OAuth)
# 5. Paste your ngrok URL into Apify's webhook integration
# 6. Trigger a scrape — leads land in Google Sheets
```

---

## Tests

```
$ node tests/test-runner.js

=== LEAD FILTER TEST RESULTS ===
[PASS] ChIJ_test_001  expected=true  actual=true     no website + has phone + low reviews
[PASS] ChIJ_test_002  expected=false actual=false    has website
[PASS] ChIJ_test_003  expected=false actual=false    missing phone
[PASS] ChIJ_test_004  expected=true  actual=true     null fields handled, has name + phone
[PASS] ChIJ_test_005  expected=false actual=false    rating ≥ 4.2 AND reviews ≥ 50
[PASS] ChIJ_test_006  expected=false actual=false    missing business_name

Summary: 6/6 passed
```

The 6 fixtures intentionally include a null-heavy record to verify the filter doesn't crash on missing fields — a real-world failure mode I hit during development.

---

## Engineering notes

A few decisions worth flagging:

- **Webhook ACK is fire-and-forget**: the `Respond 200` node fires immediately so Apify doesn't retry. The actual `Fetch → Filter → Append` runs asynchronously in the same execution.
- **Dedup is keyed on `place_id`** (Google Maps' stable place identifier). Re-running the same scrape updates rows in place instead of creating duplicates. There's a soft fallback for places where `place_id` is missing — `(phone, lower(business_name))` — implemented as a partial unique index in the Supabase schema.
- **The `Clean & Normalize` step is intentionally defensive.** Apify field names have drifted over the years (`rating` → `totalScore`, `reviews` → `reviewsCount`); the normalizer checks both forms. Same for the website field, where the placeholder strings `"undefined"`, `"null"`, and Google's own `business.google.com` redirect get coerced to `null`.
- **n8n `Code` node returns single output.** An earlier 2-output version (passed / rejected) triggered "Code doesn't return items properly" in some n8n versions; collapsing to single-output passed validation across the supported versions.

---

## Roadmap

- [ ] Paginated Apify fetch for runs > 500 places (currently single HTTP request, limited by n8n's payload cap)
- [ ] WhatsApp outreach node (Twilio WhatsApp API)
- [ ] Lead scoring (enrich with category-specific signals)
- [ ] Status sync back from Sheets/Supabase to mark contacted leads

---

## License

MIT — see [LICENSE](LICENSE).
