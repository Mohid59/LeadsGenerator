# Google Sheets — `leads` Tab Schema

Create a new Google Sheet, rename Sheet1 → `leads`, and paste the following header row into row 1 (A1:K1):

| Col | Header          | Type    | Example                           | Notes                                       |
|-----|-----------------|---------|-----------------------------------|---------------------------------------------|
| A   | business_name   | string  | `Smile Dental Clinic`             | Required                                    |
| B   | phone           | string  | `+923001234567`                   | Required for outreach                       |
| C   | address         | string  | `Plot 12, Block 4, Clifton`       |                                             |
| D   | city            | string  | `Karachi`                         |                                             |
| E   | website         | string  | *(empty)*                         | Empty = target lead                         |
| F   | rating          | number  | `3.8`                             | 0–5; blank if no reviews                    |
| G   | reviews_count   | number  | `12`                              | Default `0`                                 |
| H   | category        | string  | `Dental clinic`                   |                                             |
| I   | place_id        | string  | `ChIJN1t_tDeuEmsRUsoyG83frY4`     | **Used by n8n for dedup**                   |
| J   | source          | string  | `google_maps_apify`               |                                             |
| K   | scraped_at      | string  | `2026-05-26T10:14:22.000Z`        | ISO-8601 UTC                                |

## Recommended formatting

1. Freeze row 1: **View → Freeze → 1 row**.
2. Filter view: **Data → Create a filter** on `A1:K1`.
3. Conditional formatting on **column E** (`website`):
   - Custom formula `=ISBLANK(E2)` → green background. Lets you eyeball priority leads.
4. Data validation on **column F** (`rating`): Number between `0` and `5`.

## Dedup

n8n's Google Sheets node is configured with `matchingColumns: ["place_id"]` — re-runs **update** existing rows instead of duplicating.

## Sheet ID

After creating the sheet, copy its ID from the URL:
`https://docs.google.com/spreadsheets/d/`**`<SHEET_ID>`**`/edit`

Paste it into [n8n/workflow.json](../n8n/workflow.json) → `Google Sheets — Append` node → `documentId`.
