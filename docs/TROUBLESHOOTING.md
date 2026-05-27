# Common Failure Points + Fixes

| # | Symptom                                                                  | Root cause                                                                                       | Fix                                                                                                                                             |
|---|--------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------|
| 1 | Apify webhook fires but n8n returns 404                                  | Workflow not **Active**, or webhook path mismatch                                                | Toggle Active. Confirm path is `/webhook/leads-ingest`.                                                                                          |
| 2 | n8n receives webhook but `Fetch Apify Dataset` returns `[]`              | Apify webhook fired on `RUN.CREATED` instead of `RUN.SUCCEEDED`                                  | In Apify integration, change event to `ACTOR.RUN.SUCCEEDED`.                                                                                     |
| 3 | `Fetch Apify Dataset` → 401 Unauthorized                                 | Missing/expired Apify API token                                                                  | Re-create header credential with `Authorization: Bearer <token>`.                                                                               |
| 4 | All rows filtered out, even with no-website businesses                   | Apify returns `website: ""` not `null`                                                            | Already handled by `normWebsite()` in the Clean & Normalize node — verify the node ran.                                                          |
| 5 | Duplicates appearing in Google Sheets                                    | `matchingColumns` not configured / `place_id` blank                                              | Ensure `place_id` is present in scraped data (set `scrapePlaceDetailPage: true` in Apify input).                                                  |
| 6 | Supabase insert fails with `duplicate key value violates unique`         | Workflow is using POST without upsert header                                                     | Verify the Supabase node sends `Prefer: resolution=merge-duplicates`.                                                                            |
| 7 | Numbers stored as strings in Sheets ("3.8" not 3.8)                      | Locale issue — comma decimal separator                                                           | Set sheet locale to en_US: File → Settings → General → Locale.                                                                                   |
| 8 | Apify Actor times out on large queries (>500 places)                     | Google rate-limit / IP block                                                                     | Lower `maxConcurrency` to 4, use `RESIDENTIAL` proxy group, split into multiple smaller searches.                                                 |
| 9 | n8n Code node crashes: `Cannot read properties of null`                   | A field arrived as `null` and was accessed unguarded                                             | All access in `Clean & Normalize` uses `?.` / `||` fallbacks. If you customise, keep them.                                                       |
|10 | Phone numbers come through without country code                          | Google Maps shows local format only                                                              | Acceptable for outreach in same country. If you need E.164, add a `libphonenumber-js` step in the Code node.                                     |
|11 | Filter rejects everything (`rating_too_high`)                            | Apify field name changed from `totalScore` to `rating`                                           | `normalize()` checks both; if Apify changes again, add the new field name there.                                                                |
|12 | ngrok URL changes every restart                                          | Free ngrok has dynamic URLs                                                                      | Pin a static domain (ngrok free now allows 1 reserved domain), OR deploy n8n to a small VPS.                                                     |
|13 | Workflow runs but nothing in Supabase                                    | RLS blocks anon key                                                                              | Use the **service_role** key (bypasses RLS) on the server side. Never expose it to a browser.                                                    |
|14 | Apify run cost spikes                                                    | `maxCrawledPlacesPerSearch` too high                                                             | Keep ≤ 200 per search. Run multiple smaller queries instead of one giant one.                                                                    |
|15 | Tests pass but production filter behaves differently                     | Apify field shape drift                                                                          | Capture a real Apify payload and add it as a new fixture in `tests/sample-input.json`; re-run `node tests/test-runner.js`.                       |
|16 | "n8n trial ended" — cloud workflow stopped                               | Cloud subscription lapsed                                                                        | Use the self-hosted Docker setup in `n8n/docker-compose.yml` (free forever, your data).                                                          |

## Quick debug commands

```powershell
# Tail n8n logs
docker logs -f n8n_leads

# Inspect an Apify dataset directly (replace IDs/tokens)
curl "https://api.apify.com/v2/datasets/<DATASET_ID>/items?clean=true&format=json&token=<APIFY_TOKEN>" | ConvertFrom-Json | Select-Object -First 1

# Replay last webhook in n8n
# UI → Executions → click last run → "Retry from start"
```
