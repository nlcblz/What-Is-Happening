# AGENTS.md — "What Is Happening" WeChat Mini Program

## Project Overview

Real-time global trend aggregator WeChat Mini Program (微信小程序). Fetches hot topics from
multiple sources (Weibo, X, CNN, BBC, etc.) via AI-driven scrapers, presents them with
AI-generated summaries and images. Currently at **scaffold stage** — default WeChat MP template
with a requirements blueprint in `requirements.md`.

**AppID:** `wx5752a7a56da6467c`
**Component Framework:** glass-easel
**Base Library:** 3.14.3 (trial channel)

---

## Tech Stack

- **Frontend:** WeChat Mini Program Native Framework (JS/WXML/WXSS) — planned migration to TS
- **Backend (planned):** Node.js (Express) or Python (FastAPI) on WeChat Cloud Run (微信云托管)
- **Database (planned):** WeChat Cloud Base Database (NoSQL)
- **AI:** OpenAI / DeepSeek API for summarization
- **Scraping:** Puppeteer/Playwright or Axios/Cheerio

---

## Build / Dev / Test Commands

This is a WeChat Mini Program — there is **no CLI build pipeline**. All building, previewing,
and uploading is done through **WeChat DevTools (微信开发者工具)**.

| Action | How |
|---|---|
| **Open project** | WeChat DevTools → Import Project → select this directory |
| **Preview** | DevTools toolbar → "Preview" (预览) or "Real Device Debug" (真机调试) |
| **Compile** | DevTools toolbar → "Compile" (编译) — or Ctrl+B |
| **Upload** | DevTools toolbar → "Upload" (上传) |
| **NPM build** | DevTools → Tools → Build npm (构建npm) — only needed after adding npm packages |
| **Lint** | None configured. No ESLint/Prettier. Use DevTools built-in checks. |
| **Tests** | None configured. No test framework present. |

### Planned Backend (Docker / Cloud Run)

When the backend is added, expect:
```bash
docker build -t what-is-happening .
docker run -p 3000:3000 what-is-happening
# or for Python:
# uvicorn main:app --host 0.0.0.0 --port 3000
```

---

## Project Structure

```
├── app.js                  # App lifecycle (onLaunch, globalData)
├── app.json                # App config: pages, window, style
├── app.wxss                # Global styles
├── project.config.json     # DevTools project config (shared)
├── project.private.config.json  # DevTools private config (per-developer)
├── sitemap.json            # WeChat crawler sitemap rules
├── requirements.md         # Full project blueprint & requirements
├── utils/
│   └── util.js             # Shared utility functions
└── pages/
    ├── index/              # Home page (4-file page unit)
    │   ├── index.js
    │   ├── index.json
    │   ├── index.wxml
    │   └── index.wxss
    └── logs/               # Logs page (4-file page unit)
        ├── logs.js
        ├── logs.json
        ├── logs.wxml
        └── logs.wxss
```

### Page Convention

Every page is a directory with exactly 4 files sharing the same name:
- `.js` — Page logic (Page constructor, data, lifecycle, handlers)
- `.json` — Page-level config (usingComponents, navigationBarTitleText)
- `.wxml` — Template (WeChat's HTML-like markup)
- `.wxss` — Styles (CSS subset with `rpx` responsive units)

---

## Code Style Guidelines

### JavaScript

- **Module system:** CommonJS (`require` / `module.exports`). No ES module import/export.
- **Functions:** Arrow functions for callbacks, shorthand methods in Page/App/Component objects.
- **Indentation:** 2 spaces (per `project.config.json` → `editorSetting.tabSize: 2`).
- **Strings:** Template literals for interpolation, single quotes otherwise.
- **Naming:**
  - `camelCase` for variables, functions, data properties, event handlers
  - Event handlers: verb-prefixed (`bindViewTap`, `onChooseAvatar`, `onInputChange`, `getUserProfile`)
  - Constants: `camelCase` (e.g., `defaultAvatarUrl`) — not UPPER_SNAKE_CASE
  - Page data keys: `camelCase` (e.g., `hasUserInfo`, `userInfo`)
- **Comments:** Chinese (中文) for user-facing descriptions and inline explanations.
- **API calls:** Use `wx.*` APIs with success/fail callbacks (not promisified yet).

### WXML Templates

- Use `wx:if` / `wx:elif` / `wx:else` for conditionals, `wx:for` for loops.
- Data binding: `{{expression}}` syntax.
- Event binding: `bindtap`, `bind:chooseavatar`, `bind:change` (colon syntax for newer events).
- Block element `<block>` for non-rendering logical grouping.
- Always provide `wx:key` on `wx:for` loops.

### WXSS Styles

- Use `rpx` (responsive pixel) for dimensions that should scale across devices.
- Use `px` for fixed-size elements (e.g., avatars, icons at exact pixel sizes).
- `page` selector for full-page layout (height: 100vh, flex column).
- Class naming: kebab-case (`log-item`, `avatar-wrapper`, `nickname-input`).
- Use `env(safe-area-inset-bottom)` for bottom safe area on notched devices.

### JSON Config

- `app.json`: Register all pages in `pages` array (first entry = landing page).
- Page `.json`: Declare `usingComponents` (even if empty `{}`).
- No trailing commas in JSON files.

---

## WeChat Mini Program Conventions

- **Global data** lives in `app.js` → `globalData` object. Access via `getApp().globalData`.
- **Storage:** `wx.getStorageSync` / `wx.setStorageSync` for synchronous local storage.
- **Navigation:** `wx.navigateTo({ url: '../page/page' })` for stack-based navigation.
- **Login flow:** `wx.login()` → get code → exchange for session on backend.
- **User profile:** Use `wx.getUserProfile` (requires user confirmation each call).

---

## Requirements & Architecture Notes

See `requirements.md` for the full project blueprint. Key architectural decisions:

1. **Configuration-driven scraping** — sources stored in DB, not hardcoded.
2. **Scale-to-zero** on Cloud Run — Docker container must support 0-instance idle.
3. **Dual API key model** — user-provided keys or platform-side API.
4. **Planned migration to TypeScript** — requirements specify TS, scaffold is JS.

---

## Important Rules from requirements.md

1. **Use Chinese (中文) when communicating with the user.**
2. The project name is "What Is Happening" — a WeChat Mini Program.
3. Backend must run on **WeChat Cloud Run** (微信云托管), not local servers.
4. Data sources must be dynamically configurable, never hardcoded.
5. AI summarization supports both OpenAI and DeepSeek APIs.

---

## Common Pitfalls

- **No npm by default.** If you add npm packages, update `project.config.json` → `packNpmRelationList`
  and run "Build npm" in DevTools before they work.
- **ES6 transpilation is ON** (`setting.es6: true`), so modern JS syntax works.
- **SWC is disabled** (`disableSWC: true`, `swc: false`) — uses default Babel.
- **glass-easel** component framework is in use — some older component patterns may not apply.
- `project.private.config.json` overrides `project.config.json` — check both for settings.
- No `.gitignore` exists — consider adding one to exclude `project.private.config.json`
  and DevTools-generated folders (`miniprogram_npm/`, `node_modules/`).
