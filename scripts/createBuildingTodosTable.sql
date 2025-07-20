-- Create building_todos table (without foreign key constraint initially)
create table if not exists building_todos (
  id uuid primary key default gen_random_uuid(),
  building_id integer,
  title text not null,
  is_complete boolean default false,
  due_date date,
  priority text check (priority in ('Low', 'Medium', 'High')),
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Create indexes for better performance
create index if not exists idx_building_todos_building_id on building_todos(building_id);
create index if not exists idx_building_todos_is_complete on building_todos(is_complete);
create index if not exists idx_building_todos_due_date on building_todos(due_date);
create index if not exists idx_building_todos_priority on building_todos(priority);

-- Create updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_building_todos_updated_at
  before update on building_todos
  for each row
  execute function update_updated_at_column();

-- Insert some sample data for testing
insert into building_todos (building_id, title, is_complete, due_date, priority) values
(1, 'Schedule fire safety inspection', false, current_date + interval '7 days', 'High'),
(1, 'Review service charge accounts', false, current_date + interval '14 days', 'Medium'),
(1, 'Update building insurance policy', true, current_date - interval '2 days', 'High'),
(1, 'Arrange lift maintenance', false, current_date + interval '3 days', 'Medium'),
(1, 'Check emergency lighting systems', false, current_date + interval '1 day', 'High'),
(2, 'Complete EWS1 assessment', false, current_date + interval '30 days', 'High'),
(2, 'Update leaseholder contact details', false, current_date + interval '5 days', 'Low'),
(2, 'Review building maintenance schedule', false, current_date + interval '10 days', 'Medium'),
(4, 'Arrange gas safety inspection', false, current_date + interval '2 days', 'High'),
(4, 'Update fire risk assessment', false, current_date + interval '7 days', 'High'),
(4, 'Review and approve budget for roof repairs', false, current_date + interval '14 days', 'Medium'),
(4, 'Schedule annual AGM', false, current_date + interval '21 days', 'Medium'),
(4, 'Check and test fire alarms', true, current_date - interval '1 day', 'High'),
(4, 'Update building access codes', false, current_date + interval '3 days', 'Low');

-- Add foreign key constraint after table is created (if buildings table exists)
-- ALTER TABLE building_todos ADD CONSTRAINT building_todos_building_id_fkey 
-- FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE; 