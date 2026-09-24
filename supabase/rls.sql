/*
 * =========================================
 * Phase 3-7
 * RLS（世帯ごとのデータ分離）
 * =========================================
 */


/*
 * -----------------------------------------
 * 1. 世帯所属を判定する関数
 * -----------------------------------------
 */

create schema if not exists private;


create or replace function private.is_household_member(
  p_household_id uuid
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = p_household_id
      and auth_user_id = (select auth.uid())
  );
$$;


/*
 * 関数を一般公開しない
 */
revoke execute
on function private.is_household_member(uuid)
from public;


/*
 * authenticatedユーザーだけが
 * RLS内部からこの関数を利用できるようにする
 */
grant usage
on schema private
to authenticated;


grant execute
on function private.is_household_member(uuid)
to authenticated;



/*
 * -----------------------------------------
 * 2. RLSを有効化
 * -----------------------------------------
 */

alter table public.households
enable row level security;

alter table public.household_members
enable row level security;

alter table public.expenses
enable row level security;

alter table public.chore_groups
enable row level security;

alter table public.chore_tasks
enable row level security;

alter table public.chore_periods
enable row level security;

alter table public.chore_period_tasks
enable row level security;



/*
 * -----------------------------------------
 * 3. anonの権限を削除
 * -----------------------------------------
 */

revoke all
on table public.households
from anon;

revoke all
on table public.household_members
from anon;

revoke all
on table public.expenses
from anon;

revoke all
on table public.chore_groups
from anon;

revoke all
on table public.chore_tasks
from anon;

revoke all
on table public.chore_periods
from anon;

revoke all
on table public.chore_period_tasks
from anon;



/*
 * -----------------------------------------
 * 4. authenticatedの権限
 * -----------------------------------------
 */

revoke all
on table public.households
from authenticated;

grant select
on table public.households
to authenticated;


revoke all
on table public.household_members
from authenticated;

grant select
on table public.household_members
to authenticated;


revoke all
on table public.expenses
from authenticated;

grant select, insert, update, delete
on table public.expenses
to authenticated;


revoke all
on table public.chore_groups
from authenticated;

grant select, insert, update, delete
on table public.chore_groups
to authenticated;


revoke all
on table public.chore_tasks
from authenticated;

grant select, insert, update, delete
on table public.chore_tasks
to authenticated;


revoke all
on table public.chore_periods
from authenticated;

grant select, insert, update, delete
on table public.chore_periods
to authenticated;


revoke all
on table public.chore_period_tasks
from authenticated;

grant select, insert, update, delete
on table public.chore_period_tasks
to authenticated;



/*
 * =========================================
 * households
 * =========================================
 */

drop policy if exists "households_select_own" 
on public.households;


create policy "households_select_own"
on public.households
for select
to authenticated
using (
  private.is_household_member(id)
);



/*
 * =========================================
 * household_members
 * =========================================
 */

drop policy if exists "household_members_select_own_household"
on public.household_members;


create policy "household_members_select_own_household"
on public.household_members
for select
to authenticated
using (
  private.is_household_member(household_id)
);



/*
 * =========================================
 * expenses
 * =========================================
 */


/*
 * SELECT
 */
drop policy if exists "expenses_select_own_household"
on public.expenses;


create policy "expenses_select_own_household"
on public.expenses
for select
to authenticated
using (
  private.is_household_member(household_id)
);


/*
 * INSERT
 */
drop policy if exists "expenses_insert_own_household"
on public.expenses;


create policy "expenses_insert_own_household"
on public.expenses
for insert
to authenticated
with check (
  private.is_household_member(household_id)
  and exists (
    select 1
    from public.household_members
    where id = payer_member_id
      and household_id = expenses.household_id
  )
);


/*
 * UPDATE
 */
drop policy if exists "expenses_update_own_household"
on public.expenses;


create policy "expenses_update_own_household"
on public.expenses
for update
to authenticated
using (
  private.is_household_member(household_id)
)
with check (
  private.is_household_member(household_id)
  and exists (
    select 1
    from public.household_members
    where id = payer_member_id
      and household_id = expenses.household_id
  )
);


/*
 * DELETE
 */
drop policy if exists "expenses_delete_own_household"
on public.expenses;


create policy "expenses_delete_own_household"
on public.expenses
for delete
to authenticated
using (
  private.is_household_member(household_id)
);



/*
 * =========================================
 * chore_groups
 * =========================================
 */


/*
 * SELECT
 */
drop policy if exists "chore_groups_select_own_household"
on public.chore_groups;


create policy "chore_groups_select_own_household"
on public.chore_groups
for select
to authenticated
using (
  private.is_household_member(household_id)
);


/*
 * INSERT
 */
drop policy if exists "chore_groups_insert_own_household"
on public.chore_groups;


create policy "chore_groups_insert_own_household"
on public.chore_groups
for insert
to authenticated
with check (
  private.is_household_member(household_id)
);


/*
 * UPDATE
 */
drop policy if exists "chore_groups_update_own_household"
on public.chore_groups;


create policy "chore_groups_update_own_household"
on public.chore_groups
for update
to authenticated
using (
  private.is_household_member(household_id)
)
with check (
  private.is_household_member(household_id)
);


/*
 * DELETE
 */
drop policy if exists "chore_groups_delete_own_household"
on public.chore_groups;


create policy "chore_groups_delete_own_household"
on public.chore_groups
for delete
to authenticated
using (
  private.is_household_member(household_id)
);



/*
 * =========================================
 * chore_tasks
 * =========================================
 */


/*
 * SELECT
 */
drop policy if exists "chore_tasks_select_own_household"
on public.chore_tasks;


create policy "chore_tasks_select_own_household"
on public.chore_tasks
for select
to authenticated
using (
  private.is_household_member(household_id)
);


/*
 * INSERT
 */
drop policy if exists "chore_tasks_insert_own_household"
on public.chore_tasks;


create policy "chore_tasks_insert_own_household"
on public.chore_tasks
for insert
to authenticated
with check (
  private.is_household_member(household_id)
  and exists (
    select 1
    from public.chore_groups
    where id = group_id
      and household_id = chore_tasks.household_id
  )
);


/*
 * UPDATE
 */
drop policy if exists "chore_tasks_update_own_household"
on public.chore_tasks;


create policy "chore_tasks_update_own_household"
on public.chore_tasks
for update
to authenticated
using (
  private.is_household_member(household_id)
)
with check (
  private.is_household_member(household_id)
  and exists (
    select 1
    from public.chore_groups
    where id = group_id
      and household_id = chore_tasks.household_id
  )
);


/*
 * DELETE
 */
drop policy if exists "chore_tasks_delete_own_household"
on public.chore_tasks;


create policy "chore_tasks_delete_own_household"
on public.chore_tasks
for delete
to authenticated
using (
  private.is_household_member(household_id)
);



/*
 * =========================================
 * chore_periods
 * =========================================
 */


/*
 * SELECT
 */
drop policy if exists "chore_periods_select_own_household"
on public.chore_periods;


create policy "chore_periods_select_own_household"
on public.chore_periods
for select
to authenticated
using (
  private.is_household_member(household_id)
);


/*
 * INSERT
 */
drop policy if exists "chore_periods_insert_own_household"
on public.chore_periods;


create policy "chore_periods_insert_own_household"
on public.chore_periods
for insert
to authenticated
with check (
  private.is_household_member(household_id)

  and exists (
    select 1
    from public.household_members
    where id = group_a_member_id
      and household_id = chore_periods.household_id
  )

  and exists (
    select 1
    from public.household_members
    where id = group_b_member_id
      and household_id = chore_periods.household_id
  )
);


/*
 * UPDATE
 */
drop policy if exists "chore_periods_update_own_household"
on public.chore_periods;


create policy "chore_periods_update_own_household"
on public.chore_periods
for update
to authenticated
using (
  private.is_household_member(household_id)
)
with check (
  private.is_household_member(household_id)

  and exists (
    select 1
    from public.household_members
    where id = group_a_member_id
      and household_id = chore_periods.household_id
  )

  and exists (
    select 1
    from public.household_members
    where id = group_b_member_id
      and household_id = chore_periods.household_id
  )
);


/*
 * DELETE
 */
drop policy if exists "chore_periods_delete_own_household"
on public.chore_periods;


create policy "chore_periods_delete_own_household"
on public.chore_periods
for delete
to authenticated
using (
  private.is_household_member(household_id)
);



/*
 * =========================================
 * chore_period_tasks
 * =========================================
 */


/*
 * SELECT
 */
drop policy if exists "chore_period_tasks_select_own_household"
on public.chore_period_tasks;


create policy "chore_period_tasks_select_own_household"
on public.chore_period_tasks
for select
to authenticated
using (
  exists (
    select 1
    from public.chore_periods
    where id = chore_period_tasks.period_id
      and private.is_household_member(
        household_id
      )
  )
);


/*
 * INSERT
 */
drop policy if exists "chore_period_tasks_insert_own_household"
on public.chore_period_tasks;


create policy "chore_period_tasks_insert_own_household"
on public.chore_period_tasks
for insert
to authenticated
with check (

  /*
   * periodが自分の世帯
   */
  exists (
    select 1
    from public.chore_periods p
    where p.id = chore_period_tasks.period_id
      and private.is_household_member(
        p.household_id
      )
  )

  /*
   * taskも同じ世帯
   */
  and exists (
    select 1
    from public.chore_periods p
    join public.chore_tasks t
      on t.id = chore_period_tasks.chore_task_id
    where p.id = chore_period_tasks.period_id
      and t.household_id = p.household_id
  )

  /*
   * assigneeも同じ世帯
   */
  and exists (
    select 1
    from public.chore_periods p
    join public.household_members m
      on m.id = chore_period_tasks.assignee_member_id
    where p.id = chore_period_tasks.period_id
      and m.household_id = p.household_id
  )
);


/*
 * UPDATE
 */
drop policy if exists "chore_period_tasks_update_own_household"
on public.chore_period_tasks;


create policy "chore_period_tasks_update_own_household"
on public.chore_period_tasks
for update
to authenticated
using (
  exists (
    select 1
    from public.chore_periods
    where id = chore_period_tasks.period_id
      and private.is_household_member(
        household_id
      )
  )
)
with check (

  exists (
    select 1
    from public.chore_periods p
    where p.id = chore_period_tasks.period_id
      and private.is_household_member(
        p.household_id
      )
  )

  and exists (
    select 1
    from public.chore_periods p
    join public.chore_tasks t
      on t.id = chore_period_tasks.chore_task_id
    where p.id = chore_period_tasks.period_id
      and t.household_id = p.household_id
  )

  and exists (
    select 1
    from public.chore_periods p
    join public.household_members m
      on m.id = chore_period_tasks.assignee_member_id
    where p.id = chore_period_tasks.period_id
      and m.household_id = p.household_id
  )
);


/*
 * DELETE
 */
drop policy if exists "chore_period_tasks_delete_own_household"
on public.chore_period_tasks;


create policy "chore_period_tasks_delete_own_household"
on public.chore_period_tasks
for delete
to authenticated
using (
  exists (
    select 1
    from public.chore_periods
    where id = chore_period_tasks.period_id
      and private.is_household_member(
        household_id
      )
  )
);



/*
 * -----------------------------------------
 * 5. RLS用インデックス
 * -----------------------------------------
 */

create index if not exists household_members_auth_user_id_idx
on public.household_members(auth_user_id);

create index if not exists household_members_household_id_idx
on public.household_members(household_id);

create index if not exists expenses_household_id_idx
on public.expenses(household_id);

create index if not exists expenses_payer_member_id_idx
on public.expenses(payer_member_id);

create index if not exists chore_groups_household_id_idx
on public.chore_groups(household_id);

create index if not exists chore_tasks_household_id_idx
on public.chore_tasks(household_id);

create index if not exists chore_tasks_group_id_idx
on public.chore_tasks(group_id);

create index if not exists chore_periods_household_id_idx
on public.chore_periods(household_id);

create index if not exists chore_periods_start_date_idx
on public.chore_periods(household_id, start_date);

create index if not exists chore_period_tasks_period_id_idx
on public.chore_period_tasks(period_id);

create index if not exists chore_period_tasks_chore_task_id_idx
on public.chore_period_tasks(chore_task_id);

create index if not exists chore_period_tasks_assignee_member_id_idx
on public.chore_period_tasks(assignee_member_id);