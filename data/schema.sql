-- Surgeon Lookup: Supabase schema
-- Run this once in the Supabase SQL Editor. Safe to rerun: drops + recreates.

drop table if exists user_territories cascade;
drop table if exists email_searched cascade;
drop table if exists emails cascade;
drop table if exists scores cascade;
drop table if exists payments cascade;
drop table if exists publications cascade;
drop table if exists provider_taxonomies cascade;
drop table if exists providers cascade;

-- Providers
create table providers (
  npi                    text primary key,
  last_name              text,
  first_name             text,
  middle_name            text,
  credential             text,
  sex                    text,
  city                   text,
  state                  text,
  zip                    text,
  phone                  text,
  address_line1          text,
  enumeration_date       text,
  primary_taxonomy       text,
  primary_taxonomy_label text
);

create index providers_state_idx     on providers(state);
create index providers_city_idx      on providers(lower(city));
create index providers_last_name_idx on providers(lower(last_name));
create index providers_specialty_idx on providers(primary_taxonomy_label);
create index providers_zip_idx       on providers(zip);

-- Publications (1:1 with provider)
create table publications (
  npi                text primary key references providers(npi) on delete cascade,
  pubmed_total       integer default 0,
  bari_foregut_count integer default 0,
  top_titles         jsonb,
  last_searched      text
);

create index publications_bari_idx on publications(bari_foregut_count desc);
create index publications_total_idx on publications(pubmed_total desc);

-- Payments (1:1 with provider)
create table payments (
  npi               text primary key references providers(npi) on delete cascade,
  op_total_usd      double precision default 0,
  op_record_count   integer default 0,
  op_top_mfrs       jsonb,
  op_top_products   jsonb,
  op_top_natures    jsonb,
  last_searched     text
);

create index payments_total_idx on payments(op_total_usd desc);

-- KOL scores (1:1 with provider)
create table scores (
  npi           text primary key references providers(npi) on delete cascade,
  kol_score     double precision default 0,
  tier          text,
  last_computed text
);

create index scores_tier_idx on scores(tier);
create index scores_kol_idx  on scores(kol_score desc);

-- Emails (many per provider)
create table emails (
  id            bigserial primary key,
  npi           text references providers(npi) on delete cascade,
  email         text,
  source        text,
  affiliations  jsonb,
  last_searched text
);

create index emails_npi_idx    on emails(npi);
create index emails_source_idx on emails(source);

-- User territory selections
create table user_territories (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  states     text[] default '{}',
  zips       text[] default '{}',
  updated_at timestamptz default now()
);

-- RLS
alter table providers        enable row level security;
alter table publications     enable row level security;
alter table payments         enable row level security;
alter table scores           enable row level security;
alter table emails           enable row level security;
alter table user_territories enable row level security;

create policy "auth read providers"    on providers    for select to authenticated using (true);
create policy "auth read publications" on publications for select to authenticated using (true);
create policy "auth read payments"     on payments     for select to authenticated using (true);
create policy "auth read scores"       on scores       for select to authenticated using (true);
create policy "auth read emails"       on emails       for select to authenticated using (true);

create policy "user reads own territory" on user_territories for select to authenticated using (auth.uid() = user_id);
create policy "user inserts own territory" on user_territories for insert to authenticated with check (auth.uid() = user_id);
create policy "user updates own territory" on user_territories for update to authenticated using (auth.uid() = user_id);
