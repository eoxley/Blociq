import { searchFounderKnowledge } from './embed';

export async function getFounderGuidance(question: string) {
  try {
    const result = await searchFounderKnowledge(question);
    
    if (result.success && result.results.length > 0) {
      return result.results.join('\n\n');
    }
    
    return null;
  } catch (error) {
    console.error('Error getting founder guidance:', error);
    return null;
  }
} 