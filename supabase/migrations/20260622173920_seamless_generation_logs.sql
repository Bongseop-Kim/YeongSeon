create table public.seamless_generation_logs (
  id                        uuid        primary key default gen_random_uuid(),
  request_id                text,
  input_type                text        not null check (input_type in ('intent','prompt','reference_image')),
  prompt                    text,
  has_reference_image       boolean     not null default false,
  reference_image_bytes     integer,
  colorway                  text,
  seed                      bigint,
  candidate_count_requested integer,
  candidate_count_returned  integer,
  distinct_layouts          integer,
  available_strategies      integer,
  engine_version            text,
  registry_version          text,
  intent                    jsonb,
  candidates                jsonb,
  warnings                  jsonb       not null default '[]'::jsonb,
  generate_ms               numeric,
  render_ms                 numeric,
  status                    text        not null default 'success' check (status in ('success','partial','error')),
  error_type                text,
  error_message             text,
  created_at                timestamptz not null default now()
);

comment on column public.seamless_generation_logs.candidates
  is 'array of {id,layout_id,source_fidelity,colorway_id,seed,svg,png_url}';

create index idx_seamless_gen_logs_created     on public.seamless_generation_logs (created_at desc);
create index idx_seamless_gen_logs_input_type  on public.seamless_generation_logs (input_type, created_at desc);
create index idx_seamless_gen_logs_status      on public.seamless_generation_logs (status, created_at desc);
create index idx_seamless_gen_logs_request_id  on public.seamless_generation_logs (request_id);

alter table public.seamless_generation_logs enable row level security;

revoke all on table public.seamless_generation_logs from public, anon, authenticated;
grant select on table public.seamless_generation_logs to authenticated;
grant select, insert, update on table public.seamless_generation_logs to service_role;

create policy "Admins can view all seamless generation logs"
  on public.seamless_generation_logs for select
  to authenticated
  using (public.is_admin());

insert into storage.buckets (id, name, public)
values ('seamless-previews', 'seamless-previews', true)
on conflict (id) do nothing;

create policy "seamless previews public read"
  on storage.objects for select
  to public
  using (bucket_id = 'seamless-previews');
