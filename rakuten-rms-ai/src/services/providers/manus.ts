import type { LLMProvider, ProviderConfig } from "~types"

/**
 * Manus AI Provider
 * https://open.manus.im/docs/openai-compatibility
 * 使用 OpenAI Responses API 兼容模式（异步任务 + 轮询）
 */
export class ManusProvider implements LLMProvider {
  private apiKey: string
  private baseURL: string
  private model: string
  private maxPollAttempts: number
  private pollInterval: number

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey
    this.baseURL = "https://api.manus.im"
    this.model = config.model || "manus-1.6"
    this.maxPollAttempts = 60 // 最多轮询 60 次
    this.pollInterval = 3000 // 每 3 秒轮询一次
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async generateReply(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Manus API Key 未配置")
    }

    console.log(`🤖 创建 Manus 任务 - 模型: ${this.model}`)

    try {
      // Step 1: 创建任务
      const createResponse = await fetch(`${this.baseURL}/v1/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "API_KEY": this.apiKey
        },
        body: JSON.stringify({
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: prompt
                }
              ]
            }
          ],
          task_mode: "agent",
          agent_profile: this.model
        })
      })

      if (!createResponse.ok) {
        const error = await createResponse.json().catch(() => ({}))
        throw new Error(
          error.error?.message || error.message || `创建任务失败: ${createResponse.status}`
        )
      }

      const taskData = await createResponse.json()
      const taskId = taskData.id

      if (!taskId) {
        throw new Error("创建任务失败：未返回 task ID")
      }

      console.log(`📋 Manus 任务已创建: ${taskId}, 状态: ${taskData.status}`)
      console.log(`🔗 任务链接: ${taskData.metadata?.task_url || 'N/A'}`)

      // Step 2: 轮询等待任务完成
      let attempts = 0
      let currentStatus = taskData.status

      while (currentStatus === "running" || currentStatus === "pending") {
        if (attempts >= this.maxPollAttempts) {
          throw new Error(`任务超时（等待 ${(this.maxPollAttempts * this.pollInterval) / 1000} 秒后仍未完成）`)
        }

        await this.sleep(this.pollInterval)
        attempts++

        console.log(`⏳ 轮询任务状态 (${attempts}/${this.maxPollAttempts})...`)

        const statusResponse = await fetch(`${this.baseURL}/v1/responses/${taskId}`, {
          method: "GET",
          headers: {
            "API_KEY": this.apiKey
          }
        })

        if (!statusResponse.ok) {
          throw new Error(`查询任务状态失败: ${statusResponse.status}`)
        }

        const statusData = await statusResponse.json()
        currentStatus = statusData.status

        console.log(`📊 任务状态: ${currentStatus}`)

        if (currentStatus === "completed") {
          // Step 3: 提取结果
          const output = statusData.output
          if (!output || !Array.isArray(output)) {
            throw new Error("任务完成但无输出")
          }

          // 找到最后一条 assistant 消息
          const assistantMessages = output.filter((msg: any) => msg.role === "assistant")
          if (assistantMessages.length === 0) {
            throw new Error("任务完成但无 assistant 回复")
          }

          const lastAssistant = assistantMessages[assistantMessages.length - 1]
          const content = lastAssistant.content

          // 提取文本内容
          let resultText = ""
          if (Array.isArray(content)) {
            for (const item of content) {
              if (item.type === "output_text" || item.text) {
                resultText += (item.text || "") + "\n"
              }
            }
          } else if (typeof content === "string") {
            resultText = content
          }

          resultText = resultText.trim()

          if (!resultText) {
            throw new Error("任务完成但回复内容为空")
          }

          console.log(`✅ Manus 任务完成 - 模型: ${this.model}, 长度: ${resultText.length} 字符`)

          return resultText
        } else if (currentStatus === "error") {
          throw new Error("任务执行失败")
        }
      }

      throw new Error(`任务状态异常: ${currentStatus}`)
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Manus API 调用失败: ${error.message}`)
      }
      throw error
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // 简单测试 API 连通性
      const response = await fetch(`${this.baseURL}/v1/tasks?limit=1`, {
        method: "GET",
        headers: {
          "API_KEY": this.apiKey
        }
      })
      return response.ok
    } catch {
      return false
    }
  }
}

