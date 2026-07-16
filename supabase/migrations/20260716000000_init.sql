-- 工事日報管理システム 初期スキーマ
--
-- セキュリティ設計:
--   読み取り  : anon キーで SELECT のみ許可
--   書き込み  : すべて Edge Function（service_role）経由。anon からの書き込みは RLS で遮断
--   PIN       : nippo_settings は意図的にポリシーを作らず anon から完全遮断する

-- 現場マスタ
create table if not exists public.nippo_sites (
  id             text primary key,
  number         text not null,
  name           text not null,
  client         text default ''::text,
  company        text,
  representative text,
  staff          text,
  created_at     timestamptz default now()
);

-- 業者マスタ（現場ごとに独立）
create table if not exists public.nippo_vendors (
  id          text primary key,
  site_number text not null,
  name        text not null,
  created_at  timestamptz default now()
);

-- 日報本体（1現場1日1件。中身は data(jsonb) に格納）
create table if not exists public.nippo_reports (
  id          text primary key,
  site_number text not null,
  date        text not null,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (site_number, date)
);

-- 設定（現状は管理者PIN admin_pin のみ）
create table if not exists public.nippo_settings (
  key   text primary key,
  value text not null default ''::text
);

alter table public.nippo_sites    enable row level security;
alter table public.nippo_vendors  enable row level security;
alter table public.nippo_reports  enable row level security;
alter table public.nippo_settings enable row level security;

-- anon は読み取りのみ許可
create policy anon_read_nippo_sites
  on public.nippo_sites   for select to anon using (true);
create policy anon_read_nippo_vendors
  on public.nippo_vendors for select to anon using (true);
create policy anon_read_nippo_reports
  on public.nippo_reports for select to anon using (true);

-- nippo_settings にはポリシーを作らない。
-- RLS 有効かつポリシーなしで anon からは読めず、service_role のみが到達できる。
