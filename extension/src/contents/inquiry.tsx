import type { PlasmoCSConfig } from "plasmo"

// 匹配 Rakuten R-Messe 页面
export const config: PlasmoCSConfig = {
  matches: ["https://rmesse.rms.rakuten.co.jp/*"],
  all_frames: false,
}

console.log("UO Rakutentools: Inquiry page content script loaded")

// TODO: Phase 4 - 实现按钮注入和交互逻辑

