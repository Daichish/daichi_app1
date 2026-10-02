import "./styles/main.css";

import {
  getCurrentUser,
} from "./services/auth.js";

import {
  supabase,
} from "./services/supabase.js";

import {
  renderExpenses,
  initializeExpenses,
} from "./features/expenses/expenses.js";

import {
  renderExpenseForm,
  initializeExpenseForm,
} from "./features/expenses/expenseForm.js";

import {
  renderExpenseHistory,
  initializeExpenseHistory,
} from "./features/expenses/expenseHistory.js";

import {
  renderExpenseDetail,
  initializeExpenseDetail,
} from "./features/expenses/expenseDetail.js";

import {
  renderChores,
  initializeChores,
} from "./features/chores/chores.js";


const authRoot =
  document.querySelector("#auth-root");

const app =
  document.querySelector("#app");

const appContent =
  document.querySelector("#app-content");

const currentUserEmail =
  document.querySelector(
    "#current-user-email"
  );

const logoutButton =
  document.querySelector(
    "#logout-button"
  );


/*
 * ログイン画面
 */
function renderLogin() {
  return `
    <section class="login-page">

      <div class="login-card">

        <h1>二人暮らし管理</h1>

        <p class="login-description">
          ログインしてください。
        </p>


        <form id="login-form">

          <div class="form-group">

            <label for="login-email">
              メールアドレス
            </label>

            <input
              id="login-email"
              name="email"
              type="email"
              autocomplete="email"
              required
            />

          </div>


          <div class="form-group">

            <label for="login-password">
              パスワード
            </label>

            <input
              id="login-password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
            />

          </div>


          <p
            id="login-error"
            class="login-error"
            aria-live="polite"
          ></p>


          <button
            id="login-button"
            type="submit"
          >
            ログイン
          </button>

        </form>

      </div>

    </section>
  `;
}


/*
 * ログイン処理
 */
async function handleLogin(event) {
  event.preventDefault();

  const form =
    event.currentTarget;

  const formData =
    new FormData(form);

  const email =
    String(
      formData.get("email") ?? ""
    ).trim();

  const password =
    String(
      formData.get("password") ?? ""
    );

  const loginButton =
    document.querySelector(
      "#login-button"
    );

  const errorMessage =
    document.querySelector(
      "#login-error"
    );


  errorMessage.textContent = "";

  loginButton.disabled = true;

  loginButton.textContent =
    "ログイン中...";


  try {

    const {
      error,
    } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });


    if (error) {
      throw error;
    }


    /*
     * ログイン成功後に画面を更新
     */
    await initializeApp();

  } catch (error) {

    console.error(error);

    errorMessage.textContent =
      "メールアドレスまたはパスワードが正しくありません。";

  } finally {

    loginButton.disabled = false;

    loginButton.textContent =
      "ログイン";
  }
}


/*
 * ログイン画面を初期化
 */
function initializeLogin() {

  authRoot.innerHTML =
    renderLogin();

  app.hidden = true;


  const form =
    document.querySelector(
      "#login-form"
    );

  form.addEventListener(
    "submit",
    handleLogin
  );
}


/*
 * 共通ローディング
 */
const globalLoading =
  document.querySelector("#global-loading");


function showLoading() {
  globalLoading.hidden = false;
}


function hideLoading() {
  globalLoading.hidden = true;
}
/*
 * 共通エラー画面
 */
function renderPageError(error) {

  console.error(error);

  appContent.innerHTML = `
    <section class="page-error">

      <h2>
        エラーが発生しました
      </h2>

      <p>
        データの読み込みに失敗しました。
      </p>

      <button
        id="retry-button"
        type="button"
      >
        再読み込み
      </button>

    </section>
  `;


  document
    .querySelector("#retry-button")
    .addEventListener(
      "click",
      () => {
        void handleRoute();
      }
    );
}


/*
 * 現在のユーザー情報をヘッダーに表示
 */
function renderCurrentUser(user) {

  currentUserEmail.textContent =
    user?.email ?? "";
}


/*
 * ログアウト
 */
async function handleLogout() {

  const shouldLogout =
    window.confirm(
      "ログアウトしますか？"
    );

  if (!shouldLogout) {
    return;
  }


  logoutButton.disabled = true;


  try {

    const {
      error,
    } =
      await supabase.auth.signOut();


    if (error) {
      throw error;
    }

    window.location.hash =
      "#home";

    initializeLogin();

  } catch (error) {

    console.error(error);

    alert(
      "ログアウトに失敗しました。"
    );

  } finally {

    logoutButton.disabled = false;
  }
}


/*
 * ルーティング
 */
async function handleRoute() {
  const hash =
    window.location.hash;

  if (!hash) {
    window.location.hash = "#home";
    return;
  }

  showLoading();

  try {
    if (hash === "#home") {
      appContent.innerHTML = `
        <section class="page-header">
          <h2>トップ</h2>
          <p>
            二人暮らし管理へようこそ。
          </p>
        </section>

        <section class="home-links">
          <a
            href="#expenses"
            class="home-link-card"
          >
            <h3>折半管理</h3>
            <p>
              今月の支出状況を確認します。
            </p>
          </a>

          <a
            href="#chores"
            class="home-link-card"
          >
            <h3>家事当番</h3>
            <p>
              今週の家事当番を確認します。
            </p>
          </a>
        </section>
      `;

      return;
    }

    if (hash === "#expenses") {
      appContent.innerHTML =
        renderExpenses();

      await initializeExpenses();

      return;
    }

    if (hash === "#expenses/new") {
      appContent.innerHTML =
        renderExpenseForm();

      await initializeExpenseForm();

      return;
    }

    if (hash === "#expenses/history") {
      appContent.innerHTML =
        renderExpenseHistory();

      await initializeExpenseHistory();

      return;
    }

    const editMatch =
      hash.match(
        /^#expenses\/edit\/([^/]+)$/
      );

    if (editMatch) {
      const expenseId =
        editMatch[1];

      appContent.innerHTML =
        renderExpenseForm();

      await initializeExpenseForm({
        editExpenseId:
          expenseId,
      });

      return;
    }

    const detailMatch =
      hash.match(
        /^#expenses\/([^/]+)$/
      );

    if (detailMatch) {
      const expenseId =
        detailMatch[1];

      appContent.innerHTML =
        renderExpenseDetail();

      await initializeExpenseDetail(
        expenseId
      );

      return;
    }

    if (hash === "#chores") {
      appContent.innerHTML =
        renderChores();

      await initializeChores();

      return;
    }

    appContent.innerHTML = `
      <section class="page-error">
        <h2>
          ページが見つかりません
        </h2>

        <p>
          指定されたページは存在しません。
        </p>

        <a
          href="#home"
          class="primary-action-button"
        >
          トップへ戻る
        </a>
      </section>
    `;

  } catch (error) {
    renderPageError(error);

  } finally {
    hideLoading();
  }
}

/*
 * アプリ初期化
 */
async function initializeApp() {
  const user =
    await getCurrentUser();


  if (!user) {
    initializeLogin();
    return;
  }


  authRoot.innerHTML = "";

  app.hidden = false;

  renderCurrentUser(user);

  await handleRoute();
}

/*
 * URLが変わったらルーティング
 */
window.addEventListener(
  "hashchange",
  () => {
    void handleRoute();
  }
);


/*
 * ログアウト
 */
logoutButton.addEventListener(
  "click",
  () => {
    void handleLogout();
  }
);


/*
 * Supabaseの認証状態が変わった場合
 */
supabase.auth.onAuthStateChange(
  (event, session) => {

    if (!session) {

      authRoot.innerHTML =
        renderLogin();

      initializeLogin();

      return;
    }

    app.hidden = false;

    renderCurrentUser(
      session.user
    );
  }
);


/*
 * 起動
 */
void initializeApp();