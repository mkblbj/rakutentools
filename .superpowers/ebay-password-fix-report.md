# eBay 正常 Welcome 密码页修复报告

## 结论

正常的 eBay Welcome 密码页现在会在 `#pass`、`#sgnBt` 与 Welcome/Sign in 标题都可见、且不存在可见人工挑战时被识别为正常密码页。`identifierSubmitted` 会继续填写并提交密码；`start` 与 `signingOut` 会继续仅走 Switch account 路径。

## RED

先新增了 `normal Welcome password page is not wrongly rejected when its controls are visible`。初次运行：

```text
✖ normal Welcome password page is not wrongly rejected when its controls are visible
TypeError: login.isEbayNormalPasswordPageSignals is not a function
tests 9; pass 8; fail 1
```

该失败证明测试会捕获缺少正常密码页决策行为的情况。

## GREEN

在 `lib/ebay-login.ts` 中加入最小纯函数 `isEbayNormalPasswordPageSignals`，由内容脚本提供可见性、标题与挑战信号。再次运行：

```text
✔ normal Welcome password page is not wrongly rejected when its controls are visible
tests 9; pass 9; fail 0
```

## 实现范围

- 删除密码框与登录按钮必须同属一个 `form` 的要求。
- 删除宽泛 blocking-control gate。
- 人工挑战的 DOM selector 与标题信号都仅在元素可见时生效；路径中的挑战信号保持有效。
- 未改动 task、marker、storage 架构，也未改变 phase 的职责。

## 验证

```text
pnpm test              exit 0, 9/9 通过
pnpm typecheck         exit 0
pnpm build             exit 0（Chrome MV3）
pnpm build:firefox     exit 0（Firefox MV2）
git diff --check       exit 0
```

构建期间仅出现既有 Browserslist 数据过期提醒，不影响构建成功。

## 自审

- 正常页的通过条件仅为：可见 `#pass`、可见 `#sgnBt`、可见 Welcome/Sign in 标题、无可见挑战。
- 可见挑战仍阻止自动填写；隐藏的 verify/challenge 节点不再误判。
- `canSubmitPassword` 仍严格限定 `identifierSubmitted`；Switch account 分支仍严格限定 `start`/`signingOut`。
- 未引入依赖、后台逻辑、浮层、真实凭据或无关重构。
