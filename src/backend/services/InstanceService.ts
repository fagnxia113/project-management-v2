import { db } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowInstance, WorkflowExecution } from '../types/workflow.js';
import { definitionService } from './DefinitionService.js';

export class InstanceService {
  async createInstance(params: {
    definitionId: string;
    businessKey?: string;
    businessId?: string;
    title?: string;
    variables?: Record<string, any>;
    initiator: { id: string; name: string };
  }): Promise<WorkflowInstance> {
    const definition = await definitionService.getDefinition(params.definitionId);
    if (!definition) {
      throw new Error('流程定义不存在');
    }

    const id = uuidv4();
    const instance: WorkflowInstance = {
      id,
      definition_id: params.definitionId,
      definition_key: definition.key,
      definition_version: definition.version,
      business_key: params.businessKey,
      business_id: params.businessId,
      title: params.title || definition.name,
      initiator_id: params.initiator.id,
      initiator_name: params.initiator.name,
      variables: params.variables || {},
      status: 'running',
      start_time: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    };

    await db.insert(
      `INSERT INTO workflow_instances (
        id, definition_id, definition_key, definition_version,
        business_key, business_id, title, initiator_id, initiator_name, 
        variables, status, start_time, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        instance.id,
        instance.definition_id,
        instance.definition_key,
        instance.definition_version,
        instance.business_key ?? null,
        instance.business_id ?? null,
        instance.title,
        instance.initiator_id,
        instance.initiator_name,
        JSON.stringify(instance.variables),
        instance.status,
        instance.start_time,
        instance.created_at,
        instance.updated_at
      ]
    );

    return instance;
  }

  async getInstance(id: string): Promise<WorkflowInstance | null> {
    const row = await db.queryOne<any>(
      `SELECT * FROM workflow_instances WHERE id = ?`,
      [id]
    );

    if (!row) {
      return null;
    }

    return this.parseInstanceRow(row);
  }

  async getInstances(params?: {
    definitionKey?: string;
    businessKey?: string;
    businessId?: string;
    status?: string;
    initiatorId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<WorkflowInstance[]> {
    let whereClause = '1=1';
    const queryParams: any[] = [];

    if (params?.definitionKey) {
      whereClause += ' AND definition_key = ?';
      queryParams.push(params.definitionKey);
    }

    if (params?.businessKey) {
      whereClause += ' AND business_key = ?';
      queryParams.push(params.businessKey);
    }

    if (params?.businessId) {
      whereClause += ' AND business_id = ?';
      queryParams.push(params.businessId);
    }

    if (params?.status) {
      const statuses = params.status.split(',').map(s => s.trim());
      if (statuses.length > 1) {
        const placeholders = statuses.map(() => '?').join(',');
        whereClause += ` AND status IN (${placeholders})`;
        queryParams.push(...statuses);
      } else {
        whereClause += ' AND status = ?';
        queryParams.push(params.status);
      }
    }

    if (params?.initiatorId) {
      whereClause += ' AND initiator_id = ?';
      queryParams.push(params.initiatorId);
    }

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const rows = await db.query<any>(
      `SELECT * FROM workflow_instances 
       WHERE ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [...queryParams, pageSize, offset]
    );

    // 获取部门和职位名称映射
    const departments = await db.query<any>('SELECT id, name FROM departments');
    const positions = await db.query<any>('SELECT id, name FROM positions');
    const deptMap = Object.fromEntries(departments.map((d: any) => [d.id, d.name]));
    const posMap = Object.fromEntries(positions.map((p: any) => [p.id, p.name]));

    return rows.map((row: any) => {
      const instance = this.parseInstanceRow(row);
      // 在表单数据中添加部门/职位名称映射
      if (instance.variables?.formData) {
        instance.variables.formData._deptMap = deptMap;
        instance.variables.formData._posMap = posMap;
      }
      return instance;
    });
  }

  async updateInstance(id: string, updates: Partial<WorkflowInstance>, operator?: { id: string; name: string }, reason?: string): Promise<boolean> {
    const existing = await this.getInstance(id);
    if (!existing) {
      return false;
    }

    const updateFields: string[] = [];
    const updateParams: any[] = [];
    let statusChanged = false;
    let oldStatus = existing.status;
    let newStatus = existing.status;

    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      updateParams.push(updates.status);
      statusChanged = updates.status !== existing.status;
      newStatus = updates.status;

      if (updates.status === 'completed' || updates.status === 'terminated') {
        updateFields.push('end_time = CURRENT_TIMESTAMP');
        if (updates.result) {
          updateFields.push('result = ?');
          updateParams.push(updates.result);
        }
        // 计算耗时（秒）
        updateFields.push('duration = TIMESTAMPDIFF(SECOND, start_time, NOW())');
      }
    }

    if (updates.variables !== undefined) {
      updateFields.push('variables = ?');
      updateParams.push(JSON.stringify(updates.variables));
    }

    if (updates.title !== undefined) {
      updateFields.push('title = ?');
      updateParams.push(updates.title);
    }

    if (updates.business_id !== undefined) {
      updateFields.push('business_id = ?');
      updateParams.push(updates.business_id);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    if (updateFields.length > 1) {
      await db.update(
        `UPDATE workflow_instances SET ${updateFields.join(', ')} WHERE id = ?`,
        [...updateParams, id]
      );

      // 记录状态变更历史
      if (statusChanged) {
        await this.recordStatusHistory(id, oldStatus, newStatus, operator, reason);
      }
    }

    return true;
  }

  async updateInstanceStatus(id: string, status: string, operator?: { id: string; name: string }, reason?: string): Promise<boolean> {
    return this.updateInstance(id, { status: status as any }, operator, reason);
  }

  async endInstance(instanceId: string, result: 'approved' | 'rejected' | 'withdrawn' | 'terminated' | 'skipped', operator?: { id: string; name: string }, reason?: string): Promise<void> {
    await this.updateInstance(instanceId, {
      status: 'completed',
      result
    }, operator, reason);

    // 清理相关执行实例
    await this.cleanupExecutions(instanceId);
  }

  async updateVariables(instanceId: string, variables: Record<string, any>): Promise<void> {
    const instance = await this.getInstance(instanceId);
    if (!instance) {
      throw new Error('流程实例不存在');
    }

    const updatedVariables = {
      ...instance.variables,
      ...variables
    };

    await db.update(
      `UPDATE workflow_instances SET variables = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [JSON.stringify(updatedVariables), instanceId]
    );

    // 记录变量变更历史
    await this.recordVariableHistory(instanceId, variables);
  }



  async createExecution(params: {
    instanceId: string;
    nodeId: string;
    nodeName?: string;
    nodeType?: string;
    parentId?: string;
    variables?: Record<string, any>;
  }): Promise<WorkflowExecution> {
    const id = uuidv4();
    const execution: WorkflowExecution = {
      id,
      instance_id: params.instanceId,
      parent_id: params.parentId,
      node_id: params.nodeId,
      node_name: params.nodeName,
      node_type: params.nodeType,
      variables: params.variables || {},
      status: 'active',
      created_at: new Date()
    };

    await db.insert(
      `INSERT INTO workflow_executions (
        id, instance_id, parent_id, node_id, node_name, node_type, 
        variables, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        execution.id,
        execution.instance_id,
        execution.parent_id ?? null,
        execution.node_id,
        execution.node_name,
        execution.node_type,
        JSON.stringify(execution.variables),
        execution.status,
        execution.created_at
      ]
    );

    return execution;
  }

  async completeExecution(executionId: string): Promise<void> {
    await db.update(
      `UPDATE workflow_executions SET status = 'completed', completed_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [executionId]
    );
  }

  async getExecutions(instanceId: string, nodeId?: string): Promise<WorkflowExecution[]> {
    let whereClause = 'instance_id = ?';
    const params = [instanceId];

    if (nodeId) {
      whereClause += ' AND node_id = ?';
      params.push(nodeId);
    }

    const rows = await db.query<any>(
      `SELECT * FROM workflow_executions WHERE ${whereClause} ORDER BY created_at DESC`,
      params
    );

    return rows.map(this.parseExecutionRow.bind(this));
  }

  async getPendingExecutions(instanceId: string, gatewayId: string): Promise<WorkflowExecution[]> {
    const rows = await db.query<any>(
      `SELECT * FROM workflow_executions 
       WHERE instance_id = ? AND parent_id IS NOT NULL 
       AND status = 'active' AND node_id = ?`,
      [instanceId, gatewayId]
    );

    return rows.map(this.parseExecutionRow.bind(this));
  }

  private async recordVariableHistory(instanceId: string, variables: Record<string, any>): Promise<void> {
    const instance = await this.getInstance(instanceId);
    if (!instance) return;

    for (const [name, value] of Object.entries(variables)) {
      const oldValue = instance.variables[name];
      if (oldValue !== value) {
        await db.insert(
          `INSERT INTO workflow_variable_history (
            id, instance_id, variable_name, old_value, new_value, created_at
          ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            uuidv4(),
            instanceId,
            name,
            JSON.stringify(oldValue),
            JSON.stringify(value)
          ]
        );
      }
    }
  }

  private async cleanupExecutions(instanceId: string): Promise<void> {
    await db.update(
      `UPDATE workflow_executions SET status = 'cancelled' 
       WHERE instance_id = ? AND status = 'active'`,
      [instanceId]
    );
  }

  // 记录状态变更历史
  private async recordStatusHistory(
    instanceId: string,
    fromStatus: string,
    toStatus: string,
    operator?: { id: string; name: string },
    reason?: string
  ): Promise<void> {
    await db.insert(
      `INSERT INTO workflow_instance_history (
        id, instance_id, from_status, to_status, operator_id, operator_name, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        uuidv4(),
        instanceId,
        fromStatus,
        toStatus,
        operator?.id || null,
        operator?.name || null,
        reason || null
      ]
    );
  }

  // 获取实例状态历史
  async getInstanceHistory(instanceId: string): Promise<any[]> {
    const rows = await db.query<any>(
      `SELECT * FROM workflow_instance_history 
       WHERE instance_id = ? 
       ORDER BY created_at DESC`,
      [instanceId]
    );

    return rows.map(row => ({
      id: row.id,
      instanceId: row.instance_id,
      fromStatus: row.from_status,
      toStatus: row.to_status,
      operatorId: row.operator_id,
      operatorName: row.operator_name,
      reason: row.reason,
      createdAt: row.created_at
    }));
  }

  // ==================== 管理员查询方法 ====================

  async getAllInstances(params?: {
    status?: string;
    processKey?: string;
    startTime?: Date;
    endTime?: Date;
    page?: number;
    pageSize?: number;
  }): Promise<{ instances: WorkflowInstance[]; total: number }> {
    let whereClause = '1=1';
    const queryParams: any[] = [];

    if (params?.status) {
      whereClause += ' AND status = ?';
      queryParams.push(params.status);
    }

    if (params?.processKey) {
      whereClause += ' AND definition_key = ?';
      queryParams.push(params.processKey);
    }

    if (params?.startTime) {
      whereClause += ' AND created_at >= ?';
      queryParams.push(params.startTime);
    }

    if (params?.endTime) {
      whereClause += ' AND created_at <= ?';
      queryParams.push(params.endTime);
    }

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const [rows, countResult] = await Promise.all([
      db.query<any>(
        `SELECT * FROM workflow_instances 
         WHERE ${whereClause} 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [...queryParams, pageSize, offset]
      ),
      db.queryOne<any>(
        `SELECT COUNT(*) as total FROM workflow_instances WHERE ${whereClause}`,
        queryParams
      )
    ]);

    return {
      instances: rows.map(row => this.parseInstanceRow(row)),
      total: countResult?.total || 0
    };
  }

  async getProcessStatistics(params?: {
    startTime?: Date;
    endTime?: Date;
    processKey?: string;
  }): Promise<{
    totalInstances: number;
    runningInstances: number;
    completedInstances: number;
    terminatedInstances: number;
    suspendedInstances: number;
    avgDuration: number;
    approvalRate: number;
    rejectionRate: number;
    byProcessKey: Record<string, {
      total: number;
      running: number;
      completed: number;
      avgDuration: number;
    }>;
  }> {
    let whereClause = '1=1';
    const queryParams: any[] = [];

    if (params?.startTime) {
      whereClause += ' AND created_at >= ?';
      queryParams.push(params.startTime);
    }

    if (params?.endTime) {
      whereClause += ' AND created_at <= ?';
      queryParams.push(params.endTime);
    }

    if (params?.processKey) {
      whereClause += ' AND definition_key = ?';
      queryParams.push(params.processKey);
    }

    const stats = await db.queryOne<any>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'terminated' THEN 1 ELSE 0 END) as \`terminated\`,
        SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended,
        AVG(CASE WHEN duration IS NOT NULL THEN duration END) as avg_duration,
        SUM(CASE WHEN result = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN result = 'rejected' THEN 1 ELSE 0 END) as rejected
       FROM workflow_instances 
       WHERE ${whereClause}`,
      queryParams
    );

    const byProcessKeyRows = await db.query<any>(
      `SELECT 
        definition_key,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        AVG(CASE WHEN duration IS NOT NULL THEN duration END) as avg_duration
       FROM workflow_instances 
       WHERE ${whereClause}
       GROUP BY definition_key`,
      queryParams
    );

    const byProcessKey: Record<string, any> = {};
    for (const row of byProcessKeyRows) {
      byProcessKey[row.definition_key] = {
        total: row.total,
        running: row.running,
        completed: row.completed,
        avgDuration: row.avg_duration || 0
      };
    }

    const completedCount = stats?.completed || 0;
    const approvedCount = stats?.approved || 0;
    const rejectedCount = stats?.rejected || 0;

    return {
      totalInstances: stats?.total || 0,
      runningInstances: stats?.running || 0,
      completedInstances: completedCount,
      terminatedInstances: stats?.terminated || 0,
      suspendedInstances: stats?.suspended || 0,
      avgDuration: stats?.avg_duration || 0,
      approvalRate: completedCount > 0 ? approvedCount / completedCount : 0,
      rejectionRate: completedCount > 0 ? rejectedCount / completedCount : 0,
      byProcessKey
    };
  }

  async getRealtimeMonitoring(): Promise<{
    activeInstances: number;
    pendingTasks: number;
    overdueTasks: number;
    todayCompleted: number;
    todayStarted: number;
    avgProcessingTime: number;
    topSlowProcesses: Array<{
      instanceId: string;
      title: string;
      duration: number;
      currentNode: string;
    }>;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activeInstances, pendingTasks, overdueTasks, todayCompleted, todayStarted, topSlowProcesses] = await Promise.all([
      // 活动实例数
      db.queryOne<any>(
        `SELECT COUNT(*) as count FROM workflow_instances WHERE status = 'running'`
      ),
      // 待处理任务数
      db.queryOne<any>(
        `SELECT COUNT(*) as count FROM workflow_tasks WHERE status IN ('created', 'assigned', 'in_progress')`
      ),
      // 逾期任务数
      db.queryOne<any>(
        `SELECT COUNT(*) as count FROM workflow_tasks 
         WHERE due_date < NOW() AND status IN ('created', 'assigned', 'in_progress')`
      ),
      // 今日完成数
      db.queryOne<any>(
        `SELECT COUNT(*) as count FROM workflow_instances 
         WHERE status = 'completed' AND DATE(updated_at) = CURDATE()`
      ),
      // 今日启动数
      db.queryOne<any>(
        `SELECT COUNT(*) as count FROM workflow_instances 
         WHERE DATE(created_at) = CURDATE()`
      ),
      // 最慢的处理中流程
      db.query<any>(
        `SELECT 
          i.id as instance_id,
          i.title,
          TIMESTAMPDIFF(SECOND, i.start_time, NOW()) as duration,
          t.node_id as current_node
         FROM workflow_instances i
         LEFT JOIN workflow_tasks t ON i.id = t.instance_id AND t.status IN ('assigned', 'in_progress')
         WHERE i.status = 'running'
         ORDER BY duration DESC
         LIMIT 10`
      )
    ]);

    // 计算平均处理时间
    const avgTimeResult = await db.queryOne<any>(
      `SELECT AVG(duration) as avg_time 
       FROM workflow_instances 
       WHERE status = 'completed' AND duration IS NOT NULL`
    );

    return {
      activeInstances: activeInstances?.count || 0,
      pendingTasks: pendingTasks?.count || 0,
      overdueTasks: overdueTasks?.count || 0,
      todayCompleted: todayCompleted?.count || 0,
      todayStarted: todayStarted?.count || 0,
      avgProcessingTime: avgTimeResult?.avg_time || 0,
      topSlowProcesses: topSlowProcesses.map((row: any) => ({
        instanceId: row.instance_id,
        title: row.title,
        duration: row.duration,
        currentNode: row.current_node
      }))
    };
  }

  private parseInstanceRow(row: any): WorkflowInstance {
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
      definition_id: row.definition_id,
      definition_key: row.definition_key,
      definition_version: row.definition_version,
      business_key: row.business_key,
      business_id: row.business_id,
      title: row.title,
      initiator_id: row.initiator_id,
      initiator_name: row.initiator_name,
      variables,
      status: row.status,
      start_time: new Date(row.start_time),
      end_time: row.end_time ? new Date(row.end_time) : undefined,
      duration: row.duration,
      result: row.result,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  private parseExecutionRow(row: any): WorkflowExecution {
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
      parent_id: row.parent_id,
      node_id: row.node_id,
      node_name: row.node_name,
      node_type: row.node_type,
      variables,
      status: row.status,
      created_at: new Date(row.created_at),
      completed_at: row.completed_at ? new Date(row.completed_at) : undefined
    };
  }
}

export const instanceService = new InstanceService();
