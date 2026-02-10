# AV Info Lab (MVP)

完全自動更新のアダルトビデオ情報サイトMVPです。FANZA作品を毎日2-3件自動取得・正規化・保存し、Next.jsで表示します。

DMMアフィリエイト審査待ちの間でも、トピック記事とランキング記事、週/月のまとめ記事の自動生成で日次更新が回る構成にしています。

## 主要コマンド

- `npm run ingest` 収集→正規化→DB保存まで一括実行
- `npm run dev` Next.js 開発サーバ

## セットアップ

1) 依存関係

```bash
npm install
```

2) 環境変数

`.env.local` を作成して以下を設定してください。

```
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

DMM_API_ID=YOUR_DMM_API_ID
DMM_AFFILIATE_ID=YOUR_AFFILIATE_ID
DMM_SITE=FANZA
DMM_SERVICE=digital
DMM_FLOOR=videoa
DMM_HITS_PER_RUN=3
DMM_SORT=date

# 公式APIがaffiliate_urlを返さない場合のフォールバック
# 公式仕様に合わせてテンプレを調整してください
DMM_AFFILIATE_URL_TEMPLATE={url}?aff_id={affiliate_id}

# 公式RSS (任意)
RSS_FEEDS=
RSS_MAX_ITEMS_PER_FEED=5

# APIリトライ/タイムアウト
FETCH_RETRIES=2
FETCH_TIMEOUT_MS=8000
FETCH_BACKOFF_MS=800

# 通知 (任意)
NOTIFY_WEBHOOK_URL=

# 公開時刻の配分 (任意)
PUBLISH_WINDOW_START=9
PUBLISH_WINDOW_END=23

# FANZA以外の自動トピック生成 (審査待ちでも運用可能)
TOPIC_DAILY_COUNT=26
TOPIC_SEED=2026-02-09

# ランキング記事 (審査待ちでも運用可能)
RANKING_SEED=2026-02-09

# 週間/月間まとめ (審査待ちでも運用可能)
SUMMARY_WEEKLY_KEY=2026-02-09
SUMMARY_MONTHLY_KEY=2026-02

# SEO用のサイトURL
SITE_URL=https://example.com
```

注意:
- `SUPABASE_SERVICE_ROLE_KEY` はサーバー専用で扱い、`NEXT_PUBLIC_` を付けて公開しないでください。
- FANZA公式RSSは地域制限があるため、利用可能な環境でRSSのURLを取得して `RSS_FEEDS` に設定してください。
- DMM/FANZA公式APIのパラメータ名は環境や契約によって異なる場合があります。
  `DMM_SERVICE_PARAM` と `DMM_FLOOR_PARAM` を使ってパラメータ名を切り替え可能です。

```
DMM_SERVICE_PARAM=service
DMM_FLOOR_PARAM=floor
```

## 実行

```bash
npm run ingest
npm run dev
```

- Supabase の `articles` テーブルに記事が保存されます。
- `/works/[WORK_CODE]` で作品ページが表示されます。
- `/topics/[yyyy-mm-dd]-[slug]` でトピック記事が表示されます。
- `/tags/[tag]` でタグ別の記事一覧が表示されます。

## スケジュール実行例

### ローカルcron

`crontab -e` に追加:

```
15 8 * * * cd /path/to/av-info && /usr/bin/env bash -lc "npm run ingest" >> logs/cron.log 2>&1
```

### GitHub Actions

`.github/workflows/ingest.yml`:

```yaml
name: ingest
on:
  schedule:
    - cron: "15 23 * * *" # JST 8:15
jobs:
  ingest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npm run ingest
        env:
          DMM_API_ID: ${{ secrets.DMM_API_ID }}
          DMM_AFFILIATE_ID: ${{ secrets.DMM_AFFILIATE_ID }}
          DMM_SITE: FANZA
          DMM_SERVICE: digital
          DMM_FLOOR: videoa
          DMM_HITS_PER_RUN: "3"
          DMM_SORT: date
          NOTIFY_WEBHOOK_URL: ${{ secrets.NOTIFY_WEBHOOK_URL }}
```

## ディレクトリ構成

- `src/fetchers/` ソース別Fetcher (raw取得のみ)
- `src/normalizers/` raw → Article Schema 変換
- `scripts/ingest.ts` 収集→正規化→保存のランナー
- `src/lib/db.ts` Supabase (PostgreSQL) 操作
- `supabase/schema.sql` Supabase テーブル作成用SQL

## 実装方針メモ

- 3レイヤー分離: Fetcher / Normalizer / Publisher
- Fetcher失敗は許容: `Promise.allSettled` で部分成功
- 重複排除: `slug` でupsert + `source_url`ユニーク制約
- affiliate_url 生成はテンプレ化 (公式仕様に合わせて調整)

## Supabase セットアップ

1) `supabase/schema.sql` を Supabase の SQL エディタで実行して `articles` テーブルとインデックスを作成。

2) RLS を有効にする場合は、`articles` の `select/insert/update` にポリシーを追加するか、
   サーバー側では `SUPABASE_SERVICE_ROLE_KEY` を使ってアクセスしてください。
