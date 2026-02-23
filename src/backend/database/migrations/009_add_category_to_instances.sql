-- ============================================
-- 添加 workflow_instances 表的 category 字段
-- ============================================

ALTER TABLE workflow_instances
ADD COLUMN category VARCHAR(50) COMMENT '流程分类' AFTER definition_version;
