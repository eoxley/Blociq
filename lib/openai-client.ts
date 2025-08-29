import OpenAI from 'openai';

/**
 * Create OpenAI client instance
 * This is a factory function to avoid module-level initialization
 * which causes build-time errors when environment variables aren't available
 */
export function createOpenAIClient() {
  return new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });
}

/**
 * Get OpenAI client with error handling
 */
export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return createOpenAIClient();
}