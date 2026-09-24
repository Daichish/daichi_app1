import "./styles/main.css";

import {
  renderLogin,
  initializeLogin,
} from "./features/auth/auth.js";

import {
  startRouter,
} from "./router.js";

import {
  supabase,
} from "./services/supabase.js";

import { getCurrentUser } from "./services/auth.js";

import {
  findHouseholdMemberByAuthUserId,
} from "./repositories/householdMemberRepository.js";

const authRoot =
  document.querySelector("#auth-root");

const app =
  document.querySelector("#app");

const userEmail =
  document.querySelector(
    "#current-user-email"
  );


function showLogin() {
  authRoot.hidden = false;
  app.hidden = true;

  renderLogin();
  initializeLogin();
}


function showApp(session) {
  authRoot.hidden = true;
  app.hidden = false;

  userEmail.textContent =
    session.user.email;

  startRouter();
}


function handleAuthStateChange(
  event,
  session
) {
  if (
    (
      event === "SIGNED_IN" ||
      event === "INITIAL_SESSION"
    ) &&
    session
  ) {
    showApp(session);
    return;
  }


  if (
    event === "SIGNED_OUT" ||
    (
      event === "INITIAL_SESSION" &&
      !session
    )
  ) {
    window.location.hash = "";
    showLogin();
  }
}


async function initializeApp() {
  supabase.auth.onAuthStateChange(
    handleAuthStateChange
  );


  const {
    data: {
      session,
    },
  } = await supabase.auth.getSession();


  if (session) {
    showApp(session);
  } else {
    showLogin();
  }


  const logoutButton =
    document.querySelector(
      "#logout-button"
    );


  logoutButton.addEventListener(
    "click",
    async () => {

      const {
        error,
      } = await supabase.auth.signOut({
        scope: "local",
      });


      if (error) {
        console.error(
          "ログアウトに失敗しました。",
          error
        );
      }
    }
  );
}


initializeApp();


const user = await getCurrentUser();

const member =
  await findHouseholdMemberByAuthUserId(
    user.id
  );

console.log("Auth User:", user);
console.log("Household Member:", member);