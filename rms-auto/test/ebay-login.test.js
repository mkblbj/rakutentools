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

test("eBay flow marker only authorizes pages for its login task", () => {
  const login = loadTsModule("lib/ebay-login.ts")
  const task = login.createEbayLoginTask(1, 1_000_000)
  const otherTask = login.createEbayLoginTask(1, 1_000_001)
  const sellerHubUrl = login.createEbaySellerHubUrl(task)

  assert.equal(
    sellerHubUrl,
    "https://www.ebay.com/sh/ovw?ebayAutoLoginStartedAt=1000000"
  )
  assert.equal(login.isEbayLoginTaskPage(sellerHubUrl, "", task), true)
  assert.equal(
    login.isEbayLoginTaskPage(
      `https://signin.ebay.com/ws/eBayISAPI.dll?ru=${encodeURIComponent(
        sellerHubUrl
      )}`,
      "",
      task
    ),
    true
  )
  assert.equal(
    login.isEbayLoginTaskPage(
      "https://pages.ebay.com/SignOutConfirm",
      sellerHubUrl,
      task
    ),
    true
  )
  assert.equal(
    login.isEbayLoginTaskPage("https://www.ebay.com/sh/ovw", "", task),
    false
  )
  assert.equal(login.isEbayLoginTaskPage(sellerHubUrl, "", otherTask), false)
})
