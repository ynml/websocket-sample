# プロジェクト

このプロジェクトはウェブアプリケーションを実装したモノレポです。フロントエンド（Nuxt.js）、Node.js バックエンド、Python サーバーで構成されています。

## プロジェクト構成

```
node-app/
├── frontend/          # Nuxt.jsフロントエンドアプリケーション
├── python-server/     # Pythonバックエンドサーバー
├── public/           # 静的ファイル
└── server.js         # Node.jsバックエンドサーバー
```

## 開発環境のセットアップ

### 必要条件

- Node.js 18.x 以上
- Python 3.x
- npm 9.x 以上（または yarn/pnpm/bun）

### バックエンドのセットアップ

1. Node.js の依存関係をインストール:

```bash
pnpm install
```

2. Node.js サーバーの起動:

```bash
pnpm start
```

3. Python の依存関係をインストール:

```bash
cd python-server
pip install -r requirements.txt
```

4. Python サーバーの起動:

```bash
python app.py
```

### フロントエンドのセットアップ

フロントエンドの詳細な設定と実行方法については、[frontend/README.md](./frontend/README.md)を参照してください。

## 開発ガイドライン

- 各コンポーネントは独立して動作可能な形で実装してください
- API ドキュメントは常に最新の状態を維持してください
- コードレビューは必須とし、最低 1 人の承認を得てください
- コミットメッセージは[Conventional Commits](https://www.conventionalcommits.org/)の規約に従ってください

## アーキテクチャ概要

- フロントエンド: Nuxt.js（Vue 3 + TypeScript）
- メインバックエンド: Node.js
- 補助バックエンド: Python
- データベース: [使用している DB を記載]

## デプロイメント

[デプロイ手順や環境についての情報を記載]

## 貢献ガイド

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'feat: add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## トラブルシューティング

よくある問題と解決方法については[Wiki](リンク)を参照してください。

## ライセンス

[ライセンス情報を記載]
