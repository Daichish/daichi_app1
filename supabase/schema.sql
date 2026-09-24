-- ==========================================
-- 1. households
-- ==========================================

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);


-- ==========================================
-- 2. household_members
-- ==========================================

create table public.household_members (
  id uuid primary key default gen_random_uuid(),

  household_id uuid not null
    references public.households(id)
    on delete cascade,

  auth_user_id uuid not null
    references auth.users(id)
    on delete cascade,

  display_name text not null,

  created_at timestamptz not null default now(),

  unique (household_id, auth_user_id)
);


-- ==========================================
-- 3. expenses
-- ==========================================

create table public.expenses (
  id uuid primary key default gen_random_uuid(),

  household_id uuid not null
    references public.households(id)
    on delete cascade,

  occurred_at timestamptz not null,

  item_name text not null,

  payer_member_id uuid not null
    references public.household_members(id),

  amount integer not null
    check (amount >= 1),

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);


-- ==========================================
-- 4. chore_groups
-- ==========================================

create table public.chore_groups (
  id uuid primary key default gen_random_uuid(),

  household_id uuid not null
    references public.households(id)
    on delete cascade,

  name text not null,

  sort_order integer not null default 0
    check (sort_order >= 0),

  created_at timestamptz not null default now()
);


-- ==========================================
-- 5. chore_tasks
-- ==========================================

create table public.chore_tasks (
  id uuid primary key default gen_random_uuid(),

  household_id uuid not null
    references public.households(id)
    on delete cascade,

  group_id uuid not null
    references public.chore_groups(id),

  name text not null,

  sort_order integer not null default 0
    check (sort_order >= 0),

  is_active boolean not null default true,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);


-- ==========================================
-- 6. chore_periods
-- ==========================================

create table public.chore_periods (
  id uuid primary key default gen_random_uuid(),

  household_id uuid not null
    references public.households(id)
    on delete cascade,

  start_date date not null,

  end_date date not null,

  group_a_member_id uuid not null
    references public.household_members(id),

  group_b_member_id uuid not null
    references public.household_members(id),

  created_at timestamptz not null default now(),

  check (start_date <= end_date)
);


-- ==========================================
-- 7. chore_period_tasks
-- ==========================================

create table public.chore_period_tasks (
  id uuid primary key default gen_random_uuid(),

  period_id uuid not null
    references public.chore_periods(id)
    on delete cascade,

  chore_task_id uuid not null
    references public.chore_tasks(id),

  task_name_snapshot text not null,

  assignee_member_id uuid not null
    references public.household_members(id),

  status text not null default 'pending'
    check (status in ('pending', 'done')),

  completed_at timestamptz,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);