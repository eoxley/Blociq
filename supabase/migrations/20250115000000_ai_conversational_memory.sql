-- AI Conversational Memory System
-- Creates tables for durable conversation threads, message history, and fact extraction

-- ai_conversations: one per thread
create table if not exists ai_conversations (
  id uuid primary key default gen_random_uuid(),
  title text,
  building_id uuid null,
  user_id uuid null,
  rolling_summary text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ai_messages: full transcript
create table if not exists ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references ai_conversations(id) on delete cascade,
  role text check (role in ('system','user','assistant')),
  content text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ai_memory: durable facts/prefs
create table if not exists ai_memory (
  id uuid primary key default gen_random_uuid(),
  scope text check (scope in ('global','building','conversation')) not null,
  building_id uuid null,
  conversation_id uuid null,
  key text not null,
  value text not null,
  weight int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes for performance
create index if not exists ai_messages_conv_idx on ai_messages(conversation_id, created_at);
create index if not exists ai_memory_scope_idx on ai_memory(scope, building_id, conversation_id, key);

-- Add RLS policies
alter table ai_conversations enable row level security;
alter table ai_messages enable row level security;
alter table ai_memory enable row level security;

-- RLS policies for ai_conversations
create policy "Users can view their own conversations" on ai_conversations
  for select using (auth.uid() = user_id);

create policy "Users can insert their own conversations" on ai_conversations
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own conversations" on ai_conversations
  for update using (auth.uid() = user_id);

-- RLS policies for ai_messages
create policy "Users can view messages in their conversations" on ai_messages
  for select using (
    exists (
      select 1 from ai_conversations 
      where id = ai_messages.conversation_id 
      and user_id = auth.uid()
    )
  );

create policy "Users can insert messages in their conversations" on ai_messages
  for insert with check (
    exists (
      select 1 from ai_conversations 
      where id = ai_messages.conversation_id 
      and user_id = auth.uid()
    )
  );

-- RLS policies for ai_memory
create policy "Users can view memory for their conversations" on ai_memory
  for select using (
    scope = 'global' or
    (scope = 'conversation' and exists (
      select 1 from ai_conversations 
      where id = ai_memory.conversation_id 
      and user_id = auth.uid()
    )) or
    (scope = 'building' and exists (
      select 1 from buildings 
      where id = ai_memory.building_id 
      and exists (
        select 1 from building_users 
        where building_id = buildings.id 
        and user_id = auth.uid()
      )
    ))
  );

create policy "Users can insert memory for their conversations" on ai_memory
  for insert with check (
    scope = 'global' or
    (scope = 'conversation' and exists (
      select 1 from ai_conversations 
      where id = ai_memory.conversation_id 
      and user_id = auth.uid()
    )) or
    (scope = 'building' and exists (
      select 1 from buildings 
      where id = ai_memory.building_id 
      and exists (
        select 1 from building_users 
        where building_id = buildings.id 
        and user_id = auth.uid()
      )
    ))
  );

create policy "Users can update memory for their conversations" on ai_memory
  for update using (
    scope = 'global' or
    (scope = 'conversation' and exists (
      select 1 from ai_conversations 
      where id = ai_memory.conversation_id 
      and user_id = auth.uid()
    )) or
    (scope = 'building' and exists (
      select 1 from buildings 
      where id = ai_memory.building_id 
      and exists (
        select 1 from building_users 
        where building_id = buildings.id 
        and user_id = auth.uid()
      )
    ))
  );
