const express = require("express");
const db = require("../config/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// ================= ADMIN IMAGE UPLOAD SETUP =================
const adminUploadDir = "public/uploads/admin";

if (!fs.existsSync(adminUploadDir)) {
  fs.mkdirSync(adminUploadDir, { recursive: true });
}

const adminStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, adminUploadDir);
  },

  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const adminUpload = multer({
  storage: adminStorage,
});

// ================= CHECK LOGIN =================
function isAuthenticated(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  next();
}

// ================= CHECK ADMIN =================
function isAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).send(`
      <div style="font-family: Arial; text-align: center; margin-top: 80px;">
        <h1>403 - Access Denied</h1>
        <p>You do not have permission to access the admin dashboard.</p>
        <a href="/dashboard">Back to Dashboard</a>
      </div>
    `);
  }

  next();
}

// ================= ADMIN DASHBOARD =================
router.get("/admin", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const search = req.query.search || "";

    const [[userCount]] = await db.query(
      "SELECT COUNT(*) AS totalUsers FROM users"
    );

    const [[fileScanCount]] = await db.query(
      "SELECT COUNT(*) AS totalFileScans FROM scans"
    );

    const [[urlScanCount]] = await db.query(
      "SELECT COUNT(*) AS totalUrlScans FROM url_scans"
    );

    const [[whoisCount]] = await db.query(
      "SELECT COUNT(*) AS totalWhoisLookups FROM whois_lookups"
    );

    const [[highRiskFileCount]] = await db.query(
      "SELECT COUNT(*) AS totalHighRiskFiles FROM scans WHERE risk_level = 'High'"
    );

    const [[highRiskUrlCount]] = await db.query(
      "SELECT COUNT(*) AS totalHighRiskUrls FROM url_scans WHERE risk_level = 'High'"
    );

    let users;

    if (search.trim() !== "") {
      const [searchedUsers] = await db.query(
        `SELECT id, name, email, role, auth_provider, created_at
         FROM users
         WHERE name LIKE ? OR email LIKE ?
         ORDER BY created_at DESC`,
        [`%${search}%`, `%${search}%`]
      );

      users = searchedUsers;
    } else {
      const [allUsers] = await db.query(
        `SELECT id, name, email, role, auth_provider, created_at
         FROM users
         ORDER BY created_at DESC
         LIMIT 20`
      );

      users = allUsers;
    }

    const [recentUsers] = await db.query(
      `SELECT id, name, email, role, auth_provider, created_at
       FROM users
       ORDER BY created_at DESC
       LIMIT 5`
    );

    const [recentFileScans] = await db.query(
      `SELECT scans.*, users.name AS user_name, users.email AS user_email
       FROM scans
       JOIN users ON scans.user_id = users.id
       ORDER BY scans.scanned_at DESC
       LIMIT 10`
    );

    const [recentUrlScans] = await db.query(
      `SELECT url_scans.*, users.name AS user_name, users.email AS user_email
       FROM url_scans
       JOIN users ON url_scans.user_id = users.id
       ORDER BY url_scans.scanned_at DESC
       LIMIT 10`
    );

    const [recentWhoisLookups] = await db.query(
      `SELECT whois_lookups.*, users.name AS user_name, users.email AS user_email
       FROM whois_lookups
       JOIN users ON whois_lookups.user_id = users.id
       ORDER BY whois_lookups.checked_at DESC
       LIMIT 10`
    );

    const [adminContents] = await db.query(
      `SELECT * FROM admin_contents
       ORDER BY created_at DESC`
    );

    res.render("admin-dashboard", {
      user: req.session.user,
      search,

      totalUsers: userCount.totalUsers,
      totalFileScans: fileScanCount.totalFileScans,
      totalUrlScans: urlScanCount.totalUrlScans,
      totalWhoisLookups: whoisCount.totalWhoisLookups,
      totalHighRiskFiles: highRiskFileCount.totalHighRiskFiles,
      totalHighRiskUrls: highRiskUrlCount.totalHighRiskUrls,

      users,
      recentUsers,
      recentFileScans,
      recentUrlScans,
      recentWhoisLookups,
      adminContents,
    });
  } catch (err) {
    console.error("ADMIN DASHBOARD ERROR:", err);

    res.status(500).send(`
      <h1>Admin Dashboard Error</h1>
      <p>${err.message}</p>
      <a href="/dashboard">Back to Dashboard</a>
    `);
  }
});

// ================= CHANGE USER ROLE =================
router.post("/admin/users/:id/role", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    if (role !== "admin" && role !== "user") {
      return res.redirect("/admin");
    }

    if (Number(userId) === Number(req.session.user.id)) {
      return res.redirect("/admin");
    }

    await db.query(
      "UPDATE users SET role = ? WHERE id = ?",
      [role, userId]
    );

    res.redirect("/admin");
  } catch (err) {
    console.error("CHANGE ROLE ERROR:", err);
    res.redirect("/admin");
  }
});

// ================= DELETE USER =================
router.post("/admin/users/:id/delete", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    if (Number(userId) === Number(req.session.user.id)) {
      return res.redirect("/admin");
    }

    await db.query(
      "DELETE FROM users WHERE id = ?",
      [userId]
    );

    res.redirect("/admin");
  } catch (err) {
    console.error("DELETE USER ERROR:", err);
    res.redirect("/admin");
  }
});

// ================= DELETE FILE SCAN =================
router.post("/admin/file-scans/:id/delete", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const scanId = req.params.id;

    await db.query(
      "DELETE FROM scans WHERE id = ?",
      [scanId]
    );

    res.redirect("/admin");
  } catch (err) {
    console.error("DELETE FILE SCAN ERROR:", err);
    res.redirect("/admin");
  }
});

// ================= DELETE URL SCAN =================
router.post("/admin/url-scans/:id/delete", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const scanId = req.params.id;

    await db.query(
      "DELETE FROM url_scans WHERE id = ?",
      [scanId]
    );

    res.redirect("/admin");
  } catch (err) {
    console.error("DELETE URL SCAN ERROR:", err);
    res.redirect("/admin");
  }
});

// ================= DELETE WHOIS LOOKUP =================
router.post("/admin/whois/:id/delete", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const whoisId = req.params.id;

    await db.query(
      "DELETE FROM whois_lookups WHERE id = ?",
      [whoisId]
    );

    res.redirect("/admin");
  } catch (err) {
    console.error("DELETE WHOIS ERROR:", err);
    res.redirect("/admin");
  }
});

// ================= ADD ADMIN CONTENT / AD / PICTURE =================
router.post(
  "/admin/content/add",
  isAuthenticated,
  isAdmin,
  adminUpload.single("image"),
  async (req, res) => {
    try {
      const { page_name, title, message } = req.body;

      let imagePath = null;

      if (req.file) {
        imagePath = "/uploads/admin/" + req.file.filename;
      }

      await db.query(
        `INSERT INTO admin_contents
         (page_name, title, message, image_path, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [page_name, title, message, imagePath, 1]
      );

      res.redirect("/admin");
    } catch (err) {
      console.error("ADD ADMIN CONTENT ERROR:", err);
      res.redirect("/admin");
    }
  }
);

// ================= SHOW / HIDE ADMIN CONTENT =================
router.post(
  "/admin/content/:id/toggle",
  isAuthenticated,
  isAdmin,
  async (req, res) => {
    try {
      const contentId = req.params.id;

      await db.query(
        `UPDATE admin_contents
         SET is_active = IF(is_active = 1, 0, 1)
         WHERE id = ?`,
        [contentId]
      );

      res.redirect("/admin");
    } catch (err) {
      console.error("TOGGLE ADMIN CONTENT ERROR:", err);
      res.redirect("/admin");
    }
  }
);

// ================= DELETE ADMIN CONTENT =================
router.post(
  "/admin/content/:id/delete",
  isAuthenticated,
  isAdmin,
  async (req, res) => {
    try {
      const contentId = req.params.id;

      const [contents] = await db.query(
        "SELECT * FROM admin_contents WHERE id = ?",
        [contentId]
      );

      if (contents.length > 0 && contents[0].image_path) {
        const cleanImagePath = contents[0].image_path.replace(/^\/+/, "");

        const imageFullPath = path.join(
          __dirname,
          "..",
          "public",
          cleanImagePath
        );

        if (fs.existsSync(imageFullPath)) {
          fs.unlinkSync(imageFullPath);
        }
      }

      await db.query(
        "DELETE FROM admin_contents WHERE id = ?",
        [contentId]
      );

      res.redirect("/admin");
    } catch (err) {
      console.error("DELETE ADMIN CONTENT ERROR:", err);
      res.redirect("/admin");
    }
  }
);

module.exports = router;