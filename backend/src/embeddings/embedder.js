// backend/src/embeddings/embedder.js
// Embedding helper: batch embeddings with Jina, retry + backoff
import axios from "axios";
import dotenv from "dotenv";
import pRetry from "p-retry";
import { ENV } from "../config/env.js";

dotenv.config();

const JINA_KEY = process.env.JINA_API_KEY || ENV.JINA_API_KEY || "";
const JINA_ENDPOINT = process.env.JINA_ENDPOINT || "https://api.jina.ai/v1/embeddings";
const JINA_MODEL = process.env.JINA_MODEL || "jina-embeddings-v2-base-en"; // model name; adjust if needed

if (!JINA_KEY) {
  console.warn("⚠️ JINA_API_KEY not found in env. Embedding calls will likely fail.");
}

/**
 * Request embeddings for an array of texts (batch).
 * Returns array of vectors (same order), or empty arrays for failed entries.
 * Uses retry with exponential backoff.
 * @param {string[]} texts
 * @param {object} opts
 * @returns {Promise<number[][]>}
 */
export async function generateEmbeddingsBatch(texts = [], opts = { maxRetries: 3, timeoutMs: 60000 }) {
  if (!Array.isArray(texts) || texts.length === 0) return [];

  // remove empty strings but keep index mapping
  const requests = [];
  const indexMap = []; // maps position in "texts" to position in "requests"
  for (let i = 0; i < texts.length; i++) {
    const t = texts[i] ?? "";
    if (!t || !t.trim()) {
      indexMap.push(null); // placeholder for empty
    } else {
      indexMap.push(requests.length);
      requests.push(t);
    }
  }

  if (requests.length === 0) {
    // all empty
    return texts.map(() => []);
  }

  // function that calls Jina once
  const callOnce = async () => {
    const payload = { input: requests, model: JINA_MODEL };
    const res = await axios.post(JINA_ENDPOINT, payload, {
      headers: {
        Authorization: `Bearer ${JINA_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: opts.timeoutMs || 60000,
    });
    // Expected: res.data.data -> array of {embedding: [...]}
    const data = res.data?.data || [];
    const embeddings = data.map((d) => d.embedding || []);
    // If response length mismatches, fill with empty arrays
    if (embeddings.length !== requests.length) {
      // normalize
      const normalized = [];
      for (let i = 0; i < requests.length; i++) {
        normalized.push((embeddings[i] && embeddings[i].length) ? embeddings[i] : []);
      }
      return normalized;
    }
    return embeddings;
  };

  // use p-retry for resiliency
  const embeddingsForRequests = await pRetry(callOnce, {
    retries: opts.maxRetries ?? 3,
    onFailedAttempt: (err) => {
      const attempt = err.attemptNumber;
      const retriesLeft = err.retriesLeft;
      console.warn(`Embedding attempt ${attempt} failed. Retries left: ${retriesLeft}. Error: ${err.message}`);
    },
  });

  // Build result matching original texts length
  const result = texts.map((_, idx) => {
    const map = indexMap[idx];
    if (map === null) return [];
    return embeddingsForRequests[map] || [];
  });

  return result;
}

/**
 * Convenience for single text
 * @param {string} text
 */
export async function generateEmbeddings(text) {
  const res = await generateEmbeddingsBatch([text]);
  return res[0] || [];
}
