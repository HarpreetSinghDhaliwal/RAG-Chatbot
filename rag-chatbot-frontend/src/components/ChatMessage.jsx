import React from "react";

const ChatMessage = ({ role, content }) => {
  const isBot = role === "bot";
  return (
    <div className={`chat-message ${isBot ? "bot" : "user"}`}>
      <div className="message-content">{content}</div>
    </div>
  );
};

export default ChatMessage;
