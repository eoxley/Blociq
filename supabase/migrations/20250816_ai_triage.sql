-- AI Inbox Triage Tables
-- Safe mode + Outlook drafts with logging and idempotency

create table if not exists public.ai_triage_runs (
  id uuid primary key default gen_random_uuid(),
  started_by uuid,
  started_at timestamptz default now(),
  status text check (status in ('planned','applying','complete','failed')) default 'planned',
  total int default 0,
  batch_size int default 10,
  dry_run boolean default false,
  notes text
);

create table if not exists public.ai_triage_actions (
  id bigserial primary key,
  run_id uuid references public.ai_triage_runs(id) on delete cascade,
  message_id text not null,                     -- Outlook message id
  conversation_id text,
  internet_message_id text,
  category text,                                -- urgent|follow_up|resolved|archive_candidate
  reason text,
  due_date date,
  draft_id text,
  draft_weblink text,
  applied boolean default false,
  error text,
  created_at timestamptz default now()
);

create index if not exists ai_triage_actions_run_idx on public.ai_triage_actions(run_id);
create unique index if not exists ai_triage_actions_msg_unique on public.ai_triage_actions(message_id, run_id);
