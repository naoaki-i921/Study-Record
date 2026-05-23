# Study Record Project Overview

学習記録（Study Record）を管理するためのフルスタックアプリケーションです。バックエンドに NestJS、フロントエンドに Next.js を使用しています。

## プロジェクト構成

- `backend/`: NestJS によるサーバーサイド API
- `frontend/`: Next.js によるクライアントサイドアプリケーション

## 技術スタック

### バックエンド
- **Framework:** NestJS
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT (Passport.js)
- **Container:** Docker (PostgreSQL 用)

### フロントエンド
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Vanilla CSS (Custom Properties / CSS Variables)
- **Icons:** Lucide React

## 構築と実行

### データベースの起動
バックエンドで使用する PostgreSQL を Docker で起動します。
```bash
cd backend
docker-compose up -d
```
※ ポート 5433 で起動するように設定されています（`docker-compose.yml` 参照）。

### バックエンドの起動
```bash
cd backend
npm install
npx prisma migrate dev  # 初回のみ、またはスキーマ変更時
npm run start:dev
```
API はデフォルトで `http://localhost:3001` で動作します。

### フロントエンドの起動
```bash
cd frontend
npm install
npm run dev
```
アプリケーションは `http://localhost:3000` で動作します。

## 開発規約

### バックエンド
- NestJS の標準的なモジュール（Module）、コントローラー（Controller）、サービス（Service）のパターンに従います。
- Prisma スキーマは `backend/prisma/schema.prisma` で定義されています。
- 認証が必要なエンドポイントには `JwtAuthGuard` を使用します。

### フロントエンド
- Next.js の App Router (`src/app`) を使用しています。
- API 通信は `src/lib/api.ts` の `fetchAPI` 関数を通じて行います。
- スタイリングは `src/app/globals.css` で定義された変数を活用し、Vanilla CSS で記述します。

### 共通
- コードのフォーマットには Prettier、リンターには ESLint を使用しています。
- Git のコミットメッセージは日本語で、「feat: 機能追加」のような形式で記述してください。
