import OpenAI from 'openai';

export async function summarizeAndSuggest(text: string, filename: string): Promise<{ summary: string, suggestions: Array<{key:string, label:string, icon?:string, action?:string}>, suggestedActions: Array<{key:string, label:string, icon?:string, action?:string}> }> {
  const prompt = `
You are an assistant that summarizes arbitrary uploaded documents and proposes actionable next steps.
- Give a clear, concise summary (bullet points + short TL;DR).
- Then output a JSON array named SUGGESTIONS with suggested actions (2-6 items).
- Allowed action keys: create_letter, email_draft, save_notice, add_task, extract_contacts, schedule_event, classify_document.
- Each item: { "key": "<one of above>", "label": "<user-facing label>", "icon": "<optional icon name>" }.

Document filename: ${filename}
----
${text}
----
Return:
SUMMARY:
<summary here>

SUGGESTIONS:
[ {...}, {...} ]
`;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const resp = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL_SUMMARY || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });

  const content = resp.choices?.[0]?.message?.content || '';
  const [ , summaryPart = '', suggestionsPart = '[]' ] =
    content.match(/SUMMARY:\s*([\s\S]*?)\nSUGGESTIONS:\s*([\s\S]*)$/i) || [];

  let suggestions = [];
  try { suggestions = JSON.parse(suggestionsPart.trim()); } catch {}
  if (!Array.isArray(suggestions)) suggestions = [];

  return { summary: summaryPart.trim(), suggestions, suggestedActions: suggestions };
}
