drop policy if exists "Anyone can view current gallery items" on public.gallery_items;
create policy "Anyone can view current gallery items"
  on public.gallery_items
  for select
  to anon
  using (
    active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

drop policy if exists "Owners manage gallery items" on public.gallery_items;
create policy "Owners manage gallery items"
  on public.gallery_items
  for all
  to authenticated
  using (app_private.is_owner((select auth.uid())))
  with check (app_private.is_owner((select auth.uid())));
