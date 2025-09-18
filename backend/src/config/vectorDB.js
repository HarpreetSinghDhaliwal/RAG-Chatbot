// src/config/vectorDB.js
import { QdrantClient } from "@qdrant/js-client-rest";
import { ENV } from "./env.js";

if (!ENV.VECTOR_DB_URL || !ENV.QDRANT_API_KEY) {
  console.error("❌ Missing QDRANT credentials in .env");
  process.exit(1);
}

export const qdrant = new QdrantClient({
  url: ENV.VECTOR_DB_URL,
  apiKey: ENV.QDRANT_API_KEY,
  timeout: 10000, // explicitly set timeout
});

export async function ensureCollection() {
  try {
    const collectionsResp = await qdrant.getCollections();
    const exists = collectionsResp?.collections?.some(
      (c) => c.name === ENV.VECTOR_DB_NAME
    );

    if (!exists) {
      console.log(`📦 Creating Qdrant collection: ${ENV.VECTOR_DB_NAME}`);

      await qdrant.createCollection(ENV.VECTOR_DB_NAME,{
       // older versions use `collection_name`
        vectors: {
          size: ENV.VECTOR_SIZE || 768,
          distance: "Cosine",
        },
      });

      console.log("✅ Collection created.");
    } else {
      console.log("ℹ️ Collection already exists.");
    }
  } catch (err) {
    console.error("❌ Failed to ensure Qdrant collection:", err.message, err);
    process.exit(1);
  }
}



// export async function deleteAllCollections() {
//   try {
//     const collectionsRes = await qdrant.getCollections();
//     const collections = collectionsRes.collections || [];

//     if (!collections.length) {
//       console.log("⚠️ No collections found to delete.");
//       return;
//     }

//     console.log(`🗑️ Deleting ${collections.length} collections...`);

//     for (const col of collections) {
//       console.log(`Deleting collection: ${col.name}`);
//       await qdrant.deleteCollection(col.name);
//     }

//     console.log("✅ All collections deleted successfully.");
//   } catch (err) {
//     console.error("❌ Error deleting collections:", err.message, err.response?.data || "");
//   }
// }