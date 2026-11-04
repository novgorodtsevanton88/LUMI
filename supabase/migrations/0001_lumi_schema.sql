-- LUMI — початкова схема бази даних (Фаза 0)
-- PostgreSQL 15+ / Supabase. Усі дані дитини доступні лише членам її сім'ї (RLS).
-- Ідентифікатори генерує клієнт (UUIDv7), default — запасний варіант.

create extension if not exists pgcrypto;
create extension if not exists citext;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Типи
-- ---------------------------------------------------------------------------
create type public.child_sex as enum ('female', 'male');
create type public.family_role as enum ('owner', 'member');
create type public.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
create type public.sleep_kind as enum ('nap', 'night');
create type public.entry_source as enum ('timer', 'manual');
create type public.vaccination_status as enum ('planned', 'reminder', 'done', 'postponed', 'missed');
create type public.activity_status as enum ('done', 'postponed');
create type public.theme_mode as enum ('system', 'light', 'dark');
create type public.measure_position as enum ('lying', 'standing');

-- ---------------------------------------------------------------------------
-- Службові тригерні функції
-- ---------------------------------------------------------------------------
create sequence public.sync_seq;
grant usage on sequence public.sync_seq to authenticated;

-- Сервер сам ставить updated_at, server_seq і version; клієнт передає client_updated_at.
-- Застарілі оновлення (client_updated_at не новіший) мовчки відкидаються:
-- новіші дані ніколи не перезаписуються старими.
create or replace function private.sync_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.version := 1;
  else
    if new.client_updated_at <= old.client_updated_at then
      return null;  -- застаріла зміна, рядок не чіпаємо
    end if;
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.version := old.version + 1;
  end if;
  new.updated_at := now();
  new.server_seq := nextval('public.sync_seq');
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

-- child_id запису не можна змінити після створення
create or replace function private.lock_child_id()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.child_id is distinct from old.child_id then
    raise exception 'child_id is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Користувачі
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  timezone text not null default 'Europe/Kyiv',
  locale text not null default 'uk',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme public.theme_mode not null default 'system',
  active_child_id uuid,
  notifications jsonb not null default '{"push": false, "offsets_days": [7, 3, 1, 0]}',
  last_sound jsonb,
  updated_at timestamptz not null default now()
);

-- профіль і налаштування створюються автоматично під час реєстрації
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.user_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Діти та сім'я
-- ---------------------------------------------------------------------------
create table public.children (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  birth_date date not null check (birth_date > date '2015-01-01'),
  birth_time time,                       -- якщо відомий точний час
  birth_timezone text not null default 'Europe/Kyiv',
  sex public.child_sex not null,
  gestational_age_weeks smallint check (gestational_age_weeks between 22 and 44),
  photo_path text,                       -- шлях у приватному бакеті child-media
  updated_by uuid,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_seq bigint not null default 0,
  version integer not null default 1,
  deleted_at timestamptz
);
create index children_created_by_idx on public.children (created_by);
create index children_server_seq_idx on public.children (server_seq);

create table public.family_members (
  child_id uuid not null references public.children (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.family_role not null,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (child_id, user_id)
);
create index family_members_user_idx on public.family_members (user_id, child_id);
create unique index family_members_one_owner on public.family_members (child_id) where role = 'owner';

create table public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  email citext not null,
  token_hash text not null unique,      -- sha256 від токена з листа; сам токен не зберігаємо
  invited_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index family_invitations_child_idx on public.family_invitations (child_id);
create unique index family_invitations_one_pending
  on public.family_invitations (child_id, email) where status = 'pending';

-- Перевірки доступу. SECURITY DEFINER, щоб не впиратися в RLS family_members
-- і не отримати рекурсію політик. Схема private не відкрита через API.
-- Повертають множину, тож у політиці `child_id in (select ...)` рахується один раз на запит.
create or replace function private.my_child_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select fm.child_id from public.family_members fm
  where fm.user_id = (select auth.uid());
$$;

create or replace function private.my_owned_child_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select fm.child_id from public.family_members fm
  where fm.user_id = (select auth.uid()) and fm.role = 'owner';
$$;

revoke execute on function private.my_child_ids() from public, anon;
revoke execute on function private.my_owned_child_ids() from public, anon;
grant execute on function private.my_child_ids() to authenticated;
grant execute on function private.my_owned_child_ids() to authenticated;

-- творець дитини автоматично стає власником
create or replace function private.add_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.family_members (child_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

create trigger children_add_owner
  after insert on public.children
  for each row execute function private.add_owner_membership();

create trigger children_sync before insert or update on public.children
  for each row execute function private.sync_row();

-- Прийняття запрошення: токен із листа + email поточного користувача мають збігтися.
create or replace function public.accept_family_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv public.family_invitations;
  v_uid uuid := (select auth.uid());
  v_email text := (select auth.jwt() ->> 'email');
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into v_inv from public.family_invitations
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;

  if not found or v_inv.status <> 'pending' or v_inv.expires_at < now() then
    raise exception 'invitation invalid or expired' using errcode = 'P0002';
  end if;
  if lower(v_inv.email::text) <> lower(coalesce(v_email, '')) then
    raise exception 'invitation is for another email' using errcode = '42501';
  end if;

  insert into public.family_members (child_id, user_id, role, invited_by)
  values (v_inv.child_id, v_uid, 'member', v_inv.invited_by)
  on conflict do nothing;

  update public.family_invitations
  set status = 'accepted', accepted_by = v_uid
  where id = v_inv.id;

  return v_inv.child_id;
end;
$$;

revoke execute on function public.accept_family_invitation(text) from public, anon;
grant execute on function public.accept_family_invitation(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Макрос для таблиць, прив'язаних до дитини: однакові службові колонки
-- (id, child_id, created_by, updated_by, client_updated_at, created_at,
--  updated_at, server_seq, version, deleted_at)
-- ---------------------------------------------------------------------------

-- Сон
create table public.sleep_sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  kind public.sleep_kind not null,
  started_at timestamptz not null,
  ended_at timestamptz,                  -- null = сон триває
  source public.entry_source not null default 'timer',
  wake_reason text check (char_length(wake_reason) <= 120),
  comment text check (char_length(comment) <= 1000),
  created_by uuid not null default auth.uid() references auth.users (id),
  updated_by uuid,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_seq bigint not null default 0,
  version integer not null default 1,
  deleted_at timestamptz,
  constraint sleep_end_after_start check (ended_at is null or ended_at > started_at),
  constraint sleep_max_duration check (ended_at is null or ended_at - started_at <= interval '20 hours')
);
-- не більше одного активного сну на дитину
create unique index sleep_one_active_per_child
  on public.sleep_sessions (child_id) where ended_at is null and deleted_at is null;
create index sleep_child_started_idx on public.sleep_sessions (child_id, started_at desc) where deleted_at is null;
create index sleep_server_seq_idx on public.sleep_sessions (child_id, server_seq);

create table public.sleep_settings (
  child_id uuid primary key references public.children (id) on delete cascade,
  typical_bedtime time,
  typical_wake_time time,
  preferred_nap_count smallint check (preferred_nap_count between 0 and 6),
  prediction_enabled boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users (id),
  updated_by uuid,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_seq bigint not null default 0,
  version integer not null default 1,
  deleted_at timestamptz
);

-- Журнал прогнозів: для пояснення рекомендацій і оцінки точності алгоритму
create table public.sleep_predictions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  generated_at timestamptz not null,
  algorithm_version text not null,
  predicted_start timestamptz,
  window_start timestamptz,
  window_end timestamptz,
  prep_at timestamptz,
  expected_duration_min smallint check (expected_duration_min between 5 and 900),
  confidence text not null check (confidence in ('low', 'medium', 'high', 'insufficient_data')),
  reasons jsonb not null default '[]',
  actual_session_id uuid references public.sleep_sessions (id) on delete set null,
  created_by uuid not null default auth.uid() references auth.users (id),
  updated_by uuid,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_seq bigint not null default 0,
  version integer not null default 1,
  deleted_at timestamptz,
  constraint prediction_window check (window_start is null or window_end is null or window_end >= window_start)
);
create index sleep_predictions_child_idx on public.sleep_predictions (child_id, generated_at desc);
create index sleep_predictions_session_idx on public.sleep_predictions (actual_session_id);

-- Фізичний розвиток (цілі числа: грами та міліметри — без похибок float)
create table public.growth_measurements (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  measured_on date not null,
  weight_g integer check (weight_g between 300 and 40000),
  length_mm integer check (length_mm between 200 and 1400),
  head_mm integer check (head_mm between 200 and 650),
  position public.measure_position,      -- лежачи до 2 років, стоячи після (методика ВООЗ)
  comment text check (char_length(comment) <= 500),
  created_by uuid not null default auth.uid() references auth.users (id),
  updated_by uuid,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_seq bigint not null default 0,
  version integer not null default 1,
  deleted_at timestamptz,
  constraint measurement_has_value check (num_nonnulls(weight_g, length_mm, head_mm) > 0)
);
create index growth_child_date_idx on public.growth_measurements (child_id, measured_on desc) where deleted_at is null;

-- Інші записи здоров'я: температура, самопочуття
create table public.health_logs (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  kind text not null check (kind in ('temperature', 'wellbeing')),
  occurred_at timestamptz not null,
  temperature_c numeric(3, 1) check (temperature_c between 34.0 and 43.0),
  wellbeing text check (char_length(wellbeing) <= 200),
  comment text check (char_length(comment) <= 1000),
  created_by uuid not null default auth.uid() references auth.users (id),
  updated_by uuid,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_seq bigint not null default 0,
  version integer not null default 1,
  deleted_at timestamptz,
  constraint temperature_value check (kind <> 'temperature' or temperature_c is not null)
);
create index health_logs_child_idx on public.health_logs (child_id, occurred_at desc) where deleted_at is null;

-- Довідник: офіційний календар щеплень (читається всіма автентифікованими)
create table public.vaccination_schedule (
  id uuid primary key default gen_random_uuid(),
  schedule_code text not null,           -- напр. 'UA-MOZ-2026'
  source_title text not null,
  source_url text not null,
  effective_from date not null,
  verified_at date not null,
  antigen_code text not null,            -- 'HepB', 'DTP', 'IPV', 'Hib', 'MMR', 'BCG'
  disease_uk text not null,
  dose_label text not null,              -- '1-а доза', 'ревакцинація'
  dose_number smallint not null,
  age_days integer,                      -- для БЦЖ (доба життя)
  age_months smallint,
  notes_uk text,
  is_mandatory boolean not null default true,
  sort_order smallint not null,
  unique (schedule_code, antigen_code, dose_number)
);

create table public.vaccinations (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  schedule_item_id uuid references public.vaccination_schedule (id) on delete set null,
  vaccine_name text not null check (char_length(vaccine_name) <= 120),
  disease_uk text check (char_length(disease_uk) <= 200),
  recommended_age_label text,
  planned_date date,
  actual_date date,
  status public.vaccination_status not null default 'planned',
  adjusted_by_doctor boolean not null default false,
  manufacturer text check (char_length(manufacturer) <= 120),
  lot_number text check (char_length(lot_number) <= 60),
  note text check (char_length(note) <= 1000),
  created_by uuid not null default auth.uid() references auth.users (id),
  updated_by uuid,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_seq bigint not null default 0,
  version integer not null default 1,
  deleted_at timestamptz,
  constraint done_has_date check (status <> 'done' or actual_date is not null)
);
create index vaccinations_child_idx on public.vaccinations (child_id, planned_date) where deleted_at is null;
create index vaccinations_schedule_item_idx on public.vaccinations (schedule_item_id);
create unique index vaccinations_one_per_schedule_item
  on public.vaccinations (child_id, schedule_item_id) where schedule_item_id is not null and deleted_at is null;

create table public.doctor_appointments (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  doctor_name text not null check (char_length(doctor_name) <= 120),
  specialty text check (char_length(specialty) <= 80),
  starts_at timestamptz not null,
  address text check (char_length(address) <= 300),
  phone text check (char_length(phone) <= 40),
  reason text check (char_length(reason) <= 500),
  notes text check (char_length(notes) <= 2000),
  outcome text check (char_length(outcome) <= 4000),
  created_by uuid not null default auth.uid() references auth.users (id),
  updated_by uuid,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_seq bigint not null default 0,
  version integer not null default 1,
  deleted_at timestamptz
);
create index doctor_appointments_child_idx on public.doctor_appointments (child_id, starts_at) where deleted_at is null;

-- Ліки: дозування — лише текст, як призначив лікар; застосунок нічого не розраховує
create table public.medication_plans (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  name text not null check (char_length(name) <= 120),
  prescribed_dosage text not null check (char_length(prescribed_dosage) <= 200),
  start_date date not null,
  end_date date,
  schedule_times time[] not null default '{}',   -- час прийомів протягом доби
  reminders_enabled boolean not null default true,
  notes text check (char_length(notes) <= 2000),
  created_by uuid not null default auth.uid() references auth.users (id),
  updated_by uuid,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_seq bigint not null default 0,
  version integer not null default 1,
  deleted_at timestamptz,
  constraint medication_dates check (end_date is null or end_date >= start_date)
);
create index medication_plans_child_idx on public.medication_plans (child_id, start_date) where deleted_at is null;

create table public.medication_logs (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  plan_id uuid references public.medication_plans (id) on delete set null,
  medication_name text not null check (char_length(medication_name) <= 120),
  taken_at timestamptz not null,
  dosage_text text check (char_length(dosage_text) <= 200),
  note text check (char_length(note) <= 1000),
  created_by uuid not null default auth.uid() references auth.users (id),
  updated_by uuid,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_seq bigint not null default 0,
  version integer not null default 1,
  deleted_at timestamptz
);
create index medication_logs_child_idx on public.medication_logs (child_id, taken_at desc) where deleted_at is null;
create index medication_logs_plan_idx on public.medication_logs (plan_id);

-- Нагадування: про будь-яку подію або власні
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  title text not null check (char_length(title) <= 160),
  entity_type text check (entity_type in ('vaccination', 'appointment', 'medication', 'measurement', 'custom')),
  entity_id uuid,
  fire_at timestamptz not null,
  offset_days smallint check (offset_days between 0 and 30),
  sent_at timestamptz,
  is_done boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users (id),
  updated_by uuid,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_seq bigint not null default 0,
  version integer not null default 1,
  deleted_at timestamptz
);
create index reminders_child_idx on public.reminders (child_id, fire_at) where deleted_at is null;
-- для розсилки: лише невідправлені
create index reminders_due_idx on public.reminders (fire_at) where sent_at is null and deleted_at is null and is_done = false;

-- Довідник: етапи розвитку (CDC/AAP 2022 + ВООЗ для моторики)
create table public.development_milestones (
  id uuid primary key default gen_random_uuid(),
  source_code text not null,             -- 'CDC-LTSAE-2022', 'WHO-MGRS-2006'
  source_url text not null,
  checklist_age_months smallint not null check (checklist_age_months between 0 and 60),
  domain text not null check (domain in ('motor', 'language', 'social', 'cognitive', 'sensory')),
  title_uk text not null,
  examples_uk text,
  activity_ideas_uk text,
  sort_order smallint not null
);
create index development_milestones_age_idx on public.development_milestones (checklist_age_months, domain);

-- Довідник: розвивальні активності
create table public.development_activities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_uk text not null,
  min_age_months smallint not null,
  max_age_months smallint not null,
  duration_min smallint not null check (duration_min between 1 and 60),
  area text not null check (area in ('speech', 'fine_motor', 'gross_motor', 'sensory', 'coordination', 'memory', 'attention', 'social')),
  goal_uk text not null,
  materials_uk text,
  instructions_uk text not null,
  easier_uk text,
  harder_uk text,
  check (max_age_months >= min_age_months)
);
create index development_activities_age_idx on public.development_activities (min_age_months, max_age_months);

create table public.completed_activities (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  activity_id uuid not null references public.development_activities (id) on delete restrict,
  status public.activity_status not null,
  for_date date not null,
  is_favorite boolean not null default false,
  note text check (char_length(note) <= 1000),
  created_by uuid not null default auth.uid() references auth.users (id),
  updated_by uuid,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_seq bigint not null default 0,
  version integer not null default 1,
  deleted_at timestamptz
);
create index completed_activities_child_idx on public.completed_activities (child_id, for_date desc) where deleted_at is null;
create index completed_activities_activity_idx on public.completed_activities (activity_id);

-- Досягнення: відмітка етапу розвитку або власна подія (перший зуб, перші кроки)
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  milestone_id uuid references public.development_milestones (id) on delete set null,
  kind text not null check (kind in ('milestone', 'first_tooth', 'first_steps', 'first_word', 'custom')),
  title text not null check (char_length(title) <= 160),
  achieved_on date not null,
  note text check (char_length(note) <= 2000),
  media_path text,
  created_by uuid not null default auth.uid() references auth.users (id),
  updated_by uuid,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_seq bigint not null default 0,
  version integer not null default 1,
  deleted_at timestamptz
);
create index achievements_child_idx on public.achievements (child_id, achieved_on desc) where deleted_at is null;
create index achievements_milestone_idx on public.achievements (milestone_id);

-- Нотатки, щоденник, пам'ятні моменти, перші слова (з аудіо)
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  kind text not null default 'note' check (kind in ('note', 'diary', 'moment', 'first_word')),
  occurred_at timestamptz not null,
  title text check (char_length(title) <= 160),
  body text check (char_length(body) <= 10000),
  media_paths text[] not null default '{}',
  created_by uuid not null default auth.uid() references auth.users (id),
  updated_by uuid,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_seq bigint not null default 0,
  version integer not null default 1,
  deleted_at timestamptz
);
create index notes_child_idx on public.notes (child_id, occurred_at desc) where deleted_at is null;

-- Обрані звуки — особисті для користувача, не для дитини
create table public.audio_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text check (char_length(title) <= 60),
  sounds jsonb not null,                 -- [{"key":"pink","volume":0.6},{"key":"rain","volume":0.3}]
  created_at timestamptz not null default now(),
  unique (user_id, sounds)
);
create index audio_favorites_user_idx on public.audio_favorites (user_id);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_secret text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_success_at timestamptz
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Пристрої та стан синхронізації (діагностика «що і коли синхронізовано»)
create table public.sync_metadata (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  device_id uuid not null,
  device_label text,
  app_version text,
  last_push_at timestamptz,
  last_pull_seq bigint,
  last_error text,
  updated_at timestamptz not null default now(),
  primary key (user_id, device_id)
);

-- ---------------------------------------------------------------------------
-- Тригери синхронізації та захисту child_id для всіх таблиць дитини
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'sleep_sessions', 'sleep_settings', 'sleep_predictions', 'growth_measurements',
    'health_logs', 'vaccinations', 'doctor_appointments', 'medication_plans',
    'medication_logs', 'reminders', 'completed_activities', 'achievements', 'notes'
  ] loop
    execute format(
      'create trigger %1$s_sync before insert or update on public.%1$I
         for each row execute function private.sync_row()', t);
    execute format(
      'create trigger %1$s_lock_child before update on public.%1$I
         for each row execute function private.lock_child_id()', t);
    if t <> 'sleep_settings' then
      execute format('create index %1$s_seq_idx on public.%1$I (server_seq)', t);
    end if;
  end loop;
end;
$$;
create index sleep_settings_seq_idx on public.sleep_settings (server_seq);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.children enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invitations enable row level security;
alter table public.vaccination_schedule enable row level security;
alter table public.development_milestones enable row level security;
alter table public.development_activities enable row level security;
alter table public.audio_favorites enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.sync_metadata enable row level security;

-- особисті таблиці: лише власник рядка
create policy profiles_self on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy user_settings_self on public.user_settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy audio_favorites_self on public.audio_favorites for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy push_subscriptions_self on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy sync_metadata_self on public.sync_metadata for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- члени сім'ї бачать імена одне одного (для «хто додав запис»)
create policy profiles_family_read on public.profiles for select to authenticated
  using (exists (
    select 1 from public.family_members me
    join public.family_members other on other.child_id = me.child_id
    where me.user_id = (select auth.uid()) and other.user_id = profiles.id
  ));

-- довідники: лише читання
create policy vaccination_schedule_read on public.vaccination_schedule for select to authenticated using (true);
create policy development_milestones_read on public.development_milestones for select to authenticated using (true);
create policy development_activities_read on public.development_activities for select to authenticated using (true);

-- діти
create policy children_select on public.children for select to authenticated
  using (id in (select private.my_child_ids()) or created_by = (select auth.uid()));
create policy children_insert on public.children for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy children_update on public.children for update to authenticated
  using (id in (select private.my_child_ids())) with check (id in (select private.my_child_ids()));
create policy children_delete on public.children for delete to authenticated
  using (id in (select private.my_owned_child_ids()));

-- сім'я: бачать усі учасники; видаляє власник (відкликання) або сам учасник (вихід);
-- додавання — лише через тригер власника або accept_family_invitation()
create policy family_members_select on public.family_members for select to authenticated
  using (child_id in (select private.my_child_ids()));
create policy family_members_delete on public.family_members for delete to authenticated
  using (
    role = 'member'
    and (child_id in (select private.my_owned_child_ids()) or user_id = (select auth.uid()))
  );

-- запрошення: створює і бачить лише власник; лист надсилає Edge Function
create policy family_invitations_owner on public.family_invitations for all to authenticated
  using (child_id in (select private.my_owned_child_ids()))
  with check (child_id in (select private.my_owned_child_ids()) and invited_by = (select auth.uid()));

-- усі таблиці даних дитини: повний доступ для членів сім'ї, жорстке видалення — лише власник
do $$
declare
  t text;
begin
  foreach t in array array[
    'sleep_sessions', 'sleep_settings', 'sleep_predictions', 'growth_measurements',
    'health_logs', 'vaccinations', 'doctor_appointments', 'medication_plans',
    'medication_logs', 'reminders', 'completed_activities', 'achievements', 'notes'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %1$s_select on public.%1$I for select to authenticated
         using (child_id in (select private.my_child_ids()))', t);
    execute format(
      'create policy %1$s_insert on public.%1$I for insert to authenticated
         with check (child_id in (select private.my_child_ids()) and created_by = (select auth.uid()))', t);
    execute format(
      'create policy %1$s_update on public.%1$I for update to authenticated
         using (child_id in (select private.my_child_ids()))
         with check (child_id in (select private.my_child_ids()))', t);
    execute format(
      'create policy %1$s_delete on public.%1$I for delete to authenticated
         using (child_id in (select private.my_owned_child_ids()))', t);
  end loop;
end;
$$;

-- anon не має доступу ні до чого
revoke all on all tables in schema public from anon;

-- ---------------------------------------------------------------------------
-- Storage: приватний бакет child-media, шлях = '<child_id>/<uuid>.<ext>'
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('child-media', 'child-media', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'audio/mp4', 'audio/webm', 'audio/ogg'])
on conflict (id) do nothing;

create or replace function private.storage_child_id(p_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return (storage.foldername(p_name))[1]::uuid;
exception when others then
  return null;
end;
$$;
grant execute on function private.storage_child_id(text) to authenticated;

create policy child_media_read on storage.objects for select to authenticated
  using (bucket_id = 'child-media' and private.storage_child_id(name) in (select private.my_child_ids()));
create policy child_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'child-media' and private.storage_child_id(name) in (select private.my_child_ids()));
create policy child_media_update on storage.objects for update to authenticated
  using (bucket_id = 'child-media' and private.storage_child_id(name) in (select private.my_child_ids()));
create policy child_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'child-media' and private.storage_child_id(name) in (select private.my_child_ids()));
