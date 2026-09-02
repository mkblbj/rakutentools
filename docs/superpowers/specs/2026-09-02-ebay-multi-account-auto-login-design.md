# eBay 四账号自动登录设计

**日期：** 2026-09-02  
**状态：** 已确认，待实施计划  
**目标项目：** `rms-auto`

## 1. 背景

`rms-auto` 已支持 Rakuten RMS、au PAY Market 和 TEMU 的多账号入口及自动填表。新需求是在同一扩展中加入 4 个相互独立的 eBay 商家账号，入口固定为 [eBay Seller Hub](https://www.ebay.com/sh/ovw)。

用户从扩展弹窗选择店铺后，扩展应退出当前 eBay 会话，依次完成邮箱或用户名与密码步骤，并最终进入 Seller Hub。短信验证码、Authenticator、eBay App 确认、Passkey、人机校验及其他风控页面由用户手动完成。

四个账号在同一个浏览器配置中共享 `ebay.com` Cookie，因此本设计提供顺序切换，不承诺四个账号同时保持登录。

## 2. 已确认决策

1. 采用四套独立账号分别登录，不采用 eBay Team access。
2. 目标页面是 `https://www.ebay.com/sh/ovw`。
3. 切换店铺时允许自动退出当前 eBay 账号。
4. 自动化负责邮箱或用户名、密码以及这两个步骤所需的继续或登录点击。
5. 验证码、人机校验、Passkey 和未知风控页面必须暂停并交给用户。
6. 一期以便利性优先，允许凭据沿用项目现有的明文存储、导入导出及内网只读同步方式。
7. 真实账号、邮箱和密码不得写入源码、测试、示例或文档。
8. 同一时刻只允许一个 eBay 登录任务，避免共享 Cookie 导致并发流程相互干扰。

## 3. 目标与非目标

### 3.1 目标

- 在设置页维护固定 4 个 eBay 店铺配置。
- 在弹窗中按店铺名直观选择账号。
- 按标签页绑定所选账号，重定向后仍能可靠恢复登录阶段。
- 进入 Seller Hub 前主动结束旧账号会话。
- 对分步登录、异步渲染和人工验证提供可恢复的状态控制。
- 保持旧配置、文件导入导出、剪贴板导入导出和内网同步兼容。
- Chrome MV3 与 Firefox MV2 均可构建和使用。

### 3.2 非目标

- 不自动读取或填写短信验证码、TOTP 或 App 确认。
- 不绕过 CAPTCHA、人机校验、Passkey 或 eBay 风控。
- 不维持四套并行 Cookie 会话。
- 不接入 Team access、eBay API 或 OAuth。
- 一期不加密本地配置或导出数据。
- 不把截图中的凭据自动写入项目或构建产物。

## 4. 总体架构

功能拆成四个边界明确的单元：

1. **配置模型**：负责 eBay 店铺结构、固定长度规范化、存储和导入导出兼容。
2. **弹窗与设置 UI**：负责维护配置、展示可用店铺和发起登录，不执行页面自动化。
3. **后台登录协调器**：持有唯一活动任务，按标签页校验消息、推进状态、按需读取凭据并清理任务。
4. **eBay 页面适配器**：识别官方页面状态，执行一次性的填表或点击，并把结果报告给协调器。

页面识别与状态转换采用纯函数实现，DOM 副作用放在薄适配层中，以便对 eBay 页面变化进行独立测试。

### 4.1 预期代码边界

- `rms-auto/lib/config.ts`：增加 eBay 配置类型、规范化、读写和导出。
- `rms-auto/options.tsx`：增加固定 4 项的 eBay 设置区域及校验。
- `rms-auto/popup.tsx`：增加 eBay Seller Hub 分区和启动入口。
- `rms-auto/background.ts`：新增标签页级登录协调器和唯一活动任务锁。
- `rms-auto/lib/ebay-login-state.ts`：纯状态转换与超时判断。
- `rms-auto/lib/ebay-login-dom.ts`：纯页面分类、元素查找和动作决策。
- `rms-auto/contents/ebay-login.ts`：在允许的 eBay 页面上连接 DOM 与后台协调器。
- `rms-auto/test/`：增加配置、状态机、页面分类和协调器测试。

上述文件边界作为实施约束，不得合并成一个大型脚本。

## 5. 配置与兼容性

### 5.1 数据结构

```ts
export const EBAY_SHOP_COUNT = 4

export interface EbayShop {
  name: string
  loginId: string
  password: string
}
```

`LocalConfigData` 增加必选的 `ebayShops: EbayShop[]`。`ExportData` 增加可选的 `ebayShops?: EbayShop[]`，从而允许旧导出文件继续导入；新导出始终包含该字段。

规范化规则如下：

- 非数组值按空数组处理。
- 每个字段仅接受字符串，其他类型规范化为空字符串。
- 少于 4 项时在末尾补空项。
- 多于 4 项时只保留前 4 项。
- 一项完全为空时视为未配置。
- 只要一项中任一字段非空，保存时就要求三个字段全部填写。

本地存储键使用 `ebayShops`。配置格式版本和扩展版本从 `0.1.4` 升至 `0.2.0`，表示新增平台配置结构。

### 5.2 导入导出与同步

新格式示例只使用虚构值：

```json
{
  "version": "0.2.0",
  "exportDate": "2026-09-02T00:00:00.000Z",
  "shops": [],
  "ebayShops": [
    {
      "name": "店铺一",
      "loginId": "seller@example.com",
      "password": "example-password"
    }
  ]
}
```

文件导出、剪贴板导出、文件导入、剪贴板导入和内网只读同步都必须包含或识别 `ebayShops`。远端配置没有该字段时，本地得到 4 个空项。同步开启时，eBay 设置与其他平台设置一样只读。

文档和设置页继续明确提示：本地数据、导出内容及远端 JSON 含明文凭据。

## 6. 活动登录任务

### 6.1 会话数据

后台协调器在 `chrome.storage.session` 中保存单个活动任务，只保存账号索引和控制状态，不保存账号或密码副本：

```ts
type EbayLoginStage =
  | "opening_seller_hub"
  | "signing_out"
  | "awaiting_identifier"
  | "identifier_submitted"
  | "password_submitted"
  | "manual_verification"
  | "paused_error"

interface EbayLoginIntent {
  tabId: number
  shopIndex: number
  stage: EbayLoginStage
  startedAt: number
  updatedAt: number
}
```

任务固定绑定 `tabId`。内容脚本不能直接读取会话存储，而是通过消息向后台请求上下文；后台必须用 `sender.tab.id` 验证请求来自绑定标签页。

后台通过单一串行消息队列处理状态转换：先验证当前阶段并写入下一阶段，成功后才允许页面执行点击。这样即使 DOM 观察器同时报告多次，也只有第一个转换会获准。

`chrome.storage.session` 的数据只存在于浏览器会话期间，且默认不向内容脚本开放，符合本功能的临时控制状态用途。Chrome 与 Firefox 均提供该存储区域：

- [Chrome Extensions Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [Firefox WebExtensions storage.session](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/session)

### 6.2 唯一活动任务

因为所有标签页共享 eBay Cookie，同时只能有一个活动任务。

- 没有活动任务时，点击店铺会创建新的空白标签页。
- 后台取得标签页 ID 后先写入任务，再把该标签页导航到 Seller Hub，避免页面先加载而任务尚未建立的竞态。
- 已有有效任务时，再次点击任何 eBay 店铺只聚焦原标签页，并提示当前登录仍在进行。
- 绑定标签页关闭时立即删除任务。
- 任务超过 10 分钟即视为失效，在下一次协调器访问、扩展启动或相关标签页事件发生时立即清理。
- 扩展重载或浏览器重启后不存在可恢复的自动登录任务。

## 7. 登录状态机

### 7.1 启动和退出旧账号

1. 用户点击一个已完整配置的 eBay 店铺。
2. 后台创建并绑定标签页，状态设为 `opening_seller_hub`。
3. 打开 `https://www.ebay.com/sh/ovw`。
4. 如果 eBay 将页面重定向至 `signin.ebay.com`，说明当前没有有效会话，直接进入邮箱步骤。
5. 如果 Seller Hub 已登录，页面适配器展开左上角账户菜单并点击官方 Sign out，状态切换为 `signing_out`。
6. 到达退出确认页后，再次导航至 Seller Hub，由 eBay 重定向到登录页。

eBay 官方说明退出操作位于页面左上角账户菜单中，本设计使用该可见操作，不申请 Cookie 权限，也不直接删除 eBay Cookie：

- [eBay Signing in to your account](https://www.ebay.com/help/account/signing-account/signing-account?id=4189)

若无法在 10 秒内找到官方退出入口，任务暂停并提示用户手动退出；用户退出后进入登录页，本任务仍可继续。

### 7.2 邮箱或用户名步骤

页面同时满足以下条件时才执行：

- 当前标签页与活动任务匹配。
- 主机是允许的官方 eBay 登录主机。
- 页面明确存在“Email or username”输入框和 Continue 操作。
- 当前状态是 `opening_seller_hub`、`signing_out` 或 `awaiting_identifier`。

内容脚本向后台请求本店铺的 `loginId`。后台验证标签页、索引和阶段后只返回该字段。内容脚本使用原生输入值 setter 并派发 `input` 与 `change` 事件，然后点击 Continue 一次，将状态原子更新为 `identifier_submitted`。

Seller Hub 当前确实会把未登录访问重定向到 `signin.ebay.com` 的邮箱或用户名页面：

- [Seller Hub 登录入口](https://www.ebay.com/sh/ovw)

### 7.3 密码步骤

密码只能在状态为 `identifier_submitted` 且同一标签页出现明确密码表单时填写。后台只在这一条件成立时返回选中店铺的 `password`。

若任务刚启动就直接出现历史账号的密码页，扩展不得猜测当前身份或填写密码。它应优先使用页面提供的切换账号操作回到邮箱步骤；找不到切换入口时暂停并提示用户手动切换。

密码写入后只点击一次 Sign in，并把状态更新为 `password_submitted`。刷新、DOM 重绘和重复的 `load` 事件不得再次提交。

### 7.4 人工验证与完成

出现短信验证码、Authenticator、eBay App 确认、Passkey、CAPTCHA 或其他非预期页面时，状态切换为 `manual_verification`。内容脚本显示不包含凭据的小提示并停止所有自动动作。

人工验证后：

- 到达同一标签页的 Seller Hub，任务视为成功并立即清除。
- 回到密码页或错误页，保持停止状态，不自动重复提交。
- 到达未知域名或非允许页面，不注入凭据，也不执行点击。

eBay 官方列出的二次验证方式包括 App 通知、短信和 Authenticator；这些步骤全部在本设计的人工边界之外：

- [eBay Tips for keeping your account secure](https://www.ebay.com/help/account/protecting-account/tips-keeping-ebay-account-secure?id=4872)

## 8. 页面识别与动作白名单

页面分类器只能返回以下状态：

- `seller_hub_authenticated`
- `identifier_form`
- `password_form`
- `sign_out_confirmation`
- `manual_challenge`
- `credential_error`
- `unknown`

自动动作白名单仅包括：

1. 在已确认登录的 Seller Hub 中打开账户菜单并点击 Sign out。
2. 在 `identifier_form` 中填写邮箱或用户名并点击 Continue。
3. 在 `password_form` 且前置状态正确时填写密码并点击 Sign in。
4. 在退出确认页导航回 Seller Hub。

`manual_challenge`、`credential_error` 和 `unknown` 均不得自动提交。未识别页面默认停止，而不是尝试按文本搜索任意按钮。

内容脚本初始匹配范围限制为登录流程已确认使用的官方地址：

- `https://www.ebay.com/sh/*`
- `https://signin.ebay.com/*`
- `https://pages.ebay.com/SignOutConfirm*`

内容脚本只在顶层页面运行，不在 iframe 内运行；验证码 iframe 不获得扩展凭据或动作权限。

如果真实登录流程跳转到新的官方 eBay 主机，实施时必须先记录该页面、增加页面分类测试，再把该精确主机加入匹配范围；不得改成泛化的 `https://*.ebay.com/*` 内容脚本。

## 9. 异步页面与重复执行保护

- 首次检查未找到目标元素时使用 `MutationObserver` 等待，最长 10 秒。
- 每个阶段只对应一个可执行动作。
- 状态更新成功后才执行提交动作，避免多个观察回调同时点击。
- 相同阶段与相同动作的重复请求由后台拒绝。
- 页面刷新不会回退已经提交的阶段。
- 不设置无限轮询或无限重试。
- eBay 页面结构变化导致无法识别时，显示人工操作提示并停止。

## 10. 错误与恢复

### 10.1 凭据错误

检测到密码错误、账号不存在或账号受限信息时，状态变为 `paused_error`。页面提示所选店铺名和“请在扩展设置中检查凭据”，不显示登录 ID 或密码，也不再次提交。

### 10.2 自动退出失败

10 秒内找不到账户菜单或 Sign out 时，状态保留在 `signing_out` 并提示用户手动退出。用户进入邮箱步骤后，协调器允许流程继续。

### 10.3 网络或未知页面

网络错误、页面资源未完成加载或未知页面均停止自动动作。用户可以继续手动操作；若最终进入 Seller Hub，任务清理，否则 10 分钟后失效。

### 10.4 标签页和任务生命周期

- 绑定标签页关闭：清理任务。
- 标签页导航到非允许域名：不传递凭据，任务等待至超时。
- 第二次店铺点击：聚焦已有任务标签页，不覆盖账号索引。
- 扩展或浏览器重启：清理临时任务，不自动恢复提交。

## 11. UI 设计

### 11.1 设置页

在现有平台卡片之后增加“eBay Seller Hub（自动登录）”卡片，固定显示 4 行。每行包含序号、店铺名、邮箱或用户名和密码。

- 密码使用现有显示或隐藏开关。
- 完全空白的行允许保存。
- 部分填写的行阻止保存，并指出具体序号。
- 远端只读同步开启时，该区域与其他配置一起禁用编辑。
- 页面提示明文存储与导出风险，但不阻止用户保存。

### 11.2 弹窗

新增“eBay Seller Hub”分区，只显示三个字段均完整的店铺。点击店铺后启动任务并打开新标签页。

若已有任务：

- 不创建第二个任务。
- 聚焦当前任务标签页。
- 显示“eBay 登录处理中，请先完成或关闭该标签页”。

### 11.3 页面内状态提示

页面适配器必须注入一个隔离样式的小型状态提示，内容只包含店铺显示名和当前状态，例如：

- “正在切换 eBay 账号”
- “正在填写登录信息”
- “请手动完成 eBay 验证”
- “登录信息可能有误，请检查设置”

提示不得展示邮箱、密码、验证码或原始错误响应。

## 12. 安全边界

一期按已确认需求继续明文保存凭据，但仍执行以下最小保护：

- 真实凭据不进入 Git、源码、测试、示例、文档或构建日志。
- 凭据不放入 URL、查询参数、页面属性或会话任务。
- 内容脚本每次只从后台取得当前阶段需要的一个字段。
- 后台验证发送消息的标签页 ID、账号索引和状态。
- 只在精确允许的官方 eBay 页面注入和使用凭据。
- 控制台只记录店铺索引、状态和错误分类，不记录完整配置。
- 不申请或使用 Cookie 权限。
- 导出与同步文档明确说明内容是明文。

## 13. 测试设计

### 13.1 自动测试

配置测试必须覆盖：

- 旧配置缺少 `ebayShops` 时补成 4 个空项。
- 少于 4 项补齐，多于 4 项截断。
- 非字符串字段清空。
- 新格式导入导出往返不丢失 eBay 配置。

状态机测试必须覆盖：

- 正常的退出、邮箱、密码、成功转换。
- 直接出现历史密码页时拒绝填密码。
- 验证页面进入 `manual_verification`。
- 每个阶段只能提交一次。
- 错误状态不重试。
- 10 分钟超时。
- 标签页关闭清理。
- 第二个启动请求不会覆盖活动任务。

页面分类测试必须覆盖：

- Seller Hub 已登录页。
- 邮箱或用户名页。
- 密码页。
- 退出确认页。
- 短信、Authenticator、Passkey 和 CAPTCHA 代表性页面。
- 密码错误页。
- 未知页面。

构建验证必须覆盖：

- TypeScript 编译。
- Chrome MV3 构建。
- Firefox MV2 构建。

### 13.2 人工验收

使用真实测试环境逐项验证：

1. 四个账号分别从退出状态进入正确 Seller Hub。
2. 当前登录账号切换到另一个账号时，先退出再登录。
3. 邮箱与密码步骤各只提交一次。
4. 短信验证出现时停止，人工完成后进入 Seller Hub。
5. 人机校验出现时停止，不尝试绕过。
6. 密码错误时停止且不循环。
7. 登录标签页关闭后可以重新选择店铺。
8. 任务超时后不会在以后页面误填。
9. 登录处理中连续点击不同店铺不会串号。
10. 旧导出文件可导入，新文件、剪贴板和远端同步可保存 4 个 eBay 配置。
11. Chrome 和 Firefox 各完成至少一次账号切换。

人工验收时只记录店铺显示名、结果和错误分类，不在截图、日志或缺陷单中记录凭据。

## 14. 完成标准

满足以下条件才视为功能完成：

- 三类自动动作严格受后台状态和标签页绑定约束。
- 四个账号都能从弹窗发起顺序登录。
- 已登录账号能够退出，无法自动退出时能安全交还人工。
- 人工验证不会触发自动绕过或重复提交。
- 并发点击、刷新、重定向、错误和超时不会造成账号串用。
- 旧配置兼容，eBay 配置进入所有既有数据通道。
- 自动测试通过，Chrome MV3 与 Firefox MV2 构建通过。
- 真实账号人工验收矩阵完成，且没有凭据进入仓库或日志。

## 15. 主要风险与控制

| 风险 | 控制措施 |
| --- | --- |
| eBay DOM 或文案变化 | 语义化页面分类、固定动作白名单、未知页面默认暂停、页面夹具测试 |
| eBay 风控或 CAPTCHA | 明确交由人工，不循环、不绕过 |
| Cookie 共享导致并发冲突 | 全局唯一活动任务，第二次点击只聚焦原标签页 |
| 历史账号密码页导致填错密码 | 仅允许 `identifier_submitted` 后填写密码，否则强制切换账号或暂停 |
| 重定向后丢失账号选择 | `storage.session` 中按标签页绑定任务，不依赖 URL 参数 |
| 页面重复加载造成重复提交 | 后台原子状态转换与每阶段一次动作 |
| 明文凭据泄漏 | 不进源码、URL、日志和任务状态，仅在精确官方页面按阶段取用 |
| Firefox 与 Chrome 行为差异 | 状态逻辑保持纯函数，并分别构建和人工验收 |
