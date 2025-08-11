import { SupabaseClient } from '@supabase/supabase-client';
import { Database } from '@/lib/database.types';

export interface DraftData {
  threadId: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  tone: string;
  context: {
    building_id?: string;
    leaseholder_id?: string;
    unit_number?: string;
    mode?: string;
    original_input?: string;
  };
}

export interface SavedDraft {
  id: string;
  thread_id: string;
  subject: string;
  body_html: string;
  body_text: string;
  tone: string;
  context: any;
  updated_at: string;
}

/**
 * Save a draft to the ai_thread_drafts table
 */
export async function saveDraft(draftData: DraftData): Promise<string> {
  try {
    // For now, we'll use a simple in-memory store
    // In production, this would use the ai_thread_drafts table
    
    // Generate a unique ID for the draft
    const draftId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store in localStorage for now (in production, use Supabase)
    const drafts = JSON.parse(localStorage.getItem('ai_thread_drafts') || '{}');
    drafts[draftData.threadId] = {
      id: draftId,
      thread_id: draftData.threadId,
      subject: draftData.subject,
      body_html: draftData.bodyHtml,
      body_text: draftData.bodyText,
      tone: draftData.tone,
      context: draftData.context,
      updated_at: new Date().toISOString()
    };
    
    localStorage.setItem('ai_thread_drafts', JSON.stringify(drafts));
    
    return draftId;
  } catch (error) {
    console.error('Error saving draft:', error);
    throw new Error('Failed to save draft');
  }
}

/**
 * Retrieve the latest draft for a given thread ID
 */
export async function getDraft(threadId: string): Promise<SavedDraft | null> {
  try {
    // For now, retrieve from localStorage
    // In production, this would query the ai_thread_drafts table
    
    const drafts = JSON.parse(localStorage.getItem('ai_thread_drafts') || '{}');
    const draft = drafts[threadId];
    
    if (!draft) {
      return null;
    }
    
    return draft as SavedDraft;
  } catch (error) {
    console.error('Error retrieving draft:', error);
    return null;
  }
}

/**
 * Update an existing draft
 */
export async function updateDraft(threadId: string, updates: Partial<DraftData>): Promise<string> {
  try {
    const existingDraft = await getDraft(threadId);
    if (!existingDraft) {
      throw new Error('No draft found to update');
    }
    
    const updatedDraft: DraftData = {
      threadId,
      subject: updates.subject || existingDraft.subject,
      bodyHtml: updates.bodyHtml || existingDraft.body_html,
      bodyText: updates.bodyText || existingDraft.body_text,
      tone: updates.tone || existingDraft.tone,
      context: {
        ...existingDraft.context,
        ...updates.context
      }
    };
    
    return await saveDraft(updatedDraft);
  } catch (error) {
    console.error('Error updating draft:', error);
    throw new Error('Failed to update draft');
  }
}

/**
 * Delete a draft for a given thread ID
 */
export async function deleteDraft(threadId: string): Promise<boolean> {
  try {
    const drafts = JSON.parse(localStorage.getItem('ai_thread_drafts') || '{}');
    delete drafts[threadId];
    localStorage.setItem('ai_thread_drafts', JSON.stringify(drafts));
    return true;
  } catch (error) {
    console.error('Error deleting draft:', error);
    return false;
  }
}

/**
 * Get all drafts for a user (for cleanup purposes)
 */
export async function getAllDrafts(): Promise<SavedDraft[]> {
  try {
    const drafts = JSON.parse(localStorage.getItem('ai_thread_drafts') || '{}');
    return Object.values(drafts) as SavedDraft[];
  } catch (error) {
    console.error('Error retrieving all drafts:', error);
    return [];
  }
}

/**
 * Clean up old drafts (older than 30 days)
 */
export async function cleanupOldDrafts(): Promise<number> {
  try {
    const drafts = JSON.parse(localStorage.getItem('ai_thread_drafts') || '{}');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let cleanedCount = 0;
    const cleanedDrafts: any = {};
    
    for (const [threadId, draft] of Object.entries(drafts)) {
      const draftDate = new Date((draft as any).updated_at);
      if (draftDate > thirtyDaysAgo) {
        cleanedDrafts[threadId] = draft;
      } else {
        cleanedCount++;
      }
    }
    
    localStorage.setItem('ai_thread_drafts', JSON.stringify(cleanedDrafts));
    return cleanedCount;
  } catch (error) {
    console.error('Error cleaning up old drafts:', error);
    return 0;
  }
}

// Production-ready Supabase implementation (commented out for now)
/*
export async function saveDraftToSupabase(
  supabase: SupabaseClient<Database>,
  draftData: DraftData
): Promise<string> {
  const { data, error } = await supabase
    .from('ai_thread_drafts')
    .insert({
      thread_id: draftData.threadId,
      subject: draftData.subject,
      body_html: draftData.bodyHtml,
      body_text: draftData.bodyText,
      tone: draftData.tone,
      context: draftData.context,
      updated_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function getDraftFromSupabase(
  supabase: SupabaseClient<Database>,
  threadId: string
): Promise<SavedDraft | null> {
  const { data, error } = await supabase
    .from('ai_thread_drafts')
    .select('*')
    .eq('thread_id', threadId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error retrieving draft:', error);
    return null;
  }

  return data;
}
*/
