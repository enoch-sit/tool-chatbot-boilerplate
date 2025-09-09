```typescript
// server.ts
import express from 'express';
import bodyParser from 'body-parser';

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Mimic Azure OpenAI chat completions endpoint with streaming
app.post('/openai/deployments/:deployment/chat/completions', (req, res) => {
  const { stream } = req.query;

  if (stream !== 'true') {
    // For non-streaming, just return a simple response (optional, as focus is on streaming)
    res.json({
      choices: [{ message: { content: 'hello how are you' } }]
    });
    return;
  }

  // Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // The message to stream
  const message = 'hello how are you';
  const chunks = message.split(' '); // Split into words for chunking

  // Function to send a data chunk
  const sendChunk = (content: string) => {
    const data = {
      id: 'chatcmpl-abc123',
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: 'gpt-35-turbo', // Mimicking Azure model
      choices: [{ delta: { content }, index: 0, finish_reason: null }]
    };
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Stream the chunks with a delay
  let index = 0;
  const interval = setInterval(() => {
    if (index < chunks.length) {
      sendChunk(chunks[index] + ' '); // Add space back
      index++;
    } else {
      // Send the final chunk
      const finalData = {
        id: 'chatcmpl-abc123',
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: 'gpt-35-turbo',
        choices: [{ delta: {}, index: 0, finish_reason: 'stop' }]
      };
      res.write(`data: ${JSON.stringify(finalData)}\n\n`);
      res.write('data: [DONE]\n\n');
      clearInterval(interval);
      res.end();
    }
  }, 500); // 500ms delay between chunks
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
```

To run this server:

1. Initialize a Node.js project: `npm init -y`
2. Install dependencies: `npm install express body-parser`
3. Install TypeScript and types: `npm install -D typescript @types/express @types/body-parser @types/node`
4. Create a `tsconfig.json` file with:

   ```json
   {
     "compilerOptions": {
       "target": "ES6",
       "module": "commonjs",
       "strict": true,
       "esModuleInterop": true
     }
   }
   ```

5. Compile the TypeScript: `npx tsc server.ts`
6. Run the server: `node server.js`

This server mimics the Azure OpenAI streaming API at the endpoint `/openai/deployments/{deployment}/chat/completions?stream=true`. It ignores the request body and always streams "hello how are you" word by word. Replace `{deployment}` with something like `gpt-35-turbo` in your requests.

To test it, you can use curl for a streaming request:

```
curl -X POST http://localhost:3000/openai/deployments/gpt-35-turbo/chat/completions?api-version=2023-05-15&stream=true \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Say something"}]}'
```
