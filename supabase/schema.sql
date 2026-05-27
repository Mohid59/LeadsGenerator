-- ============================================================================
-- LeadsGenerator — Supabase schema
-- Run this in Supabase SQL Editor (or psql) once, before the n8n workflow.
-- ============================================================================

-- 1) MAIN TABLE -------------------------------------------------------------

create table if not exists public.leads (
  id              bigserial primary key,
  business_name   text        not null,
  phone           text,
  address         text,
  city            text,
  website         text,                                  -- null = no website (target)
  rating          numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5)),
  reviews_count   integer      default 0 check (reviews_count >= 0),
  category        text,
  place_id        text         unique,                   -- Google Maps place ID = dedup key
  latitude        numeric(9,6),
  longitude       numeric(9,6),
  source          text         default 'google_maps_apify',

  -- Outreach state machine (used by downstream WhatsApp/email workflow)
  outreach_status text         default 'new'
                  check (outreach_status in ('new','queued','contacted','replied','converted','rejected','do_not_contact')),
  outreach_attempts integer    default 0,
  last_contacted_at timestamptz,

  created_at      timestamptz  default now(),
  updated_at      timestamptz  default now()
);

-- 2) INDEXES ---------------------------------------------------------------
-- Lookups by phone (dedup fallback when place_id is missing)
create index if not exists leads_phone_idx          on public.leads (phone);
-- Filter "no website" — partial index keeps it small and fast
create index if not exists leads_no_website_idx     on public.leads (id) where website is null;
-- Outreach queue scans
create index if not exists leads_outreach_status_idx on public.leads (outreach_status, created_at);
-- Geo lookups (optional — only useful if you do "near me" queries)
create index if not exists leads_city_idx           on public.leads (city);
-- Reviews/rating filtering at query time
create index if not exists leads_quality_idx        on public.leads (rating, reviews_count);

-- 3) DUPLICATE PREVENTION --------------------------------------------------
-- place_id UNIQUE handles 99% of dedup. For records missing place_id we add
-- a soft dedup index on (phone, lower(business_name)).
create unique index if not exists leads_phone_name_uidx
  on public.leads (phone, lower(business_name))
  where place_id is null and phone is not null;

-- 4) updated_at TRIGGER ----------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- 5) ROW-LEVEL SECURITY (lock the table; n8n uses service_role which bypasses)
alter table public.leads enable row level security;

-- 6) VIEWS for downstream consumers ---------------------------------------
create or replace view public.high_priority_leads as
  select *
  from public.leads
  where website is null
    and phone is not null
    and outreach_status = 'new'
    and (rating is null or rating < 4.2)
    and (reviews_count is null or reviews_count < 50)
  order by created_at desc;

-- 7) HELPFUL QUERIES (reference) ------------------------------------------
-- Mark a lead as contacted:
--   update public.leads
--      set outreach_status='contacted',
--          outreach_attempts = outreach_attempts + 1,
--          last_contacted_at = now()
--    where id = $1;
--
-- Count by city + status:
--   select city, outreach_status, count(*) from public.leads group by 1,2 order by 1;
