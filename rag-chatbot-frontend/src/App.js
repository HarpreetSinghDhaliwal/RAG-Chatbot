import React, { useState, useEffect } from "react";
import ChatWindow from "./components/ChatWindow";
import { createSession } from "./services/api";
import "./App.scss";

function App() {
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    const init = async () => {
      const id = await createSession();
      setSessionId(id);
    };
    init();
  }, []);

  if (!sessionId) return <div className="loading">Initializing session...</div>;

  return (
    <div className="app">
      <h1>RAG News Chatbot</h1>
      <ChatWindow
        sessionId={sessionId}
        onSessionReset={async () => {
          const id = await createSession();
          setSessionId(id);
        }}
      />
    </div>
  );
}

export default App;
