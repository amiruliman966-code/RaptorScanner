const express = require("express");
const session = require("express-session");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const scanRoutes = require("./routes/scanRoutes");

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

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

// Routes
app.get("/", (req, res) => {
  res.render("home", {
    user: req.session.user || null,
  });
});

app.use("/", authRoutes);
app.use("/", scanRoutes);

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`RaptorScanner running on http://localhost:${PORT}`);
});