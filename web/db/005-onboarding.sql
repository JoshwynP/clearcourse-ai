-- Existing practice accounts have already entered the app. New accounts must acknowledge the welcome guide.
begin;
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'identity' and table_name = 'profile'
      and column_name = 'onboarding_acknowledged_at'
  ) then
    alter table identity.profile add column onboarding_acknowledged_at timestamptz;
    update identity.profile set onboarding_acknowledged_at = now();
  end if;
end $$;
commit;
