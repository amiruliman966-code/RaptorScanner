const crypto = require("crypto");
const express = require("express");
const db = require("../config/db");

const router = express.Router();

async function initializeAnalyticsTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS site_visits (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      visitor_id CHAR(36) NOT NULL,
      user_id INT NULL,
      session_id VARCHAR(128) NOT NULL,
      path VARCHAR(255) NOT NULL,
      visited_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_site_visits_visitor (visitor_id),
      INDEX idx_site_visits_user (user_id),
      INDEX idx_site_visits_date (visited_at),
      INDEX idx_site_visits_path (path)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS screen_time_sessions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      activity_id CHAR(36) NOT NULL,
      visitor_id CHAR(36) NOT NULL,
      user_id INT NULL,
      session_id VARCHAR(128) NOT NULL,
      path VARCHAR(255) NOT NULL,
      duration_seconds INT UNSIGNED NOT NULL DEFAULT 0,
      started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_screen_activity (activity_id),
      INDEX idx_screen_visitor (visitor_id),
      INDEX idx_screen_user (user_id),
      INDEX idx_screen_last_seen (last_seen_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

function getVisitorId(req) {
  if (!req.session.analyticsVisitorId) {
    req.session.analyticsVisitorId = crypto.randomUUID();
  }

  return req.session.analyticsVisitorId;
}

function shouldTrackPageView(req) {
  if (req.method !== "GET") return false;
  if (req.path.startsWith("/analytics")) return false;
  if (req.path.startsWith("/uploads")) return false;

  const acceptedType = req.get("accept") || "";
  return acceptedType.includes("text/html");
}

function trackPageView(req, res, next) {
  if (!shouldTrackPageView(req)) {
    return next();
  }

  const visitorId = getVisitorId(req);
  const userId = req.session.user?.id || null;
  const cleanPath = String(req.path || "/").slice(0, 255);

  db.query(
    `INSERT INTO site_visits
     (visitor_id, user_id, session_id, path)
     VALUES (?, ?, ?, ?)`,
    [visitorId, userId, req.sessionID, cleanPath]
  ).catch((error) => {
    console.error("PAGE VIEW ANALYTICS ERROR:", error.message);
  });

  next();
}

router.post("/analytics/heartbeat", async (req, res) => {
  try {
    const activityId = String(req.body.activityId || "").trim();
    const pagePath = String(req.body.path || "/").slice(0, 255);
    const requestedSeconds = Number(req.body.activeSeconds || 0);

    if (!/^[0-9a-f-]{36}$/i.test(activityId)) {
      return res.status(400).json({ error: "Invalid activity ID." });
    }

    const activeSeconds = Number.isFinite(requestedSeconds)
      ? Math.min(Math.max(Math.round(requestedSeconds), 0), 30)
      : 0;

    const visitorId = getVisitorId(req);
    const userId = req.session.user?.id || null;

    await db.query(
      `INSERT INTO screen_time_sessions
       (
         activity_id,
         visitor_id,
         user_id,
         session_id,
         path,
         duration_seconds
       )
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         user_id = COALESCE(VALUES(user_id), user_id),
         duration_seconds = duration_seconds + VALUES(duration_seconds),
         last_seen_at = CURRENT_TIMESTAMP`,
      [
        activityId,
        visitorId,
        userId,
        req.sessionID,
        pagePath,
        activeSeconds,
      ]
    );

    res.status(204).end();
  } catch (error) {
    console.error("SCREEN TIME ANALYTICS ERROR:", error.message);
    res.status(500).json({ error: "Unable to record analytics." });
  }
});

async function getAnalyticsDashboardData() {
  const [
    [[visitSummary]],
    [[screenSummary]],
    [visitorActivity],
  ] = await Promise.all([
    db.query(`
      SELECT
        COUNT(*) AS totalVisits,
        COUNT(DISTINCT visitor_id) AS uniqueVisitors,
        SUM(visited_at >= CURDATE()) AS visitsToday
      FROM site_visits
    `),
    db.query(`
      SELECT
        COALESCE(SUM(duration_seconds), 0) AS totalScreenSeconds,
        COALESCE(
          SUM(duration_seconds) / NULLIF(COUNT(DISTINCT visitor_id), 0),
          0
        ) AS averageScreenSeconds,
        COUNT(DISTINCT CASE
          WHEN last_seen_at >= NOW() - INTERVAL 2 MINUTE
          THEN visitor_id
        END) AS activeVisitors
      FROM screen_time_sessions
    `),
    db.query(`
      SELECT
        MAX(s.visitor_id) AS visitor_id,
        s.user_id,
        COALESCE(u.name, 'Guest Visitor') AS visitor_name,
        COALESCE(u.email, 'Anonymous session') AS visitor_email,
        COUNT(DISTINCT s.activity_id) AS pagesViewed,
        SUM(s.duration_seconds) AS totalSeconds,
        MAX(s.last_seen_at) AS lastActive
      FROM screen_time_sessions s
      LEFT JOIN users u ON s.user_id = u.id
      GROUP BY
        CASE
          WHEN s.user_id IS NOT NULL THEN CONCAT('user:', s.user_id)
          ELSE CONCAT('guest:', s.visitor_id)
        END,
        s.user_id,
        u.name,
        u.email
      ORDER BY totalSeconds DESC
      LIMIT 20
    `),
  ]);

  return {
    totalVisits: Number(visitSummary.totalVisits || 0),
    uniqueVisitors: Number(visitSummary.uniqueVisitors || 0),
    visitsToday: Number(visitSummary.visitsToday || 0),
    totalScreenSeconds: Number(screenSummary.totalScreenSeconds || 0),
    averageScreenSeconds: Math.round(
      Number(screenSummary.averageScreenSeconds || 0)
    ),
    activeVisitors: Number(screenSummary.activeVisitors || 0),
    visitorActivity,
  };
}

module.exports = {
  analyticsRouter: router,
  getAnalyticsDashboardData,
  initializeAnalyticsTables,
  trackPageView,
};
