const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const test = require("node:test")
const ts = require("typescript")
const vm = require("node:vm")

const loadTsModule = (relativePath) => {
  const filePath = path.resolve(__dirname, "..", relativePath)
  const source = fs.readFileSync(filePath, "utf8")
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    },
    fileName: filePath
  })
  const module = { exports: {} }
  vm.runInNewContext(outputText, {
    Date,
    Object,
    URL,
    console,
    exports: module.exports,
    module,
    require
  })
  return module.exports
}

const plain = (value) => JSON.parse(JSON.stringify(value))
const config = loadTsModule("lib/config.ts")

test("legacy data receives four empty eBay shops", () => {
  const normalized = plain(config.normalizeExportData({ shops: [] }))

  assert.equal(config.EBAY_SHOP_COUNT, 4)
  assert.deepEqual(normalized.ebayShops, [
    { name: "", loginId: "", password: "" },
    { name: "", loginId: "", password: "" },
    { name: "", loginId: "", password: "" },
    { name: "", loginId: "", password: "" }
  ])
})

test("eBay shops are sanitized, padded, truncated and exported", () => {
  const normalized = plain(
    config.normalizeExportData({
      shops: [],
      ebayShops: [
        { name: "One", loginId: "one@example.test", password: "one-pass" },
        { name: 2, loginId: null, password: false },
        {
          name: "Three",
          loginId: "three@example.test",
          password: "three-pass"
        },
        { name: "Four", loginId: "four@example.test", password: "four-pass" },
        { name: "Five", loginId: "five@example.test", password: "five-pass" }
      ]
    })
  )

  assert.equal(normalized.ebayShops.length, 4)
  assert.deepEqual(normalized.ebayShops[1], {
    name: "",
    loginId: "",
    password: ""
  })
  assert.equal(config.isCompleteEbayShop(normalized.ebayShops[0]), true)
  assert.equal(config.isCompleteEbayShop(normalized.ebayShops[1]), false)

  const exported = plain(
    config.buildExportData({
      shops: [],
      mercariLinks: [],
      aupayShops: [],
      temuShops: [],
      ebayShops: normalized.ebayShops
    })
  )
  assert.equal(exported.version, "0.2.0")
  assert.equal(exported.ebayShops.length, 4)
})

test("login tasks validate phases and expire after ten minutes", () => {
  let login
  try {
    login = loadTsModule("lib/ebay-login.ts")
  } catch {
    assert.fail("lib/ebay-login.ts must provide the login task behavior")
  }
  const now = 1_000_000
  const task = login.createEbayLoginTask(2, now)

  assert.deepEqual(plain(task), {
    shopIndex: 2,
    phase: "start",
    startedAt: now
  })
  assert.equal(login.canSubmitIdentifier(task), true)
  assert.equal(login.canSubmitPassword(task), false)
  assert.equal(
    login.canSubmitPassword(
      login.withEbayLoginPhase(task, "identifierSubmitted")
    ),
    true
  )
  assert.equal(
    login.isEbayLoginCompletionPhase(login.withEbayLoginPhase(task, "manual")),
    true
  )
  assert.equal(
    login.isEbayLoginTaskExpired(task, now + login.EBAY_LOGIN_TIMEOUT_MS - 1),
    false
  )
  assert.equal(
    login.isEbayLoginTaskExpired(task, now + login.EBAY_LOGIN_TIMEOUT_MS),
    true
  )
  assert.equal(login.normalizeEbayLoginTask({ phase: "bad" }), null)
  assert.equal(
    login.normalizeEbayLoginTask({
      shopIndex: 0,
      phase: "start",
      startedAt: Infinity
    }),
    null
  )
})

test("normal password controls are language independent and challenge aware", () => {
  const login = loadTsModule("lib/ebay-login.ts")

  assert.equal(
    login.isEbayNormalPasswordPageSignals({
      passwordVisible: true,
      signInVisible: true,
      hasManualChallenge: false
    }),
    true
  )
  assert.equal(
    login.isEbayNormalPasswordPageSignals({
      passwordVisible: true,
      signInVisible: true,
      hasManualChallenge: true
    }),
    false
  )
  assert.equal(
    login.isEbayNormalPasswordPageSignals({
      passwordVisible: false,
      signInVisible: true,
      hasManualChallenge: false
    }),
    false
  )
  assert.equal(
    login.isEbayNormalPasswordPageSignals({
      passwordVisible: true,
      signInVisible: false,
      hasManualChallenge: false
    }),
    false
  )
})

test("eBay sign-in page action prioritizes switch account over hidden identifier remnants", () => {
  const login = loadTsModule("lib/ebay-login.ts")
  const cases = [
    {
      name: "start normal password page switches account before identifier remnants",
      signals: {
        phase: "start",
        hasNormalPasswordPage: true,
        identifierVisible: true,
        continueVisible: true,
        hasManualChallenge: false
      },
      expected: "switchAccount"
    },
    {
      name: "signing out normal password page switches account",
      signals: {
        phase: "signingOut",
        hasNormalPasswordPage: true,
        identifierVisible: false,
        continueVisible: false,
        hasManualChallenge: false
      },
      expected: "switchAccount"
    },
    {
      name: "submitted identifier normal password page submits password",
      signals: {
        phase: "identifierSubmitted",
        hasNormalPasswordPage: true,
        identifierVisible: false,
        continueVisible: false,
        hasManualChallenge: false
      },
      expected: "submitPassword"
    },
    {
      name: "visible identifier page submits identifier",
      signals: {
        phase: "start",
        hasNormalPasswordPage: false,
        identifierVisible: true,
        continueVisible: true,
        hasManualChallenge: false
      },
      expected: "submitIdentifier"
    },
    {
      name: "hidden identifier or continue controls do nothing",
      signals: {
        phase: "start",
        hasNormalPasswordPage: false,
        identifierVisible: false,
        continueVisible: false,
        hasManualChallenge: false
      },
      expected: "none"
    },
    {
      name: "manual challenge does not choose an automatic action",
      signals: {
        phase: "start",
        hasNormalPasswordPage: true,
        identifierVisible: true,
        continueVisible: true,
        hasManualChallenge: true
      },
      expected: "none"
    },
    {
      name: "manual phase does not choose an automatic action",
      signals: {
        phase: "manual",
        hasNormalPasswordPage: true,
        identifierVisible: true,
        continueVisible: true,
        hasManualChallenge: false
      },
      expected: "none"
    }
  ]

  for (const { name, signals, expected } of cases) {
    assert.equal(login.getEbaySignInPageAction(signals), expected, name)
  }
})

test("eBay switch-account finder accepts the live prefixed control", () => {
  const login = loadTsModule("lib/ebay-login.ts")

  assert.equal(typeof login.findEbaySwitchAccountControl, "function")

  const switchAccount = {
    id: "switch-account-anchor",
    innerText: "Current user is seller@example.test.\nSwitch account",
    textContent: "Current user is seller@example.test.Switch account",
    getClientRects: () => [{}],
    style: { display: "block", visibility: "visible", opacity: "1" }
  }
  const root = {
    querySelector: (selector) =>
      selector === "#switch-account-anchor" ? switchAccount : null,
    querySelectorAll: () => []
  }

  assert.equal(
    login.findEbaySwitchAccountControl(root, (element) => element.style),
    switchAccount
  )
})

test("current eBay header account and sign-out controls are recognized", () => {
  const login = loadTsModule("lib/ebay-login.ts")

  assert.equal(typeof login.findEbayAccountMenuControl, "function")
  assert.equal(typeof login.findEbaySignOutControl, "function")

  const accountMenu = {
    tagName: "BUTTON",
    className: "gh-flyout__target gh-flyout__target--left",
    getAttribute: (name) =>
      name === "aria-controls" ? "account-dialog" : null,
    getClientRects: () => [{}],
    style: { display: "block", visibility: "visible", opacity: "1" }
  }
  const signOut = {
    tagName: "A",
    getAttribute: (name) =>
      name === "href"
        ? "https://signin.ebay.com/ws/eBayISAPI.dll?SignIn&lgout=1&sgfl=gh"
        : null,
    getClientRects: () => [{}],
    style: { display: "block", visibility: "visible", opacity: "1" }
  }
  const root = {
    querySelectorAll: (selector) => {
      if (selector.includes("gh-flyout__target--left")) return [accountMenu]
      if (selector.includes("lgout=1")) return [signOut]
      return []
    }
  }
  const getComputedStyle = (element) => element.style

  assert.equal(
    login.findEbayAccountMenuControl(root, getComputedStyle),
    accountMenu
  )
  assert.equal(login.findEbaySignOutControl(root, getComputedStyle), signOut)
})

test("eBay manual challenge signals only block visible challenge controls", () => {
  const login = loadTsModule("lib/ebay-login.ts")
  const cases = [
    {
      name: "hidden verify/challenge wrapper does not block password submission",
      signal: { visible: false, id: "verify-challenge" },
      expected: false
    },
    {
      name: "visible ordinary Use a passkey button blocks password submission",
      signal: { visible: true, text: "Use a passkey" },
      expected: true
    },
    {
      name: "visible authenticator iframe blocks password submission",
      signal: {
        visible: true,
        src: "https://signin.ebay.com/authenticator/challenge"
      },
      expected: true
    },
    {
      name: "visible SMS verification heading blocks password submission",
      signal: { visible: true, text: "Confirm by SMS" },
      expected: true
    },
    {
      name: "visible OTP code control blocks password submission",
      signal: { visible: true, id: "security-code", name: "otp" },
      expected: true
    },
    {
      name: "visible normal password and sign-in controls do not block submission",
      signal: {
        visible: true,
        id: "pass",
        name: "password",
        text: "Sign in"
      },
      expected: false
    }
  ]

  for (const { name, signal, expected } of cases) {
    assert.equal(login.isEbayManualChallengeSignal(signal), expected, name)
  }
})

test("eBay manual challenge DOM boundary collects visible wrappers and controls", () => {
  const login = loadTsModule("lib/ebay-login.ts")
  const createElement = ({
    tagName = "DIV",
    id = "",
    className = "",
    text = "",
    attributes = {},
    display = "block",
    visibility = "visible",
    opacity = "1",
    hasRect = true
  } = {}) => ({
    tagName,
    id,
    textContent: text,
    getAttribute: (name) => {
      if (name === "class") return className || null
      return attributes[name] ?? null
    },
    getClientRects: () => (hasRect ? [{}] : []),
    style: { display, visibility, opacity }
  })
  const createRoot = (candidates) => ({
    querySelectorAll: (selector) =>
      candidates.flatMap(({ selectorPart, element }) =>
        selector.includes(selectorPart) ? [element] : []
      )
  })
  const getComputedStyle = (element) => element.style
  const cases = [
    {
      name: "hidden verify wrapper does not block",
      root: createRoot([
        {
          selectorPart: "[id*='verify' i]",
          element: createElement({ id: "verify-challenge", display: "none" })
        }
      ]),
      expected: false
    },
    {
      name: "visible verify wrapper blocks",
      root: createRoot([
        {
          selectorPart: "[id*='verify' i]",
          element: createElement({ id: "verify-challenge" })
        }
      ]),
      expected: true
    },
    {
      name: "visible captcha class wrapper blocks",
      root: createRoot([
        {
          selectorPart: "[class*='captcha' i]",
          element: createElement({ className: "captcha-container" })
        }
      ]),
      expected: true
    },
    {
      name: "visible g-recaptcha wrapper blocks",
      root: createRoot([
        {
          selectorPart: "[class*='captcha' i]",
          element: createElement({ className: "g-recaptcha" })
        }
      ]),
      expected: true
    },
    {
      name: "visible captchaContainer wrapper blocks",
      root: createRoot([
        {
          selectorPart: "[id*='captcha' i]",
          element: createElement({ id: "captchaContainer" })
        }
      ]),
      expected: true
    },
    {
      name: "visible verifyChallenge wrapper blocks",
      root: createRoot([
        {
          selectorPart: "[id*='verify' i]",
          element: createElement({ id: "verifyChallenge" })
        }
      ]),
      expected: true
    },
    {
      name: "visible challenge_wrapper blocks",
      root: createRoot([
        {
          selectorPart: "[class*='challenge' i]",
          element: createElement({ className: "challenge_wrapper" })
        }
      ]),
      expected: true
    },
    {
      name: "hidden captchaContainer wrapper does not block",
      root: createRoot([
        {
          selectorPart: "[id*='captcha' i]",
          element: createElement({ id: "captchaContainer", display: "none" })
        }
      ]),
      expected: false
    },
    {
      name: "visible non-heading passkey button blocks",
      root: createRoot([
        {
          selectorPart: "button",
          element: createElement({ text: "Use a passkey" })
        }
      ]),
      expected: true
    },
    {
      name: "optional SMS button on a localized password page does not block",
      root: createRoot([
        {
          selectorPart: "input",
          element: createElement({ tagName: "INPUT", id: "pass" })
        },
        {
          selectorPart: "button",
          element: createElement({
            tagName: "BUTTON",
            id: "sgnBt",
            text: "ログイン"
          })
        },
        {
          selectorPart: "h1",
          element: createElement({ tagName: "H1", text: "おかえりなさい！" })
        },
        {
          selectorPart: "button",
          element: createElement({
            tagName: "BUTTON",
            id: "sms-otp-btn",
            className: "sms-otp-btn btn",
            text: "コードをテキストで送信"
          })
        }
      ]),
      expected: false
    },
    {
      name: "OTP input on a localized password page still blocks",
      root: createRoot([
        {
          selectorPart: "input",
          element: createElement({ tagName: "INPUT", id: "pass" })
        },
        {
          selectorPart: "button",
          element: createElement({
            tagName: "BUTTON",
            id: "sgnBt",
            text: "ログイン"
          })
        },
        {
          selectorPart: "h1",
          element: createElement({ tagName: "H1", text: "おかえりなさい！" })
        },
        {
          selectorPart: "input",
          element: createElement({
            tagName: "INPUT",
            id: "security-code",
            attributes: {
              name: "otp",
              autocomplete: "one-time-code"
            }
          })
        }
      ]),
      expected: true
    },
    {
      name: "visible authenticator iframe blocks",
      root: createRoot([
        {
          selectorPart: "iframe",
          element: createElement({
            attributes: { src: "https://signin.ebay.com/authenticator" }
          })
        }
      ]),
      expected: true
    },
    {
      name: "ordinary Welcome password and sign-in controls do not block",
      root: createRoot([
        {
          selectorPart: "h1",
          element: createElement({ text: "Welcome back" })
        },
        {
          selectorPart: "input",
          element: createElement({
            id: "pass",
            attributes: { name: "password" }
          })
        },
        { selectorPart: "button", element: createElement({ text: "Sign in" }) }
      ]),
      expected: false
    }
  ]

  for (const { name, root, expected } of cases) {
    assert.equal(
      login.hasEbayManualChallengeOnPage(root, "/signin", getComputedStyle),
      expected,
      name
    )
  }
})

test("eBay flow marker only authorizes pages for its login task", () => {
  const login = loadTsModule("lib/ebay-login.ts")
  const task = login.createEbayLoginTask(1, 1_000_000)
  const otherTask = login.createEbayLoginTask(1, 1_000_001)
  const sellerHubUrl = login.createEbaySellerHubUrl(task)

  assert.equal(
    sellerHubUrl,
    "https://www.ebay.com/sh/ovw?ebayAutoLoginStartedAt=1000000"
  )
  assert.equal(login.isEbayLoginTaskPage(sellerHubUrl, "", "", task), true)
  assert.equal(
    login.isEbayLoginTaskPage(
      `https://signin.ebay.com/ws/eBayISAPI.dll?ru=${encodeURIComponent(
        sellerHubUrl
      )}`,
      "",
      "",
      task
    ),
    true
  )
  assert.equal(
    login.isEbayLoginTaskPage(
      "https://pages.ebay.com/SignOutConfirm",
      sellerHubUrl,
      "",
      task
    ),
    true
  )
  assert.equal(
    login.isEbayLoginTaskPage(
      "https://www.ebay.com/sh/ovw",
      "",
      login.createEbayLoginWindowName(task),
      task
    ),
    true
  )
  assert.equal(
    login.isEbayLoginTaskPage(
      "https://www.ebay.com/sh/ovw",
      "",
      login.createEbayLoginWindowName(otherTask),
      task
    ),
    false
  )
  assert.equal(
    login.isEbayLoginTaskPage(sellerHubUrl, "", "", otherTask),
    false
  )
})

test("eBay window name authorizes origin-only SignOutConfirm referrers", () => {
  const login = loadTsModule("lib/ebay-login.ts")
  const task = login.createEbayLoginTask(1, 1_000_000)
  const otherTask = login.createEbayLoginTask(1, 1_000_001)
  const windowName = login.createEbayLoginWindowName(task)

  assert.equal(windowName, "__rms_auto_ebay_login__:1000000")
  assert.equal(
    login.isEbayLoginTaskPage(
      "https://pages.ebay.com/SignOutConfirm",
      "https://www.ebay.com/",
      windowName,
      task
    ),
    true
  )
  assert.equal(
    login.isEbayLoginTaskPage(
      "https://pages.ebay.com/SignOutConfirm",
      "https://www.ebay.com/",
      login.createEbayLoginWindowName(otherTask),
      task
    ),
    false
  )
})

test("current and legacy eBay sign-out confirmation pages resume the login flow", () => {
  const login = loadTsModule("lib/ebay-login.ts")

  assert.equal(typeof login.isEbaySignOutConfirmationPage, "function")
  assert.equal(
    login.isEbaySignOutConfirmationPage("signin.ebay.com", "/logout/confirm"),
    true
  )
  assert.equal(
    login.isEbaySignOutConfirmationPage("pages.ebay.com", "/SignOutConfirm"),
    true
  )
  assert.equal(
    login.isEbaySignOutConfirmationPage("signin.ebay.com", "/ws/eBayISAPI.dll"),
    false
  )
})

test("eBay tasks use independent keys and only the active marker authorizes a task", () => {
  const login = loadTsModule("lib/ebay-login.ts")
  const taskA = login.createEbayLoginTask(0, 1_000_000)
  const taskB = login.createEbayLoginTask(1, 1_000_001)
  const taskAKey = login.getEbayLoginTaskStorageKey(taskA)
  const taskBKey = login.getEbayLoginTaskStorageKey(taskB)
  const storage = {
    [login.EBAY_LOGIN_ACTIVE_MARKER_KEY]: taskB.startedAt,
    [taskAKey]: taskA,
    [taskBKey]: taskB
  }

  assert.equal(taskAKey, "ebayAutoLoginTask:1000000")
  assert.equal(taskBKey, "ebayAutoLoginTask:1000001")
  assert.equal(
    login.isEbayLoginTaskActive(
      storage[login.EBAY_LOGIN_ACTIVE_MARKER_KEY],
      taskA
    ),
    false
  )
  assert.equal(
    login.isEbayLoginTaskActive(
      storage[login.EBAY_LOGIN_ACTIVE_MARKER_KEY],
      taskB
    ),
    true
  )

  delete storage[taskAKey]
  assert.deepEqual(plain(storage[taskBKey]), plain(taskB))
  assert.equal(storage[login.EBAY_LOGIN_ACTIVE_MARKER_KEY], taskB.startedAt)
})
