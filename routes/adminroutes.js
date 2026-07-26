const express = require("express");
const db = require("../config/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  getAnalyticsDashboardData,
} = require("../services/analyticsService");

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

    const [[indicatorCount]] = await db.query(
      "SELECT COUNT(*) AS totalIndicatorLookups FROM indicator_lookups"
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

    const [recentScans] = await db.query(
      `SELECT *
       FROM (
         SELECT
           scans.id,
           'File' AS scan_type,
           users.name AS user_name,
           users.email AS user_email,
           scans.original_name AS target,
           CONCAT(ROUND(scans.file_size / 1024, 2), ' KB') AS target_detail,
           scans.scan_result,
           scans.risk_level,
           scans.scanned_at
         FROM scans
         JOIN users ON scans.user_id = users.id

         UNION ALL

         SELECT
           url_scans.id,
           'URL' AS scan_type,
           users.name AS user_name,
           users.email AS user_email,
           url_scans.url AS target,
           url_scans.domain AS target_detail,
           url_scans.scan_result,
           url_scans.risk_level,
           url_scans.scanned_at
         FROM url_scans
         JOIN users ON url_scans.user_id = users.id
       ) AS combined_scans
       ORDER BY scanned_at DESC
       LIMIT 20`
    );

    const [recentWhoisLookups] = await db.query(
      `SELECT whois_lookups.*, users.name AS user_name, users.email AS user_email
       FROM whois_lookups
       JOIN users ON whois_lookups.user_id = users.id
       ORDER BY whois_lookups.checked_at DESC
       LIMIT 10`
    );

    const [recentIndicatorLookups] = await db.query(
      `SELECT
         indicator_lookups.id,
         indicator_lookups.query,
         indicator_lookups.search_type,
         indicator_lookups.result_summary,
         indicator_lookups.checked_at,
         users.name AS user_name,
         users.email AS user_email
       FROM indicator_lookups
       JOIN users ON indicator_lookups.user_id = users.id
       ORDER BY indicator_lookups.checked_at DESC
       LIMIT 10`
    );

    const [userMonitoring] = await db.query(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.phone,
         u.role,
         u.auth_provider,
         u.created_at,
         (SELECT COUNT(*) FROM scans s WHERE s.user_id = u.id) AS fileScans,
         (SELECT COUNT(*) FROM url_scans us WHERE us.user_id = u.id) AS urlScans,
         (SELECT COUNT(*) FROM indicator_lookups il WHERE il.user_id = u.id) AS indicatorLookups,
         COALESCE(
           (SELECT SUM(st.duration_seconds)
            FROM screen_time_sessions st
            WHERE st.user_id = u.id),
           0
         ) AS totalScreenSeconds,
         (SELECT MAX(sv.visited_at) FROM site_visits sv WHERE sv.user_id = u.id) AS lastVisit,
         (SELECT MAX(st.last_seen_at)
          FROM screen_time_sessions st
          WHERE st.user_id = u.id) AS lastActive
       FROM users u
       ORDER BY COALESCE(
         (SELECT MAX(st.last_seen_at)
          FROM screen_time_sessions st
          WHERE st.user_id = u.id),
         u.created_at
       ) DESC
       LIMIT 100`
    );

    const [adminContents] = await db.query(
      `SELECT * FROM admin_contents
       ORDER BY created_at DESC`
    );

    let analytics;

    try {
      analytics = await getAnalyticsDashboardData();
    } catch (analyticsError) {
      console.error("ADMIN ANALYTICS ERROR:", analyticsError.message);
      analytics = {
        totalVisits: 0,
        uniqueVisitors: 0,
        visitsToday: 0,
        totalScreenSeconds: 0,
        averageScreenSeconds: 0,
        activeVisitors: 0,
        visitorActivity: [],
      };
    }

    res.render("admin-dashboard", {
      user: req.session.user,
      search,

      totalUsers: userCount.totalUsers,
      totalFileScans: fileScanCount.totalFileScans,
      totalUrlScans: urlScanCount.totalUrlScans,
      totalWhoisLookups: whoisCount.totalWhoisLookups,
      totalIndicatorLookups: indicatorCount.totalIndicatorLookups,
      totalHighRiskFiles: highRiskFileCount.totalHighRiskFiles,
      totalHighRiskUrls: highRiskUrlCount.totalHighRiskUrls,

      users,
      recentUsers,
      recentScans,
      recentWhoisLookups,
      recentIndicatorLookups,
      userMonitoring,
      adminContents,
      analytics,
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
