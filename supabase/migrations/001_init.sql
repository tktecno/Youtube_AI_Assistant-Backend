create extension if not exists vector;
create extension if not exists pgcrypto;

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

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  youtube_id text not null unique,
  processed boolean not null default false,
  source_language text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.embeddings (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  content text not null,
  embedding vector(1536) not null,
  time_stamp text not null,
  chunk_hash text not null,
  created_at timestamptz not null default now(),
  unique (video_id, chunk_hash)
);

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists videos_youtube_id_idx on public.videos (youtube_id);
create index if not exists chats_video_id_idx on public.chats (video_id);
create index if not exists chats_user_id_idx on public.chats (user_id, created_at desc);
create index if not exists chats_user_status_idx on public.chats (user_id, status, updated_at desc);
create index if not exists messages_chat_id_idx on public.messages (chat_id, created_at);
create index if not exists embeddings_video_id_idx on public.embeddings (video_id);
create index if not exists embeddings_embedding_idx
  on public.embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

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

create or replace function public.match_video_embeddings(
  filter_video_id uuid,
  query_embedding vector(1536),
  match_count int default 4
)
returns table (
  id uuid,
  video_id uuid,
  content text,
  time_stamp text,
  similarity float
)
language sql
stable
as $$
  select
    embeddings.id,
    embeddings.video_id,
    embeddings.content,
    embeddings.time_stamp,
    1 - (embeddings.embedding <=> query_embedding) as similarity
  from public.embeddings
  where embeddings.video_id = filter_video_id
  order by embeddings.embedding <=> query_embedding
  limit match_count;
$$;
