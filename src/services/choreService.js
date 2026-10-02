import {
  listChoreGroups,
  listActiveChoreTasks,
  findChorePeriodByStartDate,
  findLatestChorePeriodBefore,
  createChorePeriod,
  updateChorePeriodAssignments,
  listChorePeriodTasks,
  createChorePeriodTasks,
  resetChorePeriodTask,
} from "../repositories/choreRepository.js";


/*
 * YYYY-MM-DD形式
 */
function formatDateOnly(date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


/*
 * 今週の月曜日〜日曜日を取得
 */
/*
 * 今週の日曜日〜土曜日を取得
 */
function getCurrentWeekRange() {
  const today = new Date();

  const day = today.getDay();

  const diffToSunday =
    -day;

  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(
    start.getDate() + diffToSunday
  );

  const end = new Date(start);
  end.setDate(
    end.getDate() + 6
  );

  return {
    startDate: formatDateOnly(start),
    endDate: formatDateOnly(end),
  };
}


/*
 * 2つの日付の週差
 */
function getWeekDifference(
  fromDate,
  toDate
) {
  const from =
    new Date(`${fromDate}T00:00:00Z`);

  const to =
    new Date(`${toDate}T00:00:00Z`);

  const difference =
    to.getTime() - from.getTime();

  return Math.round(
    difference /
      (1000 * 60 * 60 * 24 * 7)
  );
}


/*
 * 今週の当番期間を取得・必要なら作成
 */
export async function getOrCreateCurrentChorePeriod({
  householdId,
  currentMember,
  householdMembers,
}) {
  const {
    startDate,
    endDate,
  } = getCurrentWeekRange();

  const existingPeriod =
    await findChorePeriodByStartDate(
      householdId,
      startDate
    );

  if (existingPeriod) {
    return existingPeriod;
  }


  const groups =
    await listChoreGroups(
      householdId
    );

  if (groups.length < 2) {
    throw new Error(
      "家事グループが2つ必要です。"
    );
  }


  const tasks =
    await listActiveChoreTasks(
      householdId
    );


  const previousPeriod =
    await findLatestChorePeriodBefore(
      householdId,
      startDate
    );


  let groupAMemberId;
  let groupBMemberId;


  /*
   * 初回
   */
  if (!previousPeriod) {
    groupAMemberId =
      currentMember.id;

    const partner =
      householdMembers.find(
        (member) =>
          member.id !== currentMember.id
      );

    if (!partner) {
      throw new Error(
        "世帯メンバーが2人見つかりません。"
      );
    }

    groupBMemberId =
      partner.id;

  } else {

    /*
     * 前回の当番を基準に、
     * 経過した週数が奇数なら交代
     */
    const weekDifference =
      getWeekDifference(
        previousPeriod.startDate,
        startDate
      );

    if (weekDifference % 2 === 1) {
      groupAMemberId =
        previousPeriod.groupBMemberId;

      groupBMemberId =
        previousPeriod.groupAMemberId;
    } else {
      groupAMemberId =
        previousPeriod.groupAMemberId;

      groupBMemberId =
        previousPeriod.groupBMemberId;
    }
  }


  const period =
    await createChorePeriod({
      householdId,
      startDate,
      endDate,
      groupAMemberId,
      groupBMemberId,
    });


  const groupA =
    groups[0];

  const groupB =
    groups[1];


  const periodTasks =
    tasks.map((task) => {

      let assigneeMemberId;

      if (
        task.groupId === groupA.id
      ) {
        assigneeMemberId =
          groupAMemberId;

      } else if (
        task.groupId === groupB.id
      ) {
        assigneeMemberId =
          groupBMemberId;

      } else {
        throw new Error(
          `家事タスク「${task.name}」のグループが不正です。`
        );
      }


      return {
        choreTaskId: task.id,
        taskNameSnapshot: task.name,
        assigneeMemberId,
      };
    });


  await createChorePeriodTasks(
    period.id,
    periodTasks
  );


  return period;
}


/*
 * 今週の家事実行状況を取得
 */
export async function loadCurrentChoreTasks(
  periodId
) {
  return await listChorePeriodTasks(
    periodId
  );
}


/*
 * 当番交代
 *
 * 現在の期間の担当者を入れ替えて
 * 有効なタスクをすべて未対応に戻す
 */
export async function rotateCurrentChores({
  householdId,
  periodId,
  groupAMemberId,
  groupBMemberId,
  groupAId,
  groupBId,
}) {
  const periodTasks =
    await listChorePeriodTasks(
      periodId
    );


  await updateChorePeriodAssignments({
    householdId,
    periodId,
    groupAMemberId:
      groupBMemberId,
    groupBMemberId:
      groupAMemberId,
  });


  for (const periodTask of periodTasks) {

    if (!periodTask.isActive) {
      continue;
    }


    let assigneeMemberId;


    if (
      periodTask.groupId === groupAId
    ) {
      assigneeMemberId =
        groupBMemberId;

    } else if (
      periodTask.groupId === groupBId
    ) {
      assigneeMemberId =
        groupAMemberId;

    } else {
      continue;
    }


    await resetChorePeriodTask({
      periodTaskId:
        periodTask.id,
      assigneeMemberId,
    });
  }


  return {
    groupAMemberId:
      groupBMemberId,
    groupBMemberId:
      groupAMemberId,
  };
}