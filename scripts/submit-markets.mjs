#!/usr/bin/env node
/**
 * 把 dsh-glass-ui 一次推到所有「PR 制」的 dsh 插件市场。
 *
 * 用法：
 *   GH_PAT=<classic PAT, 需要 public_repo> node scripts/submit-markets.mjs
 *   node scripts/submit-markets.mjs --dry-run        # 只打印计划，不发请求
 *
 * 为什么需要 classic PAT：fine-grained token 对不属于自己的公共仓库只有读权限，
 * 建 fork 可以，开 PR 会被 403 Resource not accessible by personal access token。
 *
 * 自动收录的市场（打 dsh-plugin topic 即可，无需 PR）：
 *   - bradeGithub/DSH-Plugins-Marketplace（每 2 小时扫 topic）
 *   - AdamPlatin123/dsh-plugin-radar（每天 02:00 全量扫 topic）
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DRY = process.argv.includes('--dry-run')
const PAT = process.env.GH_PAT || process.env.GITHUB_TOKEN
const API = 'https://api.github.com'
const LOGIN = 'aivos-xie'
const REPO_URL = 'https://github.com/aivos-xie/dsh-glass-ui'
const HEAD_SHA = process.env.HEAD_SHA || 'ddec6c0e6d11df237f1f5fffe0db8f1567b8225f'
const VERSION = '1.4.1'
const BRANCH = 'add/dsh-glass-ui'

const BADGE = '[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)'

const PR_BODY = `Adds **Glass UI** — a client-only glassmorphism skin for dsh.

- Installs with one command: \`git clone ${REPO_URL}.git && dsh plugin --profile web add /abs/path/dsh-glass-ui\`; the repo ships the built \`lib/client.js\`, so no build step is needed.
- Declares \`dsh.bundle.patch\` (\`cordis.patch.yml\`) plus a client plugin entry. The host-side \`apply()\` is empty: it registers no tools and makes no network requests — it only injects a stylesheet, a settings section and a \`__dshGlass\` debug API.
- Settings under **Settings → Glass UI**: three rendering tiers, glass intensity, background tone, glass message bubbles, reduced transparency, motion and texture. Follows \`prefers-reduced-motion\` / \`prefers-reduced-transparency\` / \`prefers-contrast: more\` / \`forced-colors\`, and uninstalls cleanly.
- Self-tested: \`node test-contract.mjs\` (8 groups) passes; the committed \`lib/client.js\` rebuilds byte-identically from \`src/\`.

${BADGE}
`

const AWESOME_YML = `url: ${REPO_URL}
name: aivos-xie/dsh-glass-ui
category: theme
description:
  en: Glassmorphism skin for DeepSeek Harness - layered frost on the conversation, sidebar, composer and overlays, with three rendering tiers, adjustable intensity and background tone, glass message bubbles, live support for reduced-motion, reduced-transparency, increased-contrast and forced-colors, and an empty host-side apply() that registers no tools and makes no network requests.
  zh: 玻璃外观皮肤——对话、侧栏、输入区与浮层分层磨砂，三档渲染质量、可调强度与背景色调、消息玻璃，实时跟随减少动效/减少透明/增加对比/强制颜色四种系统偏好，宿主侧 apply() 为空实现，不注册工具、不发网络请求。
`

const TACYZO_ENTRY = JSON.parse(readFileSync(join(ROOT, 'market/submissions/tacyzo-plugin.json'), 'utf8'))
const SLACOM_SNIPPET = readFileSync(join(ROOT, 'market/submissions/slacom-plugins.txt'), 'utf8')

async function api(path, init = {}) {
  if (DRY) return { dry: true, path }
  const res = await fetch(API + path, {
    ...init,
    headers: {
      authorization: `Bearer ${PAT}`,
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
      'user-agent': 'dsh-glass-ui-submit',
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  let body
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  if (!res.ok) {
    const err = new Error(`${init.method || 'GET'} ${path} → ${res.status} ${body?.message || text.slice(0, 120)}`)
    err.status = res.status
    err.body = body
    throw err
  }
  return body
}

const b64 = s => Buffer.from(s, 'utf8').toString('base64')

async function ensureFork(repo) {
  const [owner, name] = repo.split('/')
  try {
    await api(`/repos/${LOGIN}/${name}`)
    return `${LOGIN}/${name}`
  } catch (e) {
    if (e.status !== 404) throw e
  }
  console.log(`  fork ${repo} …`)
  await api(`/repos/${repo}/forks`, { method: 'POST', body: JSON.stringify({ default_branch_only: true }) })
  for (let i = 0; i < 30; i++) {
    try {
      await api(`/repos/${LOGIN}/${name}`)
      return `${LOGIN}/${name}`
    } catch { await new Promise(r => setTimeout(r, 3000)) }
  }
  throw new Error(`fork ${repo} 未就绪`)
}

async function ensureBranch(fork, branch, base = 'main') {
  try {
    const ref = await api(`/repos/${fork}/git/ref/heads/${branch}`)
    return ref.object.sha
  } catch (e) {
    if (e.status !== 404) throw e
  }
  const baseRef = await api(`/repos/${fork}/git/ref/heads/${base}`)
  await api(`/repos/${fork}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseRef.object.sha }),
  })
  return baseRef.object.sha
}

async function getFile(fork, path, ref) {
  try {
    const f = await api(`/repos/${fork}/contents/${path}?ref=${ref}`)
    return { sha: f.sha, content: Buffer.from(f.content, 'base64').toString('utf8') }
  } catch (e) {
    if (e.status === 404) return null
    throw e
  }
}

async function putFile(fork, path, content, branch, message) {
  const existing = await getFile(fork, path, branch)
  await api(`/repos/${fork}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({ message, content: b64(content), branch, ...(existing ? { sha: existing.sha } : {}) }),
  })
}

async function openPR(baseRepo, fork, branch, title, body) {
  try {
    const pr = await api(`/repos/${baseRepo}/pulls`, {
      method: 'POST',
      body: JSON.stringify({ title, head: `${LOGIN}:${branch}`, base: 'main', body }),
    })
    return pr.html_url
  } catch (e) {
    if (e.status === 422) {
      const list = await api(`/repos/${baseRepo}/pulls?head=${LOGIN}:${branch}&state=open`)
      if (list?.[0]) return `${list[0].html_url} (已存在)`
    }
    throw e
  }
}

const TARGETS = [
  {
    key: 'awesome-dsh-plugin',
    repo: 'awesome-dsh-plugin/awesome-dsh-plugin',
    title: 'Add aivos-xie/dsh-glass-ui (theme)',
    async run(fork) {
      await ensureBranch(fork, BRANCH)
      await putFile(fork, 'data/plugins/aivos-xie__dsh-glass-ui.yml', AWESOME_YML, BRANCH, 'Add aivos-xie/dsh-glass-ui (theme)')
    },
  },
  {
    key: 'tacyzo/dsh-plugins',
    repo: 'tacyzo/dsh-plugins',
    title: 'Add @dsh-desktop/glass-ui (theme)',
    async run(fork) {
      await ensureBranch(fork, BRANCH)
      const file = await getFile(fork, 'index.json', BRANCH)
      if (!file) throw new Error('index.json 不存在')
      const doc = JSON.parse(file.content)
      doc.metadata ??= {}
      doc.metadata.categories ??= {}
      // 该索引只声明了 tools；条目引用了未声明的分类会整份校验失败
      doc.metadata.categories.theme ??= { title: { en: 'Theme', zh: '主题' } }
      doc.plugins ??= []
      if (!doc.plugins.some(p => p.name === TACYZO_ENTRY.name)) doc.plugins.push(TACYZO_ENTRY)
      await putFile(fork, 'index.json', JSON.stringify(doc, null, 2) + '\n', BRANCH, 'Add @dsh-desktop/glass-ui (theme)')
    },
  },
  {
    key: 'Slacom/dsh-plugin-market',
    repo: 'Slacom/Slacom-dsh-plugin-market',
    title: 'Add dsh-glass-ui (git source)',
    async run(fork) {
      await ensureBranch(fork, BRANCH)
      const file = await getFile(fork, 'plugins.txt', BRANCH)
      if (!file) throw new Error('plugins.txt 不存在')
      if (file.content.includes('aivos-xie/dsh-glass-ui')) return
      await putFile(fork, 'plugins.txt', file.content.replace(/\s*$/, '\n') + SLACOM_SNIPPET + '\n', BRANCH, 'Add dsh-glass-ui')
    },
  },
]

console.log(DRY ? '— DRY RUN（不发请求）—' : `提交人: ${LOGIN} | 版本: ${VERSION} | commit: ${HEAD_SHA.slice(0, 8)}`)
for (const t of TARGETS) {
  console.log(`\n▶ ${t.repo}`)
  if (DRY) {
    console.log(`  fork → ${LOGIN}/${t.repo.split('/')[1]}`)
    console.log(`  branch ${BRANCH}，改文件，开 PR: ${t.title}`)
    continue
  }
  try {
    const fork = await ensureFork(t.repo)
    await t.run(fork)
    const url = await openPR(t.repo, fork, BRANCH, t.title, PR_BODY)
    console.log(`  ✓ PR: ${url}`)
  } catch (e) {
    console.log(`  ✗ ${e.message}`)
    if (e.status === 403) console.log('    → 需要 classic PAT（勾 public_repo），fine-grained 不行')
  }
}
