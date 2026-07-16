const themeToggle = document.getElementById("themeToggle");
const body = document.body;

// Default theme is dark
const savedTheme = localStorage.getItem("theme") || "dark";

// Load saved theme
if (savedTheme === "dark") {
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

// Toggle theme
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    body.classList.toggle("dark-mode");

    if (body.classList.contains("dark-mode")) {
      localStorage.setItem("theme", "dark");
      themeToggle.textContent = "☀️";
    } else {
      localStorage.setItem("theme", "light");
      themeToggle.textContent = "🌙";
    }
  });
}

// Hamburger navbar
const navToggle = document.getElementById("navToggle");
const navbar = document.getElementById("dashboardNavbar");

if (navToggle && navbar) {
  navToggle.addEventListener("click", () => {
    navbar.classList.toggle("active");

    if (navbar.classList.contains("active")) {
      navToggle.textContent = "✕";
    } else {
      navToggle.textContent = "☰";
    }
  });
}