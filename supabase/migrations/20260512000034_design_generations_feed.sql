create table public.design_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  pattern_type text not null check (pattern_type in ('all_over', 'one_point')),
  fabric_type text not null check (fabric_type in ('yarn_dyed', 'printed')),
  request_metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.design_generation_variants (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.design_generations(id) on delete cascade,
  variant_index int not null check (variant_index between 1 and 4),
  repeat_tile_url text not null,
  repeat_tile_work_id text not null references public.ai_generation_logs(work_id) on delete restrict,
  accent_tile_url text,
  accent_tile_work_id text references public.ai_generation_logs(work_id) on delete restrict,
  accent_layout_json jsonb,
  pattern_type text not null check (pattern_type in ('all_over', 'one_point')),
  fabric_type text not null check (fabric_type in ('yarn_dyed', 'printed')),
  created_at timestamptz not null default now(),
  unique (generation_id, variant_index),
  check (
    (
      pattern_type = 'all_over'
      and accent_tile_url is null
      and accent_tile_work_id is null
      and accent_layout_json is null
    )
    or
    (
      pattern_type = 'one_point'
      and accent_tile_url is not null
      and accent_tile_work_id is not null
    )
  )
);

create index idx_design_generations_user_created_at
  on public.design_generations (user_id, created_at desc)
  where deleted_at is null;

create index idx_design_generation_variants_generation_index
  on public.design_generation_variants (generation_id, variant_index);

alter table public.design_generations enable row level security;
alter table public.design_generation_variants enable row level security;

grant select on public.design_generations to authenticated;
grant select on public.design_generation_variants to authenticated;

create policy "Users can view own design generations"
  on public.design_generations
  for select
  to authenticated
  using (user_id = auth.uid() and deleted_at is null);

create policy "Users can view own design generation variants"
  on public.design_generation_variants
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.design_generations g
      where g.id = generation_id
        and g.user_id = auth.uid()
        and g.deleted_at is null
    )
  );

create or replace function public.delete_design_generation(p_generation_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'unauthorized: must be logged in';
  end if;

  update public.design_generations
  set deleted_at = now(),
      updated_at = now()
  where id = p_generation_id
    and user_id = v_user_id
    and deleted_at is null;

  if not found then
    raise exception 'not_found: design generation %', p_generation_id;
  end if;
end;
$$;

comment on function public.delete_design_generation(uuid)
  is 'SECURITY DEFINER is required so authenticated clients can soft-delete owned design generation rows without granting direct table update privileges; ownership is enforced with auth.uid().';

grant execute on function public.delete_design_generation(uuid) to authenticated;
