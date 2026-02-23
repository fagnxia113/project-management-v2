-- ============================================
-- 迁移: 添加 skipped 到流程实例结果枚举
-- 文件: 013_add_skipped_to_instance_result.sql
-- 说明: 支持流程因无审批人而自动跳过的场景
-- ============================================

-- 修改流程实例表的 result 字段，添加 skipped 选项
ALTER TABLE workflow_instances 
MODIFY COLUMN result ENUM('approved', 'rejected', 'withdrawn', 'terminated', 'skipped') 
COMMENT '流程结果';

-- 添加当前节点字段，用于跟踪流程当前活动节点
ALTER TABLE workflow_instances 
ADD COLUMN current_node_id VARCHAR(100) 
COMMENT '当前活动节点ID' 
AFTER result;

-- 添加当前节点名称字段（冗余存储，方便查询）
ALTER TABLE workflow_instances 
ADD COLUMN current_node_name VARCHAR(200) 
COMMENT '当前活动节点名称' 
AFTER current_node_id;
