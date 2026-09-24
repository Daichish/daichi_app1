import { renderHome } from "./features/home/home.js";

import {
  renderExpenses,
  initializeExpenses,
  renderExpenseDetail,
  initializeExpenseDetail,
} from "./features/expenses/expenses.js";

import {
  renderChores,
  initializeChores,
} from "./features/chores/chores.js";


const appContent =
  document.querySelector("#app-content");


const routes = {
  home: {
    render: renderHome,
  },

  expenses: {
    render: renderExpenses,
    init: initializeExpenses,
  },

  chores: {
    render: renderChores,
    init: initializeChores,
  },
};


function parseHash() {
  const hash =
    window.location.hash.slice(1);

  const [route, action, id] =
    hash.split("/");

  return {
    route,
    action,
    id,
  };
}


async function showPage(
  route,
  action,
  id
) {

  // 支出詳細
  if (
    route === "expenses" &&
    action &&
    action !== "edit"
  ) {
    appContent.innerHTML =
      renderExpenseDetail();

    await initializeExpenseDetail(action);

    return;
  }


  // 支出編集
  if (
    route === "expenses" &&
    action === "edit" &&
    id
  ) {
    appContent.innerHTML =
      renderExpenses();

    await initializeExpenses({
      editExpenseId: id,
    });

    return;
  }


  // 通常のページ
  const page =
    routes[route] ?? routes.home;

  appContent.innerHTML =
    page.render();

  await page.init?.();
}


async function router() {
  const {
    route,
    action,
    id,
  } = parseHash();

  await showPage(
    route || "home",
    action,
    id
  );
}


let routerStarted = false;


export function startRouter() {
  if (routerStarted) {
    void router();
    return;
  }

  window.addEventListener(
    "hashchange",
    () => {
      void router();
    }
  );

  routerStarted = true;

  void router();
}