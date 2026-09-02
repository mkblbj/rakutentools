# エクスポートファイル形式

## JSON ファイル構造

エクスポートされる JSON ファイルは以下の構造を持ちます：

```json
{
  "version": "0.2.0",
  "exportDate": "2025-12-14T08:30:00.000Z",
  "shops": [
    {
      "shopName": "店舗名1",
      "loginId": "r-login-id-1",
      "loginPass": "r-login-password-1",
      "userId": "rakuten-user-id-1",
      "userPass": "rakuten-user-password-1"
    },
    {
      "shopName": "店舗名2",
      "loginId": "r-login-id-2",
      "loginPass": "r-login-password-2",
      "userId": "rakuten-user-id-2",
      "userPass": "rakuten-user-password-2"
    }
  ],
  "ebayShops": [
    {
      "name": "eBayテスト店舗",
      "loginId": "seller@example.test",
      "password": "example-password"
    }
  ]
}
```

## フィールド説明

### ルートレベル

- `version` (string): エクスポート形式のバージョン
- `exportDate` (string): エクスポート日時（ISO 8601形式）
- `shops` (array): 店舗情報の配列（最大20件）
- `ebayShops` (array, optional): eBay Seller Hub の店舗情報（最大4件）。旧形式のインポートでは省略可能です。

### shops 配列の各要素

- `shopName` (string): 店舗名
- `loginId` (string): R-Login ID
- `loginPass` (string): R-Login パスワード
- `userId` (string): 楽天会員ユーザID
- `userPass` (string): 楽天会員パスワード

### ebayShops 配列の各要素

- `name` (string): eBay 店舗名
- `loginId` (string): eBay のメールアドレスまたはユーザー名
- `password` (string): eBay パスワード

`ebayShops` は最大4件をサポートします。ほかの認証情報と同様、これらの値は平文で保存されます。

## セキュリティに関する注意

⚠️ **重要**: エクスポートされた JSON ファイルには、すべてのログイン情報が**平文**で保存されます。

### 推奨事項

1. **ファイルの保管**

   - エクスポートファイルは安全な場所に保管してください
   - クラウドストレージに保存する場合は暗号化を推奨します

2. **共有**

   - このファイルを他人と共有しないでください
   - メールやチャットで送信しないでください

3. **バックアップ**

   - 定期的にバックアップを取ることを推奨します
   - バックアップファイルも安全に保管してください

4. **使用後**
   - 不要になったエクスポートファイルは安全に削除してください
   - ゴミ箱からも完全に削除することを推奨します

## 使用例

### バックアップ

```bash
# 定期的にバックアップを取る
# ファイル名: rms-login-data-2025-12-14.json
```

### 複数デバイス間での同期

1. デバイスAでエクスポート
2. 安全な方法でデバイスBに転送
3. デバイスBでインポート
4. 元のファイルを安全に削除

### マシン移行

1. 旧マシンでエクスポート
2. 新マシンに拡張機能をインストール
3. エクスポートファイルをインポート
4. 動作確認後、旧ファイルを削除
