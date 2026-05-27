# Changelog

## v1.0.0 — 2026-05-27

Initial release.

- Apify Google Maps Scraper integration with three multi-region presets (Pakistan, Gulf, Global English)
- Self-hosted n8n via Docker Compose, with optional ngrok tunnel profile
- 7-node n8n workflow: webhook → fetch dataset → clean → filter → Google Sheets
- Filter logic with 5 rules (no website, has phone, has name, low rating, low reviews) — null-safe
- Google Sheets append with `place_id` dedup
- Supabase schema with outreach state machine, partial indexes, and soft dedup fallback
- 6 filter unit tests covering edge cases and null-heavy fixtures
- End-to-end setup guide + 16 documented failure modes
