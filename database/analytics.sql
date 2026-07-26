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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
