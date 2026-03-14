# RMS 阶段1会话可用性研究（v2 - 补充跨域与 SSO 传播机制）

- 初版时间（JST）：2026-03-07T09:51:05+09:00
- 本次更新（JST）：2026-03-07T10:20:00+09:00
- 目标：验证 RMS 登录态的可复用边界、跨子域会话行为、登出后回流路径

## 一、核心发现（v2 新增与确认）

### 1. 主菜单是 SSO 会话传播中枢

登录成功后访问 `mainmenu.rms.rakuten.co.jp`，页面会加载 **40+ 个跨子域信标请求**（伪装为 image 资源），逐个对各 RMS 子系统建立会话。

**已确认的子域列表**（均返回 200/202）：

| 子域 | 请求路径模式 | 状态码 |
|---|---|---|
| `datatool.rms.rakuten.co.jp` | `/auth/?r=...&t=...` | 200 |
| `item.rms.rakuten.co.jp` | `/rms/mall/rsf/item/login?r=...&t=...` | 200 |
| `order.rms.rakuten.co.jp` | `/rms/mall/rj/login?r=...&t=...` | 200 |
| `order-rp.rms.rakuten.co.jp` | `/order-rb/login?r=...&t=...` | 200 |
| `soko.rms.rakuten.co.jp` | `/rms/mall/rsf/login?r=...&t=...` | 200 |
| `coupon.rms.rakuten.co.jp` | `/rms/mall/coupon/login?r=...&t=...` | 202 |
| `point.rms.rakuten.co.jp` | `/auth/?r=...&t=...` | 200 |
| `cabinet.rms.rakuten.co.jp` | `/auth/?r=...&t=...` | 200 |
| `rmail.rms.rakuten.co.jp` | `/auth/?r=...&t=...` | 200 |
| `csvdl-rp.rms.rakuten.co.jp` | `/rms/mall/csvdl/login?r=...&t=...` | 200 |
| `ad.rms.rakuten.co.jp` | `/auth/?r=...&t=...` | 200 |
| `cms.rms.rakuten.co.jp` | `/login?r=...&t=...` | 200 |
| `design.rms.rakuten.co.jp` | `/rms/mall/rsf/design/login?r=...&t=...` | 202 |
| `store.rms.rakuten.co.jp` | `/shop-bff/login?r=...&t=...` | 202 |
| ... 以及 25+ 个其他子域 | | |

**信标参数结构**：
- `r` = 短哈希标识（8位hex，如 `88b49768`）
- `t` = Base64 编码值（形如 `MTc3Mjg0NDU1OCYxNzcyODQ0NzM4JjFlOTc5MzFj`），解码后含两组时间戳和一个签名片段

**结论**：`mainmenu` 是会话传播中枢。每次访问主菜单都会刷新所有子系统的会话。信标参数为一次性桥接凭证，不是可复用 token。

### 2. 跨子域功能访问：确认可用

从 mainmenu 点击"注文確認待ち"成功跳转至 `order-rp.rms.rakuten.co.jp/order-rb/order-list-sc/init`，页面功能完全正常：

- 主页面 GET 返回 200
- AJAX 分页请求 (`paginationAjax`) POST → 200
- AJAX 通知请求 (`notice`) GET → 200
- **跨域 CORS 请求**：`cs.rms.rakuten.co.jp/api/customer/list/bo` 的 OPTIONS → 204, POST → 200
- 页面正常显示订单列表和操作按钮

**结论**：主菜单信标建立的子域会话，在后续导航中完全可用。

### 3. glogin 与 mainmenu 会话状态不互通

已登录 mainmenu 的状态下，直接访问 `glogin.rms.rakuten.co.jp/?sp_id=1`：
- **仍然显示完整的登录表单**（R-Login ID + 密码 + 次へ）
- 没有任何"已登录"指示或自动跳转

**结论**：glogin 是独立的登录入口门户，不共享 mainmenu 的会话状态。glogin 侧可能：
- a) 在不同的 cookie scope 下工作
- b) 设计上始终展示登录表单（安全策略）

### 4. 子域不支持裸路径直接访问

尝试直接访问以下 URL 均返回 404/错误：
- `https://datatool.rms.rakuten.co.jp/` → 404
- `https://item.rms.rakuten.co.jp/rms/mall/item` → 404
- `https://order.rms.rakuten.co.jp/rms/mall/rj/` → system-error.html
- `https://login.account.rakuten.com/` → Error 页面

**结论**：各子域需要从 mainmenu 正确跳转（携带会话上下文），不支持用户直接输入 URL 访问。

### 5. 显式登出与门禁页（v1 确认保持）

- `mainmenu.rms.rakuten.co.jp/?act=logout` → 跳转至 `glogin.rms.rakuten.co.jp/?module=BizAuth&action=BizAuthLogout&sp_id=1`
- 登出后访问主菜单 → "再度ログインをお願いいたします"（含5点自动登出说明）

### 6. RAT 分析追踪中的店铺标识

从网络请求中提取的 RAT 参数：
- `shopid`: `438439`
- `shopurl`: `hagumi`
- `cks` / `cks2`: `c3d9e19fcc6ba526d5fccbb50c696def35e25f0`（会话校验和，两个域一致）
- `_ra`: `1770605356844|c0aad654-8803-4e84-9c6c-1fbe1c329339`（时间戳+UUID）

**结论**：`cks/cks2` 是跨域的会话校验标识，可能作为服务端验证登录状态的关键参数。

## 二、修订可用性矩阵（v2）

| 观察项 | 证据 | 当前判断 | 风险等级 | v2变化 |
|---|---|---|---|---|
| 主菜单登录态 | 可加载、显示店铺数据 | 可复用，非永久 | 中 | 不变 |
| **跨子域 SSO 传播** | 40+ 信标请求，均 200/202 | **mainmenu 为传播中枢，信标为一次性凭证** | 高 | **确认** |
| **跨域功能访问** | order-rp AJAX/CORS 均正常 | **mainmenu 传播后子域可独立工作** | 中 | **新增** |
| 显式登出行为 | `act=logout -> BizAuthLogout` | 可稳定触发会话失效 | 低 | 不变 |
| 5点策略约束 | 门禁页文案与官方说明一致 | 每日固定失效窗口 | 高 | 不变 |
| **glogin 独立性** | 已登录后访问仍显示表单 | **glogin 不检测 mainmenu 会话** | 中 | **确认** |
| `shopNo`/`shopId` 作用 | RAT 参数含 shopid/shopurl | 业务上下文标识，非隔离机制 | 中 | 不变 |
| **裸路径不可达** | 多个子域直接访问均 404 | **必须从 mainmenu 跳转** | 低 | **新增** |
| **cks 会话校验和** | RAT 中 cks=cks2 跨域一致 | **可能是服务端会话一致性校验** | 中 | **新增** |

## 三、对架构决策的影响（修订）

### 关键结论

1. **登录态本质 = Cookie-based session，非 Token**
   - 无长期 access_token / refresh_token
   - 会话通过 mainmenu 信标传播到各子域
   - 每个子域有独立的 session cookie

2. **Playwright storageState 策略的可行性评估**
   - **理论可行**：storageState 可以保存所有域的 cookies，用于恢复会话
   - **关键限制**：
     - 需要在 mainmenu 页面完成信标传播后再导出
     - 5AM 后 storageState 必然失效
     - 信标参数含时间戳签名，不确定是否有短期过期窗口
   - **建议**：阶段2实验验证 storageState 跨时间窗口（1h/4h/跨5AM）的可用性

3. **多账号隔离策略**
   - 必须使用独立的浏览器上下文（Playwright persistent context / Chrome profile）
   - 同一浏览器内不可能并行多个 RMS 账号（cookie 域冲突）
   - 每个上下文需要独立完成：glogin → login.account → mainmenu → 子域信标传播 的完整流程

4. **自动化采集可行路径**
   - 登录后先访问 mainmenu（触发信标传播）
   - 然后可以直接访问各子域的功能页面
   - 子域支持 AJAX 请求（可用于数据提取）

## 四、未完成项（收尾所需）

### A. Cookie/Storage 明细导出（需用户协助 DevTools）

需要你在**当前已登录状态**下，打开 DevTools (F12) → Console，粘贴以下脚本并回复输出：

```javascript
// RMS Cookie/Storage 导出脚本
(function() {
  const result = {
    url: location.href,
    timestamp: new Date().toISOString(),
    cookies: document.cookie.split(';').map(c => c.trim()).filter(Boolean),
    localStorage: Object.keys(localStorage).reduce((o, k) => {
      o[k] = localStorage.getItem(k)?.substring(0, 100);
      return o;
    }, {}),
    sessionStorage: Object.keys(sessionStorage).reduce((o, k) => {
      o[k] = sessionStorage.getItem(k)?.substring(0, 100);
      return o;
    }, {})
  };
  console.log('=== RMS SESSION DUMP ===');
  console.log(JSON.stringify(result, null, 2));
  return result;
})();
```

### B. session_upgrade 路径（可延后）

`login.account.rakuten.com` 的 session_upgrade 流程需要在一次完整的新登录过程中抓取。可以放到阶段2的 Playwright 自动化实验中一并完成。

### C. Playwright storageState 实验（阶段2范畴）

验证 storageState 导入后的会话复用窗口，需要独立的 Playwright 脚本实验。

## 五、阶段1结论（预判）

基于当前证据，倾向于**结论 A（修正版）**：

> **`storageState` + 定时重登混合策略可行**，但需严格遵循：
> 1. 登录必须走完整链路：glogin → account → mainmenu（触发信标）
> 2. storageState 必须在信标传播完成后导出
> 3. 每日 5AM 前主动 renew 或 5AM 后立即 re-login
> 4. 多账号必须物理隔离上下文（persistent context per account）

最终结论待 Cookie 明细确认后定稿。

---

备注：v2 版为阶段1主体研究归档，补充了跨域访问验证和 SSO 传播机制分析。
