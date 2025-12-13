import type { PlasmoCSConfig } from "plasmo"

// 匹配 Rakuten Review 页面
export const config: PlasmoCSConfig = {
  matches: ["https://review.rms.rakuten.co.jp/*"],
  all_frames: false,
}

console.log("UO Rakutentools: Review page content script loaded")

// TODO: Phase 4 - 实现按钮注入和交互逻辑

