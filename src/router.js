import { renderHome } from "./features/home/home.js";
import {
  renderExpenses,
  initializeExpenses,
} from "./features/expenses/expenses.js";
import { renderChores } from "./features/chores/chores.js";

const appContent = document.querySelector("#app-content");

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
  },
};

function showPage(route) {
  const page = routes[route] ?? routes.home;

  appContent.innerHTML = page.render();

  page.init?.();
}

function router() {
  const route = window.location.hash.slice(1);

  showPage(route || "home");
}

window.addEventListener("hashchange", router);

router();