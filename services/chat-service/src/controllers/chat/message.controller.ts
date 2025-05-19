import { Request, Response } from 'express';
import ChatSession, { IMessage } from '../../models/chat-session.model'; // Added IMessage import
import { initializeStreamingSession, streamResponse } from '../../services/streaming.service';
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
export const sendMessage = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const sessionId = req.params.sessionId;
  const modelId = req.body.modelId;

  try {
    const authHeader = req.headers.authorization || '';
    const { message } = req.body;

    const session = await ChatSession.findOne({ _id: sessionId, userId });

    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }

    const selectedModel = modelId || session.modelId || config.defaultModelId;
    const requiredCredits = await CreditService.calculateRequiredCredits(
      message,
      selectedModel,
      authHeader
    );

    const hasSufficientCredits = await CreditService.checkUserCredits(
      userId!,
      requiredCredits,
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
        logger.debug(`Sending request to Bedrock (attempt ${retryCount + 1}/${maxRetries + 1})`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 30000);
        bedrockResponse = await bedrockClient.send(command, {
          abortSignal: controller.signal,
        });
        clearTimeout(timeoutId);
        completionTime = Date.now() - startTime;
        logger.debug(`Bedrock response received in ${completionTime}ms`);
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
      logger.debug(`Raw Bedrock response for model ${selectedModel}: ${rawResponseText}`);
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
              logger.debug(`Parsed response structure: ${JSON.stringify(Object.keys(responseBody))}`);
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
        logger.debug(`Extracted response content: ${responseContent.substring(0, 100)}...`);
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

    await CreditService.recordChatUsage(userId!, selectedModel, tokensUsed, authHeader);
    logger.debug(`Non-streaming chat completed in ${completionTime}ms, used ~${tokensUsed} tokens`);

    return res.status(200).json({
      message: 'Message processed successfully',
      sessionId,
      response: responseContent,
      tokensUsed,
    });
  } catch (error: any) {
    logger.error(`Error processing non-streaming message for session ${sessionId}:`, error);
    logger.debug(`Request context: userId=${userId}, sessionId=${sessionId}, selectedModel=${modelId || 'default'}`);
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
 */
export const streamChatResponse = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const sessionId = req.params.sessionId;
  const { message, modelId } = req.body;
  const observationManager = ObservationManager.getInstance();
  let session;

  try {
    session = await ChatSession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }
    if (session.metadata?.activeStreamingSession) {
      return res.status(400).json({ message: 'This chat session already has an active streaming session' });
    }

    const userMessageForSession: IMessage = { // Changed type to IMessage
        role: 'user',
        content: message, // message is string
        timestamp: new Date()
    };
    session.messages.push(userMessageForSession);
    const selectedModel = modelId || session.modelId;
    if (modelId && modelId !== session.modelId) {
      session.modelId = modelId;
    }
    session.metadata = session.metadata || {};
    session.metadata.activeStreamingSession = true;
    await session.save();

    const messageHistory = session.messages.map((m: any) => ({ role: m.role, content: m.content }));
    const authHeader = req.headers.authorization || '';
    const streamSession = await initializeStreamingSession(userId!, messageHistory, selectedModel, authHeader);
    session.metadata.streamingSessionId = streamSession.sessionId;
    await session.save();

    logger.info(`Starting streaming session ${streamSession.sessionId} for chat ${sessionId}`);

    if (streamSession.sessionId) {
      logger.debug(`Setting streaming session ID header: ${streamSession.sessionId}`);
      res.setHeader('X-Streaming-Session-Id', streamSession.sessionId);
    } else {
      logger.error('Missing streaming session ID when trying to set header');
    }
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Expose-Headers', 'X-Streaming-Session-Id');
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const assistantMessagePlaceholder: IMessage = { // Changed type to IMessage
        role: 'assistant',
        content: ' ', // Placeholder string
        timestamp: new Date()
    };
    session.messages.push(assistantMessagePlaceholder);
    await session.save();

    const responseStream = await streamResponse(streamSession.sessionId, messageHistory, selectedModel, authHeader);
    observationManager.registerStream(sessionId, responseStream);
    responseStream.pipe(res);
    let fullResponse = '';

    responseStream.on('data', (data) => {
      const sseData = data.toString();
      if (sseData.includes('event: chunk')) {
        try {
          const jsonStr = sseData.split('data: ')[1].trim();
          const chunkData = JSON.parse(jsonStr);
          if (chunkData.text) { fullResponse += chunkData.text; }
        } catch (parseError) { logger.error('Error parsing SSE chunk:', parseError); }
      }
    });

    responseStream.on('end', async () => {
      try {
        logger.info(`Completed streaming session for chat ${sessionId}`);
        const updatedSession = await ChatSession.findById(sessionId);
        if (updatedSession) {
          const lastIndex = updatedSession.messages.length - 1;
          if (lastIndex >= 0 && updatedSession.messages[lastIndex].role === 'assistant') {
            updatedSession.messages[lastIndex].content = fullResponse;
          }
          updatedSession.metadata = updatedSession.metadata || {};
          updatedSession.metadata.activeStreamingSession = false;
          await updatedSession.save();
        }
      } catch (error: any) { logger.error('Error updating session after stream end:', error); }
    });

    req.on('close', () => {
      logger.info(`Client disconnected from stream for session ${sessionId}`);
      responseStream.unpipe(res);
    });

  } catch (error: any) {
    logger.error('Streaming error:', error);
    try {
      if (session) {
        (session as any).metadata.activeStreamingSession = false; // Type assertion
        await (session as any).save();
      }
    } catch (cleanupError) { logger.error('Error cleaning up session after streaming error:', cleanupError); }

    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: error.message || 'Unknown streaming error' })}\n\n`);
      res.end();
    } else {
      if (error.message === 'Insufficient credits for streaming') {
        return res.status(402).json({ message: 'Insufficient credits to start streaming session', error: 'INSUFFICIENT_CREDITS' });
      }
      res.status(500).json({ message: 'Error streaming chat response', error: error.message });
    }
  }
};

/**
 * Update Chat with Stream Response
 */
export const updateChatWithStreamResponse = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const sessionId = req.params.sessionId;
  const { completeResponse, streamingSessionId, tokensUsed } = req.body;

  try {
    logger.debug(`Update request for session ${sessionId}: userId: ${userId}, streamingSessionId: ${streamingSessionId}, tokensUsed: ${tokensUsed}, responseLength: ${completeResponse?.length || 0}`);
    let session: any = null; // Use any for session to handle mongoose document properties
    let latestError = null;
    const maxRetries = 3;

    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        session = await ChatSession.findOne({ _id: sessionId, userId });
        if (session) {
          if (session.metadata?.streamingSessionId) { break; }
          else { logger.debug(`Session found but missing streamingSessionId - retry ${retry + 1}/${maxRetries}`); }
        } else { logger.debug(`Session not found - retry ${retry + 1}/${maxRetries}`); }
        if (retry < maxRetries - 1) {
          const delayMs = 500 * Math.pow(2, retry);
          logger.debug(`Waiting ${delayMs}ms before retry ${retry + 2}/${maxRetries}`);
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
    logger.debug(`Session ID comparison details: Session metadata: ${JSON.stringify(session.metadata || {})}, Stored ID (raw): "${session.metadata?.streamingSessionId}", Provided ID (raw): "${streamingSessionId}", Stored ID (normalized): "${storedId}", Provided ID (normalized): "${providedId}", Exact match: ${session.metadata?.streamingSessionId === streamingSessionId}, Normalized match: ${storedId === providedId}`);

    if (!storedId && providedId) {
      const validIdRegex = /^stream-\d+-[a-zA-Z0-9]+$/;
      if (validIdRegex.test(providedId)) {
        logger.debug(`No stored ID found, but client provided a valid formatted ID: ${providedId}`);
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

    logger.debug(`Successfully updated chat session ${sessionId} with streaming response`);
    return res.status(200).json({ message: 'Chat session updated successfully', sessionId, tokensUsed });
  } catch (error: any) {
    logger.error('Error updating chat with stream response:', error);
    return res.status(500).json({ message: 'Error updating chat session', error: error.message });
  }
};
