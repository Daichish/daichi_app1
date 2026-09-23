import { renderHome } from "./features/home/home.js";
import { renderExpenses } from "./features/expenses/expenses.js";
import { renderChores } from "./features/chores/chores.js";

const appContent = document.querySelector("#app-content");

const routes = {
  home: renderHome,
  expenses: renderExpenses,
  chores: renderChores,
};

function showPage(route) {
  const render = routes[route] ?? routes.home;

  appContent.innerHTML = render();
}

function router() {
  const route = window.location.hash.slice(1);

  showPage(route || "home");
}

window.addEventListener("hashchange", router);

router();