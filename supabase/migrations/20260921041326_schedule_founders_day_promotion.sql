update public.promotions
set
  starts_at = '2026-09-21 07:00:00+00',
  ends_at = '2026-09-21 08:00:00+00',
  updated_at = now()
where code = 'FOUNDERS_DAY_2026';
