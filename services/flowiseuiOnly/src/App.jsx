import React, { useState, useCallback, useRef } from 'react';
import ChatWindow from './components/ChatWindow';
import MessageInput from './components/MessageInput';
import flowiseService from './services/flowiseService';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  // Get streaming default from environment, fallback to true
  const [useStreaming, setUseStreaming] = useState(
    import.meta.env.VITE_STREAMING_ENABLED !== 'false'
  );
  const streamingMessageRef = useRef(null);
  const streamingMessageIdRef = useRef(null);

  // Get app title from environment
  const appTitle = import.meta.env.VITE_APP_TITLE || 'FlowiseAI Chat';

  const formatTimestamp = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const addMessage = useCallback((content, role, isStreaming = false) => {
    const messageId = Date.now() + Math.random(); // Unique ID for each message
    const newMessage = {
      id: messageId,
      content,
      role,
      timestamp: formatTimestamp(),
      isStreaming
    };
    
    if (isStreaming) {
      streamingMessageRef.current = newMessage;
      streamingMessageIdRef.current = messageId;
    }
    
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  const updateStreamingMessage = useCallback((newContent) => {
    const streamingId = streamingMessageIdRef.current;
    if (streamingId) {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === streamingId 
            ? { ...msg, content: newContent }
            : msg
        )
      );
    }
  }, []);

  const finalizeStreamingMessage = useCallback(() => {
    const streamingId = streamingMessageIdRef.current;
    if (streamingId) {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === streamingId 
            ? { ...msg, isStreaming: false }
            : msg
        )
      );
      streamingMessageRef.current = null;
      streamingMessageIdRef.current = null;
    }
  }, []);

  const handleStreamingMessage = async (messageText) => {
    setIsLoading(true);
    setIsStreaming(true);
    setError(null);

    // Add user message to chat
    addMessage(messageText, 'userMessage');

    // Prepare history for API call
    const history = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Add initial empty AI message that will be updated
    addMessage('', 'apiMessage', true);

    try {
      await flowiseService.streamMessage(messageText, history, {}, {
        onStart: () => {
          console.log('Streaming started');
        },
        onToken: (token, fullResponse) => {
          console.log('Token received:', token);
          console.log('Full response so far:', fullResponse);
          updateStreamingMessage(fullResponse);
        },
        onMetadata: (metadata) => {
          console.log('Received metadata:', metadata);
        },
        onEnd: (fullResponse, metadata) => {
          console.log('Streaming finished, final response:', fullResponse);
          finalizeStreamingMessage();
          setIsStreaming(false);
        },
        onError: (error) => {
          console.error('Streaming error:', error);
          setError('Streaming error occurred. Please try again.');
          finalizeStreamingMessage();
          setIsStreaming(false);
        },
        onSourceDocuments: (docs) => {
          console.log('Source documents:', docs);
        },
        onUsedTools: (tools) => {
          console.log('Used tools:', tools);
        }
      });

    } catch (error) {
      console.error('Error in streaming:', error);
      
      // Handle authentication errors specifically
      if (error.isAuthError) {
        setError('Authentication failed. Please check your FlowiseAI API key in the environment variables.');
      } else {
        setError('Failed to stream message. Please try again.');
      }
      
      // Replace the empty streaming message with error message
      const streamingId = streamingMessageIdRef.current;
      if (streamingId) {
        const errorMessage = error.isAuthError 
          ? 'Authentication failed. Please check your FlowiseAI configuration.'
          : 'Sorry, I encountered an error while processing your request.';
          
        setMessages(prev => 
          prev.map(msg => 
            msg.id === streamingId && msg.role === 'apiMessage' && msg.isStreaming
              ? { ...msg, content: errorMessage, isStreaming: false }
              : msg
          )
        );
      }
      
      streamingMessageRef.current = null;
      streamingMessageIdRef.current = null;
      setIsStreaming(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNonStreamingMessage = async (messageText) => {
    setIsLoading(true);
    setError(null);

    // Add user message to chat
    addMessage(messageText, 'userMessage');

    try {
      // Prepare history for API call
      const history = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Send message to FlowiseAI (non-streaming)
      const response = await flowiseService.sendMessageWithHistory(messageText, history);
      
      // Add AI response to chat
      if (response.text) {
        addMessage(response.text, 'apiMessage');
      } else {
        addMessage('Sorry, I received an empty response.', 'apiMessage');
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Handle authentication errors specifically  
      if (error.isAuthError) {
        setError('Authentication failed. Please check your FlowiseAI API key in the environment variables.');
        addMessage('Authentication failed. Please check your FlowiseAI configuration.', 'apiMessage');
      } else {
        setError('Failed to send message. Please try again.');
        addMessage('Sorry, I encountered an error. Please try again.', 'apiMessage');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    if (useStreaming) {
      await handleStreamingMessage(messageText);
    } else {
      await handleNonStreamingMessage(messageText);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
    streamingMessageRef.current = null;
    streamingMessageIdRef.current = null;
    setIsStreaming(false);
  };

  const toggleStreamingMode = () => {
    setUseStreaming(prev => !prev);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>{appTitle}</h1>
        <div className="header-controls">
          <button 
            className={`streaming-toggle ${useStreaming ? 'active' : ''}`}
            onClick={toggleStreamingMode}
            disabled={isLoading || isStreaming}
            title={useStreaming ? 'Switch to Non-Streaming Mode' : 'Switch to Streaming Mode'}
          >
            {useStreaming ? '⚡ Streaming' : '📝 Standard'}
          </button>
          <button className="clear-button" onClick={clearChat} disabled={isLoading || isStreaming}>
            Clear Chat
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <main className="app-main">
        <ChatWindow 
          messages={messages} 
          isLoading={isLoading}
          isStreaming={isStreaming}
        />
        <MessageInput 
          onSendMessage={handleSendMessage} 
          isLoading={isLoading || isStreaming}
          streamingMode={useStreaming}
        />
      </main>
    </div>
  );
}

export default App;