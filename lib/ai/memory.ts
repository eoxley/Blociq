import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Create clients only when needed (not during build time)
function getSupabaseClient() {
  if (typeof window !== 'undefined') {
    // Client-side: use public URL and anon key
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  } else {
    // Server-side: use service role key
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
}

function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function upsertConversation(input: { id?: string; title?: string; buildingId?: string|null; userId?: string }) {
  try {
    if (input.id) return input.id;
    
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({ 
        title: input.title ?? 'New conversation', 
        building_id: input.buildingId ?? null,
        user_id: input.userId ?? null
      })
      .select('id')
      .single();
      
    if (error) throw error;
    return data.id as string;
  } catch (error) {
    console.error('Error upserting conversation:', error);
    return null;
  }
}

export async function appendMessage(args: { 
  conversationId: string; 
  role: 'user'|'assistant'|'system'; 
  content: string; 
  metadata?: any 
}) {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('ai_messages').insert({
      conversation_id: args.conversationId,
      role: args.role,
      content: args.content,
      metadata: args.metadata ?? {}
    });
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error appending message:', error);
    return false;
  }
}

export async function getRecentTurns(args: { conversationId: string; limit?: number }) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', args.conversationId)
      .order('created_at', { ascending: false })
      .limit(args.limit ?? 8);
      
    if (error) throw error;
    return (data ?? []).reverse() as Array<{ role:'user'|'assistant'; content:string }>;
  } catch (error) {
    console.error('Error getting recent turns:', error);
    return [];
  }
}

export async function summarizeThread(conversationId: string) {
  try {
    const turns = await getRecentTurns({ conversationId, limit: 16 });
    if (turns.length === 0) return '';
    
    const text = turns.map(t => `${t.role}: ${t.content}`).join('\n');
    const prompt = `Summarize this conversation in ~200-300 words keeping key facts, decisions, and user intent:\n\n${text}`;
    
    const openai = getOpenAIClient();
    const resp = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_SUMMARY || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 400
    });
    
    const summary = resp.choices?.[0]?.message?.content?.trim() || '';
    
    const supabase = getSupabaseClient();
    await supabase
      .from('ai_conversations')
      .update({ 
        rolling_summary: summary, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', conversationId);
      
    return summary;
  } catch (error) {
    console.error('Error summarizing thread:', error);
    return '';
  }
}

export async function extractFacts(args: { 
  conversationId: string; 
  newText: string; 
  buildingId?: string|null 
}) {
  try {
    const prompt = `From the text below, extract 3-8 durable facts/preferences useful later (UK property context). Return JSON array of {key,value}.
Text:
${args.newText}`;

    const openai = getOpenAIClient();
    const resp = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_FACTS || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 800
    });
    
    let arr: any[] = [];
    try { 
      arr = JSON.parse(resp.choices?.[0]?.message?.content || '[]'); 
    } catch (parseError) {
      console.error('Error parsing facts JSON:', parseError);
      return;
    }
    
    const supabase = getSupabaseClient();
    for (const item of arr.slice(0, 10)) {
      if (item.key && item.value) {
        await supabase.from('ai_memory').upsert({
          scope: args.buildingId ? 'building' : 'conversation',
          building_id: args.buildingId ?? null,
          conversation_id: args.buildingId ? null : args.conversationId,
          key: item.key.toString().slice(0, 120),
          value: item.value.toString().slice(0, 2000)
        }, { 
          onConflict: 'scope,building_id,conversation_id,key' 
        } as any);
      }
    }
  } catch (error) {
    console.error('Error extracting facts:', error);
  }
}

export async function getDurableFacts(args: { 
  conversationId: string; 
  buildingId?: string|null 
}) {
  try {
    const supabase = getSupabaseClient();
    
    if (args.buildingId) {
      const { data, error } = await supabase
        .from('ai_memory')
        .select('key,value')
        .eq('scope', 'building')
        .eq('building_id', args.buildingId)
        .order('updated_at', { ascending: false })
        .limit(20);
        
      if (error) throw error;
      return (data ?? []).map(r => `${r.key}: ${r.value}`);
    }
    
    const { data, error } = await supabase
      .from('ai_memory')
      .select('key,value')
      .eq('scope', 'conversation')
      .eq('conversation_id', args.conversationId)
      .order('updated_at', { ascending: false })
      .limit(20);
      
    if (error) throw error;
    return (data ?? []).map(r => `${r.key}: ${r.value}`);
  } catch (error) {
    console.error('Error getting durable facts:', error);
    return [];
  }
}

export async function getConversation(conversationId: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting conversation:', error);
    return null;
  }
}

export async function updateConversationTitle(conversationId: string, title: string) {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('ai_conversations')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', conversationId);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating conversation title:', error);
    return false;
  }
}
