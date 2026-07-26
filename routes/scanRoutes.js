const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const db = require("../config/db");
const axios = require("axios");
const {
  saveIndicatorLookup,
} = require("../services/indicatorHistoryService");

const router = express.Router();

// ================= UPLOAD FOLDER =================
const uploadDir = "uploads";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// ================= CHECK LOGIN =================
function isAuthenticated(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  next();
}

// ================= MULTER UPLOAD SETUP =================
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

// ================= GENERATE FILE HASH =================
function generateHash(filePath, algorithm) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash(algorithm);
  hashSum.update(fileBuffer);

  return hashSum.digest("hex");
}

// ================= FILE RISK EVALUATION =================
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

// ================= CLAMAV SCAN FUNCTION =================
function scanWithClamAV(filePath) {
  return new Promise((resolve) => {
    try {
      const clamscanPath = process.env.CLAMSCAN_PATH || "clamscan";

      console.log("Using ClamAV path:", clamscanPath);
      console.log("Scanning file:", filePath);

      const shouldCheckFile =
        path.isAbsolute(clamscanPath) ||
        clamscanPath.includes("/") ||
        clamscanPath.includes("\\");

      if (shouldCheckFile && !fs.existsSync(clamscanPath)) {
        console.log("CLAMAV NOT FOUND AT PATH:", clamscanPath);
        return resolve("ClamAV Not Found");
      }

      execFile(clamscanPath, [filePath], (error, stdout, stderr) => {
        console.log("CLAMAV STDOUT:", stdout);
        console.log("CLAMAV STDERR:", stderr);

        if (error) {
          console.log("CLAMAV ERROR CODE:", error.code);
          console.log("CLAMAV ERROR MESSAGE:", error.message);
        }

        if (!error) {
          return resolve("Clean");
        }

        if (error.code === 1) {
          return resolve("Malware Detected");
        }

        if (error.code === "ENOENT") {
          return resolve("ClamAV Not Found");
        }

        if (stderr && stderr.includes("No supported database files found")) {
          return resolve("ClamAV Database Missing");
        }

        return resolve("ClamAV Scan Error");
      });
    } catch (err) {
      console.error("CLAMAV SPAWN ERROR:", err.message);
      return resolve("ClamAV Scan Error");
    }
  });
}

// ================= ADVANCED URL RISK CHECKER =================
function checkUrlRisk(inputUrl) {
  try {
    const rawUrl = String(inputUrl || "").trim();
    const cleanUrl = /^[a-z][a-z0-9+.-]*:/i.test(rawUrl)
      ? rawUrl
      : `https://${rawUrl}`;
    const parsedUrl = new URL(cleanUrl);
    const domain = parsedUrl.hostname.toLowerCase();
    const protocol = parsedUrl.protocol.replace(":", "");
    const lowerUrl = cleanUrl.toLowerCase();
    const indicators = [];
    let riskScore = 0;

    function addIndicator(score, message) {
      riskScore += score;
      indicators.push(message);
    }

    if (!["http", "https"].includes(protocol)) {
      addIndicator(100, `Unsupported protocol: ${protocol || "unknown"}.`);
    } else if (protocol === "http") {
      addIndicator(20, "Connection is not protected by HTTPS.");
    }

    if (parsedUrl.username || parsedUrl.password) {
      addIndicator(45, "URL contains embedded username or password credentials.");
    }

    if (cleanUrl.length > 200) {
      addIndicator(25, "URL is unusually long (more than 200 characters).");
    } else if (cleanUrl.length > 120) {
      addIndicator(15, "URL is longer than normal.");
    }

    const shorteners = new Set([
      "bit.ly",
      "tinyurl.com",
      "t.co",
      "goo.gl",
      "is.gd",
      "buff.ly",
      "ow.ly",
      "cutt.ly",
      "rebrand.ly",
      "shorturl.at",
    ]);

    if (shorteners.has(domain)) {
      addIndicator(25, "Link shortener hides the final destination.");
    }

    const ipv4Pattern =
      /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
    const isIpv4 = ipv4Pattern.test(domain);
    const isIpv6 = domain.includes(":");

    if (isIpv4 || isIpv6) {
      addIndicator(35, "URL uses an IP address instead of a domain name.");
    }

    if (
      domain === "localhost" ||
      domain.endsWith(".localhost") ||
      /^127\./.test(domain) ||
      /^10\./.test(domain) ||
      /^192\.168\./.test(domain) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(domain)
    ) {
      addIndicator(20, "URL points to a local or private network address.");
    }

    if (domain.includes("xn--")) {
      addIndicator(30, "Domain uses Punycode and may imitate another domain.");
    }

    const domainLabels = domain.split(".").filter(Boolean);
    const subdomainCount = Math.max(domainLabels.length - 2, 0);

    if (subdomainCount >= 4) {
      addIndicator(20, "Domain contains an excessive number of subdomains.");
    } else if (subdomainCount >= 3) {
      addIndicator(10, "Domain contains many subdomains.");
    }

    const hyphenCount = (domain.match(/-/g) || []).length;

    if (hyphenCount >= 4) {
      addIndicator(15, "Domain contains an unusual number of hyphens.");
    }

    if (
      parsedUrl.port &&
      !(
        (protocol === "http" && parsedUrl.port === "80") ||
        (protocol === "https" && parsedUrl.port === "443")
      )
    ) {
      addIndicator(15, `URL uses a non-standard port (${parsedUrl.port}).`);
    }

    const encodedCharacterCount = (cleanUrl.match(/%[0-9a-f]{2}/gi) || [])
      .length;

    if (encodedCharacterCount >= 5) {
      addIndicator(20, "URL contains heavy character encoding.");
    } else if (encodedCharacterCount >= 2) {
      addIndicator(10, "URL contains encoded characters.");
    }

    if (parsedUrl.searchParams.size >= 8) {
      addIndicator(10, "URL contains an unusually large number of parameters.");
    }

    const dangerousExtensionPattern =
      /\.(exe|scr|msi|bat|cmd|com|ps1|vbs|jar|apk|dmg|iso|zip|rar|7z)(?:$|[?#])/i;

    if (dangerousExtensionPattern.test(parsedUrl.pathname)) {
      addIndicator(35, "URL points to a potentially dangerous downloadable file.");
    }

    const suspiciousWords = [
      "login",
      "verify",
      "verification",
      "signin",
      "bank",
      "update",
      "account",
      "password",
      "confirm",
      "wallet",
      "invoice",
      "payment",
      "recover",
      "unlock",
      "urgent",
      "suspended",
    ];

    let suspiciousLocation =
      `${parsedUrl.pathname}${parsedUrl.search}`.toLowerCase();

    try {
      suspiciousLocation = decodeURIComponent(suspiciousLocation);
    } catch (decodeError) {
      addIndicator(10, "URL contains malformed character encoding.");
    }
    const matchedWords = [
      ...new Set(
        suspiciousWords.filter((word) => suspiciousLocation.includes(word))
      ),
    ];

    if (matchedWords.length > 0) {
      addIndicator(
        Math.min(matchedWords.length * 7, 28),
        `Suspicious terms detected: ${matchedWords.join(", ")}.`
      );
    }

    const repeatedSymbols = (lowerUrl.match(/[.@_-]/g) || []).length;

    if (repeatedSymbols >= 15) {
      addIndicator(10, "URL contains many separators commonly used for obfuscation.");
    }

    riskScore = Math.min(riskScore, 100);

    let riskLevel = "Low";
    let scanResult = "No Obvious Threat Detected";

    if (riskScore >= 50) {
      riskLevel = "High";
      scanResult = "Suspicious";
    } else if (riskScore >= 20) {
      riskLevel = "Medium";
      scanResult = "Potentially Suspicious";
    }

    return {
      domain,
      protocol,
      normalizedUrl: parsedUrl.href,
      riskScore,
      riskLevel,
      scanResult,
      indicators,
      reason:
        indicators.length > 0
          ? indicators.join(" ")
          : "No suspicious URL patterns were detected by the local analysis engine.",
    };
  } catch (error) {
    return {
      domain: "Invalid URL",
      protocol: "Unknown",
      normalizedUrl: "",
      riskScore: 100,
      riskLevel: "High",
      scanResult: "Invalid URL",
      indicators: ["The submitted value is not a valid absolute URL."],
      reason: "The submitted text is not a valid URL.",
    };
  }
}

function hasConfiguredApiKey(value) {
  if (!value) return false;

  return !/(your_|replace|placeholder|changeme)/i.test(value.trim());
}

async function checkGoogleSafeBrowsing(inputUrl) {
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;

  if (!hasConfiguredApiKey(apiKey)) {
    return {
      engine: "Google Safe Browsing",
      status: "not_configured",
      verdict: "Not configured",
      threats: [],
    };
  }

  try {
    const response = await axios.post(
      "https://safebrowsing.googleapis.com/v4/threatMatches:find",
      {
        client: {
          clientId: "raptorscanner",
          clientVersion: "1.0.0",
        },
        threatInfo: {
          threatTypes: [
            "MALWARE",
            "SOCIAL_ENGINEERING",
            "UNWANTED_SOFTWARE",
            "POTENTIALLY_HARMFUL_APPLICATION",
          ],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url: inputUrl }],
        },
      },
      {
        params: { key: apiKey.trim() },
        timeout: 10000,
        headers: { "Content-Type": "application/json" },
      }
    );

    const matches = Array.isArray(response.data.matches)
      ? response.data.matches
      : [];
    const threats = [
      ...new Set(matches.map((match) => match.threatType).filter(Boolean)),
    ];

    return {
      engine: "Google Safe Browsing",
      status: "completed",
      verdict:
        threats.length > 0
          ? "Unsafe"
          : "Checked - no known threat found",
      threats,
    };
  } catch (error) {
    const statusCode = error.response?.status;

    return {
      engine: "Google Safe Browsing",
      status: "error",
      verdict:
        statusCode === 400 || statusCode === 403
          ? "API key or API configuration error"
          : statusCode === 429
            ? "API quota exceeded"
            : "Lookup unavailable",
      threats: [],
    };
  }
}

function mergeReputationResults(localResult, googleResult) {
  let combinedScore = localResult.riskScore;
  const indicators = [...localResult.indicators];

  if (googleResult.threats.length > 0) {
    combinedScore = Math.max(combinedScore, 95);
    indicators.push(
      `Google Safe Browsing match: ${googleResult.threats.join(", ")}.`
    );
  }

  combinedScore = Math.min(combinedScore, 100);

  let riskLevel = "Low";
  let scanResult = "No Obvious Threat Detected";

  if (combinedScore >= 50) {
    riskLevel = "High";
    scanResult = "Suspicious";
  } else if (combinedScore >= 20) {
    riskLevel = "Medium";
    scanResult = "Potentially Suspicious";
  }

  return {
    ...localResult,
    riskScore: combinedScore,
    riskLevel,
    scanResult,
    indicators,
    engines: {
      local: {
        engine: "RaptorScanner Local Analysis",
        status: "completed",
        verdict: localResult.scanResult,
        score: localResult.riskScore,
      },
      google: googleResult,
    },
    reason:
      indicators.length > 0
        ? indicators.join(" ")
        : localResult.reason,
  };
}

async function runUrlReputationScan(inputUrl) {
  const localResult = checkUrlRisk(inputUrl);

  if (localResult.scanResult === "Invalid URL") {
    return {
      ...localResult,
      engines: {
        local: {
          engine: "RaptorScanner Local Analysis",
          status: "completed",
          verdict: "Invalid URL",
          score: 100,
        },
        google: {
          engine: "Google Safe Browsing",
          status: "skipped",
          verdict: "Skipped because URL is invalid",
          threats: [],
        },
      },
    };
  }

  const googleResult = await checkGoogleSafeBrowsing(
    localResult.normalizedUrl
  );

  return mergeReputationResults(localResult, googleResult);
}

// ================= DETECT SEARCH TYPE =================
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
    new URL(cleanQuery);
    return "URL";
  } catch (error) {
    return "Domain";
  }
}

// ================= CLEAN DOMAIN / URL / IP =================
function cleanWhoisTarget(input) {
  try {
    let value = input.trim().toLowerCase();

    if (value.startsWith("http://") || value.startsWith("https://")) {
      const parsedUrl = new URL(value);
      return parsedUrl.hostname.replace(/^www\./, "");
    }

    return value
      .replace("http://", "")
      .replace("https://", "")
      .replace(/^www\./, "")
      .split("/")[0]
      .trim();
  } catch (err) {
    return input.trim().toLowerCase();
  }
}

// ================= VALUE HELPERS =================
function hasUsefulValue(value) {
  if (value === null || value === undefined) return false;

  if (Array.isArray(value)) {
    return value.length > 0 && value.some((item) => hasUsefulValue(item));
  }

  const cleanValue = String(value).trim().toLowerCase();

  return (
    cleanValue !== "" &&
    cleanValue !== "not available" &&
    cleanValue !== "n/a" &&
    cleanValue !== "na" &&
    cleanValue !== "null" &&
    cleanValue !== "undefined" &&
    cleanValue !== "no data" &&
    cleanValue !== "-"
  );
}

function cleanValue(value) {
  if (!hasUsefulValue(value)) {
    return "Not available";
  }

  if (Array.isArray(value)) {
    return value
      .flat(Infinity)
      .filter((item) => hasUsefulValue(item))
      .map((item) => String(item).trim())
      .join(", ");
  }

  return String(value).trim();
}

function listToString(value) {
  if (!hasUsefulValue(value)) {
    return "Not available";
  }

  if (Array.isArray(value)) {
    return value
      .flat(Infinity)
      .filter((item) => hasUsefulValue(item))
      .map((item) => String(item).trim())
      .join(", ");
  }

  return String(value).trim();
}

// ================= COUNTRY FALLBACK =================
function getCountryFromTld(target) {
  if (!target || target.includes(":")) {
    return "Not available";
  }

  const tld = target.split(".").pop().toLowerCase();

  const countryMap = {
    my: "MY",
    sg: "SG",
    id: "ID",
    th: "TH",
    ph: "PH",
    vn: "VN",
    uk: "GB",
    au: "AU",
    ca: "CA",
    us: "US",
    jp: "JP",
    kr: "KR",
    cn: "CN",
    in: "IN",
  };

  return countryMap[tld] || "Not available";
}

function getCountryFallback(data, target) {
  if (data && hasUsefulValue(data.country)) {
    return data.country;
  }

  return getCountryFromTld(target);
}

// ================= RDAP ENTITY HELPERS =================
function findEntityByAnyRole(entities, roles) {
  if (!entities || entities.length === 0) {
    return null;
  }

  const lowerRoles = roles.map((role) => role.toLowerCase());

  for (const entity of entities) {
    if (entity.roles && entity.roles.length > 0) {
      const entityRoles = entity.roles.map((role) => role.toLowerCase());

      const matched = entityRoles.some((role) => lowerRoles.includes(role));

      if (matched) {
        return entity;
      }
    }

    if (entity.entities) {
      const found = findEntityByAnyRole(entity.entities, roles);

      if (found) {
        return found;
      }
    }
  }

  return null;
}

function findEntityByRole(entities, role) {
  return findEntityByAnyRole(entities, [role]);
}

// ================= VCARD HELPERS =================
function getVcardValue(entity, key) {
  if (!entity || !entity.vcardArray || !entity.vcardArray[1]) {
    return "Not available";
  }

  const vcard = entity.vcardArray[1];
  const item = vcard.find((row) => row[0] === key);

  if (!item) {
    return "Not available";
  }

  return cleanValue(item[3]);
}

function getVcardAddress(entity) {
  const emptyAddress = {
    street: "Not available",
    city: "Not available",
    state: "Not available",
    postalCode: "Not available",
    country: "Not available",
  };

  if (!entity || !entity.vcardArray || !entity.vcardArray[1]) {
    return emptyAddress;
  }

  const vcard = entity.vcardArray[1];
  const adr = vcard.find((row) => row[0] === "adr");

  if (!adr || !Array.isArray(adr[3])) {
    return emptyAddress;
  }

  const address = adr[3];

  return {
    street: cleanValue(address[2]),
    city: cleanValue(address[3]),
    state: cleanValue(address[4]),
    postalCode: cleanValue(address[5]),
    country: cleanValue(address[6]),
  };
}

function getPhoneByType(entity, typeName) {
  if (!entity || !entity.vcardArray || !entity.vcardArray[1]) {
    return "Not available";
  }

  const vcard = entity.vcardArray[1];
  const wantedType = typeName.toLowerCase();

  const phone = vcard.find((row) => {
    if (row[0] !== "tel") return false;

    const params = row[1];

    if (!params || !params.type) {
      return wantedType === "voice";
    }

    if (Array.isArray(params.type)) {
      return params.type.map((item) => item.toLowerCase()).includes(wantedType);
    }

    return String(params.type).toLowerCase() === wantedType;
  });

  return phone ? cleanValue(phone[3]) : "Not available";
}

function getPublicId(entity, typeName) {
  if (!entity || !entity.publicIds) {
    return "Not available";
  }

  const targetType = typeName.toLowerCase();

  const publicId = entity.publicIds.find((item) => {
    if (!item.type) return false;

    const itemType = item.type.toLowerCase();

    return itemType === targetType || itemType.includes("iana");
  });

  return publicId ? cleanValue(publicId.identifier) : "Not available";
}

// ================= EVENT HELPERS =================
function getEventDate(data, actions) {
  if (!data.events || data.events.length === 0) {
    return "Not available";
  }

  const lowerActions = actions.map((action) => action.toLowerCase());

  const foundEvent = data.events.find((event) => {
    if (!event.eventAction) return false;

    const eventAction = event.eventAction.toLowerCase();

    return lowerActions.includes(eventAction);
  });

  return foundEvent ? cleanValue(foundEvent.eventDate) : "Not available";
}

// ================= RDAP NAME HELPERS =================
function getRdapEntityName(data) {
  if (!data.entities || data.entities.length === 0) {
    return "Not available";
  }

  const registrarEntity = findEntityByAnyRole(data.entities, ["registrar"]);

  const orgEntity =
    registrarEntity ||
    findEntityByAnyRole(data.entities, ["registrant"]) ||
    data.entities[0];

  const fn = getVcardValue(orgEntity, "fn");
  const org = getVcardValue(orgEntity, "org");

  if (hasUsefulValue(fn)) {
    return fn;
  }

  if (hasUsefulValue(org)) {
    return org;
  }

  return "Not available";
}

// ================= FIND REGISTRAR RDAP URL =================
function findRegistrarRdapUrl(data, target) {
  const ignoreUrls = [
    "rdap.org",
    "rdap.verisign.com",
    "rdap.nic.my",
    "rdap.mynic.my",
  ];

  const possibleLinks = [];

  function collectLinksFromObject(obj) {
    if (!obj) return;

    if (Array.isArray(obj.links)) {
      obj.links.forEach((link) => {
        if (link && link.href) {
          possibleLinks.push(link.href);
        }
      });
    }

    if (Array.isArray(obj.entities)) {
      obj.entities.forEach((entity) => {
        collectLinksFromObject(entity);
      });
    }
  }

  collectLinksFromObject(data);

  const registrarLink = possibleLinks.find((href) => {
    const lowerHref = href.toLowerCase();

    const looksLikeRdap =
      lowerHref.includes("/rdap/domain/") ||
      lowerHref.includes("/rdap/") ||
      lowerHref.includes("rdap");

    const ignored = ignoreUrls.some((ignoreUrl) =>
      lowerHref.includes(ignoreUrl)
    );

    return looksLikeRdap && !ignored;
  });

  if (registrarLink) {
    return registrarLink;
  }

  const registrarName = getRdapEntityName(data).toLowerCase();

  if (registrarName.includes("markmonitor")) {
    return `https://rdap.markmonitor.com/rdap/domain/${target}`;
  }

  return null;
}

// ================= MERGE REGISTRY + REGISTRAR RDAP DATA =================
function mergeRdapData(registryData, registrarData) {
  if (!registrarData || Object.keys(registrarData).length === 0) {
    return registryData;
  }

  return {
    ...registryData,

    ldhName: registrarData.ldhName || registryData.ldhName,
    unicodeName: registrarData.unicodeName || registryData.unicodeName,
    handle: registrarData.handle || registryData.handle,
    port43: registrarData.port43 || registryData.port43,

    events:
      registrarData.events && registrarData.events.length > 0
        ? registrarData.events
        : registryData.events,

    nameservers:
      registrarData.nameservers && registrarData.nameservers.length > 0
        ? registrarData.nameservers
        : registryData.nameservers,

    status:
      registrarData.status && registrarData.status.length > 0
        ? registrarData.status
        : registryData.status,

    entities: [
      ...(registryData.entities || []),
      ...(registrarData.entities || []),
    ],

    links: [
      ...(registryData.links || []),
      ...(registrarData.links || []),
    ],

    notices: [
      ...(registryData.notices || []),
      ...(registrarData.notices || []),
    ],

    remarks: [
      ...(registryData.remarks || []),
      ...(registrarData.remarks || []),
    ],
  };
}

// ================= BUILD DOMAIN INFO =================
function buildDomainInfo(data, target, searchType) {
  let nameServers = "Not available";

  if (data.nameservers && data.nameservers.length > 0) {
    nameServers = data.nameservers
      .map((ns) => ns.ldhName || ns.unicodeName)
      .filter(Boolean);
  }

  if (searchType === "IP Address" && data.startAddress && data.endAddress) {
    nameServers = [`${data.startAddress} - ${data.endAddress}`];
  }

  return {
    domain: cleanValue(data.ldhName || data.unicodeName || data.handle || target),
    registeredOn: getEventDate(data, ["registration"]),
    expiresOn: getEventDate(data, ["expiration"]),
    updatedOn: getEventDate(data, [
      "last changed",
      "last update of rdap database",
    ]),
    status: data.status && data.status.length > 0 ? data.status : "Not available",
    nameServers,
  };
}

// ================= BUILD REGISTRAR INFO =================
function buildRegistrarInfo(data) {
  const registrarEntity = findEntityByAnyRole(data.entities, ["registrar"]);
  const abuseEntity = findEntityByAnyRole(data.entities, ["abuse"]);

  return {
    registrar: getRdapEntityName(data),
    ianaId: getPublicId(registrarEntity, "IANA Registrar ID"),
    email: getVcardValue(registrarEntity, "email"),
    abuseEmail: getVcardValue(abuseEntity, "email"),
    abusePhone: getPhoneByType(abuseEntity, "voice"),
    whoisServer: cleanValue(data.port43 || data.whoisServer),
  };
}

// ================= BUILD CONTACT INFO =================
function buildContactInfo(data, roles, target) {
  const entity = findEntityByAnyRole(data.entities, roles);
  const address = getVcardAddress(entity);

  let country = address.country;

  if (!hasUsefulValue(country)) {
    country = getCountryFallback(data, target);
  }

  return {
    name: getVcardValue(entity, "fn"),
    organization: getVcardValue(entity, "org"),
    street: address.street,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country,
    phone: getPhoneByType(entity, "voice"),
    fax: getPhoneByType(entity, "fax"),
    email: getVcardValue(entity, "email"),
  };
}

function buildRegistrantContact(data, target) {
  return buildContactInfo(data, ["registrant"], target);
}

function buildTechnicalContact(data, target) {
  return buildContactInfo(data, ["technical", "tech"], target);
}

function buildAdminContact(data, target) {
  return buildContactInfo(data, ["administrative", "admin"], target);
}

// ================= RDAP LOOKUP =================
async function getRdapResult(target, searchType) {
  try {
    let rdapUrl = "";

    if (searchType === "IP Address") {
      rdapUrl = `https://rdap.org/ip/${target}`;
    } else if (target.endsWith(".my")) {
      rdapUrl = `https://rdap.mynic.my/rdap/domain/${target}`;
    } else {
      rdapUrl = `https://rdap.org/domain/${target}`;
    }

    console.log("Registry RDAP URL:", rdapUrl);

    const response = await axios.get(rdapUrl, {
      timeout: 15000,
      headers: {
        "User-Agent": "RaptorScanner-FYP",
        Accept: "application/rdap+json, application/json",
      },
    });

    let data = response.data || {};

    const registrarRdapUrl = findRegistrarRdapUrl(data, target);

    if (registrarRdapUrl && searchType !== "IP Address") {
      try {
        console.log("Registrar RDAP URL:", registrarRdapUrl);

        const registrarResponse = await axios.get(registrarRdapUrl, {
          timeout: 15000,
          headers: {
            "User-Agent": "RaptorScanner-FYP",
            Accept: "application/rdap+json, application/json",
          },
        });

        const registrarData = registrarResponse.data || {};

        data = mergeRdapData(data, registrarData);
      } catch (registrarErr) {
        console.error("REGISTRAR RDAP ERROR:", registrarErr.message);
      }
    }

    const domainInfo = buildDomainInfo(data, target, searchType);
    const registrarInfo = buildRegistrarInfo(data);
    const registrantContact = buildRegistrantContact(data, target);
    const technicalContact = buildTechnicalContact(data, target);
    const adminContact = buildAdminContact(data, target);

    return {
      registrar: registrarInfo.registrar,
      creationDate: domainInfo.registeredOn,
      expiryDate: domainInfo.expiresOn,
      updatedDate: domainInfo.updatedOn,
      nameServers: listToString(domainInfo.nameServers),
      status: listToString(domainInfo.status),
      rawData: data,
      domainInfo,
      registrarInfo,
      registrantContact,
      technicalContact,
      adminContact,
    };
  } catch (err) {
    console.error("RDAP ERROR:", err.message);

    if (err.response) {
      console.error("RDAP STATUS:", err.response.status);
      console.error("RDAP DATA:", err.response.data);
    }

    return {
      registrar: "Not available",
      creationDate: "Not available",
      expiryDate: "Not available",
      updatedDate: "Not available",
      nameServers: "Not available",
      status: "RDAP lookup failed",
      rawData: {},
      domainInfo: {},
      registrarInfo: {},
      registrantContact: {},
      technicalContact: {},
      adminContact: {},
    };
  }
}

// ================= REDIRECT IF USER OPENS /scan =================
router.get("/scan", (req, res) => {
  res.redirect("/dashboard");
});

// ================= FILE SCAN ROUTE =================
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

    const scanResult = await scanWithClamAV(filePath);
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
      md5Hash,
      sha1Hash,
      sha256Hash,
      scanResult,
      riskLevel,
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

// ================= URL SCAN ROUTE =================
router.post("/scan-url", isAuthenticated, async (req, res) => {
  try {
    const url = String(req.body.url || "").trim();

    const urlResult = await runUrlReputationScan(url);

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

// ================= SEARCH ROUTE WITH RDAP / WHOIS LOOKUP =================
router.post("/search", isAuthenticated, async (req, res) => {
  try {
    const query = req.body.query.trim();
    const searchType = detectSearchType(query);

    let fileResults = [];
    let urlResults = [];
    let whoisResult = null;

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
    } else if (searchType === "URL") {
      const domainName = cleanWhoisTarget(query);

      const [urls] = await db.query(
        `SELECT * FROM url_scans
         WHERE url = ?
         OR domain LIKE ?
         OR url LIKE ?
         ORDER BY scanned_at DESC
         LIMIT 1`,
        [query, `%${domainName}%`, `%${domainName}%`]
      );

      urlResults = urls;
    } else if (searchType === "Domain") {
      const domainName = cleanWhoisTarget(query);

      const [urls] = await db.query(
        `SELECT u.*
         FROM url_scans u
         INNER JOIN (
           SELECT url, MAX(id) AS latest_id
           FROM url_scans
           WHERE domain LIKE ?
           OR url LIKE ?
           GROUP BY url
         ) latest ON u.id = latest.latest_id
         ORDER BY u.scanned_at DESC
         LIMIT 1`,
        [`%${domainName}%`, `%${domainName}%`]
      );

      urlResults = urls;
    } else if (searchType === "IP Address") {
      const [urls] = await db.query(
        `SELECT u.*
         FROM url_scans u
         INNER JOIN (
           SELECT url, MAX(id) AS latest_id
           FROM url_scans
           WHERE domain = ?
           OR url LIKE ?
           GROUP BY url
         ) latest ON u.id = latest.latest_id
         ORDER BY u.scanned_at DESC
         LIMIT 1`,
        [query, `%${query}%`]
      );

      urlResults = urls;
    }

    if (
      searchType === "URL" ||
      searchType === "Domain" ||
      searchType === "IP Address"
    ) {
      const rdapTarget = cleanWhoisTarget(query);
      const rdapData = await getRdapResult(rdapTarget, searchType);

      console.log("RDAP TARGET:", rdapTarget);
      console.log("RDAP RESULT:", rdapData.rawData);

      whoisResult = {
        domain: rdapTarget,
        registrar: rdapData.registrar,
        creationDate: rdapData.creationDate,
        expiryDate: rdapData.expiryDate,
        updatedDate: rdapData.updatedDate,
        nameServers: rdapData.nameServers,
        status: rdapData.status,
        rawData: rdapData.rawData,

        domainInfo: rdapData.domainInfo,
        registrarInfo: rdapData.registrarInfo,
        registrantContact: rdapData.registrantContact,
        technicalContact: rdapData.technicalContact,
        adminContact: rdapData.adminContact,
      };

      try {
        await db.query(
          `INSERT INTO whois_lookups
          (user_id, query, domain, registrar, creation_date, expiry_date, updated_date, name_servers, status, raw_data)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.session.user.id,
            query,
            rdapTarget,
            whoisResult.registrar,
            whoisResult.creationDate,
            whoisResult.expiryDate,
            whoisResult.updatedDate,
            whoisResult.nameServers,
            whoisResult.status,
            JSON.stringify(whoisResult.rawData, null, 2),
          ]
        );
      } catch (dbErr) {
        console.error("WHOIS SAVE ERROR:", dbErr.message);
      }
    }

    let resultSummary = "No matching scan record found";

    if (fileResults.length > 0) {
      resultSummary = "Matching file scan found";
    } else if (urlResults.length > 0) {
      resultSummary = "Matching URL scan found";
    } else if (whoisResult) {
      resultSummary = "RDAP information retrieved";
    }

    try {
      await saveIndicatorLookup(
        req.session.user.id,
        query,
        searchType,
        resultSummary
      );
    } catch (historyErr) {
      console.error("INDICATOR HISTORY SAVE ERROR:", historyErr.message);
    }

    res.render("search-result", {
      user: req.session.user,
      query,
      searchType,
      fileResults,
      urlResults,
      whoisResult,
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

// ================= SCAN HISTORY PAGE =================
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

    const [indicatorLookups] = await db.query(
      `SELECT * FROM indicator_lookups
       WHERE user_id = ?
       ORDER BY checked_at DESC`,
      [req.session.user.id]
    );

    res.render("history", {
      user: req.session.user,
      fileScans,
      urlScans,
      indicatorLookups,
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
