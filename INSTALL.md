# 安装 Glass UI 玻璃外观

这个插件挂在 dsh 的 **profile** 上：profile 决定启动时合成哪些插件，插件的客户端代码由 dsh web 随页面下发给浏览器。所以安装 = 把包放进 profile + 让 profile 的 bundle 列表包含它。

全程不需要改 dsh 本体，不需要重启系统服务，也不需要 Node 运行时（`lib/client.js` 是提交好的构建产物）。

---

## 0. 前置检查

```bash
dsh --version                       # 能打印版本即可
ls ~/.dsh/profiles/                 # 至少要有 web（桌面版还会有 desktop）
```

- `~/.dsh/profiles/web` 不存在：先正常启动一次 `dsh web`，它会初始化 profile。
- Windows 上 `~` 是 `%USERPROFILE%`，profile 在 `%USERPROFILE%\.dsh\profiles\web`。
- 下面的命令都在**你自己的用户**下执行；dsh 以哪个用户跑，就装到那个用户的 profile 里。

---

## 1. 方式 0：从插件市场安装（最省事）

市场不是中央仓库，而是一份索引 JSON。先让 dsh 认识这个源：

- 界面路径：**插件市场** → 索引源 / Add index → 粘贴
  `https://cdn.jsdelivr.net/gh/aivos-xie/dsh-glass-ui@main/market/index.json`
- 或者写进 profile（重启后生效）：在 `~/.dsh/profiles/web/cordis.patch.yml` 末尾加

  ```yaml
  - id: plugin-market
    name: "@deepseek-ai/dsh-plugin-market"
    config:
      indexes:
        - https://cdn.jsdelivr.net/gh/aivos-xie/dsh-glass-ui@main/market/index.json
  ```

然后在市场里搜 `glass`，点安装即可。市场安装的目标是仓库里被钉死的提交（`git+https://github.com/aivos-xie/dsh-glass-ui.git#59f7c01…`），不走 npm，所以不需要发包，也不会被上游改动影响。

装完仍然回到 **设置 → Glass UI 玻璃外观**。

---

## 2. 方式 A：从 GitHub 装进 web profile（推荐）

```bash
git clone https://github.com/aivos-xie/dsh-glass-ui.git /tmp/dsh-glass-ui
dsh plugin --profile web add /tmp/dsh-glass-ui
```

`dsh plugin` 会把参数透传给 profile 里的 pnpm，等价于 `pnpm add file:/tmp/dsh-glass-ui`：包被链接进 `~/.dsh/profiles/web/node_modules/@dsh-desktop/glass-ui`。

装完检查 bundle 是否登记（声明了 `dsh.bundle.patch` 的依赖通常会被自动补进列表）：

```bash
grep -A12 '"bundles"' ~/.dsh/profiles/web/package.json
```

看到 `"@dsh-desktop/glass-ui"` 就对了。没有的话手工加一行：

```json
"bundles": [
  "@deepseek-ai/dsh-base",
  "...",
  "@dsh-desktop/glass-ui"
]
```

### 验证合成结果

```bash
dsh --profile web --dump-config | grep -A2 glass-ui
# 期望：
# == @dsh-desktop/glass-ui
# - id: glass-ui
#   name: '@dsh-desktop/glass-ui'
```

然后**刷新 dsh web 页面**即可，客户端插件清单是按页面请求现算的，不需要重启进程。样式没出来再重启一次：

```bash
# 前台跑的就 Ctrl+C 后重新 dsh web；后台/nohup 的按自己的启动方式重启
```

---

## 3. 方式 B：离线装（已下载源码目录或压缩包）

```bash
# 有 zip/rar 时先解压出 dsh-glass-ui/ 目录
dsh plugin --profile web add /绝对路径/dsh-glass-ui
```

`file:` 形式的依赖**必须用绝对路径**，相对路径会被 pnpm 按 profile 目录解析而找不到包。

没有 pnpm、或插件命令报错（企业镜像、离线环境常见），走第 4 节的手动放置。

---

## 4. 方式 C：桌面版（desktop profile）

DeepSeek Harness 桌面版用的是 `desktop` 保留 profile，必须先由应用初始化一次（打开过桌面版），再：

```bash
dsh plugin --profile desktop add /绝对路径/dsh-glass-ui
```

桌面版对 profile 文件加了锁，安装时不要同时开着应用；装完重开应用窗口。

---

## 5. 方式 D：手动放置（不依赖 pnpm）

适合离线机器、pnpm 被墙、或 `dsh plugin` 不可用的情况。以 web profile 为例：

```bash
P=~/.dsh/profiles/web
mkdir -p "$P/vendor"
cp -a /绝对路径/dsh-glass-ui "$P/vendor/glass-ui"      # 目录名随意
mkdir -p "$P/node_modules/@dsh-desktop"
ln -sfn ../../vendor/glass-ui "$P/node_modules/@dsh-desktop/glass-ui"
```

再把包名加进 `$P/package.json` 的 `dsh.profile.bundles`（同方式 A 的片段）。校验：

```bash
cd "$P" && node -e "console.log(require.resolve('@dsh-desktop/glass-ui/package.json'))"
dsh --profile web --dump-config | grep -A2 glass-ui
```

两条都通过就刷新页面。

> Windows 的符号链接需要开发者模式或管理员权限；没有权限时把整个包直接复制到 `%USERPROFILE%\.dsh\profiles\web\node_modules\@dsh-desktop\glass-ui`（真实目录，不用链接），其余步骤相同。

---

## 6. 确认装上了

三层验证，从便宜到贵：

1. **配置层**
   ```bash
   dsh --profile web --dump-config | grep -c glass-ui     # ≥ 2
   ```
2. **页面层**：刷新后打开开发者工具，`document.documentElement.outerHTML` 里应出现 `data-glass-ui`；元素上应有 `data-glass-quality="full"`。
3. **入口层**：左下角账号菜单 → **设置** → 左侧导航出现 **Glass UI 玻璃外观**（英文界面 `Settings → Glass UI`）。

控制台 `__dshGlass.info()` 有返回值，说明控制器已挂上：

```js
__dshGlass.info()
// { version: '1.4.1', quality: 'full', requested: {...}, effective: {...}, system: {...} }
```

---

## 7. 使用

设置 → Glass UI 玻璃外观：

| 项 | 说明 |
| --- | --- |
| 渲染质量 | 完整玻璃 / 均衡 / 静态。均衡降低模糊开销，静态改实色表面 |
| 玻璃强度 | 0–100%，默认 60%，调模糊与底景光晕 |
| 背景色调 | 极光 / 清蓝 / 中性，各自跟随深浅主题 |
| 消息玻璃 | 用户气泡与助手回复的半透明底色 |
| 减少透明度 | 实色表面，等同系统的减少透明度偏好 |
| 极光背景动效 / 细腻纹理 | 默认关，仅完整档可用 |
| 恢复默认 | 清掉本插件写入的 7 个偏好键 |

偏好保存在当前浏览器 `localStorage`（键前缀 `dsh.glass-ui.`），同源窗口同步；换浏览器、隐私窗口、清站点数据都会回到默认。

命令行调参同样用 `__dshGlass`，参数与设置页一一对应。

---

## 8. 停用、卸载、回滚

**临时停用**（保留文件与偏好）：把 `dsh.profile.bundles` 里的 `@dsh-desktop/glass-ui` 那行删掉，刷新页面。

**彻底卸载（方式 A/B 安装）**：

```bash
dsh plugin --profile web remove @dsh-desktop/glass-ui
# 若 bundles 里还留着包名，手工删掉那一行
```

**彻底卸载（方式 D 安装）**：

```bash
P=~/.dsh/profiles/web
rm -f "$P/node_modules/@dsh-desktop/glass-ui"
rm -rf "$P/vendor/glass-ui"
# 再从 package.json 的 bundles 里删掉 "@dsh-desktop/glass-ui"
```

浏览器里残留的偏好键可选清理：

```js
Object.keys(localStorage).filter(k => k.startsWith('dsh.glass-ui.')).forEach(k => localStorage.removeItem(k))
```

**回滚到装之前**：安装前先备份 profile 清单，出问题直接还原。

```bash
cp ~/.dsh/profiles/web/package.json ~/.dsh/profiles/web/package.json.bak
# 回滚
cp ~/.dsh/profiles/web/package.json.bak ~/.dsh/profiles/web/package.json
```

---

## 9. 故障排查

| 现象 | 原因与处理 |
| --- | --- |
| 设置里没有 Glass UI 条目 | profile 装错（装到 `desktop` 却在用 `web`）；bundle 没登记；页面没刷新。先跑 `dsh --profile <name> --dump-config \| grep glass-ui` |
| 刷新后外观没变，但 `dump-config` 已包含 | 进程内还缓存着旧的模块清单。重启 `dsh web` 进程再刷新 |
| 页面 401 / 打不开 | 用启动日志里带 token 的地址：`grep 'dsh web: http' <日志> \| tail -1` |
| 部分面板没玻璃感 | 宿主改版导致类名选择器失配。token 层仍生效，属预期降级；重跑 `node test-contract.mjs` 确认逻辑层正常 |
| 滚动或切换会话卡顿 | 设置里切「均衡」或「静态」；`__dshGlass.info().cores` ≤ 4 时本来会自动降档 |
| 静态档下没有任何过渡动画 | 预期行为：静态档把 `transition-duration` 与 `backdrop-filter` 全关，包括宿主自身的过渡 |
| 设置项改了但只影响当前窗口 | `localStorage` 不可用（隐私模式 / 站点数据被禁），设置页底部会提示「偏好只在当前窗口生效」 |
| 与另一个皮肤插件互相覆盖 | 两者都在覆盖同一批 `--dsw-*` token，按挂载顺序后者胜；只留一个 |
| `EACCES` / `EPERM` 符号链接 | Windows 未开开发者模式，改用真实目录复制（见方式 D 的备注） |

---

## 10. 升级

```bash
cd /tmp/dsh-glass-ui && git pull
node build.mjs                     # 只有改过 src 才需要
dsh plugin --profile web add /tmp/dsh-glass-ui   # 重新链接
```

版本跟随 `package.json` 的 `version`（当前 `1.4.1`）。想要可复现的环境，把依赖钉到 tag：`dsh plugin --profile web add /tmp/dsh-glass-ui#v1.4.1`（`file:` 依赖不支持 ref，改用 `git+https://github.com/aivos-xie/dsh-glass-ui.git#v1.4.1`）。

---

## 11. 从源码自己构建

```bash
node build.mjs                      # 生成 lib/client.js（167 KiB）
node --check index.js && node --check lib/client.js
node test-contract.mjs              # 8 组契约回归，无需浏览器
```

构建产物是提交进仓库的：应用只加载 `lib/client.js`，改完 `src/` 不重新构建，界面不会有任何变化。
