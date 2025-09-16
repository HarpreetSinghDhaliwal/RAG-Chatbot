import { v4 as uuid } from "uuid";
import redisClient from "../config/redis.js";

export async function handleChat(req, res) {
  try {
    let { sessionId, message } = req.body;
    if (!sessionId) sessionId = uuid();

    // Here you will call your retriever + LLM service
    const botResponse = `You said: ${message}`; // placeholder

    await redisClient.rPush(`chat:${sessionId}`, JSON.stringify({ role: "user", text: message }));
    await redisClient.rPush(`chat:${sessionId}`, JSON.stringify({ role: "bot", text: botResponse }));
    await redisClient.expire(`chat:${sessionId}`, 3600);

    res.json({ sessionId, answer: botResponse });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getHistory(req, res) {
  const { sessionId } = req.params;
  const history = await redisClient.lRange(`chat:${sessionId}`, 0, -1);
  res.json({ sessionId, history: history.map((h) => JSON.parse(h)) });
}

export async function resetHistory(req, res) {
  const { sessionId } = req.params;
  await redisClient.del(`chat:${sessionId}`);
  res.json({ sessionId, message: "Chat history cleared" });
}
