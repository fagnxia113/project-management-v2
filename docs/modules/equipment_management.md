# 设备管理模块 (Equipment Management) - 详细设计

## 1. 业务概述
设备管理模块负责公司仪器、设备、配件的全生命周期追踪。采用“双轨制”库存管理，确保高值设备精确到个体，耗材物资精确到数量。

## 2. 核心技术实现

### 2.1 一物一码与批次追踪
- **序列化追踪 (SERIALIZED)**: 针对仪器（如全站仪、负载箱）。每个设备 ID 唯一，强制绑定管理编号和工厂序列号。
- **批次追踪 (BATCH)**: 针对线材、耗材。按型号、存放位置合并统计数量。
- **服务实现**: `EquipmentServiceV3` 统一处理两种模式的增删改查。

### 2.2 设备调拨流程 (Transfer Lifecycle)
调拨是设备流动的主要场景，涉及多方确认：
1. **申请 (Request)**: 填写调拨原因、目标位置。
2. **出库 (Outbound)**: 调出方负责人确认，需上传**包裹整体图**及**明细设备照片**。
3. **在途 (In-transit)**: 系统扣减原仓库库存。
4. **收货 (Inbound)**: 调入方核对数量与外观。
   - **全数收货**: 状态变为 COMPLETED，自动更新设备 `location_id`。
   - **异常收货**: 触发 `EXCEPTION_CONFIRMING` 任务录入，进入异常处理环节。

### 2.3 配件关联
- 支持主设备与配件的强关联。调拨主设备时，关联配件会自动生成调拨明细，防止漏调。

## 3. 数据库模型 (Prisma)
- **`equipment_instances`**: 核心表，存储状态、位置、管理码、追踪类型。
- **`equipment_accessories`**: 配件关联关系表。
- **`workflow_orders`**: 调拨单主表。
- **`workflow_order_items`**: 调拨明细表，记录发货/收货拍照。

## 4. 关键服务接口
- `EquipmentServiceV3.updateBatchInventory`: 处理批次库存的乐观锁加减。
- `TransferServiceV2.dispatchOrder`: 发货逻辑，包含图片存证。
- `TransferServiceV2.receiveOrder`: 收货逻辑，包含异常自动判定。

## 5. 前端核心组件
- **`EquipmentScanner`**: 二维码/条码扫描组件。
- **`TransferWizard`**: 调拨向导，分步引导用户拍照上传。
- **`StockBoard`**: 库存看板，按型号、地区实时汇总。
