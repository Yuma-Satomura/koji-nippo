# 工事日報管理システム

現場の紙ベース日報をデジタル化する、建設現場向けの日報管理Webアプリです。

**🔗 管理者デモ：** https://koji-nippo.vercel.app/list.html?demo=1

> ログイン不要・サンプルデータで全機能を体験できます。変更は保存されません。  
> 管理画面（日報一覧・編集・現場管理・業者マスタ）を閲覧・操作できます。

---

## 概要

複数の建設現場で使用する工事日報を、スマートフォンとPCの両方から入力・管理できるシステムです。職人はQRコードをスキャンするだけで入力でき、管理者はPIN認証でデータを管理します。

## 主な機能

| 機能 | 説明 |
|------|------|
| **QRコード入力** | 現場ごとのQRコードを読み取り、職人がスマホから直接入力 |
| **当日・次回入力** | 当日の作業報告（署名含む）と次回の作業予定を個別に登録 |
| **作業予定ビュー** | 翌日以降の業者・人数・作業内容を一覧で確認 |
| **前回累計自動計算** | 休工日をまたいでも各業者の累計人数を正確に引き継ぎ |
| **PDF出力** | 1件または複数日報をまとめてA4 PDFへ出力 |
| **複数現場対応** | 現場ごとにQRコード・業者マスタ・日報を独立管理 |
| **データ同期** | Supabaseをバックエンドに使用し、複数デバイス間でリアルタイム同期 |

## 画面構成

```
admin.html   管理者ログイン（PINコード認証）
list.html    日報一覧・翌日作業予定ビュー
edit.html    日報編集
genba.html   現場管理・QRコード発行
master.html  業者マスタ管理
worker.html  職人入力画面（QRコードからアクセス）
```

## 技術スタック

| カテゴリ | 技術 |
|----------|------|
| フロントエンド | Vanilla HTML / CSS / JavaScript（フレームワークなし） |
| バックエンド | Supabase（PostgreSQL + Edge Functions） |
| ホスティング | Vercel（静的サイト） |
| PDF生成 | jsPDF + html2canvas |
| QRコード | QRCode.js |
| 署名 | Canvas API（自作SignaturePadクラス） |

## セキュリティ設計

```
読み取り：ブラウザ → Supabase（anonキー、SELECT のみ許可）
管理者書き込み：ブラウザ → Edge Function（PIN検証）→ Supabase（service_role）
職人書き込み：ブラウザ → Edge Function（saveReport のみ許可）→ Supabase
```

- Supabase RLS により、anonキーでの書き込みを完全ブロック
- すべての書き込みはEdge Functionを経由し、サービスロールキーはクライアントに非公開
- 管理者PINはサーバーサイドで検証（初回ログイン時に登録）

## ディレクトリ構成

```
├── index.html          トップ（admin.htmlへリダイレクト）
├── admin.html          管理者ログイン
├── list.html           日報一覧・作業予定
├── edit.html           日報編集
├── genba.html          現場管理
├── master.html         業者マスタ
├── worker.html         職人入力
├── css/
│   └── style.css       スタイル
└── js/
    ├── storage.js      データアクセス層（Supabase REST API）
    ├── auth.js         PIN認証
    ├── app.js          共通ユーティリティ
    ├── signature.js    署名パッド
    └── pdf.js          PDF出力
```

## ローカル起動

```bash
# 任意のHTTPサーバーで起動（例）
npx serve .
# または
python3 -m http.server 8080
```

> Supabaseの接続先はすでに設定済みです。PIN未設定の場合、初回ログイン時に任意のPINを設定してください。
