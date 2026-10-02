import { supabase } from "./supabase.js";

export async function getCurrentUser() {
  const { data, error } =
    await supabase.auth.getUser();

  if (error) {
    if (error.message === "Auth session missing!") {
      return null;
    }

    throw new Error(
      `ユーザー情報の取得に失敗しました: ${error.message}`
    );
  }

  return data.user;
}