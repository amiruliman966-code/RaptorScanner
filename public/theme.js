// ================= THEME TOGGLE =================
document.addEventListener("DOMContentLoaded", function () {
  const themeToggle = document.getElementById("themeToggle");
  const body = document.body;

  const savedTheme = localStorage.getItem("theme") || "dark";

  function applyTheme(theme) {
    if (theme === "dark") {
      body.classList.add("dark-mode");

      if (themeToggle) {
        themeToggle.textContent = "☀️";
      }
    } else {
      body.classList.remove("dark-mode");

      if (themeToggle) {
        themeToggle.textContent = "🌙";
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
  const navbar = document.getElementById("dashboardNavbar") || document.querySelector(".navbar");

  if (navToggle && navbar) {
    navToggle.addEventListener("click", function () {
      navbar.classList.toggle("active");

      if (navbar.classList.contains("active")) {
        navToggle.textContent = "✕";
      } else {
        navToggle.textContent = "☰";
      }
    });
  }
});
// ================= HOME PAGE HAMBURGER =================
const homeNavToggle = document.getElementById("homeNavToggle");
const homeNavbar = document.getElementById("homeNavbar");

if (homeNavToggle && homeNavbar) {
  homeNavToggle.addEventListener("click", function () {
    homeNavbar.classList.toggle("active");

    if (homeNavbar.classList.contains("active")) {
      homeNavToggle.textContent = "✕";
    } else {
      homeNavToggle.textContent = "☰";
    }
  });
}
