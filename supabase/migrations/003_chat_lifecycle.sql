alter table public.chats
  add column if not exists status text;

update public.chats
set status = coalesce(status, 'active')
where status is null;

alter table public.chats
  alter column status set default 'active';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chats_status_check'
  ) then
    alter table public.chats
      add constraint chats_status_check
      check (status in ('active', 'archived'));
  end if;
end;
$$;

alter table public.chats
  alter column status set not null;

alter table public.chats
  add column if not exists updated_at timestamptz not null default now();

update public.chats
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

create index if not exists chats_user_status_idx
  on public.chats (user_id, status, updated_at desc);
