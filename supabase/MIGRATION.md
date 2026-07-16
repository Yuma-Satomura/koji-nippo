# Supabase 移行手順

個人アカウントの相乗りプロジェクトから、会社アカウントの日報専用プロジェクトへ移す手順。

| | プロジェクト | リージョン |
|---|---|---|
| 移行元 | `paqqiuinklfsaeyqcfmm`（個人・`ai-eikaiwa` に相乗り） | ap-northeast-1 |
| 移行先 | `fzssrbinafcylqldtoiu`（会社・日報専用） | ap-northeast-1 |

移行元は AI英会話アプリ（`users` / `user_characters` / `conversations`）と工程管理アプリ（`koujitei_*`）が
同居しており、`nippo_*` 4テーブルだけがこのアプリのもの。移行先は日報専用。

## 移行しないもの

- **実データと管理者PIN** — このリポジトリは Public。データはアプリのエクスポート/インポート機能で
  ブラウザ経由で直接移す（手順5）。リポジトリには絶対に含めない。
- **DBに残っていたデモデータ**（`demo-site-001` / 業者 `v1`〜`v3` / `DEMO-001_2026-06-17`）— 旧実装の残骸。
  現在のデモモード（`?demo=1`）は `js/storage.js` の `DEMO_DATA` を使うため、DBには何も要らない。

## 手順

### 1. スキーマを適用

```bash
supabase link --project-ref fzssrbinafcylqldtoiu
supabase db push
```

### 2. Edge Function をデプロイ

```bash
supabase functions deploy admin-write  --no-verify-jwt
supabase functions deploy worker-write --no-verify-jwt
```

`--no-verify-jwt` は必須。両関数とも JWT 検証はオフで、代わりに自前で認証している。

- `admin-write` … `x-admin-pin` ヘッダのPINを `nippo_settings.admin_pin` と突き合わせて検証
- `worker-write` … 認証なし。ただし `saveReport` 以外は 403 で弾く（QRから来た職人が使うため）

ここで `--no-verify-jwt` を付け忘れると、全リクエストが 401 になり画面が動かない。

`SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` は Supabase が自動で注入するため、シークレット設定は不要。

### 3. 接続先を差し替え

`js/storage.js` の以下を移行先のものに変更する。anonキーは Settings → API Keys から取得。

- `SUPABASE_URL`
- `SUPABASE_KEY`（anonキー）
- `EDGE_BASE`

anonキーは公開前提（RLSで読み取りのみに制限済み）なので、リポジトリに入れて問題ない。
**service_role キーは絶対にクライアントへ置かない。**

### 4. 管理者PINを設定

新プロジェクトの `nippo_settings` は空。`admin.html` で初回ログインすると、
そのとき入力したPINが `admin_pin` として登録される（`admin-write` の `auth` アクション）。

つまり **移行後の初回アクセス時に誰でもPINを設定できてしまう**ため、
デプロイ後は速やかに管理者本人がログインしてPINを登録すること。

### 5. データを移行

1. 旧環境（個人）の `list.html` にログイン →「エクスポート」→ JSON がダウンロードされる
2. 新環境（会社）の `list.html` にログイン →「インポート」→ その JSON を選択

`{ sites, vendors, reports }` を `importAll` で upsert する。DBの行をそのまま往復するので変換は不要。

インポート後、DBに残っている旧デモデータが不要なら消す。

```sql
delete from nippo_reports where site_number = 'DEMO-001';
delete from nippo_vendors where site_number = 'DEMO-001';
delete from nippo_sites   where number      = 'DEMO-001';
```

### 6. 動作確認

- `list.html` … 日報一覧が表示される（読み取り = anon + RLS）
- `genba.html` … 現場を保存できる（書き込み = admin-write + PIN）
- `worker.html?site=...` … 職人入力を保存できる（書き込み = worker-write）
- `?demo=1` … DBを使わずサンプルデータで動く

### 7. 旧環境を止める

新環境が動いてから、個人アカウント側の Vercel プロジェクト `koji-nippo` を削除する。
削除すると `koji-nippo.vercel.app` が解放されるので、会社プロジェクトの Settings → Domains で取り直せる。

移行元プロジェクトの `nippo_*` テーブルも、しばらく様子を見てから削除する。

## 補足

- Supabase Free プランは1組織あたり2プロジェクトまで。会社組織は `kouzi-kouteihyou` と本プロジェクトで上限。
- Vercel Hobby プランは規約上、商用利用不可。現場へ本格展開する際は Pro を検討すること。
