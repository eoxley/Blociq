export function buildSystemPrompt(opts?: { orgName?: string; tone?: string; roleContext?: string }) {
  const org = opts?.orgName ?? 'MIH Property Management';
  const tone = opts?.tone ?? 'encouraging, quick and clever humor';
  const role = opts?.roleContext ?? 'UK block/property management assistant';
  return [
    `You are Blociq, an assistant for ${org}.`,
    `Role: ${role}.`,
    `Style: ${tone}. Keep responses concise and useful.`,
    `For notices: include Subject, intro, key points (bullets), actions, contact, sign-off (UK spelling).`,
    `For emails: include Subject, greeting, concise body, call to action, sign-off.`,
    `Reuse conversation context and facts; avoid repeating long explanations.`,
  ].join('\n');
}

export function buildChatPrompt(args: {
  rollingSummary?: string;
  recentTurns: Array<{ role: 'user'|'assistant'; content: string }>;
  durableFacts?: string[];
  buildingInfo?: string | null;
  userMessage: string;
}) {
  const lines: string[] = [];
  if (args.rollingSummary) lines.push(`Rolling context summary:\n${args.rollingSummary}`);
  if (args.buildingInfo) lines.push(`Building context:\n${args.buildingInfo}`);
  if (args.durableFacts?.length) {
    lines.push('Key facts from earlier in the thread:');
    for (const f of args.durableFacts) lines.push(`- ${f}`);
  }
  lines.push('Recent turns:');
  for (const t of args.recentTurns.slice(-8)) {
    const tag = t.role === 'user' ? 'User' : 'Assistant';
    lines.push(`${tag}: ${t.content}`); 
  }
  lines.push('\nUser now asked:\n' + args.userMessage);
  lines.push('\nRespond using the style rules. If the user asked for a notice/letter/email, output in that format.');
  return lines.join('\n');
}
