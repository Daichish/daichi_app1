import { supabase } from "../services/supabase.js";

export async function findHouseholdMemberByAuthUserId(
  authUserId
) {
  const {
    data,
    error,
  } = await supabase
    .from("household_members")
    .select(`
      id,
      household_id,
      auth_user_id,
      display_name
    `)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `世帯メンバーの取得に失敗しました: ${error.message}`
    );
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    householdId: data.household_id,
    authUserId: data.auth_user_id,
    displayName: data.display_name,
  };
}


export async function listHouseholdMembers(
  householdId
) {
  const {
    data,
    error,
  } = await supabase
    .from("household_members")
    .select(`
      id,
      household_id,
      auth_user_id,
      display_name
    `)
    .eq("household_id", householdId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `世帯メンバー一覧の取得に失敗しました: ${error.message}`
    );
  }

  return data.map((member) => {
    return {
      id: member.id,
      householdId: member.household_id,
      authUserId: member.auth_user_id,
      displayName: member.display_name,
    };
  });
}