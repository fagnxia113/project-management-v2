# 入库单开发计划

> 项目：设备管理模块 - 入库单功能  
> 版本：v1.0  
> 日期：2026-02-26  
> 预计工期：2-3周

---

## 一、开发目标

实现设备入库单的完整功能，支持：
- 采购入库、维修归还、其他入库三种入库类型
- 仪器类和假负载类两种设备类型的区分
- 批量入库，支持逐台输入和批量导入
- 管理编号自动生成
- 设备状态自动初始化
- 完整的审批流程

---

## 二、任务分解

### 阶段一：数据库设计与迁移（2-3天）

#### 任务1.1：设计入库单主表
- [ ] 创建 `equipment_inbound_orders` 表
- [ ] 定义字段：order_no, inbound_type, warehouse_id, model_id, total_quantity, purchase_info, applicant_info, status, etc.
- [ ] 建立索引：order_no, warehouse_id, model_id, status
- [ ] 输出：SQL脚本 `001_create_inbound_orders.sql`

#### 任务1.2：设计入库单明细表
- [ ] 创建 `equipment_inbound_items` 表
- [ ] 定义字段：order_id, equipment_id, serial_number, calibration_info, accessory_desc, status
- [ ] 建立索引：order_id, equipment_id
- [ ] 建立外键约束
- [ ] 输出：SQL脚本 `002_create_inbound_items.sql`

#### 任务1.3：新增设备实例表字段
- [ ] 新增 `principal_id` 字段
- [ ] 新增 `current_position` 字段
- [ ] 新增 `damage_desc` 字段
- [ ] 新增 `accessory_desc` 字段
- [ ] 新增 `equipment_type` 字段
- [ ] 建立索引
- [ ] 输出：SQL脚本 `003_add_equipment_fields.sql`

#### 任务1.4：执行数据库迁移
- [ ] 备份现有数据库
- [ ] 执行迁移脚本
- [ ] 验证表结构
- [ ] 验证索引
- [ ] 验证外键约束

---

### 阶段二：后端服务开发（5-7天）

#### 任务2.1：入库单服务（InboundOrderService）

**基础CRUD操作**
- [ ] 创建入库单 `createInboundOrder(data)`
- [ ] 查询入库单列表 `getInboundOrders(filters)`
- [ ] 查询入库单详情 `getInboundOrderById(id)`
- [ ] 更新入库单 `updateInboundOrder(id, data)`
- [ ] 删除入库单（软删除）`deleteInboundOrder(id)`

**入库单明细管理**
- [ ] 添加明细 `addInboundItems(orderId, items)`
- [ ] 查询明细 `getInboundItems(orderId)`
- [ ] 更新明细 `updateInboundItem(itemId, data)`
- [ ] 删除明细 `deleteInboundItem(itemId)`

**入库单编号生成**
- [ ] 生成入库单号 `generateOrderNo()`
- [ ] 格式：RK-{日期}-{序号}（如 RK-20240315-001）
- [ ] 使用分布式锁保证唯一性

**入库单状态管理**
- [ ] 提交入库单 `submitInboundOrder(id)`
- [ ] 审批入库单 `approveInboundOrder(id, approved, remark)`
- [ ] 取消入库单 `cancelInboundOrder(id, reason)`
- [ ] 完成入库单 `completeInboundOrder(id)`

**输出文件**：
- `src/backend/services/InboundOrderService.ts`

---

#### 任务2.2：管理编号生成服务（EquipmentCodeService）

**批量生成管理编号**
- [ ] 批量生成编号 `generateBatch(equipmentType, count)`
- [ ] 仪器类：YQ-{6位序号}（如 YQ-000011 ~ YQ-000020）
- [ ] 假负载类：FZ-{6位序号}（如 FZ-000031 ~ FZ-000060）
- [ ] 使用分布式锁保证唯一性
- [ ] 返回编号数组

**编号配置管理**
- [ ] 获取编号前缀配置 `getCodePrefix(equipmentType)`
- [ ] 更新编号前缀配置 `updateCodePrefix(equipmentType, prefix)`
- [ ] 获取当前最大序号 `getCurrentMaxSeq(prefix)`

**输出文件**：
- `src/backend/services/EquipmentCodeService.ts`

---

#### 任务2.3：负责人匹配服务（EquipmentPrincipalService）

**单个设备负责人匹配**
- [ ] 根据位置匹配负责人 `matchPrincipal(positionStatus, locationId)`
- [ ] 在库：匹配仓库管理员
- [ ] 在项目：匹配项目经理
- [ ] 维修中/调拨中：保持不变

**批量设备负责人匹配**
- [ ] 批量匹配负责人 `batchMatchPrincipal(equipmentIds, positionStatus, locationId)`

**级联更新**
- [ ] 仓库管理员变更时更新设备负责人 `cascadeUpdatePrincipal('warehouse', warehouseId, newManagerId)`
- [ ] 项目经理变更时更新设备负责人 `cascadeUpdatePrincipal('project', projectId, newManagerId)`

**输出文件**：
- `src/backend/services/EquipmentPrincipalService.ts`

---

#### 任务2.4：位置计算服务（EquipmentPositionService）

**单个设备位置计算**
- [ ] 根据位置状态和位置ID计算位置名称 `calculatePosition(positionStatus, locationId)`
- [ ] 在库：返回仓库名称
- [ ] 在项目：返回项目名称
- [ ] 维修中：返回"维修中"
- [ ] 调拨中：返回"调拨中"

**批量设备位置计算**
- [ ] 批量计算位置 `batchCalculatePosition(equipmentIds)`

**级联更新**
- [ ] 仓库名称变更时更新设备位置 `cascadeUpdatePosition('warehouse', warehouseId, newName)`
- [ ] 项目名称变更时更新设备位置 `cascadeUpdatePosition('project', projectId, newName)`

**输出文件**：
- `src/backend/services/EquipmentPositionService.ts`

---

#### 任务2.5：入库审批处理（InboundApprovalHandler）

**审批通过处理**
- [ ] 批量生成管理编号
- [ ] 批量创建设备记录
- [ ] 批量初始化设备状态
  - [ ] 位置状态：在库
  - [ ] 使用状态：闲置
  - [ ] 主机状态：正常
  - [ ] 位置ID：仓库ID
  - [ ] 位置名称：仓库名称
  - [ ] 负责人ID：仓库管理员ID
  - [ ] 当前位置：仓库名称
- [ ] 更新入库明细（关联设备ID）
- [ ] 更新入库单状态为"已完成"
- [ ] 记录操作日志

**审批拒绝处理**
- [ ] 更新入库单状态为"已拒绝"
- [ ] 记录审批意见
- [ ] 发送拒绝通知

**输出文件**：
- `src/backend/handlers/InboundApprovalHandler.ts`

---

#### 任务2.6：入库单路由（inboundRoutes）

**入库单管理接口**
- [ ] `POST /api/equipment/inbounds` - 创建入库单
- [ ] `GET /api/equipment/inbounds` - 查询入库单列表
- [ ] `GET /api/equipment/inbounds/:id` - 查询入库单详情
- [ ] `PUT /api/equipment/inbounds/:id` - 更新入库单
- [ ] `DELETE /api/equipment/inbounds/:id` - 删除入库单

**入库单审批接口**
- [ ] `PUT /api/equipment/inbounds/:id/submit` - 提交入库单
- [ ] `PUT /api/equipment/inbounds/:id/approve` - 审批入库单
- [ ] `PUT /api/equipment/inbounds/:id/cancel` - 取消入库单

**入库单明细接口**
- [ ] `POST /api/equipment/inbounds/:id/items` - 添加明细
- [ ] `GET /api/equipment/inbounds/:id/items` - 查询明细
- [ ] `PUT /api/equipment/inbounds/:id/items/:itemId` - 更新明细
- [ ] `DELETE /api/equipment/inbounds/:id/items/:itemId` - 删除明细

**输出文件**：
- `src/backend/routes/inboundRoutes.ts`

---

#### 任务2.7：集成到服务器

- [ ] 在 `server.ts` 中注册入库单路由
- [ ] 配置路由前缀：`/api/equipment/inbounds`
- [ ] 添加权限验证中间件
- [ ] 测试路由注册

**输出文件**：
- `src/backend/server.ts`（修改）

---

### 阶段三：前端开发（5-7天）

#### 任务3.1：入库单列表页（InboundListPage）

**页面功能**
- [ ] 显示入库单列表
- [ ] 支持筛选（状态、仓库、入库类型、日期范围）
- [ ] 支持搜索（入库单号、申请人）
- [ ] 支持排序（创建时间、状态）
- [ ] 分页功能
- [ ] 状态标签显示
- [ ] 操作按钮（查看、编辑、删除、提交、审批）

**输出文件**：
- `src/frontend/pages/equipment/InboundListPage.tsx`

---

#### 任务3.2：入库单详情页（InboundDetailPage）

**页面功能**
- [ ] 显示入库单基本信息
- [ ] 显示入库明细列表
- [ ] 显示审批信息
- [ ] 显示操作日志
- [ ] 操作按钮（编辑、删除、提交、审批、取消）

**输出文件**：
- `src/frontend/pages/equipment/InboundDetailPage.tsx`

---

#### 任务3.3：入库单创建页（InboundCreatePage）

**步骤1：选择型号**
- [ ] 设备型号下拉选择
- [ ] 新建型号按钮
- [ ] 显示型号信息（品牌、规格、校准周期、设备类型）

**步骤2：填写入库信息**
- [ ] 入库类型选择（采购入库/维修归还/其他）
- [ ] 入库数量输入
- [ ] 入库仓库选择
- [ ] 采购日期选择
- [ ] 采购价格输入（单价/总价）
- [ ] 供应商输入
- [ ] 备注输入

**步骤3：填写设备信息**
- [ ] 设备类型切换（仪器类/假负载类）
- [ ] 序列号输入方式切换（逐台输入/批量导入）
- [ ] 逐台输入：动态添加输入框
- [ ] 批量导入：上传Excel文件
- [ ] Excel模板下载
- [ ] 预览导入数据
- [ ] 校准到期日设置（统一/逐台）
- [ ] 配件情况输入

**步骤4：确认提交**
- [ ] 显示入库单摘要
- [ ] 显示设备清单
- [ ] 提交按钮
- [ ] 上一步按钮

**输出文件**：
- `src/frontend/pages/equipment/InboundCreatePage.tsx`

---

#### 任务3.4：入库单编辑页（InboundEditPage）

**页面功能**
- [ ] 复用创建页组件
- [ ] 加载入库单数据
- [ ] 填充表单数据
- [ ] 只编辑草稿状态的入库单
- [ ] 保存按钮

**输出文件**：
- `src/frontend/pages/equipment/InboundEditPage.tsx`

---

#### 任务3.5：Excel导入组件（ExcelImportComponent）

**组件功能**
- [ ] 文件选择
- [ ] 文件格式验证（.xlsx, .xls）
- [ ] 文件大小限制
- [ ] Excel解析
- [ ] 数据验证
- [ ] 预览表格
- [ ] 错误提示
- [ ] 模板下载

**输出文件**：
- `src/frontend/components/ExcelImportComponent.tsx`

---

#### 任务3.6：路由配置

- [ ] 在路由配置中添加入库单路由
- [ ] `/equipment/inbounds` - 入库单列表
- [ ] `/equipment/inbounds/create` - 创建入库单
- [ ] `/equipment/inbounds/:id` - 入库单详情
- [ ] `/equipment/inbounds/:id/edit` - 编辑入库单

**输出文件**：
- `src/frontend/App.tsx` 或路由配置文件

---

### 阶段四：测试与优化（2-3天）

#### 任务4.1：单元测试

**后端服务测试**
- [ ] InboundOrderService 单元测试
- [ ] EquipmentCodeService 单元测试
- [ ] EquipmentPrincipalService 单元测试
- [ ] EquipmentPositionService 单元测试
- [ ] InboundApprovalHandler 单元测试

**输出文件**：
- `src/backend/services/__tests__/InboundOrderService.test.ts`
- `src/backend/services/__tests__/EquipmentCodeService.test.ts`
- `src/backend/services/__tests__/EquipmentPrincipalService.test.ts`
- `src/backend/services/__tests__/EquipmentPositionService.test.ts`
- `src/backend/handlers/__tests__/InboundApprovalHandler.test.ts`

---

#### 任务4.2：集成测试

**API接口测试**
- [ ] 创建入库单接口测试
- [ ] 查询入库单接口测试
- [ ] 更新入库单接口测试
- [ ] 删除入库单接口测试
- [ ] 提交入库单接口测试
- [ ] 审批入库单接口测试
- [ ] 明细管理接口测试

**输出文件**：
- `src/backend/routes/__tests__/inboundRoutes.test.ts`

---

#### 任务4.3：前端测试

**组件测试**
- [ ] InboundListPage 组件测试
- [ ] InboundDetailPage 组件测试
- [ ] InboundCreatePage 组件测试
- [ ] InboundEditPage 组件测试
- [ ] ExcelImportComponent 组件测试

**输出文件**：
- `src/frontend/pages/__tests__/InboundListPage.test.tsx`
- `src/frontend/pages/__tests__/InboundDetailPage.test.tsx`
- `src/frontend/pages/__tests__/InboundCreatePage.test.tsx`
- `src/frontend/pages/__tests__/InboundEditPage.test.tsx`
- `src/frontend/components/__tests__/ExcelImportComponent.test.tsx`

---

#### 任务4.4：功能测试

**入库流程测试**
- [ ] 测试采购入库流程
- [ ] 测试维修归还流程
- [ ] 测试其他入库流程
- [ ] 测试仪器类入库（带序列号）
- [ ] 测试假负载类入库（无序列号）
- [ ] 测试逐台输入
- [ ] 测试批量导入
- [ ] 测试统一设置校准到期日
- [ ] 测试逐台设置校准到期日
- [ ] 测试审批流程
- [ ] 测试管理编号生成
- [ ] 测试状态初始化
- [ ] 测试负责人匹配

**边界条件测试**
- [ ] 测试空数据提交
- [ ] 测试超长数据
- [ ] 测试特殊字符
- [ ] 测试重复序列号
- [ ] 测试并发入库
- [ ] 测试网络异常

---

#### 任务4.5：性能优化

- [ ] 批量插入优化
- [ ] 索引优化
- [ ] 查询优化
- [ ] 前端渲染优化
- [ ] Excel导入性能优化

---

#### 任务4.6：用户体验优化

- [ ] 加载状态提示
- [ ] 错误提示优化
- [ ] 成功提示优化
- [ ] 表单验证提示
- [ ] 操作确认提示
- [ ] 响应式布局优化

---

### 阶段五：文档与部署（1天）

#### 任务5.1：API文档

- [ ] 编写入库单API文档
- [ ] 编写请求参数说明
- [ ] 编写响应参数说明
- [ ] 编写错误码说明
- [ ] 编写示例代码

**输出文件**：
- `docs/API_INBOUND.md`

---

#### 任务5.2：用户手册

- [ ] 编写入库单操作手册
- [ ] 编写操作步骤说明
- [ ] 编写常见问题解答
- [ ] 编写截图说明

**输出文件**：
- `docs/USER_MANUAL_INBOUND.md`

---

#### 任务5.3：部署准备

- [ ] 代码审查
- [ ] 代码合并
- [ ] 数据库迁移脚本准备
- [ ] 部署脚本准备
- [ ] 回滚方案准备

---

## 三、时间安排

| 阶段 | 任务 | 预计时间 | 负责人 |
|------|------|----------|--------|
| 阶段一 | 数据库设计与迁移 | 2-3天 | 后端开发 |
| 阶段二 | 后端服务开发 | 5-7天 | 后端开发 |
| 阶段三 | 前端开发 | 5-7天 | 前端开发 |
| 阶段四 | 测试与优化 | 2-3天 | 测试开发 |
| 阶段五 | 文档与部署 | 1天 | 全员 |
| **总计** | | **15-21天** | |

---

## 四、里程碑

| 里程碑 | 完成标准 | 预计时间 |
|--------|----------|----------|
| M1：数据库迁移完成 | 所有表创建完成，数据迁移成功 | 第3天 |
| M2：后端服务完成 | 所有服务开发完成，API接口可用 | 第10天 |
| M3：前端页面完成 | 所有页面开发完成，可正常使用 | 第17天 |
| M4：测试完成 | 所有测试通过，无严重bug | 第20天 |
| M5：上线完成 | 功能上线，文档齐全 | 第21天 |

---

## 五、风险与应对

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|----------|
| 数据库迁移失败 | 阻塞开发 | 低 | 充分测试，准备回滚方案 |
| 管理编号生成冲突 | 编号重复 | 中 | 使用分布式锁，增加重试机制 |
| Excel导入性能差 | 用户体验差 | 中 | 优化解析逻辑，增加进度提示 |
| 审批流程复杂 | 开发延期 | 低 | 简化流程，参考现有审批 |
| 前后端联调问题 | 集成困难 | 中 | 提前定义接口，Mock测试 |

---

## 六、验收标准

### 功能验收

- [ ] 支持三种入库类型（采购入库、维修归还、其他）
- [ ] 支持两种设备类型（仪器类、假负载类）
- [ ] 支持批量入库
- [ ] 支持逐台输入和批量导入
- [ ] 管理编号自动生成且唯一
- [ ] 设备状态自动初始化
- [ ] 负责人自动匹配
- [ ] 审批流程完整
- [ ] 所有API接口正常工作
- [ ] 所有前端页面正常显示

### 性能验收

- [ ] 入库单列表加载时间 < 2秒
- [ ] 创建入库单响应时间 < 3秒
- [ ] 批量导入100条数据 < 10秒
- [ ] 审批通过处理时间 < 5秒

### 质量验收

- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试全部通过
- [ ] 无严重bug
- [ ] 一般bug < 5个
- [ ] 代码审查通过

---

## 七、交付物

### 数据库脚本
- [ ] `001_create_inbound_orders.sql`
- [ ] `002_create_inbound_items.sql`
- [ ] `003_add_equipment_fields.sql`

### 后端代码
- [ ] `InboundOrderService.ts`
- [ ] `EquipmentCodeService.ts`
- [ ] `EquipmentPrincipalService.ts`
- [ ] `EquipmentPositionService.ts`
- [ ] `InboundApprovalHandler.ts`
- [ ] `inboundRoutes.ts`
- [ ] 单元测试文件
- [ ] 集成测试文件

### 前端代码
- [ ] `InboundListPage.tsx`
- [ ] `InboundDetailPage.tsx`
- [ ] `InboundCreatePage.tsx`
- [ ] `InboundEditPage.tsx`
- [ ] `ExcelImportComponent.tsx`
- [ ] 组件测试文件

### 文档
- [ ] `API_INBOUND.md`
- [ ] `USER_MANUAL_INBOUND.md`

---

**文档版本历史**

| 版本 | 日期 | 修改内容 | 作者 |
|------|------|----------|------|
| v1.0 | 2026-02-26 | 初始版本 | AI Assistant |
