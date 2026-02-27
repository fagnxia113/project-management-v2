import { db } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowTask, CompleteTaskParams, DelegateTaskParams, TransferTaskParams } from '../types/workflow.js';
import { instanceService } from './InstanceService.js';

export class TaskService {
  async createTask(params: {
    instanceId: string;
    executionId?: string;
    nodeId: string;
    taskDefKey?: string;
    name: string;
    description?: string;
    assigneeId?: string;
    assigneeName?: string;
    candidateUsers?: string[];
    candidateGroups?: string[];
    priority?: number;
    dueDate?: Date;
    variables?: Record<string, any>;
    approvalMode?: 'or_sign' | 'and_sign' | 'sequential' | 'vote';
    voteThreshold?: number;
  }): Promise<WorkflowTask> {
    const id = uuidv4();
    const task: WorkflowTask = {
      id,
      instance_id: params.instanceId,
      execution_id: params.executionId,
      node_id: params.nodeId,
      task_def_key: params.taskDefKey,
      name: params.name,
      description: params.description,
      assignee_id: params.assigneeId,
      assignee_name: params.assigneeName,
      candidate_users: params.candidateUsers,
      candidate_groups: params.candidateGroups,
      priority: params.priority || 50,
      due_date: params.dueDate,
      variables: params.variables || {},
      status: params.assigneeId ? 'assigned' : 'created',
      created_at: new Date()
    };

    await db.insert(
      `INSERT INTO workflow_tasks (
        id, instance_id, execution_id, node_id, task_def_key, 
        name, description, assignee_id, assignee_name, 
        candidate_users, candidate_groups, priority, due_date, claim_time,
        variables, status, approval_mode, vote_threshold, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        task.instance_id,
        task.execution_id ?? null,
        task.node_id,
        task.task_def_key ?? null,
        task.name,
        task.description ?? null,
        task.assignee_id ?? null,
        task.assignee_name ?? null,
        task.candidate_users ?? [],
        task.candidate_groups ?? [],
        task.priority,
        task.due_date ?? null,
        null,
        task.variables ?? {},
        task.status,
        'or_sign',
        1,
        task.created_at
      ]
    );

    await this.recordTaskHistory(task.id, {
      action: 'create',
      operator: { id: 'system', name: '系统' }
    }, task.instance_id, task.node_id);

    return task;
  }

  async getTask(id: string): Promise<WorkflowTask | null> {
    const row = await db.queryOne<any>(
      `SELECT * FROM workflow_tasks WHERE id = ?`,
      [id]
    );

    if (!row) {
      return null;
    }

    return this.parseTaskRow(row);
  }

  async getTasksByInstance(instanceId: string, status?: string[]): Promise<WorkflowTask[]> {
    let whereClause = 't.instance_id = ?';
    const params = [instanceId];

    if (status && status.length > 0) {
      whereClause += ` AND t.status IN (${status.map(() => '?').join(', ')})`;
      params.push(...status);
    }

    const rows = await db.query<any>(
      `SELECT t.*, i.title as process_title, i.definition_key, i.initiator_id, i.initiator_name,
              e.user_id as assignee_user_id
       FROM workflow_tasks t
       LEFT JOIN workflow_instances i ON t.instance_id = i.id
       LEFT JOIN employees e ON t.assignee_id = e.id
       WHERE ${whereClause}
       ORDER BY t.created_at DESC`,
      params
    );

    return rows.map((row: any) => {
      const task = this.parseTaskRow(row);
      // 如果 assignee_id 是 employee_id，则使用关联的 user_id
      if (row.assignee_user_id) {
        task.assignee_id = row.assignee_user_id;
      }
      return task;
    });
  }

  async getTasksByAssignee(assigneeId: string, status?: string[]): Promise<WorkflowTask[]> {
    // 查询用户关联的员工ID
    const employees = await db.query<any>(
      'SELECT id FROM employees WHERE user_id = ?',
      [assigneeId]
    );
    const employeeIds = employees.map((e: any) => e.id);
    
    // 构建查询条件：通过employees表的user_id字段关联
    // 任务表的assignee_id可能是user_id或employee_id
    let whereClause = '(t.assignee_id = ?';
    const params: any[] = [assigneeId];
    
    if (employeeIds.length > 0) {
      whereClause += ` OR t.assignee_id IN (${employeeIds.map(() => '?').join(', ')})`;
      params.push(...employeeIds);
    }
    whereClause += ')';

    if (status && status.length > 0) {
      whereClause += ` AND t.status IN (${status.map(() => '?').join(', ')})`;
      params.push(...status);
    }

    // 获取部门和职位名称映射
    const departments = await db.query<any>('SELECT id, name FROM departments');
    const positions = await db.query<any>('SELECT id, name FROM positions');
    const deptMap = Object.fromEntries(departments.map((d: any) => [d.id, d.name]));
    const posMap = Object.fromEntries(positions.map((p: any) => [p.id, p.name]));

    const rows = await db.query<any>(
      `SELECT t.*, i.title as process_title, i.definition_key, i.initiator_id, i.initiator_name, 
              i.variables as instance_variables, d.node_config as definition_node_config
       FROM workflow_tasks t
       JOIN workflow_instances i ON t.instance_id = i.id
       JOIN workflow_definitions d ON i.definition_id = d.id
       WHERE ${whereClause} 
       ORDER BY t.created_at DESC`,
      params
    );

    return rows.map((row: any) => {
      const task = this.parseTaskRow(row);
      // 合并流程实例的表单数据到任务变量中
      let instanceVars = {};
      if (row.instance_variables) {
        try {
          instanceVars = typeof row.instance_variables === 'string' 
            ? JSON.parse(row.instance_variables) 
            : row.instance_variables;
        } catch {
          instanceVars = {};
        }
      }
      
      // 解析节点配置，获取字段权限
      let fieldPermissions = null;
      if (row.definition_node_config) {
        try {
          const nodeConfig = typeof row.definition_node_config === 'string'
            ? JSON.parse(row.definition_node_config)
            : row.definition_node_config;
          const currentNode = nodeConfig.nodes?.find((n: any) => n.id === task.node_id);
          if (currentNode?.config?.approvalConfig?.formConfig?.fieldPermissions) {
            fieldPermissions = currentNode.config.approvalConfig.formConfig.fieldPermissions;
          }
        } catch {
          fieldPermissions = null;
        }
      }
      
      // 获取表单数据并转换ID为名称
      const formData = instanceVars.formData || task.variables?.formData || {};
      const enrichedFormData = {
        ...formData,
        _deptMap: deptMap,
        _posMap: posMap
      };
      
      return {
        ...task,
        process_title: row.process_title,
        definition_key: row.definition_key,
        initiator_id: row.initiator_id,
        initiator_name: row.initiator_name,
        field_permissions: fieldPermissions,
        variables: {
          ...task.variables,
          formData: enrichedFormData
        }
      };
    });
  }

  async completeTask(taskId: string, params: CompleteTaskParams): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    if (task.status !== 'assigned' && task.status !== 'in_progress') {
      throw new Error('任务状态不允许完成');
    }

    const now = new Date();
    const duration = task.started_at ? Math.floor((now.getTime() - task.started_at.getTime()) / 1000) : null;

    await db.update(
      `UPDATE workflow_tasks SET 
        status = 'completed', 
        result = ?, 
        comment = ?, 
        completed_at = ?, 
        duration = ? 
      WHERE id = ?`,
      [params.action, params.comment, now, duration, taskId]
    );

    // 记录任务完成历史
    await this.recordTaskHistory(taskId, {
      action: 'complete',
      operator: params.operator,
      comment: params.comment,
      result: params.action,
      formData: params.formData
    }, task.instance_id, task.node_id);

    // 更新流程变量，合并表单数据
    let variablesToUpdate = params.variables || {};
    
    // 如果有表单数据，合并到formData中
    if (params.formData) {
      const instance = await instanceService.getInstance(task.instance_id);
      const currentFormData = instance.variables?.formData || {};
      const mergedFormData = {
        ...currentFormData,
        ...params.formData
      };
      
      console.log('Merging form data:', {
        current: currentFormData,
        new: params.formData,
        merged: mergedFormData
      });
      
      variablesToUpdate.formData = mergedFormData;
    }
    
    if (Object.keys(variablesToUpdate).length > 0) {
      await instanceService.updateVariables(task.instance_id, variablesToUpdate);
    }
  }

  async claimTask(taskId: string, userId: string, userName: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    if (task.status !== 'created') {
      throw new Error('任务状态不允许认领');
    }

    await db.update(
      `UPDATE workflow_tasks SET 
        status = 'assigned', 
        assignee_id = ?, 
        assignee_name = ?, 
        claim_time = ? 
      WHERE id = ?`,
      [userId, userName, new Date(), taskId]
    );

    // 记录任务认领历史
    await this.recordTaskHistory(taskId, {
      action: 'claim',
      operator: { id: userId, name: userName }
    }, task.instance_id, task.node_id);
  }

  async startTask(taskId: string, userId: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    if (task.status !== 'assigned') {
      throw new Error('任务状态不允许开始');
    }

    if (task.assignee_id !== userId) {
      throw new Error('非任务处理人');
    }

    await db.update(
      `UPDATE workflow_tasks SET 
        status = 'in_progress', 
        started_at = ? 
      WHERE id = ?`,
      [new Date(), taskId]
    );
  }

  async delegateTask(taskId: string, params: DelegateTaskParams): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    await db.update(
      `UPDATE workflow_tasks SET 
        assignee_id = ?, 
        assignee_name = ?, 
        status = 'assigned' 
      WHERE id = ?`,
      [params.targetUser.id, params.targetUser.name, taskId]
    );

    // 记录任务委托历史
    await this.recordTaskHistory(taskId, {
      action: 'delegate',
      operator: params.operator,
      targetUser: params.targetUser,
      comment: params.comment
    }, task.instance_id, task.node_id);
  }

  async transferTask(taskId: string, params: TransferTaskParams): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    await db.update(
      `UPDATE workflow_tasks SET 
        assignee_id = ?, 
        assignee_name = ?, 
        status = 'assigned' 
      WHERE id = ?`,
      [params.targetUser.id, params.targetUser.name, taskId]
    );

    // 记录任务转办历史
    await this.recordTaskHistory(taskId, {
      action: 'transfer',
      operator: params.operator,
      targetUser: params.targetUser,
      comment: params.comment
    }, task.instance_id, task.node_id);
  }

  async withdrawTask(taskId: string, userId: string, userName: string, comment?: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    await db.update(
      `UPDATE workflow_tasks SET 
        status = 'completed', 
        result = 'withdrawn', 
        comment = ?, 
        completed_at = ? 
      WHERE id = ?`,
      [comment, new Date(), taskId]
    );

    // 记录任务撤回历史
    await this.recordTaskHistory(taskId, {
      action: 'withdraw',
      operator: { id: userId, name: userName },
      comment
    }, task.instance_id, task.node_id);
  }

  async cancelTask(taskId: string, reason?: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    await db.update(
      `UPDATE workflow_tasks SET 
        status = 'cancelled', 
        completed_at = ?, 
        comment = ? 
      WHERE id = ?`,
      [new Date(), reason, taskId]
    );

    // 记录任务取消历史
    await this.recordTaskHistory(taskId, {
      action: 'cancel',
      operator: { id: 'system', name: '系统' },
      comment: reason
    }, task.instance_id, task.node_id);
  }

  async reassignTask(taskId: string, newAssignee: { id: string; name: string }): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    await db.update(
      `UPDATE workflow_tasks SET 
        assignee_id = ?, 
        assignee_name = ?, 
        status = 'assigned',
        claim_time = NULL
      WHERE id = ?`,
      [newAssignee.id, newAssignee.name, taskId]
    );
  }

  async skipTask(taskId: string, userId: string, userName: string, comment?: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    await db.update(
      `UPDATE workflow_tasks SET 
        status = 'completed', 
        result = 'skipped', 
        comment = ?, 
        completed_at = ? 
      WHERE id = ?`,
      [comment, new Date(), taskId]
    );

    // 记录任务跳过历史
    await this.recordTaskHistory(taskId, {
      action: 'skip',
      operator: { id: userId, name: userName },
      comment
    }, task.instance_id, task.node_id);
  }

  async getTasksByInstance(instanceId: string, status?: string[]): Promise<WorkflowTask[]> {
    let whereClause = 'instance_id = ?';
    const params = [instanceId];

    if (status && status.length > 0) {
      whereClause += ` AND status IN (${status.map(() => '?').join(', ')})`;
      params.push(...status);
    }

    const rows = await db.query<any>(
      `SELECT * FROM workflow_tasks WHERE ${whereClause} ORDER BY created_at DESC`,
      params
    );

    return rows.map((row: any) => this.parseTaskRow(row));
  }

  async getOverdueTasks(timeLimit: number): Promise<WorkflowTask[]> {
    const cutoffTime = new Date(Date.now() - timeLimit);
    const rows = await db.query<any>(
      `SELECT * FROM workflow_tasks 
       WHERE due_date < ? AND status IN ('created', 'assigned', 'in_progress')`,
      [cutoffTime]
    );

    return rows.map((row: any) => this.parseTaskRow(row));
  }

  private async recordTaskHistory(taskId: string, params: {
    action: 'create' | 'assign' | 'claim' | 'complete' | 'delegate' | 'transfer' | 'withdraw' | 'cancel' | 'skip';
    operator: { id: string; name: string };
    targetUser?: { id: string; name: string };
    comment?: string;
    result?: string;
    formData?: Record<string, any>;
  }, instanceId?: string, nodeId?: string): Promise<void> {
    const task = await this.getTask(taskId);
    
    await db.insert(
      `INSERT INTO workflow_task_history (
        id, task_id, instance_id, node_id, task_name, action, operator_id, operator_name,
        target_id, target_name, comment
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        taskId,
        instanceId ?? null,
        nodeId ?? null,
        task?.name || null,
        params.action,
        params.operator.id,
        params.operator.name,
        params.targetUser?.id || task?.assignee_id || null,
        params.targetUser?.name || task?.assignee_name || null,
        params.comment || null
      ]
    );
  }

  // 获取任务历史记录
  async getTaskHistory(taskId: string): Promise<any[]> {
    const rows = await db.query<any>(
      `SELECT * FROM workflow_task_history 
       WHERE task_id = ? 
       ORDER BY created_at DESC`,
      [taskId]
    );

    return rows.map(row => ({
      id: row.id,
      taskId: row.task_id,
      instanceId: row.instance_id,
      nodeId: row.node_id,
      action: row.action,
      operatorId: row.operator_id,
      operatorName: row.operator_name,
      assigneeId: row.assignee_id,
      assigneeName: row.assignee_name,
      result: row.result,
      comment: row.comment,
      formData: row.form_data ? JSON.parse(row.form_data) : null,
      createdAt: row.created_at
    }));
  }

  // 获取实例的所有任务历史
  async getInstanceTaskHistory(instanceId: string): Promise<any[]> {
    const rows = await db.query<any>(
      `SELECT * FROM workflow_task_history 
       WHERE instance_id = ? 
       ORDER BY created_at DESC`,
      [instanceId]
    );

    return rows.map(row => ({
      id: row.id,
      taskId: row.task_id,
      instanceId: row.instance_id,
      nodeId: row.node_id,
      action: row.action,
      operatorId: row.operator_id,
      operatorName: row.operator_name,
      assigneeId: row.assignee_id,
      assigneeName: row.assignee_name,
      result: row.result,
      comment: row.comment,
      formData: row.form_data ? JSON.parse(row.form_data) : null,
      createdAt: row.created_at
    }));
  }

  private parseTaskRow(row: any): WorkflowTask {
    let candidateUsers = null;
    if (row.candidate_users) {
      if (typeof row.candidate_users === 'string') {
        try {
          candidateUsers = JSON.parse(row.candidate_users);
        } catch {
          candidateUsers = null;
        }
      } else if (typeof row.candidate_users === 'object') {
        candidateUsers = row.candidate_users;
      }
    }

    let candidateGroups = null;
    if (row.candidate_groups) {
      if (typeof row.candidate_groups === 'string') {
        try {
          candidateGroups = JSON.parse(row.candidate_groups);
        } catch {
          candidateGroups = null;
        }
      } else if (typeof row.candidate_groups === 'object') {
        candidateGroups = row.candidate_groups;
      }
    }

    let variables = {};
    if (row.variables) {
      if (typeof row.variables === 'string') {
        try {
          variables = JSON.parse(row.variables);
        } catch {
          variables = {};
        }
      } else if (typeof row.variables === 'object') {
        variables = row.variables;
      }
    }

    return {
      id: row.id,
      instance_id: row.instance_id,
      execution_id: row.execution_id,
      node_id: row.node_id,
      task_def_key: row.task_def_key,
      name: row.name,
      description: row.description,
      assignee_id: row.assignee_id,
      assignee_name: row.assignee_name,
      candidate_users: candidateUsers,
      candidate_groups: candidateGroups,
      priority: row.priority,
      due_date: row.due_date ? new Date(row.due_date) : undefined,
      claim_time: row.claim_time ? new Date(row.claim_time) : undefined,
      variables,
      status: row.status,
      result: row.result,
      comment: row.comment,
      created_at: new Date(row.created_at),
      started_at: row.started_at ? new Date(row.started_at) : undefined,
      completed_at: row.completed_at ? new Date(row.completed_at) : undefined,
      duration: row.duration
    };
  }
}

export const taskService = new TaskService();
