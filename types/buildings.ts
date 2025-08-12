export type BuildingNotes = { 
  title: string; 
  content_markdown: string; 
  content_html: string; 
  updated_at?: string 
};

export type BuildingStructure = { 
  structure_json: Record<string, any>; 
  updated_at?: string 
};

export type ComplianceSummary = { 
  overdue: number; 
  due_soon: number; 
  ok: number; 
  missing: number 
};

export type TaskItem = { 
  id: string; 
  title: string; 
  status: 'open'|'in_progress'|'done'; 
  priority?: 'low'|'normal'|'high'|'urgent'; 
  due_date?: string 
};
