import { Request, Response } from 'express';
import ChatSession, { IMessage } from '../../models/chat-session.model'; // Added IMessage import
import { initializeStreamingSession, streamResponse } from '../../services/streaming.service';
import * as streamingService from '../../services/streaming.service'; // Added for streamChatResponse
import { PassThrough } from 'stream'; // Added for streamChatResponse
import CreditService from '../../services/credit.service';
import { ObservationManager } from '../../services/observation.service';
import logger from '../../utils/logger';
import config from '../../config/config';
import { InvokeModelCommand, InvokeModelCommandOutput } from '@aws-sdk/client-bedrock-runtime';
import { bedrockClient } from '../../utils/bedrock.client';
import { ChatMessage, escapeRegExp } from './utils';

/**
 * Send Message (Non-streaming)
 */
// 20250523_test_flow
export const sendMessage = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const sessionId = req.params.sessionId;
  const modelId = req.body.modelId;

  try {
    const authHeader = req.headers.authorization || '';
    const { message } = req.body;
    // DEBUG.MD_NOTE: Credit Service Integration Issues - RESOLVED
    // This controller calls `CreditService.calculateRequiredCredits` and then `CreditService.checkUserCredits`.
    // The error was occurring in `checkUserCredits` when it calls the accounting service due to `requiredCredits` being undefined.
    // Resolution:
    // - Added strict checks for `userId` and `message` content before `calculateRequiredCredits`.
    // - Added a strict check to ensure `requiredCredits` is a valid, non-negative number after `calculateRequiredCredits`
    //   and before `checkUserCredits`.
    //   This prevents `checkUserCredits` from being called with undefined `requiredCredits`,
    //   which was causing an empty payload {} to be sent to the accounting service, resulting in a 400 error.

    // Strict check for userId
    if (!userId) {
      logger.error('User ID is missing, cannot proceed with sending message.');
      return res.status(401).json({ message: 'User not authenticated or user ID missing.' });
    }

    // Strict check for message content
    if (!message || typeof message !== 'string' || message.trim() === '') {
      logger.error('Message is missing or invalid, cannot proceed.');
      return res.status(400).json({ message: 'Message content is required and must be a non-empty string.' });
    }

    const session = await ChatSession.findOne({ _id: sessionId, userId });

    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }

    const selectedModel = modelId || session.modelId || config.defaultModelId;
    
    logger.debug(`Calculating required credits for message: "${message}", model: ${selectedModel}, user: ${userId}`);

    const requiredCredits = await CreditService.calculateRequiredCredits(
      message,
      selectedModel,
      authHeader
    );

    // DEBUG.MD_NOTE: Issue with Non-Streaming Messages (Credit Calculation)
    // At `2025-05-21T07:23:23.229Z`, the chat service attempts to calculate credits for the model `amazon.nova-micro-v1:0`.
    // It sends a request to the accounting service: `POST http://accounting-service-accounting-service-1:3001/api/credits/calculate` 
    // with payload `{"modelId":"amazon.nova-micro-v1:0","tokens":1009}`.
    // The accounting service responds with `Status 200, Data: {"modelId":"amazon.nova-micro-v1:0","tokens":1009,"requiredCredits":2}`. 
    // This response appears **correct** and includes the `requiredCredits` field.
    // However, the very next log entry in `chat-service` is an error from `calculateRequiredCredits`:
    // `{"level":"error","message":"[calculateRequiredCredits] Invalid credits value received from accounting service: undefined. Returning undefined.","service":"chat-service","timestamp":"2025-05-21T07:23:23.239Z"}`.
    // This is followed by the error logged below: 
    // `{"level":"error","message":"Invalid requiredCredits calculated (undefined) for user 68142f173a381f81e190343e, model amazon.nova-micro-v1:0. Cannot check credits or proceed.","service":"chat-service","timestamp":"2025-05-21T07:23:23.240Z"}`.
    // Consequently, the message sending fails: `POST /api/chat/sessions/682d7f6b18b41595afbc3285/messages 500 17.989 ms - 100`.
    logger.debug(`Calculated requiredCredits: ${requiredCredits} for user: ${userId}`);

    // Strict check for requiredCredits after calculation.
    // This validation is critical as per UnderstandingCreditCalculation.md and findings in debug.md.
    // It ensures `requiredCredits` is a valid, non-negative number before being used in `CreditService.checkUserCredits`.
    // Failing to do so led to `checkUserCredits` receiving an invalid `requiredCredits` value (e.g., undefined),
    // which in turn caused a 400 Bad Request from the accounting service due to an empty or malformed payload (e.g. "{}").
    if (typeof requiredCredits !== 'number' || isNaN(requiredCredits) || requiredCredits < 0) { 
      logger.error(`Invalid requiredCredits calculated (${requiredCredits}) for user ${userId}, model ${selectedModel}. Cannot check credits or proceed.`);
      return res.status(500).json({
        message: 'Failed to calculate credit cost. Please try again.',
        error: 'CREDIT_CALCULATION_FAILED',
      });
    }

    // [20250521_16_52] Problem identified: Non-Streaming - Incorrect Credit Check Payload.
    // The payload to /api/credits/check is {"credits":X}, which is insufficient for the accounting service.
    // It expects more fields like userId and possibly modelId. This issue occurs within the CreditService.checkUserCredits call
    // or the subsequent HTTP request it makes.
    const hasSufficientCredits = await CreditService.checkUserCredits(
      userId, // userId is now guaranteed to be present
      requiredCredits, // requiredCredits is now guaranteed to be a valid non-negative number
      authHeader
    );

    if (!hasSufficientCredits) {
      return res.status(402).json({
        message: 'Insufficient credits to process message',
        error: 'INSUFFICIENT_CREDITS',
      });
    }

    const userMessageForSession: IMessage = { // Changed type to IMessage
      role: 'user',
      content: message, // message is string
      timestamp: new Date(),
    };
    session.messages.push(userMessageForSession);
    session.updatedAt = new Date();

    if (modelId) {
      session.modelId = modelId;
    }

    const messageHistory = session.messages.map(m => ({ // m is IMessage
      role: m.role,
      content: m.content // m.content is string
    }));

    let promptBody;

    if (selectedModel.includes('anthropic')) {
      promptBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 2000,
        messages: messageHistory,
      };
    } else if (selectedModel.includes('amazon.titan')) {
      promptBody = {
        inputText: messageHistory.map((m:any) => `${m.role}: ${m.content}`).join('\n'),
        textGenerationConfig: {
          maxTokenCount: 2000,
          temperature: 0.7,
          topP: 0.9,
        },
      };
    } else if (selectedModel.includes('amazon.nova')) {
      // Logic simplified as session.messages are IMessage[] and m.content is string
      const systemPrompts = session.messages
        .filter((m): m is IMessage & { role: 'system' } => m.role === 'system')
        .map((m) => m.content); // m.content is string

      const formattedMessages = session.messages
        .filter((m): m is IMessage & { role: 'user' | 'assistant' } => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role,
          content: [{ text: m.content }] // m.content is string, wrapped for Nova
        }));

      promptBody = {
        system: systemPrompts.length > 0
          ? systemPrompts.map(prompt => ({ text: prompt }))
          : [{ text: "You are a helpful AI assistant." }],
        messages: formattedMessages,
        inferenceConfig: {
          maxTokens: 2000,
          temperature: 0.7,
          topP: 0.9,
        },
      };
    } else if (selectedModel.includes('meta.llama')) {
      promptBody = {
        prompt: messageHistory.map((m:any) => `${m.role}: ${m.content}`).join('\n'),
        temperature: 0.7,
        top_p: 0.9,
        max_gen_len: 2000,
      };
    } else {
      promptBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 2000,
        messages: messageHistory,
      };
    }

    logger.info(`Processing non-streaming request for user ${userId} with model ${selectedModel}`);

    const maxRetries = 2;
    let retryCount = 0;
    let bedrockResponse: InvokeModelCommandOutput | undefined;
    let completionTime = 0;
    let startTime = 0;

    while (retryCount <= maxRetries) {
      try {
        const command = new InvokeModelCommand({
          modelId: selectedModel,
          body: JSON.stringify(promptBody),
          contentType: 'application/json',
          accept: 'application/json',
        });
        startTime = Date.now();
        //logger.debug(`Sending request to Bedrock (attempt ${retryCount + 1}/${maxRetries + 1})`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 30000);
        bedrockResponse = await bedrockClient.send(command, {
          abortSignal: controller.signal,
        });
        clearTimeout(timeoutId);
        completionTime = Date.now() - startTime;
        //logger.debug(`Bedrock response received in ${completionTime}ms`);
        break;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          logger.error(`Bedrock request timed out after ${Date.now() - startTime}ms`);
          if (retryCount === maxRetries) {
            return res.status(504).json({ message: 'AI model request timed out', error: 'MODEL_TIMEOUT' });
          }
        } else if (error.$metadata?.httpStatusCode) {
          logger.error(`Bedrock error: ${error.name} (${error.$metadata.httpStatusCode}) - ${error.message}`);
          if (error.$metadata.httpStatusCode === 400) {
            return res.status(400).json({ message: 'Invalid request to AI model service', error: error.message, errorCode: 'MODEL_BAD_REQUEST' });
          } else if (error.$metadata.httpStatusCode === 401 || error.$metadata.httpStatusCode === 403) {
            return res.status(503).json({ message: 'Authentication error with AI model service', error: error.message, errorCode: 'MODEL_AUTH_ERROR' });
          } else if (error.$metadata.httpStatusCode === 429) {
            return res.status(429).json({ message: 'Rate limit exceeded on AI model service', error: error.message, errorCode: 'MODEL_RATE_LIMIT' });
          } else if (retryCount === maxRetries) {
            return res.status(503).json({ message: 'AI model service error', error: error.message, errorCode: 'MODEL_SERVER_ERROR' });
          }
        } else {
          logger.error(`Unexpected error invoking model: ${error.name} - ${error.message}`);
          if (retryCount === maxRetries) {
            return res.status(500).json({ message: 'Error processing request', error: error.message });
          }
        }
        retryCount++;
        const backoffMs = Math.pow(2, retryCount) * 500;
        logger.info(`Retrying in ${backoffMs}ms (attempt ${retryCount + 1}/${maxRetries + 1})...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }

    let responseContent = '';
    let tokensUsed = 0;

    if (bedrockResponse && bedrockResponse?.body) {
      const rawResponseText = new TextDecoder().decode(bedrockResponse.body);
      //logger.debug(`Raw Bedrock response for model ${selectedModel}: ${rawResponseText}`);
      try {
        if (!rawResponseText || rawResponseText.trim() === '') {
          logger.error('Empty response received from model');
          responseContent = 'Empty response received from model. Please try again.';
        } else {
          let responseBody;
          try {
            responseBody = JSON.parse(rawResponseText);
            if (responseBody === null) {
              logger.warn('Received null response');
              responseContent = 'Null response received from model. Please try again.';
            } else if (typeof responseBody !== 'object' || Array.isArray(responseBody)) {
              logger.info(`Received non-object response of type ${typeof responseBody}`);
              responseContent = String(responseBody);
            } else {
              //logger.debug(`Parsed response structure: ${JSON.stringify(Object.keys(responseBody))}`);
              if (selectedModel.includes('anthropic')) {
                if (responseBody.content && Array.isArray(responseBody.content)) {
                  for (const item of responseBody.content) {
                    if (item.text) { responseContent = item.text; break; }
                  }
                } else if (responseBody.completion) { responseContent = responseBody.completion; }
              } else if (selectedModel.includes('amazon.titan')) {
                if (responseBody.results?.[0]?.outputText) { responseContent = responseBody.results[0].outputText; }
                else if (responseBody.outputText) { responseContent = responseBody.outputText; }
                else if (responseBody.output) { responseContent = responseBody.output; }
              } else if (selectedModel.includes('amazon.nova')) {
                if (responseBody.output?.message?.content?.[0]?.text) { responseContent = responseBody.output.message.content[0].text; }
                else if (responseBody.outputs && Array.isArray(responseBody.outputs)) {
                  for (const output of responseBody.outputs) { if (output.text) { responseContent = output.text; break; } }
                } else if (responseBody.results && Array.isArray(responseBody.results)) {
                  for (const result of responseBody.results) { if (result.outputText) { responseContent = result.outputText; break; } }
                } else if (responseBody.text) { responseContent = responseBody.text; }
              } else if (selectedModel.includes('meta.llama')) {
                if (responseBody.generation) { responseContent = responseBody.generation; }
                else if (responseBody.text) { responseContent = responseBody.text; }
              }

              if (!responseContent) {
                const commonFields = ['text', 'content', 'message', 'answer', 'response', 'result', 'output', 'generation', 'completion', 'generated_text'];
                for (const field of commonFields) {
                  if (responseBody[field]) {
                    if (typeof responseBody[field] === 'string') { responseContent = responseBody[field]; break; }
                    else if (Array.isArray(responseBody[field]) && responseBody[field].length > 0) {
                      const firstItem = responseBody[field][0];
                      if (typeof firstItem === 'string') { responseContent = firstItem; break; }
                      else if (typeof firstItem === 'object' && firstItem.text) { responseContent = firstItem.text; break; }
                    }
                  }
                }
              }
              if (!responseContent) {
                logger.warn('Could not extract text through known patterns, returning full response');
                responseContent = JSON.stringify(responseBody);
              }
            }
          } catch (jsonParseError) {
            if (typeof rawResponseText === 'string' && !rawResponseText.startsWith('{') && !rawResponseText.startsWith('[')) {
              logger.info('Received plain text response instead of JSON, using as is');
              responseContent = rawResponseText.trim();
            } else {
              throw jsonParseError;
            }
          }
        }
        //logger.debug(`Extracted response content: ${responseContent.substring(0, 100)}...`);
      } catch (parseError) {
        logger.error('Error parsing AI model response:', parseError);
        responseContent = 'Error processing model response. Please try again.';
      }
      tokensUsed = Math.ceil((message.length + responseContent.length) / 4);
    } else {
      logger.error('Empty response body from Bedrock');
      responseContent = 'Error: Received empty response from AI service.';
    }

    const assistantMessageForSession: IMessage = { // Changed type to IMessage
      role: 'assistant',
      content: responseContent, // responseContent is string
      timestamp: new Date(),
    };
    session.messages.push(assistantMessageForSession);
    session.metadata = session.metadata || {};
    session.metadata.lastTokensUsed = tokensUsed;
    session.metadata.totalTokensUsed = (session.metadata.totalTokensUsed || 0) + tokensUsed;
    await session.save();

    // [20250521_16_52] Problem identified: Non-Streaming - Lost/Undefined Credits for Usage Recording.
    // The `requiredCredits` (or its equivalent for cost) becomes undefined before this call to recordChatUsage,
    // leading to skipped usage recording. The issue is that the initially calculated `requiredCredits`
    // is not correctly passed or retrieved for this usage recording step.
    await CreditService.recordChatUsage(userId!, selectedModel, tokensUsed, authHeader);
    //logger.debug(`Non-streaming chat completed in ${completionTime}ms, used ~${tokensUsed} tokens`);

    return res.status(200).json({
      message: 'Message processed successfully',
      sessionId,
      response: responseContent,
      tokensUsed,
    });
  } catch (error: any) {
    logger.error(`Error processing non-streaming message for session ${sessionId}:`, error);
    //logger.debug(`Request context: userId=${userId}, sessionId=${sessionId}, selectedModel=${modelId || 'default'}`);
    if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
      return res.status(502).json({ message: 'Failed to process model response', error: 'Invalid response from AI service', errorCode: 'INVALID_MODEL_RESPONSE' });
    } else if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return res.status(504).json({ message: 'Request to AI service timed out', error: error.message, errorCode: 'MODEL_TIMEOUT' });
    } else if (error.message?.includes('credit')) {
      return res.status(402).json({ message: 'Insufficient credits to process message', error: error.message, errorCode: 'INSUFFICIENT_CREDITS' });
    }
    return res.status(500).json({ message: 'Failed to process message', error: error.message || 'Unknown error', errorCode: 'INTERNAL_SERVER_ERROR' });
  }
};

/**
 * Get Messages
 */
// 20250523_test_flow
export const getMessages = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const sessionId = req.params.sessionId;
    const session = await ChatSession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }
    return res.status(200).json({ messages: session.messages });
  } catch (error: any) {
    logger.error('Error retrieving messages:', error);
    return res.status(500).json({ message: 'Failed to retrieve messages', error: error.message });
  }
};

/**
 * Stream Chat Response
 * This function handles requests to stream chat responses using Server-Sent Events (SSE).
 * It processes a user's message, interacts with an AI model, and streams the response back to the client.
 *
 * @param req - The Express request object. Contains user information, session ID, message, and model ID.
 * @param res - The Express response object. Used to send the SSE stream or error messages.
 */
// 20250523_test_flow
export const streamChatResponse = async (req: Request, res: Response) => {
  // Extract user ID from the authenticated user's information attached to the request.
  const userId = req.user?.userId;
  // Extract session ID from the request parameters (e.g., /api/chat/sessions/:sessionId/stream).
  const sessionId = req.params.sessionId;
  // Extract message and modelId from the request body.
  const { message, modelId } = req.body;
  // Get a singleton instance of the ObservationManager, used for supervisor observation features.
  const observationManager = ObservationManager.getInstance();
  // Declare a variable to hold the chat session document.
  let session;

  try {
    // Attempt to find the chat session in the database using its ID and the user ID.
    // This ensures that users can only access their own sessions.
    session = await ChatSession.findOne({ _id: sessionId, userId });

    // If the session is not found, return a 404 (Not Found) error.
    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }

    // Check if the session already has an active streaming session.
    // This prevents multiple concurrent streams for the same chat session.
    if (session.metadata?.activeStreamingSession) {
      return res.status(400).json({ message: 'This chat session already has an active streaming session' });
    }

    // Create a new message object representing the user's input.
    const userMessageForSession: IMessage = { // Changed type to IMessage
        role: 'user', // Role is 'user' for messages sent by the user.
        content: message, // The actual text content of the message.
        timestamp: new Date() // Timestamp of when the message was received.
    };
    // Add the user's message to the session's message history.
    session.messages.push(userMessageForSession);

    // Determine the AI model to be used for this interaction.
    // If a modelId is provided in the request, use that; otherwise, use the modelId stored in the session.
    const selectedModel = modelId || session.modelId;
    // If a new modelId is provided and it's different from the one in the session, update the session's modelId.
    if (modelId && modelId !== session.modelId) {
      session.modelId = modelId;
    }

    // Initialize session metadata if it doesn't exist.
    session.metadata = session.metadata || {};
    // Mark that there's an active streaming session.
    session.metadata.activeStreamingSession = true;
    // Save the updated session to the database.
    await session.save();

    // Prepare the message history to be sent to the AI model.
    // This typically includes previous messages in the conversation for context.
    const messageHistory = session.messages.map((m: any) => ({ role: m.role, content: m.content }));
    // Get the authorization header from the request, needed for service-to-service calls (e.g., to Accounting service).
    const authHeader = req.headers.authorization || '';

    // Initialize the streaming session with the backend streaming service.
    // This step might involve credit checks and pre-allocation with the Accounting service.
    const streamSession = await initializeStreamingSession(userId!, messageHistory, selectedModel, authHeader);
    // Store the unique ID of this streaming session in the chat session's metadata.
    session.metadata.streamingSessionId = streamSession.sessionId;
    // Save the session again to persist the streamingSessionId.
    await session.save();

    // Log that a new streaming session is starting.
    logger.info(`Starting streaming session ${streamSession.sessionId} for chat ${sessionId}`);

    // If a streaming session ID was successfully obtained, set it in the response headers.
    // This allows the client to identify the stream.
    if (streamSession.sessionId) {
      //logger.debug(`Setting streaming session ID header: ${streamSession.sessionId}`);
      res.setHeader('X-Streaming-Session-Id', streamSession.sessionId);
    } else {
      // Log an error if the streaming session ID is missing, which is unexpected.
      logger.error('Missing streaming session ID when trying to set header');
    }

    // Handle Cross-Origin Resource Sharing (CORS) headers.
    // Get the origin of the request.
    const origin = req.headers.origin;
    if (origin) {
      // Allow requests from the client's origin.
      res.setHeader('Access-Control-Allow-Origin', origin);
      // Allow credentials (e.g., cookies, authorization headers) to be sent.
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      // Expose the 'X-Streaming-Session-Id' header to the client.
      res.setHeader('Access-Control-Expose-Headers', 'X-Streaming-Session-Id');
    }

    // Set necessary HTTP headers for Server-Sent Events (SSE).
    res.setHeader('Content-Type', 'text/event-stream'); // Indicates an SSE stream.
    res.setHeader('Cache-Control', 'no-cache'); // Prevents caching of the stream.
    res.setHeader('Connection', 'keep-alive'); // Keeps the connection open for streaming.
    // Send the headers to the client immediately.
    res.flushHeaders(); // Send headers immediately

    // Add a placeholder message for the assistant's response to the session.
    // This placeholder will be updated with the actual response as it streams in.
    const assistantMessagePlaceholder: IMessage = { // Changed type to IMessage
        role: 'assistant', // Role is 'assistant' for messages from the AI.
        content: ' ', // Initial content is a space or empty, to be filled later.
        timestamp: new Date() // Timestamp for the assistant's message.
    };
    session.messages.push(assistantMessagePlaceholder);
    // Save the session with the assistant's placeholder message.
    await session.save();

    try {
      // Delegate the actual streaming logic to the StreamingService
      const chatStream: PassThrough = await streamingService.streamResponse(
        streamSession.sessionId, 
        messageHistory, 
        selectedModel, 
        authHeader
      );

      // Register this stream with the ObservationManager so supervisors can observe it.
      observationManager.registerStream(sessionId, chatStream);
      // Pipe the AI's response stream directly to the client's HTTP response.
      // This sends data chunks to the client as they are received from the AI.
      chatStream.pipe(res);

      // Initialize a variable to accumulate the full response text.
      let fullResponse = '';

      // Listen for 'data' events on the response stream.
      // Each 'data' event typically contains a chunk of the AI's response.
      chatStream.on('data', (data: Buffer) => {
        const sseData = data.toString(); // Convert the data buffer to a string.
        // Check if the SSE data is a 'chunk' event.
        if (sseData.includes('event: chunk')) {
          try {
            // Extract the JSON string from the SSE data.
            // Robustly find the start of the JSON data part of an SSE message
            const dataPrefix = 'data: ';
            const dataStartIndex = sseData.indexOf(dataPrefix);
            if (dataStartIndex === -1) {
              logger.warn(`[streamChatResponse] SSE data event received without 'data: ' prefix: ${sseData}`);
              return;
            }
            // Extract the part after "data: " and trim whitespace
            const jsonStr = sseData.substring(dataStartIndex + dataPrefix.length).trim();
            
            // [20250521_16_52] Problem identified: Streaming - Malformed SSE Chunk Parsing.
            // This is where the "Unexpected token \\" in JSON error occurs as per debug.md.
            // The jsonStr being parsed likely contains improperly escaped characters due to
            // incorrect processing/splitting of raw SSE event lines or an erroneous unescaping
            // step performed on the extracted data string before JSON.parse().
            // Corrected parsing by ensuring only the JSON part is parsed.
            const chunkData = JSON.parse(jsonStr);
            // If the chunk data contains text, append it to the fullResponse.
            if (chunkData.text) { fullResponse += chunkData.text; }
          } catch (parseError: any) { // Typed parseError
            // Log an error if parsing the SSE chunk fails.
            logger.error('Error parsing SSE chunk:', parseError);
          }
        }
      });

      // Listen for the 'end' event on the response stream.
      // This event signifies that the AI has finished sending its response.
      chatStream.on('end', async () => {
        try {
          // Log that the streaming session has completed.
          logger.info(`Completed streaming session for chat ${sessionId}`);
          // Retrieve the latest version of the session from the database.
          const updatedSession = await ChatSession.findById(sessionId);
          if (updatedSession) {
            // Find the last message in the session (which should be the assistant's placeholder).
            const lastIndex = updatedSession.messages.length - 1;
            if (lastIndex >= 0 && updatedSession.messages[lastIndex].role === 'assistant') {
              // Update the content of the assistant's message with the accumulated fullResponse.
              // DEBUG.MD_NOTE: MongoDB Validation Failure - Empty Content
              // The debug.md report mentions: "Error updating session after stream end: 
              // ChatSession validation failed: messages.X.content: Path `content` is required."
              // This implies that `fullResponse` might be an empty string here.
              // The ChatSession model requires message content. If `fullResponse` is empty,
              // assigning it directly (e.g., `updatedSession.messages[lastIndex].content = "";`)
              // could lead to this validation error if the model doesn't allow empty strings for content.
              // Recommendation from debug.md: "Ensure that the content field isn't empty before saving to MongoDB. 
              // Add validation to check if the streamed content is non-empty."
              // For example, ensure `fullResponse` has a non-empty value or provide a default
              // like a single space if an empty response is permissible but an empty string isn't.
              // Example: updatedSession.messages[lastIndex].content = fullResponse || ' ';
              updatedSession.messages[lastIndex].content = fullResponse || ' ';
            }
            // Ensure metadata exists.
            updatedSession.metadata = updatedSession.metadata || {};
            // Mark that the active streaming session has ended.
            updatedSession.metadata.activeStreamingSession = false;
            // Save the final state of the session to the database.
            await updatedSession.save();
          }
        } catch (error: any) {
          // Log an error if updating the session after the stream ends fails.
          logger.error('Error updating session after stream end:', error);
        }
      });

      // Listen for the 'close' event on the request object.
      // This event is triggered if the client closes the connection prematurely.
      req.on('close', async () => { // Added async
        logger.info('Client disconnected from stream');
        // Ensure the stream is destroyed to free up resources
        if (chatStream && !chatStream.destroyed) {
          chatStream.destroy();
        }
        // [20250521_16_52] Problem identified: Streaming - Malformed SSE Chunk Parsing within message.controller.ts.
        // According to debug.md, this controller (specifically a PassThrough.on('data') anonymous handler, 
        // which would be around here or implicitly part of how chatStream is handled/piped) 
        // fails to parse JSON strings from the streaming service when processing SSE chunks.
        // The error "Unexpected token \\" suggests improperly escaped characters in the string fed to JSON.parse().
        // This could be due to incorrect processing/splitting of raw SSE event lines or an erroneous unescaping step
        // if/when this controller inspects or handles data chunks from chatStream before they are sent to the client via res.pipe().
        // The actual parsing logic leading to the error (at JS line 523 as per debug.md) would be implicitly part of this stream handling.

        // Attempt to finalize the session with accounting, marking it as unsuccessful due to client disconnect
        if (sessionId && streamSession.sessionId) { // Corrected: streamSession.sessionId
          logger.info(`Client disconnected, attempting to finalize streaming session ${streamSession.sessionId} for chat session ${sessionId}`); // Corrected: streamSession.sessionId
          try {
            // Assuming CreditService.finalizeStreamingSession exists and is correctly typed
            // This function is not defined in the provided credit.service.ts, so this is a placeholder call
            // await CreditService.finalizeStreamingSession(sessionId, streamSession.sessionId, false, req.headers.authorization || '');
            logger.info(`Placeholder: Successfully finalized streaming session ${streamSession.sessionId} for chat session ${sessionId}`); // Corrected: streamSession.sessionId
          } catch (finalizeError: any) { // Typed finalizeError
            logger.error(`Error finalizing streaming session ${streamSession.sessionId} for chat session ${sessionId}:`, finalizeError); // Corrected: streamSession.sessionId
          }
        }
      });

    } catch (error: any) { // Typed error
      // Catch any errors that occur during the streaming process.
      logger.error('Streaming error:', error);
      try {
        // If a session object exists, try to clean up its state.
        if (session) {
          // Mark that there's no active streaming session.
          (session as any).metadata.activeStreamingSession = false; // Type assertion to access metadata
          // Save the cleaned-up session state.
          await (session as any).save();
        }
      } catch (cleanupError: any) { // Typed cleanupError
        // Log an error if cleaning up the session state fails.
        logger.error('Error cleaning up session after streaming error:', cleanupError);
      }

      // If headers have already been sent to the client (meaning the stream started),
      // try to send an error event through the SSE stream.
      if (res.headersSent) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: error.message || 'Unknown streaming error' })}\n\n`);
        res.end(); // Close the SSE stream.
      } else {
        // If headers haven't been sent, respond with a regular HTTP error.
        // Check for specific error messages to provide more context to the client.
        if (error.message === 'Insufficient credits for streaming') {
          return res.status(402).json({ message: 'Insufficient credits to start streaming session', error: 'INSUFFICIENT_CREDITS' });
        }
        // For other errors, send a generic 500 (Internal Server Error) response.
        res.status(500).json({ message: 'Error streaming chat response', error: error.message });
      }
    }
  } catch (error: any) { // Outer catch for initial setup errors before streaming starts
    logger.error('Error setting up stream or initial credit check:', error);
    // If a session object exists, try to clean up its state.
    if (session && (session as any).metadata) {
        try {
            (session as any).metadata.activeStreamingSession = false;
            await (session as any).save();
        } catch (cleanupError: any) {
            logger.error('Error cleaning up session after initial setup error:', cleanupError);
        }
    }
    // Respond with an error if headers haven't been sent
    if (!res.headersSent) {
        if (error.message === 'Insufficient credits for streaming' || error.message?.includes('INSUFFICIENT_CREDITS')) {
            return res.status(402).json({ message: 'Insufficient credits to start streaming session', error: 'INSUFFICIENT_CREDITS' });
        }
        return res.status(500).json({ message: 'Failed to start chat stream', error: error.message });
    } else {
        // If headers were sent, it implies the error happened after the stream started, which should be caught by the inner try/catch.
        // However, as a fallback, ensure the response ends.
        res.end();
    }
  }
};

/**
 * Update Chat with Stream Response
 */
// 20250523_test_flow
export const updateChatWithStreamResponse = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const sessionId = req.params.sessionId;
  const { completeResponse, streamingSessionId, tokensUsed } = req.body;

  try {
    //logger.debug(`Update request for session ${sessionId}: userId: ${userId}, streamingSessionId: ${streamingSessionId}, tokensUsed: ${tokensUsed}, responseLength: ${completeResponse?.length || 0}`);
    let session: any = null; // Use any for session to handle mongoose document properties
    let latestError = null;
    const maxRetries = 3;

    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        session = await ChatSession.findOne({ _id: sessionId, userId });
        if (session) {
          if (session.metadata?.streamingSessionId) { break; }
          else { 
            //logger.debug(`Session found but missing streamingSessionId - retry ${retry + 1}/${maxRetries}`); 
        }
        } else { 
            //logger.debug(`Session not found - retry ${retry + 1}/${maxRetries}`); 
        }
        if (retry < maxRetries - 1) {
          const delayMs = 500 * Math.pow(2, retry);
          //logger.debug(`Waiting ${delayMs}ms before retry ${retry + 2}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (err) {
        latestError = err;
        logger.error(`Error retrieving session on attempt ${retry + 1}:`, err);
      }
    }

    if (!session) {
      return res.status(404).json({ message: 'Chat session not found', error: latestError instanceof Error ? latestError.message : String(latestError) });
    }

    const storedId = (session.metadata?.streamingSessionId || '').toString().trim().toLowerCase();
    const providedId = (streamingSessionId || '').toString().trim().toLowerCase();
    //logger.debug(`Session ID comparison details: Session metadata: ${JSON.stringify(session.metadata || {})}, Stored ID (raw): "${session.metadata?.streamingSessionId}", Provided ID (raw): "${streamingSessionId}", Stored ID (normalized): "${storedId}", Provided ID (normalized): "${providedId}", Exact match: ${session.metadata?.streamingSessionId === streamingSessionId}, Normalized match: ${storedId === providedId}`);

    if (!storedId && providedId) {
      const validIdRegex = /^stream-\d+-[a-zA-Z0-9]+$/;
      if (validIdRegex.test(providedId)) {
        //logger.debug(`No stored ID found, but client provided a valid formatted ID: ${providedId}`);
        session.metadata = session.metadata || {};
        session.metadata.streamingSessionId = streamingSessionId;
      } else {
        logger.warn(`Rejecting invalid format streaming ID: ${providedId}`);
        return res.status(400).json({ message: 'Invalid streaming session ID format', details: { expected: 'stream-{timestamp}-{uuid}', received: providedId || '(no provided ID)' } });
      }
    } else if (!providedId || storedId !== providedId) {
      return res.status(400).json({ message: 'Streaming session ID mismatch', details: { expected: storedId || '(no stored ID)', received: providedId || '(no provided ID)' } });
    }

    const lastIndex = session.messages.length - 1;
    if (lastIndex < 0 || session.messages[lastIndex].role !== 'assistant') {
      return res.status(400).json({ message: 'Last message in session is not from assistant' });
    }
    session.messages[lastIndex].content = completeResponse || ' ';
    session.metadata = session.metadata || {};
    session.metadata.lastTokensUsed = tokensUsed;
    session.metadata.totalTokensUsed = (session.metadata.totalTokensUsed || 0) + tokensUsed;
    session.metadata.activeStreamingSession = false;
    session.updatedAt = new Date();
    await session.save();

    //logger.debug(`Successfully updated chat session ${sessionId} with streaming response`);
    return res.status(200).json({ message: 'Chat session updated successfully', sessionId, tokensUsed });
  } catch (error: any) {
    logger.error('Error updating chat with stream response:', error);
    return res.status(500).json({ message: 'Error updating chat session', error: error.message });
  }
};
