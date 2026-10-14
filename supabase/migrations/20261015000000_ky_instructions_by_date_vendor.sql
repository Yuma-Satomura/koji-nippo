-- 指示事項を「日付×業者」ごとに変更（全業者一括は vendor_id='__ALL__'）
-- 旧 ky_instructions（現場ごと常設）は空のため作り替える。

drop table if exists ky_instructions;

create table ky_instructions (
  site_number  text not null,
  date         text not null,
  vendor_id    text not null,          -- 業者ID、または '__ALL__'（全業者に適用）
  instructions text not null default '',
  updated_at   timestamptz default now(),
  primary key (site_number, date, vendor_id)
);

alter table ky_instructions enable row level security;
create policy ky_inst_read_anon on ky_instructions for select to anon using (true);
create policy ky_inst_read_auth on ky_instructions for select to authenticated using (true);
-- 書き込みは admin-auth（service_role）経由。
