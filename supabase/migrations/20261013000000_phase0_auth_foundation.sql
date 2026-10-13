-- フェーズ0 STEP1: 認証基盤（追加のみ・既存挙動に影響なし）
--
-- 安全性の根拠:
--   * 新規テーブルの追加と、既存テーブルへの authenticated 読取ポリシー追加のみ。
--   * 既存の anon 読取ポリシー、worker-write / admin-write(service_roleはRLSを素通り)
--     には一切触れない。現在ログイン中の社員は0名のため、認証向けポリシーを足しても
--     現行の日報アプリの挙動は変わらない。
--   詳細は docs/PHASE0-DESIGN.md を参照。

-- ========== マスタ・認証テーブル ==========

-- 社員マスタ（工程表 koujitei_users と同構造。将来はこれに一本化）
create table if not exists staff (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  role       text not null default 'member' check (role in ('admin','member')),
  color      text default '#4a7fff',
  created_at timestamptz default now()
);

-- 社員↔担当現場（担当者の編集権限の根拠。現場番号で紐づく）
create table if not exists site_staff (
  site_number text not null,
  staff_id    uuid not null references staff(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (site_number, staff_id)
);

-- 招待待ち（本登録前。工程表 koujitei_pending_users と同じ）
create table if not exists staff_pending (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  name       text not null,
  role       text not null default 'member' check (role in ('admin','member')),
  created_at timestamptz default now()
);

-- 機械マスタ（高所作業車・重機。QR点検の対象。先行機能と共有）
create table if not exists equipment (
  id          text primary key,
  name        text not null,
  kind        text,
  site_number text,
  created_at  timestamptz default now()
);

alter table staff         enable row level security;
alter table site_staff    enable row level security;
alter table staff_pending enable row level security;
alter table equipment     enable row level security;

-- ========== 判定ヘルパー（RLS再帰を避けるため SECURITY DEFINER） ==========

create or replace function is_admin() returns boolean
  language sql security definer stable set search_path = public as $$
  select exists(select 1 from staff where id = auth.uid() and role = 'admin')
$$;

create or replace function can_edit_site(sn text) returns boolean
  language sql security definer stable set search_path = public as $$
  select is_admin() or exists(
    select 1 from site_staff where staff_id = auth.uid() and site_number = sn)
$$;

-- ========== RLS: 新規テーブル ==========

-- staff: ログイン社員は全件読取（割り当てUI用）、書込は管理者のみ
create policy staff_select_auth on staff
  for select to authenticated using (true);
create policy staff_write_admin on staff
  for all to authenticated using (is_admin()) with check (is_admin());

-- site_staff: ログイン社員は読取、書込は管理者のみ
create policy site_staff_select_auth on site_staff
  for select to authenticated using (true);
create policy site_staff_write_admin on site_staff
  for all to authenticated using (is_admin()) with check (is_admin());

-- staff_pending: 管理者のみ（読取も）。メールアドレスを含むため厳格に
create policy staff_pending_admin on staff_pending
  for all to authenticated using (is_admin()) with check (is_admin());

-- equipment: 匿名読取（QR点検画面用）＋ 社員読取 ＋ 管理者書込
create policy equipment_read_anon on equipment
  for select to anon using (true);
create policy equipment_read_auth on equipment
  for select to authenticated using (true);
create policy equipment_write_admin on equipment
  for all to authenticated using (is_admin()) with check (is_admin());

-- ========== RLS: 既存テーブルへ authenticated 読取を追加 ==========
-- （anon 読取ポリシーはそのまま。ログイン社員も閲覧できるようにするための追加のみ）

create policy auth_read_nippo_sites on nippo_sites
  for select to authenticated using (true);
create policy auth_read_nippo_vendors on nippo_vendors
  for select to authenticated using (true);
create policy auth_read_nippo_reports on nippo_reports
  for select to authenticated using (true);

-- ========== 招待→本登録トリガ ==========
-- 招待済み(staff_pending)のメールで初回ログインした時だけ staff を作成する。
-- pending に無い場合は staff を作らない = 管理者が招待した社員だけがアプリを使える。

create or replace function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into staff (id, name, role)
  select new.id, p.name, p.role
  from staff_pending p where p.email = new.email;
  delete from staff_pending where email = new.email;
  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
