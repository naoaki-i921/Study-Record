# Project Architecture Reference

このプロジェクト（Study Record）の主要な構成と、学習のポイントをまとめています。

## バックエンド (NestJS)

- **ディレクトリ:** `backend/`
- **ORM:** Prisma (`backend/prisma/schema.prisma`)
- **認証:** JWT (Passport.js)
- **主要モジュール:**
  - `Auth`: ユーザー登録・ログイン
  - `StudyRecords`: 学習記録の CRUD
  - `Goals`: 目標設定と Todo 管理
  - `Categories`: 学習カテゴリーの管理

### 学習ポイント
- NestJS の依存性注入 (DI) の仕組み
- Guard による認可処理
- Prisma による型安全なデータベース操作

## フロントエンド (Next.js)

- **ディレクトリ:** `frontend/`
- **フレームワーク:** Next.js (App Router)
- **通信:** `src/lib/api.ts` の `fetchAPI` を使用
- **スタイリング:** Vanilla CSS (`globals.css` の変数を使用)

### 学習ポイント
- Server Components と Client Components の使い分け
- `fetch` による API 通信とエラーハンドリング
- CSS Variables を使ったデザインシステムの構築
