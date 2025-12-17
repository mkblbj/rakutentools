# プロジェクト概要

## RMS自動ログイン拡張機能 v0.1.1

楽天RMSのログインプロセスを自動化するクロスブラウザ拡張機能。
jQuery版から Plasmo Framework + React + TypeScript へ完全リライト。

---

## 📦 パッケージ情報

- **パッケージ名**: rms-auto-login
- **バージョン**: 0.1.1
- **フレームワーク**: Plasmo 0.90.5
- **UI**: React 18.2.0
- **言語**: TypeScript 5.3.3

---

## 🎯 主な機能

### ✅ 実装済み

1. **自動ログイン**
   - R-Login ID/パスワード自動入力
   - 楽天会員ID/パスワード自動入力
   - RMS利用規約の自動同意
   
2. **データ管理**
   - 最大20店舗の情報保存
   - PIN コードによる保護
   - JSONエクスポート/インポート機能 🆕

3. **マルチブラウザ対応**
   - Chrome (Manifest V3)
   - Firefox (Manifest V2)
   - Edge / Brave / その他 Chromium

---

## 📁 プロジェクト構成

```
rms-auto/
├── assets/               # アイコン画像
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── contents/            # Content Scripts
│   ├── rms-login.ts     # ログインページ用
│   └── rms-mainmenu.ts  # メインメニュー用
├── tabs/                # タブページ
│   └── login.tsx        # ログインリダイレクト
├── popup.tsx            # ポップアップUI
├── options.tsx          # 設定ページ
├── package.json         # 依存関係
└── tsconfig.json        # TypeScript設定

ドキュメント:
├── README.md            # メイン説明
├── QUICKSTART.md        # クイックスタート
├── INSTALL.md           # インストール手順
├── EXPORT_FORMAT.md     # エクスポート形式
├── VERSION_HISTORY.md   # バージョン履歴
└── PROJECT_SUMMARY.md   # このファイル
```

---

## 🚀 ビルド & インストール

### ビルド

```bash
# Chrome/Edge
pnpm build

# Firefox
pnpm build:firefox

# 両方
pnpm build:all
```

### 出力

- `build/chrome-mv3-prod/` - Chrome用 (約512KB)
- `build/firefox-mv2-prod/` - Firefox用 (約512KB)

### インストール

詳細は `INSTALL.md` を参照

---

## 🔐 セキュリティ機能

1. **PIN コード保護**
   - 設定の変更には PIN 必須
   - エクスポート/インポートにも PIN 必須

2. **ローカルストレージ**
   - すべてのデータはローカルに保存
   - 外部サーバーへの送信なし

3. **エクスポートセキュリティ**
   - ⚠️ エクスポートファイルは平文
   - 安全な場所に保管必須
   - 詳細は `EXPORT_FORMAT.md` を参照

---

## 📊 技術的な詳細

### アーキテクチャ

```
┌─────────────┐
│   Popup     │ - 店舗選択UI
└──────┬──────┘
       │
┌──────▼──────┐
│   Storage   │ - 認証情報保存
└──────┬──────┘
       │
┌──────▼──────────────────┐
│  Content Scripts        │
│  - rms-login.ts         │ - 自動入力
│  - rms-mainmenu.ts      │ - 自動同意
└─────────────────────────┘
```

### データフロー

1. ユーザーがポップアップで店舗選択
2. `tabs/login.tsx` がRMSログインページへリダイレクト
3. `contents/rms-login.ts` がストレージから認証情報取得
4. 自動入力 & 送信
5. `contents/rms-mainmenu.ts` が利用規約に自動同意

---

## 🆕 新機能: エクスポート/インポート

### エクスポート機能

```typescript
// 出力形式
{
  "version": "0.1.1",
  "exportDate": "2025-12-14T...",
  "shops": [/* 店舗データ配列 */]
}
```

### 使用例

```bash
# バックアップ
1. オプションページを開く
2. PIN入力 → エクスポート
3. rms-login-data-2025-12-14.json がダウンロード

# リストア
1. オプションページを開く
2. PIN入力 → インポート → ファイル選択
3. 確認ダイアログでOK
```

詳細: `EXPORT_FORMAT.md`

---

## 🔧 開発モード

```bash
# Chrome 開発モード
pnpm dev

# Firefox 開発モード
pnpm dev:firefox
```

- ホットリロード対応
- `build/*-dev/` にビルド出力

---

## 📝 TODO / 今後の改善案

### 機能拡張

- [ ] エクスポートファイルの暗号化
- [ ] 複数PIN対応（店舗ごと）
- [ ] ログイン履歴の記録
- [ ] 自動ログアウト設定

### UI改善

- [ ] ダークモード対応
- [ ] 多言語対応（英語版）
- [ ] より詳細なエラーメッセージ

### 技術的改善

- [ ] E2Eテストの追加
- [ ] CI/CDパイプライン
- [ ] Chrome Web Store / AMO への公開

---

## 🤝 貢献

バグ報告や機能要望は Issue でお願いします。

---

## 📄 ライセンス

MIT License

---

## 📞 サポート

- バグ報告: GitHub Issues
- ドキュメント: プロジェクトルートの各 `.md` ファイル
- クイックスタート: `QUICKSTART.md`

---

## 📈 バージョン情報

現行版: **v0.1.1** (2025-12-14)

- ✨ エクスポート/インポート機能追加
- ✅ Plasmo Framework 移行完了
- ✅ マルチブラウザ対応

詳細: `VERSION_HISTORY.md`
