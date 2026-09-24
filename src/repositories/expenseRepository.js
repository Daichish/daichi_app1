import { supabase } from "../services/supabase.js";


function mapExpense(row) {
  return {
    id: row.id,
    householdId: row.household_id,
    occurredAt: row.occurred_at,
    itemName: row.item_name,
    payerMemberId: row.payer_member_id,
    payerName: row.payer?.display_name ?? "不明",
    amount: row.amount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}


/*
 * 支出一覧を取得
 */
export async function listExpenses(
  householdId
) {
  const {
    data,
    error,
  } = await supabase
    .from("expenses")
    .select(`
      id,
      household_id,
      occurred_at,
      item_name,
      payer_member_id,
      amount,
      created_at,
      updated_at,
      payer:household_members (
        id,
        display_name
      )
    `)
    .eq("household_id", householdId)
    .order("occurred_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `支出一覧の取得に失敗しました: ${error.message}`
    );
  }

  return data.map(mapExpense);
}


/*
 * 支出1件を取得
 */
export async function getExpenseById(
  householdId,
  expenseId
) {
  const {
    data,
    error,
  } = await supabase
    .from("expenses")
    .select(`
      id,
      household_id,
      occurred_at,
      item_name,
      payer_member_id,
      amount,
      created_at,
      updated_at,
      payer:household_members (
        id,
        display_name
      )
    `)
    .eq("household_id", householdId)
    .eq("id", expenseId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `支出の取得に失敗しました: ${error.message}`
    );
  }

  if (!data) {
    return null;
  }

  return mapExpense(data);
}


/*
 * 支出を登録
 */
export async function createExpense({
  householdId,
  occurredAt,
  itemName,
  payerMemberId,
  amount,
}) {
  const {
    error,
  } = await supabase
    .from("expenses")
    .insert({
      household_id: householdId,
      occurred_at: occurredAt,
      item_name: itemName,
      payer_member_id: payerMemberId,
      amount,
    });

  if (error) {
    throw new Error(
      `支出の登録に失敗しました: ${error.message}`
    );
  }
}


/*
 * 支出を更新
 */
export async function updateExpense({
  householdId,
  expenseId,
  occurredAt,
  itemName,
  payerMemberId,
  amount,
}) {
  const {
    error,
  } = await supabase
    .from("expenses")
    .update({
      occurred_at: occurredAt,
      item_name: itemName,
      payer_member_id: payerMemberId,
      amount,
      updated_at: new Date().toISOString(),
    })
    .eq("household_id", householdId)
    .eq("id", expenseId);

  if (error) {
    throw new Error(
      `支出の更新に失敗しました: ${error.message}`
    );
  }
}


/*
 * 支出を削除
 */
export async function deleteExpense(
  householdId,
  expenseId
) {
  const {
    error,
  } = await supabase
    .from("expenses")
    .delete()
    .eq("household_id", householdId)
    .eq("id", expenseId);

  if (error) {
    throw new Error(
      `支出の削除に失敗しました: ${error.message}`
    );
  }
}