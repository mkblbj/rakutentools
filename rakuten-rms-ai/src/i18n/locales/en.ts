import type { TranslationDict } from "./ja"

const en: TranslationDict = {
  // === Common ===
  "common.save": "Save Settings",
  "common.language": "Language",

  // === Options page ===
  "options.toolConfig": "Tool Configuration",
  "options.saveSuccess": "Saved successfully",
  "options.saveFail": "Failed to save",
  "options.promptEditor": "Prompt Editor",
  "options.defaultSuffix": "(Default)",
  "options.config": "{provider} Configuration",
  "options.currentDefault": "Current Default",
  "options.setDefault": "Set as Default",
  "options.tokenBudgetNoteLabel": "Token Budget Note",
  "options.tokenBudgetNote":
    '"Visible Output Tokens" only controls reply length. Thinking tokens are controlled by a separate parameter and do not compete with each other.',
  "options.apiKey": "API Key",
  "options.apiKeyFromOpenai": "Get from OpenAI Platform",
  "options.apiKeyFromGemini": "Get from Google AI Studio",
  "options.baseUrl": "Base URL",
  "options.fullRequestPath": "Full request path",
  "options.sdkAutoAppendNote":
    "SDK automatically appends /v1beta version path. Only enter the domain here.",
  "options.model": "Model",
  "options.fetchModels": "Fetch Model List",
  "options.fetchingModels": "Fetching...",
  "options.fetchedModels": "Fetched {count} models",
  "options.fetchFail": "Fetch failed",
  "options.fetchModelsFail": "Failed to fetch models",
  "options.enterApiKeyFirst": "Please enter {provider} API Key first",
  "options.visibleOutputTokens": "Visible Output Tokens",
  "options.reasoningEffort": "Reasoning Effort",
  "options.reasoningLow": "low (save tokens)",
  "options.reasoningMedium": "medium",
  "options.reasoningHigh": "high (deep thinking)",
  "options.reasoningNote":
    "Thinking tokens don't consume the output budget. Only effective for o-series models; others will automatically ignore this.",
  "options.testConnection": "Test Connection",
  "options.testing": "Testing...",
  "options.apiKeyMissing": "API Key is missing",
  "options.modelNotSelected": "Model not selected",
  "options.testSuccess": 'Connected: "{reply}"',
  "options.testFail": "Test failed",
  "options.commFail": "Communication failed",
  "options.thinkingBudget": "Thinking Budget",
  "options.thinkingOff": "Off",
  "options.thinkingMin1024Label": "Min 1024 (actual: {effectiveBudget})",
  "options.thinkingMinSlider": "0 → Min 1024",
  "options.thinkingOffSlider": "0 (Off)",
  "options.proModelNote":
    "Pro models force thinking on with min 1024. Actual API maxOutputTokens = visible({visible}) + thinking({thinking}) = {total}",
  "options.thinkingOnNote":
    "Actual API maxOutputTokens = visible({visible}) + thinking({thinking}) = {total}. Gemini's maxOutputTokens includes thinking tokens.",
  "options.thinkingOffNote":
    "Thinking is off. Recommended for review replies. When enabled, thinking tokens count toward the maxOutputTokens budget.",
  "options.selectModel": "Select model...",
  "options.fetchModelListFirst": "Please fetch model list first",
  "options.currentSuffix": "(current)",
  "options.customModelName": "Enter custom model name",
  "options.promptTitle": "Prompt Template Editor",
  "options.promptDesc": "Customize the prompt template for AI-generated replies",
  "options.reviewPromptLabel": "Review Reply Prompt",
  "options.resetDefault": "Reset to Default",
  "options.availableVars":
    "Available variables: {{review_content}}, {{rating}}, {{product_name}}",

  // === Popup ===
  "popup.subtitle": "AI Tools",
  "popup.pluginStatus": "Plugin Status",
  "popup.ready": "Ready",
  "popup.paused": "Paused",
  "popup.enabled": "Enabled",
  "popup.enabledStatus": "Enabled",
  "popup.pausedStatus": "Paused",
  "popup.notSet": "(Not set)",
  "popup.aiProvider": "AI Provider",
  "popup.currentModel": "Current Model",
  "popup.fullSettings": "Full Settings",

  // === Content Scripts ===
  "cs.aiReply": "UO AI Reply",
  "cs.abort": "Abort",
  "cs.aborted": "Aborted",
  "cs.replyBoxNotFound": "Reply box not found",
  "cs.reviewContainerNotFound": "Review container not found",
  "cs.reviewDataFetchFail": "Failed to fetch review data",
  "cs.confirmExistingReply":
    "This review already has a reply. Regenerate?",
  "cs.generating": "AI generating...",
  "cs.done": "Generation complete",
  "cs.failed": "Generation failed",
  "cs.commFail": "Communication failed",
  "cs.batchTitle": "UO AI Batch Reply",
  "cs.batchRunning": "Batch generating...",
  "cs.batchProgress": "Progress",
  "cs.batchSuccess": "Success",
  "cs.batchFail": "Failed",
  "cs.batchAbort": "Abort",
  "cs.batchCancel": "Cancel",
  "cs.batchGenerate": "Generate",
  "cs.batchNoTarget":
    "No reviews to process (all replied or no text area)",
  "cs.batchConfirm": "Generate AI replies for {count} unreplied reviews.",
  "cs.batchApiNote": "* API will be called {count} times.",
  "cs.batchFabTitle": "UO AI Batch Reply (unreplied only)",
  "cs.batchFabLabel": "Batch Reply",
  "cs.ok": "OK",
}

export default en
