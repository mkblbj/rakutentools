const ja = {
  // === Common ===
  "common.save": "設定を保存",
  "common.language": "言語",

  // === Options page ===
  "options.toolConfig": "ツール配置",
  "options.saveSuccess": "保存しました",
  "options.saveFail": "保存に失敗しました",
  "options.promptEditor": "Prompt エディタ",
  "options.defaultSuffix": "（デフォルト）",
  "options.config": "{provider} 設定",
  "options.currentDefault": "現在のデフォルト",
  "options.setDefault": "デフォルトに設定",
  "options.tokenBudgetNoteLabel": "トークン予算の説明",
  "options.tokenBudgetNote":
    "「可視出力トークン」は返信の長さだけを制御します。思考トークンは独立パラメータで制御され、互いに影響しません。",
  "options.apiKey": "API Key",
  "options.apiKeyFromOpenai": "OpenAI Platform から取得",
  "options.apiKeyFromGemini": "Google AI Studio から取得",
  "options.baseUrl": "Base URL",
  "options.fullRequestPath": "完全なリクエストパス",
  "options.sdkAutoAppendNote":
    "SDK が自動的に /v1beta バージョンパスを追加するため、ここにはドメインのみ入力してください",
  "options.model": "モデル",
  "options.fetchModels": "モデル一覧を取得",
  "options.fetchingModels": "取得中...",
  "options.fetchedModels": "{count} 個のモデルを取得しました",
  "options.fetchFail": "取得に失敗しました",
  "options.fetchModelsFail": "モデル取得に失敗しました",
  "options.enterApiKeyFirst": "{provider} の API Key を先に入力してください",
  "options.visibleOutputTokens": "可視出力トークン",
  "options.reasoningEffort": "思考深度 (reasoning_effort)",
  "options.reasoningLow": "low（トークン節約）",
  "options.reasoningMedium": "medium",
  "options.reasoningHigh": "high（深い思考）",
  "options.reasoningNote":
    "思考トークンは出力予算を占有しません。o シリーズモデルのみ有効、他のモデルでは自動的に無視されます。",
  "options.testConnection": "接続テスト",
  "options.testing": "テスト中...",
  "options.apiKeyMissing": "API Key が未入力です",
  "options.modelNotSelected": "モデルが未選択です",
  "options.testSuccess": '接続成功: "{reply}"',
  "options.testFail": "テストに失敗しました",
  "options.commFail": "通信に失敗しました",
  "options.thinkingBudget": "思考予算 (thinkingBudget)",
  "options.thinkingOff": "オフ",
  "options.thinkingMin1024Label": "最低 1024（実際: {effectiveBudget}）",
  "options.thinkingMinSlider": "0 → 最低 1024",
  "options.thinkingOffSlider": "0（オフ）",
  "options.proModelNote":
    "Pro モデルは思考を強制的にオンにし、最低 1024 です。API 実際の maxOutputTokens = 可視({visible}) + 思考({thinking}) = {total}",
  "options.thinkingOnNote":
    "API 実際の maxOutputTokens = 可視({visible}) + 思考({thinking}) = {total}。Gemini の maxOutputTokens には思考トークンが含まれます。",
  "options.thinkingOffNote":
    "思考はオフです。レビュー返信にはこの設定を推奨します。オンにすると思考トークンが maxOutputTokens の総予算に計上されます。",
  "options.selectModel": "モデルを選択...",
  "options.fetchModelListFirst": "先にモデル一覧を取得してください",
  "options.currentSuffix": "（現在）",
  "options.customModelName": "カスタムモデル名を入力",
  "options.promptTitle": "Prompt テンプレート編集",
  "options.promptDesc": "AI 返信生成のプロンプトテンプレートをカスタマイズ",
  "options.reviewPromptLabel": "レビュー返信 Prompt",
  "options.resetDefault": "デフォルトに戻す",
  "options.availableVars":
    "使用可能な変数: {{review_content}}, {{rating}}, {{product_name}}",

  // === Popup ===
  "popup.subtitle": "AI ツール",
  "popup.pluginStatus": "プラグイン状態",
  "popup.ready": "準備完了",
  "popup.paused": "一時停止中",
  "popup.enabled": "有効",
  "popup.enabledStatus": "有効になりました",
  "popup.pausedStatus": "一時停止中",
  "popup.notSet": "（未設定）",
  "popup.aiProvider": "AI Provider",
  "popup.currentModel": "現在のモデル",
  "popup.fullSettings": "詳細設定",

  // === Content Scripts ===
  "cs.aiReply": "UO AI 返信",
  "cs.abort": "中断",
  "cs.aborted": "中断しました",
  "cs.replyBoxNotFound": "返信ボックスが見つかりません",
  "cs.reviewContainerNotFound": "レビューコンテナが見つかりません",
  "cs.reviewDataFetchFail": "レビューデータの取得に失敗しました",
  "cs.confirmExistingReply":
    "このレビューには既に返信があります。再生成しますか？",
  "cs.generating": "AI 生成中...",
  "cs.done": "生成完了",
  "cs.failed": "生成失敗",
  "cs.commFail": "通信失敗",
  "cs.batchTitle": "UO AI 一括返信",
  "cs.batchRunning": "一括生成中...",
  "cs.batchProgress": "進捗",
  "cs.batchSuccess": "成功",
  "cs.batchFail": "失敗",
  "cs.batchAbort": "中断する",
  "cs.batchCancel": "キャンセル",
  "cs.batchGenerate": "生成する",
  "cs.batchNoTarget":
    "対象のレビューがありません（すべて返信済み、またはテキストエリアなし）",
  "cs.batchConfirm": "未返信 {count} 件に AI 返信を生成します。",
  "cs.batchApiNote": "※ API を {count} 回呼び出します。",
  "cs.batchFabTitle": "UO AI 一括返信（未返信のみ）",
  "cs.batchFabLabel": "一括返信",
  "cs.ok": "OK",
} as const

export type TranslationKey = keyof typeof ja
export type TranslationDict = Record<TranslationKey, string>
export default ja
