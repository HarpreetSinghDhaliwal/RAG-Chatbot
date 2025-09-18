// backend/src/embeddings/ingestNews.js
import fs from "fs/promises";
import path from "path";
import axios from "axios";
import { load } from "cheerio";
import { parseStringPromise } from "xml2js";
import crypto from "crypto";
import puppeteer from "puppeteer";
import { v4 as uuidv4 } from "uuid";
import { qdrant, ensureCollection } from "../config/vectorDB.js";
import { generateEmbeddingsBatch } from "./embedder.js";
import { ENV } from "../config/env.js";

// =================== CONFIGURATION ===================
const USER_AGENT = "Mozilla/5.0 (compatible; RAG-Ingest/1.0; +https://example.com)";
const TARGET_ARTICLES = Number(ENV.NUM_ARTICLES) || 50;
const CHUNK_SIZE = Number(ENV.MAX_ARTICLE_CHUNK) || 800;
const CHUNK_OVERLAP = Number(ENV.CHUNK_OVERLAP) || 100;
const EMBED_BATCH_SIZE = Number(ENV.EMBED_BATCH_SIZE) || 16;
const VECTOR_SIZE = Number(ENV.VECTOR_SIZE) || 768;
const COLLECTION_NAME = ENV.VECTOR_DB_NAME || "news_articles";

// =================== UTILITIES ===================
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const urlToId = (url) => crypto.createHash("sha1").update(url).digest("hex");
const cleanText = (t) => (t || "").replace(/\s+/g, " ").trim();

// ---------- Unique Numeric ID Generator (Date.now + counter) ----------
let tsBase = Date.now();
let tsCounter = 0;
function getUniqueNumericId() {
  // Combine timestamp + counter to avoid duplicates in the same ms
  return Number(`${tsBase}${tsCounter++}`);
}

/** Axios GET with retry + logging */
async function fetchWithRetry(url, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.get(url, {
        timeout: 20000,
        headers: { "User-Agent": USER_AGENT },
      });
    } catch (err) {
      console.warn(`⚠️ Fetch failed (${i + 1}/${retries}) → ${url}: ${err.message}`);
      await sleep(delay);
    }
  }
  console.error(`❌ Could not fetch ${url} after ${retries} retries`);
  return null;
}

// =================== FETCH SITEMAP ===================
async function fetchUrlsFromSitemap(sitemapIndex, limit) {
  console.log(`⤴️ Fetching sitemap: ${sitemapIndex}`);
  const urls = [];
  const res = await fetchWithRetry(sitemapIndex);
  if (!res) return urls;

  try {
    const parsed = await parseStringPromise(res.data);
    if (parsed?.sitemapindex?.sitemap) {
      for (const s of parsed.sitemapindex.sitemap) {
        if (urls.length >= limit) break;
        const loc = s.loc[0];
        const r2 = await fetchWithRetry(loc);
        if (!r2) continue;
        const p2 = await parseStringPromise(r2.data);
        const pageLocs = (p2?.urlset?.url || []).map((u) => u.loc[0]);
        urls.push(...pageLocs.slice(0, limit - urls.length));
        await sleep(150);
      }
    }
    if (parsed?.urlset?.url) {
      urls.push(...parsed.urlset.url.map((u) => u.loc[0]).slice(0, limit));
    }
  } catch (err) {
    console.error(`❌ Failed to parse sitemap XML: ${err.message}`);
  }

  console.log(`🔎 Found ${urls.length} URLs`);
  return urls.slice(0, limit);
}

// =================== ARTICLE FETCH ===================
async function fetchArticleHtml(url) {
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    const html = await page.content();
    await browser.close();
    return html;
  } catch (err) {
    console.error(`❌ Puppeteer failed: ${url} → ${err.message}`);
    return "";
  }
}

function extractArticleText(html) {
  const $ = load(html);
  const selectors = [
    "article",
    "div.ArticleBody__content",
    "div.StandardArticleBody_body",
    "div.article-body",
    "div.story-content",
    "div[itemprop='articleBody']",
    "main",
  ];

  for (const sel of selectors) {
    const text = $(sel).text();
    if (text?.trim().length > 200) return cleanText(text);
  }

  const paragraphs = $("p")
    .map((_, el) => $(el).text())
    .get()
    .filter((t) => t.trim().length > 20);

  return paragraphs.length
    ? cleanText(paragraphs.join("\n\n"))
    : cleanText($("body").text() || "");
}

// =================== CHUNKING ===================
function chunkText(text, { chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP } = {}) {
  const chunks = [];
  let start = 0, idx = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const slice = text.slice(start, end).trim();
    if (slice.length)
      chunks.push({ id: `chunk_${idx++}`, text: slice });
    if (end === text.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}

// =================== PAYLOAD SANITIZATION ===================
function sanitizePayload(obj) {
  if (obj == null) return null;
  if (["string", "number", "boolean"].includes(typeof obj)) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizePayload).filter(v => v !== null);
  if (typeof obj === "object") {
    const clean = {};
    for (const [k, v] of Object.entries(obj)) {
      const sv = sanitizePayload(v);
      if (sv !== null) clean[k] = sv;
    }
    return clean;
  }
  return null;
}

// =================== UPSERT ===================
async function upsertInBatches(points, batchSize = 64) {
  for (let i = 0; i < points.length; i += batchSize) {
    const batch = points.slice(i, i + batchSize).map((p) => ({
      id: p.id, // ✅ numeric ID now
      vector: p.vector,
      payload: sanitizePayload(p.payload),
    }));

    if (!batch.length) continue;

    try {
      console.log(`📤 Upserting batch ${i / batchSize + 1} (${batch.length} points)`);
      await qdrant.upsert(COLLECTION_NAME, { wait: true, points: batch });
    } catch (err) {
      console.error(`❌ Failed to upsert batch ${i / batchSize + 1}: ${err.message}`);
      if (err.response?.data) console.error("Response data:", err.response.data);
    }

    await sleep(100);
  }
}

// =================== CLEAN & INGEST ===================
const cleanTextOnly = (t, maxLen = 2000) => {
  if (!t) return "";
  let cleaned = t.replace(/Text(Small|Medium|Large)/gi, "").replace(/\s+/g, " ").trim();
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
};

export async function ingestFromArticles(articles) {
  const seen = new Set();
  const deduped = articles.filter((a) => {
    const key = a.url || a.id || uuidv4();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`♻️ ${deduped.length} unique articles to index.`);
  const allPoints = [];

  for (const article of deduped) {
    const chunks = chunkText(article.content);
    console.log(`✂️ ${article.title || article.url} → ${chunks.length} chunks`);

    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batchChunks = chunks.slice(i, i + EMBED_BATCH_SIZE);
      const texts = batchChunks.map((c) => cleanTextOnly(c.text, 4000));

      const vectors = await generateEmbeddingsBatch(texts, { maxRetries: 3, timeoutMs: 45000 });

      for (let j = 0; j < batchChunks.length; j++) {
        const vec = vectors[j];
        if (!Array.isArray(vec) || vec.length !== VECTOR_SIZE) {
          console.warn(`⚠️ Skipping invalid vector for article ${article.id} (len=${vec?.length})`);
          continue;
        }

        allPoints.push({
          id: getUniqueNumericId(), // ✅ numeric & unique per chunk
          vector: vec,
          payload: {
            article_id: String(article.id),
            title: cleanTextOnly((article.title || "").split("By")[0], 200),
            url: String(article.url || ""),
            chunk_id: String(batchChunks[j].id),
            text: texts[j],
          },
        });
      }

      await sleep(150);
    }
  }

  if (!allPoints.length) return console.warn("⚠️ No embeddings generated, skipping upsert.");
  console.log(`📦 Prepared ${allPoints.length} points. Starting upsert...`);
  await upsertInBatches(allPoints, 128);
  console.log("✅ Ingestion complete.");
}

// =================== MAIN PIPELINE ===================
export async function ingestNews({ limit = TARGET_ARTICLES, fromJsonFile = null } = {}) {
  console.log("🚀 Starting news ingestion...");
  await ensureCollection();

  let articles = [];

  if (fromJsonFile) {
    try {
      const raw = await fs.readFile(path.resolve(process.cwd(), fromJsonFile), "utf-8");
      const items = JSON.parse(raw);
      articles = items.map((it, i) => ({
        id: it.id || `local_${i}`,
        title: it.title || "",
        url: it.url || "",
        content: it.content || "",
      }));
      console.log(`📁 Loaded ${articles.length} articles from file`);
    } catch (err) {
      return console.error("❌ Failed to read JSON:", err.message);
    }
  } else {
    const urls = await fetchUrlsFromSitemap(ENV.SITEMAP_INDEX, limit);
    if (!urls.length) return console.warn("⚠️ No URLs fetched, aborting.");

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`\n[${i + 1}/${urls.length}] Fetching: ${url}`);
      const html = await fetchArticleHtml(url);
      if (!html) continue;

      const text = extractArticleText(html);
      if (!text || text.length < 200) continue;

      articles.push({
        id: urlToId(url),
        title: text.split(".")[0].slice(0, 140),
        url,
        content: text,
      });

      await sleep(200);
    }
  }

  if (!articles.length) return console.warn("⚠️ No valid articles to ingest.");
  return ingestFromArticles(articles);
}

// =================== CLI SUPPORT ===================
if (process.argv[1].endsWith("ingestNews.js") || process.argv.includes("--ingest")) {
  const argv = process.argv.slice(2);
  let limit = TARGET_ARTICLES;
  let file = null;
  for (const a of argv) {
    if (a.startsWith("--limit=")) limit = Number(a.split("=")[1]);
    if (a.startsWith("--file=")) file = a.split("=")[1];
  }
  ingestNews({ limit, fromJsonFile: file }).catch((err) => {
    console.error("💥 Fatal ingestion error:", err);
    process.exit(1);
  });
}
