CREATE TABLE IF NOT EXISTS form_drafts (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  template_id VARCHAR(255) NOT NULL,
  template_key VARCHAR(255) NOT NULL,
  form_data JSON NOT NULL,
  status ENUM('draft', 'auto_saved') NOT NULL DEFAULT 'draft',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  metadata JSON,
  INDEX idx_user_id (user_id),
  INDEX idx_template_id (template_id),
  INDEX idx_template_key (template_key),
  INDEX idx_status (status),
  INDEX idx_updated_at (updated_at),
  INDEX idx_user_template (user_id, template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
