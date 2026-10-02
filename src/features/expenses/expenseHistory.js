import {
  listExpenses,
  deleteExpense,
} from "../../repositories/expenseRepository.js";

import {
  listHouseholdMembers,
} from "../../repositories/householdMemberRepository.js";

import {
  getCurrentMember,
} from "../../services/currentMember.js";


let currentMember = null;
let householdMembers = [];
let loadedExpenses = [];

let selectedPeriod = "all";
let selectedPayer = "all";
let keyword = "";
let currentPage = 1;

const PAGE_SIZE = 50;


/*
 * 金額
 */
function formatYen(amount) {
  return `¥${amount.toLocaleString("ja-JP")}`;
}


/*
 * 日付
 */
function formatDate(dateTime) {
  const date = new Date(dateTime);

  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}


/*
 * 今月
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
 * 先月
 */
function isLastMonth(dateTime) {
  const date = new Date(dateTime);
  const now = new Date();

  const lastMonth =
    new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );

  return (
    date.getFullYear() ===
      lastMonth.getFullYear() &&
    date.getMonth() ===
      lastMonth.getMonth()
  );
}


/*
 * 今年
 */
function isThisYear(dateTime) {
  const date = new Date(dateTime);
  const now = new Date();

  return (
    date.getFullYear() ===
    now.getFullYear()
  );
}


/*
 * 条件に合う支出
 */
function getFilteredExpenses() {

  return loadedExpenses.filter((expense) => {

    /*
     * 期間
     */

    if (selectedPeriod === "this-month") {
      if (!isThisMonth(expense.occurredAt)) {
        return false;
      }
    }


    if (selectedPeriod === "last-month") {
      if (!isLastMonth(expense.occurredAt)) {
        return false;
      }
    }


    if (selectedPeriod === "this-year") {
      if (!isThisYear(expense.occurredAt)) {
        return false;
      }
    }


    /*
     * 負担者
     */

    if (
      selectedPayer !== "all" &&
      expense.payerMemberId !== selectedPayer
    ) {
      return false;
    }


    /*
     * キーワード
     */

    if (keyword) {

      const target =
        expense.itemName
          .toLowerCase();

      if (
        !target.includes(
          keyword.toLowerCase()
        )
      ) {
        return false;
      }
    }


    return true;
  });
}


/*
 * ページング
 */
function getPageExpenses() {

  const filteredExpenses =
    getFilteredExpenses();

  const start =
    (currentPage - 1) * PAGE_SIZE;

  return filteredExpenses.slice(
    start,
    start + PAGE_SIZE
  );
}


/*
 * 件数
 */
function getTotalPages() {

  const total =
    getFilteredExpenses().length;

  return Math.max(
    1,
    Math.ceil(
      total / PAGE_SIZE
    )
  );
}


/*
 * 操作
 */
async function handleOperationChange(event) {

  const select =
    event.target;

  const action =
    select.value;

  const expenseId =
    select.dataset.expenseId;

  if (!action || !expenseId) {
    return;
  }


  select.value = "";


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

    const expense =
      loadedExpenses.find((item) => {
        return item.id === expenseId;
      });

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

      await loadExpenses();

    } catch (error) {

      console.error(error);

      alert(error.message);
    }
  }
}


/*
 * 表示
 */
function renderRows() {

  const list =
    document.querySelector(
      "#expense-history-list"
    );

  list.innerHTML = "";

  const expenses =
    getPageExpenses();


  if (expenses.length === 0) {

    const row =
      document.createElement("tr");

    const cell =
      document.createElement("td");

    cell.colSpan = 5;

    cell.textContent =
      "条件に一致する支出がありません。";

    row.append(cell);

    list.append(row);

    return;
  }


  expenses.forEach((expense) => {

    const row =
      document.createElement("tr");


    const dateCell =
      document.createElement("td");

    dateCell.textContent =
      formatDate(
        expense.occurredAt
      );


    const itemCell =
      document.createElement("td");

    itemCell.textContent =
      expense.itemName;


   const payerCell =
  document.createElement("td");

const payerBadge =
  document.createElement("span");

payerBadge.className =
  "member-badge";

if (expense.payerName === "Daichi") {
  payerBadge.classList.add(
    "member-badge--daichi"
  );
}

if (expense.payerName === "Yayoi") {
  payerBadge.classList.add(
    "member-badge--yayoi"
  );
}

payerBadge.textContent =
  expense.payerName;

payerCell.append(
  payerBadge
);


    const amountCell =
      document.createElement("td");

    amountCell.textContent =
      formatYen(
        expense.amount
      );


    const operationCell =
      document.createElement("td");


    const operation =
      document.createElement("select");

    operation.className =
      "expense-operation";

    operation.dataset.expenseId =
      expense.id;


    operation.innerHTML = `
      <option value="">
        操作
      </option>

      <option value="detail">
        詳細
      </option>

      <option value="edit">
        編集
      </option>

      <option value="delete">
        削除
      </option>
    `;


    operation.addEventListener(
      "change",
      handleOperationChange
    );


    operationCell.append(
      operation
    );


    row.append(
      dateCell,
      itemCell,
      payerCell,
      amountCell,
      operationCell
    );


    list.append(row);
  });
}


/*
 * ページ番号
 */
function renderPagination() {

  const container =
    document.querySelector(
      "#expense-pagination"
    );

  container.innerHTML = "";


  const totalPages =
    getTotalPages();


  const info =
    document.createElement("span");

  info.textContent =
    `${currentPage} / ${totalPages} ページ`;


  const previous =
    document.createElement("button");

  previous.type = "button";

  previous.textContent =
    "前へ";

  previous.disabled =
    currentPage === 1;


  previous.addEventListener(
    "click",
    () => {

      if (currentPage <= 1) {
        return;
      }

      currentPage -= 1;

      renderRows();
      renderPagination();
    }
  );


  const next =
    document.createElement("button");

  next.type = "button";

  next.textContent =
    "次へ";

  next.disabled =
    currentPage >= totalPages;


  next.addEventListener(
    "click",
    () => {

      if (
        currentPage >= totalPages
      ) {
        return;
      }

      currentPage += 1;

      renderRows();
      renderPagination();
    }
  );


  container.append(
    previous,
    info,
    next
  );
}


/*
 * 全体再描画
 */
function renderHistory() {
  renderRows();
  renderPagination();

  const count =
    getFilteredExpenses().length;

  document.querySelector(
    "#expense-history-count"
  ).textContent =
    `${count}件`;
}


/*
 * データ読み込み
 */
async function loadExpenses() {

  loadedExpenses =
    await listExpenses(
      currentMember.householdId
    );


  loadedExpenses.sort((a, b) => {
    return (
      new Date(b.occurredAt) -
      new Date(a.occurredAt)
    );
  });


  currentPage = 1;

  renderHistory();
}


/*
 * 履歴画面
 */
export function renderExpenseHistory() {

  return `
    <section class="expense-history-page">

      <div class="page-header">

        <div>

          <h2>支出履歴</h2>

          <p>
            過去の支出を検索・管理できます。
          </p>

        </div>

        <a
          href="#expenses/new"
          class="primary-action-button"
        >
          ＋ 支出を登録
        </a>

      </div>


      <section class="expense-history-filters">

        <div class="form-group">

          <label for="expense-period">
            期間
          </label>

          <select id="expense-period">

            <option value="all">
              全期間
            </option>

            <option value="this-month">
              今月
            </option>

            <option value="last-month">
              先月
            </option>

            <option value="this-year">
              今年
            </option>

          </select>

        </div>


        <div class="form-group">

          <label for="expense-payer-filter">
            負担者
          </label>

          <select id="expense-payer-filter">

            <option value="all">
              すべて
            </option>

          </select>

        </div>


        <div class="form-group">

          <label for="expense-keyword">
            購入品
          </label>

          <input
            id="expense-keyword"
            type="search"
            placeholder="購入品を検索"
          />

        </div>

      </section>


      <section class="expense-history-card">

        <div class="section-header">

          <div>

            <h3>支出一覧</h3>

            <p id="expense-history-count">
              0件
            </p>

          </div>

        </div>


        <div class="table-wrapper">

          <table>

            <thead>

              <tr>
                <th>日付</th>
                <th>購入品</th>
                <th>負担者</th>
                <th>金額</th>
                <th>操作</th>
              </tr>

            </thead>

            <tbody id="expense-history-list">
            </tbody>

          </table>

        </div>


        <div
          id="expense-pagination"
          class="expense-pagination"
        ></div>

      </section>

    </section>
  `;
}


/*
 * 初期化
 */
export async function initializeExpenseHistory() {

  currentMember =
    await getCurrentMember();


  householdMembers =
    await listHouseholdMembers(
      currentMember.householdId
    );


  const payerFilter =
    document.querySelector(
      "#expense-payer-filter"
    );


  householdMembers.forEach((member) => {

    const option =
      document.createElement("option");

    option.value =
      member.id;

    option.textContent =
      member.displayName;

    payerFilter.append(option);
  });


  const period =
    document.querySelector(
      "#expense-period"
    );


  period.addEventListener(
    "change",
    (event) => {

      selectedPeriod =
        event.target.value;

      currentPage = 1;

      renderHistory();
    }
  );


  payerFilter.addEventListener(
    "change",
    (event) => {

      selectedPayer =
        event.target.value;

      currentPage = 1;

      renderHistory();
    }
  );


  const keywordInput =
    document.querySelector(
      "#expense-keyword"
    );


  keywordInput.addEventListener(
    "input",
    (event) => {

      keyword =
        event.target.value.trim();

      currentPage = 1;

      renderHistory();
    }
  );


  await loadExpenses();
}