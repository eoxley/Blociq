import { createClient } from '@/lib/supabase/server';

export interface CommunicationLogEntry {
  id?: string;
  agency_id: string;
  type: 'letter_generation' | 'email_send' | 'word_csv_export' | 'preview';
  template_id: string;
  recipient_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export async function logCommunication(
  entry: Omit<CommunicationLogEntry, 'id' | 'created_at' | 'updated_at'>
): Promise<CommunicationLogEntry | null> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('communications_log')
      .insert(entry)
      .select()
      .single();

    if (error) {
      console.error('Failed to log communication:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Communication logging error:', error);
    return null;
  }
}

export async function updateCommunicationLog(
  id: string,
  updates: Partial<Pick<CommunicationLogEntry, 'status' | 'error_message' | 'metadata'>>
): Promise<CommunicationLogEntry | null> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('communications_log')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update communication log:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Communication log update error:', error);
    return null;
  }
}

export async function getCommunicationLogs(
  agencyId: string,
  limit: number = 50,
  offset: number = 0
): Promise<CommunicationLogEntry[]> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('communications_log')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to fetch communication logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Communication logs fetch error:', error);
    return [];
  }
}

export async function getCommunicationStats(agencyId: string): Promise<{
  total_communications: number;
  successful_communications: number;
  failed_communications: number;
  letters_generated: number;
  emails_sent: number;
  csv_exports: number;
  last_30_days: number;
}> {
  try {
    const supabase = await createClient();
    
    // Get total counts
    const { data: totalData, error: totalError } = await supabase
      .from('communications_log')
      .select('id, status, type')
      .eq('agency_id', agencyId);

    if (totalError) {
      console.error('Failed to fetch communication stats:', totalError);
      return {
        total_communications: 0,
        successful_communications: 0,
        failed_communications: 0,
        letters_generated: 0,
        emails_sent: 0,
        csv_exports: 0,
        last_30_days: 0
      };
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats = {
      total_communications: totalData?.length || 0,
      successful_communications: totalData?.filter(log => log.status === 'completed').length || 0,
      failed_communications: totalData?.filter(log => log.status === 'failed').length || 0,
      letters_generated: totalData?.filter(log => log.type === 'letter_generation' && log.status === 'completed').length || 0,
      emails_sent: totalData?.filter(log => log.type === 'email_send' && log.status === 'completed').length || 0,
      csv_exports: totalData?.filter(log => log.type === 'word_csv_export' && log.status === 'completed').length || 0,
      last_30_days: totalData?.filter(log => {
        const logDate = new Date(log.created_at || '');
        return logDate >= thirtyDaysAgo;
      }).length || 0
    };

    return stats;
  } catch (error) {
    console.error('Communication stats error:', error);
    return {
      total_communications: 0,
      successful_communications: 0,
      failed_communications: 0,
      letters_generated: 0,
      emails_sent: 0,
      csv_exports: 0,
      last_30_days: 0
    };
  }
}