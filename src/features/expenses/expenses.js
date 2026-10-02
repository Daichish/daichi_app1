import {
  listExpenses,
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


/*
 * 金額表示
 */
function formatYen(amount) {
  return `¥${amount.toLocaleString("ja-JP")}`;
}


/*
 * 日付表示
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
 * 相手の名前
 */
function getPartnerDisplayName() {
  const partner = householdMembers.find((member) => {
    return member.id !== currentMember.id;
  });

  return partner?.displayName ?? "相手";
}





/*
 * 今月の集計
 */
function calculateSummary() {
  const expenses = loadedExpenses;

  const total = expenses.reduce((sum, expense) => {
    return sum + expense.amount;
  }, 0);

  const myTotal = expenses
    .filter((expense) => {
      return expense.payerMemberId === currentMember.id;
    })
    .reduce((sum, expense) => {
      return sum + expense.amount;
    }, 0);

  const partnerTotal = expenses
    .filter((expense) => {
      return expense.payerMemberId !== currentMember.id;
    })
    .reduce((sum, expense) => {
      return sum + expense.amount;
    }, 0);

  const half = total / 2;

  let settlementText;

  if (myTotal > half) {
    settlementText =
      `${getPartnerDisplayName()} → ` +
      `${currentMember.displayName} ` +
      `${formatYen(myTotal - half)}`;

  } else if (partnerTotal > half) {
    settlementText =
      `${currentMember.displayName} → ` +
      `${getPartnerDisplayName()} ` +
      `${formatYen(partnerTotal - half)}`;

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
 * 最近の支出
 */
function getRecentExpenses() {
  return [...loadedExpenses]
    .sort((a, b) => {
      return (
        new Date(b.occurredAt) -
        new Date(a.occurredAt)
      );
    })
    .slice(0, 10);
}


/*
 * 集計表示
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

    document.querySelector(
  "#expense-my-label"
).textContent =
  `${currentMember.displayName}の負担`;

document.querySelector(
  "#expense-partner-label"
).textContent =
  `${getPartnerDisplayName()}の負担`;
}


/*
 * 最近の支出を表示
 */
function renderRecentExpenses() {
  const list = document.querySelector(
    "#recent-expense-list"
  );

  list.innerHTML = "";

  const expenses = getRecentExpenses();

  if (expenses.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 4;
    cell.textContent = "まだ支出がありません。";

    row.append(cell);
    list.append(row);

    return;
  }

  expenses.forEach((expense) => {
    const row = document.createElement("tr");

    const dateCell = document.createElement("td");
    dateCell.textContent =
      formatDate(expense.occurredAt);

    const itemCell = document.createElement("td");
    itemCell.textContent = expense.itemName;

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

    const amountCell = document.createElement("td");
    amountCell.textContent =
      formatYen(expense.amount);

    row.append(
      dateCell,
      itemCell,
      payerCell,
      amountCell
    );

    row.style.cursor = "pointer";

    row.addEventListener("click", () => {
      window.location.hash =
        `#expenses/${expense.id}`;
    });

    list.append(row);
  });
}


/*
 * Supabaseから取得
 */
async function loadExpenses() {
  loadedExpenses =
    await listExpenses(
      currentMember.householdId
    );

  renderSummary();
  renderRecentExpenses();
}


/*
 * 折半管理トップ画面
 */
export function renderExpenses() {
  return `
    <section class="expenses-page">

      <div class="page-header">
        <h2>折半管理</h2>

        <p>
          全期間の支出状況を確認できます。
        </p>
      </div>


      <section class="expense-summary">

        <div class="summary-card">
          <h3>総支出</h3>
          <p id="expense-total"></p>
        </div>


        <div class="summary-card">
          <h3 id="expense-my-label"></h3>
          <p id="expense-my-total"></p>
        </div>


        <div class="summary-card">
          <h3 id="expense-partner-label"></h3>
          <p id="expense-partner-total"></p>
        </div>

      </section>


      <section class="settlement-card">

        <h3>精算状況</h3>

        <p id="expense-settlement"></p>

      </section>


      <section class="expense-dashboard-actions">

        <a
          href="#expenses/new"
          class="primary-action-button"
        >
          ＋ 支出を登録
        </a>

        <a
          href="#expenses/history"
          class="secondary-action-button"
        >
          支出履歴を見る
        </a>

      </section>


      <section class="recent-expenses">

        <div class="section-header">

          <div>
            <h3>最近の支出</h3>
            <p>最新10件を表示しています。</p>
          </div>

          <a href="#expenses/history">
            すべて見る
          </a>

        </div>


        <div class="table-wrapper">

          <table>

            <thead>
              <tr>
                <th>日付</th>
                <th>購入品</th>
                <th>負担者</th>
                <th>金額</th>
              </tr>
            </thead>

            <tbody id="recent-expense-list"></tbody>

          </table>

        </div>

      </section>

    </section>
  `;
}


/*
 * 折半管理トップ初期化
 */
export async function initializeExpenses() {
  currentMember =
    await getCurrentMember();

  householdMembers =
    await listHouseholdMembers(
      currentMember.householdId
    );

  await loadExpenses();
}