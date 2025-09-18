import { generateEmbeddings } from "../embeddings/embedder.js";
import { retrieveRelevantChunks } from "../services/retriever.js";
import { callGemini } from "../services/llm.js";
import { saveMessage, getMessages, clearSession, createSessionId } from "../utils/session.js";

// update chat controller (only function shown)
export async function chat(req, res) {
  try {
    let { sessionId, query } = req.body;
    if (!sessionId) sessionId = createSessionId();

    await saveMessage(sessionId, "user", query);

    const queryEmbedding = await generateEmbeddings(query);
    const chunks = await retrieveRelevantChunks(queryEmbedding, 4); // top-4

    const answer = await callGemini(chunks, query);

    await saveMessage(sessionId, "bot", answer);

    // Build sources info to return
    const sources = chunks.map((c, idx) => ({
      id: idx + 1,
      title: c.title,
      url: c.url,
      chunk_id: c.chunk_id
    }));

    // Consistent API schema
    res.json({
      success: true,
      sessionId,
      answer,
      sources
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function history(req, res) {
  const { sessionId } = req.query;
  const messages = await getMessages(sessionId);
  res.json(messages);
}

export async function reset(req, res) {
  const { sessionId } = req.body;
  await clearSession(sessionId);
  res.json({ message: "Session cleared" });
}
