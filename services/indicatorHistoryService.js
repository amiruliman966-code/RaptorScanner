const db = require("../config/db");

async function initializeIndicatorHistoryTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS indicator_lookups (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      query VARCHAR(2048) NOT NULL,
      search_type VARCHAR(40) NOT NULL,
      result_summary VARCHAR(255) NOT NULL,
      checked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY user_id (user_id),
      CONSTRAINT indicator_lookups_user_fk
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);
}

async function saveIndicatorLookup(userId, query, searchType, resultSummary) {
  await db.query(
    `INSERT INTO indicator_lookups
      (user_id, query, search_type, result_summary)
     VALUES (?, ?, ?, ?)`,
    [userId, query, searchType, resultSummary]
  );
}

module.exports = {
  initializeIndicatorHistoryTable,
  saveIndicatorLookup,
};
