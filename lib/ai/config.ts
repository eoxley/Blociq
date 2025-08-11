export const AI_ENABLED = process.env.NEXT_PUBLIC_AI_ENABLED === 'true';
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
export function assertAiReady() {
  if (!AI_ENABLED || !OPENAI_API_KEY) throw new Error('AI_DISABLED');
}
