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

function renderExpenseRows() {
  return expenses
    .map((expense) => {
      const payerName =
        expense.payer === "me"
          ? "あなた"
          : "彼女";

      return `
        <tr>
          <td>${formatDateTime(expense.occurredAt)}</td>
          <td>${expense.itemName}</td>
          <td>${payerName}</td>
          <td>${formatYen(expense.amount)}</td>
          <td>
            <button type="button">詳細</button>
            <button type="button">編集</button>
            <button type="button">削除</button>
          </td>
        </tr>
      `;
    })
    .join("");
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

export function renderExpenses() {
  const summary = calculateSummary();

  return `
    <section class="expenses-page">

      <div class="page-header">
        <h2>折半管理</h2>
        <p>二人の支出状況を確認できます。</p>
      </div>

      <section class="expense-summary">

        <div class="summary-card">
          <h3>総支出</h3>
          <p>${formatYen(summary.total)}</p>
        </div>

        <div class="summary-card">
          <h3>あなたの負担</h3>
          <p>${formatYen(summary.myTotal)}</p>
        </div>

        <div class="summary-card">
          <h3>彼女の負担</h3>
          <p>${formatYen(summary.partnerTotal)}</p>
        </div>

      </section>

      <section class="settlement-card">
        <h3>精算状況</h3>
        <p>${summary.settlementText}</p>
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
              <option value="">選択してください</option>
              <option value="me">あなた</option>
              <option value="partner">彼女</option>
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

        </form>
      </section>

      <section class="expense-history">

        <div class="section-header">
          <h3>支出履歴</h3>

          <select id="expense-filter">
            <option value="all">全期間</option>
            <option value="this-month">今月</option>
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

            <tbody id="expense-list">
              ${renderExpenseRows()}
            </tbody>
          </table>
        </div>

      </section>

    </section>
  `;
}