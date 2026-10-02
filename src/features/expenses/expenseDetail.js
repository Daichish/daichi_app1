import {
  getExpenseById,
  deleteExpense,
} from "../../repositories/expenseRepository.js";

import {
  getCurrentMember,
} from "../../services/currentMember.js";


function formatYen(amount) {
  return `¥${amount.toLocaleString("ja-JP")}`;
}


function formatDate(dateTime) {
  const date = new Date(dateTime);

  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}


/*
 * 詳細画面
 */
export function renderExpenseDetail() {

  return `
    <section class="expense-detail-page">

      <div class="page-header">

        <h2>支出詳細</h2>

        <p>
          支出の詳細を確認できます。
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
          href="#expenses/history"
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
 * 初期化
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
      "購入日",
      formatDate(
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
      formatYen(
        expense.amount
      ),
    ],

    [
      "支出ID",
      expense.id,
    ],

  ];


  fields.forEach(
    ([label, value]) => {

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
    }
  );


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
          "#expenses/history";

      } catch (error) {

        console.error(error);

        alert(error.message);
      }
    }
  );
}