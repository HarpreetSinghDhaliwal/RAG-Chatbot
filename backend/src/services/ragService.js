import { retrieveRelevantChunks } from "./retriever.js";
import { callGemini } from "./llm.js";
import { generateEmbeddings } from "../embeddings/embedder.js"; // create a small embedder that returns vector

export async function queryRAG(query) {
  // 1️⃣ Generate embedding for query
  const queryEmbedding = await generateEmbeddings(query);

  // 2️⃣ Retrieve top-k relevant chunks
  const chunks = await retrieveRelevantChunks(queryEmbedding, 3);

  // 3️⃣ Call LLM to generate final answer
  const answer = await callGemini(chunks, query);

  return { chunks: [answer] };
}
