import { getCurrentUser } from "./auth.js";

import {
  findHouseholdMemberByAuthUserId,
} from "../repositories/householdMemberRepository.js";


export async function getCurrentMember() {
  const user = await getCurrentUser();

  const member =
    await findHouseholdMemberByAuthUserId(
      user.id
    );

  if (!member) {
    throw new Error(
      "ログインユーザーが世帯に登録されていません。"
    );
  }

  return member;
}