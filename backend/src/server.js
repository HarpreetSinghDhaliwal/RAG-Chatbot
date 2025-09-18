import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import { initRedis, redisClient } from "./config/redis.js";
import  {queryRAG}  from "./services/ragService.js";
import { generateSessionId } from "./utils/generateId.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// === REST API for creating/clearing/fetching session ===
app.post("/api/session", async (req, res) => {
  const sessionId = generateSessionId();
  await redisClient.del(sessionId); // ensure clean session
  res.json({ sessionId });
});

app.get("/api/session/:sessionId/history", async (req, res) => {
  const { sessionId } = req.params;
  const history = await redisClient.lRange(sessionId, 0, -1);
  res.json(history.map(h => JSON.parse(h)));
});

app.delete("/api/session/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  await redisClient.del(sessionId);
  res.json({ ok: true });
});

// === WebSocket for real-time chat ===
io.on("connection", (socket) => {
  let { sessionId } = socket.handshake.query;
  if (!sessionId) {
    sessionId = generateSessionId(); // create new session if not provided
  }
  console.log(`🟢 Socket connected: ${sessionId}`);

  // Join socket room by sessionId
  socket.join(sessionId);

  // Handle user message
  socket.on("user_message", async ({ text }) => {
    if (!text) return;

    // 1️⃣ Save user message to Redis
    const userMsg = { role: "user", content: text, timestamp: Date.now() };
    await redisClient.rPush(sessionId, JSON.stringify(userMsg));

    // 2️⃣ Query RAG
    const { chunks } = await queryRAG(text);

    // 3️⃣ Stream progressive chunks
    for (const chunk of chunks) {
      socket.emit("bot_chunk", chunk);
      await new Promise(r => setTimeout(r, 50)); // simulate streaming
    }

    // 4️⃣ Save final bot message to Redis
    const finalBot = { role: "bot", content: chunks.join(""), timestamp: Date.now() };
    await redisClient.rPush(sessionId, JSON.stringify(finalBot));
    socket.emit("bot_done", finalBot);
  });

  socket.on("disconnect", () => console.log(`🔴 Socket disconnected: ${sessionId}`));
});

// === Start server ===
const PORT = process.env.PORT || 5000;
(async () => {
  await initRedis();
  server.listen(PORT, () => console.log(`🚀 Backend running at http://localhost:${PORT}`));
})();
