import React, { useState } from 'react';

const MessageInput = ({ onSendMessage, isLoading, streamingMode = false }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form className="message-input-form" onSubmit={handleSubmit}>
      <div className="input-container">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={streamingMode ? "Type your message here... (Streaming mode)" : "Type your message here..."}
          className="message-input"
          rows="1"
          disabled={isLoading}
        />
        <button
          type="submit"
          className={`send-button ${streamingMode ? 'streaming-mode' : ''}`}
          disabled={!message.trim() || isLoading}
          title={streamingMode ? 'Send with streaming' : 'Send message'}
        >
          {isLoading ? (
            <div className="loading-spinner"></div>
          ) : (
            <>
              {streamingMode && <span className="streaming-icon">⚡</span>}
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </>
          )}
        </button>
      </div>
      {streamingMode && (
        <div className="streaming-indicator-text">
          <span className="streaming-badge">⚡ Live Streaming</span>
          <span className="streaming-description">Responses will appear in real-time</span>
        </div>
      )}
    </form>
  );
};

export default MessageInput;