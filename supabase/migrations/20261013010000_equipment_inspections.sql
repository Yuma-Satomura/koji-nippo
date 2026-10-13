-- 先行機能: 機械・重機のQR点検記録
-- equipment マスタは STEP1 で作成済み。ここに点検記録テーブルを追加する。

create table if not exists equipment_inspections (
  id           text primary key,          -- `${equipment_id}_${date}`（1台1日1件）
  equipment_id text not null references equipment(id) on delete cascade,
  date         text not null,
  inspector    text,                       -- 点検者名（匿名入力）
  data         jsonb not null default '{}'::jsonb,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists idx_equip_insp_equipment
  on equipment_inspections (equipment_id, date desc);

alter table equipment_inspections enable row level security;

-- 読み取り：QR点検画面(匿名)が過去履歴を見られるよう anon 読取可。社員も読取可。
create policy equip_insp_read_anon on equipment_inspections
  for select to anon using (true);
create policy equip_insp_read_auth on equipment_inspections
  for select to authenticated using (true);

-- 書き込み：匿名の点検入力は Edge Function(equipment-inspect / service_role) 経由のみ。
-- authenticated の直接書込ポリシーは設けない（将来 admin の削除等が要れば admin-auth 経由で）。
