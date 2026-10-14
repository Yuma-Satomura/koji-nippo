-- フェーズ1: KY（危険予知活動表 RKY）記録
-- 自社書式（大西熱学 RKY用紙）に基づく。現場に紐づく。

create table if not exists ky_records (
  id          text primary key,          -- uuid（1現場1日に複数可）
  site_number text not null,
  date        text not null,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists idx_ky_site_date on ky_records (site_number, date desc);

alter table ky_records enable row level security;

-- 読み取り：アプリは anon キーで読むため anon 読取を許可（日報と同じ姿勢）。社員も読取可。
create policy ky_read_anon on ky_records for select to anon using (true);
create policy ky_read_auth on ky_records for select to authenticated using (true);

-- 書き込みは admin-auth（service_role）経由。担当現場チェックは関数側で行う。
