First of all. Ues Chinese when talking with User.
---

# Project Blueprint: "What Is Happening" WeChat Mini-Program

## 1. Project Overview

"What Is Happening" is a real-time global trend aggregator. It fetches hot topics, news, and social media trends (Weibo, X, CNN, BBC, etc.) using AI-driven scrapers and presents them to users via a WeChat Mini-Program with AI-generated summaries and images.

**Key Constraint:** The project must run 24/7 on **WeChat Cloud Run (微信云托管)** to ensure availability when the developer's local PC is offline, while maintaining cost-efficiency (scale-to-zero).

---

## 2. Tech Stack

* **Frontend:** WeChat Mini-Program Native Framework (TS/WXML/WXSS).
* **Backend:** Node.js (Express) or Python (FastAPI) deployed on **WeChat Cloud Run**.
* **Containerization:** Docker (Required for Cloud Run).
* **Database:** WeChat Cloud Base Database (NoSQL) for storing sources and trends.
* **AI Integration:** OpenAI / DeepSeek API (Supporting both user-provided keys and platform-side API).
* **Scraping:** Puppeteer/Playwright (for JS-heavy sites) or Axios/Cheerio (for RSS/Static HTML).

---

## 3. Core Architecture: Dynamic Source Engine

The system must **not** hardcode data sources. It uses a "Configuration-Driven" approach:

1. **Source Table (DB):** Stores `url`, `selector_rules`, `category`, `type` (RSS/HTML/API), and `active_status`.
2. **Scraper Task:** A scheduled job that iterates through the `Source Table`, fetches data, and updates the `Trend Table`.
3. **AI Orchestrator:** Cleans raw data and generates summaries.

---

## 4. Database Schema (JSON-like)

### `sources` Collection

```json
{
  "name": "X / Twitter Technology",
  "url": "https://twitter.com/i/trends",
  "type": "headless",
  "category": "Tech",
  "rules": { "container": ".trend-item", "title": "span.text" },
  "update_frequency": 60 
}

```

### `trends` Collection

```json
{
  "source_id": "string",
  "title": "string",
  "summary": "AI generated short text",
  "image_url": "string",
  "original_link": "string",
  "timestamp": "ISO Date",
  "category": "string"
}

```

---

## 5. Backend Requirements (Cloud Run)

* **Scale-to-Zero:** Configure `Dockerfile` and service settings to allow 0 instances when idle to save costs.
* **Dynamic Scraping:**
* Support adding new sources via an Admin API or AI-suggested configurations.
* Implement a proxy/user-agent rotation logic if needed to avoid bans.


* **AI Summary Logic:**
* Provide an endpoint `/api/summarize`.
* If user provides `user_api_key` in request headers, use it. Otherwise, check for platform subscription/ads.


* **Image Handling:** Use WeChat Cloud Storage for caching scraped images to avoid broken links.

---

## 6. Frontend Requirements

* **Home Feed:** Waterfall or List view showing cards with Image + AI Summary + Source Tag.
* **Discovery:** Categorized tabs (e.g., Global, Tech, Finance, Entertainment).
* **User Settings:**
* "My Interests": Select categories to follow.
* "AI Configuration": Input field for personal OpenAI/DeepSeek API Key.


* **Subscription:** Integration with WeChat Subscription Messages for "Breaking News" alerts.

---

## 7. Implementation Steps for AI Coder

### Step 1: Scaffolding

* Create a `Dockerfile` for a Node.js Express server.
* Initialize WeChat Mini-Program project structure.

### Step 2: Data Acquisition

* Implement a generic scraper function that reads from the `sources` DB collection.
* Integrate a headless browser (like Playwright-python or Puppeteer) compatible with Docker.

### Step 3: AI Logic

* Create a utility to send scraped text to an LLM for summarization.
* Implement the "Custom Domain" filtering logic (filter `trends` by user `interests`).

### Step 4: WeChat Integration

* Use `wx-server-sdk` for database and cloud storage access.
* Implement WeChat Login for user profile persistence.

---

## 8. Reference Documentation

* **Cloud Run:** [https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloudrun/src/](https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloudrun/src/)
* **Mini-Program Framework:** [https://developers.weixin.qq.com/miniprogram/dev/framework/](https://developers.weixin.qq.com/miniprogram/dev/framework/)

---

**Next Step for Claude/Open Code:** "Please start by generating the `Dockerfile` and a basic `index.js` (Express) that connects to the WeChat Cloud Database. Then, design the 'Dynamic Source' scraper logic as described in section 3."