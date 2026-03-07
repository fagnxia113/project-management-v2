-- ============================================
-- 添加调拨单缺失字段
-- ============================================

ALTER TABLE equipment_transfer_orders 
ADD COLUMN from_manager_id VARCHAR(36) COMMENT '调出负责人ID';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN from_manager VARCHAR(100) COMMENT '调出负责人姓名';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN to_manager_id VARCHAR(36) COMMENT '调入负责人ID';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN to_manager VARCHAR(100) COMMENT '调入负责人姓名';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN equipment_id VARCHAR(36) COMMENT '设备ID';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN equipment_code VARCHAR(50) COMMENT '设备编号';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN equipment_name VARCHAR(200) COMMENT '设备名称';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN equipment_category ENUM('instrument', 'fake_load', 'cable') COMMENT '设备类别';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN solution TEXT COMMENT '解决方案';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN estimated_arrival DATE COMMENT '预计到达时间';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN estimated_ship_date DATE COMMENT '预计发货时间';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN estimated_arrival_date DATE COMMENT '预计到达日期';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN transport_method VARCHAR(50) COMMENT '运输方式';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN tracking_no VARCHAR(100) COMMENT '物流单号';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN approval_id VARCHAR(36) COMMENT '审批ID';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN from_approved_at TIMESTAMP NULL COMMENT '调出审批时间';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN from_approved_by VARCHAR(36) COMMENT '调出审批人ID';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN from_approval_comment TEXT COMMENT '调出审批意见';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN to_approved_at TIMESTAMP NULL COMMENT '调入审批时间';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN to_approved_by VARCHAR(36) COMMENT '调入审批人ID';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN to_approval_comment TEXT COMMENT '调入审批意见';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN shipped_at TIMESTAMP NULL COMMENT '发货时间';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN shipped_by VARCHAR(36) COMMENT '发货人ID';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN shipping_no VARCHAR(100) COMMENT '发货单号';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN shipping_attachment TEXT COMMENT '发货附件';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN received_at TIMESTAMP NULL COMMENT '收货时间';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN received_by VARCHAR(36) COMMENT '收货人ID';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN receive_status ENUM('normal', 'damaged', 'missing', 'partial') COMMENT '收货状态';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN receive_comment TEXT COMMENT '收货备注';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN total_quantity INT DEFAULT 0 COMMENT '总数量';

-- ============================================
-- 完成
-- ============================================
