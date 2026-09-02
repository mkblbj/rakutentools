# eBay 四账号自动登录精简实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `rms-auto` 中加入 4 个 eBay Seller Hub 账号的顺序切换、邮箱和密码自动填写，并在验证码或未知页面停止。

**Architecture:** 沿用项目现有的 `chrome.storage.local` 和内容脚本模式。弹窗保存一个带账号索引、阶段和时间戳的全局登录任务；单个 eBay 内容脚本根据当前页面和阶段完成退出、邮箱提交或密码提交，不增加后台 service worker、消息协调器或页面状态框架。

**Tech Stack:** Plasmo 0.90.5、React 18、TypeScript 5.3、Chrome Extension API、Node.js `node:test`

**Spec:** `docs/superpowers/specs/2026-09-02-ebay-multi-account-auto-login-design.md`

## Global Constraints

- 固定支持 4 个 eBay 账号，字段为 `name`、`loginId`、`password`。
- Seller Hub 入口固定为 `https://www.ebay.com/sh/ovw`。
- 只支持顺序切换；新选择可以覆盖旧登录任务。
- 登录任务只保存账号索引、阶段和开始时间，10 分钟后失效。
- 阶段必须在点击 Continue 或 Sign in 前写入，防止重复提交。
- 验证码、Authenticator、Passkey、CAPTCHA 和未知页面不自动处理。
- 真实账号和密码不得进入源码、测试、示例、URL 或日志。
- eBay 配置必须进入现有本地保存、导入导出、剪贴板和内网同步流程。
- 不增加后台 service worker、Cookie 权限、新依赖或其他平台重构。
- Chrome MV3 与 Firefox MV2 都必须构建通过。

---

## File Map

### Create

- `rms-auto/lib/ebay-login.ts`：登录任务类型、阶段判断和 10 分钟过期判断。
- `rms-auto/contents/ebay-login.ts`：eBay 退出、邮箱填写、密码填写和人工验证停止逻辑。
- `rms-auto/test/ebay-login.test.js`：配置兼容、任务阶段和关键接线测试。

### Modify

- `rms-auto/lib/config.ts`：增加固定 4 项的 `ebayShops`。
- `rms-auto/options.tsx`：增加 eBay 设置并接入保存、导入导出和同步。
- `rms-auto/popup.tsx`：显示 eBay 店铺、保存登录任务并打开 Seller Hub。
- `rms-auto/package.json`：版本升为 `0.2.0`，增加 `test` 和 `typecheck` 命令。
- `rms-auto/README.md`：增加简短使用说明。
- `rms-auto/EXPORT_FORMAT.md`：增加 `ebayShops` 格式说明。

---

### Task 1: 配置模型与最小登录任务

**Files:**
- Create: `rms-auto/lib/ebay-login.ts`
- Create: `rms-auto/test/ebay-login.test.js`
- Modify: `rms-auto/lib/config.ts:1-310`
- Modify: `rms-auto/package.json:1-45`

**Interfaces:**
- Consumes: 现有固定长度配置规范化方式。
- Produces: `EbayShop`, `EBAY_SHOP_COUNT`, `createEmptyEbayShop()`, `isCompleteEbayShop()`, `EbayLoginTask`, `createEbayLoginTask()`, `normalizeEbayLoginTask()`, `isEbayLoginTaskExpired()`.

- [ ] **Step 1: 写出失败的配置与任务测试**

Create `rms-auto/test/ebay-login.test.js`:

```js
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
    login.canSubmitPassword(login.withEbayLoginPhase(task, "identifierSubmitted")),
    true
  )
  assert.equal(
    login.isEbayLoginCompletionPhase(
      login.withEbayLoginPhase(task, "manual")
    ),
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
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
cd rms-auto
node --test test/ebay-login.test.js
```

Expected: FAIL because eBay config exports and `lib/ebay-login.ts` do not exist.

- [ ] **Step 3: 实现最小登录任务辅助函数**

Create `rms-auto/lib/ebay-login.ts`:

```ts
export const EBAY_LOGIN_TASK_KEY = "ebayAutoLoginTask"
export const EBAY_LOGIN_TIMEOUT_MS = 10 * 60 * 1000
export const EBAY_SELLER_HUB_URL = "https://www.ebay.com/sh/ovw"

export type EbayLoginPhase =
  | "start"
  | "signingOut"
  | "identifierSubmitted"
  | "passwordSubmitted"
  | "manual"

export interface EbayLoginTask {
  shopIndex: number
  phase: EbayLoginPhase
  startedAt: number
}

const phases: EbayLoginPhase[] = [
  "start",
  "signingOut",
  "identifierSubmitted",
  "passwordSubmitted",
  "manual"
]

export const createEbayLoginTask = (
  shopIndex: number,
  now = Date.now()
): EbayLoginTask => ({
  shopIndex,
  phase: "start",
  startedAt: now
})

export const normalizeEbayLoginTask = (
  value: unknown
): EbayLoginTask | null => {
  if (!value || typeof value !== "object") return null
  const source = value as Partial<EbayLoginTask>
  const shopIndex = source.shopIndex
  const phase = source.phase
  const startedAt = source.startedAt
  if (
    typeof shopIndex !== "number" ||
    !Number.isInteger(shopIndex) ||
    shopIndex < 0 ||
    shopIndex >= 4 ||
    !phases.includes(phase as EbayLoginPhase) ||
    typeof startedAt !== "number"
  ) {
    return null
  }
  return { shopIndex, phase: phase as EbayLoginPhase, startedAt }
}

export const withEbayLoginPhase = (
  task: EbayLoginTask,
  phase: EbayLoginPhase
): EbayLoginTask => ({ ...task, phase })

export const canSubmitIdentifier = (task: EbayLoginTask): boolean => {
  return task.phase === "start" || task.phase === "signingOut"
}

export const canSubmitPassword = (task: EbayLoginTask): boolean => {
  return task.phase === "identifierSubmitted"
}

export const isEbayLoginCompletionPhase = (task: EbayLoginTask): boolean => {
  return ["identifierSubmitted", "passwordSubmitted", "manual"].includes(
    task.phase
  )
}

export const isEbayLoginTaskExpired = (
  task: EbayLoginTask,
  now = Date.now()
): boolean => now - task.startedAt >= EBAY_LOGIN_TIMEOUT_MS
```

- [ ] **Step 4: 把 eBay 配置接入 `config.ts`**

Add the following declarations and normalizer:

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
  if (!value || typeof value !== "object") return createEmptyEbayShop()
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

Add `ebayShops?: EbayShop[]` to `ExportData` and `ebayShops: EbayShop[]` to `LocalConfigData`. Thread this exact normalized field through `normalizeExportData` and `readLocalConfig`:

```ts
ebayShops: normalizeFixedLengthArray(
  source.ebayShops,
  EBAY_SHOP_COUNT,
  normalizeEbayShop,
  createEmptyEbayShop
)
```

```ts
ebayShops: normalizeFixedLengthArray(
  data.ebayShops,
  EBAY_SHOP_COUNT,
  normalizeEbayShop,
  createEmptyEbayShop
)
```

Add `"ebayShops"` to the `chrome.storage.local.get` key list. Add `ebayShops` to `buildExportData` and `writeLocalConfig`. Make the `buildExportData` input accept an optional eBay array until Task 2 wires the UI:

```ts
type ExportConfigInput = Omit<LocalConfigData, "rmsPinCode" | "ebayShops"> & {
  ebayShops?: EbayShop[]
}
```

Use this complete export function body:

```ts
export const buildExportData = (data: ExportConfigInput): ExportData => ({
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
})
```

Add the field to the existing local writer:

```ts
await chrome.storage.local.set({
  rms: data.shops,
  mercariLinks: data.mercariLinks,
  aupayShops: data.aupayShops,
  temuShops: data.temuShops,
  ebayShops: data.ebayShops
})
```

- [ ] **Step 5: 更新版本和测试命令**

In `rms-auto/package.json`:

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

- [ ] **Step 6: 验证并提交**

Run:

```bash
cd rms-auto
pnpm test
pnpm typecheck
```

Expected: all tests PASS and TypeScript exits 0.

Commit:

```bash
git add rms-auto/lib/config.ts rms-auto/lib/ebay-login.ts rms-auto/package.json rms-auto/test/ebay-login.test.js
git commit -m "feat: add ebay account data"
```

---

### Task 2: 设置页与弹窗入口

**Files:**
- Modify: `rms-auto/options.tsx:1-460,625-1572`
- Modify: `rms-auto/popup.tsx:1-586`

**Interfaces:**
- Consumes: Task 1 的 `EbayShop`, `EBAY_SHOP_COUNT`, `isCompleteEbayShop()`, `createEbayLoginTask()`.
- Produces: 4 行 eBay 设置、完整数据通道、弹窗店铺按钮和全局登录任务。

- [ ] **Step 1: 接入设置页状态、校验和数据通道**

In `options.tsx`, import the Task 1 eBay types and helpers, then add:

```ts
const [ebayShops, setEbayShops] = useState<EbayShop[]>(() =>
  Array.from({ length: EBAY_SHOP_COUNT }, () => createEmptyEbayShop())
)

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

Add `ebayShops: EbayShop[]` to the `applyConfigState` input type and call `setEbayShops(data.ebayShops)`. Before save, reject partially filled rows:

```ts
for (let index = 0; index < ebayShops.length; index += 1) {
  const shop = ebayShops[index]
  if (hasAnyEbayField(shop) && !isCompleteEbayShop(shop)) {
    alert(`eBay No.${index + 1} に未入力の項目があります。`)
    return
  }
}
```

Use these exact save, export and import properties:

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

Replace the raw debug dump so eBay and existing credentials are not printed:

```ts
const handleDebug = async () => {
  const data = await readLocalConfig()
  console.log({
    rmsConfigured: data.shops.filter(hasAnyRmsField).length,
    ebayConfigured: data.ebayShops.filter(isCompleteEbayShop).length
  })
  alert("デバッグ概要を出力しました（認証情報は含みません）。")
}
```

Insert one fixed card before the end of the existing `fieldset`:

```tsx
<div style={{ ...cardStyle, marginTop: "24px" }}>
  <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>
    eBay Seller Hub（自動ログイン）
  </h2>
  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
    {ebayShops.map((shop, index) => (
      <div
        key={`ebay-${index}`}
        style={{
          display: "grid",
          gridTemplateColumns: "40px 1fr 1fr 1fr",
          gap: "12px",
          alignItems: "center"
        }}>
        <strong>{index + 1}</strong>
        <input
          value={shop.name}
          onChange={(event) => updateEbayShop(index, "name", event.target.value)}
          placeholder="店舗名"
          style={inputStyle}
        />
        <input
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

- [ ] **Step 2: 接入弹窗按钮**

In `popup.tsx`, import `EbayShop`, `isCompleteEbayShop`, and these login helpers:

```ts
import {
  EBAY_LOGIN_TASK_KEY,
  EBAY_SELLER_HUB_URL,
  createEbayLoginTask
} from "~lib/ebay-login"
```

Add state, loading and filtering:

```ts
const [ebayShops, setEbayShops] = useState<EbayShop[]>([])
setEbayShops(localData.ebayShops)

const validEbayShops = ebayShops
  .map((shop, index) => ({ shop, index }))
  .filter(({ shop }) => isCompleteEbayShop(shop))
```

Start login without a background coordinator:

```ts
const openEbay = async (shopIndex: number) => {
  await chrome.storage.local.set({
    [EBAY_LOGIN_TASK_KEY]: createEbayLoginTask(shopIndex)
  })
  chrome.tabs.create({ url: EBAY_SELLER_HUB_URL })
}
```

Render one simple section using the existing popup card style:

```tsx
{validEbayShops.length > 0 ? (
  <div style={{ padding: "12px 12px 0" }}>
    <div style={{ fontSize: "11px", fontWeight: "600", color: "#718096" }}>
      eBay Seller Hub
    </div>
    {validEbayShops.map(({ shop, index }) => (
      <div
        key={`ebay-${index}`}
        onClick={() => void openEbay(index)}
        style={{
          marginTop: "8px",
          padding: "12px 16px",
          background: "white",
          border: "1px solid #a9bdf8",
          borderRadius: "8px",
          cursor: "pointer"
        }}>
        {shop.name}
      </div>
    ))}
  </div>
) : null}
```

Append `&& validEbayShops.length === 0` to the existing empty-state condition. Append this item to the existing footer summary array:

```ts
validEbayShops.length > 0 && `eBay ${validEbayShops.length}`
```

Also append `|| validEbayShops.length > 0` to the footer visibility condition.

- [ ] **Step 3: 验证并提交**

Run:

```bash
cd rms-auto
pnpm test
pnpm typecheck
pnpm build
pnpm build:firefox
```

Expected: tests PASS, typecheck exits 0, and both builds succeed.

Commit:

```bash
git add rms-auto/options.tsx rms-auto/popup.tsx
git commit -m "feat: add ebay account controls"
```

---

### Task 3: 核心登录脚本与最小文档

**Files:**
- Create: `rms-auto/contents/ebay-login.ts`
- Modify: `rms-auto/README.md`
- Modify: `rms-auto/EXPORT_FORMAT.md`

**Interfaces:**
- Consumes: Task 1 的登录任务和配置；现有 `setInputValueAndNotify()`。
- Produces: Seller Hub 退出、邮箱提交、密码提交、人工验证停止和最终任务清理。

- [ ] **Step 1: 实现单一 eBay 内容脚本**

Create `rms-auto/contents/ebay-login.ts` with exact matches and no iframe execution:

```ts
import type { PlasmoCSConfig } from "plasmo"

import { isCompleteEbayShop, readLocalConfig } from "~lib/config"
import {
  EBAY_LOGIN_TASK_KEY,
  EBAY_SELLER_HUB_URL,
  canSubmitIdentifier,
  canSubmitPassword,
  isEbayLoginCompletionPhase,
  isEbayLoginTaskExpired,
  normalizeEbayLoginTask,
  withEbayLoginPhase,
  type EbayLoginPhase,
  type EbayLoginTask
} from "~lib/ebay-login"
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

const queryFirst = <T extends Element>(selectors: string[]): T | null => {
  for (const selector of selectors) {
    const element = document.querySelector<T>(selector)
    if (element) return element
  }
  return null
}

const findExactAction = (labels: string[]): HTMLElement | null => {
  const expected = new Set(labels.map((label) => label.toLowerCase()))
  return (
    Array.from(
      document.querySelectorAll<HTMLElement>("button, a, [role='button']")
    ).find((element) =>
      expected.has(element.textContent?.trim().toLowerCase() ?? "")
    ) ?? null
  )
}

const hasManualChallenge = (): boolean => {
  if (
    document.querySelector(
      "input[autocomplete='one-time-code'], iframe[src*='captcha' i], [id*='captcha' i]"
    )
  ) {
    return true
  }
  const heading = Array.from(
    document.querySelectorAll<HTMLElement>("h1, h2, [role='heading']")
  )
    .map((element) => element.textContent ?? "")
    .join(" ")
  return /(passkey|authenticator|security code|verify it's you)/i.test(heading)
}

const savePhase = async (task: EbayLoginTask, phase: EbayLoginPhase) => {
  await chrome.storage.local.set({
    [EBAY_LOGIN_TASK_KEY]: withEbayLoginPhase(task, phase)
  })
}

const clearTask = async () => {
  await chrome.storage.local.remove(EBAY_LOGIN_TASK_KEY)
}
```

Add the page processor. It must update the phase before each form click:

```ts
let processing = false
let signOutClicked = false
let switchAccountClicked = false
let observer: MutationObserver | null = null

const processPage = async () => {
  if (processing) return
  processing = true

  try {
    const stored = await chrome.storage.local.get(EBAY_LOGIN_TASK_KEY)
    const task = normalizeEbayLoginTask(stored[EBAY_LOGIN_TASK_KEY])
    if (!task) {
      observer?.disconnect()
      return
    }
    if (isEbayLoginTaskExpired(task)) {
      await clearTask()
      observer?.disconnect()
      return
    }

    const local = await readLocalConfig()
    const shop = local.ebayShops[task.shopIndex]
    if (!shop || !isCompleteEbayShop(shop)) {
      await clearTask()
      observer?.disconnect()
      return
    }

    const host = window.location.hostname
    const path = window.location.pathname

    if (host === "pages.ebay.com" && path.startsWith("/SignOutConfirm")) {
      await savePhase(task, "start")
      window.location.assign(EBAY_SELLER_HUB_URL)
      return
    }

    if (host === "www.ebay.com" && path.startsWith("/sh/")) {
      if (isEbayLoginCompletionPhase(task)) {
        await clearTask()
        observer?.disconnect()
        return
      }

      const signOut = queryFirst<HTMLElement>([
        "#gh-uo",
        "a[href*='SignOut']"
      ])
      if (task.phase === "signingOut" && signOut && !signOutClicked) {
        signOutClicked = true
        signOut.click()
        return
      }

      if (task.phase === "start") {
        const accountMenu = queryFirst<HTMLElement>(["#gh-ug"])
        const menuText = accountMenu?.textContent ?? ""
        if (accountMenu && !/sign in/i.test(menuText)) {
          await savePhase(task, "signingOut")
          accountMenu.click()
        }
      }
      return
    }

    if (host !== "signin.ebay.com" || task.phase === "manual") return

    if (hasManualChallenge()) {
      await savePhase(task, "manual")
      observer?.disconnect()
      return
    }

    const identifier = queryFirst<HTMLInputElement>([
      "#userid",
      "input[name='userid']",
      "input[autocomplete='username']"
    ])
    const continueButton = queryFirst<HTMLElement>([
      "#signin-continue-btn"
    ])
    if (
      identifier &&
      continueButton &&
      canSubmitIdentifier(task)
    ) {
      await savePhase(task, "identifierSubmitted")
      setInputValueAndNotify(identifier, shop.loginId)
      continueButton.click()
      return
    }

    const password = queryFirst<HTMLInputElement>([
      "#pass",
      "input[name='pass']",
      "input[autocomplete='current-password']"
    ])
    const signInButton = queryFirst<HTMLElement>(["#sgnBt"])
    if (password && signInButton && canSubmitPassword(task)) {
      await savePhase(task, "passwordSubmitted")
      setInputValueAndNotify(password, shop.password)
      signInButton.click()
      return
    }

    if (
      password &&
      canSubmitIdentifier(task) &&
      !switchAccountClicked
    ) {
      const switchAccount = findExactAction([
        "Switch account",
        "Not you?",
        "Use another account"
      ])
      if (switchAccount) {
        switchAccountClicked = true
        switchAccount.click()
      }
    }
  } finally {
    processing = false
  }
}

observer = new MutationObserver(() => void processPage())
observer.observe(document.documentElement, {
  childList: true,
  subtree: true
})
void processPage()
```

Do not add credential values to logs or URLs.

- [ ] **Step 2: 更新最小文档**

In `README.md`, add these feature bullets:

```md
- eBay Seller Hub の独立4アカウント設定
- 現在の eBay アカウントを Sign out して順次ログイン
- SMS、Passkey、画像認証が表示された場合は手動操作へ移行
```

Add this usage section:

```md
### eBay Seller Hub

1. オプションページで最大4件の eBay アカウントを設定
2. ポップアップから店舗名を選択
3. 既存の eBay セッションがあれば Sign out
4. メールアドレスまたはユーザー名とパスワードを自動入力
5. SMS、Passkey、Authenticator、画像認証は手動で完了

同じブラウザでは eBay Cookie を共有するため、複数アカウントは同時ログインではなく順次切り替えで使用します。
```

In `EXPORT_FORMAT.md`, set the format version to `0.2.0` and document:

```json
"ebayShops": [
  {
    "name": "eBayテスト店舗",
    "loginId": "seller@example.test",
    "password": "example-password"
  }
]
```

State that the array supports four items, is optional for legacy imports, and contains plaintext credentials.

- [ ] **Step 3: 完整验证**

Run:

```bash
cd rms-auto
pnpm exec prettier --write lib/config.ts lib/ebay-login.ts contents/ebay-login.ts options.tsx popup.tsx package.json README.md EXPORT_FORMAT.md
pnpm test
pnpm typecheck
pnpm build
pnpm build:firefox
```

Expected: formatting exits 0, tests PASS, typecheck exits 0, and both builds succeed.

Manually verify only these four core cases without recording credentials:

1. Signed-out browser fills email and password for a selected shop.
2. Existing eBay account signs out before the selected shop is filled.
3. SMS verification stops further automatic input.
4. CAPTCHA or an unknown page does not repeat-submit either form.

- [ ] **Step 4: 提交核心实现**

```bash
git add rms-auto/contents/ebay-login.ts rms-auto/README.md rms-auto/EXPORT_FORMAT.md
git commit -m "feat: add ebay seller hub login"
```

---

## Final Verification

- [ ] Four eBay configurations save, import, export, and sync.
- [ ] Popup selection creates one global login task and opens Seller Hub.
- [ ] Identifier and password stages update before clicking.
- [ ] Verification and unknown pages receive no automatic bypass.
- [ ] No background service worker, new dependency, Cookie permission, real credential, or credential log is added.
- [ ] Tests, TypeScript, Chrome build, and Firefox build pass.
