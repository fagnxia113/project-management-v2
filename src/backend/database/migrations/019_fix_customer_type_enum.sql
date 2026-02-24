-- 修复客户类型枚举值与元数据定义一致
-- 元数据定义: direct(直签客户), channel(渠道客户), agent(代理商)

-- 步骤1: 先添加新列
ALTER TABLE customers ADD COLUMN type_new ENUM('direct', 'channel', 'agent') DEFAULT 'direct';

-- 步骤2: 迁移数据
UPDATE customers SET type_new = 'direct' WHERE type = 'enterprise';
UPDATE customers SET type_new = 'channel' WHERE type = 'government';
UPDATE customers SET type_new = 'agent' WHERE type = 'research';

-- 步骤3: 删除旧列
ALTER TABLE customers DROP COLUMN type;

-- 步骤4: 重命名新列
ALTER TABLE customers CHANGE COLUMN type_new type ENUM('direct', 'channel', 'agent') DEFAULT 'direct';