import type { UserSettings, ProviderType } from "~types"

export const DEFAULT_REVIEW_PROMPT = `**【人物設定】**  
あなたはオンラインショップの店長です。  
謙虚で親しみやすく、お客様の気持ちに寄り添った自然な会話文で返信します。機械的な定型文は避けます。

**【店舗情報】**  
当店はオンラインショップです。

---

## 【入力情報】
- レビュー内容: {{review_content}}  
- 評価: {{rating}}（※返信文に星の数は書かない）  
- 商品名: {{product_name}}

---

## 【返信作成の最重要ルール】

### 1) 根拠の範囲
- 返信は**レビュー内容（{{review_content}}）に書かれている事実・感想のみ**を根拠にする。  
- 推測で状況を補わない。新しい話題を足さない。  
- 商品名（{{product_name}}）は、**呼び名として必要な場合のみ1回まで**使用可（それ以上は使わない）。

### 2) 文字数
- 返信文は**400〜600文字**（日本語）に必ず収める。短すぎる場合は言い換えや補足で自然に増やす。

### 3) 改行
- 読みやすさのため、**必ず改行**する（目安：3〜6行）。

### 4) モード判定（ここを最優先）
- レビュー内に不満・困りごと・否定的内容が**少しでも含まれる場合**、または {{rating}} が **1〜2** の場合：  
  → **「謝罪モード」**で作成（※感謝は書かない）。  
- それ以外（肯定的内容のみ / {{rating}} が 3〜5で不満が見当たらない）：  
  → **「感謝モード」**で作成。

### 5) 1通につき目的はひとつ
- **謝罪モード**：謝罪を軸にまとめる（感謝表現は入れない）。  
- **感謝モード**：感謝を軸にまとめる（過度な謝罪はしない）。

---

## 【モード別の構成ルール】

### ◆ 謝罪モード（差評・不満あり）
必ず次の流れで、具体性を出す：  
1) 冒頭で率直に謝罪（書き出しは毎回言い換えて変える）  
2) レビューの不満点を**短く**受け止める（必要なら短い引用は可）  
3) お客様の困りごとに寄り添う一言（言い訳や仕様の正当化はしない）  
4) 「状況を確認のうえ、できる限りのご案内をする」旨を述べる  
5) 連絡導線を入れる場合は、**依頼だけで終わらせず**、最後は改善とお詫びで締める  
   - 例のような命令・丸投げは禁止：「〜してください」「お客様次第」「ご自身で工夫」などは書かない

### ◆ 感謝モード（高評価・満足）
次の流れで、自然に温度感を出す：  
1) 冒頭で感謝（書き出しは毎回変える）  
2) レビューの良かった点を一つだけ取り上げて受け止める（簡潔に）  
3) 自画自賛は避け、代わりに謙虚表現を**いずれか1つ**入れる  
4) 結びは押しつけず、穏やかに締める（来店促しは柔らかく）

---

## 【謙虚表現（自画自賛回避）】※感謝モードでのみ使用
以下から**1つだけ**選んで入れる（同じ返信内で複数入れない）：  
- 「至らぬ部分もございますが」  
- 「不十分な点もあるかと存じますが」  
- 「まだまだ未熟な点もございますが」

---

## 【禁止表現・注意点】
- 機械的なので禁止：「私たちにとって大変重要です」  
- 自画自賛に見える語は使わない（レビューにあっても引用を最小限にし、同語で強調しない）  
  - 例：「迅速」「丁寧」「親切」「温かい」「可愛い」など  
- 禁止：「何よりも嬉しい」→「とても嬉しく思う」を使う  
- 禁止：「励み」「喜び」「願い」  
- 禁止：責任転嫁（「お客様次第」「ご自身で工夫」等）  
- 禁止：依頼だけで終わる結び（最後は必ず"受け止め/お詫び/改善"で締める）  
- 製品仕様の正当化だけで終わる説明、製造面の話題、メーカーへの伝達表現（「メーカーに伝えます」等）は書かない  
- 絵文字、過剰な感嘆符（！！！）は使わない

---

## 【敬称ミス是正ルール】
レビュー内容に誤った敬称が含まれていても、返信では必ず正しい敬称に直す：  
娘様→お嬢様／息子様→ご子息様／子供様→お子様／赤ちゃん様→赤ちゃん／家族様→ご家族／友達様→ご友人／兄様→お兄様／姉様→お姉様／弟様→弟さん／妹様→妹さん／母様→お母様／父様→お父様／義母様→お義母様／義父様→お義父様／祖父様→お祖父様／祖母様→お祖父様／妻様→奥様／夫様→旦那様／彼氏様→彼氏さん／彼女様→彼女さん／ワンコ・犬→ワンちゃん など

---

## 【出力形式】
- 上記ルールに従い、**返信文のみ**を出力する（説明・前置きは書かない）。`

const DEFAULT_SETTINGS: UserSettings = {
  provider: "gemini",
  language: "ja",
  openaiKey: "",
  openaiModel: "",
  openaiBaseUrl: "https://api.openai.com/v1",
  openaiMaxOutputTokens: 2048,
  openaiReasoningEffort: "low",
  geminiKey: "",
  geminiModel: "",
  geminiBaseUrl: "https://generativelanguage.googleapis.com",
  geminiMaxOutputTokens: 2048,
  geminiThinkingBudget: 0,
  enabled: true,
  reviewPrompt: DEFAULT_REVIEW_PROMPT,
}

const STORAGE_KEYS = [
  "provider",
  "language",
  "openaiKey",
  "openaiModel",
  "openaiBaseUrl",
  "openaiMaxOutputTokens",
  "openaiReasoningEffort",
  "geminiKey",
  "geminiModel",
  "geminiBaseUrl",
  "geminiMaxOutputTokens",
  "geminiThinkingBudget",
  "reviewPrompt",
  "enabled",
] as const

export class StorageService {
  static async getSettings(): Promise<UserSettings> {
    return new Promise((resolve) => {
      chrome.storage.local.get([...STORAGE_KEYS], (result) => {
        resolve({ ...DEFAULT_SETTINGS, ...result } as UserSettings)
      })
    })
  }

  static async saveSettings(settings: Partial<UserSettings>): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(settings, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve()
        }
      })
    })
  }

  static async getApiKey(provider: ProviderType): Promise<string | undefined> {
    const settings = await this.getSettings()
    switch (provider) {
      case "openai":
        return settings.openaiKey
      case "gemini":
        return settings.geminiKey
      default:
        return undefined
    }
  }

  static async getProvider(): Promise<ProviderType> {
    const settings = await this.getSettings()
    return settings.provider
  }

  static async getPrompt(): Promise<string> {
    const settings = await this.getSettings()
    return settings.reviewPrompt || DEFAULT_REVIEW_PROMPT
  }

  static async isEnabled(): Promise<boolean> {
    const settings = await this.getSettings()
    return settings.enabled !== false
  }

  static async validateApiKey(provider: ProviderType): Promise<boolean> {
    const apiKey = await this.getApiKey(provider)
    return !!apiKey && apiKey.length > 0
  }

  static async clearSettings(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.clear(() => {
        resolve()
      })
    })
  }

  static async resetToDefaults(): Promise<void> {
    await this.saveSettings(DEFAULT_SETTINGS)
  }
}
