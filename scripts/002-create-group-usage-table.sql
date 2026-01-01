-- Create group_usage table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.group_usage (
  id bigint primary key references public.grouping(id) on delete cascade,
  busy boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.group_usage enable row level security;

-- Add update trigger to set updated_at
create or replace function update_group_usage_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger group_usage_updated_at
before update on public.group_usage
for each row
execute function update_group_usage_updated_at();

-- Create index on busy column for faster queries
create index if not exists group_usage_busy_idx on public.group_usage(busy);
