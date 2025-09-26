import React from 'react';

const Message = ({ message, isUser, timestamp, isStreaming = false }) => {
  return (
    <div className={`message ${isUser ? 'user-message' : 'ai-message'} ${isStreaming ? 'streaming' : ''}`}>
      <div className="message-content">
        <div className="message-text">
          {message}
          {isStreaming && (
            <span className="streaming-cursor" aria-hidden="true">|</span>
          )}
        </div>
        <div className="message-timestamp">
          {isStreaming ? (
            <span className="streaming-indicator">
              <span className="streaming-dots">
                <span></span>
                <span></span>
                <span></span>
              </span>
              typing...
            </span>
          ) : (
            timestamp
          )}
        </div>
      </div>
    </div>
  );
};

export default Message;