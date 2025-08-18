export function dedupeEmails(list: string[], ownEmails: string[] = []) {
  const own = new Set(ownEmails.map(e => e.toLowerCase()));
  const seen = new Set<string>();
  return list.filter(x => {
    const k = x.trim().toLowerCase();
    if (!k || own.has(k) || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function buildReplySubject(originalSubject?: string) {
  const s = originalSubject?.trim() || "";
  return s.toLowerCase().startsWith("re:") ? s : `Re: ${s}`;
}

// Very light quoted block from original plain text (use your HTML quote if available)
export function quoteThread(originalPlain: string) {
  const lines = originalPlain?.split("\n") ?? [];
  const quoted = lines.map(l => `> ${l}`).join("\n");
  return `\n\n----- Original message -----\n${quoted}`;
}

// Compose full body from triage draft + optional quoted thread
export function composeBody(draft: {greeting:string; body_markdown:string; signoff:string; signature_block:string}, quoted?: string) {
  return `${draft.greeting}\n\n${draft.body_markdown}\n\n${draft.signoff}\n${draft.signature_block}${quoted ?? ""}`;
}

export function displayNameFromAddress(addr?: string) {
  if (!addr) return "Sir/Madam";
  const local = addr.split("@")[0] || "";
  const parts = local.replace(/\./g," ").split(/[\.\_\-]+/);
  const first = parts[0] ? parts[0][0].toUpperCase() + parts[0].slice(1) : "Sir/Madam";
  return first;
}
