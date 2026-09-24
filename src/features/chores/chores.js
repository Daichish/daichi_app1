import { choreState } from "./choreData.js";
import { formatDate } from "../../utils/date.js";

/*
 * 担当者名を取得
 */
function getMemberName(member) {
  if (member === "me") {
    return "あなた";
  }

  if (member === "partner") {
    return "彼女";
  }

  return "不明";
}


/*
 * 今週の月曜日を取得
 */
function getStartOfWeek(date = new Date()) {
  const result = new Date(date);

  const day = result.getDay();

  const diff = day === 0
    ? -6
    : 1 - day;

  result.setDate(result.getDate() + diff);

  result.setHours(0, 0, 0, 0);

  return result;
}


/*
 * 今週の日曜日を取得
 */
function getEndOfWeek(date = new Date()) {
  const result = getStartOfWeek(date);

  result.setDate(result.getDate() + 6);

  return result;
}




/*
 * 今週の期間を表示
 */
function renderCurrentWeek() {
  const start = getStartOfWeek();
  const end = getEndOfWeek();

  return `${formatDate(start)} ～ ${formatDate(end)}`;
}


/*
 * グループの担当者を取得
 */
function getGroupAssignee(groupId) {
  return choreState.assignments[groupId];
}


/*
 * グループのタスクを取得
 */
function getTasksByGroup(groupId) {
  return choreState.tasks
    .filter((task) => {
      return (
        task.group === groupId &&
        task.isActive
      );
    })
    .sort((a, b) => {
      return a.sortOrder - b.sortOrder;
    });
}


/*
 * グループの進捗を計算
 */
function calculateProgress(groupId) {
  const tasks = getTasksByGroup(groupId);

  const completedCount = tasks.filter((task) => {
    return task.status === "done";
  }).length;

  return {
    total: tasks.length,
    completed: completedCount,
  };
}


/*
 * グループのタスクをDOMへ描画
 */
function renderChoreTasks(groupId, containerId) {
  const container =
    document.querySelector(containerId);

  container.innerHTML = "";

  const tasks = getTasksByGroup(groupId);

  tasks.forEach((task) => {
    const item =
      document.createElement("li");

    item.className = "chore-item";

    const taskName =
      document.createElement("span");

    taskName.textContent =
      task.name;

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
 * グループの担当者・進捗を描画
 */
function renderGroupInfo(
  groupId,
  assigneeElementId,
  progressElementId
) {
  const assignee =
    getGroupAssignee(groupId);

  const progress =
    calculateProgress(groupId);

  document.querySelector(
    assigneeElementId
  ).textContent =
    `担当者：${getMemberName(assignee)}`;

  document.querySelector(
    progressElementId
  ).textContent =
    `${progress.completed} / ${progress.total} 件対応済み`;
}


/*
 * 家事一覧全体を再描画
 */
function renderChoreContent() {
  renderGroupInfo(
    "groupA",
    "#group-a-assignee",
    "#group-a-progress"
  );

  renderGroupInfo(
    "groupB",
    "#group-b-assignee",
    "#group-b-progress"
  );

  renderChoreTasks(
    "groupA",
    "#group-a-tasks"
  );

  renderChoreTasks(
    "groupB",
    "#group-b-tasks"
  );
}


/*
 * ステータス変更
 */
function toggleChoreStatus(taskId) {
  const task =
    choreState.tasks.find((task) => {
      return task.id === taskId;
    });

  if (!task) {
    return;
  }

  if (task.status === "pending") {
    task.status = "done";
  } else {
    task.status = "pending";
  }

  renderChoreContent();
}


/*
 * 当番交代
 */
function rotateChores() {
  const shouldRotate = window.confirm(
    "当番を交代しますか？\n\n担当者を入れ替え、すべての家事を未対応に戻します。"
  );

  if (!shouldRotate) {
    return;
  }

  const currentGroupA =
    choreState.assignments.groupA;

  const currentGroupB =
    choreState.assignments.groupB;

  choreState.assignments.groupA =
    currentGroupB;

  choreState.assignments.groupB =
    currentGroupA;

  choreState.tasks.forEach((task) => {
    task.status = "pending";
  });

  renderChoreContent();
}


/*
 * イベント処理
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

  if (action === "toggle-status") {
    toggleChoreStatus(taskId);
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
        <p>今週の家事の担当と進捗状況を確認できます。</p>
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
          <option value="">選択してください</option>
          <option value="groupA">A群</option>
          <option value="groupB">B群</option>
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
 * 家事当番画面のイベント・初期化
 */
export function initializeChores() {
  document.querySelector("#current-week").textContent =
    renderCurrentWeek();

  renderChoreContent();
  renderChoreTaskManagement();


  const chorePage =
    document.querySelector(".chores-page");

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
    rotateChores
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

//IDからタスクを取得
function findChoreTaskById(taskId) {
  return choreState.tasks.find((task) => {
    return task.id === taskId;
  });
}


//編集状態を管理
let editingChoreTaskId = null;

//新しいタスクの並び順を決める
function getNextSortOrder(groupId) {
  const groupTasks = choreState.tasks.filter((task) => {
    return (
      task.group === groupId &&
      task.isActive
    );
  });

  if (groupTasks.length === 0) {
    return 1;
  }

  const maxSortOrder = Math.max(
    ...groupTasks.map((task) => {
      return task.sortOrder;
    })
  );

  return maxSortOrder + 1;
}

//管理画面のタスク一覧を生成する
function renderChoreTaskManagement() {
  const list =
    document.querySelector(
      "#chore-task-management-list"
    );

  list.innerHTML = "";

  const activeTasks =
    choreState.tasks
      .filter((task) => {
        return task.isActive;
      })
      .sort((a, b) => {
        if (a.group === b.group) {
          return a.sortOrder - b.sortOrder;
        }

        return a.group.localeCompare(b.group);
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

    groupName.textContent =
      task.group === "groupA"
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
    editButton.textContent = "編集";

    editButton.dataset.action =
      "edit-task";

    editButton.dataset.taskId =
      task.id;


    const deleteButton =
      document.createElement("button");

    deleteButton.type = "button";
    deleteButton.textContent = "削除";

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

//タスク追加処理
function handleChoreTaskSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);

  const name = String(
    formData.get("chore-task-name") ?? ""
  ).trim();

  const group = String(
    formData.get("chore-task-group") ?? ""
  );


  if (!name) {
    alert("家事名を入力してください。");
    return;
  }

  if (
    group !== "groupA" &&
    group !== "groupB"
  ) {
    alert("グループを選択してください。");
    return;
  }


  if (editingChoreTaskId === null) {

    const newTask = {
      id: crypto.randomUUID(),
      group,
      name,
      status: "pending",
      isActive: true,
      sortOrder: getNextSortOrder(group),
    };

    choreState.tasks.push(newTask);

  } else {

    const task =
      findChoreTaskById(editingChoreTaskId);

    if (!task) {
      return;
    }

    const oldGroup = task.group;

    task.name = name;

    if (oldGroup !== group) {
      task.group = group;
      task.sortOrder =
        getNextSortOrder(group);
    }
  }


  editingChoreTaskId = null;

  form.reset();

  const submitButton =
    form.querySelector(
      'button[type="submit"]'
    );

  submitButton.textContent =
    "タスクを追加";


  const cancelButton =
    document.querySelector(
      "#cancel-chore-task-edit"
    );

  cancelButton.hidden = true;


  renderChoreContent();
  renderChoreTaskManagement();
}

//編集開始処理

function startEditChoreTask(taskId) {
  const task =
    findChoreTaskById(taskId);

  if (!task || !task.isActive) {
    return;
  }

  editingChoreTaskId = taskId;

  const form =
    document.querySelector(
      "#chore-task-form"
    );


  form.elements["chore-task-name"].value =
    task.name;

  form.elements["chore-task-group"].value =
    task.group;


  const submitButton =
    form.querySelector(
      'button[type="submit"]'
    );

  submitButton.textContent =
    "タスクを更新";


  const cancelButton =
    document.querySelector(
      "#cancel-chore-task-edit"
    );

  cancelButton.hidden = false;
}

//編集キャンセル
function cancelEditChoreTask() {
  editingChoreTaskId = null;

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


  const cancelButton =
    document.querySelector(
      "#cancel-chore-task-edit"
    );

  cancelButton.hidden = true;
}

//削除処理
function deleteChoreTask(taskId) {
  const task =
    findChoreTaskById(taskId);

  if (!task || !task.isActive) {
    return;
  }


  const shouldDelete = window.confirm(
    `「${task.name}」を削除しますか？`
  );

  if (!shouldDelete) {
    return;
  }


  task.isActive = false;

  task.status = "pending";


  if (editingChoreTaskId === taskId) {
    cancelEditChoreTask();
  }


  renderChoreContent();
  renderChoreTaskManagement();
}

//イベント処理
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
    deleteChoreTask(taskId);
  }
}

