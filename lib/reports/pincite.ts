// lib/reports/pincite.ts

export type PinCite = {
  kind: "clause" | "schedule";
  label: string;        // e.g., "Clause 7.2", "Schedule 5(10)"
  page?: number;        // 1-based page number if known
  index?: number;       // first match index in the searched string
};

const CLAUSE_RE = /\bClause\s+(\d+(?:\.\d+)*)(?!\w)/gi;
const SCHEDULE_RE = /\bSchedule\s+(\d+(?:\([^)]+\))?)(?!\w)/gi;

// Deduplicate, keep earliest index
function dedupe(cites: PinCite[]): PinCite[] {
  const seen = new Map<string, PinCite>();
  for (const c of cites) {
    const key = `${c.kind}:${c.label}:${c.page ?? 0}`;
    if (!seen.has(key)) {
      seen.set(key, c);
    } else {
      // Keep the one with the earliest index
      const existing = seen.get(key)!;
      if ((c.index ?? Infinity) < (existing.index ?? Infinity)) {
        seen.set(key, c);
      }
    }
  }
  return Array.from(seen.values()).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
}

export function findPinCites(text: string): PinCite[] {
  const cites: PinCite[] = [];
  let m: RegExpExecArray | null;

  // Reset regex lastIndex to ensure clean scans
  CLAUSE_RE.lastIndex = 0;
  SCHEDULE_RE.lastIndex = 0;

  while ((m = CLAUSE_RE.exec(text))) {
    cites.push({ 
      kind: "clause", 
      label: `Clause ${m[1]}`, 
      index: m.index 
    });
  }
  
  SCHEDULE_RE.lastIndex = 0;
  while ((m = SCHEDULE_RE.exec(text))) {
    cites.push({ 
      kind: "schedule", 
      label: `Schedule ${m[1]}`, 
      index: m.index 
    });
  }
  
  return dedupe(cites);
}

/**
 * Provide an array of page texts (index 0 = page 1 text).
 * We'll scan each page and attach page numbers.
 */
export function findPinCitesWithPages(pages: string[]): PinCite[] {
  const cites: PinCite[] = [];
  
  pages.forEach((pageText, i) => {
    let m: RegExpExecArray | null;
    
    // Create fresh regex instances for each page to avoid lastIndex issues
    const clauseRe = /\bClause\s+(\d+(?:\.\d+)*)(?!\w)/gi;
    const scheduleRe = /\bSchedule\s+(\d+(?:\([^)]+\))?)(?!\w)/gi;
    
    while ((m = clauseRe.exec(pageText))) {
      cites.push({ 
        kind: "clause", 
        label: `Clause ${m[1]}`, 
        page: i + 1, 
        index: m.index 
      });
    }
    
    while ((m = scheduleRe.exec(pageText))) {
      cites.push({ 
        kind: "schedule", 
        label: `Schedule ${m[1]}`, 
        page: i + 1, 
        index: m.index 
      });
    }
  });
  
  return dedupe(cites);
}

/**
 * Utility to pick a few cites relevant to a section (e.g., 'alterations', 'subletting').
 * We match by keyword presence around each cite; fall back to top-N globally.
 */
export function selectCitesForSection(
  cites: PinCite[],
  pages: string[] | null,
  keywords: string[],
  max = 3
): PinCite[] {
  if (!cites.length) return [];
  if (!pages) return cites.slice(0, max);

  const hits: { cite: PinCite; score: number }[] = [];
  
  for (const cite of cites) {
    const pageIdx = (cite.page ?? 1) - 1;
    const pageText = pages[pageIdx] || "";
    
    // Score based on how many keywords appear in the same page as this cite
    const score = keywords.reduce((s, kw) => {
      return pageText.toLowerCase().includes(kw.toLowerCase()) ? s + 1 : s;
    }, 0);
    
    hits.push({ cite, score });
  }
  
  // Sort by relevance score (descending), then by index position (ascending)
  hits.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return (a.cite.index ?? 0) - (b.cite.index ?? 0);
  });
  
  // Return only hits with positive scores, up to max limit
  // If no hits have positive scores, fall back to first few cites globally
  const relevantHits = hits.filter(h => h.score > 0);
  if (relevantHits.length > 0) {
    return relevantHits.slice(0, max).map(h => h.cite);
  }
  
  // Fallback: return first few cites if no keywords matched
  return cites.slice(0, Math.min(max, 2));
}

/**
 * Helper to format a list of pin cites for display
 */
export function formatPinCites(cites: PinCite[]): string {
  if (!cites.length) return "";
  
  const formatted = cites.map(cite => {
    if (cite.page) {
      return `${cite.label}, p.${cite.page}`;
    }
    return cite.label;
  });
  
  return `*(see ${formatted.join("; ")})*`;
}

/**
 * Quick utility to count total references found
 */
export function countReferences(cites: PinCite[]): { clauses: number; schedules: number } {
  const clauses = cites.filter(c => c.kind === "clause").length;
  const schedules = cites.filter(c => c.kind === "schedule").length;
  return { clauses, schedules };
}