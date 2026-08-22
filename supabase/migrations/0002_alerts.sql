-- WAQT — expiry alert settings (customizable, channel-ready)

alter table public.companies
  add column if not exists alert_enabled       boolean not null default true,
  add column if not exists alert_days_before   int not null default 14,
  add column if not exists alert_frequency      text not null default 'daily'
    check (alert_frequency in ('daily','weekly')),
  add column if not exists alert_weekday        int not null default 1,   -- 1=Mon .. 7=Sun (ISO)
  add column if not exists alert_include_admins boolean not null default true,
  add column if not exists alert_recipients     text[] not null default '{}',
  add column if not exists alert_last_sent_at   timestamptz;

-- Resolve the recipient email list for a company: admin members' emails (when
-- alert_include_admins) plus any custom addresses. SECURITY DEFINER so the
-- scheduled job (service role) and app can both call it; reads auth.users.
create or replace function public.company_alert_recipients(cid uuid)
returns text[] language sql security definer stable set search_path = public, auth as $$
  select array(
    select distinct e from (
      select u.email::text as e
      from public.company_members m
      join auth.users u on u.id = m.user_id
      join public.companies c on c.id = cid
      where m.company_id = cid and m.role = 'admin' and c.alert_include_admins
      union
      select unnest(coalesce((select alert_recipients from public.companies where id = cid), '{}'))
    ) s
    where e is not null and btrim(e) <> ''
  );
$$;
