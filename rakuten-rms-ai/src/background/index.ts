import type { GenerateRequest, GenerateResponse, ReviewContext, StartChatStreamRequest, StreamChunk } from "~types"
import { StorageService } from "~services/storage"
import { ModelFactory } from "~services/providers"

// Background Service Worker
console.log("UO Rakutentools Background Service Worker started")

// 监听安装事件
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed:", details.reason)

  // 初始化默认设置
  if (details.reason === "install") {
    StorageService.resetToDefaults().catch(console.error)
  }
})

// 存储活跃的流式连接，用于中断
const activeStreams = new Map<string, AbortController>()

// 处理流式聊天的 Port 长连接
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "chat_stream") return

  console.log("🔌 Chat stream port connected")

  port.onMessage.addListener(async (request: StartChatStreamRequest) => {
    if (request.action !== "start_chat_stream") return

    const streamId = `stream-${Date.now()}`
    const abortController = new AbortController()
    activeStreams.set(streamId, abortController)

    // 发送 streamId 以便客户端可以请求中断
    port.postMessage({ type: "stream_id", streamId } as StreamChunk & { streamId: string })

    try {
      const provider = await ModelFactory.createStreamProvider(request.data.model)
      console.log(`🤖 开始流式聊天 - 模型: ${provider.getModel()}`)

      const stream = provider.generateReplyStream(
        request.data.messages,
        abortController.signal
      )

      for await (const chunk of stream) {
        if (abortController.signal.aborted) {
          console.log("⚠️ 流式响应被中断")
          break
        }

        // 根据 chunk 类型发送不同的消息
        if (chunk.type === "thinking") {
          port.postMessage({ type: "thinking", thinking: chunk.text } as StreamChunk)
        } else if (chunk.type === "content") {
          port.postMessage({ type: "chunk", content: chunk.text } as StreamChunk)
        }
        // done 类型在循环结束后处理
      }

      port.postMessage({ type: "done" } as StreamChunk)
      console.log("✅ 流式聊天完成")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误"
      console.error("❌ 流式聊天错误:", errorMessage)
      port.postMessage({ type: "error", error: errorMessage } as StreamChunk)
    } finally {
      activeStreams.delete(streamId)
    }
  })

  // 处理中断请求
  port.onDisconnect.addListener(() => {
    console.log("🔌 Chat stream port disconnected")
    // 中断所有该 port 关联的流
    activeStreams.forEach((controller) => controller.abort())
  })
})

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received message:", request)

  if (request.action === "generate_reply") {
    handleGenerateReply(request.data as GenerateRequest)
      .then((response) => {
        sendResponse(response)
      })
      .catch((error) => {
        console.error("Error generating reply:", error)
        sendResponse({
          success: false,
          error: error.message || "生成回复失败",
        } as GenerateResponse)
      })

    // 返回 true 表示异步响应
    return true
  }

  // 处理中断流式请求
  if (request.action === "abort_chat_stream") {
    const streamId = request.streamId
    const controller = activeStreams.get(streamId)
    if (controller) {
      controller.abort()
      activeStreams.delete(streamId)
      sendResponse({ success: true })
    } else {
      sendResponse({ success: false, error: "Stream not found" })
    }
    return true
  }

  return false
})

/**
 * 处理生成回复请求
 */
async function handleGenerateReply(
  request: GenerateRequest
): Promise<GenerateResponse> {
  try {
    // 1. 检查插件是否启用
    const isEnabled = await StorageService.isEnabled()
    if (!isEnabled) {
      throw new Error("插件已暂停")
    }

    // 2. 获取当前 Provider 和 API Key
    const provider = await StorageService.getProvider()
    console.log("🔍 当前选择的 Provider:", provider)
    
    const hasApiKey = await StorageService.validateApiKey(provider)
    
    if (!hasApiKey) {
      throw new Error(`请先配置 ${provider === "openai" ? "OpenAI" : provider === "gemini" ? "Gemini" : provider === "zenmux" ? "ZenMux" : "Custom"} API Key`)
    }

    // 3. 获取 Review Prompt 模板
    const promptTemplate = await StorageService.getPrompt()

    // 4. 替换变量
    const prompt = buildPrompt(promptTemplate, request.context)

    // 5. 创建 Provider 并调用 AI
    const llmProvider = await ModelFactory.createCurrentProvider()
    console.log("🚀 开始调用 AI Provider:", provider)
    
    const reply = await llmProvider.generateReply(prompt)
    
    console.log("✅ AI 回复生成成功，Provider:", provider)

    return {
      success: true,
      data: reply,
    }
  } catch (error) {
    console.error("Generate reply error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    }
  }
}

/**
 * 构建 Prompt（替换变量）
 */
function buildPrompt(
  template: string,
  context: ReviewContext
): string {
  return template
    .replace(/\{\{review_content\}\}/g, context.reviewContent || "")
    .replace(/\{\{rating\}\}/g, context.rating || "5")
    .replace(/\{\{product_name\}\}/g, context.productName || "")
    .replace(/\{\{buyer_name\}\}/g, context.buyerName || "")
}

export {}
