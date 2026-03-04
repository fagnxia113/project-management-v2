-- 创建表单模板表
CREATE TABLE IF NOT EXISTS form_templates (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  version INT NOT NULL DEFAULT 1,
  layout JSON NOT NULL,
  fields JSON NOT NULL,
  sections JSON,
  style JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_version (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 添加form_template_id字段到workflow_definitions表
ALTER TABLE workflow_definitions 
ADD COLUMN form_template_id VARCHAR(36) NULL AFTER form_schema,
ADD INDEX idx_form_template_id (form_template_id);
