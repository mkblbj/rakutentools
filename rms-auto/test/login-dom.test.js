const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const test = require("node:test")
const ts = require("typescript")
const vm = require("node:vm")

const helperPath = path.resolve(__dirname, "../lib/login-dom.ts")

const loadHelper = () => {
  const source = fs.readFileSync(helperPath, "utf8")
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    },
    fileName: helperPath
  })

  const module = { exports: {} }
  vm.runInNewContext(outputText, {
    Event,
    Object,
    console,
    exports: module.exports,
    module,
    require,
    window: globalThis.window
  })
  return module.exports
}

test("login timing constants stay conservative but faster than previous waits", () => {
  const helper = loadHelper()

  assert.equal(helper.RMS_LOGIN_SUBMIT_DELAY_MS, 200)
  assert.equal(helper.RAKUTEN_MEMBER_SUBMIT_DELAY_MS, 500)
  assert.equal(helper.RAKUTEN_MEMBER_RETRY_INTERVAL_MS, 400)
})

test("setInputValueAndNotify updates the native value and dispatches input/change", () => {
  class FakeInput extends EventTarget {
    constructor() {
      super()
      this.focusCalls = 0
      this._value = ""
      this._valueTracker = {
        lastValue: "old",
        setValue(value) {
          this.lastValue = value
        }
      }
    }

    focus() {
      this.focusCalls += 1
    }

    get value() {
      return this._value
    }

    set value(value) {
      this._value = value
    }
  }

  globalThis.window = { HTMLInputElement: FakeInput }
  const { setInputValueAndNotify } = loadHelper()
  const input = new FakeInput()
  const events = []

  input.addEventListener("input", (event) => events.push(event.type))
  input.addEventListener("change", (event) => events.push(event.type))

  setInputValueAndNotify(input, "shop-secret")

  assert.equal(input.value, "shop-secret")
  assert.equal(input.focusCalls, 1)
  assert.equal(input._valueTracker.lastValue, "")
  assert.deepEqual(events, ["input", "change"])
})
