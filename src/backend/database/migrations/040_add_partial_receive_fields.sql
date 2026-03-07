ALTER TABLE equipment_transfer_order_items 
ADD COLUMN received_quantity INT DEFAULT 0 COMMENT '实际收货数量' AFTER quantity;

ALTER TABLE equipment_transfer_orders 
ADD COLUMN total_received_quantity INT DEFAULT 0 COMMENT '总收货数量' AFTER receive_comment;

ALTER TABLE equipment_transfer_orders 
ADD COLUMN return_comment TEXT COMMENT '回退说明' AFTER total_received_quantity;

ALTER TABLE equipment_transfer_orders 
ADD COLUMN returned_at DATETIME COMMENT '回退时间' AFTER return_comment;

ALTER TABLE equipment_transfer_orders 
ADD COLUMN returned_by VARCHAR(36) COMMENT '回退操作人ID' AFTER returned_at;

ALTER TABLE equipment_transfer_orders 
MODIFY COLUMN status ENUM('pending_from', 'pending_to', 'shipping', 'receiving', 'partial_received', 'completed', 'rejected', 'cancelled', 'withdrawn') DEFAULT 'pending_from' COMMENT '状态';
