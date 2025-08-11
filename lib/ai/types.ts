export type AskAiAnswer = {
  status: 'ok'|'not_found'|'needs_clarification'|'forbidden'|'error';
  answer: string;
  data?: Record<string, any>;
  actions?: Array<{type:string,label:string,payload?:any}>;
  sources?: Array<{type:'db'|'doc'|'web',label:string,url?:string,id?:string}>;
};
