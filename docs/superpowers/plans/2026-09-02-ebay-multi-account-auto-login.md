# eBay 四账号自动登录实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `rms-auto` 浏览器扩展中加入 4 个 eBay Seller Hub 独立账号的顺序切换与自动填表，并在验证码、人机校验及未知风控页面安全暂停。

**Architecture:** 配置仍通过现有本地存储、导入导出和内网同步流转；新增后台协调器在 `chrome.storage.session` 中维护唯一、按标签页绑定的登录任务。eBay 内容脚本只在精确允许的官方页面上识别状态，先向后台领取一次性动作和当前阶段所需的单个凭据字段，再执行退出、邮箱提交或密码提交。

**Tech Stack:** Plasmo 0.90.5、React 18、TypeScript 5.3、Chrome Extensions API、Firefox WebExtensions API、Node.js `node:test`

**Spec:** `docs/superpowers/specs/2026-09-02-ebay-multi-account-auto-login-design.md`

## Global Constraints

- eBay 店铺数量固定为 `4`，配置字段固定为 `name`、`loginId`、`password`。
- 扩展和导出格式版本从 `0.1.4` 升为 `0.2.0`。
- Seller Hub 入口固定为 `https://www.ebay.com/sh/ovw`。
- 自动化只允许退出旧账号、提交邮箱或用户名、提交密码三类敏感动作。
- 短信验证码、Authenticator、eBay App、Passkey、CAPTCHA 和未知页面必须停止自动操作。
- 同一时刻只允许一个 eBay 登录任务；任务固定绑定标签页并在 10 分钟后失效。
- 临时任务中只保存店铺索引和状态，不保存邮箱或密码副本。
- 一期允许本地、导出和内网 JSON 明文保存凭据；真实凭据不得进入源码、测试、示例、文档、URL 或日志。
- 内容脚本只匹配 `www.ebay.com/sh/*`、`signin.ebay.com/*` 和 `pages.ebay.com/SignOutConfirm*`，且只在顶层页面运行。
- 不新增 Cookie 权限，不直接删除 eBay Cookie，不引入验证码或反自动化绕过。
- Chrome MV3 和 Firefox MV2 必须分别构建通过。
- 不增加新的运行时或测试依赖；继续使用 TypeScript 编译器和 Node.js `node:test`。
- UI 文案沿用项目当前的日语风格。

---

## File Map

### Create

- `rms-auto/background.ts`：把 Chrome/Firefox API 适配为登录协调器端口，并注册运行时消息和标签页关闭事件。
- `rms-auto/lib/ebay-login-state.ts`：状态、动作、消息协议、超时判断和纯状态转换。
- `rms-auto/lib/ebay-login-coordinator.ts`：串行化登录任务操作、标签页锁、凭据按阶段取用和生命周期清理。
- `rms-auto/lib/ebay-login-dom.ts`：eBay 页面信号采集、页面分类、精确元素查找和动作决策。
- `rms-auto/contents/ebay-login.ts`：连接 eBay DOM、后台协调器和页面内状态提示。
- `rms-auto/test/load-ts-module.js`：供 Node 测试加载无依赖 TypeScript 模块。
- `rms-auto/test/config.test.js`：eBay 配置规范化和导出兼容测试。
- `rms-auto/test/ebay-login-state.test.js`：登录状态机测试。
- `rms-auto/test/ebay-login-coordinator.test.js`：唯一任务、标签页绑定和凭据门控测试。
- `rms-auto/test/ebay-login-dom.test.js`：页面分类、动作决策和内容脚本安全约束测试。
- `rms-auto/test/ebay-ui-contract.test.js`：设置页、弹窗、存储和日志的关键接线测试。

### Modify

- `rms-auto/lib/config.ts`：加入 `EbayShop`、固定长度规范化和所有数据通道。
- `rms-auto/options.tsx`：加入 4 行 eBay 设置、完整性校验、导入导出和安全调试输出。
- `rms-auto/popup.tsx`：加载 eBay 配置、显示店铺并通过后台消息启动登录。
- `rms-auto/package.json`：版本升为 `0.2.0`，加入 `test` 和 `typecheck` 命令。
- `rms-auto/example-export.json`：升级为不含真实凭据的 `0.2.0` 示例。
- `rms-auto/README.md`：说明 eBay 设置、切换和人工验证边界。
- `rms-auto/FEATURES.md`：加入 eBay 四账号能力和并发限制。
- `rms-auto/EXPORT_FORMAT.md`：记录 `ebayShops` 字段和明文风险。
- `rms-auto/VERSION_HISTORY.md`：记录 `v0.2.0`。

---

### Task 1: eBay 配置模型与兼容格式

**Files:**
- Create: `rms-auto/test/load-ts-module.js`
- Create: `rms-auto/test/config.test.js`
- Modify: `rms-auto/lib/config.ts:1-310`
- Modify: `rms-auto/package.json:1-45`

**Interfaces:**
- Consumes: 现有 `normalizeFixedLengthArray`、`normalizeExportData`、`buildExportData`、`readLocalConfig`、`writeLocalConfig`。
- Produces: `EBAY_SHOP_COUNT`, `EbayShop`, `createEmptyEbayShop()`, `hasAnyEbayField()`, `isCompleteEbayShop()`, `ebayShops` in local/export config.

- [ ] **Step 1: 创建 TypeScript 测试加载器和失败的配置测试**

Create `rms-auto/test/load-ts-module.js`:

```js
const fs = require("node:fs")
const path = require("node:path")
const ts = require("typescript")
const vm = require("node:vm")

const projectRoot = path.resolve(__dirname, "..")

const resolveModulePath = (fromFile, request) => {
  const basePath = request.startsWith("~")
    ? path.resolve(projectRoot, request.slice(1))
    : path.resolve(path.dirname(fromFile), request)
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx")
  ]
  const resolved = candidates.find((candidate) => fs.existsSync(candidate))

  if (!resolved) {
    throw new Error(`Cannot resolve ${request} from ${fromFile}`)
  }

  return resolved
}

const loadTsModule = (relativePath, options = {}) => {
  const cache = new Map()
  const entryPath = path.resolve(projectRoot, relativePath)

  const load = (filePath) => {
    if (cache.has(filePath)) {
      return cache.get(filePath).exports
    }

    const source = fs.readFileSync(filePath, "utf8")
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020
      },
      fileName: filePath
    })
    const module = { exports: {} }
    cache.set(filePath, module)

    const localRequire = (request) => {
      if (options.stubs && Object.hasOwn(options.stubs, request)) {
        return options.stubs[request]
      }
      if (request.startsWith(".") || request.startsWith("~")) {
        return load(resolveModulePath(filePath, request))
      }
      return require(request)
    }

    vm.runInNewContext(
      outputText,
      {
        AbortController,
        DOMException,
        Event,
        URL,
        clearInterval,
        clearTimeout,
        console,
        exports: module.exports,
        module,
        require: localRequire,
        setInterval,
        setTimeout,
        ...(options.globals || {})
      },
      { filename: filePath }
    )

    return module.exports
  }

  return load(entryPath)
}

const toPlain = (value) => JSON.parse(JSON.stringify(value))

module.exports = { loadTsModule, toPlain }
```

Create `rms-auto/test/config.test.js`:

```js
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const test = require("node:test")

const { loadTsModule, toPlain } = require("./load-ts-module")
const config = loadTsModule("lib/config.ts")

test("legacy exports receive four empty eBay shops", () => {
  const normalized = toPlain(config.normalizeExportData({ shops: [] }))

  assert.equal(config.EBAY_SHOP_COUNT, 4)
  assert.deepEqual(normalized.ebayShops, [
    { name: "", loginId: "", password: "" },
    { name: "", loginId: "", password: "" },
    { name: "", loginId: "", password: "" },
    { name: "", loginId: "", password: "" }
  ])
})

test("eBay shops are sanitized, padded, and truncated to four", () => {
  const normalized = toPlain(
    config.normalizeExportData({
      shops: [],
      ebayShops: [
        { name: "One", loginId: "one@example.test", password: "one-pass" },
        { name: 2, loginId: null, password: false },
        { name: "Three", loginId: "three@example.test", password: "three-pass" },
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
  assert.equal(normalized.ebayShops[3].name, "Four")
})

test("eBay completeness helpers distinguish empty, partial, and complete rows", () => {
  const empty = { name: "", loginId: "", password: "" }
  const partial = { name: "One", loginId: "", password: "" }
  const complete = {
    name: "One",
    loginId: "one@example.test",
    password: "one-pass"
  }

  assert.equal(config.hasAnyEbayField(empty), false)
  assert.equal(config.isCompleteEbayShop(empty), false)
  assert.equal(config.hasAnyEbayField(partial), true)
  assert.equal(config.isCompleteEbayShop(partial), false)
  assert.equal(config.isCompleteEbayShop(complete), true)
})

test("new exports always contain eBay shops and use version 0.2.0", () => {
  const exported = toPlain(
    config.buildExportData({
      shops: [],
      mercariLinks: [],
      aupayShops: [],
      temuShops: [],
      ebayShops: [
        { name: "One", loginId: "one@example.test", password: "one-pass" }
      ]
    })
  )
  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf8")
  )

  assert.equal(exported.version, "0.2.0")
  assert.equal(exported.ebayShops.length, 4)
  assert.equal(packageJson.version, exported.version)
})

test("local config reads and writes the eBay storage key", async () => {
  const writes = []
  const storedShop = {
    name: "One",
    loginId: "one@example.test",
    password: "one-pass"
  }
  const configWithChrome = loadTsModule("lib/config.ts", {
    globals: {
      chrome: {
        storage: {
          local: {
            get: async () => ({ rms: [], ebayShops: [storedShop] }),
            set: async (value) => writes.push(value)
          }
        }
      }
    }
  })

  const local = toPlain(await configWithChrome.readLocalConfig())
  assert.deepEqual(local.ebayShops[0], storedShop)

  await configWithChrome.writeLocalConfig({
    shops: [],
    mercariLinks: [],
    aupayShops: [],
    temuShops: [],
    ebayShops: [storedShop]
  })
  assert.deepEqual(toPlain(writes[0].ebayShops), [storedShop])
})
```

- [ ] **Step 2: 运行配置测试并确认失败**

Run:

```bash
cd rms-auto
node --test test/config.test.js
```

Expected: FAIL because `EBAY_SHOP_COUNT`, `ebayShops`, `hasAnyEbayField`, and `isCompleteEbayShop` do not exist and the package version is still `0.1.4`.

- [ ] **Step 3: 实现 eBay 配置类型、规范化和所有数据通道**

In `rms-auto/lib/config.ts`, change the version and add the type and helpers:

```ts
export const CONFIG_VERSION = "0.2.0"
export const EBAY_SHOP_COUNT = 4

export interface EbayShop {
  name: string
  loginId: string
  password: string
}

export const createEmptyEbayShop = (): EbayShop => ({
  name: "",
  loginId: "",
  password: ""
})

const normalizeEbayShop = (value: unknown): EbayShop => {
  if (!value || typeof value !== "object") {
    return createEmptyEbayShop()
  }

  const source = value as Partial<EbayShop>
  return {
    name: toString(source.name),
    loginId: toString(source.loginId),
    password: toString(source.password)
  }
}

export const hasAnyEbayField = (shop: EbayShop): boolean => {
  return Boolean(shop.name || shop.loginId || shop.password)
}

export const isCompleteEbayShop = (shop: EbayShop): boolean => {
  return Boolean(shop.name && shop.loginId && shop.password)
}
```

Extend the config interfaces:

```ts
export interface ExportData {
  version: string
  exportDate: string
  shops: Shop[]
  mercariLinks?: MercariLink[]
  aupayShops?: AupayShop[]
  temuShops?: TemuShop[]
  ebayShops?: EbayShop[]
}

export interface LocalConfigData {
  shops: Shop[]
  rmsPinCode: string
  mercariLinks: MercariLink[]
  aupayShops: AupayShop[]
  temuShops: TemuShop[]
  ebayShops: EbayShop[]
}

type ExportConfigInput = Omit<LocalConfigData, "rmsPinCode" | "ebayShops"> & {
  ebayShops?: EbayShop[]
}
```

Add `ebayShops` to `normalizeExportData`, normalizing to exactly four items:

```ts
ebayShops: normalizeFixedLengthArray(
  source.ebayShops,
  EBAY_SHOP_COUNT,
  normalizeEbayShop,
  createEmptyEbayShop
)
```

Change `buildExportData` to accept `ExportConfigInput` and always emit four normalized entries:

```ts
export const buildExportData = (data: ExportConfigInput): ExportData => {
  return {
    version: CONFIG_VERSION,
    exportDate: new Date().toISOString(),
    shops: data.shops,
    mercariLinks: data.mercariLinks,
    aupayShops: data.aupayShops,
    temuShops: data.temuShops,
    ebayShops: normalizeFixedLengthArray(
      data.ebayShops,
      EBAY_SHOP_COUNT,
      normalizeEbayShop,
      createEmptyEbayShop
    )
  }
}
```

Add `"ebayShops"` to the key list in `readLocalConfig`, add the normalized property to its return value, and persist it in `writeLocalConfig`:

```ts
ebayShops: normalizeFixedLengthArray(
  data.ebayShops,
  EBAY_SHOP_COUNT,
  normalizeEbayShop,
  createEmptyEbayShop
)
```

```ts
await chrome.storage.local.set({
  rms: data.shops,
  mercariLinks: data.mercariLinks,
  aupayShops: data.aupayShops,
  temuShops: data.temuShops,
  ebayShops: data.ebayShops
})
```

In `rms-auto/package.json`, set the version and add reproducible checks:

```json
"version": "0.2.0",
"scripts": {
  "dev": "plasmo dev",
  "dev:firefox": "plasmo dev --target=firefox-mv2",
  "test": "node --test test/*.test.js",
  "typecheck": "tsc --noEmit",
  "build": "plasmo build",
  "build:firefox": "plasmo build --target=firefox-mv2",
  "build:all": "plasmo build && plasmo build --target=firefox-mv2",
  "package": "plasmo package"
}
```

- [ ] **Step 4: 运行配置测试、现有测试和类型检查**

Run:

```bash
cd rms-auto
pnpm test
pnpm typecheck
```

Expected: all tests PASS and TypeScript exits with code 0. Existing UI may ignore `ebayShops` at this stage, but it must still compile because `buildExportData` temporarily accepts an optional eBay field.

- [ ] **Step 5: 提交配置模型**

```bash
git add rms-auto/lib/config.ts rms-auto/package.json rms-auto/test/load-ts-module.js rms-auto/test/config.test.js
git commit -m "feat: add ebay account configuration"
```

---

### Task 2: 登录状态机与共享消息协议

**Files:**
- Create: `rms-auto/lib/ebay-login-state.ts`
- Create: `rms-auto/test/ebay-login-state.test.js`

**Interfaces:**
- Consumes: `shopIndex`, `tabId`, monotonic test timestamps.
- Produces: `EbayLoginIntent`, `EbayLoginStage`, `EbayAutomationAction`, `EbayRuntimeMessage`, message constants, `createEbayLoginIntent()`, `isEbayLoginIntentExpired()`, `transitionEbayLoginIntent()`.

- [ ] **Step 1: 写出失败的状态机测试**

Create `rms-auto/test/ebay-login-state.test.js`:

```js
const assert = require("node:assert/strict")
const test = require("node:test")

const { loadTsModule, toPlain } = require("./load-ts-module")
const state = loadTsModule("lib/ebay-login-state.ts")

const NOW = 1_000_000

test("creates a tab-bound eBay login intent", () => {
  const intent = state.createEbayLoginIntent(42, 2, NOW)

  assert.equal(intent.tabId, 42)
  assert.equal(intent.shopIndex, 2)
  assert.equal(intent.stage, "opening_seller_hub")
  assert.equal(intent.startedAt, NOW)
  assert.equal(intent.updatedAt, NOW)
})

test("normal flow claims each sensitive action once", () => {
  let intent = state.createEbayLoginIntent(42, 2, NOW)

  let result = state.transitionEbayLoginIntent(intent, "sign_out", NOW + 1)
  assert.equal(result.ok, true)
  intent = result.intent
  assert.equal(intent.stage, "signing_out")

  result = state.transitionEbayLoginIntent(intent, "open_seller_hub", NOW + 2)
  assert.equal(result.ok, true)
  intent = result.intent
  assert.equal(intent.stage, "awaiting_identifier")

  result = state.transitionEbayLoginIntent(intent, "submit_identifier", NOW + 3)
  assert.equal(result.ok, true)
  intent = result.intent
  assert.equal(intent.stage, "identifier_submitted")

  const duplicate = state.transitionEbayLoginIntent(
    intent,
    "submit_identifier",
    NOW + 4
  )
  assert.deepEqual(toPlain(duplicate), {
    ok: false,
    reason: "invalid_transition"
  })

  result = state.transitionEbayLoginIntent(intent, "submit_password", NOW + 5)
  assert.equal(result.ok, true)
  intent = result.intent
  assert.equal(intent.stage, "password_submitted")

  result = state.transitionEbayLoginIntent(intent, "complete", NOW + 6)
  assert.deepEqual(toPlain(result), { ok: true, intent: null })
})

test("historical password pages must switch account before password submission", () => {
  const intent = state.createEbayLoginIntent(42, 0, NOW)
  const passwordAttempt = state.transitionEbayLoginIntent(
    intent,
    "submit_password",
    NOW + 1
  )
  const switchResult = state.transitionEbayLoginIntent(
    intent,
    "switch_account",
    NOW + 2
  )

  assert.equal(passwordAttempt.ok, false)
  assert.equal(switchResult.ok, true)
  assert.equal(switchResult.intent.stage, "awaiting_identifier")
})

test("manual verification can only finish at Seller Hub or become an error", () => {
  const submitted = {
    ...state.createEbayLoginIntent(42, 0, NOW),
    stage: "password_submitted"
  }
  const paused = state.transitionEbayLoginIntent(
    submitted,
    "pause_manual",
    NOW + 1
  )

  assert.equal(paused.ok, true)
  assert.equal(paused.intent.stage, "manual_verification")
  assert.equal(
    state.transitionEbayLoginIntent(
      paused.intent,
      "submit_password",
      NOW + 2
    ).ok,
    false
  )
  assert.deepEqual(
    toPlain(
      state.transitionEbayLoginIntent(paused.intent, "complete", NOW + 3)
    ),
    { ok: true, intent: null }
  )
})

test("credential errors are terminal and tasks expire at ten minutes", () => {
  const intent = state.createEbayLoginIntent(42, 0, NOW)
  const errored = state.transitionEbayLoginIntent(
    intent,
    "pause_error",
    NOW + 1
  )

  assert.equal(errored.intent.stage, "paused_error")
  assert.equal(
    state.transitionEbayLoginIntent(errored.intent, "complete", NOW + 2).ok,
    false
  )
  assert.equal(
    state.isEbayLoginIntentExpired(
      intent,
      NOW + state.EBAY_LOGIN_TIMEOUT_MS - 1
    ),
    false
  )
  assert.equal(
    state.isEbayLoginIntentExpired(
      intent,
      NOW + state.EBAY_LOGIN_TIMEOUT_MS
    ),
    true
  )
})
```

- [ ] **Step 2: 运行状态机测试并确认失败**

Run:

```bash
cd rms-auto
node --test test/ebay-login-state.test.js
```

Expected: FAIL because `lib/ebay-login-state.ts` does not exist.

- [ ] **Step 3: 实现状态、动作、消息和转换矩阵**

Create `rms-auto/lib/ebay-login-state.ts` with these public contracts and transition rules:

```ts
export const EBAY_LOGIN_SESSION_KEY = "ebayActiveLogin"
export const EBAY_LOGIN_TIMEOUT_MS = 10 * 60 * 1000
export const EBAY_SELLER_HUB_URL = "https://www.ebay.com/sh/ovw"

export const EBAY_MESSAGE_TYPES = {
  START_LOGIN: "ebay/start-login",
  GET_CONTEXT: "ebay/get-context",
  CLAIM_ACTION: "ebay/claim-action"
} as const

export type EbayLoginStage =
  | "opening_seller_hub"
  | "signing_out"
  | "awaiting_identifier"
  | "identifier_submitted"
  | "password_submitted"
  | "manual_verification"
  | "paused_error"

export type EbayAutomationAction =
  | "sign_out"
  | "open_seller_hub"
  | "submit_identifier"
  | "submit_password"
  | "switch_account"
  | "pause_manual"
  | "pause_error"
  | "complete"

export interface EbayLoginIntent {
  tabId: number
  shopIndex: number
  stage: EbayLoginStage
  startedAt: number
  updatedAt: number
}

export type EbayRuntimeMessage =
  | {
      type: typeof EBAY_MESSAGE_TYPES.START_LOGIN
      shopIndex: number
    }
  | {
      type: typeof EBAY_MESSAGE_TYPES.GET_CONTEXT
    }
  | {
      type: typeof EBAY_MESSAGE_TYPES.CLAIM_ACTION
      action: EbayAutomationAction
    }

export type EbayFailureReason =
  | "active_login"
  | "invalid_shop"
  | "missing_configuration"
  | "no_active_login"
  | "wrong_tab"
  | "invalid_transition"

export type EbayStartLoginResponse =
  | { ok: true; tabId: number }
  | { ok: false; reason: EbayFailureReason; tabId?: number }

export type EbayContextResponse =
  | {
      ok: true
      tabId: number
      shopIndex: number
      shopName: string
      stage: EbayLoginStage
    }
  | { ok: false; reason: EbayFailureReason }

export type EbayClaimActionResponse =
  | {
      ok: true
      shopName: string
      stage: EbayLoginStage | null
      credential?: string
    }
  | { ok: false; reason: EbayFailureReason }

type TransitionMap = Record<
  EbayLoginStage,
  Partial<Record<EbayAutomationAction, EbayLoginStage | null>>
>

const transitions: TransitionMap = {
  opening_seller_hub: {
    sign_out: "signing_out",
    submit_identifier: "identifier_submitted",
    switch_account: "awaiting_identifier",
    pause_manual: "manual_verification",
    pause_error: "paused_error"
  },
  signing_out: {
    open_seller_hub: "awaiting_identifier",
    submit_identifier: "identifier_submitted",
    pause_manual: "manual_verification",
    pause_error: "paused_error"
  },
  awaiting_identifier: {
    submit_identifier: "identifier_submitted",
    switch_account: "awaiting_identifier",
    pause_manual: "manual_verification",
    pause_error: "paused_error"
  },
  identifier_submitted: {
    submit_password: "password_submitted",
    switch_account: "awaiting_identifier",
    pause_manual: "manual_verification",
    pause_error: "paused_error"
  },
  password_submitted: {
    complete: null,
    pause_manual: "manual_verification",
    pause_error: "paused_error"
  },
  manual_verification: {
    complete: null,
    pause_error: "paused_error"
  },
  paused_error: {}
}

export const createEbayLoginIntent = (
  tabId: number,
  shopIndex: number,
  now: number
): EbayLoginIntent => ({
  tabId,
  shopIndex,
  stage: "opening_seller_hub",
  startedAt: now,
  updatedAt: now
})

export const isEbayLoginIntentExpired = (
  intent: EbayLoginIntent,
  now: number
): boolean => {
  return now - intent.startedAt >= EBAY_LOGIN_TIMEOUT_MS
}

export type EbayTransitionResult =
  | { ok: true; intent: EbayLoginIntent | null }
  | { ok: false; reason: "invalid_transition" }

export const transitionEbayLoginIntent = (
  intent: EbayLoginIntent,
  action: EbayAutomationAction,
  now: number
): EbayTransitionResult => {
  const nextStage = transitions[intent.stage][action]

  if (nextStage === undefined) {
    return { ok: false, reason: "invalid_transition" }
  }

  if (nextStage === null) {
    return { ok: true, intent: null }
  }

  return {
    ok: true,
    intent: {
      ...intent,
      stage: nextStage,
      updatedAt: now
    }
  }
}
```

- [ ] **Step 4: 运行状态机和全量测试**

Run:

```bash
cd rms-auto
node --test test/ebay-login-state.test.js
pnpm test
pnpm typecheck
```

Expected: all tests PASS and TypeScript exits with code 0.

- [ ] **Step 5: 提交状态机**

```bash
git add rms-auto/lib/ebay-login-state.ts rms-auto/test/ebay-login-state.test.js
git commit -m "feat: model ebay login state transitions"
```

---

### Task 3: 标签页协调器与后台入口

**Files:**
- Create: `rms-auto/lib/ebay-login-coordinator.ts`
- Create: `rms-auto/background.ts`
- Create: `rms-auto/test/ebay-login-coordinator.test.js`

**Interfaces:**
- Consumes: Task 1 的 `EbayShop` 和完整性判断；Task 2 的 intent、action、responses 和转换函数。
- Produces: `createEbayLoginCoordinator(ports)` with `startLogin()`, `getContext()`, `claimAction()`, `handleTabClosed()`, `cleanup()`; runtime message handler in `background.ts`.

- [ ] **Step 1: 写出失败的协调器测试**

Create `rms-auto/test/ebay-login-coordinator.test.js`:

```js
const assert = require("node:assert/strict")
const test = require("node:test")

const { loadTsModule, toPlain } = require("./load-ts-module")
const {
  createEbayLoginCoordinator
} = loadTsModule("lib/ebay-login-coordinator.ts")

const createHarness = () => {
  let now = 1_000_000
  let intent = null
  let nextTabId = 40
  const existingTabs = new Set()
  const events = []
  const shops = [
    { name: "One", loginId: "one@example.test", password: "one-pass" },
    { name: "Two", loginId: "two@example.test", password: "two-pass" },
    { name: "", loginId: "", password: "" },
    { name: "", loginId: "", password: "" }
  ]

  const ports = {
    now: () => now,
    readIntent: async () => intent,
    writeIntent: async (nextIntent) => {
      events.push(nextIntent ? `write:${nextIntent.stage}` : "clear")
      intent = nextIntent
    },
    getShops: async () => shops,
    createTab: async (url) => {
      const tabId = nextTabId
      nextTabId += 1
      existingTabs.add(tabId)
      events.push(`create:${url}`)
      return tabId
    },
    updateTab: async (tabId, url) => {
      events.push(`update:${tabId}:${url}`)
    },
    focusTab: async (tabId) => {
      events.push(`focus:${tabId}`)
    },
    removeTab: async (tabId) => {
      existingTabs.delete(tabId)
      events.push(`remove:${tabId}`)
    },
    tabExists: async (tabId) => existingTabs.has(tabId)
  }

  return {
    coordinator: createEbayLoginCoordinator(ports),
    events,
    getIntent: () => intent,
    removeExistingTab: (tabId) => existingTabs.delete(tabId),
    setNow: (value) => {
      now = value
    }
  }
}

test("stores the intent before navigating the new tab", async () => {
  const harness = createHarness()
  const result = await harness.coordinator.startLogin(1)

  assert.deepEqual(toPlain(result), { ok: true, tabId: 40 })
  assert.deepEqual(harness.events, [
    "create:about:blank",
    "write:opening_seller_hub",
    "update:40:https://www.ebay.com/sh/ovw"
  ])
})

test("rejects incomplete shops before creating a tab", async () => {
  const harness = createHarness()
  const result = await harness.coordinator.startLogin(2)

  assert.deepEqual(toPlain(result), {
    ok: false,
    reason: "missing_configuration"
  })
  assert.deepEqual(harness.events, [])
})

test("focuses the active login instead of replacing its shop", async () => {
  const harness = createHarness()
  await harness.coordinator.startLogin(0)
  const second = await harness.coordinator.startLogin(1)

  assert.deepEqual(toPlain(second), {
    ok: false,
    reason: "active_login",
    tabId: 40
  })
  assert.equal(harness.getIntent().shopIndex, 0)
  assert.equal(harness.events.at(-1), "focus:40")
})

test("returns only the credential required by the claimed stage", async () => {
  const harness = createHarness()
  await harness.coordinator.startLogin(0)

  const context = await harness.coordinator.getContext(40)
  const identifier = await harness.coordinator.claimAction(
    40,
    "submit_identifier"
  )
  const password = await harness.coordinator.claimAction(40, "submit_password")

  assert.equal(context.shopName, "One")
  assert.equal(Object.hasOwn(context, "credential"), false)
  assert.equal(identifier.credential, "one@example.test")
  assert.equal(identifier.stage, "identifier_submitted")
  assert.equal(password.credential, "one-pass")
  assert.equal(password.stage, "password_submitted")

  const completed = await harness.coordinator.claimAction(40, "complete")
  assert.equal(completed.ok, true)
  assert.equal(completed.stage, null)
  assert.equal(harness.getIntent(), null)
})

test("rejects wrong tabs and serializes duplicate claims", async () => {
  const harness = createHarness()
  await harness.coordinator.startLogin(0)

  assert.deepEqual(toPlain(await harness.coordinator.getContext(99)), {
    ok: false,
    reason: "wrong_tab"
  })

  const results = await Promise.all([
    harness.coordinator.claimAction(40, "submit_identifier"),
    harness.coordinator.claimAction(40, "submit_identifier")
  ])

  assert.equal(results.filter((result) => result.ok).length, 1)
  assert.equal(
    results.filter((result) => !result.ok)[0].reason,
    "invalid_transition"
  )
})

test("cleans closed, missing, and expired tasks", async () => {
  const harness = createHarness()
  await harness.coordinator.startLogin(0)
  await harness.coordinator.handleTabClosed(40)
  assert.equal(harness.getIntent(), null)

  await harness.coordinator.startLogin(0)
  harness.removeExistingTab(41)
  await harness.coordinator.cleanup()
  assert.equal(harness.getIntent(), null)

  await harness.coordinator.startLogin(0)
  harness.setNow(1_000_000 + 10 * 60 * 1000)
  await harness.coordinator.cleanup()
  assert.equal(harness.getIntent(), null)
})
```

- [ ] **Step 2: 运行协调器测试并确认失败**

Run:

```bash
cd rms-auto
node --test test/ebay-login-coordinator.test.js
```

Expected: FAIL because `lib/ebay-login-coordinator.ts` does not exist.

- [ ] **Step 3: 实现可注入端口的串行协调器**

Create `rms-auto/lib/ebay-login-coordinator.ts` with this API and behavior:

```ts
import {
  isCompleteEbayShop,
  type EbayShop
} from "./config"
import {
  EBAY_SELLER_HUB_URL,
  createEbayLoginIntent,
  isEbayLoginIntentExpired,
  transitionEbayLoginIntent,
  type EbayAutomationAction,
  type EbayClaimActionResponse,
  type EbayContextResponse,
  type EbayLoginIntent,
  type EbayStartLoginResponse
} from "./ebay-login-state"

export interface EbayLoginCoordinatorPorts {
  now: () => number
  readIntent: () => Promise<EbayLoginIntent | null>
  writeIntent: (intent: EbayLoginIntent | null) => Promise<void>
  getShops: () => Promise<EbayShop[]>
  createTab: (url: string) => Promise<number>
  updateTab: (tabId: number, url: string) => Promise<void>
  focusTab: (tabId: number) => Promise<void>
  removeTab: (tabId: number) => Promise<void>
  tabExists: (tabId: number) => Promise<boolean>
}

export const createEbayLoginCoordinator = (
  ports: EbayLoginCoordinatorPorts
) => {
  let queue: Promise<unknown> = Promise.resolve()

  const exclusively = <T>(task: () => Promise<T>): Promise<T> => {
    const result = queue.then(task, task)
    queue = result.then(
      () => undefined,
      () => undefined
    )
    return result
  }

  const readLiveIntent = async (): Promise<EbayLoginIntent | null> => {
    const intent = await ports.readIntent()
    if (!intent) {
      return null
    }

    const expired = isEbayLoginIntentExpired(intent, ports.now())
    const exists = expired ? false : await ports.tabExists(intent.tabId)
    if (expired || !exists) {
      await ports.writeIntent(null)
      return null
    }

    return intent
  }

  const startLogin = (shopIndex: number): Promise<EbayStartLoginResponse> => {
    return exclusively(async () => {
      if (!Number.isInteger(shopIndex) || shopIndex < 0) {
        return { ok: false, reason: "invalid_shop" }
      }

      const active = await readLiveIntent()
      if (active) {
        await ports.focusTab(active.tabId)
        return {
          ok: false,
          reason: "active_login",
          tabId: active.tabId
        }
      }

      const shops = await ports.getShops()
      const shop = shops[shopIndex]
      if (!shop || !isCompleteEbayShop(shop)) {
        return { ok: false, reason: "missing_configuration" }
      }

      const tabId = await ports.createTab("about:blank")
      const intent = createEbayLoginIntent(tabId, shopIndex, ports.now())

      try {
        await ports.writeIntent(intent)
        await ports.updateTab(tabId, EBAY_SELLER_HUB_URL)
      } catch (error) {
        await ports.writeIntent(null)
        await ports.removeTab(tabId)
        throw error
      }

      return { ok: true, tabId }
    })
  }

  const getContext = (tabId: number): Promise<EbayContextResponse> => {
    return exclusively(async () => {
      const intent = await readLiveIntent()
      if (!intent) {
        return { ok: false, reason: "no_active_login" }
      }
      if (intent.tabId !== tabId) {
        return { ok: false, reason: "wrong_tab" }
      }

      const shop = (await ports.getShops())[intent.shopIndex]
      if (!shop || !isCompleteEbayShop(shop)) {
        await ports.writeIntent(null)
        return { ok: false, reason: "missing_configuration" }
      }

      return {
        ok: true,
        tabId,
        shopIndex: intent.shopIndex,
        shopName: shop.name,
        stage: intent.stage
      }
    })
  }

  const claimAction = (
    tabId: number,
    action: EbayAutomationAction
  ): Promise<EbayClaimActionResponse> => {
    return exclusively(async () => {
      const intent = await readLiveIntent()
      if (!intent) {
        return { ok: false, reason: "no_active_login" }
      }
      if (intent.tabId !== tabId) {
        return { ok: false, reason: "wrong_tab" }
      }

      const shop = (await ports.getShops())[intent.shopIndex]
      if (!shop || !isCompleteEbayShop(shop)) {
        await ports.writeIntent(null)
        return { ok: false, reason: "missing_configuration" }
      }

      const transition = transitionEbayLoginIntent(
        intent,
        action,
        ports.now()
      )
      if (!transition.ok) {
        return { ok: false, reason: transition.reason }
      }

      await ports.writeIntent(transition.intent)
      const credential =
        action === "submit_identifier"
          ? shop.loginId
          : action === "submit_password"
            ? shop.password
            : undefined

      return {
        ok: true,
        shopName: shop.name,
        stage: transition.intent?.stage ?? null,
        ...(credential === undefined ? {} : { credential })
      }
    })
  }

  const handleTabClosed = (tabId: number): Promise<void> => {
    return exclusively(async () => {
      const intent = await ports.readIntent()
      if (intent?.tabId === tabId) {
        await ports.writeIntent(null)
      }
    })
  }

  const cleanup = (): Promise<void> => {
    return exclusively(async () => {
      await readLiveIntent()
    })
  }

  return { startLogin, getContext, claimAction, handleTabClosed, cleanup }
}
```

- [ ] **Step 4: 创建 Plasmo 后台入口并适配浏览器 API**

Create `rms-auto/background.ts`:

```ts
import { readLocalConfig } from "~lib/config"
import { createEbayLoginCoordinator } from "~lib/ebay-login-coordinator"
import {
  EBAY_LOGIN_SESSION_KEY,
  EBAY_MESSAGE_TYPES,
  type EbayLoginIntent,
  type EbayRuntimeMessage
} from "~lib/ebay-login-state"

const readIntent = async (): Promise<EbayLoginIntent | null> => {
  const stored = await chrome.storage.session.get(EBAY_LOGIN_SESSION_KEY)
  return stored[EBAY_LOGIN_SESSION_KEY] ?? null
}

const writeIntent = async (intent: EbayLoginIntent | null): Promise<void> => {
  if (!intent) {
    await chrome.storage.session.remove(EBAY_LOGIN_SESSION_KEY)
    return
  }
  await chrome.storage.session.set({ [EBAY_LOGIN_SESSION_KEY]: intent })
}

const coordinator = createEbayLoginCoordinator({
  now: () => Date.now(),
  readIntent,
  writeIntent,
  getShops: async () => (await readLocalConfig()).ebayShops,
  createTab: async (url) => {
    const tab = await chrome.tabs.create({ url, active: true })
    if (tab.id === undefined) {
      throw new Error("eBay login tab did not receive an ID")
    }
    return tab.id
  },
  updateTab: async (tabId, url) => {
    await chrome.tabs.update(tabId, { url, active: true })
  },
  focusTab: async (tabId) => {
    await chrome.tabs.update(tabId, { active: true })
  },
  removeTab: async (tabId) => {
    try {
      await chrome.tabs.remove(tabId)
    } catch {}
  },
  tabExists: async (tabId) => {
    try {
      await chrome.tabs.get(tabId)
      return true
    } catch {
      return false
    }
  }
})

const handleMessage = async (
  message: EbayRuntimeMessage,
  sender: chrome.runtime.MessageSender
) => {
  if (message.type === EBAY_MESSAGE_TYPES.START_LOGIN) {
    return coordinator.startLogin(message.shopIndex)
  }

  const tabId = sender.tab?.id
  if (tabId === undefined) {
    return { ok: false, reason: "wrong_tab" as const }
  }

  if (message.type === EBAY_MESSAGE_TYPES.GET_CONTEXT) {
    return coordinator.getContext(tabId)
  }

  if (message.type === EBAY_MESSAGE_TYPES.CLAIM_ACTION) {
    return coordinator.claimAction(tabId, message.action)
  }

  return { ok: false, reason: "invalid_transition" as const }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== "string") {
    return false
  }
  if (!(Object.values(EBAY_MESSAGE_TYPES) as string[]).includes(message.type)) {
    return false
  }

  void handleMessage(message as EbayRuntimeMessage, sender)
    .then(sendResponse)
    .catch(() =>
      sendResponse({ ok: false, reason: "invalid_transition" as const })
    )
  return true
})

chrome.tabs.onRemoved.addListener((tabId) => {
  void coordinator.handleTabClosed(tabId)
})

void coordinator.cleanup()
```

- [ ] **Step 5: 运行协调器测试、类型检查和双浏览器构建**

Run:

```bash
cd rms-auto
node --test test/ebay-login-coordinator.test.js
pnpm test
pnpm typecheck
pnpm build
pnpm build:firefox
```

Expected: tests PASS, typecheck exits 0, both builds finish successfully, and both generated manifests contain a background entry.

- [ ] **Step 6: 提交协调器和后台入口**

```bash
git add rms-auto/background.ts rms-auto/lib/ebay-login-coordinator.ts rms-auto/test/ebay-login-coordinator.test.js
git commit -m "feat: coordinate ebay login tabs"
```

---

### Task 4: eBay 页面分类与内容脚本自动化

**Files:**
- Create: `rms-auto/lib/ebay-login-dom.ts`
- Create: `rms-auto/contents/ebay-login.ts`
- Create: `rms-auto/test/ebay-login-dom.test.js`

**Interfaces:**
- Consumes: Task 2 的 `EbayLoginStage`, `EbayAutomationAction`, message contracts；现有 `setInputValueAndNotify()`。
- Produces: `EbayPageSignals`, `EbayPageKind`, `classifyEbayPage()`, `decideEbayPageAction()`, exact selector helpers, safe page automation.

- [ ] **Step 1: 写出失败的页面分类和动作决策测试**

Create `rms-auto/test/ebay-login-dom.test.js`:

```js
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const test = require("node:test")

const { loadTsModule } = require("./load-ts-module")
const dom = loadTsModule("lib/ebay-login-dom.ts")

const baseSignals = {
  hostname: "signin.ebay.com",
  pathname: "/ws/eBayISAPI.dll",
  hasSellerHubMarker: false,
  hasIdentifierInput: false,
  hasPasswordInput: false,
  hasContinueAction: false,
  hasSignInAction: false,
  hasSwitchAccountAction: false,
  hasSignOutConfirmation: false,
  hasManualChallenge: false,
  hasCredentialError: false
}

test("classifies each allowed eBay login page state", () => {
  const cases = [
    [
      {
        ...baseSignals,
        hostname: "www.ebay.com",
        pathname: "/sh/ovw",
        hasSellerHubMarker: true
      },
      "seller_hub_authenticated"
    ],
    [
      {
        ...baseSignals,
        hasIdentifierInput: true,
        hasContinueAction: true
      },
      "identifier_form"
    ],
    [
      {
        ...baseSignals,
        hasPasswordInput: true,
        hasSignInAction: true
      },
      "password_form"
    ],
    [
      {
        ...baseSignals,
        hostname: "pages.ebay.com",
        pathname: "/SignOutConfirm.html",
        hasSignOutConfirmation: true
      },
      "sign_out_confirmation"
    ],
    [{ ...baseSignals, hasManualChallenge: true }, "manual_challenge"],
    [{ ...baseSignals, hasCredentialError: true }, "credential_error"],
    [baseSignals, "unknown"]
  ]

  for (const [signals, expected] of cases) {
    assert.equal(dom.classifyEbayPage(signals), expected)
  }
})

test("collects conservative Seller Hub and challenge signals", () => {
  const sellerDocument = {
    title: "Seller Hub",
    querySelector: (selector) => (selector === "#gh-ug" ? {} : null),
    querySelectorAll: () => []
  }

  const sellerSignals = dom.collectEbayPageSignals(sellerDocument, {
    hostname: "www.ebay.com",
    pathname: "/sh/ovw"
  })

  assert.equal(sellerSignals.hasSellerHubMarker, true)

  const challenges = [
    { marker: "input[autocomplete='one-time-code']", heading: "" },
    { marker: "", heading: "Enter the code from your authenticator" },
    { marker: "", heading: "Use your passkey" },
    { marker: "iframe[src*='captcha' i]", heading: "" }
  ]

  for (const challenge of challenges) {
    const challengeDocument = {
      title: "Verify your account",
      querySelector: (selector) =>
        selector === challenge.marker && challenge.marker ? {} : null,
      querySelectorAll: (selector) =>
        selector.includes("h1") && challenge.heading
          ? [{ textContent: challenge.heading }]
          : []
    }
    const signals = dom.collectEbayPageSignals(challengeDocument, {
      hostname: "signin.ebay.com",
      pathname: "/challenge"
    })
    assert.equal(signals.hasManualChallenge, true)
  }

  const errorDocument = {
    title: "Sign in",
    querySelector: () => null,
    querySelectorAll: (selector) =>
      selector.includes("#signin-error-msg")
        ? [{ textContent: "The password is incorrect. Try again." }]
        : []
  }
  const errorSignals = dom.collectEbayPageSignals(errorDocument, {
    hostname: "signin.ebay.com",
    pathname: "/ws/eBayISAPI.dll"
  })
  assert.equal(errorSignals.hasCredentialError, true)
})

test("maps page states to safe, stage-aware actions", () => {
  assert.equal(
    dom.decideEbayPageAction(
      "opening_seller_hub",
      "seller_hub_authenticated",
      false
    ),
    "sign_out"
  )
  assert.equal(
    dom.decideEbayPageAction(
      "opening_seller_hub",
      "identifier_form",
      false
    ),
    "submit_identifier"
  )
  assert.equal(
    dom.decideEbayPageAction(
      "signing_out",
      "sign_out_confirmation",
      false
    ),
    "open_seller_hub"
  )
  assert.equal(
    dom.decideEbayPageAction(
      "opening_seller_hub",
      "password_form",
      true
    ),
    "switch_account"
  )
  assert.equal(
    dom.decideEbayPageAction(
      "opening_seller_hub",
      "password_form",
      false
    ),
    "pause_manual"
  )
  assert.equal(
    dom.decideEbayPageAction(
      "identifier_submitted",
      "password_form",
      false
    ),
    "submit_password"
  )
  assert.equal(
    dom.decideEbayPageAction(
      "password_submitted",
      "manual_challenge",
      false
    ),
    "pause_manual"
  )
  assert.equal(
    dom.decideEbayPageAction(
      "password_submitted",
      "seller_hub_authenticated",
      false
    ),
    "complete"
  )
  assert.equal(
    dom.decideEbayPageAction(
      "password_submitted",
      "credential_error",
      false
    ),
    "pause_error"
  )
  assert.equal(
    dom.decideEbayPageAction(
      "manual_verification",
      "seller_hub_authenticated",
      false
    ),
    "complete"
  )
  assert.equal(
    dom.decideEbayPageAction("paused_error", "password_form", false),
    null
  )
})

test("content script uses exact hosts, top frame only, and no credential logging", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../contents/ebay-login.ts"),
    "utf8"
  )

  assert.match(source, /https:\/\/www\.ebay\.com\/sh\/\*/)
  assert.match(source, /https:\/\/signin\.ebay\.com\/\*/)
  assert.match(source, /https:\/\/pages\.ebay\.com\/SignOutConfirm\*/)
  assert.match(source, /all_frames:\s*false/)
  assert.doesNotMatch(source, /https:\/\/\*\.ebay\.com/)
  assert.doesNotMatch(source, /console\.(log|error)\([^\n]*(password|credential)/i)
})
```

- [ ] **Step 2: 运行页面分类测试并确认失败**

Run:

```bash
cd rms-auto
node --test test/ebay-login-dom.test.js
```

Expected: FAIL because both `lib/ebay-login-dom.ts` and `contents/ebay-login.ts` do not exist.

- [ ] **Step 3: 实现页面信号、精确元素查找、分类和动作决策**

Create `rms-auto/lib/ebay-login-dom.ts`. Export these selectors and pure types:

```ts
import type {
  EbayAutomationAction,
  EbayLoginStage
} from "./ebay-login-state"

export const EBAY_SELECTORS = {
  identifier: [
    "input#userid",
    "input[name='userid']",
    "input[autocomplete='username']"
  ],
  password: [
    "input#pass",
    "input[name='pass']",
    "input[autocomplete='current-password']"
  ],
  continueAction: [
    "#signin-continue-btn",
    "button[type='submit']",
    "input[type='submit']"
  ],
  signInAction: ["#sgnBt", "button[type='submit']", "input[type='submit']"],
  accountTrigger: ["#gh-ug", "button[aria-label*='account' i]"],
  signOutAction: ["#gh-uo", "a[href*='SignOut']"],
  challenge: [
    "input[autocomplete='one-time-code']",
    "iframe[src*='captcha' i]",
    "[id*='captcha' i]",
    "[class*='captcha' i]"
  ],
  error: ["#signin-error-msg", "[role='alert']"]
} as const

export type EbayPageKind =
  | "seller_hub_authenticated"
  | "identifier_form"
  | "password_form"
  | "sign_out_confirmation"
  | "manual_challenge"
  | "credential_error"
  | "unknown"

export interface EbayPageSignals {
  hostname: string
  pathname: string
  hasSellerHubMarker: boolean
  hasIdentifierInput: boolean
  hasPasswordInput: boolean
  hasContinueAction: boolean
  hasSignInAction: boolean
  hasSwitchAccountAction: boolean
  hasSignOutConfirmation: boolean
  hasManualChallenge: boolean
  hasCredentialError: boolean
}
```

Implement exact-text matching and DOM helpers without substring-clicking arbitrary buttons:

```ts
const normalizeText = (value?: string | null): string => {
  return value?.replace(/\s+/g, " ").trim().toLowerCase() ?? ""
}

export const queryFirst = <T extends Element>(
  root: ParentNode,
  selectors: readonly string[]
): T | null => {
  for (const selector of selectors) {
    const element = root.querySelector<T>(selector)
    if (element) {
      return element
    }
  }
  return null
}

export const findClickableByExactText = (
  root: ParentNode,
  labels: readonly string[]
): HTMLElement | null => {
  const expected = new Set(labels.map(normalizeText))
  const elements = root.querySelectorAll<HTMLElement>(
    "button, a, [role='button'], input[type='submit'], input[type='button']"
  )
  return (
    Array.from(elements).find((element) => {
      const text =
        element instanceof HTMLInputElement ? element.value : element.textContent
      return expected.has(normalizeText(text))
    }) ?? null
  )
}

export const findSwitchAccountAction = (
  root: ParentNode
): HTMLElement | null => {
  return findClickableByExactText(root, [
    "Switch account",
    "Not you?",
    "Use another account"
  ])
}

export const findSignOutAction = (root: ParentNode): HTMLElement | null => {
  return (
    queryFirst<HTMLElement>(root, EBAY_SELECTORS.signOutAction) ??
    findClickableByExactText(root, ["Sign out"])
  )
}
```

Implement `collectEbayPageSignals`, prioritizing explicit challenge and error signals. Credential errors must require a non-empty alert matching this conservative expression:

```ts
const credentialErrorPattern =
  /(doesn't match|incorrect|try again|unable to sign in|account.*(locked|restricted))/i
const manualChallengePattern =
  /(security code|verify it's you|authenticator|passkey|captcha)/i

export interface EbayLocationLike {
  hostname: string
  pathname: string
}

const collectText = (root: ParentNode, selector: string): string => {
  return Array.from(root.querySelectorAll<HTMLElement>(selector))
    .map((element) => normalizeText(element.textContent))
    .filter(Boolean)
    .join(" ")
}

export const collectEbayPageSignals = (
  root: Document,
  location: EbayLocationLike
): EbayPageSignals => {
  const headingText = collectText(root, "h1, h2, [role='heading']")
  const alertText = collectText(root, EBAY_SELECTORS.error.join(", "))
  const challengeText = collectText(
    root,
    "h1, h2, [role='heading'], [role='alert']"
  )

  return {
    hostname: location.hostname,
    pathname: location.pathname,
    hasSellerHubMarker:
      /seller hub/i.test(`${root.title} ${headingText}`) ||
      Boolean(queryFirst(root, EBAY_SELECTORS.accountTrigger)),
    hasIdentifierInput: Boolean(
      queryFirst(root, EBAY_SELECTORS.identifier)
    ),
    hasPasswordInput: Boolean(queryFirst(root, EBAY_SELECTORS.password)),
    hasContinueAction: Boolean(
      queryFirst(root, EBAY_SELECTORS.continueAction)
    ),
    hasSignInAction: Boolean(queryFirst(root, EBAY_SELECTORS.signInAction)),
    hasSwitchAccountAction: Boolean(findSwitchAccountAction(root)),
    hasSignOutConfirmation: /you have signed out/i.test(
      `${root.title} ${headingText}`
    ),
    hasManualChallenge:
      Boolean(queryFirst(root, EBAY_SELECTORS.challenge)) ||
      manualChallengePattern.test(challengeText),
    hasCredentialError:
      alertText.length > 0 && credentialErrorPattern.test(alertText)
  }
}
```

The classifier must use this exact precedence:

```ts
export const classifyEbayPage = (signals: EbayPageSignals): EbayPageKind => {
  if (signals.hasCredentialError) return "credential_error"
  if (signals.hasManualChallenge) return "manual_challenge"
  if (
    signals.hostname === "pages.ebay.com" &&
    signals.pathname.startsWith("/SignOutConfirm") &&
    signals.hasSignOutConfirmation
  ) {
    return "sign_out_confirmation"
  }
  if (
    signals.hostname === "www.ebay.com" &&
    signals.pathname.startsWith("/sh/") &&
    signals.hasSellerHubMarker
  ) {
    return "seller_hub_authenticated"
  }
  if (signals.hasPasswordInput && signals.hasSignInAction) {
    return "password_form"
  }
  if (signals.hasIdentifierInput && signals.hasContinueAction) {
    return "identifier_form"
  }
  return "unknown"
}
```

Implement `decideEbayPageAction` with explicit stage gates:

```ts
export const decideEbayPageAction = (
  stage: EbayLoginStage,
  page: EbayPageKind,
  hasSwitchAccountAction: boolean
): EbayAutomationAction | null => {
  if (stage === "paused_error") return null
  if (page === "credential_error") return "pause_error"

  if (stage === "manual_verification") {
    return page === "seller_hub_authenticated" ? "complete" : null
  }

  if (page === "manual_challenge") return "pause_manual"
  if (
    page === "seller_hub_authenticated" &&
    stage === "password_submitted"
  ) {
    return "complete"
  }
  if (
    page === "seller_hub_authenticated" &&
    stage === "opening_seller_hub"
  ) {
    return "sign_out"
  }
  if (page === "sign_out_confirmation" && stage === "signing_out") {
    return "open_seller_hub"
  }
  if (
    page === "identifier_form" &&
    ["opening_seller_hub", "signing_out", "awaiting_identifier"].includes(
      stage
    )
  ) {
    return "submit_identifier"
  }
  if (page === "password_form" && stage === "identifier_submitted") {
    return "submit_password"
  }
  if (page === "password_form") {
    return hasSwitchAccountAction ? "switch_account" : "pause_manual"
  }
  return null
}
```

- [ ] **Step 4: 实现顶层页面内容脚本和状态提示**

Create `rms-auto/contents/ebay-login.ts` with the exact match boundary:

```ts
import type { PlasmoCSConfig } from "plasmo"

import {
  EBAY_SELECTORS,
  classifyEbayPage,
  collectEbayPageSignals,
  decideEbayPageAction,
  findSignOutAction,
  findSwitchAccountAction,
  queryFirst
} from "~lib/ebay-login-dom"
import {
  EBAY_MESSAGE_TYPES,
  EBAY_SELLER_HUB_URL,
  type EbayAutomationAction,
  type EbayClaimActionResponse,
  type EbayContextResponse
} from "~lib/ebay-login-state"
import { setInputValueAndNotify } from "~lib/login-dom"

export const config: PlasmoCSConfig = {
  matches: [
    "https://www.ebay.com/sh/*",
    "https://signin.ebay.com/*",
    "https://pages.ebay.com/SignOutConfirm*"
  ],
  all_frames: false,
  run_at: "document_idle"
}

const STATUS_ID = "rms-auto-ebay-status"
const PAGE_WAIT_MS = 10_000

const showStatus = (message: string, tone: "info" | "error" = "info") => {
  let host = document.getElementById(STATUS_ID)
  if (!host) {
    host = document.createElement("div")
    host.id = STATUS_ID
    document.documentElement.appendChild(host)
    const shadow = host.attachShadow({ mode: "open" })
    shadow.innerHTML = `
      <style>
        div { position: fixed; top: 16px; right: 16px; z-index: 2147483647;
          max-width: 320px; padding: 12px 16px; border-radius: 8px;
          color: #fff; font: 600 13px/1.5 sans-serif;
          box-shadow: 0 4px 14px rgba(0,0,0,.25); }
        .info { background: #3665f3; }
        .error { background: #c53030; }
      </style>
      <div class="info"></div>`
  }
  const box = host.shadowRoot?.querySelector("div")
  if (box) {
    box.className = tone
    box.textContent = message
  }
}

const waitForSignOutAction = async (): Promise<HTMLElement | null> => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < PAGE_WAIT_MS) {
    const action = findSignOutAction(document)
    if (action) return action
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  return null
}

const getContext = async (): Promise<EbayContextResponse> => {
  return chrome.runtime.sendMessage({
    type: EBAY_MESSAGE_TYPES.GET_CONTEXT
  })
}

const claimAction = async (
  action: EbayAutomationAction
): Promise<EbayClaimActionResponse> => {
  return chrome.runtime.sendMessage({
    type: EBAY_MESSAGE_TYPES.CLAIM_ACTION,
    action
  })
}
```

Add an `executeAction` switch that claims before every side effect:

```ts
const executeAction = async (
  action: EbayAutomationAction,
  shopName: string
): Promise<boolean> => {
  const accountTrigger =
    action === "sign_out"
      ? queryFirst<HTMLElement>(document, EBAY_SELECTORS.accountTrigger)
      : null
  const switchAccount =
    action === "switch_account" ? findSwitchAccountAction(document) : null
  const identifierInput =
    action === "submit_identifier"
      ? queryFirst<HTMLInputElement>(document, EBAY_SELECTORS.identifier)
      : null
  const continueButton =
    action === "submit_identifier"
      ? queryFirst<HTMLElement>(document, EBAY_SELECTORS.continueAction)
      : null
  const passwordInput =
    action === "submit_password"
      ? queryFirst<HTMLInputElement>(document, EBAY_SELECTORS.password)
      : null
  const signInButton =
    action === "submit_password"
      ? queryFirst<HTMLElement>(document, EBAY_SELECTORS.signInAction)
      : null

  if (action === "sign_out" && !accountTrigger) return false
  if (action === "switch_account" && !switchAccount) return false
  if (action === "submit_identifier" && (!identifierInput || !continueButton)) {
    return false
  }
  if (action === "submit_password" && (!passwordInput || !signInButton)) {
    return false
  }

  const claimed = await claimAction(action)
  if (!claimed.ok) return false

  if (action === "sign_out") {
    showStatus(`${shopName}: eBayアカウントを切り替えています`)
    accountTrigger?.click()
    const signOut = await waitForSignOutAction()
    if (!signOut) {
      showStatus("Sign out を手動で実行してください", "error")
      return false
    }
    signOut.click()
    return true
  }

  if (action === "open_seller_hub") {
    window.location.assign(EBAY_SELLER_HUB_URL)
    return true
  }

  if (action === "switch_account") {
    switchAccount?.click()
    return true
  }

  if (action === "submit_identifier") {
    if (!identifierInput || !continueButton || !claimed.credential) return false
    showStatus(`${shopName}: eBay IDを入力しています`)
    setInputValueAndNotify(identifierInput, claimed.credential)
    continueButton.click()
    return true
  }

  if (action === "submit_password") {
    if (!passwordInput || !signInButton || !claimed.credential) return false
    showStatus(`${shopName}: パスワードを入力しています`)
    setInputValueAndNotify(passwordInput, claimed.credential)
    signInButton.click()
    return true
  }

  if (action === "pause_manual") {
    showStatus(`${shopName}: eBayの確認を手動で完了してください`)
    return true
  }

  if (action === "pause_error") {
    showStatus(`${shopName}: ログイン情報を設定画面で確認してください`, "error")
    return true
  }

  if (action === "complete") {
    showStatus(`${shopName}: Seller Hubにログインしました`)
    window.setTimeout(() => document.getElementById(STATUS_ID)?.remove(), 1500)
    return true
  }

  return false
}
```

Add one debounced processor plus a `MutationObserver`. It must refetch context on each pass, reset the unresolved timer when the stage changes, and stop automation in `manual_verification` or `paused_error`. For a `signing_out` Seller Hub that remains unresolved for 10 seconds, show the manual Sign out message without changing stage; for all other unresolved active stages, claim `pause_manual` after 10 seconds. Keep logs limited to stage and action names:

```ts
let processing = false
let scheduled = 0
let observedStage = ""
let unresolvedSince = Date.now()
let pollTimer = 0
let observer: MutationObserver | null = null

const stopWatching = () => {
  observer?.disconnect()
  observer = null
  window.clearTimeout(scheduled)
  window.clearInterval(pollTimer)
}

const processPage = async () => {
  if (processing) return
  processing = true

  try {
    const context = await getContext()
    if (!context.ok) {
      stopWatching()
      return
    }

    if (observedStage !== context.stage) {
      observedStage = context.stage
      unresolvedSince = Date.now()
    }

    const signals = collectEbayPageSignals(document, window.location)
    const page = classifyEbayPage(signals)
    const action = decideEbayPageAction(
      context.stage,
      page,
      signals.hasSwitchAccountAction
    )

    if (action) {
      console.log("[eBay Auto Login]", context.stage, action)
      const executed = await executeAction(action, context.shopName)
      if (executed) {
        unresolvedSince = Date.now()
        if (["pause_manual", "pause_error", "complete"].includes(action)) {
          stopWatching()
        }
        return
      }
    }

    if (context.stage === "manual_verification") {
      showStatus(`${context.shopName}: eBayの確認を手動で完了してください`)
      stopWatching()
      return
    }

    if (context.stage === "paused_error") {
      showStatus(
        `${context.shopName}: ログイン情報を設定画面で確認してください`,
        "error"
      )
      stopWatching()
      return
    }

    if (Date.now() - unresolvedSince >= PAGE_WAIT_MS) {
      if (
        action === "sign_out" ||
        (context.stage === "signing_out" &&
          page === "seller_hub_authenticated")
      ) {
        showStatus("Sign out を手動で実行してください", "error")
        stopWatching()
        return
      }
      if (await executeAction("pause_manual", context.shopName)) {
        stopWatching()
      }
    }
  } catch {
    showStatus("eBay自動ログインとの通信に失敗しました", "error")
    stopWatching()
  } finally {
    processing = false
  }
}

const scheduleProcess = () => {
  window.clearTimeout(scheduled)
  scheduled = window.setTimeout(() => void processPage(), 100)
}

observer = new MutationObserver(scheduleProcess)
observer.observe(document.documentElement, {
  attributes: true,
  childList: true,
  subtree: true
})
pollTimer = window.setInterval(scheduleProcess, 500)
scheduleProcess()
```

Do not add credential values to any log or exception text.

- [ ] **Step 5: 运行页面测试、类型检查和构建**

Run:

```bash
cd rms-auto
node --test test/ebay-login-dom.test.js
pnpm test
pnpm typecheck
pnpm build
pnpm build:firefox
```

Expected: tests PASS, typecheck exits 0, and both builds include one eBay content script with only the three exact match patterns and `all_frames: false`.

- [ ] **Step 6: 提交页面自动化**

```bash
git add rms-auto/lib/ebay-login-dom.ts rms-auto/contents/ebay-login.ts rms-auto/test/ebay-login-dom.test.js
git commit -m "feat: automate ebay sign-in pages"
```

---

### Task 5: 设置页和弹窗接入

**Files:**
- Create: `rms-auto/test/ebay-ui-contract.test.js`
- Modify: `rms-auto/options.tsx:1-17,103-162,278-368,418-454,625-629,1450-1546`
- Modify: `rms-auto/popup.tsx:1-120,447-580`

**Interfaces:**
- Consumes: Task 1 的 `EbayShop` 和完整性函数；Task 2 的 `EBAY_MESSAGE_TYPES` 与 `EbayStartLoginResponse`。
- Produces: 4 行固定 eBay 配置、所有数据通道接线、弹窗 eBay 店铺列表、后台启动消息和用户可见状态。

- [ ] **Step 1: 写出失败的 UI 接线与无敏感日志测试**

Create `rms-auto/test/ebay-ui-contract.test.js`:

```js
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const test = require("node:test")

const read = (file) =>
  fs.readFileSync(path.resolve(__dirname, "..", file), "utf8")

test("options page threads eBay shops through storage and export", () => {
  const source = read("options.tsx")

  assert.match(source, /useState<EbayShop\[\]>/)
  assert.match(source, /Array\.from\(\{ length: EBAY_SHOP_COUNT \}/)
  assert.match(source, /ebayShops,/)
  assert.match(source, /eBay Seller Hub（自動ログイン）/)
  assert.match(source, /isCompleteEbayShop/)
  assert.doesNotMatch(source, /console\.log\("All storage data:"/)
  assert.doesNotMatch(source, /console\.log\("rmsPinCode:"/)
})

test("popup starts eBay through the background coordinator", () => {
  const source = read("popup.tsx")

  assert.match(source, /useState<EbayShop\[\]>/)
  assert.match(source, /EBAY_MESSAGE_TYPES\.START_LOGIN/)
  assert.match(source, /isCompleteEbayShop/)
  assert.match(source, /eBay Seller Hub/)
  assert.doesNotMatch(
    source,
    /openEbay[\s\S]{0,300}chrome\.tabs\.create/
  )
})
```

- [ ] **Step 2: 运行 UI 接线测试并确认失败**

Run:

```bash
cd rms-auto
node --test test/ebay-ui-contract.test.js
```

Expected: FAIL because neither UI currently imports or stores `EbayShop` and the debug handler still logs all storage data.

- [ ] **Step 3: 把固定 4 项 eBay 配置接入设置页**

In `rms-auto/options.tsx`, import:

```ts
import {
  EBAY_SHOP_COUNT,
  buildExportData,
  createEmptyEbayShop,
  hasAnyEbayField,
  isCompleteEbayShop,
  type EbayShop,
  type LocalConfigData
} from "~lib/config"
```

Keep the existing config imports in the same block. Add fixed state and update `applyConfigState` to use the complete config shape:

```ts
const [ebayShops, setEbayShops] = useState<EbayShop[]>(() =>
  Array.from({ length: EBAY_SHOP_COUNT }, () => createEmptyEbayShop())
)

const applyConfigState = (
  data: Omit<LocalConfigData, "rmsPinCode">
) => {
  setLocalShops(data.shops)
  setMercariLinks(data.mercariLinks)
  setAupayShops(data.aupayShops)
  setTemuShops(data.temuShops)
  setEbayShops(data.ebayShops)
  setVisibleCount(Math.max(getFilledCount(data.shops, hasAnyRmsField), 1))
  setVisibleMercariCount(
    Math.max(getFilledCount(data.mercariLinks, hasAnyMercariField), 1)
  )
  setVisibleAupayCount(
    Math.max(getFilledCount(data.aupayShops, hasAnyAupayField), 1)
  )
  setVisibleTemuCount(
    Math.max(getFilledCount(data.temuShops, hasAnyTemuField), 1)
  )
}

const updateEbayShop = (
  index: number,
  field: keyof EbayShop,
  value: string
) => {
  setEbayShops((current) => {
    const next = [...current]
    next[index] = { ...next[index], [field]: value }
    return next
  })
}
```

Before saving, reject partial eBay rows with an eBay-specific message:

```ts
for (let index = 0; index < ebayShops.length; index += 1) {
  const shop = ebayShops[index]
  if (hasAnyEbayField(shop) && !isCompleteEbayShop(shop)) {
    alert(`eBay No.${index + 1} に未入力の項目があるため保存できません。`)
    return
  }
}
```

Add `ebayShops` to the local save object, `createExportPayload`, imported save object, and `applyConfigState` data. The four data-writing snippets must be explicit:

```ts
await chrome.storage.local.set({
  rms: localShops,
  rmsPinCode: pin,
  mercariLinks,
  aupayShops,
  temuShops,
  ebayShops
})
```

```ts
return buildExportData({
  shops: localShops,
  mercariLinks,
  aupayShops,
  temuShops,
  ebayShops
})
```

```ts
await chrome.storage.local.set({
  rms: imported.shops,
  mercariLinks: imported.mercariLinks,
  aupayShops: imported.aupayShops,
  temuShops: imported.temuShops,
  ebayShops: imported.ebayShops,
  rmsPinCode: localPinCode || pin
})
```

Replace the debug handler so it never prints raw configuration or the PIN:

```ts
const handleDebug = async () => {
  const data = await readLocalConfig()
  console.log("=== Storage Debug Summary ===")
  console.log({
    rmsConfigured: data.shops.filter(hasAnyRmsField).length,
    mercariConfigured: data.mercariLinks.filter(hasAnyMercariField).length,
    aupayConfigured: data.aupayShops.filter(hasAnyAupayField).length,
    temuConfigured: data.temuShops.filter(hasAnyTemuField).length,
    ebayConfigured: data.ebayShops.filter(isCompleteEbayShop).length
  })
  alert("デバッグ概要をコンソールに出力しました（認証情報は含みません）。")
}
```

Add a fixed eBay card before `</fieldset>`; it has no “add row” button:

```tsx
<div style={{ ...cardStyle, marginTop: "24px" }}>
  <h2
    style={{
      fontSize: "18px",
      fontWeight: "600",
      color: "#2d3748",
      marginBottom: "12px"
    }}>
    🔵 eBay Seller Hub（自動ログイン）
  </h2>
  <p style={{ fontSize: "13px", color: "#718096", marginBottom: "16px" }}>
    4つのアカウントを登録できます。認証コードや画像認証は手動で完了してください。
    認証情報は現在の保存・エクスポート方式により平文で扱われます。
  </p>
  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
    {ebayShops.map((shop, index) => (
      <div
        key={`ebay-${index}`}
        style={{
          background: shop.name ? "#f7f9ff" : "white",
          border: shop.name ? "2px solid #a9bdf8" : "2px dashed #cbd5e0",
          borderRadius: "10px",
          padding: "16px",
          display: "grid",
          gridTemplateColumns: "40px 1fr 1fr 1fr",
          gap: "12px",
          alignItems: "center"
        }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "6px",
            background: shop.name ? "#3665f3" : "#e2e8f0",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "600"
          }}>
          {index + 1}
        </div>
        <input
          type="text"
          value={shop.name}
          onChange={(event) => updateEbayShop(index, "name", event.target.value)}
          placeholder="店舗名"
          style={inputStyle}
        />
        <input
          type="text"
          value={shop.loginId}
          onChange={(event) =>
            updateEbayShop(index, "loginId", event.target.value)
          }
          placeholder="メールアドレスまたはユーザー名"
          style={inputStyle}
        />
        <input
          type={showPassword ? "text" : "password"}
          value={shop.password}
          onChange={(event) =>
            updateEbayShop(index, "password", event.target.value)
          }
          placeholder="パスワード"
          style={inputStyle}
        />
      </div>
    ))}
  </div>
</div>
```

- [ ] **Step 4: 把 eBay 店铺列表和后台启动消息接入弹窗**

In `rms-auto/popup.tsx`, import `EbayShop`, `isCompleteEbayShop`, `EBAY_MESSAGE_TYPES`, and `EbayStartLoginResponse`. Add state and load it from `readLocalConfig()`:

```ts
const [ebayShops, setEbayShops] = useState<EbayShop[]>([])
const [actionNotice, setActionNotice] = useState("")
```

```ts
setEbayShops(localData.ebayShops)
```

Add complete-row filtering and the start handler:

```ts
const validEbayShops = ebayShops
  .map((shop, index) => ({ shop, index }))
  .filter(({ shop }) => isCompleteEbayShop(shop))

const openEbay = async (shopIndex: number) => {
  try {
    const result = (await chrome.runtime.sendMessage({
      type: EBAY_MESSAGE_TYPES.START_LOGIN,
      shopIndex
    })) as EbayStartLoginResponse

    if (result.ok) {
      setActionNotice("")
      return
    }

    setActionNotice(
      result.reason === "active_login"
        ? "eBayログイン処理中のタブを表示しました。"
        : "eBayログインを開始できませんでした。設定を確認してください。"
    )
  } catch {
    setActionNotice("eBayログイン機能との通信に失敗しました。")
  }
}
```

Render `actionNotice` after `syncNotice`:

```tsx
{actionNotice ? (
  <div
    style={{
      margin: "12px 12px 0",
      padding: "10px 12px",
      background: "#ebf4ff",
      border: "1px solid #a9bdf8",
      borderRadius: "8px",
      color: "#2c5282",
      fontSize: "12px"
    }}>
    {actionNotice}
  </div>
) : null}
```

Add an eBay section after TEMU:

```tsx
{validEbayShops.length > 0 ? (
  <div
    style={{
      padding: "12px 12px 0",
      display: "flex",
      flexDirection: "column",
      gap: "8px"
    }}>
    <div
      style={{
        fontSize: "11px",
        fontWeight: "600",
        color: "#718096",
        padding: "0 4px"
      }}>
      eBay Seller Hub
    </div>
    {validEbayShops.map(({ shop, index }) => (
      <div
        key={`ebay-${index}`}
        onClick={() => void openEbay(index)}
        style={{
          padding: "12px 16px",
          background: "white",
          borderRadius: "8px",
          border: "1px solid #a9bdf8",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
        <span style={{ fontWeight: "600", color: "#2d3748" }}>
          {shop.name}
        </span>
        <span style={{ color: "#cbd5e0", fontSize: "12px" }}>➜</span>
      </div>
    ))}
  </div>
) : null}
```

Change the existing empty-state ternary condition to:

```ts
validShops.length === 0 &&
validMercariLinks.length === 0 &&
validAupayShops.length === 0 &&
validTemuShops.length === 0 &&
validEbayShops.length === 0
```

Change the existing footer visibility expression to:

```ts
validShops.length > 0 ||
validMercariLinks.length > 0 ||
validAupayShops.length > 0 ||
validTemuShops.length > 0 ||
validEbayShops.length > 0
```

Add this exact item to the existing footer summary array after TEMU:

```ts
validEbayShops.length > 0 && `eBay ${validEbayShops.length}`
```

- [ ] **Step 5: 运行 UI 测试、全量测试、类型检查和双构建**

Run:

```bash
cd rms-auto
node --test test/ebay-ui-contract.test.js
pnpm test
pnpm typecheck
pnpm build
pnpm build:firefox
```

Expected: all tests PASS, typecheck exits 0, and both browser builds complete successfully.

- [ ] **Step 6: 提交 UI 接入**

```bash
git add rms-auto/options.tsx rms-auto/popup.tsx rms-auto/test/ebay-ui-contract.test.js
git commit -m "feat: expose ebay accounts in extension ui"
```

---

### Task 6: 文档、格式化、构建清单与人工验收交接

**Files:**
- Modify: `rms-auto/example-export.json`
- Modify: `rms-auto/README.md`
- Modify: `rms-auto/FEATURES.md`
- Modify: `rms-auto/EXPORT_FORMAT.md`
- Modify: `rms-auto/VERSION_HISTORY.md`

**Interfaces:**
- Consumes: 完整功能、测试命令和 `0.2.0` 数据格式。
- Produces: 可交付文档、示例配置、双浏览器构建证据和不接触真实凭据的人工验收步骤。

- [ ] **Step 1: 更新示例导出和用户文档**

Change `rms-auto/example-export.json` to version `0.2.0` and add exactly four synthetic eBay rows. At least one row demonstrates the schema and the remaining rows are empty:

```json
"ebayShops": [
  {
    "name": "eBayテスト店舗1",
    "loginId": "seller@example.test",
    "password": "example-password"
  },
  {
    "name": "",
    "loginId": "",
    "password": ""
  },
  {
    "name": "",
    "loginId": "",
    "password": ""
  },
  {
    "name": "",
    "loginId": "",
    "password": ""
  }
]
```

Add these bullets to `rms-auto/README.md` under features:

```md
- eBay Seller Hub の独立4アカウント管理と順次自動ログイン
- eBay アカウント切り替え時の自動 Sign out
- SMS、Passkey、画像認証などの確認画面では安全に一時停止
```

Add this eBay usage section after the current login section:

```md
### eBay Seller Hub ログイン

1. オプションページの「eBay Seller Hub（自動ログイン）」に最大4件を設定
2. ポップアップから店舗名を選択
3. 現在の eBay セッションがある場合は自動で Sign out
4. メールアドレスまたはユーザー名とパスワードを自動入力
5. SMS、Passkey、Authenticator、画像認証が表示された場合は手動で完了

同じブラウザ内では eBay の Cookie を共有するため、複数アカウントの同時ログインではなく順次切り替えとして動作します。
```

Add an eBay section to `rms-auto/FEATURES.md` that explicitly states four accounts, automatic old-session sign-out, one active login task, ten-minute expiry, and manual verification boundaries.

- [ ] **Step 2: 更新导出格式和版本历史**

In `rms-auto/EXPORT_FORMAT.md`, set the sample version to `0.2.0`, include the `ebayShops` example, and add:

```md
### ebayShops 配列の各要素

- `name` (string): ポップアップに表示する店舗名
- `loginId` (string): eBay のメールアドレスまたはユーザー名
- `password` (string): eBay パスワード

`ebayShops` は最大4件です。旧形式でこの配列が存在しない場合は、4件の空設定として読み込まれます。
```

Keep the existing plaintext warning and extend it to explicitly include eBay credentials and remote read-only JSON.

Add this release entry at the top of `rms-auto/VERSION_HISTORY.md`:

```md
## v0.2.0 (2026-09-02)

### 新機能

- eBay Seller Hub の独立4アカウント設定を追加
- タブ単位のログイン状態管理と同時実行防止を追加
- 既存 eBay セッションの Sign out、ID・パスワードの順次入力を追加
- SMS、Authenticator、Passkey、CAPTCHA、未知画面での安全停止を追加
- eBay 設定をファイル、クリップボード、内網只読同期に追加

### 互換性

- eBay 設定を含まない旧エクスポートは4件の空設定として読み込み可能
- Chrome Manifest V3 と Firefox Manifest V2 を継続サポート
```

- [ ] **Step 3: 格式化所有改动文件**

Run:

```bash
cd rms-auto
pnpm exec prettier --write \
  background.ts \
  contents/ebay-login.ts \
  lib/config.ts \
  lib/ebay-login-state.ts \
  lib/ebay-login-coordinator.ts \
  lib/ebay-login-dom.ts \
  options.tsx \
  popup.tsx \
  package.json \
  example-export.json \
  README.md \
  FEATURES.md \
  EXPORT_FORMAT.md \
  VERSION_HISTORY.md
```

Expected: Prettier exits 0 and does not alter any test fixture into a real credential value.

- [ ] **Step 4: 运行完整自动验证**

Run:

```bash
cd rms-auto
pnpm test
pnpm typecheck
pnpm build
pnpm build:firefox
```

Expected: all Node tests PASS, TypeScript exits 0, Chrome MV3 build succeeds, and Firefox MV2 build succeeds.

- [ ] **Step 5: 检查生成 manifest 的权限和匹配范围**

Run:

```bash
cd rms-auto
node -e 'const m=require("./build/chrome-mv3-prod/manifest.json"); console.log(JSON.stringify({background:m.background, ebay:m.content_scripts.filter((s)=>s.matches.some((x)=>x.includes("ebay.com"))).map((s)=>({matches:s.matches,all_frames:s.all_frames}))},null,2))'
node -e 'const m=require("./build/firefox-mv2-prod/manifest.json"); console.log(JSON.stringify({background:m.background, ebay:m.content_scripts.filter((s)=>s.matches.some((x)=>x.includes("ebay.com"))).map((s)=>({matches:s.matches,all_frames:s.all_frames}))},null,2))'
```

Expected for both manifests:

- a generated background entry exists;
- eBay matches contain only the three approved patterns;
- `all_frames` is `false` or omitted as the browser default;
- no Cookie permission is present.

- [ ] **Step 6: 检查 diff、占位符和敏感资料边界**

Run:

```bash
git diff --check
git status --short
git diff -- rms-auto
```

Expected: no whitespace errors, only planned files changed, synthetic values use `.test` domains, and no value from the supplied screenshot appears anywhere in the diff.

- [ ] **Step 7: 提交文档和最终验证结果**

```bash
git add rms-auto/example-export.json rms-auto/README.md rms-auto/FEATURES.md rms-auto/EXPORT_FORMAT.md rms-auto/VERSION_HISTORY.md
git commit -m "docs: document ebay login workflow"
```

- [ ] **Step 8: 交给用户执行真实账号人工验收**

Do not copy credentials from the conversation or attachment. Ask the user to enter or sync them through the extension settings, then walk through this exact matrix without recording credentials:

1. Each of the four configured store buttons reaches the selected account's Seller Hub from a signed-out browser.
2. Switching from an already signed-in account signs it out before filling the selected account.
3. Identifier and password are each submitted once.
4. SMS verification pauses automation and resumes to success after the user completes it.
5. CAPTCHA or Passkey pages receive no automatic input or bypass attempt.
6. A deliberately stale test password stops after one attempt and shows the settings message.
7. Closing the active login tab allows a new store selection.
8. Clicking a second store during an active flow focuses the first tab and does not replace its shop index.
9. Waiting more than ten minutes prevents later pages from receiving credentials.
10. A legacy export imports with four empty eBay slots; a `0.2.0` export, clipboard copy, and remote JSON preserve all four slots.
11. At least one full switch is completed in Chrome and one in Firefox.

Record only store display name, browser, pass/fail, and non-sensitive error category. If eBay redirects to an official host outside the three approved match patterns, capture only the host and sanitized page structure; add that exact host and a failing classifier test before extending automation.

---

## Final Verification Checklist

- [ ] `pnpm test` passes.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm build` passes.
- [ ] `pnpm build:firefox` passes.
- [ ] Generated manifests contain the expected background and exact eBay content-script matches.
- [ ] No Cookie permission or broad eBay content-script wildcard was added.
- [ ] No real email, password, PIN, verification code, or screenshot value appears in Git diff or logs.
- [ ] Legacy import and `0.2.0` export/sync behavior are verified.
- [ ] User completes the 11-item real-account acceptance matrix.
