// ================= THEME TOGGLE =================
const themeToggle = document.getElementById("themeToggle");
const body = document.body;

const savedTheme = localStorage.getItem("theme") || "dark";

function applyTheme(theme) {
  if (theme === "dark") {
    body.classList.add("dark-mode");

    if (themeToggle) {
      themeToggle.textContent = "â˜€ï¸";
    }
  } else {
    body.classList.remove("dark-mode");

    if (themeToggle) {
      themeToggle.textContent = "ðŸŒ™";
    }
  }

  localStorage.setItem("theme", theme);
}

applyTheme(savedTheme);

if (themeToggle) {
  themeToggle.addEventListener("click", function () {
    if (body.classList.contains("dark-mode")) {
      applyTheme("light");
    } else {
      applyTheme("dark");
    }
  });
}

// ================= HAMBURGER MENU =================
const navToggle = document.getElementById("navToggle");

const navbar =
  document.getElementById("loginNavbar") ||
  document.getElementById("dashboardNavbar") ||
  document.querySelector(".navbar");

if (navToggle && navbar) {
  navToggle.addEventListener("click", function () {
    navbar.classList.toggle("active");

    if (navbar.classList.contains("active")) {
      navToggle.textContent = "âœ•";
    } else {
      navToggle.textContent = "â˜°";
    }
  });
}
// ================= HOME NAVIGATION =================
const homeNavToggle = document.getElementById("homeNavToggle");
const homeNavbar = document.getElementById("homeNavbar");

if (homeNavToggle && homeNavbar) {
  homeNavToggle.addEventListener("click", function () {
    const isOpen = homeNavbar.classList.toggle("active");
    homeNavToggle.setAttribute("aria-expanded", String(isOpen));
  });

  homeNavbar.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      homeNavbar.classList.remove("active");
      homeNavToggle.setAttribute("aria-expanded", "false");
    });
  });
}

// Hide navbar when scrolling down, show it when scrolling up
const scrollNavbar =
  document.getElementById("homeNavbar") ||
  document.getElementById("loginNavbar") ||
  document.getElementById("dashboardNavbar") ||
  document.querySelector(".navbar");

let previousScrollY = window.scrollY;

if (scrollNavbar) {
  window.addEventListener(
    "scroll",
    () => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > previousScrollY;

      scrollNavbar.classList.toggle(
        "navbar-scroll-hidden",
        scrollingDown && currentScrollY > scrollNavbar.offsetHeight
      );

      previousScrollY = Math.max(currentScrollY, 0);
    },
    { passive: true }
  );
}

// ================= ACTIVE SCREEN TIME ANALYTICS =================
if (typeof fetch === "function") {
  const activityId =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
          const randomValue = (Math.random() * 16) | 0;
          const value = character === "x" ? randomValue : (randomValue & 3) | 8;
          return value.toString(16);
        });

  let lastHeartbeatAt = Date.now();

  function sendScreenTimeHeartbeat(force = false) {
    if (!force && document.visibilityState !== "visible") return;

    const now = Date.now();
    const activeSeconds = Math.min(
      Math.max(Math.round((now - lastHeartbeatAt) / 1000), 0),
      30
    );

    lastHeartbeatAt = now;

    fetch("/analytics/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      keepalive: true,
      body: JSON.stringify({
        activityId,
        path: window.location.pathname,
        activeSeconds,
      }),
    }).catch(() => {});
  }

  fetch("/analytics/heartbeat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      activityId,
      path: window.location.pathname,
      activeSeconds: 0,
    }),
  }).catch(() => {});

  const heartbeatTimer = window.setInterval(sendScreenTimeHeartbeat, 15000);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      sendScreenTimeHeartbeat(true);
    } else {
      lastHeartbeatAt = Date.now();
    }
  });

  window.addEventListener("pagehide", () => {
    sendScreenTimeHeartbeat(true);
    window.clearInterval(heartbeatTimer);
  });
}
