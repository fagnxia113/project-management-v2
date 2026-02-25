# 项目管理系统 v2 - 系统设计文档

## 📋 文档说明

**文档版本**: v2.6  
**最后更新**: 2026-02-25  
**维护方式**: 所有系统变更必须先更新此文档，再进行代码修改

**v2.0 更新内容：**
- 全面重构界面导航结构，优化用户体验
- 重新定义功能模块分布，逻辑更清晰
- 明确双角色权限体系（系统管理员/普通员工）
- 统一命名规范，提升可读性
- 优化审批流程与数字化工厂的整合

**v2.4 更新内容：**
- 完善设备管理模块设计，新增仓库管理和库存管理
- 细化设备管理规则，区分仪器类和负载/线缆类的管理方式
- 新增调拨转移、归还入库、维修管理、报废管理、数据溯源等功能模块
- 新增智能提醒功能（校准到期提醒、库存告警）
- 新增分层权限体系（系统管理员、仓库管理员、项目负责人、普通员工）
- 完善设备流转逻辑（库存查看、调拨转移、归还入库、入库出库、维修报废）
- 新增数据溯源功能，支持设备全生命周期追踪

**v2.5 更新内容：**
- 补充操作日志表SQL设计，明确数据溯源底层结构
- 明确库存统计实现方式（仪器单台管理，负载按规格汇总）
- 简化设备状态设计，减少冗余状态
- 补充智能提醒实现方案（定时任务 + 前端轮询）
- 调整页面优先级，分阶段实施
- 补充与现有数据库表结构的字段映射

**v2.6 更新内容：**
- 修复设备表命名不一致问题（equipment → equipment_instances）
- 修正设备状态枚举矛盾（统一为简化版状态设计）
- 补充equipment_instances表缺少的字段（purchase_date, purchase_price, notes）
- 补充equipment_models表完整建表SQL
- 补充warehouses表完整建表SQL
- 补充equipment_operation_logs表建表SQL
- 补充notifications表建表SQL
- 在employees表增加user_id字段，明确与users表的关联关系
- 新增设备管理模块API定义（7.2.6）
- 新增人员管理模块API定义（7.2.7）
- 新增通知模块API定义（7.2.8）
- 修正流程引擎API重复冲突（统一为instances，明确用户视角和管理员视角）

---

## 🎯 系统概述

### 1.1 系统定位

项目管理系统 v2 是一个面向工程项目的综合管理平台，采用**双角色权限体系**：
- **系统管理员**: 拥有全部功能权限，负责系统配置、流程监控、用户管理
- **普通员工**: 拥有业务操作权限，处理日常项目、审批、设备等事务

### 1.2 核心功能模块

| 模块 | 说明 | 目标用户 |
|-----|------|---------|
| **工作台** | 个人待办、快捷入口、数据概览 | 全体员工 |
| **项目管理** | 项目全生命周期管理 | 全体员工 |
| **审批中心** | 流程发起、审批处理、流程跟踪 | 全体员工 |
| **资源管理** | 人员、设备、客户资源管理 | 全体员工 |
| **流程引擎** | 流程设计、表单设计、数据联动 | 系统管理员 |
| **系统管理** | 用户管理、流程监控、系统配置 | 系统管理员 |

### 1.3 技术栈

| 层级 | 技术选型 | 说明 |
|-----|---------|------|
| **前端** | React 18 + TypeScript + Vite | 现代化前端框架 |
| **UI组件** | Tailwind CSS + Lucide Icons | 样式和图标库 |
| **流程可视化** | ReactFlow + BPMN.js | 流程图可视化组件 |
| **图表** | Recharts | 数据可视化图表 |
| **后端** | Node.js + Express + TypeScript | RESTful API |
| **数据库** | MySQL 8.0 | 关系型数据库 |
| **流程引擎** | 自研增强型引擎 | 支持可视化设计、监控、干预 |

---

## 🧭 界面导航结构设计

### 2.1 主导航菜单（侧边栏）

```
┌─────────────────────────────────────────────────────────────┐
│  🏠 工作台                                                  │
│     └── 个人首页 /dashboard                                 │
├─────────────────────────────────────────────────────────────┤
│  📁 项目管理                                                │
│     ├── 项目列表 /projects                                  │
│     ├── 新建项目 /projects/create                           │
│     └── 任务看板 /tasks/board                               │
├─────────────────────────────────────────────────────────────┤
│  📋 审批中心                                                │
│     ├── 发起审批 /approvals/new                             │
│     ├── 待我处理 /approvals/pending                         │
│     ├── 我已发起 /approvals/mine                            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  👥 人员管理                                                │
│     ├── 员工列表 /personnel                                 │
│     ├── 入职办理 /personnel/onboard                         │
│     ├── 离职办理 /personnel/offboard                        │
│     ├── 转正申请 /personnel/regular                         │
│     ├── 请假申请 /personnel/leave                           │
│     ├── 出差申请 /personnel/trip                            │
│     └── 调岗申请 /personnel/transfer                        │
├─────────────────────────────────────────────────────────────┤
│  🔧 设备管理                                                │
│     ├── 设备台账 /equipment                                 │
│     ├── 仓库管理 /equipment/warehouses                     │
│     ├── 库存管理 /equipment/inventory                       │
│     ├── 调拨转移 /equipment/transfer                        │
│     ├── 归还入库 /equipment/return                          │
│     ├── 入库登记 /equipment/inbound                         │
│     ├── 出库领用 /equipment/outbound                        │
│     ├── 维修管理 /equipment/repair                           │
│     ├── 报废管理 /equipment/scrap                            │
│     └── 数据溯源 /equipment/history                           │
├─────────────────────────────────────────────────────────────┤
│  🏢 组织架构                                                │
│     ├── 部门管理 /organization/departments                  │
│     ├── 岗位管理 /organization/positions                    │
│     └── 客户管理 /customers                                 │
├─────────────────────────────────────────────────────────────┤
│  ⚙️ 系统管理  [仅管理员可见]                                │
│     ├── 流程监控 /admin/workflow-monitor                    │
│     ├── 流程定义 /workflow/definitions                      │
│     ├── 表单设计 /forms/templates                           │
│     ├── 用户管理 /admin/users                               │
│     ├── 数据字典 /settings/metadata                         │
│     └── 系统设置 /settings                                  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 导航菜单命名规范

#### 2.2.1 一级菜单命名原则

| 原命名 | 新命名 | 命名理由 |
|-------|-------|---------|
| 控制中心 | **工作台** | 更贴近用户习惯，强调个人工作入口 |
| 生产交付 | **项目管理** | 直接明确核心功能 |
| 审批中心 | **审批中心** | 保持不变，清晰明确 |
| 资产管理 | **设备管理** | 聚焦设备资产，避免与"设备"混淆 |
| 资源协同 | **人员管理** + **组织架构** | 拆分后逻辑更清晰 |
| 数字化工厂 | **系统管理** | 仅管理员可见，强调系统级功能 |

#### 2.2.2 二级菜单命名规范

**统一命名模式**: `动作 + 对象` 或 `对象 + 状态`

| 模块 | 页面 | 命名理由 |
|-----|------|---------|
| 工作台 | 个人首页 | 展示个人工作概览 |
| 项目管理 | 项目列表 | 查看所有项目 |
| 项目管理 | 新建项目 | 创建新项目 |
| 项目管理 | 任务看板 | 可视化任务管理 |
| 审批中心 | 发起审批 | 主动发起流程 |
| 审批中心 | 待我处理 | 强调"我的"待办 |
| 审批中心 | 我已发起 | 强调"我的"发起记录 |

| 人员管理 | 员工列表 | 查看所有员工 |
| 人员管理 | 入职办理 | 办理入职手续 |
| 人员管理 | 离职办理 | 办理离职手续 |
| 人员管理 | 转正申请 | 提交转正申请 |
| 人员管理 | 请假申请 | 提交请假申请 |
| 人员管理 | 出差申请 | 提交出差申请 |
| 人员管理 | 调岗申请 | 提交调岗申请 |
| 设备管理 | 设备台账 | 设备资产总览 |
| 设备管理 | 仓库管理 | 管理仓库信息 |
| 设备管理 | 库存管理 | 查看设备库存 |
| 设备管理 | 调拨转移 | 设备调拨操作 |
| 设备管理 | 归还入库 | 设备归还操作 |
| 设备管理 | 入库登记 | 登记设备入库 |
| 设备管理 | 出库领用 | 设备出库领用 |
| 设备管理 | 维修管理 | 设备维修管理 |
| 设备管理 | 报废管理 | 设备报废管理 |
| 设备管理 | 数据溯源 | 查看操作记录 |
| 组织架构 | 部门管理 | 管理部门信息 |
| 组织架构 | 岗位管理 | 管理岗位信息 |
| 组织架构 | 客户管理 | 管理客户信息 |
| 系统管理 | 流程监控 | 监控所有流程 |
| 系统管理 | 流程定义 | 管理流程定义（查看、编辑、激活/暂停） |
| 系统管理 | 表单设计 | 设计业务表单 |
| 系统管理 | 用户管理 | 管理系统用户 |
| 系统管理 | 数据字典 | 配置基础数据 |
| 系统管理 | 系统设置 | 系统参数配置 |

---

## 🔐 权限体系设计

### 3.1 角色定义

#### 3.1.1 系统管理员 (admin)

**角色定位**: 系统超级管理员，拥有所有功能权限

**核心职责**:
- 系统配置与维护
- 用户账号管理
- 流程模板设计
- 流程监控与干预
- 数据字典维护

**可访问菜单**:
```
✅ 工作台
✅ 项目管理
✅ 审批中心（全部功能）
✅ 人员管理
✅ 设备管理
✅ 组织架构
✅ 系统管理（全部功能）
```

#### 3.1.2 普通员工 (employee)

**角色定位**: 日常业务操作人员

**核心职责**:
- 处理个人业务
- 发起审批流程
- 处理待办任务
- 查看项目信息
- 管理个人数据

**可访问菜单**:
```
✅ 工作台
✅ 项目管理
✅ 审批中心
✅ 人员管理
✅ 设备管理
✅ 组织架构（只读）
❌ 系统管理（不可见）
```

### 3.2 权限控制矩阵

| 功能模块 | 页面/功能 | 管理员 | 普通员工 |
|---------|----------|--------|---------|
| **工作台** | 个人首页 | ✅ | ✅ |
| **项目管理** | 项目列表 | ✅ 全部 | ✅ 有权限的 |
| **项目管理** | 新建项目 | ✅ | ✅ |
| **项目管理** | 编辑项目 | ✅ 全部 | ✅ 自己的 |
| **项目管理** | 删除项目 | ✅ | ❌ |
| **项目管理** | 任务看板 | ✅ 全部 | ✅ 参与的 |
| **审批中心** | 发起审批 | ✅ | ✅ |
| **审批中心** | 待我处理 | ✅ | ✅ |
| **审批中心** | 我已发起 | ✅ | ✅ |

| **人员管理** | 员工列表 | ✅ 全部 | ✅ 查看 |
| **人员管理** | 入职/离职办理 | ✅ | ❌ |
| **人员管理** | 各类申请 | ✅ | ✅ |
| **设备管理** | 设备台账 | ✅ 全部 | ✅ 查看 |
| **设备管理** | 仓库管理 | ✅ 全部 | ✅ 查看 |
| **设备管理** | 库存管理 | ✅ 全部 | ✅ 查看 |
| **设备管理** | 调拨转移 | ✅ 直接执行 | ✅ 申请 |
| **设备管理** | 归还入库 | ✅ 直接执行 | ✅ 申请 |
| **设备管理** | 入库/出库 | ✅ 直接执行 | ✅ 申请 |
| **设备管理** | 维修管理 | ✅ 直接执行 | ✅ 申请 |
| **设备管理** | 报废管理 | ✅ 直接执行 | ✅ 申请 |
| **设备管理** | 数据溯源 | ✅ 全部 | ✅ 自己的 |
| **组织架构** | 部门/岗位管理 | ✅ 编辑 | ✅ 查看 |
| **组织架构** | 客户管理 | ✅ 编辑 | ✅ 查看 |
| **系统管理** | 流程监控 | ✅ | ❌ |
| **系统管理** | 流程定义 | ✅ | ❌ |
| **系统管理** | 表单设计 | ✅ | ❌ |
| **系统管理** | 用户管理 | ✅ | ❌ |
| **系统管理** | 数据字典 | ✅ | ❌ |
| **系统管理** | 系统设置 | ✅ | ❌ |

### 3.3 数据权限规则

#### 3.3.1 项目数据

| 操作 | 管理员 | 普通员工 |
|-----|-------|---------|
| 查看 | 所有项目 | 参与的项目 |
| 编辑 | 所有项目 | 负责的项目 |
| 删除 | 所有项目 | 无权限 |
| 创建 | 允许 | 允许 |

#### 3.3.2 人员数据

| 操作 | 管理员 | 普通员工 |
|-----|-------|---------|
| 查看员工列表 | 全部信息 | 基本信息 |
| 查看敏感信息 | 允许 | 不允许 |
| 编辑员工信息 | 允许 | 仅自己 |
| 办理入离职 | 允许 | 不允许 |

#### 3.3.3 设备数据

| 操作 | 管理员 | 普通员工 |
|-----|-------|---------|
| 查看台账 | 全部 | 可用设备 |
| 入库登记 | 允许 | 申请后审批 |
| 出库领用 | 允许 | 申请后审批 |
| 调拨转移 | 允许 | 申请后审批 |

---

## 📱 功能模块详细设计

### 4.1 工作台模块

#### 4.1.1 功能定位
个人工作入口，聚合待办事项、快捷操作、数据概览

#### 4.1.2 页面结构
```
工作台 (/dashboard)
├── 顶部统计卡片
│   ├── 待处理审批
│   ├── 进行中的项目
│   ├── 待办任务
│   └── 本月出勤
├── 快捷操作区
│   ├── 发起审批
│   ├── 新建项目
│   ├── 申请设备
│   └── 填写日报
├── 待办事项列表
│   ├── 审批待办
│   ├── 任务提醒
│   └── 系统通知
└── 最近访问
    └── 快捷进入最近使用的功能
```

#### 4.1.3 权限说明
- **管理员**: 查看全系统统计数据
- **普通员工**: 查看个人相关数据

---

### 4.2 项目管理模块

#### 4.2.1 功能定位
项目全生命周期管理，从立项到结项的完整流程

#### 4.2.2 页面结构
```
项目管理
├── 项目列表 (/projects)
│   ├── 筛选器（状态、类型、负责人）
│   ├── 项目卡片/列表视图
│   └── 分页控制
├── 新建项目 (/projects/create)
│   ├── 项目基本信息
│   ├── 项目成员配置
│   └── 项目计划设置
├── 项目详情 (/projects/:id)
│   ├── 基本信息（项目名称、编号、类型、状态）
│   ├── 项目信息（国家、地址、日期、预算）
│   ├── 项目规模（建筑面积、IT容量、机柜数量等）
│   ├── 技术架构（供电、暖通、消防、弱电架构）
│   ├── 客户信息
│   └── 系统信息（创建时间、更新时间）
├── 任务列表
│   ├── 成员管理
│   ├── 进度跟踪
│   └── 文档资料
└── 任务看板 (/tasks/board)
    ├── 看板视图（待办/进行中/已完成）
    ├── 列表视图
    └── 日历视图
```

#### 4.2.3 权限说明
- **项目创建**: 所有员工可创建
- **项目编辑**: 管理员可编辑所有，员工仅可编辑自己负责的项目
- **项目查看**: 管理员查看全部，员工查看参与的项目

---

### 4.3 审批中心模块

#### 4.3.1 功能定位
统一的审批流程处理中心，支持各类业务审批

#### 4.3.2 页面结构
```
审批中心
├── 发起审批 (/approvals/new)
│   ├── 选择审批类型
│   ├── 填写表单
│   └── 提交审批
├── 待我处理 (/approvals/pending)
│   ├── 待办列表
│   ├── 批量处理
│   └── 审批详情
└── 我已发起 (/approvals/mine)
    ├── 发起记录
    ├── 流程跟踪
    └── 撤回操作
```

> **注意**: 流程配置已统一至【系统管理 → 流程定义】，审批中心不再提供独立的流程配置功能。

#### 4.3.3 审批类型

| 审批类型 | 说明 | 适用场景 |
|---------|------|---------|
| 通用审批 | 自定义审批流程 | 各类业务审批 |
| 请假申请 | 员工请假流程 | 事假、病假、年假等 |
| 出差申请 | 员工出差流程 | 商务出差 |
| 报销申请 | 费用报销流程 | 差旅费、办公费等 |
| 采购申请 | 物资采购流程 | 办公用品、设备等 |
| 入职审批 | 新员工入职 | 人事入职办理 |
| 离职审批 | 员工离职 | 人事离职办理 |
| 转正审批 | 试用期转正 | 员工转正申请 |
| 调岗审批 | 岗位调动 | 部门间人员调动 |
| 设备申请 | 设备领用 | 设备出库申请 |

#### 4.3.4 权限说明
- **发起审批**: 所有员工
- **处理审批**: 根据流程配置的审批人

---

### 4.4 人员管理模块

#### 4.4.1 功能定位
员工全生命周期管理，从入职到离职的完整流程

#### 4.4.2 页面结构
```
人员管理
├── 员工列表 (/personnel)
│   ├── 员工卡片/列表
│   ├── 筛选搜索
│   └── 导出功能
├── 员工详情 (/personnel/:id)
│   ├── 基本信息（姓名、工号、性别、头像）
│   ├── 状态信息（在职状态、当前状态、角色）
│   ├── 联系方式（手机、邮箱）
│   ├── 组织信息（部门、岗位）
│   ├── 技能信息
│   └── 系统信息（员工ID、用户ID、创建时间）
├── 入职办理 (/personnel/onboard)
│   ├── 入职申请
│   ├── 资料录入
│   └── 审批流程
├── 离职办理 (/personnel/offboard)
│   ├── 离职申请
│   ├── 交接清单
│   └── 审批流程
├── 转正申请 (/personnel/regular)
│   ├── 转正申请
│   └── 审批流程
├── 请假申请 (/personnel/leave)
│   ├── 请假申请
│   └── 审批流程
├── 出差申请 (/personnel/trip)
│   ├── 出差申请
│   └── 审批流程
└── 调岗申请 (/personnel/transfer)
    ├── 调岗申请
    └── 审批流程
```

#### 4.4.3 权限说明
- **查看员工**: 所有员工可查看基本信息
- **入离职办理**: 仅管理员可操作
- **各类申请**: 员工可发起自己的申请

---

### 4.5 设备管理模块

#### 4.5.1 功能定位
实现仪器（单台唯一追踪）、负载/线缆（按规格批量管理）从入库、库存、调拨、领用、归还到维修/报废的全生命周期管理，核心支撑仓库↔项目、项目↔项目的设备资源调配，做到库存透明、流程简洁、数据可溯、智能提醒，适配工程项目设备使用的实际业务场景。

#### 4.5.2 核心设备管理规则

##### 4.5.2.1 仪器类（如电能质量分析仪、检测仪表）
- **单台唯一管理**: 每台分配专属管理编码 + 机身序列号，全程单独追踪
- **校准强管控**: 每年校准一次，到期前自动提醒，超期设备禁止调拨/领用
- **流转规则**: 单台流转，库存数量仅为 0/1，调拨/归还需核对配件完整性
- **状态追踪**: 全程记录健康状态（正常/轻微损坏/严重损坏）、使用状态（闲置/在用/维修中）

##### 4.5.2.2 负载/线缆类（如 8kW 假负载、工业电缆）
- **按规格批量管理**: 同规格设备合并库存，无需单台编号，按"台/米/套"计量
- **库存阈值管控**: 设置最低库存，低于阈值自动告警，避免项目缺料
- **流转规则**: 批量调拨/领用/归还，无需配件核对，仅关注实际数量
- **简化管理**: 无需校准，仅记录健康状态和使用状态，报废直接清零库存

##### 4.5.2.3 统一设备状态设计（简化版）

为减少冗余状态，统一设备状态定义如下：

```
位置状态（location_status）：
  - warehouse（仓库）：设备在仓库中
  - in_project（在项目）：设备在项目中
  - repairing（维修中）：设备正在维修
  - scrapped（已报废）：设备已报废，不参与流转

使用状态（usage_status）：
  - idle（闲置）：设备可用，未被使用
  - in_use（使用中）：设备已被领用/调拨到项目

健康状态（health_status）：
  - normal（正常）：设备正常运行
  - slightly_damaged（轻微损坏）：不影响使用的小问题
  - severely_damaged（严重损坏）：需维修后才能使用
  - scrapped（已报废）：已走报废流程，永久不可用

校准状态（仅仪器类）：
  - valid（有效）：校准在有效期内
  - expiring_soon（即将到期）：30天内到期
  - expired（已过期）：已超期，禁止流转
```

**状态变更规则**：
- 设备归还入库时：location_status 从 in_project 变为 warehouse
- 设备调拨出库时：location_status 从 warehouse 变为 in_project
- 发起维修时：location_status 变为 repairing，usage_status 变为 idle
- 维修完成时：location_status 恢复为原状态（warehouse/in_project）
- 报废完成后：location_status 变为 scrapped，健康状态变为 scrapped

#### 4.5.3 页面结构
```
设备管理
├── 设备台账 (/equipment)
│   ├── 设备列表
│   ├── 筛选搜索（名称、编码、规格）
│   └── 统计报表
├── 设备详情 (/equipment/:id)
│   ├── 设备信息（名称、型号、品牌、类别、序列号、管理编码）
│   ├── 状态信息（健康状态、使用状态、位置状态）
│   ├── 管理信息（保管人、当前位置、采购日期、采购价格）
│   ├── 技术信息（单位、校准周期、校准到期日）
│   ├── 备注
│   └── 系统信息（设备ID、型号ID、创建时间）
├── 仓库管理 (/equipment/warehouses)
│   ├── 仓库列表
│   ├── 仓库详情
│   └── 仓库配置
├── 库存管理 (/equipment/inventory)
│   ├── 库存总览（按仓库/项目展示）
│   ├── 库存查询（按设备类型、状态、存储节点、校准状态筛选）
│   └── 库存告警
├── 调拨转移 (/equipment/transfer)
│   ├── 调拨申请
│   ├── 调拨审批
│   └── 调拨记录
├── 归还入库 (/equipment/return)
│   ├── 归还申请（单设备/项目批量）
│   ├── 归还审批
│   └── 归还记录
├── 入库登记 (/equipment/inbound)
│   ├── 入库申请
│   ├── 扫码入库
│   └── 入库记录
├── 出库领用 (/equipment/outbound)
│   ├── 领用申请
│   └── 出库记录
├── 维修管理 (/equipment/repair)
│   ├── 维修申请
│   ├── 维修审批
│   └── 维修记录
├── 报废管理 (/equipment/scrap)
│   ├── 报废申请
│   ├── 报废审批
│   └── 报废记录
└── 数据溯源 (/equipment/history)
    ├── 操作记录
    └── 设备历史
```

#### 4.5.4 核心业务流转逻辑

##### 4.5.4.1 库存查看逻辑（核心：找设备、看存量，一步到位）
- **输入搜索**: 设备名称/编码/规格，系统自动分层展示存量
- **优先展示**: 所有仓库的存量（按库存从高到低排序）
- **次级展示**: 若仓库无存量，自动展示所有项目的存量（按项目结束时间从近到远排序）
- **筛选功能**: 可按设备类型、状态、存储节点（仓库/项目）、仪器校准状态精准查找

##### 4.5.4.2 调拨转移逻辑（核心：仓库↔项目、项目↔项目，灵活调配）
- **适用场景**: 项目缺设备时，从仓库调拨/从其他项目调拨；仓库补库存时，从项目调拨回仓
- **操作流程（3步完成，无冗余录入）**:
  1. 选调入节点：确定设备要转到哪个仓库/项目
  2. 选设备 + 调出节点：选完设备，系统自动展示所有有存量的仓库/项目，直接选择即可
  3. 填数量 + 备注：仪器数量固定为 1（需核对配件），负载填批量数（系统自动校验：申请数量≤调出节点存量，不足无法提交）
- **权限规则**:
  - 管理员：可直接执行调拨，无需审批
  - 普通员工/项目负责人：发起申请，对应审批人（仓库管理员/项目负责人）审批通过后，系统自动更新库存（调出节点 - 数量，调入节点 + 数量），全程无需人工改数

##### 4.5.4.3 归还入库逻辑（核心：项目结束必归还，库存自动回仓）
- **适用场景**: 项目完成/暂停后，将项目内设备归还至指定仓库，是项目收尾的核心操作
- **操作流程（支持单台/批量归还，简化操作）**:
  1. 选归还类型：单设备归还/项目批量归还（推荐，一键选择整项目设备）
  2. 选设备 + 目标仓库：批量归还时，选择已完成/待结束项目，系统自动加载项目内所有未归还设备，直接勾选即可
  3. 填数量 + 状态：系统校验数量≤项目存量，故障设备需备注详情，仪器需核对配件
- **核心规则**:
  - 仅已完成/待结束的项目可发起批量归还，避免项目中途设备被随意归还
  - 审批通过后，系统自动更新：项目存量 - 数量，仓库存量 + 数量，设备标记为已归还
  - 故障设备归还时，仓库管理员可驳回，要求先维修再归还，保证仓库设备可用性

##### 4.5.4.4 入库/出库逻辑（基础流转，适配首次入库/项目直接领用）
- **入库登记**:
  - 适用：新设备采购首次入库、调拨/归还的二次入库
  - 规则：仪器需先建档（录编码/序列号/校准信息）再入库，负载按规格批量入库，管理员可直接入库，员工需申请审批
- **出库领用**:
  - 适用：项目直接从仓库领用设备（本质是仓库→项目的简易调拨）
  - 规则：流程与调拨一致，仅固定调入节点为"项目"，简化操作，避免重复流程

##### 4.5.4.5 维修/报废逻辑（状态管控，避免无效流转）
- **维修申请**:
  - 故障设备（仓库/项目内）可发起维修，维修期间设备标记为维修中，禁止调拨/领用/归还
  - 维修完成后，更新设备健康状态，恢复正常流转
- **报废申请**:
  - 无法维修/无使用价值的设备可发起报废，审批通过后：
    - 仪器：标记为已报废，从可用列表隐藏（仅管理员可查）
    - 负载/线缆：库存台账直接清零，不再参与流转
  - 所有报废设备均保留记录，支持溯源

#### 4.5.5 智能提醒逻辑（减少人工监控，避免遗漏）

##### 4.5.5.1 仪器校准到期提醒
- 系统每日自动扫描，校准到期前 30 天，向设备保管人/管理员发送提醒通知（系统内 + 邮件）
- 若校准已超期，发送紧急告警（系统内 + 邮件 + 短信），并将仪器标记为校准超期，禁止所有流转操作，完成校准后自动恢复

##### 4.5.5.2 负载/线缆库存告警
- 系统实时监控库存，当某规格设备存量低于设置的最低阈值时，向仓库管理员/采购负责人发送库存告警通知
- 设备台账中该规格标红展示"库存告警"，补货入库后自动清除告警

##### 4.5.5.3 智能提醒实现方案

**实现方式**：采用定时任务 + 前端轮询结合的方式

```
方案A：定时任务（推荐用于生产环境）
- 使用 node-cron 或 node-schedule 库
- 每天凌晨执行任务，扫描校准到期和库存告警
- 生成系统通知记录，可通过消息推送发送

方案B：前端轮询（简单实现，快速上线）
- 用户进入页面时调用接口检查
- 每次页面刷新时检查告警状态
- 适用于功能初期或提醒不频繁的场景

建议：
- 第一阶段：先实现方案B，快速上线
- 第二阶段：增加定时任务方案A，实现更及时的提醒
```

**校准提醒定时任务示例**：
```javascript
// 每天凌晨2点执行
cron.schedule('0 2 * * *', async () => {
  // 1. 扫描30天内即将到期的设备
  const expiringEquipment = await db.query(`
    SELECT ei.*, em.name as model_name, u.name as keeper_name
    FROM equipment_instances ei
    LEFT JOIN equipment_models em ON ei.model_id = em.id
    LEFT JOIN users u ON ei.keeper_id = u.id
    WHERE ei.calibration_expiry <= DATE_ADD(NOW(), INTERVAL 30 DAY)
    AND ei.calibration_expiry >= NOW()
    AND em.category = 'instrument'
  `);
  
  // 2. 扫描已超期的设备
  const expiredEquipment = await db.query(`
    UPDATE equipment_instances ei
    LEFT JOIN equipment_models em ON ei.model_id = em.id
    SET ei.calibration_status = 'expired'
    WHERE ei.calibration_expiry < NOW()
    AND em.category = 'instrument'
  `);
  
  // 3. 生成通知（通知逻辑省略）
});
```

**库存告警检查（实时）**：
```sql
-- 查询低于库存阈值的设备型号
SELECT 
  em.id, em.name, em.min_stock_level,
  COUNT(ei.id) as current_stock
FROM equipment_models em
LEFT JOIN equipment_instances ei ON em.id = ei.model_id 
  AND ei.location_status = 'warehouse'
  AND ei.health_status != 'scrapped'
GROUP BY em.id
HAVING COUNT(ei.id) < em.min_stock_level;
```

#### 4.5.6 权限管理逻辑（分层管控，避免越权操作）

##### 4.5.6.1 系统管理员（最高权限）
- **操作权限**: 新增/编辑/删除设备档案、直接执行所有入库/调拨/归还操作（无需审批）
- **查看权限**: 所有设备/库存/操作记录，配置校准周期/库存阈值，查看统计分析
- **核心职责**: 系统配置、数据管理、流程监控

##### 4.5.6.2 仓库管理员
- **操作权限**: 管辖仓库的入库/审批、调拨/归还的仓库端审批，查看管辖仓库的所有设备/库存
- **核心职责**: 仓库设备管理、库存把控、设备归还验收、接收库存告警

##### 4.5.6.3 项目负责人
- **操作权限**: 发起负责项目的设备调拨/领用/归还申请，审批项目内相关操作，查看项目内所有设备/库存
- **核心职责**: 项目设备统筹、项目结束设备归还、把控项目设备状态

##### 4.5.6.4 普通员工
- **操作权限**: 发起本人参与项目的设备申请（调拨/领用/归还），查看有权限的设备/库存，查看自己的操作记录
- **核心职责**: 按项目需求申请设备，配合完成设备流转

#### 4.5.7 数据溯源逻辑（全程留痕，可查可溯）
- 设备的每一次操作（入库/调拨/归还/出库/维修/报废/编辑），系统均会自动生成操作记录，包含：
  - 操作类型、操作人、操作时间、关联单据号
  - 操作前后的存量、存储节点、设备状态
  - 操作备注（配件核对、故障详情、调拨原因等）
- 所有记录永久保存，可按设备、操作类型、时间精准查询，实现设备全生命周期溯源，便于问题排查和责任界定

##### 4.5.7.1 操作日志表结构（数据库设计）

```sql
-- 设备操作日志表（用于数据溯源）
CREATE TABLE IF NOT EXISTS equipment_operation_logs (
  id VARCHAR(36) PRIMARY KEY,
  equipment_id VARCHAR(36) NOT NULL COMMENT '设备ID',
  equipment_name VARCHAR(200) COMMENT '设备名称（冗余）',
  model_id VARCHAR(36) COMMENT '设备型号ID',
  model_name VARCHAR(200) COMMENT '设备型号名称（冗余）',
  operation_type ENUM(
    'inbound',      -- 入库
    'outbound',     -- 出库/领用
    'transfer',     -- 调拨
    'return',       -- 归还
    'repair',       -- 维修
    'scrap',        -- 报废
    'edit',         -- 编辑
    'calibration'   -- 校准
  ) NOT NULL COMMENT '操作类型',
  operator_id VARCHAR(36) NOT NULL COMMENT '操作人ID',
  operator_name VARCHAR(100) COMMENT '操作人姓名',
  from_location_type ENUM('warehouse', 'project', 'none') COMMENT '调出位置类型',
  from_location_id VARCHAR(36) COMMENT '调出位置ID（仓库ID或项目ID）',
  from_location_name VARCHAR(200) COMMENT '调出位置名称（冗余）',
  to_location_type ENUM('warehouse', 'project', 'none') COMMENT '调入位置类型',
  to_location_id VARCHAR(36) COMMENT '调入位置ID（仓库ID或项目ID）',
  to_location_name VARCHAR(200) COMMENT '调入位置名称（冗余）',
  quantity INT DEFAULT 1 COMMENT '操作数量（仪器始终为1，负载可为批量）',
  equipment_status_before VARCHAR(50) COMMENT '操作前设备状态',
  equipment_status_after VARCHAR(50) COMMENT '操作后设备状态',
  health_status_before VARCHAR(50) COMMENT '操作前健康状态',
  health_status_after VARCHAR(50) COMMENT '操作后健康状态',
  workflow_instance_id VARCHAR(36) COMMENT '关联流程实例ID（如有审批）',
  order_no VARCHAR(50) COMMENT '关联单据号',
  notes TEXT COMMENT '备注说明',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_equipment_id (equipment_id),
  INDEX idx_operation_type (operation_type),
  INDEX idx_operator_id (operator_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

##### 4.5.7.2 库存统计实现方式

由于仪器类和负载类的管理方式不同，库存统计采用不同策略：

```
仪器类（单台唯一管理）：
- equipment_instances 表中每条记录代表1台设备
- 库存统计：通过 COUNT(model_id) 按型号分组统计
- 位置状态：通过 location_status + location_id 确定当前位置

负载/线缆类（按规格批量管理）：
- 同样使用 equipment_instances 表记录
- 库存统计：按 model_id 汇总数量，location_status='warehouse' 时为仓库库存
- 支持批量操作，一次调拨/归还可修改多条记录
```

**SQL统计示例**：
```sql
-- 查看某型号设备在各仓库的总库存
SELECT 
  w.name AS warehouse_name,
  COUNT(ei.id) AS quantity
FROM equipment_instances ei
LEFT JOIN warehouses w ON ei.location_id = w.id AND ei.location_status = 'warehouse'
WHERE ei.model_id = ? AND ei.health_status != 'scrapped'
GROUP BY w.id;

-- 查看某型号设备在各项目的库存
SELECT 
  p.name AS project_name,
  COUNT(ei.id) AS quantity
FROM equipment_instances ei
LEFT JOIN projects p ON ei.location_id = p.id AND ei.location_status = 'in_project'
WHERE ei.model_id = ? AND ei.health_status != 'scrapped'
GROUP BY p.id;
```

#### 4.5.8 权限说明
- **查看台账**: 所有员工可查看
- **仓库管理**: 管理员可管理所有仓库，仓库管理员仅管理管辖仓库
- **入库登记**: 管理员直接登记，员工需申请审批
- **出库/调拨/归还**: 管理员直接执行，员工/项目负责人发起申请后审批
- **维修/报废**: 管理员直接执行，员工发起申请后审批
- **数据溯源**: 所有员工可查看自己的操作记录，管理员可查看全部记录

#### 4.5.9 实施计划与优先级

为确保系统能够分阶段交付，将设备管理模块分为以下阶段实施：

```
第一阶段：核心功能（MVP）
├── 1. 设备台账
│   ├── 设备列表展示（支持搜索、筛选）
│   └── 设备详情页
├── 2. 仓库管理
│   ├── 仓库增删改查
│   └── 仓库详情
└── 3. 设备入库登记
    └── 新建设备档案并入库

第二阶段：流转功能
├── 4. 设备调拨转移
│   ├── 调拨申请/审批流程
│   └── 调拨记录
├── 5. 设备归还入库
│   ├── 归还申请/审批流程
│   └── 归还记录
└── 6. 设备出库领用
    └── 领用申请/出库记录

第三阶段：维修报废
├── 7. 设备维修管理
│   ├── 维修申请/审批流程
│   └── 维修记录
├── 8. 设备报废管理
│   ├── 报废申请/审批流程
│   └── 报废记录
└── 9. 数据溯源
    └── 操作日志查询

第四阶段：进阶功能
├── 10. 智能提醒
│   ├── 校准到期提醒
│   └── 库存告警
└── 11. 权限细分
    └── 仓库管理员、项目负责人角色
```

**当前系统角色说明**：
```
考虑到系统当前实际情况，角色设计如下：

第一阶段实施（简化版）：
- admin（系统管理员）：拥有所有设备管理权限，直接执行操作
- employee（普通员工）：只能发起申请，需审批

第二阶段考虑扩展（预留）：
- warehouse_keeper：仓库管理员
- project_manager：项目经理
```

#### 4.5.10 与现有数据库表字段对照

为确保开发时字段对齐，特整理现有表结构与设计文档的映射关系：

```
equipment_instances 表（设备实例）：
| 数据库字段 | 设计文档对应字段 | 状态 |
|-----------|-----------------|------|
| id | 设备ID | ✅ 已有 |
| model_id | 设备型号ID | ✅ 已有 |
| serial_number | 机身序列号 | ✅ 已有 |
| manage_code | 管理编码 | ✅ 已有 |
| health_status | 健康状态 | ✅ 已有 |
| usage_status | 使用状态 | ✅ 已有 |
| location_status | 位置状态 | ✅ 已有 |
| location_id | 当前位置ID | ✅ 已有 |
| keeper_id | 保管人ID | ✅ 已有 |
| purchase_date | 采购日期 | ✅ 已有 |
| purchase_price | 采购价格 | ✅ 已有 |
| calibration_expiry | 校准到期日 | ✅ 已有 |
| notes | 备注 | ✅ 已有 |

equipment_models 表（设备型号）：
| 数据库字段 | 设计文档对应字段 | 状态 |
|-----------|-----------------|------|
| id | 型号ID | ✅ 已有 |
| category | 设备类别 | ✅ 已有 |
| name | 型号名称 | ✅ 已有 |
| model_no | 型号编码 | ✅ 已有 |
| brand | 品牌 | ✅ 已有 |
| unit | 计量单位 | ✅ 已有 |
| calibration_cycle | 校准周期 | ✅ 已有 |
| min_stock_level | 最低库存阈值 | ❌ 需新增 |

warehouses 表（仓库）：
| 数据库字段 | 设计文档对应字段 | 状态 |
|-----------|-----------------|------|
| id | 仓库ID | ✅ 已有 |
| warehouse_no | 仓库编码 | ✅ 已有 |
| name | 仓库名称 | ✅ 已有 |
| type | 仓库类型 | ✅ 已有 |
| location | 位置 | ✅ 已有 |
| address | 地址 | ✅ 已有 |
| manager_id | 仓库管理员ID | ✅ 已有 |
| status | 状态 | ✅ 已有 |

需要新增的表：
| 表名 | 用途 | 优先级 |
|-----|------|--------|
| equipment_operation_logs | 操作日志/数据溯源 | 高 |
| equipment_calibration_records | 校准记录 | 中 |
| notifications | 通知记录 | 中 |
```

---

### 4.6 组织架构模块

#### 4.6.1 功能定位
企业组织架构管理，部门、岗位、客户信息管理

#### 4.6.2 页面结构
```
组织架构
├── 部门管理 (/organization/departments)
│   ├── 部门树形结构
│   ├── 部门详情
│   └── 部门成员
├── 岗位管理 (/organization/positions)
│   ├── 岗位列表
│   ├── 岗位职责
│   └── 岗位编制
└── 客户管理 (/customers)
    ├── 客户列表
    ├── 客户详情
    └── 合作项目
```

#### 4.6.3 权限说明
- **查看**: 所有员工可查看
- **编辑**: 仅管理员可编辑

---

### 4.7 系统管理模块（管理员专属）

#### 4.7.1 功能定位
系统级配置和管理功能，仅对管理员开放

#### 4.7.2 页面结构
```
系统管理 [管理员专属]
├── 流程监控 (/admin/workflow-monitor)
│   ├── 实时监控大屏
│   ├── 流程实例列表
│   ├── 流程统计分析
│   └── 管理员干预（跳转/回退/强制完成）
├── 流程定义 (/workflow/definitions)
│   ├── 流程定义列表
│   ├── 流程详情查看
│   ├── 流程编辑（跳转至设计器）
│   ├── 流程激活/暂停
│   └── 流程删除
├── 表单设计 (/forms/templates)
│   ├── 表单模板列表
│   ├── 表单设计器
│   └── 表单字段配置
├── 用户管理 (/admin/users)
│   ├── 用户列表
│   ├── 角色分配
│   └── 权限配置
├── 数据字典 (/settings/metadata)
│   ├── 字典类型
│   ├── 字典项管理
│   └── 数据联动配置
└── 系统设置 (/settings)
    ├── 基础配置
    ├── 通知配置
    └── 日志管理
```

#### 4.7.3 权限说明
- **全部功能**: 仅系统管理员可访问

---

## 🔄 流程引擎设计

### 5.1 引擎架构

```
┌─────────────────────────────────────────────────────────────┐
│                      流程引擎核心层                           │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 流程定义管理  │  │ 流程实例引擎  │  │ 任务调度中心  │      │
│  │ Definition   │  │  Instance    │  │    Task      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├─────────────────────────────────────────────────────────────┤
│                      扩展服务层                              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  执行日志    │  │  性能监控    │  │  管理员干预  │      │
│  │   Logger     │  │   Monitor    │  │    Admin     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 核心功能

#### 5.2.1 流程定义
- 可视化流程设计
- 节点类型支持：开始、结束、审批、条件、并行
- 审批人配置：
  - `user`: 指定用户（通过用户ID多选）
  - `role`: 指定角色（如 hr_manager, admin, project_manager 等）
  - `department_manager`: 部门经理（自动查找部门负责人）
  - `project_manager`: 项目经理（自动查找项目负责人）
  - `form_field`: 表单字段（动态指定审批人）
  - `expression`: 表达式（复杂逻辑）
  - `initiator`: 发起人（流程发起人自己）
- 多人审批模式：或签、会签、顺序签、投票

#### 5.2.2 流程执行
- 流程实例创建与启动
- 任务自动分配与流转
- 条件分支自动判断
- 流程变量支持

#### 5.2.3 管理员干预
- 强制跳转到指定节点
- 回退到上一节点
- 强制完成任务
- 强制关闭流程
- 任务重新分配

#### 5.2.4 监控与日志
- 实时监控大屏
- 流程执行日志
- 性能指标统计
- 异常告警

---

## 💾 数据库设计

### 6.1 核心表结构

#### 6.1.1 用户与权限表

```sql
-- 用户表
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  role ENUM('admin', 'employee') DEFAULT 'employee',
  status ENUM('active', 'inactive') DEFAULT 'active',
  department_id VARCHAR(36),
  position_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 角色权限表（预留扩展）
CREATE TABLE roles (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 6.1.2 流程引擎表

```sql
-- 流程定义表
CREATE TABLE workflow_definitions (
  id VARCHAR(36) PRIMARY KEY,
  process_key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  version INT DEFAULT 1,
  category VARCHAR(50),
  description TEXT,
  node_config JSON NOT NULL,
  form_config JSON,
  status ENUM('draft', 'active', 'inactive') DEFAULT 'draft',
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 流程实例表
CREATE TABLE workflow_instances (
  id VARCHAR(36) PRIMARY KEY,
  definition_id VARCHAR(36) NOT NULL,
  definition_version INT DEFAULT 1,
  category VARCHAR(50),
  business_key VARCHAR(100),
  business_id VARCHAR(36),
  title VARCHAR(200),
  initiator_id VARCHAR(36),
  initiator_name VARCHAR(100),
  status ENUM('running', 'completed', 'terminated', 'suspended') DEFAULT 'running',
  result ENUM('approved', 'rejected', 'cancelled'),
  variables JSON,
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP,
  duration INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 流程任务表
CREATE TABLE workflow_tasks (
  id VARCHAR(36) PRIMARY KEY,
  instance_id VARCHAR(36) NOT NULL,
  node_id VARCHAR(100) NOT NULL,
  node_name VARCHAR(200),
  assignee_id VARCHAR(36),
  assignee_name VARCHAR(100),
  status ENUM('created', 'assigned', 'in_progress', 'completed', 'cancelled') DEFAULT 'created',
  result ENUM('approved', 'rejected', 'transferred'),
  comment TEXT,
  approval_mode ENUM('or_sign', 'and_sign', 'sequential', 'vote') DEFAULT 'or_sign',
  vote_threshold INT DEFAULT 1,
  due_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  claimed_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- 执行日志表
CREATE TABLE workflow_execution_logs (
  id VARCHAR(36) PRIMARY KEY,
  execution_id VARCHAR(36) NOT NULL,
  action VARCHAR(50) NOT NULL,
  instance_id VARCHAR(36),
  task_id VARCHAR(36),
  node_id VARCHAR(100),
  operator_id VARCHAR(36),
  operator_name VARCHAR(100),
  reason TEXT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 性能监控表
CREATE TABLE workflow_performance_metrics (
  id VARCHAR(36) PRIMARY KEY,
  metric_type VARCHAR(50) NOT NULL,
  process_key VARCHAR(100),
  node_id VARCHAR(100),
  value DECIMAL(10, 2),
  unit VARCHAR(20),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 审批记录表（工作流审批历史）
CREATE TABLE workflow_approvals (
  id VARCHAR(36) PRIMARY KEY,
  task_id VARCHAR(36) NOT NULL COMMENT '任务ID',
  instance_id VARCHAR(36) NOT NULL COMMENT '流程实例ID',
  node_id VARCHAR(100) NOT NULL COMMENT '节点ID',
  approver_id VARCHAR(36) NOT NULL COMMENT '审批人ID',
  approver_name VARCHAR(100) COMMENT '审批人姓名',
  action ENUM('approve', 'reject', 'delegate', 'transfer') NOT NULL COMMENT '操作类型',
  comment TEXT COMMENT '审批意见',
  approval_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '审批时间',
  attachments JSON COMMENT '附件列表',
  INDEX idx_task_id (task_id),
  INDEX idx_instance_id (instance_id)
);
```

#### 6.1.3 业务表

```sql
-- 项目表
CREATE TABLE projects (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  type ENUM('domestic', 'foreign', 'rd', 'service'),
  manager_id VARCHAR(36),
  status ENUM('proposal', 'in_progress', 'completed', 'paused') DEFAULT 'proposal',
  progress INT DEFAULT 0,
  start_date DATE,
  end_date DATE,
  budget DECIMAL(15, 2),
  description TEXT,
  customer_id VARCHAR(36),
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 员工表
CREATE TABLE employees (
  id VARCHAR(36) PRIMARY KEY,
  employee_no VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  gender ENUM('male', 'female'),
  phone VARCHAR(20),
  email VARCHAR(100),
  department_id VARCHAR(36),
  position_id VARCHAR(36),
  status ENUM('active', 'resigned', 'probation') DEFAULT 'probation',
  hire_date DATE,
  leave_date DATE,
  user_id VARCHAR(36) COMMENT '关联用户账号ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 设备型号表
CREATE TABLE equipment_models (
  id VARCHAR(36) PRIMARY KEY,
  category ENUM('instrument', 'fake_load') NOT NULL COMMENT '设备类别',
  name VARCHAR(200) NOT NULL COMMENT '型号名称',
  model_no VARCHAR(100) COMMENT '型号编码',
  brand VARCHAR(100) COMMENT '品牌',
  unit VARCHAR(20) DEFAULT '台' COMMENT '计量单位',
  calibration_cycle INT COMMENT '校准周期(月)',
  min_stock_level INT DEFAULT 0 COMMENT '最低库存阈值',
  description TEXT COMMENT '描述',
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 仓库表
CREATE TABLE warehouses (
  id VARCHAR(36) PRIMARY KEY,
  warehouse_no VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  type ENUM('main', 'branch', 'project') DEFAULT 'main',
  location VARCHAR(200) NOT NULL,
  address TEXT,
  manager_id VARCHAR(36),
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 设备实例表（一物一码）
CREATE TABLE equipment_instances (
  id VARCHAR(36) PRIMARY KEY,
  model_id VARCHAR(36) NOT NULL,
  serial_number VARCHAR(100),
  manage_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200),
  health_status ENUM('normal', 'slightly_damaged', 'severely_damaged', 'scrapped') DEFAULT 'normal',
  usage_status ENUM('idle', 'in_use') DEFAULT 'idle',
  location_status ENUM('warehouse', 'in_project', 'repairing', 'scrapped') DEFAULT 'warehouse',
  location_id VARCHAR(36),
  keeper_id VARCHAR(36),
  purchase_date DATE,
  purchase_price DECIMAL(12, 2),
  calibration_expiry DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_model (model_id)
);

-- 设备操作日志表（用于数据溯源）
CREATE TABLE IF NOT EXISTS equipment_operation_logs (
  id VARCHAR(36) PRIMARY KEY,
  equipment_id VARCHAR(36) NOT NULL COMMENT '设备ID',
  equipment_name VARCHAR(200) COMMENT '设备名称（冗余）',
  model_id VARCHAR(36) COMMENT '设备型号ID',
  model_name VARCHAR(200) COMMENT '设备型号名称（冗余）',
  operation_type ENUM(
    'inbound',
    'outbound',
    'transfer',
    'return',
    'repair',
    'scrap',
    'edit',
    'calibration'
  ) NOT NULL COMMENT '操作类型',
  operator_id VARCHAR(36) NOT NULL COMMENT '操作人ID',
  operator_name VARCHAR(100) COMMENT '操作人姓名',
  from_location_type ENUM('warehouse', 'project', 'none') COMMENT '调出位置类型',
  from_location_id VARCHAR(36) COMMENT '调出位置ID（仓库ID或项目ID）',
  from_location_name VARCHAR(200) COMMENT '调出位置名称（冗余）',
  to_location_type ENUM('warehouse', 'project', 'none') COMMENT '调入位置类型',
  to_location_id VARCHAR(36) COMMENT '调入位置ID（仓库ID或项目ID）',
  to_location_name VARCHAR(200) COMMENT '调入位置名称（冗余）',
  quantity INT DEFAULT 1 COMMENT '操作数量（仪器始终为1，负载可为批量）',
  equipment_status_before VARCHAR(50) COMMENT '操作前设备状态',
  equipment_status_after VARCHAR(50) COMMENT '操作后设备状态',
  health_status_before VARCHAR(50) COMMENT '操作前健康状态',
  health_status_after VARCHAR(50) COMMENT '操作后健康状态',
  workflow_instance_id VARCHAR(36) COMMENT '关联流程实例ID（如有审批）',
  order_no VARCHAR(50) COMMENT '关联单据号',
  notes TEXT COMMENT '备注说明',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_equipment_id (equipment_id),
  INDEX idx_operation_type (operation_type),
  INDEX idx_operator_id (operator_id),
  INDEX idx_created_at (created_at)
);

-- 通知表
CREATE TABLE notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL COMMENT '接收人',
  type ENUM('system', 'approval', 'calibration', 'stock_alert', 'task') NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  is_read TINYINT(1) DEFAULT 0,
  related_type VARCHAR(50) COMMENT '关联对象类型',
  related_id VARCHAR(36) COMMENT '关联对象ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read)
);
```

---

## 🔌 API 接口设计

### 7.1 接口规范

#### 7.1.1 响应格式

```typescript
// 成功响应
{
  "success": true,
  "data": {},
  "message": "操作成功"
}

// 错误响应
{
  "success": false,
  "error": "错误信息",
  "code": "ERROR_CODE"
}
```

#### 7.1.2 分页格式

```typescript
{
  "success": true,
  "data": {
    "list": [],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### 7.2 核心接口

#### 7.2.1 工作台接口

```
GET    /api/dashboard/summary          # 获取工作台概览数据
GET    /api/dashboard/todos             # 获取待办事项
GET    /api/dashboard/recent            # 获取最近访问
```

#### 7.2.2 项目管理接口

```
GET    /api/projects                    # 获取项目列表
POST   /api/projects                    # 创建项目
GET    /api/projects/:id                # 获取项目详情
PUT    /api/projects/:id                # 更新项目
DELETE /api/projects/:id                # 删除项目
GET    /api/projects/:id/tasks          # 获取项目任务
POST   /api/projects/:id/tasks          # 创建任务
```

#### 7.2.3 审批中心接口（面向普通用户）

> **注意**: 审批中心接口面向普通用户，用于发起流程、查看待办、处理任务

```
# 流程实例管理（我发起的流程）
GET    /api/workflow/processes/mine             # 我发起的流程
POST   /api/workflow/processes                 # 发起新流程
GET    /api/workflow/processes/:id              # 流程详情
POST   /api/workflow/processes/:id/terminate    # 终止/撤回流程

# 任务管理（待我处理的任务）
GET    /api/workflow/tasks?assigneeId=${userId}  # 获取待我处理的任务
GET    /api/workflow/tasks/:id                  # 获取任务详情
POST   /api/workflow/tasks/:id/complete         # 完成任务（通过/拒绝）
POST   /api/workflow/tasks/:id/claim            # 认领任务
POST   /api/workflow/tasks/:id/delegate         # 委托任务
POST   /api/workflow/tasks/:id/transfer         # 转办任务

# 表单预设（快速发起流程）
GET    /api/workflow/form-presets               # 获取表单预设列表
GET    /api/workflow/form-presets/:id           # 获取表单预设详情
POST   /api/workflow/form-presets/:id/start     # 通过预设启动流程
```

#### 7.2.4 流程引擎接口（面向管理员）

> **注意**: 流程引擎接口面向管理员，用于流程定义、流程监控、管理员干预

```
# 流程定义
GET    /api/workflow/definitions        # 获取流程定义列表
POST   /api/workflow/definitions        # 创建流程定义
GET    /api/workflow/definitions/:id    # 获取流程定义详情
PUT    /api/workflow/definitions/:id    # 更新流程定义
DELETE /api/workflow/definitions/:id    # 删除流程定义

# 流程实例管理（管理员视角）
GET    /api/workflow/processes          # 获取所有流程实例
GET    /api/workflow/processes/:id      # 获取流程实例详情
POST   /api/workflow/processes/:id/terminate  # 终止流程

# 任务管理（管理员视角）
GET    /api/workflow/tasks              # 获取所有任务
GET    /api/workflow/tasks/:id          # 获取任务详情
POST   /api/workflow/tasks/:id/complete # 完成任务
POST   /api/workflow/tasks/:id/claim    # 认领任务
```

#### 7.2.5 管理员接口

```
# 流程监控（管理员）
GET    /api/admin/workflow/monitoring   # 获取实时监控数据
GET    /api/admin/workflow/statistics   # 获取流程统计

# 管理员干预
POST   /api/admin/workflow/processes/:id/jump      # 跳转到节点
POST   /api/admin/workflow/processes/:id/rollback  # 回退节点
POST   /api/admin/workflow/tasks/:id/force-complete # 强制完成
POST   /api/admin/workflow/processes/:id/force-close # 强制关闭
POST   /api/admin/workflow/tasks/:id/reassign      # 重新分配

# 用户管理（管理员）
GET    /api/admin/users                 # 获取用户列表
POST   /api/admin/users                 # 创建用户
PUT    /api/admin/users/:id             # 更新用户
DELETE /api/admin/users/:id             # 删除用户
POST   /api/admin/users/:id/reset-password  # 重置密码
```

#### 7.2.6 设备管理接口

```
# 设备台账
GET    /api/equipment                          # 设备列表
POST   /api/equipment                          # 新增设备
GET    /api/equipment/:id                      # 设备详情
PUT    /api/equipment/:id                      # 更新设备
DELETE /api/equipment/:id                      # 删除设备

# 设备型号
GET    /api/equipment/models                   # 型号列表
POST   /api/equipment/models                   # 新增型号
GET    /api/equipment/models/:id               # 型号详情
PUT    /api/equipment/models/:id               # 更新型号
DELETE /api/equipment/models/:id               # 删除型号

# 仓库管理
GET    /api/warehouses                         # 仓库列表
POST   /api/warehouses                         # 新增仓库
GET    /api/warehouses/:id                     # 仓库详情
PUT    /api/warehouses/:id                     # 更新仓库
DELETE /api/warehouses/:id                     # 删除仓库

# 库存管理
GET    /api/equipment/inventory                # 库存总览
GET    /api/equipment/inventory/alerts         # 库存告警

# 调拨转移
POST   /api/equipment/transfer                 # 发起调拨
GET    /api/equipment/transfer                 # 调拨记录
GET    /api/equipment/transfer/:id             # 调拨详情

# 归还入库
POST   /api/equipment/return                   # 发起归还
GET    /api/equipment/return                   # 归还记录
GET    /api/equipment/return/:id               # 归还详情

# 入库/出库
POST   /api/equipment/inbound                  # 入库登记
GET    /api/equipment/inbound                  # 入库记录
GET    /api/equipment/inbound/:id              # 入库详情
POST   /api/equipment/outbound                 # 出库领用
GET    /api/equipment/outbound                 # 出库记录

# 维修/报废
POST   /api/equipment/repair                   # 维修申请
GET    /api/equipment/repair                   # 维修记录
GET    /api/equipment/repair/:id               # 维修详情
POST   /api/equipment/scrap                    # 报废申请
GET    /api/equipment/scrap                    # 报废记录
GET    /api/equipment/scrap/:id                # 报废详情

# 数据溯源
GET    /api/equipment/:id/history              # 单设备操作历史
GET    /api/equipment/operation-logs           # 全部操作日志

# 智能提醒
GET    /api/equipment/alerts/calibration       # 校准到期提醒
GET    /api/equipment/alerts/stock             # 库存告警
```

#### 7.2.7 人员管理接口

```
# 员工管理
GET    /api/employees                          # 员工列表
POST   /api/employees                          # 新增员工
GET    /api/employees/:id                      # 员工详情
PUT    /api/employees/:id                      # 更新员工
DELETE /api/employees/:id                      # 删除员工

# 员工相关业务
POST   /api/employees/:id/transfer             # 调岗申请
POST   /api/employees/:id/leave                # 离职申请
POST   /api/employees/:id/regular             # 转正申请
```

#### 7.2.8 通知接口

```
# 通知管理
GET    /api/notifications                      # 通知列表
GET    /api/notifications/:id                # 通知详情
PUT    /api/notifications/:id/read            # 标记已读
PUT    /api/notifications/read-all            # 全部标记已读
DELETE /api/notifications/:id                # 删除通知
GET    /api/notifications/unread-count        # 未读数量
```

---

## 🚀 实施计划

### 8.1 开发阶段

#### 第一阶段：基础框架（已完成）
- [x] 项目初始化
- [x] 数据库设计
- [x] 基础页面搭建
- [x] 用户认证

#### 第二阶段：核心功能（已完成）
- [x] 项目管理
- [x] 人员管理
- [x] 设备管理
- [x] 基础审批流程

#### 第三阶段：流程引擎（已完成）
- [x] 统一流程模型
- [x] 流程定义管理页面
- [x] 流程设计器
- [x] 增强流程引擎
- [x] 执行日志与监控

#### 第四阶段：系统管理（已完成）
- [x] 管理员监控大屏
- [x] 管理员干预功能
- [x] 流程统计分析

#### 第五阶段：界面优化（已完成）
- [x] 界面结构调整
- [x] 导航菜单优化
- [x] 权限体系完善
- [x] 用户体验优化
- [x] 旧审批系统迁移到工作流引擎
- [x] 审批记录权限控制（用户只能看到自己的记录）

### 8.2 后续规划

#### 第六阶段：移动端适配
- [ ] 响应式布局优化
- [ ] 移动端专用界面
- [ ] 触屏交互优化
- [ ] PWA支持

#### 第七阶段：高级功能
- [ ] 报表中心
- [ ] 数据可视化
- [ ] 消息推送
- [ ] 第三方集成

---

## 📎 附录

### A. 命名规范

#### A.1 文件命名
- 页面组件: `XxxPage.tsx`
- 业务组件: `XxxComponent.tsx`
- 工具函数: `xxxUtil.ts`
- 样式文件: `xxx.module.css`

#### A.2 路由命名
- 使用小写字母和连字符
- 格式: `/module/action` 或 `/module/subject`
- 示例: `/projects/create`, `/approvals/pending`

#### A.3 API命名
- 使用RESTful风格
- 名词复数形式
- 动词使用HTTP方法表示

### B. 错误码定义

| 错误码 | 说明 |
|-------|------|
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 500 | 服务器内部错误 |

### C. 变更日志

| 版本 | 日期 | 变更内容 |
|-----|------|---------|
| v1.0 | 2026-02-01 | 初始版本 |
| v1.1 | 2026-02-20 | 新增流程引擎设计 |
| v2.0 | 2026-02-23 | 重构界面结构和权限体系 |
| v2.1 | 2026-02-23 | 移除旧审批系统，统一使用工作流引擎 |
| v2.1 | 2026-02-23 | 修复审批人解析，支持 user/department_manager/project_manager 类型 |
| v2.1 | 2026-02-23 | 修复审批记录权限控制，用户只能看到自己的审批记录 |
| v2.1 | 2026-02-23 | 新增员工管理权限控制（仅管理员可修改删除） |
| v2.1 | 2026-02-23 | 新增用户密码重置功能 |
| v2.1 | 2026-02-23 | 新增流程定义中指定用户从人员表多选功能 |
| v2.2 | 2026-02-24 | 修复入职申请岗位数据与岗位管理数据一致性问题 |
| v2.2 | 2026-02-24 | 新增岗位字段级联下拉功能（根据部门筛选岗位） |
| v2.2 | 2026-02-24 | 修复流程编辑器删除节点功能 |
| v2.2 | 2026-02-24 | 修复流程跳过无审批人节点时 current_node_id 为 null 的问题 |
| v2.2 | 2026-02-24 | 修复网关节点执行时不更新 current_node_id 的问题 |
| v2.2 | 2026-02-24 | 修复服务任务创建员工记录功能 |
| v2.2 | 2026-02-24 | 修复人员管理页面显示 ID 而不是名称的问题 |
| v2.3 | 2026-02-25 | 新增项目详情页面，展示完整项目信息 |
| v2.3 | 2026-02-25 | 新增员工详情页面，展示完整员工信息 |
| v2.3 | 2026-02-25 | 新增设备详情页面，展示完整设备信息 |
| v2.3 | 2026-02-25 | 项目列表、员工列表、设备列表支持点击名称进入详情页 |
| v2.3 | 2026-02-25 | 修复项目审批流程排他网关配置缺失问题 |
| v2.3 | 2026-02-25 | 新增流程结束后自动更新项目状态功能 |
| v2.3 | 2026-02-25 | 优化项目审批表单，移除不需要的字段 |
