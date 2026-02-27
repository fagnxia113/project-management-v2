# 设备管理模块优化设计方案

> 版本：v2.0  
> 日期：2026-02-26  
> 状态：设计评审中

---

## 一、设计背景与目标

### 1.1 背景

现有设备管理模块已实现基础功能，但在自动化程度、状态管理、校准提醒、批量操作等方面存在不足。参考《其他系统方案》的设计思想，结合现有系统架构和用户实际操作场景，对设备管理模块进行深度优化。

### 1.2 核心目标

1. **一物一码**：每台设备独立管理，自动生成唯一管理编号
2. **三状态分离**：主机状态、使用状态、位置状态独立管理，相互约束
3. **自动联动**：流程驱动状态更新，减少人工干预
4. **批量操作**：支持批量调拨、归还、入库，提升操作效率
5. **智能提醒**：校准到期自动提醒，过期自动标记
6. **责任追踪**：负责人根据位置自动匹配，责任清晰

### 1.3 设计原则

- **继承核心业务规则**：保留现有设计的合理部分
- **消除低代码限制**：通过代码实现复杂联动逻辑
- **数据全域关联**：设备与仓库、项目、员工建立强关联
- **操作极简化**：自动更新字段无需人工维护
- **配置化可扩展**：核心规则支持后台配置
- **用户视角优先**：从用户实际操作场景出发设计功能

---

## 二、业务本质分析

### 2.1 设备生命周期

```
采购入库 → 库存管理 → 项目领用 → 项目使用 → 归还入库 → 维修/报废
    ↓           ↓           ↓           ↓           ↓           ↓
 生成编号    状态追踪    位置变更    责任转移    状态重置    生命周期结束
```

### 2.2 核心业务问题

| 问题 | 解决方案 |
|------|----------|
| 资产追踪 | 三状态分离，实时记录位置、使用、健康状态 |
| 责任归属 | 根据位置状态自动匹配负责人 |
| 状态一致性 | 状态约束校验，禁止矛盾状态 |
| 校准管理 | 定时任务扫描，提前提醒，过期联动 |
| 流转效率 | 流程驱动自动更新，减少人工操作 |
| 批量操作 | 单据管理，一次提交批量处理 |

### 2.3 设备分类差异

| 维度 | 仪器类 | 假负载/线缆类 |
|------|--------|---------------|
| 管理粒度 | 一物一码，每台独立管理 | 按数量汇总管理 |
| 入库方式 | 按数量循环创建多个设备实例 | 只创建一条记录，数量字段存储总数量 |
| 序列号管理 | 每台设备都有独立的序列号 | 不需要序列号 |
| 管理编号 | 每台设备都有独立的管理编码 | 每条记录有一个管理编码 |
| 调拨方式 | 逐台选择调拨 | 按数量调拨，支持部分调拨 |
| 调拨逻辑 | 每台设备独立调拨到目标位置 | 源位置减少数量，目标位置新增记录 |
| 校准需求 | 需要定期校准，过期影响使用 | 无校准需求 |
| 价值密度 | 高价值，需要精细追踪 | 相对低价值，批量管理 |
| 状态敏感 | 校准状态直接影响可用性 | 仅关注物理状态 |

#### 调拨逻辑示例

**仪器类调拨**：
```
场景：从A仓库调拨3台频谱分析仪到B仓库
操作：
1. 选择3台设备（每台有独立ID）
2. 创建调拨单，包含3条明细
3. 审批通过后，更新3台设备的位置为B仓库
结果：
- A仓库：减少3台设备
- B仓库：增加3台设备
- 每台设备保持独立追踪
```

**假负载/线缆类调拨**：
```
场景：A仓库有5个假负载，调拨1个到B仓库
操作：
1. 选择假负载，输入调拨数量：1
2. 创建调拨单
3. 审批通过后：
   - 检查B仓库是否已存在相同设备
   - 如果存在：更新数量（原数量 + 调拨数量）
   - 如果不存在：创建新记录，数量为调拨数量
   - 更新A仓库的假负载数量：5 → 4
结果：
- A仓库：假负载数量从5变为4
- B仓库：
  - 情况1（不存在相同设备）：新增1条记录，数量为1
  - 情况2（已存在相同设备）：更新现有记录，数量增加1
- 同一位置的相同设备会合并管理
```

**合并逻辑示例**：
```
场景：A项目原来有3个假负载，现在又调拨进来5个假负载
操作：
1. 检查A项目是否已存在相同设备（相同类别、设备名称、型号）
2. 如果存在：更新数量（3 + 5 = 8）
3. 如果不存在：创建新记录，数量为5
结果：
- A项目：只有一条记录，数量为8（合并）
- 不是两条记录（3个 + 5个）
```

### 2.4 用户操作场景分析

#### 项目经理典型场景

| 场景 | 操作 | 频率 |
|------|------|------|
| 项目启动 | 批量调拨设备到项目 | 低频（项目开始时） |
| 项目进行中 | 追加调拨设备 | 中频 |
| 项目结束 | 批量归还项目所有设备 | 低频（项目结束时） |
| 设备巡检 | 查看项目设备状态 | 高频（每周/每月） |

#### 仓库管理员典型场景

| 场景 | 操作 | 频率 |
|------|------|------|
| 采购入库 | 批量入库新设备 | 中频 |
| 调拨审批 | 审批调拨申请 | 高频 |
| 归还确认 | 确认设备归还 | 中频 |
| 库存盘点 | 批量导出、核对设备 | 低频（季度） |
| 设备维护 | 批量登记维修 | 中频 |

#### 批量操作需求分析

**批量调拨场景**：
- 项目启动时，需要调拨多台设备到项目现场
- 项目进行中，可能需要追加调拨设备
- 用户希望一次性选择多台设备，统一提交调拨申请
- 需要支持按条件筛选后批量选择（如按型号、仓库、状态）
- 需要支持逐台勾选选择
- 需要支持扫码快速选择

**批量归还场景**：
- 项目结束时，需要将项目所有设备归还到仓库
- 可能部分归还，只归还部分设备
- 需要显示项目所有设备，方便选择
- 需要记录设备检查情况（正常/损坏/缺少配件）
- 损坏设备需要自动创建维修单

**批量入库场景**：
- 采购新设备时，需要批量入库
- 仪器类设备需要逐台输入序列号
- 假负载类设备可以批量入库，无需序列号
- 需要支持批量导入（Excel）
- 需要支持统一设置校准信息

---

## 三、数据模型设计

### 3.1 表结构设计原则

保持现有的**双表设计**（equipment_models + equipment_instances），符合数据库规范：

- **equipment_models（设备型号表）**：存储共享属性（品牌、规格、校准周期）
- **equipment_instances（设备实例表）**：存储个体属性（编号、状态、位置、负责人）

### 3.2 设备实例表优化

#### 现有字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) | 主键 |
| equipment_name | VARCHAR(100) | 设备名称 |
| model_no | VARCHAR(100) | 设备型号 |
| brand | VARCHAR(100) | 品牌 |
| category | ENUM('instrument', 'fake_load', 'cable') | 设备类别 |
| unit | VARCHAR(20) | 单位（台/米） |
| manage_code | VARCHAR(50) | 管理编号 |
| serial_number | VARCHAR(100) | 序列号（仅仪器类） |
| health_status | ENUM | 健康状态 |
| usage_status | ENUM | 使用状态 |
| location_status | ENUM | 位置状态 |
| location_id | VARCHAR(36) | 位置ID（仓库ID或项目ID） |
| keeper_id | VARCHAR(36) | 负责人ID |
| purchase_date | DATE | 采购日期 |
| purchase_price | DECIMAL(10,2) | 采购单价 |
| calibration_expiry | DATE | 校准到期日 |
| notes | TEXT | 备注 |

#### 新增字段

| 字段 | 类型 | 说明 | 重要性 |
|------|------|------|--------|
| quantity | INT | 数量（仅假负载/线缆类使用，仪器类始终为1） | ⭐⭐⭐⭐⭐ |

#### 字段重命名建议

| 现有名称 | 建议名称 | 说明 |
|----------|----------|------|
| health_status | host_status | 更直观表达"主机状态" |
| location_status | position_status | 与方案保持一致 |

### 3.3 状态字段设计

#### 主机状态（host_status）

| 值 | 名称 | 说明 | 影响 |
|----|------|------|------|
| normal | 正常 | 设备完好，可正常使用 | 无限制 |
| slightly_damaged | 轻微损坏 | 不影响使用，需记录 | 调拨时提示 |
| affected | 影响使用 | 影响正常使用，需维修 | 调拨/归还时强制展示损坏说明 |
| maintenance | 维修中 | 正在维修 | 锁定设备 |
| scrapped | 报废 | 已报废 | 禁止所有流转 |

#### 使用状态（usage_status）

| 值 | 名称 | 说明 | 约束 |
|----|------|------|------|
| idle | 闲置 | 设备未被使用 | 在库时必须闲置 |
| in_use | 使用中 | 设备正在使用 | 在项目时必须使用中 |

#### 位置状态（position_status）

| 值 | 名称 | 说明 | 负责人来源 |
|----|------|------|------------|
| warehouse | 在库 | 设备在仓库 | 仓库管理员 |
| project | 在项目 | 设备在项目现场 | 项目经理 |
| maintenance | 维修中 | 设备正在维修 | 保持不变 |
| transfer | 调拨中 | 设备正在调拨途中 | 保持不变 |

### 3.4 状态约束规则

```
约束1：主机状态=报废 → 禁止所有流转
约束2：位置状态=维修中/调拨中 → 禁止发起新流转
约束3：位置状态=在库 → 使用状态必须=闲置
约束4：位置状态=在项目 → 使用状态必须=使用中
约束5：主机状态=影响使用 → 调拨/归还时强制展示损坏说明
```

### 3.5 单据表设计

为支持批量操作，需要设计单据管理表结构。

#### 调拨单表（equipment_transfer_orders）

```sql
CREATE TABLE equipment_transfer_orders (
  id VARCHAR(36) PRIMARY KEY,
  order_no VARCHAR(50) NOT NULL COMMENT '调拨单号：DB-20240315-001',
  transfer_type ENUM('single', 'batch') DEFAULT 'batch' COMMENT '调拨类型',
  
  -- 调出信息
  from_location_type ENUM('warehouse', 'project') COMMENT '调出位置类型',
  from_location_id VARCHAR(36) COMMENT '调出位置ID',
  from_location_name VARCHAR(100) COMMENT '调出位置名称',
  
  -- 调入信息
  to_location_type ENUM('warehouse', 'project') COMMENT '调入位置类型',
  to_location_id VARCHAR(36) COMMENT '调入位置ID',
  to_location_name VARCHAR(100) COMMENT '调入位置名称',
  
  -- 数量统计
  total_quantity INT DEFAULT 0 COMMENT '总数量',
  
  -- 申请信息
  transfer_reason TEXT COMMENT '调拨原因',
  expected_return_date DATE COMMENT '预计归还日期',
  applicant_id VARCHAR(36) COMMENT '申请人ID',
  applicant_name VARCHAR(50) COMMENT '申请人姓名',
  apply_date DATE COMMENT '申请日期',
  
  -- 审批信息
  status ENUM('draft', 'pending', 'approved', 'rejected', 'completed', 'cancelled') DEFAULT 'draft',
  approver_id VARCHAR(36) COMMENT '审批人ID',
  approver_name VARCHAR(50) COMMENT '审批人姓名',
  approve_time DATETIME COMMENT '审批时间',
  approve_remark TEXT COMMENT '审批意见',
  
  -- 收货确认
  receiver_id VARCHAR(36) COMMENT '收货人ID',
  receiver_name VARCHAR(50) COMMENT '收货人姓名',
  receive_time DATETIME COMMENT '收货时间',
  receive_remark TEXT COMMENT '收货备注',
  
  notes TEXT COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE INDEX idx_order_no (order_no),
  INDEX idx_applicant_id (applicant_id),
  INDEX idx_status (status),
  INDEX idx_from_location (from_location_id),
  INDEX idx_to_location (to_location_id)
);
```

#### 调拨单明细表（equipment_transfer_items）

```sql
CREATE TABLE equipment_transfer_items (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL COMMENT '调拨单ID',
  equipment_id VARCHAR(36) NOT NULL COMMENT '设备ID',
  
  -- 设备快照（提交时记录，避免后续变更影响）
  equipment_name VARCHAR(100) COMMENT '设备名称',
  manage_code VARCHAR(50) COMMENT '管理编号',
  serial_number VARCHAR(100) COMMENT '序列号',
  model_name VARCHAR(100) COMMENT '型号名称',
  
  -- 设备状态
  accessory_status TEXT COMMENT '配件情况',
  damage_status TEXT COMMENT '损坏情况',
  
  -- 明细状态
  status ENUM('pending', 'transferred', 'returned') DEFAULT 'pending',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_order_id (order_id),
  INDEX idx_equipment_id (equipment_id),
  FOREIGN KEY (order_id) REFERENCES equipment_transfer_orders(id) ON DELETE CASCADE
);
```

#### 归还单表（equipment_return_orders）

```sql
CREATE TABLE equipment_return_orders (
  id VARCHAR(36) PRIMARY KEY,
  order_no VARCHAR(50) NOT NULL COMMENT '归还单号：GH-20240630-001',
  
  -- 项目信息
  project_id VARCHAR(36) COMMENT '归还项目ID',
  project_name VARCHAR(100) COMMENT '项目名称',
  
  -- 归还仓库
  warehouse_id VARCHAR(36) COMMENT '归还仓库ID',
  warehouse_name VARCHAR(100) COMMENT '仓库名称',
  
  -- 数量统计
  total_quantity INT DEFAULT 0 COMMENT '总数量',
  normal_quantity INT DEFAULT 0 COMMENT '正常数量',
  damaged_quantity INT DEFAULT 0 COMMENT '损坏数量',
  
  -- 申请信息
  return_reason TEXT COMMENT '归还原因',
  applicant_id VARCHAR(36) COMMENT '申请人ID',
  applicant_name VARCHAR(50) COMMENT '申请人姓名',
  apply_date DATE COMMENT '申请日期',
  
  -- 审批信息
  status ENUM('draft', 'pending', 'approved', 'rejected', 'completed', 'cancelled') DEFAULT 'draft',
  approver_id VARCHAR(36) COMMENT '审批人ID',
  approve_time DATETIME COMMENT '审批时间',
  
  -- 确认信息
  confirmer_id VARCHAR(36) COMMENT '确认人ID',
  confirm_time DATETIME COMMENT '确认时间',
  
  notes TEXT COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE INDEX idx_order_no (order_no),
  INDEX idx_project_id (project_id),
  INDEX idx_warehouse_id (warehouse_id),
  INDEX idx_status (status)
);
```

#### 入库单表（equipment_inbound_orders）

```sql
CREATE TABLE equipment_inbound_orders (
  id VARCHAR(36) PRIMARY KEY,
  order_no VARCHAR(50) NOT NULL COMMENT '入库单号：RK-20240315-001',
  
  -- 入库信息
  inbound_type ENUM('purchase', 'repair_return', 'other') DEFAULT 'purchase' COMMENT '入库类型',
  warehouse_id VARCHAR(36) COMMENT '入库仓库ID',
  warehouse_name VARCHAR(100) COMMENT '仓库名称',
  
  -- 设备型号
  model_id VARCHAR(36) COMMENT '设备型号ID',
  model_name VARCHAR(100) COMMENT '型号名称',
  equipment_type ENUM('instrument', 'fake_load') COMMENT '设备类型',
  
  -- 数量统计
  total_quantity INT DEFAULT 0 COMMENT '总数量',
  
  -- 采购信息
  purchase_date DATE COMMENT '采购日期',
  purchase_price DECIMAL(10,2) COMMENT '采购单价',
  total_price DECIMAL(10,2) COMMENT '总价格',
  supplier VARCHAR(200) COMMENT '供应商',
  
  -- 申请信息
  applicant_id VARCHAR(36) COMMENT '申请人ID',
  applicant_name VARCHAR(50) COMMENT '申请人姓名',
  apply_date DATE COMMENT '申请日期',
  
  -- 审批信息
  status ENUM('draft', 'pending', 'approved', 'rejected', 'completed', 'cancelled') DEFAULT 'draft',
  approver_id VARCHAR(36) COMMENT '审批人ID',
  approve_time DATETIME COMMENT '审批时间',
  
  notes TEXT COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE INDEX idx_order_no (order_no),
  INDEX idx_warehouse_id (warehouse_id),
  INDEX idx_model_id (model_id),
  INDEX idx_status (status)
);
```

### 3.6 单据编号生成规则

| 单据类型 | 编号格式 | 示例 | 说明 |
|----------|----------|------|------|
| 调拨单 | DB-{日期}-{序号} | DB-20240315-001 | DB=调拨 |
| 归还单 | GH-{日期}-{序号} | GH-20240630-001 | GH=归还 |
| 入库单 | RK-{日期}-{序号} | RK-20240315-001 | RK=入库 |
| 维修单 | WX-{日期}-{序号} | WX-20240315-001 | WX=维修 |
| 报废单 | BF-{日期}-{序号} | BF-20240315-001 | BF=报废 |

**生成逻辑**：
```typescript
async function generateOrderNo(type: string): Promise<string> {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = {
    'transfer': 'DB',
    'return': 'GH',
    'inbound': 'RK',
    'repair': 'WX',
    'scrap': 'BF'
  }[type];
  
  const lock = await acquireLock(`order_no_${type}_${date}`);
  try {
    const todayCount = await db.queryOne(`
      SELECT COUNT(*) as count 
      FROM ${type}_orders 
      WHERE DATE(created_at) = CURDATE()
    `);
    
    const seq = (todayCount?.count || 0) + 1;
    return `${prefix}-${date}-${seq.toString().padStart(3, '0')}`;
  } finally {
    await releaseLock(lock);
  }
}
```

---

## 四、批量操作流程设计

### 4.1 批量调拨流程

```
步骤1：选择设备
├─ 方式A：按条件筛选后全选
│  ├─ 选择型号：频谱分析仪
│  ├─ 选择仓库：北京仓库
│  ├─ 选择状态：闲置
│  └─ 全选：10台设备
│
├─ 方式B：逐台勾选
│  ├─ 搜索设备：输入管理编号或名称
│  ├─ 勾选设备：逐台勾选
│  └─ 添加到列表
│
└─ 方式C：扫码选择
   ├─ 扫描设备二维码
   ├─ 自动添加到列表
   └─ 显示设备信息

步骤2：填写调拨信息
├─ 调出位置：自动填充（根据设备当前位置）
├─ 调入位置：选择项目或仓库
├─ 调拨原因：必填
├─ 预计归还日期：选填
└─ 备注：选填

步骤3：状态校验
├─ 检查设备状态
│  ├─ 过滤已报废设备
│  ├─ 过滤维修中设备
│  ├─ 过滤调拨中设备
│  └─ 提示不可调拨的设备
│
└─ 检查位置一致性
   ├─ 所有设备必须在同一位置
   └─ 或分别创建多个调拨单

步骤4：提交申请
├─ 生成调拨单号
├─ 创建调拨单记录
├─ 创建调拨明细记录
├─ 更新设备状态为"调拨中"
└─ 发送审批通知

步骤5：审批确认
├─ 仓库管理员审批
│  ├─ 查看调拨明细
│  ├─ 确认设备状态
│  └─ 审批通过/拒绝
│
└─ 目标位置确认收货
   ├─ 查看调拨明细
   ├─ 确认设备完好
   └─ 确认收货

步骤6：状态更新（审批通过后）
├─ 更新设备位置状态：调拨中 → 在项目
├─ 更新设备使用状态：闲置 → 使用中
├─ 更新设备位置：项目ID
├─ 更新设备负责人：项目经理
└─ 记录操作日志
```

### 4.2 批量归还流程

```
步骤1：选择项目
├─ 选择项目：项目A
├─ 显示项目信息
│  ├─ 项目名称、编号
│  ├─ 项目经理
│  └─ 项目状态
│
└─ 显示项目设备列表
   ├─ 设备总数：15台
   ├─ 使用中：12台
   ├─ 闲置：3台
   └─ 详细列表

步骤2：选择设备
├─ 全选：归还所有设备
├─ 部分选择：勾选需要归还的设备
└─ 按状态筛选：只显示使用中的设备

步骤3：填写归还信息
├─ 归还仓库：选择目标仓库
├─ 归还原因：项目结束/部分归还
├─ 设备检查情况：
│  ├─ 正常：12台
│  ├─ 损坏：2台（需要填写损坏说明）
│  └─ 缺少配件：1台（需要填写缺失情况）
└─ 备注：选填

步骤4：提交申请
├─ 生成归还单号
├─ 创建归还单记录
├─ 创建归还明细记录
│  ├─ 正常设备：标记为待入库
│  ├─ 损坏设备：自动创建维修单
│  └─ 缺少配件：记录缺失情况
└─ 发送审批通知

步骤5：仓库确认
├─ 仓库管理员确认收货
├─ 检查设备状态
│  ├─ 核对设备数量
│  ├─ 检查设备完好性
│  └─ 确认配件情况
│
└─ 更新设备状态
   ├─ 正常设备：更新为"在库"+"闲置"
   ├─ 损坏设备：更新为"维修中"
   └─ 记录操作日志
```

### 4.3 批量入库流程

```
步骤1：选择型号
├─ 选择已有型号
│  ├─ 搜索型号：频谱分析仪
│  ├─ 选择型号：XYZ-100
│  └─ 显示型号信息
│
└─ 新建型号（如果不存在）
   ├─ 填写型号信息
   ├─ 选择设备类型：仪器/假负载
   └─ 保存型号

步骤2：填写入库信息
├─ 入库类型：采购入库/维修归还/其他
├─ 入库数量：10台
├─ 入库仓库：北京仓库
├─ 采购日期：2024-03-15
├─ 采购价格：50000元/台（或总价）
└─ 供应商信息

步骤3：填写设备信息（根据设备类型）

仪器类：
├─ 序列号输入
│  ├─ 方式A：逐台输入（推荐）
│  │  └─ 设备1：SN001, 设备2：SN002, ...
│  │
│  └─ 方式B：批量导入
│     └─ 上传Excel文件
│
├─ 校准信息
│  ├─ 统一设置：所有设备校准到期日相同
│  └─ 逐台设置：每台设备单独设置
│
└─ 配件情况：统一描述

假负载类：
├─ 数量：30根
├─ 序列号：不需要
└─ 配件情况：统一描述

步骤4：提交申请
├─ 生成入库单号
├─ 创建入库单记录
├─ 创建设备记录（临时状态，无管理编号）
│  ├─ 仪器类：创建10条记录
│  └─ 假负载类：创建30条记录
│
└─ 发送审批通知

步骤5：审批确认
├─ 采购部门审批
├─ 仓库管理员确认入库
│
└─ 审核通过后自动处理
   ├─ 生成管理编号
   │  ├─ YQ-000011 ~ YQ-000020（仪器类）
   │  └─ FZ-000031 ~ FZ-000060（假负载类）
   │
   ├─ 更新设备状态
   │  ├─ 位置状态：在库
   │  ├─ 使用状态：闲置
   │  ├─ 主机状态：正常
   │  └─ 负责人：仓库管理员
   │
   └─ 记录操作日志
```

---

## 五、自动化联动机制

### 5.1 管理编号批量生成

#### 生成规则

```
格式：{类型前缀}-{6位序号}

仪器类：YQ-000001, YQ-000002, ...
假负载类：FZ-000001, FZ-000002, ...
```

#### 生成时机

- **入库审核通过后**自动生成
- 入库单创建时设备无编号
- 审核通过后批量触发编号生成

#### 实现要点

```typescript
async function generateManageCodes(
  equipmentType: string, 
  count: number
): Promise<string[]> {
  const prefix = equipmentType === 'instrument' ? 'YQ' : 'FZ';
  const lock = await acquireLock('manage_code_generation');
  
  try {
    const maxCode = await db.queryOne(`
      SELECT MAX(CAST(SUBSTRING(manage_code, 4) AS UNSIGNED)) as max_seq
      FROM equipment_instances
      WHERE manage_code LIKE '${prefix}-%'
    `);
    
    const startSeq = (maxCode?.max_seq || 0) + 1;
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      codes.push(`${prefix}-${(startSeq + i).toString().padStart(6, '0')}`);
    }
    
    return codes;
  } finally {
    await releaseLock(lock);
  }
}
```

#### 配置化

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| code_prefix_instrument | YQ | 仪器类编号前缀 |
| code_prefix_fake_load | FZ | 假负载编号前缀 |
| code_sequence_length | 6 | 序号位数 |

### 5.2 负责人自动匹配

#### 匹配规则

| 位置状态 | 负责人来源 | 说明 |
|----------|------------|------|
| 在库（warehouse） | 仓库管理员 | warehouse.manager_id |
| 在项目（project） | 项目经理 | project.manager_id |
| 维修中（maintenance） | 保持不变 | 不更新负责人 |
| 调拨中（transfer） | 保持不变 | 不更新负责人 |

#### 级联更新

当仓库管理员或项目经理变更时，批量更新关联设备的负责人：

```typescript
async function cascadeUpdatePrincipal(
  entityType: 'warehouse' | 'project',
  entityId: string,
  newManagerId: string
): Promise<void> {
  await db.execute(`
    UPDATE equipment_instances
    SET principal_id = ?, updated_at = NOW()
    WHERE location_id = ? 
      AND position_status = ?
  `, [newManagerId, entityId, entityType]);
}
```

### 5.3 当前位置自动计算

#### 计算规则

```typescript
async function calculateCurrentPosition(
  positionStatus: string,
  locationId: string | null
): Promise<string> {
  switch (positionStatus) {
    case 'warehouse':
      const warehouse = await WarehouseService.getById(locationId);
      return warehouse.name;
    
    case 'project':
      const project = await ProjectService.getById(locationId);
      return project.name;
    
    case 'maintenance':
      return '维修中';
    
    case 'transfer':
      return '调拨中';
    
    default:
      return '未知';
  }
}
```

#### 触发时机

1. 位置状态变更时
2. 仓库/项目名称变更时（级联更新）

### 5.4 状态联动更新矩阵

| 业务流程 | 触发点 | position_status | use_status | host_status | 其他更新 |
|----------|--------|-----------------|------------|-------------|----------|
| **批量入库** | 审核通过 | warehouse | idle | normal | 批量生成编号、匹配负责人 |
| **批量调拨发起** | 提交申请 | transfer | 不变 | 不变 | 批量锁定设备 |
| **批量调拨确认** | 确认收货 | project | in_use | 不变 | 批量匹配项目负责人 |
| **批量归还** | 确认归还 | warehouse | idle | 不变 | 批量清除项目、匹配仓库负责人 |
| **批量维修发起** | 提交申请 | maintenance | idle | maintenance | 批量锁定设备 |
| **批量维修完成** | 验收通过 | 恢复原状态 | 恢复原状态 | 根据结果 | 批量解除锁定 |
| **批量报废** | 审核通过 | warehouse | idle | scrapped | 批量锁定所有操作 |
| **校准完成** | 审批通过 | 不变 | 不变 | normal | 更新校准信息 |

### 5.5 批量状态更新服务

```typescript
class EquipmentBatchService {
  async batchUpdateStatus(
    equipmentIds: string[],
    updates: Partial<EquipmentInstance>
  ): Promise<void> {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      for (const id of equipmentIds) {
        await connection.execute(`
          UPDATE equipment_instances
          SET ${Object.keys(updates).map(k => `${k} = ?`).join(', ')}, updated_at = NOW()
          WHERE id = ?
        `, [...Object.values(updates), id]);
      }
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  
  async batchTransfer(
    transferOrderId: string
  ): Promise<void> {
    const order = await TransferOrderService.getById(transferOrderId);
    const items = await TransferOrderService.getItems(transferOrderId);
    
    await this.batchUpdateStatus(
      items.map(i => i.equipment_id),
      {
        position_status: 'transfer',
        location_id: null
      }
    );
  }
  
  async batchConfirmTransfer(
    transferOrderId: string
  ): Promise<void> {
    const order = await TransferOrderService.getById(transferOrderId);
    const items = await TransferOrderService.getItems(transferOrderId);
    
    const project = await ProjectService.getById(order.to_location_id);
    
    await this.batchUpdateStatus(
      items.map(i => i.equipment_id),
      {
        position_status: 'project',
        use_status: 'in_use',
        location_id: project.id,
        principal_id: project.manager_id,
        current_position: project.name
      }
    );
  }
  
  async batchReturn(
    returnOrderId: string
  ): Promise<void> {
    const order = await ReturnOrderService.getById(returnOrderId);
    const items = await ReturnOrderService.getItems(returnOrderId);
    
    const warehouse = await WarehouseService.getById(order.warehouse_id);
    
    const normalItems = items.filter(i => i.status === 'normal');
    const damagedItems = items.filter(i => i.status === 'damaged');
    
    if (normalItems.length > 0) {
      await this.batchUpdateStatus(
        normalItems.map(i => i.equipment_id),
        {
          position_status: 'warehouse',
          use_status: 'idle',
          location_id: warehouse.id,
          principal_id: warehouse.manager_id,
          current_position: warehouse.name
        }
      );
    }
    
    if (damagedItems.length > 0) {
      await this.batchUpdateStatus(
        damagedItems.map(i => i.equipment_id),
        {
          position_status: 'maintenance',
          use_status: 'idle',
          host_status: 'maintenance'
        }
      );
      
      await RepairOrderService.batchCreateFromReturn(returnOrderId, damagedItems);
    }
  }
}
```

---

## 六、校准管理设计
    
    return code;
  } finally {
    await releaseLock(lock);
  }
}
```

#### 配置化

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| code_prefix_instrument | YQ | 仪器类编号前缀 |
| code_prefix_fake_load | FZ | 假负载编号前缀 |
| code_sequence_length | 6 | 序号位数 |

### 4.2 负责人自动匹配

#### 匹配规则

| 位置状态 | 负责人来源 | 说明 |
|----------|------------|------|
| 在库（warehouse） | 仓库管理员 | warehouse.manager_id |
| 在项目（project） | 项目经理 | project.manager_id |
| 维修中（maintenance） | 保持不变 | 不更新负责人 |
| 调拨中（transfer） | 保持不变 | 不更新负责人 |

#### 级联更新

当仓库管理员或项目经理变更时，批量更新关联设备的负责人：

```typescript
async function cascadeUpdatePrincipal(
  entityType: 'warehouse' | 'project',
  entityId: string,
  newManagerId: string
): Promise<void> {
  await db.execute(`
    UPDATE equipment_instances
    SET principal_id = ?
    WHERE location_id = ? 
      AND position_status = ?
  `, [newManagerId, entityId, entityType]);
}
```

### 4.3 当前位置自动计算

#### 计算规则

```typescript
async function calculateCurrentPosition(
  positionStatus: string,
  locationId: string | null
): Promise<string> {
  switch (positionStatus) {
    case 'warehouse':
      const warehouse = await WarehouseService.getById(locationId);
      return warehouse.name;
    
    case 'project':
      const project = await ProjectService.getById(locationId);
      return project.name;
    
    case 'maintenance':
      return '维修中';
    
    case 'transfer':
      return '调拨中';
    
    default:
      return '未知';
  }
}
```

#### 触发时机

1. 位置状态变更时
2. 仓库/项目名称变更时（级联更新）

### 4.4 状态联动更新矩阵

| 业务流程 | 触发点 | position_status | use_status | host_status | 其他更新 |
|----------|--------|-----------------|------------|-------------|----------|
| **入库** | 审核通过 | warehouse | idle | normal | 生成编号、匹配负责人 |
| **调拨发起** | 提交申请 | transfer | 不变 | 不变 | 锁定设备 |
| **调拨确认** | 确认收货 | project | in_use | 不变 | 匹配项目负责人 |
| **归还** | 确认归还 | warehouse | idle | 不变 | 清除项目、匹配仓库负责人 |
| **维修发起** | 提交申请 | maintenance | idle | maintenance | 锁定设备、记录损坏说明 |
| **维修完成** | 验收通过 | 恢复原状态 | 恢复原状态 | 根据结果 | 解除锁定 |
| **报废** | 审核通过 | warehouse | idle | scrapped | 锁定所有操作 |
| **校准完成** | 审核通过 | 不变 | 不变 | normal | 更新校准信息 |

---

## 五、校准管理设计

### 5.1 校准提醒机制

#### 定时任务

```typescript
// 每日凌晨2点执行
@Cron('0 2 * * *')
async function calibrationReminderTask() {
  // 1. 查询即将到期的仪器（提前30天）
  const expiringSoon = await db.query(`
    SELECT * FROM equipment_instances ei
    JOIN equipment_models em ON ei.model_id = em.id
    WHERE em.category = 'instrument'
      AND ei.calibration_expiry BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 DAY)
      AND ei.host_status != 'scrapped'
  `);
  
  // 2. 查询已过期的仪器
  const expired = await db.query(`
    SELECT * FROM equipment_instances ei
    JOIN equipment_models em ON ei.model_id = em.id
    WHERE em.category = 'instrument'
      AND ei.calibration_expiry < NOW()
      AND ei.host_status != 'scrapped'
  `);
  
  // 3. 发送提醒
  for (const equipment of expiringSoon) {
    await NotificationService.send({
      type: 'calibration_expiring',
      to: equipment.principal_id,
      content: `设备${equipment.name}校准证书将于${equipment.calibration_expiry}到期`
    });
  }
  
  // 4. 过期设备自动更新状态
  for (const equipment of expired) {
    await EquipmentService.updateHostStatus(equipment.id, 'affected');
    await NotificationService.send({
      type: 'calibration_expired',
      to: equipment.principal_id,
      content: `设备${equipment.name}校准证书已过期，已自动标记为"影响使用"`
    });
  }
}
```

#### 配置化

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| calibration_remind_days | 30 | 提前提醒天数 |
| calibration_auto_affected | true | 过期是否自动标记为影响使用 |

### 5.2 校准流程联动

```
校准单创建 → 提交审批 → 审批通过 → 自动更新：
  - calibration_expiry = 新到期日
  - calibration_certificate = 新证书编号
  - host_status = normal（如果之前是"影响使用"）
  - 清除校准提醒
```

---

## 六、前端交互设计

### 6.1 列表页优化

#### 状态标色

```typescript
const statusColors = {
  host_status: {
    normal: 'bg-green-100 text-green-700',
    slightly_damaged: 'bg-yellow-100 text-yellow-700',
    affected: 'bg-orange-100 text-orange-700',
    maintenance: 'bg-blue-100 text-blue-700',
    scrapped: 'bg-gray-100 text-gray-500'
  },
  position_status: {
    warehouse: 'bg-green-100 text-green-700',
    project: 'bg-blue-100 text-blue-700',
    maintenance: 'bg-yellow-100 text-yellow-700',
    transfer: 'bg-orange-100 text-orange-700'
  }
};
```

#### 操作按钮动态显示

```typescript
function getAvailableActions(equipment: Equipment): string[] {
  const { host_status, position_status, use_status } = equipment;
  
  // 报废设备无操作
  if (host_status === 'scrapped') return [];
  
  // 维修中/调拨中无操作
  if (['maintenance', 'transfer'].includes(position_status)) return [];
  
  // 在库闲置
  if (position_status === 'warehouse' && use_status === 'idle') {
    if (host_status === 'normal') return ['transfer', 'repair', 'calibrate', 'scrap'];
    return ['repair', 'scrap'];
  }
  
  // 在项目使用中
  if (position_status === 'project') return ['return', 'transfer'];
  
  return [];
}
```

#### 校准提醒标签

```typescript
function getCalibrationBadge(equipment: Equipment): ReactNode {
  if (equipment.category !== 'instrument') return null;
  
  const daysUntilExpiry = differenceInDays(
    new Date(equipment.calibration_expiry),
    new Date()
  );
  
  if (daysUntilExpiry < 0) {
    return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">已过期</span>;
  }
  
  if (daysUntilExpiry <= 30) {
    return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">即将到期</span>;
  }
  
  return null;
}
```

### 6.2 详情页优化

#### 全生命周期溯源

```
设备详情页底部：

┌─────────────────────────────────────────────────────────┐
│ 操作记录                                                 │
├─────────────────────────────────────────────────────────┤
│ 2024-01-15  入库登记  从供应商XX购入  操作人：张三        │
│ 2024-02-20  调拨出库  调拨至项目A   操作人：李四          │
│ 2024-03-15  校准完成  校准证书YQ-2024-001  操作人：王五   │
│ 2024-06-10  归还入库  项目结束归还    操作人：赵六        │
│ 2024-08-20  维修登记  主机故障维修    操作人：钱七        │
│ 2024-08-25  维修完成  更换主板        操作人：钱七        │
└─────────────────────────────────────────────────────────┘
```

#### 字段只读规则

| 字段 | 可编辑 | 说明 |
|------|--------|------|
| manage_code | ❌ | 自动生成 |
| current_position | ❌ | 自动计算 |
| principal_id | ❌ | 自动匹配 |
| position_status | ❌ | 流程驱动 |
| use_status | ❌ | 流程驱动 |
| host_status | ❌ | 流程驱动 |
| equipment_name | ✅ | 人工录入 |
| serial_number | ✅ | 人工录入 |
| accessory_desc | ✅ | 人工录入 |
| damage_desc | ✅ | 主机状态异常时必填 |
| notes | ✅ | 人工录入 |

### 6.3 批量操作界面设计

#### 批量调拨界面

```
┌─────────────────────────────────────────────────────────┐
│ 设备调拨申请                                             │
└─────────────────────────────────────────────────────────┘

步骤1：选择设备

┌─────────────────────────────────────────────────────────┐
│ 筛选条件                                                 │
│ [型号: 频谱分析仪 ▼] [仓库: 北京仓库 ▼] [状态: 闲置 ▼]  │
│ [搜索设备编号或名称...              ] [搜索]            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 可用设备列表（共10台）                    [全选] [清空] │
├─────────────────────────────────────────────────────────┤
│ ☑ YQ-000001 频谱分析仪 XYZ-100  北京仓库  闲置  正常    │
│ ☑ YQ-000002 频谱分析仪 XYZ-100  北京仓库  闲置  正常    │
│ ☑ YQ-000003 频谱分析仪 XYZ-100  北京仓库  闲置  正常    │
│ ☑ YQ-000004 频谱分析仪 XYZ-100  北京仓库  闲置  正常    │
│ ☑ YQ-000005 频谱分析仪 XYZ-100  北京仓库  闲置  正常    │
│ ☐ YQ-000006 频谱分析仪 XYZ-100  北京仓库  使用中 正常   │
│ ☐ YQ-000007 频谱分析仪 XYZ-100  上海仓库  闲置  正常    │
└─────────────────────────────────────────────────────────┘

已选择：5台设备

步骤2：填写调拨信息

┌─────────────────────────────────────────────────────────┐
│ 调出位置：北京仓库（自动填充）                           │
│ 调入位置：[项目 ▼] [项目A - 张三 ▼]                     │
│ 调拨原因：[项目启动需要设备测试...              ]        │
│ 预计归还日期：[2024-06-30]                              │
│ 备注：[项目编号PRJ-2024-001...                  ]       │
└─────────────────────────────────────────────────────────┘

步骤3：确认提交

┌─────────────────────────────────────────────────────────┐
│ 调拨明细确认                                             │
├─────────────────────────────────────────────────────────┤
│ 调拨单号：DB-20240315-001（系统自动生成）               │
│ 调出位置：北京仓库                                       │
│ 调入位置：项目A                                          │
│ 设备数量：5台                                            │
│ 设备清单：                                               │
│   - YQ-000001 频谱分析仪 XYZ-100                        │
│   - YQ-000002 频谱分析仪 XYZ-100                        │
│   - YQ-000003 频谱分析仪 XYZ-100                        │
│   - YQ-000004 频谱分析仪 XYZ-100                        │
│   - YQ-000005 频谱分析仪 XYZ-100                        │
└─────────────────────────────────────────────────────────┘

[上一步] [提交申请]
```

#### 批量归还界面

```
┌─────────────────────────────────────────────────────────┐
│ 设备归还申请                                             │
└─────────────────────────────────────────────────────────┘

步骤1：选择项目

┌─────────────────────────────────────────────────────────┐
│ 项目：[项目A - 张三 ▼]                                  │
│ 项目状态：进行中                                         │
│ 项目经理：张三                                           │
└─────────────────────────────────────────────────────────┘

步骤2：选择设备

┌─────────────────────────────────────────────────────────┐
│ 项目设备列表（共15台）                    [全选] [清空] │
├─────────────────────────────────────────────────────────┤
│ ☑ YQ-000001 频谱分析仪  使用中  正常   2024-06-30到期   │
│ ☑ YQ-000002 频谱分析仪  使用中  正常   2024-06-30到期   │
│ ...                                                      │
│ ☑ YQ-000013 频谱分析仪  使用中  损坏   ⚠️需要维修       │
│ ...                                                      │
└─────────────────────────────────────────────────────────┘

已选择：12台设备（含1台损坏设备）

步骤3：填写归还信息

┌─────────────────────────────────────────────────────────┐
│ 归还仓库：[北京仓库 ▼]                                  │
│ 归还原因：[项目结束...                          ]       │
│                                                         │
│ 设备检查情况：                                           │
│ ├─ 正常设备：11台                                        │
│ ├─ 损坏设备：1台                                         │
│ │   └─ YQ-000013：[显示屏损坏，无法正常显示...  ]       │
│ └─ 缺少配件：0台                                         │
│                                                         │
│ 备注：[...                                      ]       │
└─────────────────────────────────────────────────────────┘

[上一步] [提交申请]
```

#### 批量入库界面

```
┌─────────────────────────────────────────────────────────┐
│ 设备入库申请                                             │
└─────────────────────────────────────────────────────────┘

步骤1：选择型号

┌─────────────────────────────────────────────────────────┐
│ 设备型号：[频谱分析仪 XYZ-100 ▼]  [+ 新建型号]         │
│ 设备类型：仪器                                           │
│ 校准周期：12个月                                         │
└─────────────────────────────────────────────────────────┘

步骤2：填写入库信息

┌─────────────────────────────────────────────────────────┐
│ 入库类型：[采购入库 ▼]                                  │
│ 入库数量：10台                                           │
│ 入库仓库：[北京仓库 ▼]                                  │
│ 采购日期：[2024-03-15]                                  │
│ 采购价格：50000元/台                                     │
│ 供应商：[XX科技有限公司...                     ]        │
└─────────────────────────────────────────────────────────┘

步骤3：填写设备信息

┌─────────────────────────────────────────────────────────┐
│ 序列号输入方式：                                         │
│ ○ 逐台输入  ● 批量导入                                  │
│                                                         │
│ [选择Excel文件...                              ]       │
│ 支持格式：.xlsx, .xls                                    │
│ 模板下载：[下载模板]                                     │
│                                                         │
│ 预览（已导入10条）：                                     │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 序号   序列号    校准到期日    配件情况              │ │
│ │ 1      SN001     2025-03-15   完整                  │ │
│ │ 2      SN002     2025-03-15   完整                  │ │
│ │ ...                                                 │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

[上一步] [提交申请]
```

---

## 七、系统架构设计

### 7.1 服务层架构

```
EquipmentModule
├── EquipmentService（设备核心服务）
│   ├── 创建设备（入库流程调用）
│   ├── 更新设备（仅人工字段）
│   ├── 删除设备（软删除）
│   ├── 查询设备（列表、详情、统计）
│   └── 批量操作（批量更新状态）
│
├── EquipmentStatusService（状态管理服务）
│   ├── 更新位置状态
│   ├── 更新使用状态
│   ├── 更新主机状态
│   ├── 状态约束校验
│   └── 状态联动更新
│
├── EquipmentCodeService（编号生成服务）
│   ├── 生成管理编号
│   ├── 批量生成管理编号
│   ├── 编号唯一性校验
│   └── 编号规则配置
│
├── EquipmentPrincipalService（负责人服务）
│   ├── 自动匹配负责人
│   ├── 批量匹配负责人
│   ├── 级联更新负责人
│   └── 负责人变更通知
│
├── EquipmentPositionService（位置服务）
│   ├── 计算当前位置
│   ├── 批量计算位置
│   └── 级联更新位置名称
│
├── EquipmentCalibrationService（校准服务）
│   ├── 校准提醒任务
│   ├── 校准状态联动
│   └── 校准信息更新
│
└── EquipmentOrderService（单据服务）
    ├── TransferOrderService（调拨单服务）
    │   ├── 创建调拨单
    │   ├── 审批调拨单
    │   ├── 确认收货
    │   └── 查询调拨单
    │
    ├── ReturnOrderService（归还单服务）
    │   ├── 创建归还单
    │   ├── 审批归还单
    │   ├── 确认收货
    │   └── 查询归还单
    │
    └── InboundOrderService（入库单服务）
        ├── 创建入库单
        ├── 审批入库单
        ├── 确认入库
        └── 查询入库单
```

### 7.2 事件驱动架构

```typescript
// 事件定义
enum EquipmentEvent {
  INBOUND_APPROVED = 'equipment.inbound.approved',
  TRANSFER_INITIATED = 'equipment.transfer.initiated',
  TRANSFER_CONFIRMED = 'equipment.transfer.confirmed',
  RETURN_CONFIRMED = 'equipment.return.confirmed',
  REPAIR_INITIATED = 'equipment.repair.initiated',
  REPAIR_COMPLETED = 'equipment.repair.completed',
  CALIBRATION_COMPLETED = 'equipment.calibration.completed',
  SCRAPPED = 'equipment.scrapped'
}

// 事件监听器
@OnEvent(EquipmentEvent.INBOUND_APPROVED)
async handleInboundApproved(event: InboundApprovedEvent) {
  // 1. 生成管理编号
  const code = await EquipmentCodeService.generate(event.equipmentType);
  
  // 2. 匹配负责人
  const principalId = await EquipmentPrincipalService.match(
    'warehouse',
    event.warehouseId
  );
  
  // 3. 计算当前位置
  const position = await EquipmentPositionService.calculate(
    'warehouse',
    event.warehouseId
  );
  
  // 4. 更新设备
  await EquipmentService.update(event.equipmentId, {
    manage_code: code,
    principal_id: principalId,
    current_position: position,
    position_status: 'warehouse',
    use_status: 'idle',
    host_status: 'normal'
  });
}
```

### 7.3 API接口设计

#### 设备管理接口

```
GET    /api/equipment/instances              # 设备列表（支持筛选）
GET    /api/equipment/instances/:id          # 设备详情
POST   /api/equipment/instances              # 创建设备（入库流程）
PUT    /api/equipment/instances/:id          # 更新设备（仅人工字段）
DELETE /api/equipment/instances/:id          # 删除设备（软删除）
GET    /api/equipment/instances/available    # 可用设备列表（调拨用）
POST   /api/equipment/instances/batch-status # 批量更新状态
```

#### 单据管理接口

```
# 调拨单
GET    /api/equipment/transfers              # 调拨单列表
GET    /api/equipment/transfers/:id          # 调拨单详情
POST   /api/equipment/transfers              # 创建调拨单
PUT    /api/equipment/transfers/:id/approve  # 审批调拨单
PUT    /api/equipment/transfers/:id/confirm  # 确认收货
PUT    /api/equipment/transfers/:id/cancel   # 取消调拨

# 归还单
GET    /api/equipment/returns                # 归还单列表
GET    /api/equipment/returns/:id            # 归还单详情
POST   /api/equipment/returns                # 创建归还单
PUT    /api/equipment/returns/:id/approve    # 审批归还单
PUT    /api/equipment/returns/:id/confirm    # 确认收货

# 入库单
GET    /api/equipment/inbounds               # 入库单列表
GET    /api/equipment/inbounds/:id           # 入库单详情
POST   /api/equipment/inbounds               # 创建入库单
PUT    /api/equipment/inbounds/:id/approve   # 审批入库单
```

#### 状态管理接口

```
GET    /api/equipment/status/check           # 状态约束校验
POST   /api/equipment/status/validate-batch  # 批量状态校验
```

---

## 八、数据库迁移方案

### 8.1 新增字段迁移

```sql
-- 001_add_equipment_fields.sql

-- 新增负责人字段
ALTER TABLE equipment_instances 
ADD COLUMN principal_id VARCHAR(36) COMMENT '负责人ID' AFTER location_name;

-- 新增当前位置字段
ALTER TABLE equipment_instances 
ADD COLUMN current_position VARCHAR(100) COMMENT '当前位置（自动计算）' AFTER principal_id;

-- 新增损坏说明字段
ALTER TABLE equipment_instances 
ADD COLUMN damage_desc TEXT COMMENT '损坏说明' AFTER current_position;

-- 新增配件情况字段
ALTER TABLE equipment_instances 
ADD COLUMN accessory_desc TEXT COMMENT '配件情况' AFTER damage_desc;

-- 新增设备类型字段
ALTER TABLE equipment_instances 
ADD COLUMN equipment_type ENUM('instrument', 'fake_load') COMMENT '设备类型' AFTER model_id;

-- 建立索引
ALTER TABLE equipment_instances ADD INDEX idx_principal_id (principal_id);
ALTER TABLE equipment_instances ADD UNIQUE INDEX idx_manage_code (manage_code);
```

### 8.2 单据表迁移

```sql
-- 002_create_order_tables.sql

-- 调拨单表
CREATE TABLE equipment_transfer_orders (
  id VARCHAR(36) PRIMARY KEY,
  order_no VARCHAR(50) NOT NULL COMMENT '调拨单号',
  transfer_type ENUM('single', 'batch') DEFAULT 'batch',
  
  from_location_type ENUM('warehouse', 'project'),
  from_location_id VARCHAR(36),
  from_location_name VARCHAR(100),
  
  to_location_type ENUM('warehouse', 'project'),
  to_location_id VARCHAR(36),
  to_location_name VARCHAR(100),
  
  total_quantity INT DEFAULT 0,
  transfer_reason TEXT,
  expected_return_date DATE,
  applicant_id VARCHAR(36),
  applicant_name VARCHAR(50),
  apply_date DATE,
  
  status ENUM('draft', 'pending', 'approved', 'rejected', 'completed', 'cancelled') DEFAULT 'draft',
  approver_id VARCHAR(36),
  approver_name VARCHAR(50),
  approve_time DATETIME,
  approve_remark TEXT,
  
  receiver_id VARCHAR(36),
  receiver_name VARCHAR(50),
  receive_time DATETIME,
  receive_remark TEXT,
  
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE INDEX idx_order_no (order_no),
  INDEX idx_applicant_id (applicant_id),
  INDEX idx_status (status),
  INDEX idx_from_location (from_location_id),
  INDEX idx_to_location (to_location_id)
);

-- 调拨单明细表
CREATE TABLE equipment_transfer_items (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  equipment_id VARCHAR(36) NOT NULL,
  equipment_name VARCHAR(100),
  manage_code VARCHAR(50),
  serial_number VARCHAR(100),
  model_name VARCHAR(100),
  accessory_status TEXT,
  damage_status TEXT,
  status ENUM('pending', 'transferred', 'returned') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_order_id (order_id),
  INDEX idx_equipment_id (equipment_id),
  FOREIGN KEY (order_id) REFERENCES equipment_transfer_orders(id) ON DELETE CASCADE
);

-- 归还单表
CREATE TABLE equipment_return_orders (
  id VARCHAR(36) PRIMARY KEY,
  order_no VARCHAR(50) NOT NULL,
  project_id VARCHAR(36),
  project_name VARCHAR(100),
  warehouse_id VARCHAR(36),
  warehouse_name VARCHAR(100),
  total_quantity INT DEFAULT 0,
  normal_quantity INT DEFAULT 0,
  damaged_quantity INT DEFAULT 0,
  return_reason TEXT,
  applicant_id VARCHAR(36),
  applicant_name VARCHAR(50),
  apply_date DATE,
  status ENUM('draft', 'pending', 'approved', 'rejected', 'completed', 'cancelled') DEFAULT 'draft',
  approver_id VARCHAR(36),
  approve_time DATETIME,
  confirmer_id VARCHAR(36),
  confirm_time DATETIME,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE INDEX idx_order_no (order_no),
  INDEX idx_project_id (project_id),
  INDEX idx_warehouse_id (warehouse_id),
  INDEX idx_status (status)
);

-- 入库单表
CREATE TABLE equipment_inbound_orders (
  id VARCHAR(36) PRIMARY KEY,
  order_no VARCHAR(50) NOT NULL,
  inbound_type ENUM('purchase', 'repair_return', 'other') DEFAULT 'purchase',
  warehouse_id VARCHAR(36),
  warehouse_name VARCHAR(100),
  model_id VARCHAR(36),
  model_name VARCHAR(100),
  equipment_type ENUM('instrument', 'fake_load'),
  total_quantity INT DEFAULT 0,
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  supplier VARCHAR(200),
  applicant_id VARCHAR(36),
  applicant_name VARCHAR(50),
  apply_date DATE,
  status ENUM('draft', 'pending', 'approved', 'rejected', 'completed', 'cancelled') DEFAULT 'draft',
  approver_id VARCHAR(36),
  approve_time DATETIME,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE INDEX idx_order_no (order_no),
  INDEX idx_warehouse_id (warehouse_id),
  INDEX idx_model_id (model_id),
  INDEX idx_status (status)
);
```

### 8.3 数据迁移脚本

```sql
-- 003_migrate_equipment_data.sql

-- 1. 从型号表同步设备类型
UPDATE equipment_instances ei
JOIN equipment_models em ON ei.model_id = em.id
SET ei.equipment_type = em.category;

-- 2. 初始化当前位置
UPDATE equipment_instances ei
LEFT JOIN warehouses w ON ei.location_id = w.id AND ei.location_status = 'warehouse'
LEFT JOIN projects p ON ei.location_id = p.id AND ei.location_status = 'project'
SET ei.current_position = COALESCE(w.name, p.name, 
  CASE ei.location_status
    WHEN 'maintenance' THEN '维修中'
    WHEN 'transfer' THEN '调拨中'
    ELSE '未知'
  END
);

-- 3. 初始化负责人
UPDATE equipment_instances ei
LEFT JOIN warehouses w ON ei.location_id = w.id AND ei.location_status = 'warehouse'
LEFT JOIN projects p ON ei.location_id = p.id AND ei.location_status = 'project'
SET ei.principal_id = COALESCE(w.manager_id, p.manager_id)
WHERE ei.location_status IN ('warehouse', 'project');
```

---

## 九、实施路径
    WHEN 'transfer' THEN '调拨中'
    ELSE '未知'
  END
);

-- 3. 初始化负责人
UPDATE equipment_instances ei
LEFT JOIN warehouses w ON ei.location_id = w.id AND ei.location_status = 'warehouse'
LEFT JOIN projects p ON ei.location_id = p.id AND ei.location_status = 'project'
SET ei.principal_id = COALESCE(w.manager_id, p.manager_id)
WHERE ei.location_status IN ('warehouse', 'project');
```

---

## 九、实施路径

| 阶段 | 内容 | 时间 |
|------|------|------|
| 阶段一 | 数据库优化（新增字段、单据表） | 2-3天 |
| 阶段二 | 单据服务开发 | 3-5天 |
| 阶段三 | 自动化服务开发 | 3-5天 |
| 阶段四 | 前端优化（批量操作界面） | 3-5天 |
| 阶段五 | 校准管理开发 | 2天 |
| 阶段六 | 测试与优化 | 2-3天 |

### 阶段一：数据库优化（2-3天）

- [ ] 新增设备实例表字段：principal_id, current_position, damage_desc, accessory_desc, equipment_type
- [ ] 创建单据管理表：调拨单、调拨明细、归还单、入库单
- [ ] 数据迁移：为现有设备匹配负责人、计算当前位置
- [ ] 建立索引：管理编号唯一索引、负责人索引、单据索引
- [ ] 测试验证：确保数据迁移正确

### 阶段二：单据服务开发（3-5天）

- [ ] 调拨单服务
  - [ ] 创建调拨单
  - [ ] 审批调拨单
  - [ ] 确认收货
  - [ ] 查询调拨单
- [ ] 归还单服务
  - [ ] 创建归还单
  - [ ] 审批归还单
  - [ ] 确认收货
  - [ ] 查询归还单
- [ ] 入库单服务
  - [ ] 创建入库单
  - [ ] 审批入库单
  - [ ] 确认入库
  - [ ] 查询入库单
- [ ] 单据编号生成服务

### 阶段三：自动化服务开发（3-5天）

- [ ] 管理编号批量生成服务
- [ ] 负责人自动匹配服务
  - [ ] 单个设备匹配
  - [ ] 批量设备匹配
  - [ ] 级联更新
- [ ] 当前位置计算服务
  - [ ] 单个设备计算
  - [ ] 批量设备计算
  - [ ] 级联更新
- [ ] 批量状态更新服务
  - [ ] 批量调拨状态更新
  - [ ] 批量归还状态更新
  - [ ] 批量入库状态更新
- [ ] 状态联动服务
- [ ] 状态约束校验服务

### 阶段四：前端优化（3-5天）

- [ ] 批量调拨界面
  - [ ] 设备筛选和选择
  - [ ] 调拨信息填写
  - [ ] 调拨明细确认
  - [ ] 调拨单查询
- [ ] 批量归还界面
  - [ ] 项目选择
  - [ ] 设备选择
  - [ ] 归还信息填写
  - [ ] 归还单查询
- [ ] 批量入库界面
  - [ ] 型号选择
  - [ ] 入库信息填写
  - [ ] 设备信息录入（支持批量导入）
  - [ ] 入库单查询
- [ ] 状态标色显示
- [ ] 操作按钮动态显示
- [ ] 全生命周期溯源展示
- [ ] 校准提醒标签

### 阶段五：校准管理开发（2天）

- [ ] 校准提醒定时任务
- [ ] 校准过期状态联动
- [ ] 校准流程集成
- [ ] 校准提醒通知

### 阶段六：测试与优化（2-3天）

- [ ] 功能测试
- [ ] 性能优化
- [ ] 用户体验优化
- [ ] 文档完善

---

## 十、风险与应对

### 10.1 技术风险

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 并发生成编号重复 | 编号冲突 | 使用分布式锁保证唯一性 |
| 状态联动失败 | 数据不一致 | 使用事务，失败回滚 |
| 定时任务失败 | 校准提醒缺失 | 增加失败重试和告警 |

### 10.2 业务风险

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 现有数据迁移错误 | 历史数据丢失 | 迁移前备份，迁移后验证 |
| 用户操作习惯改变 | 使用困难 | 提供操作指南和培训 |
| 负责人匹配错误 | 责任归属不清 | 提供手动调整入口 |

---

## 十一、总结

本设计方案在保留现有系统架构的基础上，充分吸收了《其他系统方案》的核心思想，并从用户实际操作场景出发，重点优化了批量操作功能：

### 核心优势

1. **一物一码**：通过管理编号自动生成实现
2. **三状态分离**：保持现有设计，增加状态约束
3. **自动联动**：通过事件驱动实现流程联动
4. **批量操作**：单据管理，一次提交批量处理
5. **智能提醒**：通过定时任务实现校准提醒
6. **责任追踪**：通过负责人自动匹配实现

### 用户价值

1. **操作效率提升**：批量操作减少重复劳动
   - 项目启动时批量调拨设备
   - 项目结束时批量归还设备
   - 采购时批量入库设备
   
2. **数据准确性**：自动联动避免人工错误
   - 状态自动更新，无需手动维护
   - 负责人自动匹配，责任清晰
   - 位置自动计算，实时追踪
   
3. **管理精细化**：三状态分离，责任清晰
   - 主机状态：设备健康状态
   - 使用状态：设备使用情况
   - 位置状态：设备位置信息
   
4. **系统智能化**：自动提醒和状态联动
   - 校准到期自动提醒
   - 过期自动标记为影响使用
   - 流程驱动状态更新

### 设计亮点

1. **单据管理**：通过单据管理批量操作，实现操作可追溯
   - 调拨单：记录设备调拨全过程
   - 归还单：记录设备归还详情
   - 入库单：记录设备入库信息
   
2. **批量选择**：支持多种方式批量选择设备
   - 按条件筛选后全选
   - 逐台勾选
   - 扫码快速选择
   
3. **状态校验**：批量操作前自动校验设备状态
   - 过滤不可操作的设备
   - 提示设备状态异常
   - 确保数据一致性
   
4. **智能填充**：自动填充设备信息，减少人工输入
   - 设备名称、型号、管理编号
   - 当前位置、当前负责人
   - 配件情况、主机状态

---

**文档版本历史**

| 版本 | 日期 | 修改内容 | 作者 |
|------|------|----------|------|
| v1.0 | 2026-02-26 | 初始版本 | AI Assistant |
| v2.0 | 2026-02-26 | 增加批量操作设计、单据管理、用户场景分析 | AI Assistant |

---

**文档版本历史**

| 版本 | 日期 | 修改内容 | 作者 |
|------|------|----------|------|
| v1.0 | 2026-02-26 | 初始版本 | AI Assistant |
