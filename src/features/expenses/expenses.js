import {
  listExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../../repositories/expenseRepository.js";

import {
  listHouseholdMembers,
} from "../../repositories/householdMemberRepository.js";

import {
  getCurrentMember,
} from "../../services/currentMember.js";


let editingExpenseId = null;
let selectedExpenseFilter = "all";

let currentMember = null;
let householdMembers = [];
let loadedExpenses = [];


/*
 * 金額表示
 */
function formatYen(amount) {
  return `¥${amount.toLocaleString("ja-JP")}`;
}


/*
 * 日時表示
 */
function formatDateTime(dateTime) {
  const date = new Date(dateTime);

  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}


/*
 * datetime-local用の値へ変換
 */
function toDatetimeLocalValue(dateTime) {
  const date = new Date(dateTime);

  const pad = (value) => {
    return String(value).padStart(2, "0");
  };

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
}


/*
 * 現在のユーザー以外のメンバー名を取得
 */
function getPartnerDisplayName() {
  const partner = householdMembers.find((member) => {
    return member.id !== currentMember.id;
  });

  return partner?.displayName ?? "相手";
}


/*
 * 今月かどうか
 */
function isThisMonth(dateTime) {
  const date = new Date(dateTime);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}


/*
 * フィルター後の支出
 */
function getFilteredExpenses() {
  if (selectedExpenseFilter === "all") {
    return loadedExpenses;
  }

  if (selectedExpenseFilter === "this-month") {
    return loadedExpenses.filter((expense) => {
      return isThisMonth(expense.occurredAt);
    });
  }

  return loadedExpenses;
}


/*
 * IDから支出を探す
 */
function findExpenseById(expenseId) {
  return loadedExpenses.find((expense) => {
    return expense.id === expenseId;
  });
}


/*
 * 支出サマリー計算
 */
function calculateSummary() {
  const targetExpenses =
    getFilteredExpenses();


  const total =
    targetExpenses.reduce((sum, expense) => {
      return sum + expense.amount;
    }, 0);


  const myTotal =
    targetExpenses
      .filter((expense) => {
        return (
          expense.payerMemberId ===
          currentMember.id
        );
      })
      .reduce((sum, expense) => {
        return sum + expense.amount;
      }, 0);


  const partnerTotal =
    targetExpenses
      .filter((expense) => {
        return (
          expense.payerMemberId !==
          currentMember.id
        );
      })
      .reduce((sum, expense) => {
        return sum + expense.amount;
      }, 0);


  /*
   * 精算額
   *
   * 2人の支払額の差を2で割る
   */
  const settlementAmount =
    Math.abs(
      myTotal - partnerTotal
    ) / 2;


  let settlementText;


  if (myTotal > partnerTotal) {
    settlementText =
      `${getPartnerDisplayName()} → ${currentMember.displayName}`;

  } else if (partnerTotal > myTotal) {
    settlementText =
      `${currentMember.displayName} → ${getPartnerDisplayName()}`;

  } else {
    settlementText =
      "精算なし";
  }


  return {
    total,
    myTotal,
    partnerTotal,
    settlementAmount,
    settlementText,
  };
}


/*
 * サマリーを描画
 */
function renderSummary() {
  const summary =
    calculateSummary();


  document.querySelector(
    "#expense-total"
  ).textContent =
    formatYen(summary.total);


  document.querySelector(
    "#expense-my-total"
  ).textContent =
    formatYen(summary.myTotal);


  document.querySelector(
    "#expense-partner-total"
  ).textContent =
    formatYen(summary.partnerTotal);


  const settlementElement =
    document.querySelector(
      "#expense-settlement"
    );


  if (
    summary.settlementAmount === 0
  ) {
    settlementElement.textContent =
      "精算なし";

    settlementElement.classList.remove(
      "has-settlement"
    );

    return;
  }


  settlementElement.textContent =
    `${summary.settlementText} ${formatYen(summary.settlementAmount)}`;

  settlementElement.classList.add(
    "has-settlement"
  );
}


/*
 * 負担者のselectをDBのメンバーから生成
 */
function renderPayerOptions() {
  const select =
    document.querySelector(
      "#expense-payer"
    );

  select.innerHTML = "";

  householdMembers.forEach((member) => {
    const option =
      document.createElement("option");

    option.value = member.id;
    option.textContent =
      member.displayName;

    if (
      member.id === currentMember.id
    ) {
      option.selected = true;
    }

    select.append(option);
  });
}


/*
 * 支出一覧を描画
 */
function renderExpenseRows() {
  const expenseList =
    document.querySelector(
      "#expense-list"
    );

  expenseList.innerHTML = "";

  const filteredExpenses =
    getFilteredExpenses();

  if (filteredExpenses.length === 0) {
    const row =
      document.createElement("tr");

    const cell =
      document.createElement("td");

    cell.colSpan = 5;
    cell.textContent =
      "表示できる支出がありません。";

    row.append(cell);
    expenseList.append(row);

    return;
  }


  filteredExpenses.forEach((expense) => {
    const row =
      document.createElement("tr");


    const dateCell =
      document.createElement("td");

    dateCell.textContent =
      formatDateTime(
        expense.occurredAt
      );


    const itemCell =
      document.createElement("td");

    itemCell.textContent =
      expense.itemName;


    const payerCell =
      document.createElement("td");

    payerCell.textContent =
      expense.payerName;


    const amountCell =
      document.createElement("td");

    amountCell.textContent =
      formatYen(expense.amount);


    const actionCell =
      document.createElement("td");


    const detailButton =
      document.createElement("button");

    detailButton.type = "button";
    detailButton.textContent = "詳細";
    detailButton.dataset.action =
      "detail";
    detailButton.dataset.expenseId =
      expense.id;


    const editButton =
      document.createElement("button");

    editButton.type = "button";
    editButton.textContent = "編集";
    editButton.dataset.action =
      "edit";
    editButton.dataset.expenseId =
      expense.id;


    const deleteButton =
      document.createElement("button");

    deleteButton.type = "button";
    deleteButton.textContent = "削除";
    deleteButton.dataset.action =
      "delete";
    deleteButton.dataset.expenseId =
      expense.id;


    actionCell.append(
      detailButton,
      editButton,
      deleteButton
    );


    row.append(
      dateCell,
      itemCell,
      payerCell,
      amountCell,
      actionCell
    );


    expenseList.append(row);
  });
}


/*
 * Supabaseから支出を読み込む
 */
async function loadExpenses() {
  loadedExpenses =
    await listExpenses(
      currentMember.householdId
    );

  renderSummary();
  renderExpenseRows();
}


/*
 * 編集開始
 */
function startEditExpense(expenseId) {
  const expense =
    findExpenseById(expenseId);

  if (!expense) {
    return;
  }

  editingExpenseId =
    expenseId;

    document.querySelector(
    "#expense-form-title"
    ).textContent =
    "支出を編集";

  const form =
    document.querySelector(
      "#expense-form"
    );


  form.elements[
    "expense-date"
  ].value =
    toDatetimeLocalValue(
      expense.occurredAt
    );


  form.elements[
    "expense-item"
  ].value =
    expense.itemName;


  form.elements[
    "expense-payer"
  ].value =
    expense.payerMemberId;


  form.elements[
    "expense-amount"
  ].value =
    expense.amount;


  const submitButton =
    form.querySelector(
      'button[type="submit"]'
    );

  submitButton.textContent =
    "支出を更新";


  document.querySelector(
    "#cancel-edit-button"
  ).hidden = false;


}


/*
 * 編集キャンセル
 */
function cancelEdit() {
  editingExpenseId = null;

  const form =
    document.querySelector(
      "#expense-form"
    );

  form.reset();

  const submitButton =
    form.querySelector(
      'button[type="submit"]'
    );

  submitButton.textContent =
    "支出を登録";

  document.querySelector(
    "#expense-form-title"
  ).textContent =
    "支出を登録";

  document.querySelector(
    "#cancel-edit-button"
  ).hidden = true;

  renderPayerOptions();
}
/*
 * 支出登録・更新
 */
async function handleExpenseSubmit(event) {
  event.preventDefault();

  const form =
    event.currentTarget;

  const formData =
    new FormData(form);


  const occurredAt =
    String(
      formData.get("expense-date") ?? ""
    );


  const itemName =
    String(
      formData.get("expense-item") ?? ""
    ).trim();


  const payerMemberId =
    String(
      formData.get("expense-payer") ?? ""
    );


  const amount =
    Number(
      formData.get("expense-amount")
    );


  /*
   * バリデーション
   */

  if (!occurredAt) {
    alert(
      "購入日時を入力してください。"
    );
    return;
  }


  const occurredDate =
  new Date(occurredAt);

if (
  Number.isNaN(
    occurredDate.getTime()
  )
) {
  alert(
    "正しい購入日時を入力してください。"
  );
  return;
}

if (
  occurredDate.getTime() >
  Date.now()
) {
  alert(
    "未来の日時は登録できません。"
  );
  return;
}

  if (!itemName) {
    alert(
      "購入品を入力してください。"
    );
    return;
  }

if (itemName.length > 100) {
  alert(
    "購入品は100文字以内で入力してください。"
  );
  return;
}

  const payerExists =
    householdMembers.some((member) => {
      return (
        member.id === payerMemberId
      );
    });


  if (!payerExists) {
    alert(
      "正しい負担者を選択してください。"
    );
    return;
  }


  if (
    !Number.isInteger(amount) ||
    amount < 1
  ) {
    alert(
      "金額は1円以上の整数で入力してください。"
    );
    return;
  }


  const submitButton =
    form.querySelector(
      'button[type="submit"]'
    );
const isEditing =
  editingExpenseId !== null;

submitButton.disabled = true;

submitButton.textContent =
  isEditing
    ? "更新中..."
    : "登録中...";


  try {

    if (editingExpenseId === null) {

      await createExpense({
        householdId:
          currentMember.householdId,
        occurredAt,
        itemName,
        payerMemberId,
        amount,
      });

    } else {

      await updateExpense({
        householdId:
          currentMember.householdId,
        expenseId:
          editingExpenseId,
        occurredAt,
        itemName,
        payerMemberId,
        amount,
      });
    }


    editingExpenseId = null;

    form.reset();

    submitButton.textContent =
      "支出を登録";


    document.querySelector(
      "#cancel-edit-button"
    ).hidden = true;


    renderPayerOptions();

    await loadExpenses();

  } catch (error) {

    console.error(error);

    alert(error.message);

  } finally {
  submitButton.disabled = false;

  submitButton.textContent =
    isEditing
      ? "支出を更新"
      : "支出を登録";
}
}


/*
 * 支出削除
 */
async function handleDeleteExpense(
  expenseId
) {
  const expense =
    findExpenseById(expenseId);

  if (!expense) {
    return;
  }


  const shouldDelete =
    window.confirm(
      `「${expense.itemName}」を削除しますか？`
    );


  if (!shouldDelete) {
    return;
  }


  try {

    await deleteExpense(
      currentMember.householdId,
      expenseId
    );


    if (
      editingExpenseId === expenseId
    ) {
      editingExpenseId = null;
    }


    await loadExpenses();

  } catch (error) {

    console.error(error);

    alert(error.message);
  }
}


/*
 * 支出一覧のボタン操作
 */
function handleExpenseAction(event) {
  const button =
    event.target.closest("button");

  if (!button) {
    return;
  }


  const action =
    button.dataset.action;

  const expenseId =
    button.dataset.expenseId;


  if (!expenseId) {
    return;
  }


  if (action === "detail") {
    window.location.hash =
      `#expenses/${expenseId}`;

    return;
  }


  if (action === "edit") {
    window.location.hash =
      `#expenses/edit/${expenseId}`;

    return;
  }


  if (action === "delete") {
    void handleDeleteExpense(
      expenseId
    );
  }
}


/*
 * 支出一覧画面
 */
export function renderExpenses() {
  return `
    <section class="expenses-page">

      <div class="page-header">

        <h2>折半管理</h2>

        <p>
          二人の支出状況を確認できます。
        </p>

      </div>


      <section class="expense-summary">

        <div class="summary-card">

          <h3>総支出</h3>

          <p id="expense-total"></p>

        </div>


        <div class="summary-card">

          <h3>あなたの負担</h3>

          <p id="expense-my-total"></p>

        </div>


        <div class="summary-card">

          <h3>相手の負担</h3>

          <p id="expense-partner-total"></p>

        </div>

      </section>


        <section class="settlement-card">

        <h3>精算状況</h3>

        <p id="expense-settlement">
            読み込み中...
        </p>

        </section>


      <section class="expense-form-section">

       <h3 id="expense-form-title">
        支出を登録
        </h3>


        <form id="expense-form">

          <div class="form-group">

            <label for="expense-date">
              購入日時
            </label>

            <input
              id="expense-date"
              name="expense-date"
              type="datetime-local"
              required
            />

          </div>


          <div class="form-group">

            <label for="expense-item">
              購入品
            </label>

            <input
              id="expense-item"
              name="expense-item"
              type="text"
              placeholder="例：スーパー"
              maxlength="100"
              required
            />

          </div>


          <div class="form-group">

            <label for="expense-payer">
              負担者
            </label>

            <select
              id="expense-payer"
              name="expense-payer"
              required
            >
              <option value="">
                読み込み中...
              </option>
            </select>

          </div>


          <div class="form-group">

            <label for="expense-amount">
              負担金額
            </label>

            <div class="amount-input">

              <input
                id="expense-amount"
                name="expense-amount"
                type="number"
                min="1"
                step="1"
                placeholder="5000"
                required
              />

              <span>円</span>

            </div>

          </div>


          <button type="submit">
            支出を登録
          </button>


          <button
            id="cancel-edit-button"
            type="button"
            hidden
          >
            編集をキャンセル
          </button>

        </form>

      </section>


      <section class="expense-history">

        <div class="section-header">

          <h3>支出履歴</h3>


          <select id="expense-filter">

            <option value="all">
              全期間
            </option>

            <option value="this-month">
              今月
            </option>

          </select>

        </div>


        <div class="table-wrapper">

          <table>

            <thead>

              <tr>
                <th>日時</th>
                <th>購入品</th>
                <th>負担者</th>
                <th>金額</th>
                <th>操作</th>
              </tr>

            </thead>


            <tbody id="expense-list"></tbody>

          </table>

        </div>

      </section>

    </section>
  `;
}


/*
 * 支出詳細画面
 */
export function renderExpenseDetail() {
  return `
    <section class="expense-detail-page">

      <div class="page-header">

        <h2>支出詳細</h2>

        <p>
          登録されている支出の詳細を確認できます。
        </p>

      </div>


      <div
        id="expense-detail-content"
        class="detail-card"
      >
        <p>読み込み中...</p>
      </div>


      <div class="detail-actions">

        <a
          href="#expenses"
          class="secondary-button"
        >
          戻る
        </a>


        <button
          id="edit-detail-button"
          type="button"
        >
          編集
        </button>


        <button
          id="delete-detail-button"
          type="button"
        >
          削除
        </button>

      </div>

    </section>
  `;
}


/*
 * 支出一覧画面の初期化
 */
export async function initializeExpenses({
  editExpenseId = null,
} = {}) {

  currentMember =
    await getCurrentMember();


  householdMembers =
    await listHouseholdMembers(
      currentMember.householdId
    );


  renderPayerOptions();


  const form =
    document.querySelector(
      "#expense-form"
    );

  form.addEventListener(
    "submit",
    handleExpenseSubmit
  );


  const cancelButton =
    document.querySelector(
      "#cancel-edit-button"
    );

  cancelButton.addEventListener(
    "click",
    cancelEdit
  );


  const expenseList =
    document.querySelector(
      "#expense-list"
    );

  expenseList.addEventListener(
    "click",
    handleExpenseAction
  );


  const filter =
    document.querySelector(
      "#expense-filter"
    );

  filter.value =
    selectedExpenseFilter;


  filter.addEventListener(
    "change",
    (event) => {

      selectedExpenseFilter =
        event.target.value;

      renderSummary();
      renderExpenseRows();
    }
  );


  await loadExpenses();


  if (editExpenseId) {
    startEditExpense(
      editExpenseId
    );
  }
}


/*
 * 支出詳細画面の初期化
 */
export async function initializeExpenseDetail(
  expenseId
) {

  const member =
    await getCurrentMember();


  const expense =
    await getExpenseById(
      member.householdId,
      expenseId
    );


  const content =
    document.querySelector(
      "#expense-detail-content"
    );


  if (!expense) {

    content.textContent =
      "指定された支出が見つかりません。";

    return;
  }


  const detailList =
    document.createElement("dl");

  detailList.className =
    "expense-detail-list";


  const fields = [
    [
      "購入日時",
      formatDateTime(
        expense.occurredAt
      ),
    ],
    [
      "購入品",
      expense.itemName,
    ],
    [
      "負担者",
      expense.payerName,
    ],
    [
      "金額",
      formatYen(expense.amount),
    ],
    [
      "支出ID",
      expense.id,
    ],
  ];


  fields.forEach(([label, value]) => {

    const wrapper =
      document.createElement("div");


    const term =
      document.createElement("dt");

    term.textContent =
      label;


    const description =
      document.createElement("dd");

    description.textContent =
      value;


    wrapper.append(
      term,
      description
    );


    detailList.append(wrapper);
  });


  content.replaceChildren(
    detailList
  );


  const editButton =
    document.querySelector(
      "#edit-detail-button"
    );


  editButton.addEventListener(
    "click",
    () => {

      window.location.hash =
        `#expenses/edit/${expense.id}`;

    }
  );


  const deleteButton =
    document.querySelector(
      "#delete-detail-button"
    );


  deleteButton.addEventListener(
    "click",
    async () => {

      const shouldDelete =
        window.confirm(
          `「${expense.itemName}」を削除しますか？`
        );


      if (!shouldDelete) {
        return;
      }


      try {

        await deleteExpense(
          member.householdId,
          expense.id
        );


        window.location.hash =
          "#expenses";

      } catch (error) {

        console.error(error);

        alert(error.message);
      }

    }
  );
}