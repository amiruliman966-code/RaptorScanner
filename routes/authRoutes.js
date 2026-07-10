const express = require("express");
const bcrypt = require("bcrypt");
const passport = require("../config/passport");
const db = require("../config/db");

const router = express.Router();

// Show login page
router.get("/login", (req, res) => {
  res.render("login", {
    error: null,
    success: null,
  });
});

// Show register page
router.get("/register", (req, res) => {
  res.render("register", {
    error: null,
    success: null,
  });
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
      `INSERT INTO users (name, email, password, auth_provider)
       VALUES (?, ?, ?, ?)`,
      [name, email, hashedPassword, "local"]
    );

    res.render("login", {
      error: null,
      success: "Registration successful. Please login.",
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);

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

    // If account was created using Google login
    if (user.auth_provider === "google" && user.password === "GOOGLE_LOGIN") {
      return res.render("login", {
        error: "This account uses Google login. Please login with Google.",
        success: null,
      });
    }

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
    console.error("LOGIN ERROR:", err);

    res.render("login", {
      error: "Something went wrong. Please try again.",
      success: null,
    });
  }
});

// Google login route
router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

// Google callback route
router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  (req, res) => {
    req.session.user = {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
    };

    res.redirect("/dashboard");
  }
);

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
  req.session.destroy((err) => {
    if (err) {
      console.error("LOGOUT ERROR:", err);
      return res.redirect("/dashboard");
    }

    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
});

module.exports = router;