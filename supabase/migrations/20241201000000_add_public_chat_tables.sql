-- leads: email capture
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  marketing_consent boolean not null default false,
  source text default 'landing_public_chat',
  created_at timestamptz not null default now()
);

-- chat_sessions: one per unlocked chat
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  email text,
  lead_id uuid references public.leads(id) on delete set null,
  source text default 'landing_public_chat',
  user_agent text,
  started_at timestamptz not null default now()
);

-- chat_messages: every turn
create table if not exists public.chat_messages (
  id bigserial primary key,
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  token_count int,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_session_idx on public.chat_messages(session_id);
create index if not exists leads_email_idx on public.leads(email);
