import React, { useEffect, useRef } from 'react';
import Message from './Message';

const ChatWindow = ({ messages, isLoading, isStreaming }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="chat-window">
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="welcome-message">
            <h3>Welcome to FlowiseAI Chat</h3>
            <p>Start a conversation by typing a message below!</p>
            <p className="streaming-note">
              ⚡ Streaming mode is enabled for real-time responses
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <Message
              key={msg.id || `${msg.role}-${msg.timestamp}`}
              message={msg.content}
              isUser={msg.role === 'userMessage'}
              timestamp={msg.timestamp}
              isStreaming={msg.isStreaming || false}
            />
          ))
        )}
        {(isLoading && !isStreaming) && (
          <div className="typing-indicator">
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className="typing-text">AI is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatWindow;