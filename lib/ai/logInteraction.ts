export interface AILogEntry {
  user_id: string;
  agency_id?: string;
  question: string;
  response: string;
  timestamp: string;
}

export async function logAIInteraction(
  logEntry: AILogEntry,
  supabase: any
): Promise<void> {
  try {
    // Validate required fields
    if (!logEntry.user_id || !logEntry.question || !logEntry.response) {
      console.error('Invalid log entry - missing required fields');
      return;
    }

    // Truncate long responses to prevent database issues
    const truncatedResponse = logEntry.response.length > 5000 
      ? logEntry.response.substring(0, 5000) + '...' 
      : logEntry.response;

    const truncatedQuestion = logEntry.question.length > 1000 
      ? logEntry.question.substring(0, 1000) + '...' 
      : logEntry.question;

    const { error } = await supabase
      .from('ai_logs')
      .insert({
        user_id: logEntry.user_id,
        agency_id: logEntry.agency_id || null,
        question: truncatedQuestion,
        response: truncatedResponse,
        timestamp: logEntry.timestamp,
      });

    if (error) {
      console.error('Database error logging AI interaction:', error);
    }
  } catch (error) {
    // Suppress logging errors so they don't break the main flow
    console.error('Failed to log AI interaction:', error);
  }
} 