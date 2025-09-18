import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  // Server
  PORT: process.env.PORT || 5000,

  // API Keys
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "AIzaSyD7bK43zx517Q32PhJS1tntmL6NoCztk_LOU",
  REDIS_URL: process.env.REDIS_URL || "rediss://default:AfrFAA43IncDFkMDQwOGU2YjdhMTE0MTdkYjc3NzYwYTRmZTY4YTAxZHAxNjQxOTc@busy-werewolf-64197.upstash.io:6379",
  VECTOR_DB_URL: process.env.VECTOR_DB_URL || "https://74345a09-c54303-4680-8293-798762dee9ce.us-east4-0.gcp.cloud.qdrant.io:6333",
  QDRANT_API_KEY: process.env.QDRANT_API_KEY || "eyJhbGciO43iJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.1vuW_WL-yh3cRRqj35zkxy-PKM-_PauukO43xRCBYOOqc",
  VECTOR_DB_NAME: process.env.VECTOR_DB_NAME || "news_articles",
  JINA_API_KEY: process.env.JINA_API_KEY || "jina_25208d68596f48c0ad70f14c293a8980Zkt7twyyqzI0TZ3DLCOSNV4PKQ1O",
  
  // Tuning
  COLLECTION_NAME : process.env.VECTOR_DB_NAME || "news_articles",
  NUM_ARTICLES: parseInt(process.env.NUM_ARTICLES) || 50,
  MAX_ARTICLE_CHUNK: parseInt(process.env.MAX_ARTICLE_CHUNK) || 800,
  CHUNK_OVERLAP: parseInt(process.env.CHUNK_OVERLAP) || 100,
  EMBED_BATCH_SIZE: parseInt(process.env.EMBED_BATCH_SIZE) || 16,
  VECTOR_SIZE: parseInt(process.env.VECTOR_SIZE) || 768,
  SITEMAP_INDEX: process.env.SITEMAP_INDEX || "https://www.reuters.com/arc/outboundfe5678eds/sitemap-index/?outputType=xml",
};
