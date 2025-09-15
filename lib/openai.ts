/**
 * OpenAI Client Utility
 * Provides a lazy-initialized OpenAI client to avoid build-time errors
 */

import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

// For backward compatibility
export const openai = {
  get chat() {
    return getOpenAIClient().chat;
  },
  get completions() {
    return getOpenAIClient().completions;
  },
  get embeddings() {
    return getOpenAIClient().embeddings;
  },
};

export default getOpenAIClient;
