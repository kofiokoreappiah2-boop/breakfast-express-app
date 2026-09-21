alter table public.business_settings
  alter column momo_number set default '0598473399';

update public.business_settings
set
  momo_number = '0598473399',
  updated_at = now()
where id = true;
