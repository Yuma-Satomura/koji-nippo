-- KYを業者ごと・匿名QR運用に変更：vendor_id 列を追加
-- KYは現場QRから匿名で（職長が記入→作業員が確認・署名）、業者ごとに1日1件。
-- id は `${site_number}_${vendor_id}_${date}` を用いる。

alter table ky_records add column if not exists vendor_id text;
create index if not exists idx_ky_site_vendor_date
  on ky_records (site_number, vendor_id, date desc);
