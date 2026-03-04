CREATE TABLE IF NOT EXISTS form_template_versions (
  id VARCHAR(255) PRIMARY KEY,
  template_id VARCHAR(255) NOT NULL,
  version INT NOT NULL,
  fields JSON NOT NULL,
  status ENUM('draft', 'active', 'archived') NOT NULL DEFAULT 'draft',
  created_by VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL,
  activated_at DATETIME,
  archived_at DATETIME,
  notes TEXT,
  change_log TEXT,
  INDEX idx_template_id (template_id),
  INDEX idx_status (status),
  INDEX idx_version (template_id, version),
  INDEX idx_created_by (created_by),
  INDEX idx_created_at (created_at),
  UNIQUE KEY uk_template_version (template_id, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
