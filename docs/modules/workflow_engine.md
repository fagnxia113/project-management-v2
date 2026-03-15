# 工作流引擎与表单服务 - 详细设计

## 1. 系统架构
系统采用“增强型工作流引擎 + 统一表单服务”的模式，实现业务流程与表单展示的高度自动化。

## 2. 增强型工作流引擎 (EnhancedWorkflowEngine)

### 2.1 节点逻辑
- **用户任务 (UserTask)**: 核心审批环节。
- **排他网关 (ExclusiveGateway)**: 支持规则表达式。通过 `GatewayHandler` 解析 `formData` 中的变量来决定分支路径。
- **并行/包容网关**: 实现多线并行处理与汇合。

### 2.2 审批人解析 (ApproverResolver)
解析器支持极其灵活的审批人定义：
- **组织架构关联**: `superior` (直属上级), `department_manager` (部门负责人)。
- **业务对象关联**: `project_manager` (当前表单关联项目的 PM), `warehouse_manager` (关联仓库的管理员)。
- **动态解析**: 支持 `field` (表单中某个字段选中的人) 和 `expression` (计算得到的 ID)。
- **备选方案 (Fallback)**: 当主解析器未找到人时，自动走备选方案或跳过（取决于配置）。

### 2.3 会签与投票逻辑
- **或签**: 一人通过，任务即结束。
- **会签 (And Sign)**: 所有人通过才行。
- **投票 (Vote)**: 设置通过阈值（如 > 50%）。

## 3. 统一表单服务 (UnifiedFormService)

### 3.1 核心数据结构
- **`UnifiedFormField`**: 定义字段类型、校验规则、动态选项、联动显隐（`visibleOn`）。
- **`UnifiedFormTemplate`**: 关联业务模块、版本号、对应的流程定义 ID。

### 3.2 动态选项联动 (Dynamic Linkage)
- 支持从 API 异步加载选项（如选择部门后，员工列表自动过滤）。
- 与后端元数据 (`EntityMeta.json`) 深度对齐。

## 4. 关键技术细节
- **状态持久化**: 在 `approvals` 和 `workflow_tasks` 中记录所有操作痕迹。
- **缓存机制**: 流程定义和审批人解析结果在引擎内部使用多级缓存，提高并发性能。
- **同步集成**: 任务创建后可触发企业微信消息推送。

## 5. 核心 API
- `POST /api/workflow/start`: 启动流程。
- `POST /api/workflow/complete`: 完成任务。
- `GET /api/forms/render/:templateKey`: 获取 Formily 兼容的表单架构。
