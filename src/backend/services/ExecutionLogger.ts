import { db } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

// 执行日志条目
export interface ExecutionLogEntry {
  id?: string;
  executionId: string;
  action: string;
  processKey?: string;
  instanceId?: string;
  taskId?: string;
  nodeId?: string;
  nodeType?: string;
  businessKey?: string;
  initiator?: { id: string; name: string };
  operator?: { id: string; name: string };
  result?: string;
  error?: string;
  reason?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

// 执行日志服务
export class ExecutionLogger {
  private logQueue: ExecutionLogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly batchSize = 100;
  private readonly flushDelay = 5000; // 5秒

  constructor() {
    this.startFlushTimer();
  }

  // 记录日志
  async log(entry: ExecutionLogEntry): Promise<void> {
    const logEntry: ExecutionLogEntry = {
      id: uuidv4(),
      ...entry,
      timestamp: entry.timestamp || new Date()
    };

    this.logQueue.push(logEntry);

    // 如果队列达到批处理大小，立即刷新
    if (this.logQueue.length >= this.batchSize) {
      await this.flush();
    }
  }

  // 批量记录日志
  async logBatch(entries: ExecutionLogEntry[]): Promise<void> {
    for (const entry of entries) {
      this.logQueue.push({
        id: uuidv4(),
        ...entry,
        timestamp: entry.timestamp || new Date()
      });
    }

    if (this.logQueue.length >= this.batchSize) {
      await this.flush();
    }
  }

  // 刷新日志到数据库
  async flush(): Promise<void> {
    if (this.logQueue.length === 0) return;

    const logsToFlush = [...this.logQueue];
    this.logQueue = [];

    try {
      const values = logsToFlush.map(log => [
        log.id,
        log.executionId,
        log.action,
        log.processKey || null,
        log.instanceId || null,
        log.taskId || null,
        log.nodeId || null,
        log.nodeType || null,
        log.businessKey || null,
        log.initiator ? JSON.stringify(log.initiator) : null,
        log.operator ? JSON.stringify(log.operator) : null,
        log.result || null,
        log.error || null,
        log.reason || null,
        log.metadata ? JSON.stringify(log.metadata) : null,
        log.timestamp
      ]);

      const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const flatValues = values.flat();

      await db.execute(
        `INSERT INTO workflow_execution_logs (
          id, execution_id, action, process_key, instance_id, task_id, 
          node_id, node_type, business_key, initiator, operator, 
          result, error, reason, metadata, created_at
        ) VALUES ${placeholders}`,
        flatValues
      );

      console.log(`[ExecutionLogger] 成功写入 ${logsToFlush.length} 条日志`);
    } catch (error) {
      console.error('[ExecutionLogger] 写入日志失败:', error);
      // 将失败的日志重新加入队列
      this.logQueue.unshift(...logsToFlush);
    }
  }

  // 查询日志
  async queryLogs(params: {
    instanceId?: string;
    taskId?: string;
    action?: string;
    startTime?: Date;
    endTime?: Date;
    page?: number;
    pageSize?: number;
  }): Promise<{ logs: ExecutionLogEntry[]; total: number }> {
    let whereClause = '1=1';
    const queryParams: any[] = [];

    if (params.instanceId) {
      whereClause += ' AND instance_id = ?';
      queryParams.push(params.instanceId);
    }

    if (params.taskId) {
      whereClause += ' AND task_id = ?';
      queryParams.push(params.taskId);
    }

    if (params.action) {
      whereClause += ' AND action = ?';
      queryParams.push(params.action);
    }

    if (params.startTime) {
      whereClause += ' AND created_at >= ?';
      queryParams.push(params.startTime);
    }

    if (params.endTime) {
      whereClause += ' AND created_at <= ?';
      queryParams.push(params.endTime);
    }

    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const [rows, countResult] = await Promise.all([
      db.query<any[]>(
        `SELECT * FROM workflow_execution_logs 
         WHERE ${whereClause} 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [...queryParams, pageSize, offset]
      ),
      db.queryOne<any>(
        `SELECT COUNT(*) as total FROM workflow_execution_logs WHERE ${whereClause}`,
        queryParams
      )
    ]);

    const logs = rows.map(row => this.parseLogRow(row));

    return {
      logs,
      total: countResult?.total || 0
    };
  }

  // 获取流程执行统计
  async getExecutionStats(params: {
    startTime?: Date;
    endTime?: Date;
    processKey?: string;
  }): Promise<{
    totalExecutions: number;
    successCount: number;
    failureCount: number;
    avgDuration: number;
    actionDistribution: Record<string, number>;
  }> {
    let whereClause = '1=1';
    const queryParams: any[] = [];

    if (params.startTime) {
      whereClause += ' AND created_at >= ?';
      queryParams.push(params.startTime);
    }

    if (params.endTime) {
      whereClause += ' AND created_at <= ?';
      queryParams.push(params.endTime);
    }

    if (params.processKey) {
      whereClause += ' AND process_key = ?';
      queryParams.push(params.processKey);
    }

    const [totalResult, actionResult] = await Promise.all([
      db.queryOne<any>(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN error IS NULL THEN 1 ELSE 0 END) as success,
          SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) as failure
         FROM workflow_execution_logs 
         WHERE ${whereClause}`,
        queryParams
      ),
      db.query<any[]>(
        `SELECT action, COUNT(*) as count 
         FROM workflow_execution_logs 
         WHERE ${whereClause}
         GROUP BY action`,
        queryParams
      )
    ]);

    const actionDistribution: Record<string, number> = {};
    for (const row of actionResult) {
      actionDistribution[row.action] = row.count;
    }

    return {
      totalExecutions: totalResult?.total || 0,
      successCount: totalResult?.success || 0,
      failureCount: totalResult?.failure || 0,
      avgDuration: 0, // 需要额外的计算
      actionDistribution
    };
  }

  // 获取流程实例的操作历史
  async getHistory(instanceId: string): Promise<ExecutionLogEntry[]> {
    const { logs } = await this.queryLogs({ instanceId, pageSize: 100 });
    return logs;
  }

  // 解析日志行
  private parseLogRow(row: any): ExecutionLogEntry {
    return {
      id: row.id,
      executionId: row.execution_id,
      action: row.action,
      processKey: row.process_key,
      instanceId: row.instance_id,
      taskId: row.task_id,
      nodeId: row.node_id,
      nodeType: row.node_type,
      businessKey: row.business_key,
      initiator: row.initiator ? JSON.parse(row.initiator) : undefined,
      operator: row.operator ? JSON.parse(row.operator) : undefined,
      result: row.result,
      error: row.error,
      reason: row.reason,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      timestamp: row.created_at
    };
  }

  // 启动定时刷新
  private startFlushTimer(): void {
    this.flushInterval = setInterval(() => {
      this.flush().catch(console.error);
    }, this.flushDelay);
  }

  // 停止定时刷新
  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }
}

// 导出单例
export const executionLogger = new ExecutionLogger();
