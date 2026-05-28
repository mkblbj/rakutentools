export const RMS_LOGIN_SUBMIT_DELAY_MS = 200
export const RAKUTEN_MEMBER_SUBMIT_DELAY_MS = 500
export const RAKUTEN_MEMBER_RETRY_INTERVAL_MS = 400

export const setInputValueAndNotify = (
  input: HTMLInputElement,
  value: string
) => {
  input.focus()

  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )?.set

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(input, value)
  } else {
    input.value = value
  }

  const tracker = (input as any)._valueTracker
  if (tracker) {
    tracker.setValue("")
  }

  input.dispatchEvent(new Event("input", { bubbles: true }))
  input.dispatchEvent(new Event("change", { bubbles: true }))
}
