import { expenses } from "./expenseData.js";


function formatYen(amount) {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

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

function getPayerName(payer) {
  if (payer === "me") {
    return "あなた";
  }

  if (payer === "partner") {
    return "彼女";
  }

  return "不明";
}

function calculateSummary() {
  const total = expenses.reduce((sum, expense) => {
    return sum + expense.amount;
  }, 0);

  const myTotal = expenses
    .filter((expense) => expense.payer === "me")
    .reduce((sum, expense) => {
      return sum + expense.amount;
    }, 0);

  const partnerTotal = expenses
    .filter((expense) => expense.payer === "partner")
    .reduce((sum, expense) => {
      return sum + expense.amount;
    }, 0);

  const half = total / 2;

  let settlementText;

  if (myTotal > half) {
    settlementText =
      `彼女 → あなた ${formatYen(myTotal - half)}`;
  } else if (partnerTotal > half) {
    settlementText =
      `あなた → 彼女 ${formatYen(partnerTotal - half)}`;
  } else {
    settlementText = "精算なし";
  }

  return {
    total,
    myTotal,
    partnerTotal,
    settlementText,
  };
}


/*
 * 支出一覧をDOMへ描画する
 */
function renderExpenseRows() {
  const expenseList = document.querySelector("#expense-list");

  expenseList.innerHTML = "";

  expenses.forEach((expense) => {
    const row = document.createElement("tr");

    const dateCell = document.createElement("td");
    dateCell.textContent = formatDateTime(expense.occurredAt);

    const itemCell = document.createElement("td");
    itemCell.textContent = expense.itemName;

    const payerCell = document.createElement("td");
    payerCell.textContent = getPayerName(expense.payer);

    const amountCell = document.createElement("td");
    amountCell.textContent = formatYen(expense.amount);

    const actionCell = document.createElement("td");

    const detailButton = document.createElement("button");
    detailButton.type = "button";
    detailButton.textContent = "詳細";
    detailButton.dataset.action = "detail";
    detailButton.dataset.expenseId = expense.id;

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "編集";
    editButton.dataset.action = "edit";
    editButton.dataset.expenseId = expense.id;


    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "削除";
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.expenseId = expense.id;

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
 * サマリーをDOMへ描画する
 */
function renderSummary() {
  const summary = calculateSummary();

  document.querySelector("#expense-total").textContent =
    formatYen(summary.total);

  document.querySelector("#expense-my-total").textContent =
    formatYen(summary.myTotal);

  document.querySelector("#expense-partner-total").textContent =
    formatYen(summary.partnerTotal);

  document.querySelector("#expense-settlement").textContent =
    summary.settlementText;
}


/*
 * 支出登録
 */
function handleExpenseSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);

  const occurredAt = String(
    formData.get("expense-date") ?? ""
  );

  const itemName = String(
    formData.get("expense-item") ?? ""
  ).trim();

  const payer = String(
    formData.get("expense-payer") ?? ""
  );

  const amount = Number(
    formData.get("expense-amount")
  );


  /*
   * バリデーション
   */

  if (!occurredAt) {
    alert("購入日時を入力してください。");
    return;
  }

  if (!itemName) {
    alert("購入品を入力してください。");
    return;
  }

  if (payer !== "me" && payer !== "partner") {
    alert("負担者を選択してください。");
    return;
  }

  if (!Number.isInteger(amount) || amount < 1) {
    alert("金額は1円以上の整数で入力してください。");
    return;
  }


  /*
   * 新しい支出オブジェクトを作る
   */

 if (editingExpenseId === null) {
  const newExpense = {
    id: crypto.randomUUID(),
    occurredAt,
    itemName,
    payer,
    amount,
  };

  expenses.push(newExpense);
} else {
  const expense = findExpenseById(editingExpenseId);

  if (!expense) {
    return;
  }

  expense.occurredAt = occurredAt;
  expense.itemName = itemName;
  expense.payer = payer;
  expense.amount = amount;

  editingExpenseId = null;
}



  /*
   * 画面を再描画
   */

  const appContent = document.querySelector("#app-content");

  appContent.innerHTML = renderExpenses();

  initializeExpenses();
}


/*
 * 折半管理画面のHTML
 */
export function renderExpenses() {
  return `
    <section class="expenses-page">

      <div class="page-header">
        <h2>折半管理</h2>
        <p>二人の支出状況を確認できます。</p>
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
          <h3>彼女の負担</h3>
          <p id="expense-partner-total"></p>
        </div>

      </section>


      <section class="settlement-card">

        <h3>精算状況</h3>

        <p id="expense-settlement"></p>

      </section>


      <section class="expense-form-section">

        <h3>支出を登録</h3>

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
                選択してください
              </option>

              <option value="me">
                あなた
              </option>

              <option value="partner">
                彼女
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
 * 折半管理画面のイベントを初期化
 */
export function initializeExpenses() {
  renderSummary();
  renderExpenseRows();

  const form = document.querySelector("#expense-form");

  form.addEventListener(
    "submit",
    handleExpenseSubmit
  );

  const expenseList =
    document.querySelector("#expense-list");

  expenseList.addEventListener(
    "click",
    handleExpenseAction
  );

  const cancelButton =
    document.querySelector("#cancel-edit-button");

  cancelButton.addEventListener(
    "click",
    cancelEdit
  );
}

/*
 * 折半管理画面のデータを編集
 */
let editingExpenseId = null;

function findExpenseById(id) {
  return expenses.find((expense) => {
    return expense.id === id;
  });
}

function startEditExpense(expenseId) {
  const expense = findExpenseById(expenseId);

  if (!expense) {
    return;
  }

  editingExpenseId = expenseId;

  const form = document.querySelector("#expense-form");

  form.elements["expense-date"].value =
    expense.occurredAt;

  form.elements["expense-item"].value =
    expense.itemName;

  form.elements["expense-payer"].value =
    expense.payer;

  form.elements["expense-amount"].value =
    expense.amount;

  const submitButton =
    form.querySelector('button[type="submit"]');

  submitButton.textContent = "支出を更新";

  const cancelButton =
    document.querySelector("#cancel-edit-button");

  cancelButton.hidden = false;
}

function cancelEdit() {
  editingExpenseId = null;

  const form = document.querySelector("#expense-form");

  form.reset();

  const submitButton =
    form.querySelector('button[type="submit"]');

  submitButton.textContent = "支出を登録";

  const cancelButton =
    document.querySelector("#cancel-edit-button");

  cancelButton.hidden = true;
}



/*
 * 折半管理画面のデータを削除
 */

function deleteExpense(expenseId) {
  const expense = findExpenseById(expenseId);

  if (!expense) {
    return;
  }

  const shouldDelete = confirm(
    `「${expense.itemName}」を削除しますか？`
  );

  if (!shouldDelete) {
    return;
  }

  const index = expenses.findIndex((expense) => {
    return expense.id === expenseId;
  });

  if (index === -1) {
    return;
  }

  expenses.splice(index, 1);

  const appContent =
    document.querySelector("#app-content");

  appContent.innerHTML = renderExpenses();

  initializeExpenses();
}


//ボタンイベント
function handleExpenseAction(event) {
  const button = event.target.closest("button");

  if (!button) {
    return;
  }

  const action = button.dataset.action;
  const expenseId = button.dataset.expenseId;

  if (!expenseId) {
    return;
  }

  if (action === "edit") {
    startEditExpense(expenseId);
    return;
  }

  if (action === "delete") {
    deleteExpense(expenseId);
    return;
  }

  if (action === "detail") {
    console.log("詳細:", expenseId);
  }
}