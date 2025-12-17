# クイックスタートガイド

## 1. ビルド

```bash
# Chrome/Edge 用
pnpm build

# Firefox 用
pnpm build:firefox

# 両方
pnpm build:all
```

## 2. インストール

### Chrome/Edge

1. `chrome://extensions` または `edge://extensions` を開く
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」
4. `build/chrome-mv3-prod` フォルダを選択

### Firefox

1. `about:debugging#/runtime/this-firefox` を開く
2. 「一時的なアドオンを読み込む」
3. `build/firefox-mv2-prod/manifest.json` を選択

## 3. 初回設定

1. 拡張機能アイコンを右クリック → 「オプション」
2. PINコード（例: `1234`）を設定
3. 店舗情報を入力:
   - 店舗名: `マイショップ`
   - R-Login ID: `your-login-id`
   - R-Login パスワード: `your-login-password`
   - 楽天会員ユーザID: `your-user-id`
   - 楽天会員パスワード: `your-user-password`
4. 「保存」をクリック

## 4. 使用

1. 拡張機能アイコンをクリック
2. 店舗名をクリック
3. 自動ログイン開始！

## 5. データのバックアップ（推奨）

### エクスポート

1. オプションページを開く
2. PINコードを入力
3. 「エクスポート」をクリック
4. JSON ファイルがダウンロードされます

### インポート

1. オプションページを開く
2. PINコードを入力
3. 「インポート」をクリック
4. JSON ファイルを選択

## トラブルシューティング

### Q: ログインできない
A: オプションページで認証情報を再確認してください

### Q: 拡張機能が表示されない
A: ブラウザを再起動してみてください

### Q: Firefoxで再起動後に消える
A: 一時的なアドオンは再起動で削除されます。毎回読み込み直してください

## 開発モード

リアルタイムで変更を反映:

```bash
# Chrome
pnpm dev

# Firefox
pnpm dev:firefox
```

ブラウザに `build/chrome-mv3-dev` または `build/firefox-mv2-dev` を読み込んでください。
