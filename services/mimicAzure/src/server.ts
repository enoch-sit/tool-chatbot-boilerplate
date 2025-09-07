// server.ts
import express from 'express';
import bodyParser from 'body-parser';

const app = express();
const port = process.env.PORT || 5555;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Generate realistic Azure-like IDs and fingerprints
const generateChatId = () => `chatcmpl-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
const generateSystemFingerprint = () => `fp_${Math.random().toString(36).substring(2, 12)}`;

// Content filter template
const getContentFilter = () => ({
  hate: { filtered: false, severity: "safe" },
  self_harm: { filtered: false, severity: "safe" },
  sexual: { filtered: false, severity: "safe" },
  violence: { filtered: false, severity: "safe" }
});

// Mimic Azure OpenAI chat completions endpoint with streaming
app.post('/openai/deployments/:deployment/chat/completions', (req, res) => {
  const { stream } = req.query;
  const chatId = generateChatId();
  const systemFingerprint = generateSystemFingerprint();
  const created = Math.floor(Date.now() / 1000);

  if (stream !== 'true') {
    // For non-streaming, just return a simple response
    res.json({
      id: chatId,
      object: 'chat.completion',
      created: created,
      model: 'gpt-4.1-2025-04-14',
      choices: [{ 
        message: { 
          role: 'assistant',
          content: 'hello how are you' 
        },
        finish_reason: 'stop',
        index: 0
      }],
      usage: {
        prompt_tokens: 12,
        completion_tokens: 4,
        total_tokens: 16
      },
      system_fingerprint: systemFingerprint
    });
    return;
  }

  // Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send initial prompt filter chunk (like real Azure)
  const promptFilterData = {
    choices: [],
    created: 0,
    id: "",
    model: "",
    object: "",
    prompt_filter_results: [{
      prompt_index: 0,
      content_filter_results: {
        ...getContentFilter(),
        jailbreak: { filtered: false, detected: false }
      }
    }]
  };
  res.write(`data: ${JSON.stringify(promptFilterData)}\n\n`);

  // Send initial role chunk
  const roleData = {
    choices: [{
      content_filter_results: {},
      delta: { content: "", refusal: null, role: "assistant" },
      finish_reason: null,
      index: 0,
      logprobs: null
    }],
    created: created,
    id: chatId,
    model: "gpt-4.1-2025-04-14",
    object: "chat.completion.chunk",
    system_fingerprint: systemFingerprint
  };
  res.write(`data: ${JSON.stringify(roleData)}\n\n`);

  // The message to stream
  const message = 'Hello! I\'m doing well, thank you for asking. How can I assist you today?';
  const chunks = message.split(' '); // Split into words for chunking

  // Function to send a data chunk
  const sendChunk = (content: string, isFirst: boolean = false) => {
    const data = {
      choices: [{
        content_filter_results: getContentFilter(),
        delta: { content },
        finish_reason: null,
        index: 0,
        logprobs: null
      }],
      created: created,
      id: chatId,
      model: "gpt-4.1-2025-04-14",
      object: "chat.completion.chunk",
      system_fingerprint: systemFingerprint
    };
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Stream the chunks with a delay
  let index = 0;
  const interval = setInterval(() => {
    if (index < chunks.length) {
      sendChunk(chunks[index] + (index < chunks.length - 1 ? ' ' : ''), index === 0);
      index++;
    } else {
      // Send the final chunk
      const finalData = {
        choices: [{
          content_filter_results: {},
          delta: {},
          finish_reason: "stop",
          index: 0,
          logprobs: null
        }],
        created: created,
        id: chatId,
        model: "gpt-4.1-2025-04-14",
        object: "chat.completion.chunk",
        system_fingerprint: systemFingerprint
      };
      res.write(`data: ${JSON.stringify(finalData)}\n\n`);
      res.write('data: [DONE]\n\n');
      clearInterval(interval);
      res.end();
    }
  }, 200); // Faster 200ms delay to match real Azure timing
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
