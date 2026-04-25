create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update
  set email = excluded.email,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_auth_user_created();

insert into public.profiles (id, email)
select id, email
from auth.users
on conflict (id) do update
set email = excluded.email,
    updated_at = now();

alter table public.chats
  add column if not exists user_id uuid references public.profiles(id) on delete cascade;

create index if not exists chats_user_id_idx on public.chats (user_id, created_at desc);
create index if not exists profiles_email_idx on public.profiles (email);

alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.embeddings enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "chats_select_own" on public.chats;
create policy "chats_select_own"
  on public.chats
  for select
  using (auth.uid() = user_id);

drop policy if exists "chats_insert_own" on public.chats;
create policy "chats_insert_own"
  on public.chats
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "chats_update_own" on public.chats;
create policy "chats_update_own"
  on public.chats
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "chats_delete_own" on public.chats;
create policy "chats_delete_own"
  on public.chats
  for delete
  using (auth.uid() = user_id);

drop policy if exists "messages_select_chat_owner" on public.messages;
create policy "messages_select_chat_owner"
  on public.messages
  for select
  using (
    exists (
      select 1
      from public.chats
      where chats.id = messages.chat_id
        and chats.user_id = auth.uid()
    )
  );

drop policy if exists "messages_insert_chat_owner" on public.messages;
create policy "messages_insert_chat_owner"
  on public.messages
  for insert
  with check (
    exists (
      select 1
      from public.chats
      where chats.id = messages.chat_id
        and chats.user_id = auth.uid()
    )
  );

drop policy if exists "messages_update_chat_owner" on public.messages;
create policy "messages_update_chat_owner"
  on public.messages
  for update
  using (
    exists (
      select 1
      from public.chats
      where chats.id = messages.chat_id
        and chats.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.chats
      where chats.id = messages.chat_id
        and chats.user_id = auth.uid()
    )
  );

drop policy if exists "messages_delete_chat_owner" on public.messages;
create policy "messages_delete_chat_owner"
  on public.messages
  for delete
  using (
    exists (
      select 1
      from public.chats
      where chats.id = messages.chat_id
        and chats.user_id = auth.uid()
    )
  );

do $$
begin
  if exists (select 1 from public.chats where user_id is null) then
    raise exception
      'Cannot enforce chat ownership yet because existing chats have NULL user_id. Delete or backfill those chats, then rerun the final ALTER TABLE step.';
  end if;
end;
$$;

alter table public.chats
  alter column user_id set not null;
