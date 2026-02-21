import { useState } from "react"
import "../style.css"

function TestPage() {
  // Review fields
  const [reviewContent, setReviewContent] = useState("商品が期待以上で、大変満足しています。さらに、パッケージもとてもおしゃれで、届いた時に驚きと喜びがありました。")
  const [rating, setRating] = useState("5")
  const [productName, setProductName] = useState("テスト商品")
  
  // Common
  const [generatedReply, setGeneratedReply] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState("")
  const [testLogs, setTestLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setTestLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${message}`])
  }

  const generateReply = async () => {
    if (!reviewContent.trim()) {
      setError("内容を入力してください")
      return
    }

    setIsGenerating(true)
    setError("")
    setGeneratedReply("")
    addLog("🤖 レビュー回復生成を開始...")

    const startTime = Date.now()

    try {
      chrome.runtime.sendMessage(
        {
          action: "generate_reply",
          data: {
            type: "review",
            context: {
              reviewContent: reviewContent,
              rating: rating,
              productName: productName,
            },
          },
        },
        (response) => {
          const elapsed = Date.now() - startTime

          if (response.success) {
            setGeneratedReply(response.data)
            addLog(`✅ 生成成功 (${elapsed}ms)`)
          } else {
            setError(response.error || "生成に失敗しました")
            addLog(`❌ エラー: ${response.error}`)
          }
          setIsGenerating(false)
        }
      )
    } catch (err) {
      setError("通信エラーが発生しました")
      addLog(`❌ エラー: ${err}`)
      setIsGenerating(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedReply)
    addLog("📋 クリップボードにコピーしました")
  }

  const clearAll = () => {
    setReviewContent("")
    setRating("5")
    setProductName("")
    setGeneratedReply("")
    setError("")
  }

  const runSystemTest = async () => {
    setTestLogs([])
    addLog("🧪 システムテストを開始...")

    addLog("💾 テスト 1: Storage 確認...")
    chrome.storage.local.get(null, (items) => {
      addLog(`✅ Storage項目数: ${Object.keys(items).length}`)
      if (items.provider) {
        addLog(`✅ Provider: ${items.provider}`)
      }
      if (items.enabled !== undefined) {
        addLog(`✅ Enabled: ${items.enabled}`)
      }
    })

    addLog("📤 テスト 2: Background通信テスト...")
    chrome.runtime.sendMessage(
      {
        action: "generate_reply",
        data: {
          type: "review",
          context: { reviewContent: "テスト", rating: "5", productName: "テスト" },
        },
      },
      (response) => {
        if (response.success) {
          addLog("✅ Background通信成功")
        } else {
          addLog(`❌ Background通信失敗: ${response.error}`)
        }
        addLog("✨ システムテスト完了")
      }
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            UO Rakutentools - AI返信テスト
          </h1>
          <p className="text-sm text-gray-600">
            レビュー返信のAI生成をテストします
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Input Form */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                📝 レビュー情報入力
              </h2>

              <div className="space-y-4">
                {/* Product Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    商品名（オプション）
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例: テスト商品"
                  />
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    評価（星）
                  </label>
                  <div className="flex gap-2">
                    {["1", "2", "3", "4", "5"].map((r) => (
                      <button
                        key={r}
                        onClick={() => setRating(r)}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                          rating === r
                            ? "bg-yellow-500 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}>
                        {r}★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Review Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    レビュー内容
                  </label>
                  <textarea
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-sans"
                    placeholder="お客様のレビュー内容を入力してください"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    文字数: {reviewContent.length}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={generateReply}
                    disabled={isGenerating}
                    className="flex-1 px-6 py-3 rounded-lg font-medium transition-colors bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed">
                    {isGenerating ? "生成中..." : "🤖 返信を生成"}
                  </button>
                  <button
                    onClick={clearAll}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors">
                    クリア
                  </button>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">❌ {error}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sample Data */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                💡 サンプルレビュー
              </h2>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => {
                    setReviewContent("商品が期待以上で、大変満足しています。パッケージもおしゃれで驚きました。")
                    setRating("5")
                    setProductName("おしゃれな商品")
                  }}
                  className="p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg border transition-colors">
                  <p className="text-sm font-medium">⭐⭐⭐⭐⭐ 高評価</p>
                </button>
                <button
                  onClick={() => {
                    setReviewContent("娘様がとても喜んでいました。犬も興味津々で見ていて、家族様みんなで楽しめました。")
                    setRating("5")
                    setProductName("ファミリー向け商品")
                  }}
                  className="p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg border transition-colors">
                  <p className="text-sm font-medium">⭐⭐⭐⭐⭐ 敬称テスト</p>
                </button>
              </div>
            </div>

            {/* System Test */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                🧪 システムテスト
              </h2>
              <button
                onClick={runSystemTest}
                className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors">
                システムテストを実行
              </button>
            </div>
          </div>

          {/* Right: Output */}
          <div className="space-y-6">
            {/* Generated Reply */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800">
                  💬 生成された返信
                </h2>
                {generatedReply && (
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors">
                    📋 コピー
                  </button>
                )}
              </div>

              {generatedReply ? (
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                      {generatedReply}
                    </pre>
                  </div>
                  <div className="text-xs text-gray-500">
                    文字数: {generatedReply.length} 文字
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-400">
                  {isGenerating ? (
                    <div>
                      <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p>AI が返信を生成中...</p>
                    </div>
                  ) : (
                    <p>返信を生成するとここに表示されます</p>
                  )}
                </div>
              )}
            </div>

            {/* Logs */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800">📋 ログ</h2>
                <button
                  onClick={() => setTestLogs([])}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors">
                  クリア
                </button>
              </div>

              <div className="bg-gray-900 text-green-400 font-mono text-xs p-4 rounded-lg h-64 overflow-y-auto">
                {testLogs.length === 0 ? (
                  <div className="text-gray-500">ログがありません</div>
                ) : (
                  testLogs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TestPage
