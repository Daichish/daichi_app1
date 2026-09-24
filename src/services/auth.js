import { supabase } from "./supabase.js";

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(
      `ユーザー情報の取得に失敗しました: ${error.message}`
    );
  }

  return user;
}