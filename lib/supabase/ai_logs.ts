import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function insertAiLog({
  user_id,
  question,
  response,
  context_type,
  building_id,
  document_ids,
  leaseholder_id,
  email_thread_id,
}: {
  user_id: string;
  question: string;
  response: string;
  context_type: string;
  building_id?: string;
  document_ids?: string[];
  leaseholder_id?: string;
  email_thread_id?: string;
}) {
  try {
    const { error } = await supabase
      .from('ai_logs')
      .insert({
        user_id,
        question,
        response,
        context_type,
        building_id,
        document_ids: document_ids ? JSON.stringify(document_ids) : null,
        leaseholder_id,
        email_thread_id,
        timestamp: new Date().toISOString(),
      });

    if (error) {
      console.error('Error inserting AI log:', error);
    } else {
      console.log('✅ AI interaction logged successfully');
    }
  } catch (error) {
    console.error('Error in insertAiLog:', error);
  }
} 