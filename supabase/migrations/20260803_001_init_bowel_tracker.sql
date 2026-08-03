create extension if not exists pgcrypto;

create table if not exists public.bowel_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  movement_time timestamptz not null,
  satisfaction_rating int not null check (satisfaction_rating between 1 and 5),
  bristol_type int not null check (bristol_type between 1 and 7),
  notes text not null default ''
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  normalized_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, normalized_name)
);

create table if not exists public.bowel_movement_tags (
  bowel_movement_id uuid not null references public.bowel_movements (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (bowel_movement_id, tag_id)
);

create index if not exists bowel_movements_user_id_movement_time_idx on public.bowel_movements (user_id, movement_time desc);
create index if not exists tags_user_id_name_idx on public.tags (user_id, normalized_name);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bowel_movements_set_updated_at on public.bowel_movements;
create trigger bowel_movements_set_updated_at
before update on public.bowel_movements
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists tags_set_updated_at on public.tags;
create trigger tags_set_updated_at
before update on public.tags
for each row execute function public.set_updated_at_timestamp();

alter table public.bowel_movements enable row level security;
alter table public.tags enable row level security;
alter table public.bowel_movement_tags enable row level security;

drop policy if exists "Users can read own bowel movements" on public.bowel_movements;
create policy "Users can read own bowel movements"
on public.bowel_movements
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own bowel movements" on public.bowel_movements;
create policy "Users can insert own bowel movements"
on public.bowel_movements
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own bowel movements" on public.bowel_movements;
create policy "Users can update own bowel movements"
on public.bowel_movements
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own bowel movements" on public.bowel_movements;
create policy "Users can delete own bowel movements"
on public.bowel_movements
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own tags" on public.tags;
create policy "Users can read own tags"
on public.tags
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own tags" on public.tags;
create policy "Users can insert own tags"
on public.tags
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own tags" on public.tags;
create policy "Users can update own tags"
on public.tags
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own tags" on public.tags;
create policy "Users can delete own tags"
on public.tags
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own bowel movement tags" on public.bowel_movement_tags;
create policy "Users can read own bowel movement tags"
on public.bowel_movement_tags
for select
using (
  exists (
    select 1
    from public.bowel_movements bm
    where bm.id = bowel_movement_tags.bowel_movement_id
      and bm.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert own bowel movement tags" on public.bowel_movement_tags;
create policy "Users can insert own bowel movement tags"
on public.bowel_movement_tags
for insert
with check (
  exists (
    select 1
    from public.bowel_movements bm
    where bm.id = bowel_movement_tags.bowel_movement_id
      and bm.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.tags t
    where t.id = bowel_movement_tags.tag_id
      and t.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own bowel movement tags" on public.bowel_movement_tags;
create policy "Users can delete own bowel movement tags"
on public.bowel_movement_tags
for delete
using (
  exists (
    select 1
    from public.bowel_movements bm
    where bm.id = bowel_movement_tags.bowel_movement_id
      and bm.user_id = auth.uid()
  )
);
