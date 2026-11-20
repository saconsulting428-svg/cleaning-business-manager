-- Ascend: Shield & Sky — leaderboard + notification list (Supabase / Postgres)
-- Run this once in the Supabase SQL editor, then put the project URL + anon key into js/config.js

create table if not exists players (
  id uuid primary key,
  name text not null check (char_length(name) between 2 and 16),
  email text,                                   -- only stored when the player ticked "notify me"
  notify_consent boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists scores (
  id bigint generated always as identity primary key,
  player_id uuid not null references players(id) on delete cascade,
  mode text not null check (mode in ('endless','journey')),
  score int not null check (score between 0 and 1000000),   -- endless: meters, journey: total stars
  level int,
  created_at timestamptz not null default now()
);
create index if not exists scores_mode_score on scores(mode, score desc);

alter table players enable row level security;
alter table scores  enable row level security;
-- The game (anon key) may register/update a profile and add scores, but can NEVER read players (so emails stay private).
create policy "register"       on players for insert to anon with check (true);
create policy "update profile" on players for update to anon using (true) with check (true);
create policy "submit score"   on scores  for insert to anon with check (true);

-- Public leaderboard: names + best score only (no emails, no ids)
create or replace view leaderboard as
  select p.name, s.mode, max(s.score) as score
  from scores s join players p on p.id = s.player_id
  group by p.id, p.name, s.mode;
grant select on leaderboard to anon;

-- To e-mail / push players use the service-role key from YOUR server only (never ship it in the app):
--   select email from players where notify_consent and email is not null;
-- Scores are sent by the client, so a determined cheater can fake them: for a serious launch validate in an Edge Function.
