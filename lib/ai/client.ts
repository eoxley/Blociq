export type AskAiAnswer = {
  status: 'ok'|'not_found'|'needs_clarification'|'forbidden'|'error';
  answer: string;
  data?: any;
  actions?: Array<{type:string,label:string,payload?:any}>;
};

export async function askBlocIQ(payload: { question: string; context?: any }): Promise<AskAiAnswer> {
  const r = await fetch('/api/v2/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error('ASK_FAILED');
  return r.json();
}
