# フロントエンド

このプロジェクトはのフロントエンド実装を含む Nuxt.js アプリケーションです。

## 技術スタック

- [Nuxt 3](https://nuxt.com/) - Vue.js ベースのフルスタックフレームワーク
- [TypeScript](https://www.typescriptlang.org/) - 型安全な JavaScript
- [Tailwind CSS](https://tailwindcss.com/) - ユーティリティファースト CSS フレームワーク

## 開発環境のセットアップ

### 必要条件

- Node.js 18.x 以上
- pnpm 10.x 以上

### インストール

```bash
pnpm install
```

## 開発サーバーの起動

開発サーバーは `http://localhost:3000` で起動します：

```bash
pnpm dev
```

## ビルドと本番環境

本番環境用のビルド：

```bash
pnpm build
```

ビルド結果のプレビュー：

```bash
pnpm preview
```

## プロジェクト構成

```
frontend/
├── components/     # 再利用可能なコンポーネント
├── pages/         # ルーティングに対応するページコンポーネント
├── layouts/       # レイアウトコンポーネント
├── public/        # 静的ファイル
├── assets/        # コンパイルが必要なアセット
└── composables/   # 共有可能なロジック
```

## 開発ガイドライン

- コンポーネントは機能単位で分割し、再利用可能な形で実装してください
- TypeScript の型定義を適切に行い、型安全性を確保してください
- コミットメッセージは[Conventional Commits](https://www.conventionalcommits.org/)の規約に従ってください

## 関連ドキュメント

- [Nuxt 3 ドキュメント](https://nuxt.com/docs)
- [Vue.js ドキュメント](https://vuejs.org/)
- [Tailwind CSS ドキュメント](https://tailwindcss.com/docs)
