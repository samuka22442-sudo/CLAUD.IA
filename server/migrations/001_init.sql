-- Ritmo: esquema inicial.
-- Convenções:
--   * IDs das entidades (uuid) são gerados no cliente: isso torna as gravações idempotentes
--     e permite criar itens offline.
--   * Toda linha pertence a um usuário (direta ou indiretamente) e some junto com ele (on delete cascade).
--   * Colunas `date` guardam datas de calendário (sem fuso); a API as entrega como texto 'YYYY-MM-DD'.

create table users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null,            -- sempre em minúsculas (normalizado pela API)
  password_hash text not null,            -- scrypt$N$r$p$salt$hash
  created_at    timestamptz not null default now()
);
create unique index users_email_key on users (email);

create table sessions (
  id          text primary key,           -- sha256 (hex) do token do cookie; o token em si nunca é guardado
  user_id     uuid not null references users (id) on delete cascade,
  remember    boolean not null default true,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now(),
  user_agent  text
);
create index sessions_user_id_idx on sessions (user_id);
create index sessions_expires_at_idx on sessions (expires_at);

create table habits (
  id          uuid primary key,
  user_id     uuid not null references users (id) on delete cascade,
  title       text not null,
  description text,
  icon        text not null,
  color       text not null,
  days        smallint[] not null,        -- 0 = domingo … 6 = sábado
  time_of_day text,                       -- 'HH:mm' (informativo)
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index habits_user_id_idx on habits (user_id);

-- Uma linha por dia concluído: marcar o mesmo hábito em dois aparelhos nunca conflita.
create table habit_completions (
  habit_id uuid not null references habits (id) on delete cascade,
  day      date not null,
  primary key (habit_id, day)
);

create table goals (
  id            uuid primary key,
  user_id       uuid not null references users (id) on delete cascade,
  title         text not null,
  description   text,
  category      text not null,
  icon          text not null,
  color         text not null,
  kind          text not null check (kind in ('numeric', 'checklist')),
  target_value  numeric,
  current_value numeric,
  unit          text,
  milestones    jsonb not null default '[]'::jsonb,   -- [{ id, title, done }]
  deadline      date,
  completed_at  date,
  archived      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index goals_user_id_idx on goals (user_id);

create table routines (
  id          uuid primary key,
  user_id     uuid not null references users (id) on delete cascade,
  title       text not null,
  icon        text not null,
  color       text not null,
  period      text not null,              -- morning | afternoon | evening | custom
  days        smallint[] not null,
  start_time  text not null,              -- 'HH:mm'
  steps       jsonb not null default '[]'::jsonb,     -- [{ id, title, minutes }]
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index routines_user_id_idx on routines (user_id);

-- Uma linha por passo concluído em um dia.
create table routine_runs (
  routine_id uuid not null references routines (id) on delete cascade,
  day        date not null,
  step_id    uuid not null,
  primary key (routine_id, day, step_id)
);
