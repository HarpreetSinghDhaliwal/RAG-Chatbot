import express from "express";
import { generateSessionId } from "../utils/generateId.js";
import { redisClient } from "../config/redis.js";
import { queryRAG } from "../services/ragService.js";

const router = express.Router();

// Create new session
router.post("/", async (req, res) => {
  const sessionId = generateSessionId();
  await redisClient.del(sessionId);
  res.json({ sessionId });
});

// Get session history
router.get("/:sessionId/history", async (req, res) => {
  const { sessionId } = req.params;
  const hist = await redisClient.lRange(sessionId, 0, -1);
  const messages = hist.map(h => JSON.parse(h));
  res.json(messages);
});

// Clear session
router.delete("/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  await redisClient.del(sessionId);
  res.json({ ok: true });
});

// Send message to session (persist & trigger RAG)
router.post("/:sessionId/messages", async (req, res) => {
  const { sessionId } = req.params;
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "No text provided" });

  // save user message
  const userMsg = { role: "user", content: text, timestamp: Date.now() };
  await redisClient.rPush(sessionId, JSON.stringify(userMsg));

  // Trigger async RAG process (could emit via websocket)
  setTimeout(async () => {
    const { chunks } = await queryRAG(text);
    // save final bot message
    const botMsg = { role: "bot", content: chunks.join(""), timestamp: Date.now() };
    await redisClient.rPush(sessionId, JSON.stringify(botMsg));
  }, 0);

  res.json({ ok: true });
});

export default router;
