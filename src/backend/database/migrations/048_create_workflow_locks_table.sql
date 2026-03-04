CREATE TABLE IF NOT EXISTS workflow_locks (
  id VARCHAR(255) PRIMARY KEY,
  lock_key VARCHAR(255) NOT NULL,
  owner VARCHAR(255) NOT NULL,
  acquired_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lock_key (lock_key),
  INDEX idx_expires_at (expires_at),
  INDEX idx_owner (owner)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
