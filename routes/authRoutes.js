const express = require("express");
const bcrypt = require("bcrypt");
const passport = require("../config/passport");
const db = require("../config/db");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const router = express.Router();

// ================= CHECK LOGIN =================
function isAuthenticated(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  next();
}

// ================= EMAIL TRANSPORTER =================
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ================= SEND RESET LINK EMAIL =================
async function sendResetPasswordEmail(email, resetLink) {
  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM || "RaptorScanner"}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Reset your RaptorScanner password",
    html: `
      <div style="font-family: Arial, sans-serif; background: #f3f4f6; padding: 30px;">
        <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 14px; overflow: hidden;">
          
          <div style="background: #2563eb; color: white; padding: 25px; text-align: center;">
            <h1 style="margin: 0;">RaptorScanner</h1>
            <p style="margin: 8px 0 0;">Password Reset Request</p>
          </div>

          <div style="padding: 30px; color: #111827;">
            <h2>Reset your password</h2>

            <p>
              We received a request to reset the password for your RaptorScanner account.
            </p>

            <p>
              Click the button below to create a new password. This link will expire in 
              <strong>15 minutes</strong>.
            </p>

            <div style="text-align: center; margin: 35px 0;">
              <a 
                href="${resetLink}" 
                style="
                  background: #2563eb;
                  color: white;
                  padding: 14px 28px;
                  text-decoration: none;
                  border-radius: 8px;
                  font-weight: bold;
                  display: inline-block;
                "
              >
                Reset Password
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280;">
              If the button does not work, copy and paste this link into your browser:
            </p>

            <p style="font-size: 14px; word-break: break-all; color: #2563eb;">
              ${resetLink}
            </p>

            <p style="font-size: 14px; color: #6b7280;">
              If you did not request this password reset, you can ignore this email.
            </p>
          </div>
        </div>
      </div>
    `,
  });
}

// ================= LOGIN PAGE =================
router.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }

  res.render("login", {
    error: null,
    success: null,
  });
});

// ================= REGISTER PAGE =================
router.get("/register", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }

  res.render("register", {
    error: null,
    success: null,
  });
});

// ================= REGISTER USER =================
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.render("register", {
        error: "Please fill in all fields.",
        success: null,
      });
    }

    if (password.length < 6) {
      return res.render("register", {
        error: "Password must be at least 6 characters.",
        success: null,
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const [existingUser] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [cleanEmail]
    );

    if (existingUser.length > 0) {
      return res.render("register", {
        error: "Email already registered.",
        success: null,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO users (name, email, password, auth_provider, role)
       VALUES (?, ?, ?, ?, ?)`,
      [name, cleanEmail, hashedPassword, "local", "user"]
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

// ================= LOGIN USER =================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.render("login", {
        error: "Please fill in all fields.",
        success: null,
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const [users] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [cleanEmail]
    );

    if (users.length === 0) {
      return res.render("login", {
        error: "Invalid email or password.",
        success: null,
      });
    }

    const user = users[0];

    if (user.password === "GOOGLE_LOGIN") {
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
      role: user.role || "user",
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

// ================= FORGOT PASSWORD PAGE =================
router.get("/forgot-password", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }

  res.render("forgot-password", {
    email: "",
    error: null,
    success: null,
  });
});

// ================= SEND RESET PASSWORD LINK =================
router.post("/forgot-password", async (req, res) => {
  const email = req.body.email ? req.body.email.trim().toLowerCase() : "";

  try {
    if (!email) {
      return res.render("forgot-password", {
        email: "",
        error: "Please enter your registered email.",
        success: null,
      });
    }

    const [users] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.render("forgot-password", {
        email,
        error: "Email not found.",
        success: null,
      });
    }

    const user = users[0];

    if (user.password === "GOOGLE_LOGIN") {
      return res.render("forgot-password", {
        email,
        error: "This account uses Google login. Please login with Google.",
        success: null,
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    await db.query(
      `UPDATE password_reset_tokens
       SET used = 1
       WHERE email = ? AND used = 0`,
      [email]
    );

    await db.query(
      `INSERT INTO password_reset_tokens
       (user_id, email, token_hash, expires_at, used)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), 0)`,
      [user.id, email, tokenHash]
    );

    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password/${resetToken}`;

    await sendResetPasswordEmail(email, resetLink);

    res.render("forgot-password", {
      email,
      error: null,
      success: "Password reset link has been sent to your email. Please check your inbox or spam folder.",
    });
  } catch (err) {
    console.error("SEND RESET LINK ERROR MESSAGE:", err.message);
    console.error("SEND RESET LINK ERROR CODE:", err.code);

    res.render("forgot-password", {
      email,
      error: "Failed to send reset email. Please check your email settings.",
      success: null,
    });
  }
});

// ================= RESET PASSWORD PAGE FROM EMAIL LINK =================
router.get("/reset-password/:token", async (req, res) => {
  const { token } = req.params;

  try {
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const [tokens] = await db.query(
      `SELECT * FROM password_reset_tokens
       WHERE token_hash = ?
       AND used = 0
       AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [tokenHash]
    );

    if (tokens.length === 0) {
      return res.render("forgot-password", {
        email: "",
        error: "Reset link is invalid or expired. Please request a new link.",
        success: null,
      });
    }

    res.render("reset-password", {
      token,
      error: null,
      success: null,
    });
  } catch (err) {
    console.error("RESET PASSWORD PAGE ERROR:", err);

    res.render("forgot-password", {
      email: "",
      error: "Something went wrong. Please request a new link.",
      success: null,
    });
  }
});

// ================= UPDATE PASSWORD USING RESET LINK =================
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { newPassword, confirmPassword } = req.body;

  try {
    if (!newPassword || !confirmPassword) {
      return res.render("reset-password", {
        token,
        error: "Please fill in all fields.",
        success: null,
      });
    }

    if (newPassword !== confirmPassword) {
      return res.render("reset-password", {
        token,
        error: "Passwords do not match.",
        success: null,
      });
    }

    if (newPassword.length < 6) {
      return res.render("reset-password", {
        token,
        error: "Password must be at least 6 characters.",
        success: null,
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const [tokens] = await db.query(
      `SELECT * FROM password_reset_tokens
       WHERE token_hash = ?
       AND used = 0
       AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [tokenHash]
    );

    if (tokens.length === 0) {
      return res.render("forgot-password", {
        email: "",
        error: "Reset link is invalid or expired. Please request a new link.",
        success: null,
      });
    }

    const resetRecord = tokens[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      "UPDATE users SET password = ? WHERE id = ?",
      [hashedPassword, resetRecord.user_id]
    );

    await db.query(
      "UPDATE password_reset_tokens SET used = 1 WHERE id = ?",
      [resetRecord.id]
    );

    res.render("login", {
      error: null,
      success: "Password reset successful. Please login.",
    });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);

    res.render("reset-password", {
      token,
      error: "Something went wrong. Please try again.",
      success: null,
    });
  }
});

// ================= GOOGLE LOGIN =================
router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

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
      role: req.user.role || "user",
    };

    res.redirect("/dashboard");
  }
);

// ================= DASHBOARD =================
router.get("/dashboard", isAuthenticated, (req, res) => {
  res.render("dashboard", {
    user: req.session.user,
  });
});

// ================= LOGOUT =================
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