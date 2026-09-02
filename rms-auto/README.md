# RMS自動ログイン拡張機能

楽天RMS（Rakuten Merchant Server）のログインを自動化するブラウザ拡張機能です。

## 機能

- 複数店舗のログイン情報を保存（最大20店舗）
- R-Login認証の自動入力
- 楽天会員認証の自動入力
- RMS利用規約の自動同意
- PIN コードによる設定の保護
- **データのエクスポート/インポート機能**（JSON形式）
- **内網 JSON による多端末只読同期**
- eBay Seller Hub の独立4アカウント設定
- 現在の eBay アカウントを Sign out して順次ログイン
- SMS、Passkey、画像認証が表示された場合は手動操作へ移行

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

### eBay Seller Hub

1. オプションページで最大4件の eBay アカウントを設定
2. ポップアップから店舗名を選択
3. 既存の eBay セッションがあれば Sign out
4. メールアドレスまたはユーザー名とパスワードを自動入力
5. SMS、Passkey、Authenticator、画像認証は手動で完了

同じブラウザでは eBay Cookie を共有するため、複数アカウントは同時ログインではなく順次切り替えで使用します。

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

### 内網同期

1. オプションページで PIN コードを入力
2. 「遠端只読同期」を有効にする
3. 内網で参照できる JSON アドレスを入力して保存
4. 設定ページまたはポップアップを開くたびに自動同期

同期用 JSON は既存のエクスポート形式と同じ構造です。同期が有効な間はローカル編集・インポート・削除はロックされ、遠端 JSON が共有設定の唯一の元データになります。

## セキュリティ

- すべての認証情報はローカルストレージに保存されます
- 同期有効時は内網 JSON を取得してローカルキャッシュへ反映します
- PIN コードで設定を保護できます
- 設定の変更には PIN コードの入力が必要です

## ライセンス

MIT

## 技術スタック

- [Plasmo Framework](https://www.plasmo.com/)
- React
- TypeScript
- Chrome Extension API
