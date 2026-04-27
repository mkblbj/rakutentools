import type { GenerateRequest, GenerateResponse, ReviewContext, StartChatStreamRequest, StreamChunk } from "~types"
import { StorageService, DEFAULT_REVIEW_PROMPT } from "~services/storage"
import { buildReviewMessages } from "~services/review-prompt"
import { ModelFactory } from "~services/providers"
import { stripTrailingMeta } from "~utils/text-cleanup"
import { getSeasonalContext } from "~utils/seasonal"

console.log("評価返信AI Background Service Worker started")

chrome.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed:", details.reason)
  if (details.reason === "install") {
    StorageService.resetToDefaults().catch(console.error)
  }
})

const activeStreams = new Map<string, AbortController>()

function createStreamId(prefix: string): string {
  const randomPart = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${Date.now()}-${randomPart}`
}

function handleStreamPort(port: chrome.runtime.Port, getMessages: (request: any) => Array<{ role: string; content: string }> | null) {
  const portStreamIds = new Set<string>()

  port.onMessage.addListener(async (request: any) => {
    const messages = getMessages(request)
    if (!messages) return

    const streamId = createStreamId("stream")
    const abortController = new AbortController()
    activeStreams.set(streamId, abortController)
    portStreamIds.add(streamId)

    port.postMessage({ type: "stream_id", streamId })

    try {
      const provider = await ModelFactory.createCurrentProvider()

      const stream = provider.generateReplyStream(messages, abortController.signal)

      for await (const chunk of stream) {
        if (abortController.signal.aborted) break

        if (chunk.type === "thinking") {
          port.postMessage({ type: "thinking", thinking: chunk.thinking } as StreamChunk)
        } else if (chunk.type === "chunk") {
          port.postMessage({ type: "chunk", content: chunk.content } as StreamChunk)
        }
      }

      port.postMessage({ type: "done" } as StreamChunk)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误"
      console.error(`Stream error on ${port.name}:`, errorMessage)
      port.postMessage({ type: "error", error: errorMessage } as StreamChunk)
    } finally {
      activeStreams.delete(streamId)
      portStreamIds.delete(streamId)
    }
  })

  port.onDisconnect.addListener(() => {
    for (const streamId of portStreamIds) {
      const controller = activeStreams.get(streamId)
      if (controller) controller.abort()
      activeStreams.delete(streamId)
    }
    portStreamIds.clear()
  })
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "chat_stream") {
    handleStreamPort(port, (request: StartChatStreamRequest) => {
      if (request.action !== "start_chat_stream") return null
      return request.data.messages
    })
    return
  }

  if (port.name === "review_stream") {
    handleReviewStreamPort(port)
    return
  }
})

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "generate_reply") {
    handleGenerateReply(request.data as GenerateRequest)
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "生成回复失败",
        } as GenerateResponse)
      })
    return true
  }

  if (request.action === "abort_chat_stream") {
    const controller = activeStreams.get(request.streamId)
    if (controller) {
      controller.abort()
      activeStreams.delete(request.streamId)
      sendResponse({ success: true })
    } else {
      sendResponse({ success: false, error: "Stream not found" })
    }
    return true
  }

  if (request.action === "test_model") {
    handleTestModel(request.provider)
      .then(sendResponse)
      .catch((error) => {
        sendResponse({ success: false, error: error instanceof Error ? error.message : "测试失败" })
      })
    return true
  }

  if (request.action === "fetch_models") {
    handleFetchModels(request.provider)
      .then(sendResponse)
      .catch((error) => {
        sendResponse({ success: false, error: error instanceof Error ? error.message : "获取模型失败" })
      })
    return true
  }

  return false
})

function handleReviewStreamPort(port: chrome.runtime.Port) {
  const portStreamIds = new Set<string>()

  port.onMessage.addListener(async (request: { action: string; context: ReviewContext }) => {
    if (request.action !== "start_review_stream") return

    const streamId = createStreamId("review")
    const abortController = new AbortController()
    activeStreams.set(streamId, abortController)
    portStreamIds.add(streamId)

    port.postMessage({ type: "stream_id", streamId })

    try {
      const settings = await StorageService.getSettings()
      if (!settings.enabled) throw new Error("插件已暂停")

      const hasApiKey = await StorageService.validateApiKey(settings.provider)
      if (!hasApiKey) {
        throw new Error(`请先配置 ${settings.provider === "openai" ? "OpenAI" : "Gemini"} API Key`)
      }

      const promptTemplate = settings.reviewPrompt || DEFAULT_REVIEW_PROMPT
      const seasonal = settings.seasonalReplyEnabled ? getSeasonalContext() : undefined
      const messages = buildReviewMessages({
        template: promptTemplate,
        context: request.context,
        seasonal,
      })

      const provider = await ModelFactory.createCurrentProvider()
      const stream = provider.generateReplyStream(messages, abortController.signal)

      for await (const chunk of stream) {
        if (abortController.signal.aborted) break
        if (chunk.type === "thinking") {
          port.postMessage({ type: "thinking", thinking: chunk.thinking } as StreamChunk)
        } else if (chunk.type === "chunk") {
          port.postMessage({ type: "chunk", content: chunk.content } as StreamChunk)
        }
      }

      port.postMessage({ type: "done" } as StreamChunk)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误"
      port.postMessage({ type: "error", error: errorMessage } as StreamChunk)
    } finally {
      activeStreams.delete(streamId)
      portStreamIds.delete(streamId)
    }
  })

  port.onDisconnect.addListener(() => {
    for (const streamId of portStreamIds) {
      const controller = activeStreams.get(streamId)
      if (controller) controller.abort()
      activeStreams.delete(streamId)
    }
    portStreamIds.clear()
  })
}

async function handleGenerateReply(request: GenerateRequest): Promise<GenerateResponse> {
  try {
    const settings = await StorageService.getSettings()
    if (!settings.enabled) throw new Error("插件已暂停")

    const hasApiKey = await StorageService.validateApiKey(settings.provider)
    if (!hasApiKey) {
      throw new Error(`请先配置 ${settings.provider === "openai" ? "OpenAI" : "Gemini"} API Key`)
    }

    const promptTemplate = settings.reviewPrompt || DEFAULT_REVIEW_PROMPT
    const seasonal = settings.seasonalReplyEnabled ? getSeasonalContext() : undefined
    const messages = buildReviewMessages({
      template: promptTemplate,
      context: request.context,
      seasonal,
    })

    const provider = await ModelFactory.createCurrentProvider()
    const reply = await provider.generateReplyMessages(messages)

    return { success: true, data: stripTrailingMeta(reply) }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    }
  }
}

async function handleTestModel(providerType?: string): Promise<{ success: boolean; reply?: string; error?: string }> {
  try {
    const provider = providerType
      ? await ModelFactory.createProvider(providerType as "openai" | "gemini")
      : await ModelFactory.createCurrentProvider()
    const reply = await provider.generateReply("Say 'OK' in one word.")
    return { success: true, reply: reply.slice(0, 200) }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "测试失败",
    }
  }
}

async function handleFetchModels(providerType?: string): Promise<{ success: boolean; models?: string[]; error?: string }> {
  try {
    const provider = providerType
      ? await ModelFactory.createProvider(providerType as "openai" | "gemini")
      : await ModelFactory.createCurrentProvider()
    const models = await provider.fetchModels()
    return { success: true, models }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取模型失败",
    }
  }
}

export {}
