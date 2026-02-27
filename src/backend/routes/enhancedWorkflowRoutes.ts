import { Router } from 'express';
import { enhancedWorkflowEngine } from '../services/EnhancedWorkflowEngine.js';
import { executionLogger } from '../services/ExecutionLogger.js';
import { performanceMonitor } from '../services/PerformanceMonitor.js';
import { instanceService } from '../services/InstanceService.js';
import { taskService } from '../services/TaskService.js';
import { definitionService } from '../services/DefinitionService.js';

const router = Router();

// ==================== 流程实例管理 ====================

// 启动流程
router.post('/process/start', async (req, res) => {
  try {
    const { processKey, businessKey, businessId, title, variables, initiator } = req.body;

    const instance = await enhancedWorkflowEngine.startProcess({
      processKey,
      businessKey,
      businessId,
      title,
      variables,
      initiator
    });

    res.json({
      success: true,
      data: instance
    });
  } catch (error) {
    console.error('启动流程失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '启动流程失败'
    });
  }
});

// 获取流程实例
router.get('/process/instance/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const instance = await enhancedWorkflowEngine.getProcessInstance(instanceId);

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: '流程实例不存在'
      });
    }

    res.json({
      success: true,
      data: instance
    });
  } catch (error) {
    console.error('获取流程实例失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取流程实例失败'
    });
  }
});

// 终止流程
router.post('/process/instance/:instanceId/terminate', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { reason, operator } = req.body;

    await enhancedWorkflowEngine.terminateProcess(instanceId, reason, operator);

    res.json({
      success: true,
      message: '流程已终止'
    });
  } catch (error) {
    console.error('终止流程失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '终止流程失败'
    });
  }
});

// 恢复流程
router.post('/process/instance/:instanceId/resume', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { fromNodeId } = req.body;

    await enhancedWorkflowEngine.resumeProcess(instanceId, fromNodeId);

    res.json({
      success: true,
      message: '流程已恢复'
    });
  } catch (error) {
    console.error('恢复流程失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '恢复流程失败'
    });
  }
});

// 获取流程实例历史
router.get('/process/instance/:instanceId/history', async (req, res) => {
  try {
    const { instanceId } = req.params;
    
    const [instanceHistory, taskHistory] = await Promise.all([
      instanceService.getInstanceHistory(instanceId),
      taskService.getInstanceTaskHistory(instanceId)
    ]);

    res.json({
      success: true,
      data: {
        instanceHistory,
        taskHistory
      }
    });
  } catch (error) {
    console.error('获取流程历史失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取流程历史失败'
    });
  }
});

// ==================== 任务管理 ====================

// 完成任务
router.post('/task/:taskId/complete', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { action, comment, formData, variables, operator } = req.body;

    await enhancedWorkflowEngine.completeTask(taskId, {
      action,
      comment,
      formData,
      variables,
      operator
    });

    res.json({
      success: true,
      message: '任务已完成'
    });
  } catch (error) {
    console.error('完成任务失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '完成任务失败'
    });
  }
});

// 认领任务
router.post('/task/:taskId/claim', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { userId, userName } = req.body;

    await enhancedWorkflowEngine.claimTask(taskId, userId, userName);

    res.json({
      success: true,
      message: '任务已认领'
    });
  } catch (error) {
    console.error('认领任务失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '认领任务失败'
    });
  }
});

// 委托任务
router.post('/task/:taskId/delegate', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { targetUser, operator, comment } = req.body;

    await enhancedWorkflowEngine.delegateTask(taskId, {
      targetUser,
      operator,
      comment
    });

    res.json({
      success: true,
      message: '任务已委托'
    });
  } catch (error) {
    console.error('委托任务失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '委托任务失败'
    });
  }
});

// 转办任务
router.post('/task/:taskId/transfer', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { targetUser, operator, comment } = req.body;

    await enhancedWorkflowEngine.transferTask(taskId, {
      targetUser,
      operator,
      comment
    });

    res.json({
      success: true,
      message: '任务已转办'
    });
  } catch (error) {
    console.error('转办任务失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '转办任务失败'
    });
  }
});

// 获取用户任务列表
router.get('/tasks/assignee/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;
    
    // 解析状态参数
    const statusArray = status ? (status as string).split(',') : undefined;
    const tasks = await taskService.getTasksByAssignee(userId, statusArray);

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('获取任务列表失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取任务列表失败'
    });
  }
});

// 获取任务历史
router.get('/task/:taskId/history', async (req, res) => {
  try {
    const { taskId } = req.params;
    const history = await taskService.getTaskHistory(taskId);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('获取任务历史失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取任务历史失败'
    });
  }
});

// ==================== 执行日志 ====================

// 查询执行日志
router.get('/logs', async (req, res) => {
  try {
    const { instanceId, taskId, action, startTime, endTime, page, pageSize } = req.query;

    const result = await executionLogger.queryLogs({
      instanceId: instanceId as string,
      taskId: taskId as string,
      action: action as string,
      startTime: startTime ? new Date(startTime as string) : undefined,
      endTime: endTime ? new Date(endTime as string) : undefined,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('查询执行日志失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '查询执行日志失败'
    });
  }
});

// 获取执行统计
router.get('/logs/stats', async (req, res) => {
  try {
    const { startTime, endTime, processKey } = req.query;

    const stats = await executionLogger.getExecutionStats({
      startTime: startTime ? new Date(startTime as string) : undefined,
      endTime: endTime ? new Date(endTime as string) : undefined,
      processKey: processKey as string
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取执行统计失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取执行统计失败'
    });
  }
});

// ==================== 性能监控 ====================

// 获取实时性能指标
router.get('/performance/realtime', async (req, res) => {
  try {
    const metrics = performanceMonitor.getRealtimeMetrics();

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('获取实时性能指标失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取实时性能指标失败'
    });
  }
});

// 获取性能统计
router.get('/performance/stats', async (req, res) => {
  try {
    const { timeWindow } = req.query;
    const windowMs = timeWindow ? parseInt(timeWindow as string) : undefined;

    const stats = performanceMonitor.getStats(windowMs);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取性能统计失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取性能统计失败'
    });
  }
});

// 获取特定操作的性能统计
router.get('/performance/operation/:operation', async (req, res) => {
  try {
    const { operation } = req.params;
    const { timeWindow } = req.query;
    const windowMs = timeWindow ? parseInt(timeWindow as string) : undefined;

    const stats = performanceMonitor.getOperationStats(operation, windowMs);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: '未找到该操作的性能数据'
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取操作性能统计失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取操作性能统计失败'
    });
  }
});

// 获取趋势数据
router.get('/performance/trend/:operation', async (req, res) => {
  try {
    const { operation } = req.params;
    const { interval, periods } = req.query;

    const trendData = performanceMonitor.getTrendData(
      operation,
      interval ? parseInt(interval as string) : 5,
      periods ? parseInt(periods as string) : 12
    );

    res.json({
      success: true,
      data: trendData
    });
  } catch (error) {
    console.error('获取趋势数据失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取趋势数据失败'
    });
  }
});

// 生成性能报告
router.get('/performance/report', async (req, res) => {
  try {
    const report = performanceMonitor.generateReport();

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('生成性能报告失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '生成性能报告失败'
    });
  }
});

// 设置告警阈值
router.post('/performance/alert-threshold', async (req, res) => {
  try {
    const { operation, threshold } = req.body;

    performanceMonitor.setAlertThreshold(operation, threshold);

    res.json({
      success: true,
      message: '告警阈值已设置'
    });
  } catch (error) {
    console.error('设置告警阈值失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '设置告警阈值失败'
    });
  }
});

// ==================== 引擎管理 ====================

// 获取引擎指标
router.get('/engine/metrics', async (req, res) => {
  try {
    const metrics = enhancedWorkflowEngine.getMetrics();

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('获取引擎指标失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取引擎指标失败'
    });
  }
});

// 清除缓存
router.post('/engine/clear-cache', async (req, res) => {
  try {
    enhancedWorkflowEngine.clearCache();

    res.json({
      success: true,
      message: '缓存已清除'
    });
  } catch (error) {
    console.error('清除缓存失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '清除缓存失败'
    });
  }
});

// ==================== 管理员监控和干预 API ====================

// 获取所有流程实例（管理员用）
router.get('/admin/instances', async (req, res) => {
  try {
    const { status, processKey, category, startTime, endTime, page, pageSize } = req.query;

    const result = await enhancedWorkflowEngine.getAllInstances({
      status: status as string,
      processKey: processKey as string,
      category: category as string,
      startTime: startTime ? new Date(startTime as string) : undefined,
      endTime: endTime ? new Date(endTime as string) : undefined,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取流程实例列表失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取流程实例列表失败'
    });
  }
});

// 获取流程统计（管理员用）
router.get('/admin/statistics', async (req, res) => {
  try {
    const { startTime, endTime, processKey } = req.query;

    const stats = await enhancedWorkflowEngine.getProcessStatistics({
      startTime: startTime ? new Date(startTime as string) : undefined,
      endTime: endTime ? new Date(endTime as string) : undefined,
      processKey: processKey as string
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取流程统计失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取流程统计失败'
    });
  }
});

// 获取实时监控数据
router.get('/admin/realtime-monitoring', async (req, res) => {
  try {
    const monitoring = await enhancedWorkflowEngine.getRealtimeMonitoring();

    res.json({
      success: true,
      data: monitoring
    });
  } catch (error) {
    console.error('获取实时监控数据失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取实时监控数据失败'
    });
  }
});

// 管理员强制跳转到指定节点
router.post('/admin/instance/:instanceId/jump', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { targetNodeId, operator, reason } = req.body;

    if (!targetNodeId) {
      return res.status(400).json({
        success: false,
        error: '目标节点ID不能为空'
      });
    }

    await enhancedWorkflowEngine.jumpToNode(instanceId, targetNodeId, operator, reason);

    res.json({
      success: true,
      message: '流程已跳转到指定节点'
    });
  } catch (error) {
    console.error('跳转节点失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '跳转节点失败'
    });
  }
});

// 管理员回退到上一个节点
router.post('/admin/instance/:instanceId/rollback', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { operator, reason } = req.body;

    await enhancedWorkflowEngine.rollbackToPreviousNode(instanceId, operator, reason);

    res.json({
      success: true,
      message: '流程已回退到上一个节点'
    });
  } catch (error) {
    console.error('回退节点失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '回退节点失败'
    });
  }
});

// 管理员强制完成任务
router.post('/admin/task/:taskId/force-complete', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { result, operator, comment } = req.body;

    if (!result || !['approved', 'rejected'].includes(result)) {
      return res.status(400).json({
        success: false,
        error: '结果必须是 approved 或 rejected'
      });
    }

    await enhancedWorkflowEngine.forceCompleteTask(taskId, result, operator, comment);

    res.json({
      success: true,
      message: `任务已强制${result === 'approved' ? '通过' : '拒绝'}`
    });
  } catch (error) {
    console.error('强制完成任务失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '强制完成任务失败'
    });
  }
});

// 管理员强制关闭流程
router.post('/admin/instance/:instanceId/force-close', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { operator, reason } = req.body;

    await enhancedWorkflowEngine.forceCloseProcess(instanceId, operator, reason);

    res.json({
      success: true,
      message: '流程已强制关闭'
    });
  } catch (error) {
    console.error('强制关闭流程失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '强制关闭流程失败'
    });
  }
});

// 管理员重新分配任务
router.post('/admin/task/:taskId/reassign', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { newAssignee, operator, reason } = req.body;

    if (!newAssignee || !newAssignee.id || !newAssignee.name) {
      return res.status(400).json({
        success: false,
        error: '新指派人信息不完整'
      });
    }

    await enhancedWorkflowEngine.reassignTask(taskId, newAssignee, operator, reason);

    res.json({
      success: true,
      message: '任务已重新分配'
    });
  } catch (error) {
    console.error('重新分配任务失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '重新分配任务失败'
    });
  }
});

// 获取流程实例的任务列表
router.get('/process/instance/:instanceId/tasks', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const tasks = await taskService.getTasksByInstance(instanceId);

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('获取任务列表失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取任务列表失败'
    });
  }
});

// 获取流程实例的任务列表（v2 API 别名）
router.get('/tasks/instance/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const tasks = await taskService.getTasksByInstance(instanceId);

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('获取任务列表失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取任务列表失败'
    });
  }
});

// 获取流程实例的执行日志
router.get('/process/instance/:instanceId/logs', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const logs = await executionLogger.getHistory(instanceId);

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('获取执行日志失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取执行日志失败'
    });
  }
});

// 获取流程实例的操作历史
router.get('/process/instance/:instanceId/history', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const history = await executionLogger.getHistory(instanceId);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('获取操作历史失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取操作历史失败'
    });
  }
});

// 获取流程定义的所有节点（用于管理员选择跳转目标）
router.get('/admin/instance/:instanceId/nodes', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const instance = await instanceService.getInstance(instanceId);

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: '流程实例不存在'
      });
    }

    const definition = await definitionService.getDefinition(instance.definition_id);
    
    if (!definition || !definition.node_config) {
      return res.status(404).json({
        success: false,
        error: '流程定义不存在或配置无效'
      });
    }

    const nodes = definition.node_config.nodes.map((node: any) => ({
      id: node.id,
      name: node.name,
      type: node.type
    }));

    res.json({
      success: true,
      data: nodes
    });
  } catch (error) {
    console.error('获取流程节点失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取流程节点失败'
    });
  }
});

export default router;
