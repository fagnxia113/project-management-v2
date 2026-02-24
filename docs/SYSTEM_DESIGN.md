# 项目管理系统 v2 - 系统设计文档

## 📋 文档说明

**文档版本**: v2.0  
**最后更新**: 2026-02-23  
**维护方式**: 所有系统变更必须先更新此文档，再进行代码修改

**v2.0 更新内容：**
- 全面重构界面导航结构，优化用户体验
- 重新定义功能模块分布，逻辑更清晰
- 明确双角色权限体系（系统管理员/普通员工）
- 统一命名规范，提升可读性
- 优化审批流程与数字化工厂的整合

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
│     ├── 入库登记 /equipment/inbound                         │
│     ├── 出库领用 /equipment/outbound                        │
│     ├── 调拨转移 /equipment/transfer                        │
│     ├── 归还入库 /equipment/return                          │
│     └── 维修报废 /equipment/repair                          │
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
| 设备管理 | 入库登记 | 登记设备入库 |
| 设备管理 | 出库领用 | 设备出库领用 |
| 设备管理 | 调拨转移 | 设备调拨操作 |
| 设备管理 | 归还入库 | 设备归还操作 |
| 设备管理 | 维修报废 | 维修和报废管理 |
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
| **设备管理** | 入库/出库 | ✅ | ✅ 申请 |
| **设备管理** | 调拨/归还 | ✅ | ✅ 申请 |
| **设备管理** | 维修/报废 | ✅ | ✅ 申请 |
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
│   ├── 项目概览
│   ├── 任务列表
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
设备资产全生命周期管理，从入库到报废的完整追踪

#### 4.5.2 页面结构
```
设备管理
├── 设备台账 (/equipment)
│   ├── 设备列表
│   ├── 设备详情
│   ├── 筛选搜索
│   └── 统计报表
├── 入库登记 (/equipment/inbound)
│   ├── 入库申请
│   ├── 扫码入库
│   └── 审批流程
├── 出库领用 (/equipment/outbound)
│   ├── 领用申请
│   └── 审批流程
├── 调拨转移 (/equipment/transfer)
│   ├── 调拨申请
│   └── 审批流程
├── 归还入库 (/equipment/return)
│   ├── 归还申请
│   └── 审批流程
└── 维修报废 (/equipment/repair)
    ├── 维修申请
    ├── 报废申请
    └── 审批流程
```

#### 4.5.3 权限说明
- **查看台账**: 所有员工可查看
- **入库登记**: 管理员直接登记，员工需申请审批
- **出库/调拨/归还**: 员工发起申请，管理员审批

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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 设备表
CREATE TABLE equipment (
  id VARCHAR(36) PRIMARY KEY,
  model_id VARCHAR(36),
  serial_number VARCHAR(100),
  manage_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200),
  category ENUM('instrument', 'fake_load'),
  health_status ENUM('normal', 'slightly_damaged', 'severely_damaged', 'scrapped') DEFAULT 'normal',
  usage_status ENUM('idle', 'in_use', 'repairing', 'scrapped') DEFAULT 'idle',
  location_status ENUM('warehouse', 'in_project', 'repair_shop') DEFAULT 'warehouse',
  location_id VARCHAR(36),
  keeper_id VARCHAR(36),
  calibration_expiry DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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

#### 7.2.3 审批中心接口（已迁移至工作流引擎）

> **注意**: 旧版 `/api/approvals` 接口已废弃，统一使用工作流引擎API

```
# 流程实例管理（替代旧版审批接口）
GET    /api/workflow/processes?initiatorId=${userId}    # 获取我的申请（已发起）
POST   /api/workflow/processes                          # 发起新流程
GET    /api/workflow/processes/:id                      # 获取流程详情
POST   /api/workflow/processes/:id/terminate            # 终止流程

# 任务管理（待办审批）
GET    /api/workflow/tasks?assigneeId=${userId}         # 获取待我处理的任务
GET    /api/workflow/tasks/:id                          # 获取任务详情
POST   /api/workflow/tasks/:id/complete                 # 完成任务（通过/拒绝）
POST   /api/workflow/tasks/:id/claim                    # 认领任务
POST   /api/workflow/tasks/:id/delegate                 # 委托任务
POST   /api/workflow/tasks/:id/transfer                 # 转办任务

# 表单预设（快速发起流程）
GET    /api/workflow/form-presets                       # 获取表单预设列表
GET    /api/workflow/form-presets/:id                   # 获取表单预设详情
POST   /api/workflow/form-presets/:id/start             # 通过预设启动流程
```

#### 7.2.4 流程引擎接口

```
# 流程定义
GET    /api/workflow/definitions        # 获取流程定义列表
POST   /api/workflow/definitions        # 创建流程定义
GET    /api/workflow/definitions/:id    # 获取流程定义详情
PUT    /api/workflow/definitions/:id    # 更新流程定义
DELETE /api/workflow/definitions/:id    # 删除流程定义

# 流程实例
POST   /api/workflow/process/start      # 启动流程
GET    /api/workflow/instances          # 获取流程实例列表
GET    /api/workflow/instances/:id      # 获取流程实例详情
POST   /api/workflow/instances/:id/terminate  # 终止流程

# 任务管理
GET    /api/workflow/tasks              # 获取任务列表
GET    /api/workflow/tasks/:id          # 获取任务详情
POST   /api/workflow/tasks/:id/complete # 完成任务
POST   /api/workflow/tasks/:id/claim    # 认领任务
```

#### 7.2.5 管理员接口

```
# 流程监控（管理员）
GET    /api/admin/workflow/monitoring   # 获取实时监控数据
GET    /api/admin/workflow/statistics   # 获取流程统计
GET    /api/admin/workflow/instances    # 获取所有流程实例

# 管理员干预
POST   /api/admin/workflow/instances/:id/jump      # 跳转到节点
POST   /api/admin/workflow/instances/:id/rollback  # 回退节点
POST   /api/admin/workflow/tasks/:id/force-complete # 强制完成
POST   /api/admin/workflow/instances/:id/force-close # 强制关闭
POST   /api/admin/workflow/tasks/:id/reassign      # 重新分配

# 用户管理（管理员）
GET    /api/admin/users                 # 获取用户列表
POST   /api/admin/users                 # 创建用户
PUT    /api/admin/users/:id             # 更新用户
DELETE /api/admin/users/:id             # 删除用户
POST   /api/admin/users/:id/reset-password  # 重置密码
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
