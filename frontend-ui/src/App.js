import { useEffect, useState } from "react";
import axios from "axios";
import "./App.scss";

function App() {
  const [sessionId, setSessionId] = useState(localStorage.getItem("sessionId"));
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (sessionId) {
      axios.get(`/api/chat/${sessionId}`).then((res) => {
        setMessages(res.data.history || []);
      });
    }
  }, [sessionId]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const res = await axios.post("/api/chat", { sessionId, message: input });
    setSessionId(res.data.sessionId);
    localStorage.setItem("sessionId", res.data.sessionId);
    setMessages((prev) => [...prev, { role: "user", text: input }, { role: "bot", text: res.data.answer }]);
    setInput("");
  };

  const resetSession = async () => {
    if (!sessionId) return;
    await axios.post(`/api/chat/reset/${sessionId}`);
    localStorage.removeItem("sessionId");
    setSessionId(null);
    setMessages([]);
  };

  return (
    <div className="chat-container">
      <div className="chat-window">
        {messages.map((msg, i) => (
          <div key={i} className={`msg ${msg.role}`}>{msg.text}</div>
        ))}
      </div>
      <div className="chat-input">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your message..." />
        <button onClick={sendMessage}>Send</button>
        <button onClick={resetSession} className="reset-btn">Reset</button>
      </div>
    </div>
  );
}

export default App;
