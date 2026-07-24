const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const db = require("../config/db");

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

// ================= SEND CHANGE PASSWORD OTP EMAIL =================
async function sendChangePasswordOtpEmail(email, otp) {
  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM || "RaptorScanner"}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "RaptorScanner Change Password OTP",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>RaptorScanner Change Password Verification</h2>

        <p>Your OTP to change password is:</p>

        <h1 style="letter-spacing: 5px; color: #2563eb;">
          ${otp}
        </h1>

        <p>This OTP will expire in 10 minutes.</p>

        <p>If you did not request this, please ignore this email.</p>
      </div>
    `,
  });
}

// ================= PROFILE IMAGE UPLOAD SETUP =================
const profileUploadDir = "public/uploads/profile";

if (!fs.existsSync(profileUploadDir)) {
  fs.mkdirSync(profileUploadDir, { recursive: true });
}

const profileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, profileUploadDir);
  },

  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const profileUpload = multer({
  storage: profileStorage,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, and WEBP images are allowed."));
    }
  },
});

// ================= GET CURRENT PROFILE USER =================
async function getProfileUser(userId) {
  const [users] = await db.query(
    `SELECT 
      id, 
      name, 
      email, 
      phone, 
      role, 
      auth_provider, 
      profile_picture, 
      password, 
      created_at
     FROM users
     WHERE id = ?`,
    [userId]
  );

  return users.length > 0 ? users[0] : null;
}

// ================= PROFILE PAGE =================
router.get("/profile", isAuthenticated, async (req, res) => {
  try {
    const profileUser = await getProfileUser(req.session.user.id);

    if (!profileUser) {
      return res.redirect("/logout");
    }

    res.render("profile", {
      user: req.session.user,
      profileUser,
      passwordStep: "form",
      error: null,
      success: null,
    });
  } catch (err) {
    console.error("PROFILE PAGE ERROR:", err);

    res.status(500).send(`
      <h1>Profile Error</h1>
      <p>${err.message}</p>
      <a href="/dashboard">Back to Dashboard</a>
    `);
  }
});

// ================= UPDATE PROFILE =================
router.post(
  "/profile/update",
  isAuthenticated,
  profileUpload.single("profile_picture"),
  async (req, res) => {
    try {
      const { name, phone } = req.body;

      if (!name || name.trim() === "") {
        const profileUser = await getProfileUser(req.session.user.id);

        return res.render("profile", {
          user: req.session.user,
          profileUser,
          passwordStep: "form",
          error: "Name cannot be empty.",
          success: null,
        });
      }

      const currentUser = await getProfileUser(req.session.user.id);

      if (!currentUser) {
        return res.redirect("/logout");
      }

      let profilePicture = currentUser.profile_picture;

      if (req.file) {
        profilePicture = "/uploads/profile/" + req.file.filename;

        if (
          currentUser.profile_picture &&
          currentUser.profile_picture.startsWith("/uploads/profile/")
        ) {
          const cleanOldPath = currentUser.profile_picture.replace(/^\/+/, "");

          const oldImagePath = path.join(
            __dirname,
            "..",
            "public",
            cleanOldPath
          );

          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
      }

      await db.query(
        `UPDATE users
         SET name = ?, phone = ?, profile_picture = ?
         WHERE id = ?`,
        [
          name.trim(),
          phone ? phone.trim() : null,
          profilePicture,
          req.session.user.id,
        ]
      );

      req.session.user.name = name.trim();

      const updatedProfileUser = await getProfileUser(req.session.user.id);

      res.render("profile", {
        user: req.session.user,
        profileUser: updatedProfileUser,
        passwordStep: "form",
        error: null,
        success: "Profile updated successfully.",
      });
    } catch (err) {
      console.error("UPDATE PROFILE ERROR:", err);

      const profileUser = await getProfileUser(req.session.user.id);

      res.render("profile", {
        user: req.session.user,
        profileUser,
        passwordStep: "form",
        error: err.message || "Something went wrong. Please try again.",
        success: null,
      });
    }
  }
);

// ================= SEND OTP FOR CHANGE PASSWORD =================
router.post("/profile/change-password", isAuthenticated, async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  try {
    const profileUser = await getProfileUser(req.session.user.id);

    if (!profileUser) {
      return res.redirect("/logout");
    }

    if (profileUser.password === "GOOGLE_LOGIN") {
      return res.render("profile", {
        user: req.session.user,
        profileUser,
        passwordStep: "form",
        error: "This account uses Google login. Password cannot be changed here.",
        success: null,
      });
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.render("profile", {
        user: req.session.user,
        profileUser,
        passwordStep: "form",
        error: "Please fill in all password fields.",
        success: null,
      });
    }

    if (newPassword !== confirmPassword) {
      return res.render("profile", {
        user: req.session.user,
        profileUser,
        passwordStep: "form",
        error: "New passwords do not match.",
        success: null,
      });
    }

    if (newPassword.length < 6) {
      return res.render("profile", {
        user: req.session.user,
        profileUser,
        passwordStep: "form",
        error: "New password must be at least 6 characters.",
        success: null,
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, profileUser.password);

    if (!isMatch) {
      return res.render("profile", {
        user: req.session.user,
        profileUser,
        passwordStep: "form",
        error: "Current password is incorrect.",
        success: null,
      });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await db.query(
      `UPDATE password_reset_otps
       SET used = 1
       WHERE email = ? AND used = 0`,
      [profileUser.email]
    );

    await db.query(
      `INSERT INTO password_reset_otps
       (user_id, email, otp_hash, expires_at, used)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), 0)`,
      [profileUser.id, profileUser.email, otpHash]
    );

    req.session.pendingPasswordChange = {
      userId: profileUser.id,
      email: profileUser.email,
      newPasswordHash,
    };

    await sendChangePasswordOtpEmail(profileUser.email, otp);

    res.render("profile", {
      user: req.session.user,
      profileUser,
      passwordStep: "verify",
      error: null,
      success: "OTP has been sent to your email. Please check your inbox or spam folder.",
    });
  } catch (err) {
    console.error("CHANGE PASSWORD OTP ERROR MESSAGE:", err.message);
    console.error("CHANGE PASSWORD OTP ERROR CODE:", err.code);

    const profileUser = await getProfileUser(req.session.user.id);

    res.render("profile", {
      user: req.session.user,
      profileUser,
      passwordStep: "form",
      error: "Failed to send OTP email. Please check your email settings.",
      success: null,
    });
  }
});

// ================= VERIFY OTP AND CHANGE PASSWORD =================
router.post("/profile/verify-change-password", isAuthenticated, async (req, res) => {
  const otp = req.body.otp ? req.body.otp.trim() : "";

  try {
    const profileUser = await getProfileUser(req.session.user.id);

    if (!profileUser) {
      return res.redirect("/logout");
    }

    if (!req.session.pendingPasswordChange) {
      return res.render("profile", {
        user: req.session.user,
        profileUser,
        passwordStep: "form",
        error: "No password change request found. Please try again.",
        success: null,
      });
    }

    if (!otp || otp.length !== 6) {
      return res.render("profile", {
        user: req.session.user,
        profileUser,
        passwordStep: "verify",
        error: "Please enter a valid 6-digit OTP.",
        success: null,
      });
    }

    const pending = req.session.pendingPasswordChange;

    if (
      Number(pending.userId) !== Number(req.session.user.id) ||
      pending.email !== profileUser.email
    ) {
      return res.render("profile", {
        user: req.session.user,
        profileUser,
        passwordStep: "form",
        error: "Invalid password change session. Please try again.",
        success: null,
      });
    }

    const [otpRows] = await db.query(
      `SELECT * FROM password_reset_otps
       WHERE user_id = ?
       AND email = ?
       AND used = 0
       AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [profileUser.id, profileUser.email]
    );

    if (otpRows.length === 0) {
      req.session.pendingPasswordChange = null;

      return res.render("profile", {
        user: req.session.user,
        profileUser,
        passwordStep: "form",
        error: "OTP expired. Please request a new OTP.",
        success: null,
      });
    }

    const otpRecord = otpRows[0];

    const isOtpValid = await bcrypt.compare(otp, otpRecord.otp_hash);

    if (!isOtpValid) {
      return res.render("profile", {
        user: req.session.user,
        profileUser,
        passwordStep: "verify",
        error: "Invalid OTP. Please try again.",
        success: null,
      });
    }

    await db.query(
      "UPDATE users SET password = ? WHERE id = ?",
      [pending.newPasswordHash, profileUser.id]
    );

    await db.query(
      "UPDATE password_reset_otps SET used = 1 WHERE id = ?",
      [otpRecord.id]
    );

    req.session.pendingPasswordChange = null;

    const updatedProfileUser = await getProfileUser(req.session.user.id);

    res.render("profile", {
      user: req.session.user,
      profileUser: updatedProfileUser,
      passwordStep: "form",
      error: null,
      success: "Password changed successfully after email verification.",
    });
  } catch (err) {
    console.error("VERIFY CHANGE PASSWORD ERROR:", err);

    const profileUser = await getProfileUser(req.session.user.id);

    res.render("profile", {
      user: req.session.user,
      profileUser,
      passwordStep: "verify",
      error: "Something went wrong. Please try again.",
      success: null,
    });
  }
});

module.exports = router;