const routes = {
  home: document.querySelector("#home"),
  expenses: document.querySelector("#expenses"),
  chores: document.querySelector("#chores"),
};

function showPage(route) {
  Object.values(routes).forEach((page) => {
    page.hidden = true;
  });

  const targetPage = routes[route];

  if (targetPage) {
    targetPage.hidden = false;
  } else {
    routes.home.hidden = false;
  }
}

function router() {
  const route = window.location.hash.slice(1);

  showPage(route || "home");
}

window.addEventListener("hashchange", router);

router();