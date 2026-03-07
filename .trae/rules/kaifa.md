# 项目开发规范和规则

## 1. 优先使用前端界面查看

**规则**：遇到需要查看数据、测试功能的情况时，优先从前端界面查看，而不是写脚本查询数据库。

**原因**：
- 更直观地看到用户实际看到的效果
- 避免因数据库查询结果与前端显示不一致导致的误解
- 提高调试效率

**示例**：
- ❌ 不要：写脚本查询数据库中的流程任务
- ✅ 应该：直接访问前端"待我处理"页面查看任务列表

## 2. 设备管理员角色规则

**规则**：设备管理员不是固定的角色，而是根据设备所在位置动态决定的。

**实现方式**：
- 如果设备在仓库，审批人是仓库管理员
- 如果设备在项目，审批人是项目经理

**代码实现**：
```typescript
// ApproverResolver.ts
case 'warehouse_manager':
  return this.resolveWarehouseManager(context);

case 'project_manager':
  return this.resolveByRole('project_manager', context);
```

**前端表单**：
- 需要在表单中包含`location_manager_id`字段
- 该字段值根据用户选择的位置动态填充

## 3. 工作流程审批人配置

**规则**：使用`type: 'field'`从表单字段中获取审批人，通过`location_manager_id`字段动态确定审批人。

**配置示例**：
```json
{
  "approvalConfig": {
    "approverSource": {
      "type": "field",
      "value": "location_manager_id"
    }
  }
}
```

**注意事项**：
- 确保表单数据中包含`location_manager_id`字段
- 该字段值必须是有效的用户ID

## 4. 数据库表结构管理

**规则**：遇到字段缺失错误时，需要检查表结构并添加缺失字段。

**处理步骤**：
1. 检查错误信息，确认缺失的字段名
2. 使用`SHOW COLUMNS FROM table_name`查看表结构
3. 使用`ALTER TABLE`语句添加缺失字段

**示例**：
```typescript
// 添加缺失字段
await db.execute(
  `ALTER TABLE equipment_repair_orders 
   ADD COLUMN repair_quantity INT COMMENT '维修数量'`
);
```

**常见字段**：
- `repair_quantity`: 维修数量
- `original_location_type`: 原始位置类型
- `original_location_id`: 原始位置ID
- `repair_service_provider`: 维修服务商

## 5. 流程定义ID管理

**规则**：确保代码中使用的流程定义ID与数据库中的实际ID一致。

**验证步骤**：
1. 查询数据库中的流程定义
2. 确认ID格式和命名规则
3. 更新代码中的流程定义ID

**示例**：
```typescript
// 正确的流程定义ID
definitionId: 'wf-equipment-repair-1'

// 错误的流程定义ID
definitionId: 'wf-equipment-repair-001'
```

## 6. 调试日志的重要性

**规则**：在关键方法中添加调试日志，帮助排查问题。

**需要添加日志的关键方法**：
- 审批人解析方法（ApproverResolver）
- 流程创建方法（InstanceService）
- 流程任务创建方法（TaskService）
- 表单数据处理方法（ProcessFormIntegrationService）

**日志示例**：
```typescript
console.log('[ApproverResolver] resolveFromFormField 开始解析表单字段', { value, formData });
console.log('[ApproverResolver] resolveFromFormField 解析字段:', field);
console.log('[ApproverResolver] resolveFromFormField 获取到用户ID:', userId);
console.log('[ApproverResolver] resolveFromFormField getUserInfo 返回:', user);
console.log('[ApproverResolver] resolveFromFormField 最终返回:', approvers);
```

## 7. 表单字段映射

**规则**：确保前端表单字段与后端处理的字段名称一致。

**关键字段**：
- `location_manager_id`: 位置管理员ID（用于动态审批人）
- `equipment_data`: 设备数据数组
- `original_location_type`: 原始位置类型（warehouse/project）
- `original_location_id`: 原始位置ID
- `fault_description`: 故障描述
- `repair_service_provider`: 维修服务商

**前端表单示例**：
```typescript
const formData = {
  equipment_data: [
    {
      equipment_id: 'xxx',
      equipment_name: 'xxx',
      equipment_category: 'xxx',
      repair_quantity: 10
    }
  ],
  original_location_type: 'project',
  original_location_id: 'xxx',
  location_manager_id: 'xxx',  // 动态填充
  fault_description: 'xxx',
  repair_service_provider: null
};
```

## 8. 错误处理和恢复

**规则**：遇到服务启动失败时，检查端口占用情况并清理。

**处理步骤**：
1. 检查端口占用：`netstat -ano | findstr :8081`
2. 终止占用进程：`taskkill /F /PID <PID>`
3. 重新启动服务

**常见错误**：
- `EADDRINUSE`: 端口已被占用
- `ER_BAD_FIELD_ERROR`: 数据库字段不存在
- `Unknown column 'xxx' in 'field list'`: 字段缺失

## 9. 前端路由配置

**规则**：确保审批中心的预设路由指向正确的表单页面。

**配置示例**：
```typescript
const presetRoutes: Record<string, string> = {
  'preset-equipment-transfer': '/equipment/transfers/create',
  'preset-equipment-repair': '/equipment/repairs/create',
};
```

**注意事项**：
- 避免表单重复，删除未使用的表单
- 确保路由路径与实际页面路径一致

## 10. 用户角色和权限

**规则**：用户角色和权限必须通过员工记录关联。

**要求**：
- 每个用户必须有对应的员工记录
- 员工记录包含部门、职位等信息
- 审批人解析依赖员工记录中的职位信息

**示例**：
```sql
-- 创建员工记录
INSERT INTO employees (id, user_id, name, department_id, position, status)
VALUES ('xxx', 'xxx', 'xxx', 'xxx', '项目经理', 'active');
```

## 11. 流程任务状态管理

**规则**：流程任务状态必须正确反映当前审批状态。

**任务状态**：
- `created`: 已创建
- `assigned`: 已分配
- `in_progress`: 进行中
- `completed`: 已完成
- `cancelled`: 已取消

**审批结果**：
- `approved`: 已通过
- `rejected`: 已驳回
- `withdrawn`: 已撤回
- `delegated`: 已委托
- `transferred`: 已转交
- `skipped`: 已跳过

## 12. 设备状态管理

**规则**：设备状态必须根据业务流程正确更新。

**状态流转**：
- `normal` → `repairing`: 设备维修申请通过后
- `repairing` → `normal`: 设备维修完成收货后
- `normal` → `transferring`: 设备调拨申请通过后
- `transferring` → `normal`: 设备调拨完成收货后

**更新时机**：
- 发货完成：设备状态变为维修中
- 收货完成：设备状态恢复为正常
