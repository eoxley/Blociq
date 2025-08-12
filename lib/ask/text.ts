export const MAX_CHARS_PER_DOC = 15000;
export const MAX_TOTAL_DOC_CHARS = 50000;

export function truncate(s?: string, n = MAX_CHARS_PER_DOC) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) : s;
}

export function isSummariseLike(s?: string) {
  if (!s) return false;
  return /summari[sz]e|summary|key points|action(s)?\b|what should i do|what do i do/i.test(s);
}

export function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
}
