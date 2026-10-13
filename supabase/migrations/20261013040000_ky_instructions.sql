-- 大西熱学からの指示事項：管理者が前もって現場ごとに入力する（職長は編集不可）
create table if not exists ky_instructions (
  site_number  text primary key,
  instructions text not null default '',
  updated_at   timestamptz default now()
);

alter table ky_instructions enable row level security;

-- ky-worker（匿名）が読めるよう anon 読取可。社員も読取可。
create policy ky_inst_read_anon on ky_instructions for select to anon using (true);
create policy ky_inst_read_auth on ky_instructions for select to authenticated using (true);
-- 書き込みは admin-auth（service_role）経由。
