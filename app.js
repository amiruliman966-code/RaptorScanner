require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");

const db = require("./config/db");
const passport = require("./config/passport");

const authRoutes = require("./routes/authRoutes");
const scanRoutes = require("./routes/scanRoutes");
const adminRoutes = require("./routes/adminRoutes");
const profileRoutes = require("./routes/profileRoutes");
const {
  analyticsRouter,
  initializeAnalyticsTables,
  trackPageView,
} = require("./services/analyticsService");
const {
  initializeIndicatorHistoryTable,
} = require("./services/indicatorHistoryService");

const app = express();

// ================= MIDDLEWARE =================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ================= STATIC FILES =================
app.use(express.static(path.join(__dirname, "public")));

// If you use uploaded profile pictures or uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// ================= PREVENT CACHE AFTER LOGOUT =================
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// ================= EJS SETUP =================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ================= SESSION SETUP =================
app.use(
  session({
    secret: process.env.SESSION_SECRET || "raptorscanner_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

// ================= PASSPORT SETUP =================
app.use(passport.initialize());

// ================= PRIVACY-FRIENDLY SITE ANALYTICS =================
app.use(trackPageView);
app.use(analyticsRouter);

// ================= ADMIN CONTENT MIDDLEWARE =================
// This allows admin-added text/images/ads to appear on selected pages
app.use(async (req, res, next) => {
  try {
    let pageName = "all";

    if (req.path === "/") {
      pageName = "home";
    } else if (req.path === "/login") {
      pageName = "login";
    } else if (req.path === "/register") {
      pageName = "register";
    } else if (req.path === "/dashboard") {
      pageName = "dashboard";
    } else if (req.path === "/history") {
      pageName = "history";
    } else if (req.path === "/profile") {
      pageName = "profile";
    } else if (req.path === "/admin") {
      pageName = "admin";
    } else if (req.path.includes("search")) {
      pageName = "search";
    }

    const [contents] = await db.query(
      `SELECT * FROM admin_contents
       WHERE is_active = 1
       AND (page_name = ? OR page_name = 'all')
       ORDER BY created_at DESC`,
      [pageName]
    );

    res.locals.adminContents = contents;
    next();
  } catch (err) {
    console.error("ADMIN CONTENT MIDDLEWARE ERROR:", err);
    res.locals.adminContents = [];
    next();
  }
});

// ================= HOME PAGE =================
app.get("/", (req, res) => {
  res.render("home", {
    user: req.session.user || null,
  });
});

// ================= ROUTES =================
app.use("/", authRoutes);
app.use("/", scanRoutes);
app.use("/", adminRoutes);
app.use("/", profileRoutes);

// ================= 404 PAGE =================
app.use((req, res) => {
  res.status(404).send(`
    <div style="font-family: Arial; text-align: center; margin-top: 80px;">
      <h1>404 - Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <a href="/">Back to Home</a>
    </div>
  `);
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await initializeAnalyticsTables();
    console.log("Analytics tables ready");
  } catch (error) {
    console.error("ANALYTICS TABLE SETUP ERROR:", error.message);
  }

  try {
    await initializeIndicatorHistoryTable();
    console.log("Indicator history table ready");
  } catch (error) {
    console.error("INDICATOR HISTORY TABLE SETUP ERROR:", error.message);
  }

  app.listen(PORT, () => {
    console.log(`RaptorScanner running on http://localhost:${PORT}`);

    if (process.env.GOOGLE_CLIENT_ID) {
      console.log("Google Client ID loaded");
    } else {
      console.log("Google Client ID missing");
    }
  });
}

startServer();
