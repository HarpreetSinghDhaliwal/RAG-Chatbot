import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.error("❌ Missing REDIS_URL in .env file. Cannot connect to Redis.");
  process.exit(1);
}

// Initialize client
export const redisClient = createClient({
  url: redisUrl,
  socket: {
    tls: redisUrl.startsWith("rediss://"), // For secure managed Redis
    rejectUnauthorized: false,
  },
});

let isConnected = false;

// Event listeners
redisClient.on("connect", () => console.log("✅ Redis connected successfully"));
redisClient.on("ready", () => {
  console.log("🚀 Redis client ready for commands");
  isConnected = true;
});
redisClient.on("error", (err) => {
  console.error("❌ Redis Client Error:", err.message);
  isConnected = false;
});
redisClient.on("end", () => {
  console.log("🔌 Redis connection closed");
  isConnected = false;
});

// Connect function
export async function initRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
  return redisClient;
}

// Optional helper
export const isRedisConnected = () => isConnected;
