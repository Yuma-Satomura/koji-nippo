# フェーズ0 詳細設計 ― 土台（認証・権限・マスタ共通化）

全機能が乗る背骨の設計。[ROADMAP.md](ROADMAP.md) のフェーズ0を具体化したもの。
**この文書は設計案であり、DBはまだ変更していない。** 実装着手時の仕様書として使う。

---

## 0. このフェーズのゴール

1. 社員が各自ログインできる（Supabase Auth）。役割は **管理者 / 担当者**。
2. 役割と担当現場で、見える範囲・触れる範囲を分ける（RLS）。
3. **職人のQR匿名入力は従来どおり維持**（アカウント不要）。
4. 現場・社員・業者・機械のマスタを、将来の工程表統合に耐える形で整える。
5. 既存の日報データを無停止で新モデルに載せ替える。

## 0-1. 確定した前提（2026-10）

| 決定事項 | 内容 |
|---------|------|
| 担当者の権限 | **全現場を閲覧**、編集は**自分の担当現場のみ** |
| 工程表との統合 | 将来 **1プロジェクトに統合**（フェーズ2）。土台はその前提で組む |
| アカウント発行 | **管理者がメールで招待** → 本人が初回ログインでパスワード設定 |
| 認証の現状 | `auth.users` は 0 件。まっさらから設計できる |
| 現在の書き込み | すべて Edge Function 経由（PIN認証／匿名職人）。auth未使用 |

---

## 1. 認証と役割

### 役割

| 役割 | 内部値 | できること |
|------|--------|-----------|
| 管理者 | `admin` | 全現場の閲覧・編集、マスタ管理（現場/社員/業者/機械）、社員招待 |
| 担当者 | `member` | 全現場の閲覧、**担当現場のみ**日報・記録の編集 |
| 職人 | （認証なし） | QRから匿名で当日入力のみ（現状維持） |

### アカウント発行フロー（工程表アプリと同じ方式）

```
管理者が社員のメール・氏名・役割を登録（staff_pending）
   ↓  Supabaseの招待メール送信
社員が招待リンクから初回ログイン・パスワード設定（auth.users 作成）
   ↓  トリガが auth.users 作成を検知
staff_pending の内容から staff 行を自動作成し、auth.users と紐付け → pending 削除
```

---

## 2. データモデル（案）

### 方針：既存テーブルは温存し、周辺を足す

稼働中の `nippo_sites / nippo_vendors / nippo_reports` は**そのまま現場・業者・日報のマスタとして使う**
（テーブル名変更は影響範囲が大きいのでフェーズ0では避ける）。
そこに **社員・割り当て・機械・招待** を足し、RLSを被せる。
工程表の本格統合（テーブル併合）はフェーズ2で行う。

### 追加するテーブル

```sql
-- 社員マスタ（工程表 koujitei_users と同じ構造。将来はこれに一本化）
create table staff (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  role       text not null default 'member' check (role in ('admin','member')),
  color      text default '#4a7fff',
  created_at timestamptz default now()
);

-- 社員↔担当現場（担当者の編集権限の根拠）
create table site_staff (
  site_number text not null references nippo_sites(number) on delete cascade,
  staff_id    uuid not null references staff(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (site_number, staff_id)
);

-- 招待待ち（本登録前。工程表 koujitei_pending_users と同じ）
create table staff_pending (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  name       text not null,
  role       text not null default 'member' check (role in ('admin','member')),
  created_at timestamptz default now()
);

-- 機械マスタ（高所作業車・重機。QR発行の対象。先行機能と共有）
create table equipment (
  id          text primary key,
  name        text not null,
  kind        text,                 -- 高所作業車 / 重機 など
  site_number text references nippo_sites(number) on delete set null,
  created_at  timestamptz default now()
);
```

> 注：`site_staff` と `equipment` は現状 `nippo_sites.number`（現場番号）で参照する。
> 既存データが現場番号で紐づく作りのため、それに合わせる。

### 招待→本登録のトリガ（案）

```sql
create function handle_new_user() returns trigger
  language plpgsql security definer as $$
begin
  insert into staff (id, name, role)
  select new.id, p.name, p.role
  from staff_pending p where p.email = new.email;
  delete from staff_pending where email = new.email;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

---

## 3. 書き込みモデルの変更

### 現在 → 移行後

```
現在：   管理者操作 → admin-write(PIN, service_role) → DB
         職人操作   → worker-write(匿名, service_role) → DB

移行後： 社員操作   → ログイン済みクライアント → RLSで許可判定 → DB   ★変更
         職人操作   → worker-write(匿名, service_role) → DB        （維持）
```

- **管理者・担当者の書き込み**は、ログイン済みSupabaseクライアントから直接行い、RLSで判定する。
  → **admin-write Edge Function と 管理者PIN は廃止**（`nippo_settings.admin_pin` も不要に）。
- **職人の匿名書き込み**は、RLSでは許可できない（匿名のため）ので
  **worker-write Edge Function を維持**（現状どおり `saveReport` のみ許可）。

---

## 4. RLSポリシー設計（案）

### 判定ヘルパー（RLS再帰を避けるため SECURITY DEFINER）

```sql
-- 管理者か
create function is_admin() returns boolean
  language sql security definer stable as $$
  select exists(select 1 from staff where id = auth.uid() and role = 'admin') $$;

-- その現場を編集できるか（管理者 or 担当者として割り当て済み）
create function can_edit_site(sn text) returns boolean
  language sql security definer stable as $$
  select is_admin() or exists(
    select 1 from site_staff where staff_id = auth.uid() and site_number = sn) $$;
```

### テーブル別ポリシー方針

| テーブル | 匿名(anon) | ログイン社員 | 書き込み |
|---------|-----------|-------------|---------|
| nippo_sites | 読取可※ | 全件読取 | **admin のみ**（現場マスタ管理） |
| nippo_vendors | 読取可※ | 全件読取 | 対象現場を編集可能な社員 |
| nippo_reports | 読取可※ | 全件読取 | `can_edit_site(site_number)` ＋ 職人はworker-write経由 |
| equipment | 読取可※ | 全件読取 | admin のみ |
| staff | **不可** | 全件読取（割り当てUI用） | admin のみ |
| site_staff | 不可 | 全件読取 | admin のみ |
| staff_pending | 不可 | admin のみ読取 | admin のみ |
| nippo_settings | 不可（現状） | 不可 | （PIN廃止後は空に） |

> ※ 匿名読取を残す理由：**職人のQR画面（worker.html）はログインせずに**現場・業者・
> 前回日報を読む必要があるため。現状の「匿名は読取のみ」の姿勢を踏襲する。
> 社員情報（staff / site_staff / pending）は匿名からは一切見せない。

---

## 5. 既存データの移行

| 対象 | 方針 |
|------|------|
| nippo_sites / vendors / reports | **そのまま**。現場・業者・日報マスタとして継続利用 |
| 既存の現場（奥長良川） | 初期の担当者割り当てを `site_staff` に登録（当面は管理者に割当） |
| admin_pin | 認証切替後に `nippo_settings` から削除 |
| 署名データ | 変更なし（reports.data 内に保持） |

既存日報には所有者情報がないが、現場番号で `site_staff` と突き合わせるため、
**日報そのものの移行は不要**。現場への担当者割り当てを登録するだけでよい。

---

## 6. 移行手順（無停止・本番稼働中）

職人の入力を止めずに、管理画面にログインを導入する段取り。

```
STEP 1  追加テーブル（staff / site_staff / staff_pending / equipment）と
        ヘルパー関数・トリガを作成。既存のanon読取・worker-writeはそのまま
        → この時点では現行アプリの挙動は一切変わらない
STEP 2  管理者アカウントを招待・作成。社員を招待。現場に担当者を割り当て
STEP 3  管理画面(admin/list/edit/genba/master)をログイン必須化し、
        書き込みを admin-write(PIN) → ログイン済みクライアント＋RLS に差し替え
        → 1デプロイで管理側だけ認証に移行。職人画面(worker.html)は無変更
STEP 4  動作確認後、admin-write Edge Function と admin_pin を廃止
```

- **職人のQR入力はSTEP1〜4を通じて無停止・無変更。**
- ロールバックは各STEPで可能（STEP3まではadmin-writeを残しておける）。

### STEP3の実装上の工夫（本番を壊さないため）

Edge Function は本番・プレビュー共通の1つのSupabaseに乗る。既存 `admin-write`(PIN) を
書き換えると本番が壊れるため、**JWT認証の新関数 `admin-auth` を別slugで追加**し、
feature ブランチのフロントだけがそれを呼ぶ。

- `admin-auth`：JWT検証＋`staff`の役割判定。admin=全操作、member=担当現場(`site_staff`)のみ。
  現場マスタ管理(saveSite/deleteSite/importAll)はadminのみ。書き込み自体はservice_role。
- 本番(main)は従来どおり `admin-write`(PIN) を使い続ける → **本番は無影響**。
- 認証切替はプレビューで検証し、問題なければ main にマージ。マージ時点で本番が
  `admin-auth`＋ログインに切り替わる。その後 `admin-write` と PIN を廃止（STEP4）。

---

## 7. フェーズ2（工程表統合）への布石

いま決めておく、将来のための設計上の配慮。

- `staff` は工程表の `koujitei_users` と同じ構造にしてある
  → 統合時はそのまま一本化できる。
- **認証プールはプロジェクト単位**。工程表（`kouzi-kouteihyou`）と本アプリ
  （`kouzi-nippo`）は別プロジェクトなので、統合までは**ログインは別々**になる。
  1プロジェクトに併合した時点で、社員ログインが完全に一本化される。
- 現場マスタ（nippo_sites）は、統合時に工程表の案件項目
  （工番・契約金額・工期・設計/営業/外注 等）を**吸収して拡張**する想定。
  フェーズ0では日報に必要な項目のみ、拡張余地を残して運用する。

---

## 8. 未決事項・要確認

- 社員の初期メンバーリスト（氏名・メール・役割）。
- 担当者が「自分の担当現場」を持たない状態での初期運用の扱い
  （当面は管理者が全現場を担当、で可）。
- 現場マスタの項目追加（元請・工番など）をフェーズ0で前倒しするか、フェーズ2まで待つか。

## 9. 実装着手時のタスク分解（概要）

1. 追加テーブル・関数・トリガのマイグレーション作成（STEP1）。
2. 管理者招待・社員招待のUI（master画面に社員管理を追加）。
3. ログイン画面の実装（Supabase Auth）。admin.htmlのPIN認証を置き換え。
4. storage.js の書き込み層を admin-write → ログイン済みクライアントへ移行。
5. RLSポリシー適用と、匿名読取・worker-write の維持確認。
6. admin-write / admin_pin の廃止（STEP4）。
