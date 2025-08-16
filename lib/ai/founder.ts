import { createClient } from "@supabase/supabase-js";
import { searchFounderKnowledge } from './embed';

type GuidanceOpts = {
  topicHints?: string[];
  contexts?: string[];   // e.g. ['complaints'] | ['core'] | ['doc_summary'] | ['auto_polish']
  tags?: string[];       // e.g. ['tone','governance','leaks']
  limit?: number;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Normalize array filters safely */
function norm(a?: string[]) { return Array.isArray(a) ? a.filter(Boolean) : []; }

/** Fetch raw rows (fallback query) */
async function fetchRows(limit = 8) {
  const { data, error } = await supabase
    .from("founder_knowledge")
    .select("id,title,content,tags,contexts,priority,is_active,effective_from,expires_on")
    .eq("is_active", true)
    .order("priority", { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

/** Exported API used by buildPrompt */
export async function getFounderGuidance(opts: GuidanceOpts | string = {}) {
  // Backward compatibility: if string is passed, treat as topicHints
  if (typeof opts === 'string') {
    opts = { topicHints: [opts] };
  }
  
  const limit = opts.limit ?? 6;
  const contexts = norm(opts.contexts);
  const tags = norm(opts.tags);

  // 1) Try your existing vector/RPC path first (if present)
  try {
    // Use existing searchFounderKnowledge function
    const result = await searchFounderKnowledge((opts.topicHints || []).join(" "));
    
    if (result.success && result.results.length > 0) {
      // For backward compatibility, return string format if no filtering needed
      if (contexts.length === 0 && tags.length === 0) {
        return result.results.join('\n\n');
      }
      
      // If filtering is needed, we need to get the full rows with metadata
      // Fall back to direct query for now
      let rows = await fetchRows(20);
      
      // Filter by contexts/tags if columns exist
      rows = rows.filter((r: any) => r.is_active !== false);
      if (contexts.length && rows[0]?.contexts !== undefined) {
        rows = rows.filter((r: any) => (r.contexts || []).some((c: string) => contexts.includes(c)));
      }
      if (tags.length && rows[0]?.tags !== undefined) {
        rows = rows.filter((r: any) => (r.tags || []).some((t: string) => tags.includes(t)));
      }

      // Sort by priority desc, then title for stability
      rows.sort((a: any, b: any) => (b.priority ?? 0) - (a.priority ?? 0) || String(a.title || '').localeCompare(String(b.title || '')));

      return rows.slice(0, limit);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting founder guidance:', error);
    
    // 2) Fallback to simple table select
    let rows = await fetchRows(20);
    if (contexts.length && rows[0]?.contexts !== undefined) {
      rows = rows.filter(r => (r.contexts || []).some(c => contexts.includes(c)));
    }
    if (tags.length && rows[0]?.tags !== undefined) {
      rows = rows.filter(r => (r.tags || []).some(t => tags.includes(t)));
    }
    rows.sort((a: any, b: any) => (b.priority ?? 0) - (a.priority ?? 0));
    return rows.slice(0, limit);
  }
} 