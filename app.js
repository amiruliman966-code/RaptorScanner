const express = require("express");
const session = require("express-session");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const scanRoutes = require("./routes/scanRoutes");
const passport = require("./config/passport");

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

// Prevent browser from showing cached protected pages after logout
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// EJS setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || "raptorscanner_secret",
    resave: false,
    saveUninitialized: false,
  })
);

// Passport setup for Google login
app.use(passport.initialize());

// Home page
app.get("/", (req, res) => {
  res.render("home", {
    user: req.session.user || null,
  });
});

// Routes
app.use("/", authRoutes);
app.use("/", scanRoutes);

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`RaptorScanner running on http://localhost:${PORT}`);
});