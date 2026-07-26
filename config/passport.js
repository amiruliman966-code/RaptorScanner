require("dotenv").config();

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const db = require("./db");

// ================= CHECK GOOGLE ENV VALUE =================
function hasRealGoogleOAuthValue(value) {
  if (!value) return false;

  const normalizedValue = value.trim().toLowerCase();

  const placeholders = [
    "your_google_client_id",
    "your_google_client_secret",
    "replace_me",
    "placeholder",
    "changeme",
    "put_your",
  ];

  return !placeholders.some((placeholder) =>
    normalizedValue.includes(placeholder)
  );
}

// ================= GOOGLE OAUTH READY CHECK =================
const googleOAuthReady =
  hasRealGoogleOAuthValue(process.env.GOOGLE_CLIENT_ID) &&
  hasRealGoogleOAuthValue(process.env.GOOGLE_CLIENT_SECRET) &&
  hasRealGoogleOAuthValue(process.env.GOOGLE_CALLBACK_URL);

if (!googleOAuthReady) {
  console.warn(
    "Google OAuth is disabled: set valid GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL values."
  );
} else {
  console.log("Google OAuth configured.");
  console.log("Google Callback URL:", process.env.GOOGLE_CALLBACK_URL);

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID.trim(),
        clientSecret: process.env.GOOGLE_CLIENT_SECRET.trim(),
        callbackURL: process.env.GOOGLE_CALLBACK_URL.trim(),
      },

      async (accessToken, refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const name = profile.displayName || "Google User";

          const email =
            profile.emails && profile.emails.length > 0
              ? profile.emails[0].value
              : null;

          if (!email) {
            return done(null, false, {
              message: "Google account email not found.",
            });
          }

          // ================= CHECK USER BY GOOGLE ID =================
          const [existingGoogleUser] = await db.query(
            "SELECT * FROM users WHERE google_id = ? LIMIT 1",
            [googleId]
          );

          if (existingGoogleUser.length > 0) {
            return done(null, existingGoogleUser[0]);
          }

          // ================= CHECK USER BY EMAIL =================
          const [existingEmailUser] = await db.query(
            "SELECT * FROM users WHERE email = ? LIMIT 1",
            [email]
          );

          if (existingEmailUser.length > 0) {
            const user = existingEmailUser[0];

            await db.query(
              `UPDATE users
               SET google_id = ?, auth_provider = ?
               WHERE id = ?`,
              [googleId, "google", user.id]
            );

            const [updatedUser] = await db.query(
              "SELECT * FROM users WHERE id = ? LIMIT 1",
              [user.id]
            );

            return done(null, updatedUser[0]);
          }

          // ================= CREATE NEW GOOGLE USER =================
          const [result] = await db.query(
            `INSERT INTO users
             (name, email, password, google_id, auth_provider, role)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, email, "GOOGLE_LOGIN", googleId, "google", "user"]
          );

          const [newUser] = await db.query(
            "SELECT * FROM users WHERE id = ? LIMIT 1",
            [result.insertId]
          );

          return done(null, newUser[0]);
        } catch (err) {
          console.error("GOOGLE STRATEGY ERROR:", err);
          return done(err, null);
        }
      }
    )
  );
}

// This lets authRoutes.js know whether Google login is enabled
passport.googleOAuthReady = googleOAuthReady;

module.exports = passport;
