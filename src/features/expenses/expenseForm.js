import {
  getExpenseById,
  createExpense,
  updateExpense,
} from "../../repositories/expenseRepository.js";

import {
  listHouseholdMembers,
} from "../../repositories/householdMemberRepository.js";

import {
  getCurrentMember,
} from "../../services/currentMember.js";


let currentMember = null;
let householdMembers = [];
let editingExpenseId = null;


/*
 * DBの日時 → input[type=date]
 */
function toDateInputValue(dateTime) {
  const date = new Date(dateTime);

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
 * date → DB保存用日時
 *
 * DBの既存カラムはそのまま使う。
 * 選択した日の0:00として保存する。
 */
function dateToOccurredAt(dateValue) {
  const [year, month, day] =
    dateValue.split("-").map(Number);

  const date = new Date(
    year,
    month - 1,
    day,
    0,
    0,
    0
  );

  return date.toISOString();
}


/*
 * 金額
 */
function formatYen(amount) {
  return `¥${amount.toLocaleString("ja-JP")}`;
}


/*
 * 負担者選択肢
 */
/*
 * 選択中の負担者をバッジで表示
 */
function renderSelectedPayerBadge() {
  const select =
    document.querySelector(
      "#expense-payer"
    );

  const badge =
    document.querySelector(
      "#expense-payer-badge"
    );

  if (!select || !badge) {
    return;
  }

  const selectedMember =
    householdMembers.find((member) => {
      return member.id === select.value;
    });

  if (!selectedMember) {
    badge.innerHTML = "";
    return;
  }

  const badgeElement =
    document.createElement("span");

  badgeElement.className =
    "member-badge";

  if (selectedMember.displayName === "Daichi") {
    badgeElement.classList.add(
      "member-badge--daichi"
    );
  } else if (
    selectedMember.displayName === "Yayoi"
  ) {
    badgeElement.classList.add(
      "member-badge--yayoi"
    );
  }

  badgeElement.textContent =
    selectedMember.displayName;

  badge.replaceChildren(badgeElement);
}


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

  renderSelectedPayerBadge();
}


/*
 * 編集対象をフォームに設定
 */
async function loadExpenseForEdit(expenseId) {
  const expense =
    await getExpenseById(
      currentMember.householdId,
      expenseId
    );

  if (!expense) {
    alert(
      "指定された支出が見つかりません。"
    );

    window.location.hash =
      "#expenses";

    return;
  }

  const form =
    document.querySelector(
      "#expense-form"
    );

  form.elements["expense-date"].value =
    toDateInputValue(
      expense.occurredAt
    );

  form.elements["expense-item"].value =
    expense.itemName;

  form.elements["expense-payer"].value =
    expense.payerMemberId;

    renderSelectedPayerBadge();

  form.elements["expense-amount"].value =
    expense.amount;

  document.querySelector(
    "#expense-form-title"
  ).textContent =
    "支出を編集";

  form.querySelector(
    'button[type="submit"]'
  ).textContent =
    "支出を更新";
}


/*
 * 登録・更新
 */
async function handleSubmit(event) {
  event.preventDefault();

  const form =
    event.currentTarget;

  const formData =
    new FormData(form);

  const dateValue =
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

  if (!dateValue) {
    alert(
      "購入日を入力してください。"
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

  submitButton.disabled = true;


  try {
    const occurredAt =
      dateToOccurredAt(dateValue);

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


    window.location.hash =
      "#expenses/history";

  } catch (error) {

    console.error(error);

    alert(error.message);

  } finally {

    submitButton.disabled = false;
  }
}


/*
 * 支出登録・編集画面
 */
export function renderExpenseForm() {
  return `
    <section class="expense-form-page">

      <div class="page-header">

        <h2 id="expense-form-title">
          支出を登録
        </h2>

        <p>
          支出内容を入力してください。
        </p>

      </div>


      <section class="expense-form-card">

        <form id="expense-form">

          <div class="form-group">

            <label for="expense-date">
              購入日
            </label>

            <input
              id="expense-date"
              name="expense-date"
              type="date"
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
              maxlength="100"
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
      読み込み中...
    </option>
  </select>

  <div
    id="expense-payer-badge"
    class="selected-member-display"
  ></div>

</div>


          <div class="form-group">

            <label for="expense-amount">
              金額
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


          <div class="form-actions">

            <a
              href="#expenses"
              class="secondary-action-button"
            >
              キャンセル
            </a>

            <button type="submit">
              支出を登録
            </button>

          </div>

        </form>

      </section>

    </section>
  `;
}


/*
 * 初期化
 */
export async function initializeExpenseForm({
  editExpenseId = null,
} = {}) {

  currentMember =
    await getCurrentMember();

  householdMembers =
    await listHouseholdMembers(
      currentMember.householdId
    );

  renderPayerOptions();


  const payerSelect =
  document.querySelector(
    "#expense-payer"
  );

payerSelect.addEventListener(
  "change",
  () => {
    renderSelectedPayerBadge();
  }
);

  const form =
    document.querySelector(
      "#expense-form"
    );

  form.addEventListener(
    "submit",
    handleSubmit
  );


  editingExpenseId =
    editExpenseId;


  if (editExpenseId) {
    await loadExpenseForEdit(
      editExpenseId
    );
  }
}