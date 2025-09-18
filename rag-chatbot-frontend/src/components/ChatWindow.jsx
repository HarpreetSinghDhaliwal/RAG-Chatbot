import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import ChatInput from "./ChatInput";
import ChatMessage from "./ChatMessage";
import { fetchHistory, resetSession } from "../services/api";

const ChatWindow = ({ sessionId, onSessionReset }) => {
  const [messages, setMessages] = useState([]);
  const socketRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const initSocket = async () => {
      socketRef.current = io(process.env.REACT_APP_BACKEND_URL, {
        query: { sessionId },
      });

      socketRef.current.on("bot_chunk", (chunk) => {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "bot" && !last.final) {
            return [
              ...prev.slice(0, -1),
              { ...last, content: last.content + chunk },
            ];
          }
          return [...prev, { role: "bot", content: chunk, final: false }];
        });
      });

      socketRef.current.on("bot_done", (msg) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.role === "bot" && !m.final ? { ...m, final: true } : m
          )
        );
      });
    };

    const loadHistory = async () => {
      const history = await fetchHistory(sessionId);
      setMessages(history);
    };

    initSocket();
    loadHistory();

    return () => {
      socketRef.current?.disconnect();
    };
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (text) => {
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    socketRef.current.emit("user_message", { text });
  };

  const handleReset = async () => {
    await resetSession(sessionId);
    setMessages([]);
    onSessionReset();
  };

  return (
    <div className="chat-window">
      <div className="messages">
        {messages.map((m, idx) => (
          <ChatMessage key={idx} {...m} />
        ))}
        <div ref={scrollRef} />
      </div>
      <ChatInput onSend={sendMessage} />
      <button className="reset-btn" onClick={handleReset}>
        Reset Session
      </button>
    </div>
  );
};

export default ChatWindow;
