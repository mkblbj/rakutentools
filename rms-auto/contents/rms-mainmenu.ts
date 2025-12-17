import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://mainmenu.rms.rakuten.co.jp/*"],
  all_frames: true
}

const autoClickConsent = () => {
  const inputs = document.querySelectorAll<HTMLInputElement>("input")

  if (inputs.length === 1) {
    const input = inputs[0]
    if (input.value === "上記を遵守していることを確認の上、RMSを利用します") {
      setTimeout(() => input.click(), 100)
    }
  }
}

// 等待 DOM 加载完成后执行
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", autoClickConsent)
} else {
  autoClickConsent()
}
