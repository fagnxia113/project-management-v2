# 组织架构与人事模块 (Org & HR) - 详细设计

## 1. 业务概述
组织人事模块是系统的底座，提供用户身份认证、多级部门管理及员工全生命周期（入职、调拔、离职）追踪。

## 2. 关键功能设计

### 2.1 与企业微信 (WeCom) 的深度集成
- **数据同步**: `WeChatWorkAdapter` 实现了部门与成员的单向同步（企微 -> 系统）。
- **字段映射**: 自动映射企微的 `userid`, `mobile`, `email`, `position`。
- **身份一致性**: 系统内部 `user_id` 与企微 `userid` 关联，确保消息推送和免登逻辑。

### 2.2 部门管理
- **分级模型**: `departments` 表支持无限层级。
- **负责人制**: 每个部门显式关联一位 `manager_id`，作为审批流解析的锚点。

### 2.3 员工全生命周期管理
系统通过特定的审批流程驱动员工状态变更：
1. **入职申请 (Onboarding)**: 申请通过后，系统自动在 `employees` 表创建记录，并发放 `employee_no`。
2. **职位/部门调拔 (Transfer)**: 异动流程通过后，自动更新员工的 `department_id` 和 `position`。
3. **离职流程 (Offboarding)**: 包含资产交接（关联设备模块）和权限停用。

## 3. 数据库模型 (Prisma)
- **`employees`**: 存储档案、成本中心代码、角色标签。
- **`departments`**: 存储层级路径、负责人。
- **`positions`**: 关联标准职位。
- **`employee_onboard_orders` / `employee_offboard_orders`**: 记录异动详情。

## 4. 核心逻辑实现
- **`DepartmentServiceV2`**: 处理部门树的递归查询。
- **`ThirdPartyService`**: 处理多平台同步（不仅限于企微，预留了飞书/钉钉扩展）。
- **`UserServiceV2`**: 处理系统用户与员工档案的 1:1 或 1:N 映射关系。

## 5. 前端核心组件
- **`OrgTree`**: 组织架构树展示。
- **`EmployeeSelector`**: 带有部门过滤的高级联选组件。
- **`EntryExitTimeline`**: 员工职业生涯时间轴展示。
