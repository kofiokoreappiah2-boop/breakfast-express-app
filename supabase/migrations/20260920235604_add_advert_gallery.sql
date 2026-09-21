create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  caption text not null default '',
  image_path text,
  link_url text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gallery_items_schedule_check
    check (ends_at is null or starts_at is null or ends_at > starts_at)
);

alter table public.gallery_items enable row level security;

grant select on public.gallery_items to anon;
grant select, insert, update, delete on public.gallery_items to authenticated;
grant all on public.gallery_items to service_role;

create policy "Anyone can view current gallery items"
  on public.gallery_items
  for select
  to anon, authenticated
  using (
    active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

create policy "Owners manage gallery items"
  on public.gallery_items
  for all
  to authenticated
  using (app_private.is_owner(auth.uid()))
  with check (app_private.is_owner(auth.uid()));

create trigger gallery_items_updated_at
  before update on public.gallery_items
  for each row execute function public.update_updated_at_column();
