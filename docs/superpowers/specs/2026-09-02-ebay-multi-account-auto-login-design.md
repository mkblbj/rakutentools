# eBay 四账号自动登录精简设计

**日期：** 2026-09-02

**状态：** 已实现；2026-09-03 在本地 Chrome 实测账号切换与自动登出成功

**目标项目：** `rms-auto`

## 1. 目标

在现有 `rms-auto` 浏览器扩展中增加 4 个独立 eBay 商家账号。用户从弹窗选择店铺后，扩展打开 [eBay Seller Hub](https://www.ebay.com/sh/ovw)，退出当前 eBay 会话，依次填写邮箱或用户名和密码。

短信验证码、Authenticator、eBay App、Passkey、CAPTCHA 或未知验证页面由用户手动完成，扩展不尝试绕过。

## 2. 已确认边界

- 四套账号分别登录，不使用 Team access。
- Seller Hub 入口固定为 `https://www.ebay.com/sh/ovw`。
- 允许自动退出当前 eBay 账号。
- 账号配置继续使用现有明文存储、导入导出和内网同步。
- 同一浏览器中的 eBay Cookie 是共享的，只支持顺序切换，不支持四账号同时保持登录。
- 真实账号和密码不得写入源码、测试、示例、URL 或日志。

## 3. 精简架构

只增加三个必要部分：

1. `lib/config.ts` 增加固定 4 项的 `ebayShops` 配置，并接入现有保存、导入、导出和同步流程。
2. 设置页和弹窗分别提供账号维护与店铺选择。
3. 一个 `contents/ebay-login.ts` 内容脚本完成退出、邮箱输入和密码输入。

不增加后台服务、消息协议、标签页协调器、端口抽象、页面状态分类层或页面内浮动提示。

## 4. 配置模型

```ts
export const EBAY_SHOP_COUNT = 4

export interface EbayShop {
  name: string
  loginId: string
  password: string
}
```

规则：

- `LocalConfigData` 增加必选 `ebayShops`。
- `ExportData` 增加可选 `ebayShops`，保证旧导出可继续导入。
- 读取时固定补齐或截断为 4 项。
- 一行完全为空时允许保存；填写任意字段后必须三项完整。
- 文件、剪贴板和内网同步都包含 `ebayShops`。

## 5. 最小登录任务

扩展使用一个全局临时任务，保存到 `chrome.storage.local`：

```ts
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
```

任务只保存账号索引、阶段和开始时间，不复制邮箱或密码。任务超过 10 分钟后删除，防止旧选择在以后页面中误填。

由于 eBay Cookie 本身是全局共享的，本期不处理多个 eBay 登录标签页并发。再次选择店铺时，最新选择覆盖旧任务。

## 6. 登录流程

1. 用户在弹窗点击店铺。
2. 弹窗保存 `{ shopIndex, phase: "start", startedAt }` 并打开 Seller Hub。
3. Seller Hub 已登录时，内容脚本打开账户菜单并点击 Sign out；找不到入口时不继续点击，用户可以手动退出。
4. 未登录时，eBay 跳转到 `signin.ebay.com`。
5. 出现邮箱或用户名输入框且阶段为 `start` 或 `signingOut` 时：
   - 读取所选账号的 `loginId`；
   - 先把阶段更新为 `identifierSubmitted`；
   - 填入并点击 Continue。
6. 出现密码输入框且阶段为 `identifierSubmitted` 时：
   - 读取所选账号的 `password`；
   - 先把阶段更新为 `passwordSubmitted`；
   - 填入并点击 Sign in。
7. 检测到验证码、Passkey 或 CAPTCHA 时，将阶段设为 `manual`，后续完全交给用户。
8. 阶段为 `identifierSubmitted`、`passwordSubmitted` 或 `manual` 时进入 Seller Hub，删除任务。

阶段必须在点击按钮之前更新，以阻止 DOM 重绘、刷新或重复事件造成二次提交。

## 7. 内容脚本范围

内容脚本只在顶层页面运行，并仅匹配：

- `https://www.ebay.com/sh/*`
- `https://signin.ebay.com/*`
- `https://pages.ebay.com/SignOutConfirm*`

当前登出确认页为 `https://signin.ebay.com/logout/confirm*`，由已有的
`signin.ebay.com` 匹配范围处理；同时保留旧确认页兼容。

页面动作采用直接、保守的选择器：

- 邮箱或用户名：`#userid`、`[name='userid']`、`[autocomplete='username']`
- 密码：`#pass`、`[name='pass']`、`[autocomplete='current-password']`
- Continue：`#signin-continue-btn`
- Sign in：`#sgnBt`
- 切换账号：`#switch-account-anchor`
- 账户菜单：`button.gh-flyout__target--left[aria-controls]`，兼容旧 `#gh-ug`
- 退出：`a[href*='lgout=1']`、`a[href*='signout' i]`，兼容旧 `#gh-uo`

正常密码页使用可见的 `#pass` 与 `#sgnBt` 识别，不依赖页面语言。密码页上
“短信发送验证码”等可选登录方式不阻止密码提交；真正的验证码输入框、验证
容器、iframe 或验证 URL 仍进入人工处理。

如果没有出现当前阶段预期的元素，脚本不做任何操作。未知页面默认停下。

## 8. 人工验证边界

以下任一信号出现时切换到 `manual`：

- `input[autocomplete='one-time-code']`
- URL、元素 ID 或 iframe 明确包含 `captcha`
- 页面明确要求 Passkey、Authenticator 或安全验证码

进入 `manual` 后，不再自动填写或点击；用户完成验证并进入 Seller Hub 后只清理任务。

## 9. UI 与数据通道

设置页新增固定 4 行，每行包含店铺名、邮箱或用户名、密码。弹窗只显示三项都完整的店铺。

必须把 `ebayShops` 接入：

- 本地保存和读取
- 文件导入和导出
- 剪贴板导入和导出
- 内网只读同步

现有密码显示开关和只读同步禁用规则继续复用。

## 10. 最小测试与验收

自动验证只保留：

- 旧配置缺少 `ebayShops` 时补 4 个空项。
- eBay 配置补齐、截断和导出往返。
- 登录任务阶段创建和 10 分钟过期判断。
- TypeScript 检查。
- Chrome MV3 与 Firefox MV2 构建。

人工验证只覆盖：

1. 未登录时选择任一店铺可填写邮箱和密码。
2. 已登录其他账号时能够退出后再填写所选账号。
3. 短信验证码出现时停止自动化。
4. CAPTCHA 或未知页面不发生重复提交。

## 11. 非目标

- 不处理多个 eBay 登录标签页并发。
- 不增加后台 service worker。
- 不增加页面内状态浮层。
- 不自动处理任何验证码或 Passkey。
- 不加密现有配置格式。
- 不改造其他平台登录脚本。
