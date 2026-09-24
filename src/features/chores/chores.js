import {
  listChoreGroups,
  listActiveChoreTasks,
  listChorePeriodTasks,
  createChoreTask,
  updateChoreTask,
  deactivateChoreTask,
  createChorePeriodTasks,
  updateChorePeriodTask,
  updateChorePeriodTaskStatus,
} from "../../repositories/choreRepository.js";

import {
  getOrCreateCurrentChorePeriod,
  rotateCurrentChores,
} from "../../services/choreService.js";

import {
  listHouseholdMembers,
} from "../../repositories/householdMemberRepository.js";

import {
  getCurrentMember,
} from "../../services/currentMember.js";


/*
 * 編集中の家事タスクID
 */
let editingChoreTaskId = null;


/*
 * 現在のユーザー
 */
let currentMember = null;


/*
 * 世帯メンバー
 */
let householdMembers = [];


/*
 * 家事グループ
 */
let choreGroups = [];


/*
 * 有効な家事タスク
 */
let choreTasks = [];


/*
 * 現在の当番期間
 */
let currentPeriod = null;


/*
 * 現在の当番期間のタスク
 */
let currentPeriodTasks = [];


/*
 * グループIDを取得
 *
 * DB上の1番目のグループをA群
 * 2番目のグループをB群として扱う
 */
function getGroupByUiKey(groupKey) {
  if (groupKey === "groupA") {
    return choreGroups[0];
  }

  if (groupKey === "groupB") {
    return choreGroups[1];
  }

  return null;
}


/*
 * DB上のグループIDからUI上のグループを取得
 */
function getGroupUiKey(groupId) {
  if (choreGroups[0]?.id === groupId) {
    return "groupA";
  }

  if (choreGroups[1]?.id === groupId) {
    return "groupB";
  }

  return null;
}


/*
 * メンバーIDから名前を取得
 */
function getMemberName(memberId) {
  const member =
    householdMembers.find((member) => {
      return member.id === memberId;
    });

  return member?.displayName ?? "不明";
}


/*
 * 今週の期間表示
 */
function renderCurrentWeek() {
  if (!currentPeriod) {
    return "";
  }

  return `${currentPeriod.startDate} ～ ${currentPeriod.endDate}`;
}


/*
 * グループ担当者を取得
 */
function getGroupAssignee(groupId) {
  if (!currentPeriod) {
    return null;
  }

  if (groupId === choreGroups[0]?.id) {
    return currentPeriod.groupAMemberId;
  }

  if (groupId === choreGroups[1]?.id) {
    return currentPeriod.groupBMemberId;
  }

  return null;
}


/*
 * グループの家事タスクを取得
 */
function getTasksByGroup(groupId) {
  return currentPeriodTasks
    .filter((task) => {
      return (
        task.groupId === groupId &&
        task.isActive
      );
    });
}


/*
 * グループ進捗計算
 */
function calculateProgress(groupId) {
  const tasks =
    getTasksByGroup(groupId);

  const completedCount =
    tasks.filter((task) => {
      return task.status === "done";
    }).length;

  return {
    total: tasks.length,
    completed: completedCount,
  };
}


/*
 * グループの家事一覧を描画
 */
function renderChoreTasks(
  groupId,
  containerId
) {
  const container =
    document.querySelector(containerId);

  container.innerHTML = "";

  const tasks =
    getTasksByGroup(groupId);

  tasks.forEach((task) => {
    const item =
      document.createElement("li");

    item.className =
      "chore-item";


    const taskName =
      document.createElement("span");

    taskName.textContent =
      task.taskNameSnapshot;


    const statusButton =
      document.createElement("button");

    statusButton.type = "button";

    statusButton.dataset.action =
      "toggle-status";

    statusButton.dataset.taskId =
      task.id;


    if (task.status === "done") {
      statusButton.textContent =
        "対応済み";

      statusButton.classList.add(
        "is-completed"
      );

    } else {
      statusButton.textContent =
        "未対応";
    }


    item.append(
      taskName,
      statusButton
    );

    container.append(item);
  });
}


/*
 * グループ情報を描画
 */
function renderGroupInfo(
  groupId,
  assigneeElementId,
  progressElementId
) {
  const assigneeId =
    getGroupAssignee(groupId);

  const progress =
    calculateProgress(groupId);


  document.querySelector(
    assigneeElementId
  ).textContent =
    `担当者：${getMemberName(assigneeId)}`;


  document.querySelector(
    progressElementId
  ).textContent =
    `${progress.completed} / ${progress.total} 件対応済み`;
}


/*
 * 家事一覧全体を描画
 */
function renderChoreContent() {
  const groupA =
    choreGroups[0];

  const groupB =
    choreGroups[1];

  if (!groupA || !groupB) {
    return;
  }


  renderGroupInfo(
    groupA.id,
    "#group-a-assignee",
    "#group-a-progress"
  );


  renderGroupInfo(
    groupB.id,
    "#group-b-assignee",
    "#group-b-progress"
  );


  renderChoreTasks(
    groupA.id,
    "#group-a-tasks"
  );


  renderChoreTasks(
    groupB.id,
    "#group-b-tasks"
  );
}


/*
 * 現在の当番期間に
 * 存在していないタスクを追加する
 */
async function ensureCurrentPeriodTasks() {
  if (!currentPeriod) {
    return;
  }

  const existingTaskIds =
    new Set(
      currentPeriodTasks.map((task) => {
        return task.choreTaskId;
      })
    );


  const missingTasks =
    choreTasks.filter((task) => {
      return !existingTaskIds.has(task.id);
    });


  if (missingTasks.length === 0) {
    return;
  }


  const periodTaskRows =
    missingTasks.map((task) => {
      const assigneeMemberId =
        getGroupAssignee(task.groupId);

      if (!assigneeMemberId) {
        throw new Error(
          `家事「${task.name}」の担当者を決定できません。`
        );
      }

      return {
        choreTaskId: task.id,
        taskNameSnapshot: task.name,
        assigneeMemberId,
      };
    });


  await createChorePeriodTasks(
    currentPeriod.id,
    periodTaskRows
  );
}


/*
 * Supabaseから家事データを読み込む
 */
async function loadChoreData() {
  currentMember =
    await getCurrentMember();


  householdMembers =
    await listHouseholdMembers(
      currentMember.householdId
    );


  choreGroups =
    await listChoreGroups(
      currentMember.householdId
    );


  if (choreGroups.length < 2) {
    throw new Error(
      "家事グループが2つ必要です。"
    );
  }


  choreTasks =
    await listActiveChoreTasks(
      currentMember.householdId
    );


  currentPeriod =
    await getOrCreateCurrentChorePeriod({
      householdId:
        currentMember.householdId,
      currentMember,
      householdMembers,
    });


  currentPeriodTasks =
    await listChorePeriodTasks(
      currentPeriod.id
    );


  await ensureCurrentPeriodTasks();


  currentPeriodTasks =
    await listChorePeriodTasks(
      currentPeriod.id
    );
}


/*
 * ステータス変更
 */
async function toggleChoreStatus(taskId) {
  const task =
    currentPeriodTasks.find((task) => {
      return task.id === taskId;
    });


  if (!task) {
    return;
  }


  const nextStatus =
    task.status === "pending"
      ? "done"
      : "pending";


  try {
    await updateChorePeriodTaskStatus({
      periodTaskId: taskId,
      status: nextStatus,
    });


    await loadChoreData();

    renderChoreContent();

  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}


/*
 * 当番交代
 */
async function rotateChores() {
  const shouldRotate =
    window.confirm(
      "当番を交代しますか？\n\n担当者を入れ替え、すべての家事を未対応に戻します。"
    );


  if (!shouldRotate) {
    return;
  }


  const groupA =
    choreGroups[0];

  const groupB =
    choreGroups[1];


  const rotateButton =
    document.querySelector(
      "#rotate-chore-button"
    );


  rotateButton.disabled = true;


  try {
    const result =
      await rotateCurrentChores({
        householdId:
          currentMember.householdId,

        periodId:
          currentPeriod.id,

        groupAMemberId:
          currentPeriod.groupAMemberId,

        groupBMemberId:
          currentPeriod.groupBMemberId,

        groupAId:
          groupA.id,

        groupBId:
          groupB.id,
      });


    currentPeriod = {
      ...currentPeriod,
      groupAMemberId:
        result.groupAMemberId,
      groupBMemberId:
        result.groupBMemberId,
    };


    currentPeriodTasks =
      await listChorePeriodTasks(
        currentPeriod.id
      );


    renderChoreContent();

  } catch (error) {
    console.error(error);
    alert(error.message);

  } finally {
    rotateButton.disabled = false;
  }
}


/*
 * 家事一覧のイベント処理
 */
function handleChoreAction(event) {
  const button =
    event.target.closest("button");

  if (!button) {
    return;
  }


  const action =
    button.dataset.action;

  const taskId =
    button.dataset.taskId;


  if (
    action === "toggle-status" &&
    taskId
  ) {
    void toggleChoreStatus(taskId);
  }
}


/*
 * 次のsortOrderを取得
 */
function getNextSortOrder(groupId) {
  const groupTasks =
    choreTasks.filter((task) => {
      return task.groupId === groupId;
    });


  if (groupTasks.length === 0) {
    return 1;
  }


  const maxSortOrder =
    Math.max(
      ...groupTasks.map((task) => {
        return task.sortOrder;
      })
    );


  return maxSortOrder + 1;
}


/*
 * タスク管理一覧を描画
 */
function renderChoreTaskManagement() {
  const list =
    document.querySelector(
      "#chore-task-management-list"
    );


  list.innerHTML = "";


  const activeTasks =
    [...choreTasks]
      .sort((a, b) => {

        if (
          a.groupId === b.groupId
        ) {
          return (
            a.sortOrder -
            b.sortOrder
          );
        }

        return (
          a.groupId.localeCompare(
            b.groupId
          )
        );
      });


  activeTasks.forEach((task) => {
    const item =
      document.createElement("li");

    item.className =
      "chore-management-item";


    const info =
      document.createElement("div");


    const taskName =
      document.createElement("span");

    taskName.textContent =
      task.name;


    const groupName =
      document.createElement("span");


    const groupUiKey =
      getGroupUiKey(
        task.groupId
      );


    groupName.textContent =
      groupUiKey === "groupA"
        ? "A群"
        : "B群";


    info.append(
      groupName,
      taskName
    );


    const actions =
      document.createElement("div");


    const editButton =
      document.createElement("button");

    editButton.type = "button";

    editButton.textContent =
      "編集";

    editButton.dataset.action =
      "edit-task";

    editButton.dataset.taskId =
      task.id;


    const deleteButton =
      document.createElement("button");

    deleteButton.type = "button";

    deleteButton.textContent =
      "削除";

    deleteButton.dataset.action =
      "delete-task";

    deleteButton.dataset.taskId =
      task.id;


    actions.append(
      editButton,
      deleteButton
    );


    item.append(
      info,
      actions
    );


    list.append(item);
  });
}


/*
 * タスク管理のイベント処理
 */
function handleChoreManagementAction(event) {
  const button =
    event.target.closest("button");

  if (!button) {
    return;
  }


  const action =
    button.dataset.action;

  const taskId =
    button.dataset.taskId;


  if (!taskId) {
    return;
  }


  if (action === "edit-task") {
    startEditChoreTask(taskId);
    return;
  }


  if (action === "delete-task") {
    void deleteChoreTask(taskId);
  }
}


/*
 * タスク追加・更新
 */
async function handleChoreTaskSubmit(event) {
  event.preventDefault();


  const form =
    event.currentTarget;

  const formData =
    new FormData(form);


  const name =
    String(
      formData.get(
        "chore-task-name"
      ) ?? ""
    ).trim();


  const groupUiKey =
    String(
      formData.get(
        "chore-task-group"
      ) ?? ""
    );


  if (!name) {
    alert(
      "家事名を入力してください。"
    );
    return;
  }


  if (
    groupUiKey !== "groupA" &&
    groupUiKey !== "groupB"
  ) {
    alert(
      "グループを選択してください。"
    );
    return;
  }


  const group =
    getGroupByUiKey(groupUiKey);


  if (!group) {
    alert(
      "家事グループを取得できません。"
    );
    return;
  }


  const submitButton =
    form.querySelector(
      'button[type="submit"]'
    );


  submitButton.disabled = true;


  try {

    /*
     * 新規追加
     */
    if (
      editingChoreTaskId === null
    ) {
      const sortOrder =
        getNextSortOrder(group.id);


      await createChoreTask({
        householdId:
          currentMember.householdId,

        groupId:
          group.id,

        name,

        sortOrder,
      });


    /*
     * 更新
     */
    } else {
      const task =
        choreTasks.find((task) => {
          return (
            task.id ===
            editingChoreTaskId
          );
        });


      if (!task) {
        return;
      }


      const oldGroupId =
        task.groupId;


      let sortOrder =
        task.sortOrder;


      if (
        oldGroupId !== group.id
      ) {
        sortOrder =
          getNextSortOrder(
            group.id
          );
      }


      await updateChoreTask({
        householdId:
          currentMember.householdId,

        taskId:
          task.id,

        groupId:
          group.id,

        name,

        sortOrder,
      });


      const periodTask =
        currentPeriodTasks.find(
          (periodTask) => {
            return (
              periodTask.choreTaskId ===
              task.id
            );
          }
        );


      if (periodTask) {
        const assigneeMemberId =
          getGroupAssignee(
            group.id
          );


        await updateChorePeriodTask({
          periodTaskId:
            periodTask.id,

          taskNameSnapshot:
            name,

          assigneeMemberId,
        });
      }
    }


    editingChoreTaskId = null;


    form.reset();


    submitButton.textContent =
      "タスクを追加";


    document.querySelector(
      "#cancel-chore-task-edit"
    ).hidden = true;


    await loadChoreData();


    renderChoreContent();
    renderChoreTaskManagement();

  } catch (error) {
    console.error(error);
    alert(error.message);

  } finally {
    submitButton.disabled = false;
  }
}


/*
 * 編集開始
 */
function startEditChoreTask(taskId) {
  const task =
    choreTasks.find((task) => {
      return task.id === taskId;
    });


  if (!task) {
    return;
  }


  editingChoreTaskId =
    taskId;


  const form =
    document.querySelector(
      "#chore-task-form"
    );


  form.elements[
    "chore-task-name"
  ].value =
    task.name;


  form.elements[
    "chore-task-group"
  ].value =
    getGroupUiKey(
      task.groupId
    );


  const submitButton =
    form.querySelector(
      'button[type="submit"]'
    );


  submitButton.textContent =
    "タスクを更新";


  document.querySelector(
    "#cancel-chore-task-edit"
  ).hidden = false;
}


/*
 * 編集キャンセル
 */
function cancelEditChoreTask() {
  editingChoreTaskId =
    null;


  const form =
    document.querySelector(
      "#chore-task-form"
    );


  form.reset();


  const submitButton =
    form.querySelector(
      'button[type="submit"]'
    );


  submitButton.textContent =
    "タスクを追加";


  document.querySelector(
    "#cancel-chore-task-edit"
  ).hidden = true;
}


/*
 * タスク論理削除
 */
async function deleteChoreTask(taskId) {
  const task =
    choreTasks.find((task) => {
      return task.id === taskId;
    });


  if (!task) {
    return;
  }


  const shouldDelete =
    window.confirm(
      `「${task.name}」を削除しますか？`
    );


  if (!shouldDelete) {
    return;
  }


  try {
    await deactivateChoreTask({
      householdId:
        currentMember.householdId,

      taskId,
    });


    if (
      editingChoreTaskId ===
      taskId
    ) {
      cancelEditChoreTask();
    }


    await loadChoreData();


    renderChoreContent();
    renderChoreTaskManagement();

  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}


/*
 * 家事当番画面
 */
export function renderChores() {
  return `
    <section class="chores-page">

      <div class="page-header">
        <h2>家事当番</h2>
        <p>
          今週の家事の担当と進捗状況を確認できます。
        </p>
      </div>


      <section class="chore-week-card">

        <div>
          <h3>今週</h3>
          <p id="current-week"></p>
        </div>

        <button
          id="rotate-chore-button"
          type="button"
        >
          当番交代
        </button>

      </section>


      <section class="chore-group">

        <div class="chore-group-header">

          <div>
            <h3>A群</h3>
            <p id="group-a-assignee"></p>
          </div>

          <p id="group-a-progress"></p>

        </div>

        <ul id="group-a-tasks"></ul>

      </section>


      <section class="chore-group">

        <div class="chore-group-header">

          <div>
            <h3>B群</h3>
            <p id="group-b-assignee"></p>
          </div>

          <p id="group-b-progress"></p>

        </div>

        <ul id="group-b-tasks"></ul>

      </section>

    </section>


    <section class="chore-management">

      <h3>家事タスク管理</h3>

      <form id="chore-task-form">

        <div class="form-group">

          <label for="chore-task-name">
            家事名
          </label>

          <input
            id="chore-task-name"
            name="chore-task-name"
            type="text"
            placeholder="例：お風呂掃除"
            required
          />

        </div>


        <div class="form-group">

          <label for="chore-task-group">
            グループ
          </label>

          <select
            id="chore-task-group"
            name="chore-task-group"
            required
          >
            <option value="">
              選択してください
            </option>

            <option value="groupA">
              A群
            </option>

            <option value="groupB">
              B群
            </option>

          </select>

        </div>


        <div class="chore-task-form-actions">

          <button type="submit">
            タスクを追加
          </button>

          <button
            id="cancel-chore-task-edit"
            type="button"
            hidden
          >
            編集をキャンセル
          </button>

        </div>

      </form>


      <ul id="chore-task-management-list"></ul>

    </section>
  `;
}


/*
 * 家事当番画面の初期化
 */
export async function initializeChores() {

  await loadChoreData();


  document.querySelector(
    "#current-week"
  ).textContent =
    renderCurrentWeek();


  renderChoreContent();

  renderChoreTaskManagement();


  const chorePage =
    document.querySelector(
      ".chores-page"
    );


  chorePage.addEventListener(
    "click",
    handleChoreAction
  );


  const rotateButton =
    document.querySelector(
      "#rotate-chore-button"
    );


  rotateButton.addEventListener(
    "click",
    () => {
      void rotateChores();
    }
  );


  const choreTaskForm =
    document.querySelector(
      "#chore-task-form"
    );


  choreTaskForm.addEventListener(
    "submit",
    handleChoreTaskSubmit
  );


  const cancelButton =
    document.querySelector(
      "#cancel-chore-task-edit"
    );


  cancelButton.addEventListener(
    "click",
    cancelEditChoreTask
  );


  const managementList =
    document.querySelector(
      "#chore-task-management-list"
    );


  managementList.addEventListener(
    "click",
    handleChoreManagementAction
  );
}