/**
 * OpenAI SSE 流式响应解析器
 * 支持多种 API 格式，包括 thinking + content 分离
 */

export interface ParsedChunk {
  type: "thinking" | "content" | "done"
  text: string
}

/**
 * 解析单行 SSE 数据
 * 支持多种格式，返回结构化数据
 */
export function parseSSELine(line: string): ParsedChunk | null {
  // 跳过空行和非数据行
  if (!line || !line.startsWith("data:")) return null

  // 提取 data: 后面的内容
  const dataStr = line.slice(5).trim()

  // 跳过结束标记
  if (dataStr === "[DONE]") {
    return { type: "done", text: "" }
  }
  if (!dataStr) return null

  try {
    const json = JSON.parse(dataStr)

    // OpenAI 格式: choices[0].delta.content / choices[0].delta.reasoning_content
    if (json.choices?.[0]?.delta) {
      const delta = json.choices[0].delta

      // 检查是否有 reasoning/thinking 内容（某些模型如 DeepSeek, Claude 等）
      if (delta.reasoning_content) {
        return { type: "thinking", text: delta.reasoning_content }
      }
      if (delta.thinking) {
        return { type: "thinking", text: delta.thinking }
      }

      // 正常内容
      if (delta.content) {
        return { type: "content", text: delta.content }
      }
    }

    // OpenAI 完整消息格式: choices[0].message.content
    if (json.choices?.[0]?.message?.content) {
      return { type: "content", text: json.choices[0].message.content }
    }

    // Gemini 格式: candidates[0].content.parts[0].text
    if (json.candidates?.[0]?.content?.parts) {
      const parts = json.candidates[0].content.parts
      for (const part of parts) {
        if (part.thought) {
          return { type: "thinking", text: part.thought }
        }
        if (part.text) {
          return { type: "content", text: part.text }
        }
      }
    }

    // 简化格式: 直接的 thinking 或 content 字段
    if (typeof json.thinking === "string" && json.thinking) {
      return { type: "thinking", text: json.thinking }
    }
    if (typeof json.content === "string" && json.content) {
      return { type: "content", text: json.content }
    }
    if (typeof json.text === "string" && json.text) {
      return { type: "content", text: json.text }
    }

    // 尝试获取 delta 中的任何文本内容
    if (json.delta?.text) {
      return { type: "content", text: json.delta.text }
    }

    return null
  } catch {
    // 如果不是 JSON，可能是纯文本
    if (dataStr && !dataStr.startsWith("{") && !dataStr.startsWith("[")) {
      return { type: "content", text: dataStr }
    }
    return null
  }
}

/**
 * 从 ReadableStream 读取并解析 SSE
 * 返回结构化的 thinking/content 数据
 */
export async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<ParsedChunk> {
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // 按行分割，SSE 使用 \n\n 或 \n 分隔事件
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() || ""

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      const chunk = parseSSELine(trimmedLine)
      if (chunk) {
        yield chunk
      }
    }
  }

  // 处理剩余的 buffer
  if (buffer.trim()) {
    const chunk = parseSSELine(buffer.trim())
    if (chunk) yield chunk
  }
}
