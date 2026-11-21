# dsh 插件市场全景（2026-11-21 实测）

生态里没有"一个市场"。按收录机制分四类，同一份插件要分别喂：

| 市场 | 索引 / 入口 | 规模 | 收录机制 | 我们要做的事 |
| --- | --- | --- | --- | --- |
| dsh 官方市场页（`dsh-plugin-market`） | 无内置源，`indexes` 默认 `[]` | — | 用户自己加索引 URL | 已完成：本仓库 `market/index.json` |
| awesome-dsh-plugin（策展清单 → npm 包 `dsh-plugin-catalog`，`dsh-market` 消费它） | `cdn.jsdelivr.net/npm/dsh-plugin-catalog/index.json` | 6,487 | **PR** 加 `data/plugins/<owner>__<repo>.yml` | `scripts/submit-markets.mjs` 第一项 |
| dsh.so 社区注册表 | `cdn.dsh.so/market/index.json`、`dsh.so/submit` | 15,411（站点自报 32,440 制品 / 29,602 沙箱装过） | 站点表单：拉仓库 → 格式校验 → 安全扫描 → 生成条目 | 贴仓库 URL（无公开 schema，脚本化不了） |
| bradeGithub/DSH-Plugins-Marketplace | 自带静态索引（多级降级：Contents API → jsDelivr → raw） | 9,500+ | **自动**：CI 每 2 小时扫 `dsh-plugin` topic | 无需操作（topic 已打） |
| AdamPlatin123/dsh-plugin-radar | `adamplatin123.github.io/dsh-plugin-radar/` + `catalog/plugins/*.json` | 每日增量 | **自动**：每天 02:00 全量扫 `dsh-plugin` / `dsh-external` topic；PR 可加速 | 无需操作（topic 已打） |
| tacyzo/dsh-plugins | `cdn.jsdelivr.net/gh/tacyzo/dsh-plugins@main/index.json` | 1 | **PR** 往 `index.json` 追加条目 | `market/submissions/tacyzo-plugin.json`（脚本第二项） |
| Slacom/Slacom-dsh-plugin-market | `site/index.json`（workflow 由 `plugins.txt` 生成） | 十来个 | **PR** 往 `plugins.txt` 加一行 | `market/submissions/slacom-plugins.txt`（脚本第三项） |
| jingjiangze/dsh-market（爬 npm） | `dist/index.json`（25 MB） | 大 | **自动**爬 npm 公共源，只认发了 npm 的包 | 需要 npm token + `npm publish` |
| gitMFQ/dsh-plugin-index | `plugin-market.json` | 1 | 只收自家 `deepseek-harness-codearts` 的插件 | 不适用 |

## 一键推 PR

```bash
GH_PAT=<classic PAT，勾 public_repo> node scripts/submit-markets.mjs
node scripts/submit-markets.mjs --dry-run    # 先看计划
```

fine-grained token 建得了 fork，但开 PR 会 403（`Resource not accessible by personal access token`）；换 classic PAT 即可。

## 两个容易踩的坑

1. **分类必须先在文档里声明**：`metadata.category` 只能引用 `metadata.categories` 里已声明的 id。tacyzo 的索引只声明了 `tools`，直接塞 `category: "theme"` 会让**整份索引校验失败**——脚本会同时补上 `metadata.categories.theme`。
2. **索引 URL 不能有跳转**：dsh 用 `redirect: "error"` 读索引，302 直接判失败且不报原因；`@branch` 路径还会被 CDN 缓存 12 小时，可用 `https://purge.jsdelivr.net/gh/<owner>/<repo>@<ref>/<path>` 主动清。
