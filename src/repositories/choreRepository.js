import { supabase } from "../services/supabase.js";


/*
 * 家事グループ一覧
 */
export async function listChoreGroups(householdId) {
  const { data, error } = await supabase
    .from("chore_groups")
    .select(`
      id,
      household_id,
      name,
      sort_order,
      created_at
    `)
    .eq("household_id", householdId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(
      `家事グループの取得に失敗しました: ${error.message}`
    );
  }

  return (data ?? []).map((group) => ({
    id: group.id,
    householdId: group.household_id,
    name: group.name,
    sortOrder: group.sort_order,
    createdAt: group.created_at,
  }));
}


/*
 * 有効な家事タスク一覧
 */
export async function listActiveChoreTasks(
  householdId
) {
  const { data, error } = await supabase
    .from("chore_tasks")
    .select(`
      id,
      household_id,
      group_id,
      name,
      sort_order,
      is_active,
      created_at,
      updated_at
    `)
    .eq("household_id", householdId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(
      `家事タスクの取得に失敗しました: ${error.message}`
    );
  }

  return (data ?? []).map((task) => ({
    id: task.id,
    householdId: task.household_id,
    groupId: task.group_id,
    name: task.name,
    sortOrder: task.sort_order,
    isActive: task.is_active,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  }));
}


/*
 * 家事タスク登録
 */
export async function createChoreTask({
  householdId,
  groupId,
  name,
  sortOrder,
}) {
  const { error } = await supabase
    .from("chore_tasks")
    .insert({
      household_id: householdId,
      group_id: groupId,
      name,
      sort_order: sortOrder,
      is_active: true,
    });

  if (error) {
    throw new Error(
      `家事タスクの登録に失敗しました: ${error.message}`
    );
  }
}


/*
 * 家事タスク更新
 */
export async function updateChoreTask({
  householdId,
  taskId,
  groupId,
  name,
  sortOrder,
}) {
  const { error } = await supabase
    .from("chore_tasks")
    .update({
      group_id: groupId,
      name,
      sort_order: sortOrder,
      updated_at: new Date().toISOString(),
    })
    .eq("household_id", householdId)
    .eq("id", taskId);

  if (error) {
    throw new Error(
      `家事タスクの更新に失敗しました: ${error.message}`
    );
  }
}


/*
 * 家事タスク論理削除
 */
export async function deactivateChoreTask({
  householdId,
  taskId,
}) {
  const { error } = await supabase
    .from("chore_tasks")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("household_id", householdId)
    .eq("id", taskId);

  if (error) {
    throw new Error(
      `家事タスクの削除に失敗しました: ${error.message}`
    );
  }
}


/*
 * 指定した週の当番期間を取得
 */
export async function findChorePeriodByStartDate(
  householdId,
  startDate
) {
  const { data, error } = await supabase
    .from("chore_periods")
    .select(`
      id,
      household_id,
      start_date,
      end_date,
      group_a_member_id,
      group_b_member_id,
      created_at
    `)
    .eq("household_id", householdId)
    .eq("start_date", startDate)
    .maybeSingle();

  if (error) {
    throw new Error(
      `当番期間の取得に失敗しました: ${error.message}`
    );
  }

  if (!data) {
    return null;
  }

  return mapChorePeriod(data);
}


/*
 * 現在の週より前で、最も新しい当番期間を取得
 */
export async function findLatestChorePeriodBefore(
  householdId,
  startDate
) {
  const { data, error } = await supabase
    .from("chore_periods")
    .select(`
      id,
      household_id,
      start_date,
      end_date,
      group_a_member_id,
      group_b_member_id,
      created_at
    `)
    .eq("household_id", householdId)
    .lt("start_date", startDate)
    .order("start_date", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `過去の当番期間の取得に失敗しました: ${error.message}`
    );
  }

  if (!data) {
    return null;
  }

  return mapChorePeriod(data);
}


/*
 * 当番期間登録
 */
export async function createChorePeriod({
  householdId,
  startDate,
  endDate,
  groupAMemberId,
  groupBMemberId,
}) {
  const { data, error } = await supabase
    .from("chore_periods")
    .insert({
      household_id: householdId,
      start_date: startDate,
      end_date: endDate,
      group_a_member_id: groupAMemberId,
      group_b_member_id: groupBMemberId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `当番期間の登録に失敗しました: ${error.message}`
    );
  }

  return mapChorePeriod(data);
}


/*
 * 当番期間の担当者を更新
 */
export async function updateChorePeriodAssignments({
  householdId,
  periodId,
  groupAMemberId,
  groupBMemberId,
}) {
  const { error } = await supabase
    .from("chore_periods")
    .update({
      group_a_member_id: groupAMemberId,
      group_b_member_id: groupBMemberId,
    })
    .eq("household_id", householdId)
    .eq("id", periodId);

  if (error) {
    throw new Error(
      `当番担当者の更新に失敗しました: ${error.message}`
    );
  }
}


/*
 * 当番期間内のタスク一覧
 */
export async function listChorePeriodTasks(periodId) {
  const { data, error } = await supabase
    .from("chore_period_tasks")
    .select(`
      id,
      period_id,
      chore_task_id,
      task_name_snapshot,
      assignee_member_id,
      status,
      completed_at,
      created_at,
      updated_at,
      chore_tasks (
        id,
        group_id,
        name,
        is_active
      ),
      household_members (
        id,
        display_name
      )
    `)
    .eq("period_id", periodId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `当番タスクの取得に失敗しました: ${error.message}`
    );
  }

  return (data ?? []).map((task) => ({
    id: task.id,
    periodId: task.period_id,
    choreTaskId: task.chore_task_id,
    taskNameSnapshot: task.task_name_snapshot,
    assigneeMemberId: task.assignee_member_id,
    assigneeName:
      task.household_members?.display_name ?? "不明",
    status: task.status,
    completedAt: task.completed_at,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    groupId: task.chore_tasks?.group_id ?? null,
    isActive:
      task.chore_tasks?.is_active ?? false,
  }));
}


/*
 * 当番期間のタスクをまとめて登録
 */
export async function createChorePeriodTasks(
  periodId,
  tasks
) {
  if (tasks.length === 0) {
    return;
  }

  const rows = tasks.map((task) => ({
    period_id: periodId,
    chore_task_id: task.choreTaskId,
    task_name_snapshot: task.taskNameSnapshot,
    assignee_member_id: task.assigneeMemberId,
    status: "pending",
    completed_at: null,
  }));

  const { error } = await supabase
    .from("chore_period_tasks")
    .insert(rows);

  if (error) {
    throw new Error(
      `当番タスクの作成に失敗しました: ${error.message}`
    );
  }
}


/*
 * 当番タスクの状態変更
 */
export async function updateChorePeriodTaskStatus({
  periodTaskId,
  status,
}) {
  if (
    status !== "pending" &&
    status !== "done"
  ) {
    throw new Error(
      "不正な家事ステータスです。"
    );
  }

  const completedAt =
    status === "done"
      ? new Date().toISOString()
      : null;

  const { error } = await supabase
    .from("chore_period_tasks")
    .update({
      status,
      completed_at: completedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", periodTaskId);

  if (error) {
    throw new Error(
      `家事ステータスの更新に失敗しました: ${error.message}`
    );
  }
}


/*
 * 当番タスクの担当者変更＋未対応へのリセット
 */
export async function resetChorePeriodTask({
  periodTaskId,
  assigneeMemberId,
}) {
  const { error } = await supabase
    .from("chore_period_tasks")
    .update({
      assignee_member_id: assigneeMemberId,
      status: "pending",
      completed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", periodTaskId);

  if (error) {
    throw new Error(
      `当番タスクのリセットに失敗しました: ${error.message}`
    );
  }
}


/*
 * 当番期間のマッピング
 */
function mapChorePeriod(row) {
  return {
    id: row.id,
    householdId: row.household_id,
    startDate: row.start_date,
    endDate: row.end_date,
    groupAMemberId:
      row.group_a_member_id,
    groupBMemberId:
      row.group_b_member_id,
    createdAt: row.created_at,
  };
}

/*
 * 当番期間タスクの担当者・タスク名を更新
 */
export async function updateChorePeriodTask({
  periodTaskId,
  taskNameSnapshot,
  assigneeMemberId,
}) {
  const { error } = await supabase
    .from("chore_period_tasks")
    .update({
      task_name_snapshot: taskNameSnapshot,
      assignee_member_id: assigneeMemberId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", periodTaskId);

  if (error) {
    throw new Error(
      `当番タスクの更新に失敗しました: ${error.message}`
    );
  }
}