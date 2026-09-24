import { supabase } from "../../services/supabase.js";


export function renderLogin() {
  const authRoot =
    document.querySelector("#auth-root");

  authRoot.innerHTML = `
    <main class="login-page">

      <section class="login-card">

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
          ></p>


          <button
            id="login-button"
            type="submit"
          >
            ログイン
          </button>

        </form>

      </section>

    </main>
  `;
}


export function initializeLogin() {
  const form =
    document.querySelector("#login-form");

  form.addEventListener(
    "submit",
    handleLogin
  );
}


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

  const errorElement =
    document.querySelector(
      "#login-error"
    );


  errorElement.textContent = "";

  loginButton.disabled = true;
  loginButton.textContent =
    "ログイン中...";


  const { error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });


  if (error) {
    errorElement.textContent =
      "メールアドレスまたはパスワードが正しくありません。";

    loginButton.disabled = false;
    loginButton.textContent =
      "ログイン";

    return;
  }

  loginButton.disabled = false;
  loginButton.textContent =
    "ログイン";
}