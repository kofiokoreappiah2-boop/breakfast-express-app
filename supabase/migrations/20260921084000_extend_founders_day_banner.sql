set local lock_timeout = '5s';

alter table public.promotions
  add column display_ends_at timestamptz,
  add constraint promotions_display_schedule_check
    check (display_ends_at is null or ends_at is null or display_ends_at >= ends_at);

update public.promotions
set
  display_ends_at = '2026-09-21 17:00:00+00',
  updated_at = now()
where code = 'FOUNDERS_DAY_2026';
