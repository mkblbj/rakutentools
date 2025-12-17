# RMS自動ログイン拡張機能

楽天RMS（Rakuten Merchant Server）のログインを自動化するブラウザ拡張機能です。

## 機能

- 複数店舗のログイン情報を保存（最大20店舗）
- R-Login認証の自動入力
- 楽天会員認証の自動入力
- RMS利用規約の自動同意
- PIN コードによる設定の保護
- **データのエクスポート/インポート機能**（JSON形式）

## 対応ブラウザ

- Google Chrome
- Mozilla Firefox
- Microsoft Edge
- その他 Chromium ベースのブラウザ

## 開発

### 前提条件

- Node.js 18+
- pnpm

### セットアップ

```bash
pnpm install
```

### 開発モード

Chrome 用:
```bash
pnpm dev
```

Firefox 用:
```bash
pnpm dev:firefox
```

### ビルド

Chrome 用:
```bash
pnpm build
```

Firefox 用:
```bash
pnpm build:firefox
```

全ブラウザ:
```bash
pnpm build:all
```

ビルドされたファイルは `build/` ディレクトリに出力されます。

## インストール

### Chrome / Edge

1. `chrome://extensions` を開く
2. 「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `build/chrome-mv3-dev` フォルダを選択

### Firefox

1. `about:debugging#/runtime/this-firefox` を開く
2. 「一時的なアドオンを読み込む」をクリック
3. `build/firefox-mv2-dev/manifest.json` を選択

## 使用方法

### 初回設定

1. 拡張機能のオプションページを開く
2. PIN コードを設定
3. 店舗情報（R-Login ID、パスワード、楽天会員ID、パスワード）を入力
4. 保存ボタンをクリック

### ログイン

1. 拡張機能のポップアップから店舗を選択してログイン

### データのエクスポート

1. オプションページを開く
2. PIN コードを入力
3. 「エクスポート」ボタンをクリック
4. JSON ファイルがダウンロードされます

### データのインポート

1. オプションページを開く
2. PIN コードを入力
3. 「インポート」ボタンをクリック
4. エクスポートした JSON ファイルを選択
5. 確認ダイアログで「OK」をクリック

## セキュリティ

- すべての認証情報はローカルストレージに保存されます
- PIN コードで設定を保護できます
- 設定の変更には PIN コードの入力が必要です

## ライセンス

MIT

## 技術スタック

- [Plasmo Framework](https://www.plasmo.com/)
- React
- TypeScript
- Chrome Extension API
