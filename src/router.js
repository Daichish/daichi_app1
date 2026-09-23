import { renderHome } from "./features/home/home.js";

import {
  renderExpenses,
  initializeExpenses,
  renderExpenseDetail,
  initializeExpenseDetail,
  startEditExpense,
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
  const hash = window.location.hash.slice(1);

  const [route, action, id] = hash.split("/");

  return {
    route,
    action,
    id,
  };
}


function showPage(route, action, id) {
  // 支出詳細
  if (
    route === "expenses" &&
    action &&
    action !== "edit"
  ) {
    appContent.innerHTML =
      renderExpenseDetail(action);

    initializeExpenseDetail(action);

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

    initializeExpenses();

    startEditExpense(id);

    return;
  }

  // 通常のページ
  const page =
    routes[route] ?? routes.home;

  appContent.innerHTML =
    page.render();

  page.init?.();
}


function router() {
  const {
    route,
    action,
    id,
  } = parseHash();

  showPage(
    route || "home",
    action,
    id
  );
}


window.addEventListener(
  "hashchange",
  router
);

router();