import { db } from '../database/connection.js';
import { ApproverSource, Approver, ProcessContext } from '../types/workflow.js';

export class ApproverResolver {
  async resolveApprovers(
    source: ApproverSource,
    context: ProcessContext
  ): Promise<Approver[]> {
    try {
      const approvers = await this.doResolveApprovers(source, context);
      if (approvers.length > 0) {
        return approvers;
      }

      // 尝试备选审批人
      if (source.fallback) {
        return this.resolveApprovers(source.fallback, context);
      }

      return [];
    } catch (error) {
      console.error('解析审批人失败:', error);
      if (source.fallback) {
        return this.resolveApprovers(source.fallback, context);
      }
      return [];
    }
  }

  private async doResolveApprovers(
    source: ApproverSource,
    context: ProcessContext
  ): Promise<Approver[]> {
    switch (source.type) {
      case 'fixed':
      case 'user':
        return this.resolveFixed(source.value);
      
      case 'role':
        return this.resolveByRole(source.value, context);
      
      case 'department':
        return this.resolveByDepartment(source.value, context);
      
      case 'superior':
        return this.resolveSuperior(context.initiator.id, source.value);
      
      case 'department_manager':
        return this.resolveByRole('department_manager', context);
      
      case 'project_manager':
        return this.resolveByRole('project_manager', context);
      
      case 'form_field':
        return this.resolveFromFormField(source.value, context.formData);
      
      case 'expression':
        return this.resolveByExpression(source.value, context);
      
      case 'previous_handler':
        return this.resolvePreviousHandler(context);
      
      case 'initiator':
        return [context.initiator];
      
      default:
        return [];
    }
  }

  private async resolveFixed(value: string | string[]): Promise<Approver[]> {
    const userIds = Array.isArray(value) ? value : [value];
    const approvers: Approver[] = [];

    for (const userId of userIds) {
      const user = await this.getUserInfo(userId);
      if (user) {
        approvers.push(user);
      }
      // 如果数据库中找不到用户，不添加默认审批人
      // 这样可以支持"无审批人时跳过"的场景
    }

    return approvers;
  }

  private async resolveByRole(value: string | string[], context: ProcessContext): Promise<Approver[]> {
    const roles = Array.isArray(value) ? value : [value];
    const approvers: Approver[] = [];

    for (const role of roles) {
      const users = await this.getUsersByRole(role);
      approvers.push(...users);
    }

    return approvers;
  }

  private async resolveByDepartment(value: string | string[], context: ProcessContext): Promise<Approver[]> {
    const departments = Array.isArray(value) ? value : [value];
    const approvers: Approver[] = [];

    for (const department of departments) {
      const users = await this.getUsersByDepartment(department);
      approvers.push(...users);
    }

    return approvers;
  }

  private async resolveSuperior(userId: string, level: string): Promise<Approver[]> {
    // 这里简化处理，实际应该根据职级层级获取
    // 例如，level为"direct"获取直接上级，"second"获取间接上级
    const user = await this.getUserInfo(userId);
    if (!user) {
      return [];
    }

    // 如果level是"department"，获取用户所在部门的经理
    if (level === 'department') {
      // 从departments表获取部门经理
      const dept = await db.queryOne<any>(
        `SELECT manager_id, manager_name FROM departments WHERE id = ?`,
        [user.department]
      );
      
      if (dept && dept.manager_id) {
        return [{
          id: dept.manager_id,
          name: dept.manager_name,
          department: user.department,
          position: 'department_manager'
        }];
      }
      
      // 如果部门没有配置经理，尝试查找该部门有管理角色的员工
      const managers = await db.query<any>(
        `SELECT id, name, department_id, position FROM employees 
         WHERE department_id = ? AND status = 'active' 
         AND (role = 'department_manager' OR position LIKE '%经理%' OR position LIKE '%总监%')
         LIMIT 1`,
        [user.department]
      );
      
      if (managers && managers.length > 0) {
        return managers.map((row: any) => ({
          id: row.id,
          name: row.name,
          department: row.department_id,
          position: row.position
        }));
      }
      
      return [];
    }

    // 假设我们有一个employee_hierarchy表存储层级关系
    const rows = await db.query<any>(
      `SELECT id, name, department_id, position FROM employees WHERE department_id = ? AND position IN ('manager', 'director')`,
      [user.department]
    );

    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      department: row.department_id,
      position: row.position
    }));
  }

  private async resolveFromFormField(value: string | string[], formData: Record<string, any>): Promise<Approver[]> {
    const fields = Array.isArray(value) ? value : [value];
    const approvers: Approver[] = [];

    for (const field of fields) {
      const userId = this.getFormFieldValue(formData, field);
      if (userId) {
        const user = await this.getUserInfo(userId);
        if (user) {
          approvers.push(user);
        }
      }
    }

    return approvers;
  }

  private async resolveByExpression(value: string, context: ProcessContext): Promise<Approver[]> {
    try {
      console.log('[ApproverResolver] 解析表达式:', value);
      console.log('[ApproverResolver] context.formData:', context.formData);
      
      // 支持简单表达式，如 "${formData.managerId}" 或 "${variables.departmentHead}"
      const expression = value.replace(/\$\{(.*?)\}/g, (_, expr) => {
        const parts = expr.split('.');
        let current: any = {
          formData: context.formData,
          variables: context.variables,
          initiator: context.initiator
        };

        for (const part of parts) {
          if (current && typeof current === 'object') {
            current = current[part];
          } else {
            return '';
          }
        }

        return current || '';
      });

      console.log('[ApproverResolver] 解析后的表达式值:', expression);
      
      // 表达式可能返回单个ID或ID数组
      if (expression) {
        // 检查是否是部门ID（以dept-开头或者是部门ID格式）
        if (value.includes('department_id') || this.isDepartmentId(expression)) {
          // 根据部门ID获取部门经理
          return this.resolveDepartmentManager(expression);
        }
        
        if (expression.includes(',')) {
          const userIds = expression.split(',').map((id: string) => id.trim());
          return this.resolveFixed(userIds);
        } else {
          // 先尝试作为用户ID查找
          const user = await this.getUserInfo(expression);
          if (user) {
            return [user];
          }
          // 如果不是用户ID，尝试作为部门ID获取部门经理
          return this.resolveDepartmentManager(expression);
        }
      }

      return [];
    } catch (error) {
      console.error('解析表达式失败:', error);
      return [];
    }
  }

  /**
   * 检查是否是部门ID
   */
  private isDepartmentId(id: string): boolean {
    return id.startsWith('dept-') || id.startsWith('department-');
  }

  /**
   * 根据部门ID获取部门经理
   */
  private async resolveDepartmentManager(departmentId: string): Promise<Approver[]> {
    if (!departmentId) {
      return [];
    }

    try {
      // 从departments表获取部门经理
      const dept = await db.queryOne<any>(
        `SELECT manager_id, manager_name FROM departments WHERE id = ? AND status = 'active'`,
        [departmentId]
      );
      
      if (dept && dept.manager_id) {
        return [{
          id: dept.manager_id,
          name: dept.manager_name,
          department: departmentId,
          position: 'department_manager'
        }];
      }
      
      // 如果部门没有配置经理，尝试查找该部门有管理角色的员工
      const managers = await db.query<any>(
        `SELECT id, name, department_id, position FROM employees 
         WHERE department_id = ? AND status = 'active' 
         AND (role = 'department_manager' OR position LIKE '%经理%' OR position LIKE '%总监%')
         LIMIT 1`,
        [departmentId]
      );
      
      if (managers && managers.length > 0) {
        return managers.map((row: any) => ({
          id: row.id,
          name: row.name,
          department: row.department_id,
          position: row.position
        }));
      }
      
      return [];
    } catch (error) {
      console.error('获取部门经理失败:', error);
      return [];
    }
  }

  private async resolvePreviousHandler(context: ProcessContext): Promise<Approver[]> {
    if (!context.currentTask) {
      return [];
    }

    // 查询前一个任务的处理人
    const rows = await db.query<any>(
      `SELECT DISTINCT assignee_id, assignee_name FROM workflow_tasks 
       WHERE instance_id = ? AND id != ? AND assignee_id IS NOT NULL
       ORDER BY completed_at DESC LIMIT 1`,
      [context.process.id, context.currentTask.id]
    );

    return rows.map((row: any) => ({
      id: row.assignee_id,
      name: row.assignee_name
    }));
  }

  private async getUserInfo(userId: string): Promise<Approver | null> {
    // 先尝试作为用户ID查询
    let row = await db.queryOne<any>(
      `SELECT u.id as user_id, e.id as employee_id, e.name, e.department_id, e.position 
       FROM users u
       LEFT JOIN employees e ON u.id = e.user_id
       WHERE u.id = ?`,
      [userId]
    );

    // 如果找到用户关联的员工，返回员工信息，但使用user_id作为审批人ID（与前端userId匹配）
    if (row && row.employee_id) {
      return {
        id: row.user_id,
        name: row.name,
        department: row.department_id,
        position: row.position
      };
    }

    // 如果没有找到，尝试作为员工ID查询
    row = await db.queryOne<any>(
      `SELECT id, name, department_id, position, user_id FROM employees WHERE id = ?`,
      [userId]
    );

    if (!row) {
      return null;
    }

    // 返回员工信息，使用user_id作为审批人ID（与前端userId匹配）
    if (row.user_id) {
      return {
        id: row.user_id,
        name: row.name,
        department: row.department_id,
        position: row.position
      };
    }

    // 如果没有user_id，使用employee_id
    return {
      id: row.id,
      name: row.name,
      department: row.department_id,
      position: row.position
    };
  }

  private async getUsersByRole(role: string): Promise<Approver[]> {
    const rows = await db.query<any>(
      `SELECT u.id as user_id, e.id, e.name, e.department_id, e.position 
       FROM users u
       JOIN employees e ON u.id = e.user_id
       WHERE u.role = ? AND e.status = 'active'`,
      [role]
    );

    return rows.map((row: any) => ({
      id: row.user_id,
      name: row.name,
      department: row.department_id,
      position: row.position
    }));
  }

  private async getUsersByDepartment(department: string): Promise<Approver[]> {
    const rows = await db.query<any>(
      `SELECT u.id as user_id, e.id, e.name, e.department_id, e.position 
       FROM employees e
       LEFT JOIN users u ON e.user_id = u.id
       WHERE e.department_id = ? AND e.status = 'active'`,
      [department]
    );

    return rows.map((row: any) => ({
      id: row.user_id || row.id,
      name: row.name,
      department: row.department_id,
      position: row.position
    }));
  }

  private getFormFieldValue(formData: Record<string, any>, fieldPath: string): string | null {
    const parts = fieldPath.split('.');
    let current = formData;

    for (const part of parts) {
      if (current && typeof current === 'object') {
        current = current[part];
      } else {
        return null;
      }
    }

    return current as string || null;
  }
}

export const approverResolver = new ApproverResolver();
