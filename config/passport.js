const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const db = require("./db");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const name = profile.displayName;
        const email = profile.emails[0].value;

        const [existingGoogleUser] = await db.query(
          "SELECT * FROM users WHERE google_id = ?",
          [googleId]
        );

        if (existingGoogleUser.length > 0) {
          return done(null, existingGoogleUser[0]);
        }

        const [existingEmailUser] = await db.query(
          "SELECT * FROM users WHERE email = ?",
          [email]
        );

        if (existingEmailUser.length > 0) {
          await db.query(
            "UPDATE users SET google_id = ?, auth_provider = ? WHERE email = ?",
            [googleId, "google", email]
          );

          const [updatedUser] = await db.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
          );

          return done(null, updatedUser[0]);
        }

        await db.query(
          `INSERT INTO users (name, email, password, google_id, auth_provider)
           VALUES (?, ?, ?, ?, ?)`,
          [name, email, "GOOGLE_LOGIN", googleId, "google"]
        );

        const [newUser] = await db.query(
          "SELECT * FROM users WHERE google_id = ?",
          [googleId]
        );

        return done(null, newUser[0]);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

module.exports = passport;