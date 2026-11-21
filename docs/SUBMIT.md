# 上架路线图（dsh 生态的市场不是一家）

dsh 本体不带任何索引源（`plugin-market` 的 `indexes` 默认 `[]`），所以「上架」在生态里分成三类入口，各自独立，可以同时做。

## 三类入口

| 类型 | 谁 | 收录方式 | 备注 |
| --- | --- | --- | --- |
| 官方自带的市场页 | `@deepseek-ai/dsh-plugin-market` + `client-ui-plugin-market` | 无中央入口，源由用户自己添加 | 本仓库 `market/index.json` 就是一份合规源 |
| 策展清单（同时是市场索引） | [awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) | 提 PR 加一个 YAML 条目 | 索引发布在 npm：`dsh-plugin-catalog`；`dsh-market`（npm 包 `dshmarket`）装的就是它 |
| 自动爬取的注册表 | [dsh.so](https://www.dsh.so)（`cdn.dsh.so/market/index.json`）、[jingjiangze/dsh-market](https://github.com/jingjiangze/dsh-market) | 爬 npm，或站点提交 + 沙箱安装测试 | 只认 npm 上的包，git 源的包不会被爬到 |

本仓库当前的包只在 git 上（`@dsh-desktop/glass-ui`），所以能走的是**策展 PR** 和 **dsh.so 提交**；自动爬取的注册表要等真正发布到 npm。

## 实测（2026-11-21，本机直连）

| 索引源 | 大小 | 首次耗时 | 插件数 | 格式校验 |
| --- | --- | --- | --- | --- |
| `https://cdn.jsdelivr.net/npm/dsh-plugin-catalog/index.json` | 4.3 MB | 2.0 s | 6,487 | format 1 通过 |
| `https://cdn.dsh.so/market/index.json` | 10.3 MB | 3.3 s | 15,411 | format 1 通过 |
| `https://cdn.jsdelivr.net/gh/gitMFQ/dsh-plugin-index@master/plugin-market.json` | 4 KB | 0.2 s | 1 | format 1 通过 |
| `https://cdn.jsdelivr.net/gh/aivos-xie/dsh-glass-ui@main/market/index.json` | 2 KB | 0.7 s | 1 | format 1 通过 |

## 方式一：awesome-dsh-plugin PR（推荐先做）

1. Fork，新建 `data/plugins/aivos-xie__dsh-glass-ui.yml`，内容见 [awesome-entry.yml](awesome-entry.yml)。
2. 提交 PR，标题写清包名与一句话用途。
3. 合并后 README 与 `dsh-plugin-catalog` 重新生成，市场的「发现」页几分钟内可见。

评审标准（作者原文）：能用 `dsh plugin add` 装上、一行描述与实际行为一致、分类正确、仍在维护。

## 方式二：dsh.so 提交

站点 [dsh.so/submit](https://www.dsh.so/submit/) 走的是注册表收录，会做沙箱安装测试与安全扫描；他们的索引里现在有 1.5 万条，扫描通过的单独标注。填仓库地址 + 一句描述即可，之后由他们的流程验证。

## 方式三：发布到 npm 后自动被爬

只要包进了 npm 公共源、声明了 `dsh.bundle.patch`、`engines.dsh` 满足运行时，`jingjiangze/dsh-market` 这类爬虫源会自动收录，不需要 PR。

```bash
cd /root/repos/dsh-glass-ui
npm pack --dry-run          # 确认 files 白名单
npm publish --access public # 需要 @dsh-desktop scope 的写权限
```

发完之后把 `market/index.json` 的 `source` 换成 `{"type": "npm"}`，市场安装目标就从 git 变成 `@dsh-desktop/glass-ui@1.4.1`。

## 三个坑（社区文档里反复出现）

1. **不能有跳转**：dsh 读索引用 `redirect: "error"`，302 直接判失败，且「发现」页不显示原因。仓库里的 GitHub `raw` 链接本身可用，但某些镜像会 302。
2. **15 秒超时**：索引越大越危险，10 MB 的源在慢网络下会踩线。
3. **CDN 缓存滞后**：jsDelivr 对 `@branch` 有 12 小时边缘缓存，改完索引可以主动清：

   ```bash
   curl "https://purge.jsdelivr.net/gh/aivos-xie/dsh-glass-ui@main/market/index.json"
   ```

   要绝对稳定就用提交 sha 的 URL：`.../gh/aivos-xie/dsh-glass-ui@<40 位 sha>/market/index.json`。
