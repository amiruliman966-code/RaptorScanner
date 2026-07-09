const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../config/db");

const router = express.Router();

// Show login page
router.get("/login", (req, res) => {
  res.render("login", { error: null, success: null });
});

// Show register page
router.get("/register", (req, res) => {
  res.render("register", { error: null, success: null });
});

// Register user
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const [existingUser] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (existingUser.length > 0) {
      return res.render("register", {
        error: "Email already registered.",
        success: null,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashedPassword]
    );

    res.render("login", {
      error: null,
      success: "Registration successful. Please login.",
    });
  } catch (err) {
    console.error(err);
    res.render("register", {
      error: "Something went wrong. Please try again.",
      success: null,
    });
  }
});

// Login user
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.render("login", {
        error: "Invalid email or password.",
        success: null,
      });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.render("login", {
        error: "Invalid email or password.",
        success: null,
      });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.render("login", {
      error: "Something went wrong. Please try again.",
      success: null,
    });
  }
});

// Dashboard page
router.get("/dashboard", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  res.render("dashboard", {
    user: req.session.user,
  });
});

// Logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

module.exports = router;