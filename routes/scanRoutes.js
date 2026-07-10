const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const db = require("../config/db");

const router = express.Router();

// Make sure uploads folder exists
const uploadDir = "uploads";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Redirect if user opens /scan manually
router.get("/scan", (req, res) => {
  res.redirect("/dashboard");
});

// Check if user is logged in
function isAuthenticated(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
}

// Multer upload setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },

  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
});

// Generate file hash
function generateHash(filePath, algorithm) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash(algorithm);
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
}

// Basic risk evaluation
function calculateRisk(file, clamResult) {
  const ext = path.extname(file.originalname).toLowerCase();

  const suspiciousExtensions = [
    ".exe",
    ".bat",
    ".cmd",
    ".scr",
    ".vbs",
    ".js",
    ".jar",
    ".msi",
    ".ps1",
    ".dll",
  ];

  const fileSizeMB = file.size / (1024 * 1024);

  if (clamResult === "Malware Detected") {
    return "High";
  }

  if (suspiciousExtensions.includes(ext)) {
    return "High";
  }

  if (fileSizeMB > 20) {
    return "Medium";
  }

  return "Low";
}

// ClamAV scan function
function scanWithClamAV(filePath) {
  return new Promise((resolve) => {
    const clamscanPath = process.env.CLAMSCAN_PATH || "clamscan";

    console.log("Using ClamAV path:", clamscanPath);
    console.log("Scanning file:", filePath);

    execFile(clamscanPath, [filePath], (error, stdout, stderr) => {
      console.log("CLAMAV STDOUT:", stdout);
      console.log("CLAMAV STDERR:", stderr);

      if (error) {
        console.log("CLAMAV ERROR CODE:", error.code);
        console.log("CLAMAV ERROR MESSAGE:", error.message);
      }

      // Code 0 = clean file
      if (!error) {
        return resolve("Clean");
      }

      // Code 1 = malware found
      if (error.code === 1) {
        return resolve("Malware Detected");
      }

      // ClamAV file not found
      if (error.code === "ENOENT") {
        return resolve("ClamAV Not Found");
      }

      // Database missing
      if (stderr && stderr.includes("No supported database files found")) {
        return resolve("ClamAV Database Missing");
      }

      return resolve("ClamAV Scan Error");
    });
  });
}
// Scan file route
router.post("/scan", isAuthenticated, upload.single("file"), async (req, res) => {
  try {
    console.log("File received:", req.file);

    if (!req.file) {
      return res.redirect("/dashboard");
    }

    const filePath = req.file.path;

    const md5Hash = generateHash(filePath, "md5");
    const sha1Hash = generateHash(filePath, "sha1");
    const sha256Hash = generateHash(filePath, "sha256");

    // Scan using ClamAV
    const scanResult = await scanWithClamAV(filePath);

    // Risk level based on ClamAV result + file type
    const riskLevel = calculateRisk(req.file, scanResult);

    await db.query(
      `INSERT INTO scans 
      (user_id, original_name, file_name, file_size, md5_hash, sha1_hash, sha256_hash, scan_result, risk_level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.session.user.id,
        req.file.originalname,
        req.file.filename,
        req.file.size,
        md5Hash,
        sha1Hash,
        sha256Hash,
        scanResult,
        riskLevel,
      ]
    );

    res.render("scan-result", {
      user: req.session.user,
      file: req.file,
      md5Hash: md5Hash,
      sha1Hash: sha1Hash,
      sha256Hash: sha256Hash,
      scanResult: scanResult,
      riskLevel: riskLevel,
    });
  } catch (err) {
    console.error("SCAN ERROR:", err);

    res.status(500).send(`
      <h1>Scan Error</h1>
      <p>${err.message}</p>
      <a href="/dashboard">Back to Dashboard</a>
    `);
  }
});

// Scan history page
// Scan history page
router.get("/history", isAuthenticated, async (req, res) => {
  try {
    const [fileScans] = await db.query(
      "SELECT * FROM scans WHERE user_id = ? ORDER BY scanned_at DESC",
      [req.session.user.id]
    );

    const [urlScans] = await db.query(
      "SELECT * FROM url_scans WHERE user_id = ? ORDER BY scanned_at DESC",
      [req.session.user.id]
    );

    res.render("history", {
      user: req.session.user,
      fileScans: fileScans,
      urlScans: urlScans,
    });
  } catch (err) {
    console.error("HISTORY ERROR:", err);

    res.status(500).send(`
      <h1>History Error</h1>
      <p>${err.message}</p>
      <a href="/dashboard">Back to Dashboard</a>
    `);
  }
});

module.exports = router;

// Simple URL risk checker
function checkUrlRisk(inputUrl) {
  let result = {
    domain: "",
    protocol: "",
    riskLevel: "Low",
    scanResult: "Clean",
    reason: "No suspicious pattern found.",
  };

  try {
    const parsedUrl = new URL(inputUrl);
    const domain = parsedUrl.hostname.toLowerCase();
    const protocol = parsedUrl.protocol.replace(":", "");

    result.domain = domain;
    result.protocol = protocol;

    const suspiciousWords = [
      "login",
      "verify",
      "free",
      "gift",
      "bonus",
      "bank",
      "secure",
      "update",
      "account",
      "password",
      "confirm",
    ];

    const shorteners = [
      "bit.ly",
      "tinyurl.com",
      "t.co",
      "goo.gl",
      "is.gd",
    ];

    let reasons = [];

    if (protocol !== "https") {
      reasons.push("URL does not use HTTPS.");
    }

    if (inputUrl.length > 100) {
      reasons.push("URL is very long.");
    }

    if (shorteners.includes(domain)) {
      reasons.push("URL uses a link shortener.");
    }

    suspiciousWords.forEach((word) => {
      if (inputUrl.toLowerCase().includes(word)) {
        reasons.push(`URL contains suspicious word: ${word}`);
      }
    });

    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;

    if (ipPattern.test(domain)) {
      reasons.push("URL uses IP address instead of domain name.");
    }

    if (reasons.length >= 3) {
      result.riskLevel = "High";
      result.scanResult = "Suspicious";
    } else if (reasons.length >= 1) {
      result.riskLevel = "Medium";
      result.scanResult = "Possibly Suspicious";
    }

    if (reasons.length > 0) {
      result.reason = reasons.join(" ");
    }

    return result;
  } catch (error) {
    return {
      domain: "Invalid URL",
      protocol: "Unknown",
      riskLevel: "High",
      scanResult: "Invalid URL",
      reason: "The submitted text is not a valid URL.",
    };
  }
}

// URL scan route
router.post("/scan-url", isAuthenticated, async (req, res) => {
  try {
    const { url } = req.body;

    const urlResult = checkUrlRisk(url);

    await db.query(
      `INSERT INTO url_scans
      (user_id, url, domain, protocol, risk_level, scan_result, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.session.user.id,
        url,
        urlResult.domain,
        urlResult.protocol,
        urlResult.riskLevel,
        urlResult.scanResult,
        urlResult.reason,
      ]
    );

    res.render("url-result", {
      user: req.session.user,
      url,
      urlResult,
    });
  } catch (err) {
    console.error("URL SCAN ERROR:", err);
    res.status(500).send(`
      <h1>URL Scan Error</h1>
      <p>${err.message}</p>
      <a href="/dashboard">Back to Dashboard</a>
    `);
  }
});


// Detect search type
function detectSearchType(query) {
  const cleanQuery = query.trim();

  const md5Regex = /^[a-fA-F0-9]{32}$/;
  const sha1Regex = /^[a-fA-F0-9]{40}$/;
  const sha256Regex = /^[a-fA-F0-9]{64}$/;
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;

  if (sha256Regex.test(cleanQuery)) return "SHA-256 Hash";
  if (sha1Regex.test(cleanQuery)) return "SHA-1 Hash";
  if (md5Regex.test(cleanQuery)) return "MD5 Hash";
  if (ipRegex.test(cleanQuery)) return "IP Address";

  try {
    const parsed = new URL(cleanQuery);
    return "URL";
  } catch (error) {
    return "Domain";
  }
}

// Search route
// Search route
router.post("/search", isAuthenticated, async (req, res) => {
  try {
    const { query } = req.body;
    const searchType = detectSearchType(query);

    let fileResults = [];
    let urlResults = [];

    if (
      searchType === "MD5 Hash" ||
      searchType === "SHA-1 Hash" ||
      searchType === "SHA-256 Hash"
    ) {
      const [files] = await db.query(
        `SELECT * FROM scans
         WHERE md5_hash = ? OR sha1_hash = ? OR sha256_hash = ?
         ORDER BY scanned_at DESC
         LIMIT 1`,
        [query, query, query]
      );

      fileResults = files;
    } 
    
    else if (searchType === "URL") {
      const [urls] = await db.query(
        `SELECT * FROM url_scans
         WHERE url = ?
         ORDER BY scanned_at DESC
         LIMIT 1`,
        [query]
      );

      urlResults = urls;
    } 
    
    else if (searchType === "Domain") {
      const [urls] = await db.query(
        `SELECT u.*
         FROM url_scans u
         INNER JOIN (
           SELECT url, MAX(id) AS latest_id
           FROM url_scans
           WHERE domain LIKE ?
           GROUP BY url
         ) latest ON u.id = latest.latest_id
         ORDER BY u.scanned_at DESC`,
        [`%${query}%`]
      );

      urlResults = urls;
    } 
    
    else if (searchType === "IP Address") {
      const [urls] = await db.query(
        `SELECT u.*
         FROM url_scans u
         INNER JOIN (
           SELECT url, MAX(id) AS latest_id
           FROM url_scans
           WHERE domain = ? OR url LIKE ?
           GROUP BY url
         ) latest ON u.id = latest.latest_id
         ORDER BY u.scanned_at DESC`,
        [query, `%${query}%`]
      );

      urlResults = urls;
    }

    res.render("search-result", {
      user: req.session.user,
      query,
      searchType,
      fileResults,
      urlResults,
    });

  } catch (err) {
    console.error("SEARCH ERROR:", err);

    res.status(500).send(`
      <h1>Search Error</h1>
      <p>${err.message}</p>
      <a href="/dashboard">Back to Dashboard</a>
    `);
  }
});