import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

function getServerClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

describe('DB text presence (soft)', () => {
  const supa = getServerClient();
  if (!supa) {
    it.skip('skipped: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing', () => {});
    return;
  }

  it('finds at least one extracted text row (soft unless SMOKE_STRICT=true)', async () => {
    // Try canonical building_documents first
    let len = 0;
    {
      const { data, error } = await supa
        .from('building_documents')
        .select('id, extracted_text, text_content')
        .order('created_at', { ascending: false })
        .limit(5);
      if (!error && Array.isArray(data) && data.length) {
        const first = data.find(d => (d.extracted_text?.length || d.text_content?.length || 0) > 0);
        len = first ? (first.extracted_text?.length || first.text_content?.length || 0) : 0;
      }
    }

    if (len === 0) {
      // Try documents as a fallback
      const { data, error } = await supa
        .from('documents')
        .select('id, extracted_text')
        .order('created_at', { ascending: false })
        .limit(5);
      if (!error && Array.isArray(data) && data.length) {
        const first = data.find(d => (d.extracted_text?.length || 0) > 0);
        len = first ? (first.extracted_text?.length || 0) : 0;
      }
    }

    const strict = (process.env.SMOKE_STRICT ?? 'false') === 'true';
    if (strict) {
      expect(len).toBeGreaterThan(0);
    } else {
      // Soft mode: don't fail the suite, but print a helpful message
      expect(len >= 0).toBe(true);
      if (len === 0) {
        // eslint-disable-next-line no-console
        console.warn('[SMOKE][soft] No extracted text found; run the OCR inline test or process a lease first.');
      }
    }
  }, 20000);
});
