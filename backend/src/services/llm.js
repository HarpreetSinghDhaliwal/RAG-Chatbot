// backend/src/services/llm.js
import axios from "axios";
import { ENV } from "../config/env.js";

/**
 * Build prompt including numbered sources. Uses Gemini 2.0 Flash API.
 */
export async function callGemini(retrievedChunks, query) {
  try {
    // Build context with citations
    const contextParts = retrievedChunks
      .map(
        (c, i) =>
          `SOURCE[${i + 1}]: ${c.title} (${c.url})\n${c.text}`
      )
      .join("\n\n");

    const prompt = `You are a helpful assistant that answers user questions using only the information in the supplied sources. Cite sources in square brackets like [1] where the number corresponds to the source.\n\n${contextParts}\n\nQuestion: ${query}\n\nAnswer concisely and include source citations.`;

    // Call Gemini 2.0 Flash endpoint
    const res = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": ENV.GEMINI_API_KEY
        }
      }
    );

    const answer =
      res.data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "Sorry, I couldn't generate an answer.";

    return answer;
  } catch (err) {
    console.error("Gemini API error:", err.response?.data || err.message);
    return "Sorry, something went wrong contacting the LLM.";
  }
}
