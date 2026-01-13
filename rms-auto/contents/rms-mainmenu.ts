import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://mainmenu.rms.rakuten.co.jp/*"],
  all_frames: true
}

const autoClickConsent = () => {
  console.log("[RMS Mainmenu] Checking for consent button")
  
  // 方法1: 通过类名查找（最可靠）
  const buttonByClass = document.querySelector<HTMLButtonElement>(
    "button.btn-reset.btn-round.btn-red"
  )
  if (buttonByClass) {
    const text = buttonByClass.textContent?.trim() || ""
    console.log("[RMS Mainmenu] Found button by class, text:", text)
    if (text.includes("遵守") && text.includes("RMSを利用します")) {
      console.log("[RMS Mainmenu] Clicking consent button (by class)")
      setTimeout(() => buttonByClass.click(), 500)
      return
    }
  }
  
  // 方法2: 检查所有按钮，通过文本匹配
  const buttons = document.querySelectorAll<HTMLElement>(
    "button, input[type='button'], input[type='submit']"
  )
  console.log("[RMS Mainmenu] Found buttons:", buttons.length)
  
  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i]
    const text = (btn.textContent || (btn as HTMLInputElement).value || "").trim()
    console.log(`[RMS Mainmenu] Button ${i}:`, text.substring(0, 50))
    
    if (text.includes("遵守") && text.includes("RMSを利用します")) {
      console.log("[RMS Mainmenu] Clicking consent button (by text match)")
      setTimeout(() => btn.click(), 500)
      return
    }
  }
  
  // 方法3: 检查 input（旧版兼容）
  const inputs = document.querySelectorAll<HTMLInputElement>("input")
  console.log("[RMS Mainmenu] Found inputs:", inputs.length)
  
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i]
    const value = input.value || ""
    console.log(`[RMS Mainmenu] Input ${i}:`, value.substring(0, 50))
    if (value.includes("遵守") && value.includes("RMSを利用します")) {
      console.log("[RMS Mainmenu] Clicking consent input")
      setTimeout(() => input.click(), 500)
      return
    }
  }
  
  console.log("[RMS Mainmenu] Consent button not found")
}

// 等待 DOM 加载完成后执行，并多次尝试
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("[RMS Mainmenu] DOMContentLoaded event")
    setTimeout(autoClickConsent, 300)
  })
} else {
  console.log("[RMS Mainmenu] DOM already loaded")
  setTimeout(autoClickConsent, 300)
}

// 页面完全加载后再次尝试
window.addEventListener("load", () => {
  console.log("[RMS Mainmenu] Window load event")
  setTimeout(autoClickConsent, 800)
})
