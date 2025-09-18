import { qdrant } from "../config/vectorDB.js";
import { ENV } from "../config/env.js";

export async function retrieveRelevantChunks(queryEmbedding, topK = 3) {
  try {
    const res = await qdrant.search(ENV.VECTOR_DB_NAME, {
      vector: queryEmbedding,
      limit: topK,
      with_payload: true
    });

    return res.map((r) => ({
      text: r.payload.text,
      title: r.payload.title || "unknown",
      url: r.payload.url || "unknown",
      chunk_id: r.payload.chunk_id || null,
      score: r.score ?? null
    }));
  } catch (err) {
    console.error("Retrieval error:", err.message);
    return [];
  }
}
