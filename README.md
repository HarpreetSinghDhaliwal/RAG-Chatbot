# 📰 RAG-Powered News Chatbot

A **Retrieval-Augmented Generation (RAG) chatbot** for news articles using **Google Gemini 2.0 Flash**, **Qdrant embeddings**, and **Redis session management**.  
Supports **real-time chat**, **progressive streaming**, and **intelligent retrieval from news sources**.  

---

## 🌟 Features

- 🔹 **Full RAG pipeline**: embedding → vector DB → LLM generation.  
- 🔹 **News ingestion**: sitemap scraping, Puppeteer, JSON files.  
- 🔹 **Real-time chat** via Socket.IO with progressive response streaming.  
- 🔹 **Session management**: Redis-based, with chat history.  
- 🔹 **Chunked embeddings**: ensures accurate retrieval from long articles.  
- 🔹 **Frontend + backend** in a single repo for seamless local setup and deployment.  
- 🔹 **Deployable on Render free tier**.  

---

## 🏗 Architecture Overview

```mermaid
flowchart LR
  A[User] -->|Message| B[Frontend React]
  B --> |WebSocket/API| C[Backend Express]
  C --> D[Redis] 
  C --> E[Qdrant Vector DB]
  E --> |Retrieve top-K chunks| C
  C --> |Call Gemini API| F[Google Gemini 2.0 Flash]
  F --> |Answer with source citations| C
  C --> B
  B --> A

___

**Frontend: React SPA, real-time chat UI, session selection.

Backend: Node.js Express + Socket.IO, RAG pipeline, Redis session store.

Vector DB: Qdrant stores article embeddings for semantic search.

LLM: Gemini API generates answers with citation context.**



rag-chatbot/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── redis.js         # Redis connection
│   │   │   └── vectorDB.js      # Qdrant setup
│   │   ├── embeddings/
│   │   │   └── ingestNews.js    # News ingestion & upsert
│   │   ├── services/
│   │   │   ├── embedder.js      # Embeddings generator
│   │   │   ├── ragService.js    # RAG pipeline
│   │   │   ├── llm.js           # Gemini API integration
│   │   │   └── retriever.js     # Retrieve relevant chunks
│   │   ├── utils/
│   │   │   └── generateId.js    # Unique session IDs
│   │   └── server.js            # Express + Socket.IO server
│   ├── package.json
│   └── .env                      # REDIS_URL, GEMINI_API_KEY, VECTOR_DB_NAME
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatWindow.js
│   │   │   ├── MessageInput.js
│   │   │   └── SessionControls.js
│   │   ├── App.js
│   │   ├── App.scss
│   │   └── index.js
│   ├── package.json
│   └── .env                      # REACT_APP_BACKEND_URL
│
└── README.md



📰 News Ingestion Pipeline

Script: backend/src/embeddings/ingestNews.js

Capabilities:

    Fetch URLs from sitemaps or JSON files.
    
    Scrape article content with Puppeteer reliably.
    
    Clean, deduplicate, and chunk article text.
    
    Generate embeddings and upsert into Qdrant.
    
    Handles batch processing, retries, and errors gracefully.



CLI Commands:

| Command                                   | Description                      |
| ----------------------------------------- | -------------------------------- |
| `node ingestNews.js --limit=50`           | Fetch 50 articles from sitemap   |
| `node ingestNews.js --file=articles.json` | Ingest articles from a JSON file |


Default Parameters:

    CHUNK_SIZE: 800 tokens
    
    CHUNK_OVERLAP: 100 tokens
    
    EMBED_BATCH_SIZE: 16
    
    VECTOR_SIZE: 768


⚡ Backend

    Express API: /api/session for session create, fetch history, delete.
    
    Socket.IO: Progressive streaming of bot responses.
    
    Redis: Stores session messages, quick retrieval.
    
    RAG Service: Retrieves top-K chunks and calls Gemini for answers.


Run Backend:
    cd backend
    npm install
    npm start


Environment Variables (.env):

    REDIS_URL=<your_redis_url>
    GEMINI_API_KEY=<your_gemini_api_key>
    VECTOR_DB_NAME=<qdrant_collection_name>
    PORT=5000
    SITEMAP_INDEX=<your_sitemap_url>

⚡ Frontend

    React SPA with ChatWindow, MessageInput, SessionControls.
    
    Connects to backend via .env:
    
    REACT_APP_BACKEND_URL=http://localhost:5000


Run Frontend:

    cd frontend
    npm install
    npm start


🌐 Deployment on Render and vercel

    Create free web services for backend & frontend.
    
    Set environment variables (REDIS_URL, GEMINI_API_KEY, VECTOR_DB_NAME, PORT).
    
    Backend: start command → npm start
    
    Frontend: build command → npm run build
    
    Link frontend to backend API URL via .env


🔧 Commands Summary

| Folder   | Command                             | Description                   |
| -------- | ----------------------------------- | ----------------------------- |
| backend  | `npm install`                       | Install dependencies          |
| backend  | `npm start`                         | Start backend server          |
| backend  | `node src/embeddings/ingestNews.js` | Ingest news articles          |
| frontend | `npm install`                       | Install frontend dependencies |
| frontend | `npm start`                         | Start frontend dev server     |
| frontend | `npm run build`                     | Build frontend for production |


📊 Workflow

sequenceDiagram:

    participant U as User
    participant F as Frontend
    participant B as Backend
    participant R as Redis
    participant Q as Qdrant
    participant G as Gemini LLM

    U->>F: Send message
    F->>B: Emit WebSocket user_message
    B->>R: Save user message
    B->>Q: Retrieve top-K chunks
    Q-->>B: Return chunks
    B->>G: Generate answer with chunks
    G-->>B: Return bot response
    B->>R: Save bot message
    B->>F: Stream bot_chunk events
    B->>F: Emit bot_done
    F->>U: Display bot answer


🛠 Future Enhancements

    Multi-language support
    
    User login & persistent session storage
    
    Advanced summarization & article ranking
    
    Typing indicator animations and better UI/UX
    
    Support multiple vector DB backends (Milvus, Pinecone)
    

📚 References

      Qdrant Docs
      
      Google Gemini API
      
      Redis Node.js Client
      
      Puppeteer
      
      Cheerio
      
      xml2js


✅ Contact

Harpreet Singh
Email: harpreetharpreet8469@gmail.com

LinkedIn: https://www.linkedin.com/in/harpreet011001
