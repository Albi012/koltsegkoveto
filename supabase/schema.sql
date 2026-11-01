-- Költségkövető adatbázis séma
-- Futtasd le a Supabase projektben: SQL Editor → New query → beillesztés → Run.
-- Többször is lefuttatható.

create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount      numeric(14, 2) not null check (amount > 0),
  spent_on    date not null,
  category    text not null check (char_length(category) between 1 and 40),
  note        text not null default '' check (char_length(note) <= 120),
  created_at  timestamptz not null default now()
);

create index if not exists expenses_user_spent_on_idx
  on public.expenses (user_id, spent_on desc);

create table if not exists public.settings (
  user_id  uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  budget   numeric(14, 2) not null default 0 check (budget >= 0)
);

-- Sorszintű jogosultság: mindenki csak a saját adatait látja és módosíthatja.
alter table public.expenses enable row level security;
alter table public.settings enable row level security;

drop policy if exists "Saját kiadások" on public.expenses;
create policy "Saját kiadások" on public.expenses
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Saját beállítások" on public.settings;
create policy "Saját beállítások" on public.settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
