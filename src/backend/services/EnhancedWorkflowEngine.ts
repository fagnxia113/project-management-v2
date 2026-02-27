import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import pinyinLib from 'pinyin';
const pinyin = (pinyinLib as any).default || (pinyinLib as any).pinyin || pinyinLib;
import {
  WorkflowInstance,
  WorkflowTask,
  StartProcessParams,
  CompleteTaskParams,
  DelegateTaskParams,
  TransferTaskParams,
  ProcessContext,
  WorkflowNode,
  WorkflowDefinition
} from '../types/workflow.js';
import { definitionService } from './DefinitionService.js';
import { instanceService } from './InstanceService.js';
import { taskService } from './TaskService.js';
import { approverResolver } from './ApproverResolver.js';
import { gatewayHandler } from './GatewayHandler.js';
import { executionLogger } from './ExecutionLogger.js';
import { performanceMonitor } from './PerformanceMonitor.js';
import { db } from '../database/connection.js';

// 流程引擎配置
interface WorkflowEngineConfig {
  maxListeners: number;
  cacheSize: number;
  cacheTTL: number;
  enablePerformanceMonitor: boolean;
  enableExecutionLog: boolean;
  retryAttempts: number;
  retryDelay: number;
}

// 默认配置
const defaultConfig: WorkflowEngineConfig = {
  maxListeners: 100,
  cacheSize: 1000,
  cacheTTL: 300000, // 5分钟
  enablePerformanceMonitor: true,
  enableExecutionLog: true,
  retryAttempts: 3,
  retryDelay: 1000
};

// 缓存项
interface CacheItem<T> {
  value: T;
  timestamp: number;
}

// 增强的流程引擎
export class EnhancedWorkflowEngine {
  private eventBus: EventEmitter;
  private config: WorkflowEngineConfig;
  
  // 多层缓存
  private definitionCache: Map<string, CacheItem<any>>;
  private approverCache: Map<string, CacheItem<any[]>>;
  private nextNodesCache: Map<string, Map<string, string[]>>;
  
  // 执行状态跟踪
  private activeExecutions: Map<string, AbortController>;
  private executionRetries: Map<string, number>;
  
  // 性能指标
  private metrics: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    avgExecutionTime: number;
    cacheHitRate: number;
  };

  constructor(config: Partial<WorkflowEngineConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.eventBus = new EventEmitter();
    this.eventBus.setMaxListeners(this.config.maxListeners);
    
    this.definitionCache = new Map();
    this.approverCache = new Map();
    this.nextNodesCache = new Map();
    
    this.activeExecutions = new Map();
    this.executionRetries = new Map();
    
    this.metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      avgExecutionTime: 0,
      cacheHitRate: 0
    };

    // 启动缓存清理定时器
    this.startCacheCleanup();
  }

  // ==================== 流程启动 ====================
  
  async startProcess(params: StartProcessParams): Promise<WorkflowInstance> {
    const startTime = Date.now();
    const executionId = uuidv4();
    
    try {
      this.metrics.totalExecutions++;
      
      // 记录执行开始
      if (this.config.enableExecutionLog) {
        await executionLogger.log({
          executionId,
          action: 'process_start',
          processKey: params.processKey,
          businessKey: params.businessKey,
          initiator: params.initiator,
          timestamp: new Date()
        });
      }

      // 获取流程定义（使用缓存）
      const definition = await this.getCachedDefinition(params.processKey);
      
      // 创建流程实例
      const instance = await instanceService.createInstance({
        definitionId: definition.id,
        businessKey: params.businessKey,
        businessId: params.businessId,
        title: params.title || definition.name,
        variables: params.variables,
        initiator: params.initiator
      });

      // 触发流程启动事件
      this.eventBus.emit('process.started', {
        instance,
        definition,
        executionId,
        timestamp: new Date()
      });

      // 执行开始节点
      await this.executeWithRetry(
        () => this.executeStartEvent(instance, definition),
        executionId,
        'start_event'
      );

      // 记录性能指标
      const duration = Date.now() - startTime;
      this.updateMetrics(true, duration);
      
      if (this.config.enablePerformanceMonitor) {
        performanceMonitor.record('process_start', duration);
      }

      return instance;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateMetrics(false, duration);
      
      // 记录错误
      if (this.config.enableExecutionLog) {
        await executionLogger.log({
          executionId,
          action: 'process_start_error',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date()
        });
      }
      
      this.eventBus.emit('process.start_failed', {
        params,
        error,
        executionId,
        timestamp: new Date()
      });
      
      throw error;
    }
  }

  // ==================== 任务完成 ====================

  async completeTask(taskId: string, params: CompleteTaskParams): Promise<void> {
    const startTime = Date.now();
    const executionId = uuidv4();
    
    try {
      const task = await taskService.getTask(taskId);
      if (!task) {
        throw new Error('任务不存在');
      }

      const instance = await instanceService.getInstance(task.instance_id);
      if (!instance) {
        throw new Error('流程实例不存在');
      }

      // 记录任务完成
      if (this.config.enableExecutionLog) {
        await executionLogger.log({
          executionId,
          action: 'task_complete',
          taskId,
          instanceId: instance.id,
          operator: params.operator,
          result: params.result,
          timestamp: new Date()
        });
      }

      const approvalMode = task.variables?.approvalMode || 'or_sign';
      const voteThreshold = task.variables?.voteThreshold || 1;
      const multiApproval = task.variables?.multiApproval;

      if (multiApproval && approvalMode !== 'or_sign') {
        await this.handleMultiApproval(task, instance, params, approvalMode, voteThreshold);
      } else {
        await taskService.completeTask(taskId, params);
        
        this.eventBus.emit('task.completed', { 
          task, 
          params,
          executionId,
          timestamp: new Date()
        });
        
        // 如果驳回，结束流程；如果通过，继续执行下一个节点
        if (params.action === 'rejected') {
          await this.endInstance(instance.id, 'rejected');
        } else {
          const definition = await this.getCachedDefinitionById(instance.definition_id);
          // 找到下一个节点并执行，而不是重新执行当前节点
          const nextNodes = await this.findNextNodes(definition, task.node_id);
          for (const nextNodeId of nextNodes) {
            await this.continueExecution(instance, definition, nextNodeId, executionId);
          }
        }
      }

      // 记录性能指标
      const duration = Date.now() - startTime;
      if (this.config.enablePerformanceMonitor) {
        performanceMonitor.record('task_complete', duration);
      }
    } catch (error) {
      // 记录错误
      if (this.config.enableExecutionLog) {
        await executionLogger.log({
          executionId,
          action: 'task_complete_error',
          taskId,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date()
        });
      }
      
      throw error;
    }
  }

  // ==================== 多审批处理 ====================

  private async handleMultiApproval(
    task: WorkflowTask,
    instance: WorkflowInstance,
    params: CompleteTaskParams,
    approvalMode: string,
    voteThreshold: number
  ): Promise<void> {
    const nodeId = task.node_id;
    const allTasks = await taskService.getTasksByInstance(instance.id, ['assigned', 'in_progress', 'completed']);
    const nodeTasks = allTasks.filter(t => t.node_id === nodeId);

    await taskService.completeTask(task.id, params);
    
    this.eventBus.emit('task.completed', { 
      task, 
      params,
      timestamp: new Date()
    });

    const completedTasks = nodeTasks.filter(t => t.status === 'completed');
    const approveCount = completedTasks.filter(t => t.result === 'approved').length;
    const rejectCount = completedTasks.filter(t => t.result === 'rejected').length;

    let shouldContinue = false;

    switch (approvalMode) {
      case 'and_sign':
        shouldContinue = completedTasks.length === nodeTasks.length && rejectCount === 0;
        break;
      case 'sequential':
        shouldContinue = task.id === nodeTasks[nodeTasks.length - 1].id && rejectCount === 0;
        break;
      case 'vote':
        shouldContinue = approveCount >= voteThreshold;
        break;
      default:
        shouldContinue = true;
    }

    if (rejectCount > 0) {
      await this.endInstance(instance.id, 'rejected');
      return;
    }

    if (shouldContinue) {
      const definition = await this.getCachedDefinitionById(instance.definition_id);
      await this.continueExecution(instance, definition, nodeId);
    }
  }

  // ==================== 任务操作 ====================

  async delegateTask(taskId: string, params: DelegateTaskParams): Promise<void> {
    await taskService.delegateTask(taskId, params);
    this.eventBus.emit('task.delegated', { taskId, params, timestamp: new Date() });
  }

  async transferTask(taskId: string, params: TransferTaskParams): Promise<void> {
    await taskService.transferTask(taskId, params);
    this.eventBus.emit('task.transferred', { taskId, params, timestamp: new Date() });
  }

  async claimTask(taskId: string, userId: string, userName: string): Promise<void> {
    await taskService.claimTask(taskId, userId, userName);
    this.eventBus.emit('task.claimed', { taskId, userId, userName, timestamp: new Date() });
  }

  async terminateProcess(instanceId: string, reason?: string, operator?: { id: string; name: string }): Promise<void> {
    await instanceService.terminateInstance(instanceId);
    
    if (this.config.enableExecutionLog) {
      await executionLogger.log({
        executionId: uuidv4(),
        action: 'process_terminate',
        instanceId,
        reason,
        operator,
        timestamp: new Date()
      });
    }
    
    this.eventBus.emit('process.terminated', { 
      instanceId, 
      reason, 
      operator,
      timestamp: new Date() 
    });
  }

  // ==================== 流程恢复 ====================

  async resumeProcess(instanceId: string, fromNodeId?: string): Promise<void> {
    const instance = await instanceService.getInstance(instanceId);
    if (!instance) {
      throw new Error('流程实例不存在');
    }

    if (instance.status !== 'suspended') {
      throw new Error('流程实例未处于挂起状态');
    }

    // 恢复流程状态
    await instanceService.updateInstanceStatus(instanceId, 'running');
    
    const definition = await this.getCachedDefinitionById(instance.definition_id);
    
    // 从指定节点或最后一个活动节点继续
    const resumeNodeId = fromNodeId || await this.findLastActiveNode(instanceId);
    
    if (resumeNodeId) {
      await this.continueExecution(instance, definition, resumeNodeId);
    }

    this.eventBus.emit('process.resumed', { 
      instanceId, 
      fromNodeId: resumeNodeId,
      timestamp: new Date() 
    });
  }

  // ==================== 节点执行 ====================

  private async executeStartEvent(instance: WorkflowInstance, definition: WorkflowDefinition): Promise<void> {
    const startNode = definition.node_config.nodes.find(
      (node: WorkflowNode) => node.type === 'startEvent'
    );

    if (!startNode) {
      throw new Error('流程定义缺少开始节点');
    }

    await this.continueExecution(instance, definition, startNode.id);
  }

  private async continueExecution(
    instance: WorkflowInstance, 
    definition: WorkflowDefinition, 
    currentNodeId: string,
    executionId?: string
  ): Promise<void> {
    const currentNode = definition.node_config.nodes.find(
      (node: WorkflowNode) => node.id === currentNodeId
    );

    if (!currentNode) {
      throw new Error(`节点 ${currentNodeId} 不存在`);
    }

    // 记录节点执行
    if (this.config.enableExecutionLog) {
      await executionLogger.log({
        executionId: executionId || uuidv4(),
        action: 'node_execute',
        instanceId: instance.id,
        nodeId: currentNode.id,
        nodeType: currentNode.type,
        nodeName: currentNode.name,
        timestamp: new Date()
      });
    }

    // 根据节点类型执行
    switch (currentNode.type) {
      case 'startEvent':
        await this.executeGatewayOrUserTask(instance, definition, currentNode);
        break;
      
      case 'endEvent':
        // 结束节点 - 直接结束流程
        console.log(`[EnhancedWorkflowEngine] 执行结束节点: ${currentNode.name}`);
        await this.endInstance(instance.id, 'approved');
        break;
      
      case 'userTask':
        await this.executeUserTask(instance, definition, currentNode);
        break;
      
      case 'exclusiveGateway':
        await this.executeExclusiveGateway(instance, definition, currentNode);
        break;
      
      case 'parallelGateway':
        await this.executeParallelGateway(instance, definition, currentNode);
        break;
      
      case 'inclusiveGateway':
        await this.executeInclusiveGateway(instance, definition, currentNode);
        break;
      
      case 'serviceTask':
        await this.executeServiceTask(instance, definition, currentNode);
        break;
      
      default:
        console.warn(`未处理的节点类型: ${currentNode.type}`);
    }
  }

  private async executeGatewayOrUserTask(
    instance: WorkflowInstance, 
    definition: WorkflowDefinition, 
    currentNode: WorkflowNode
  ): Promise<void> {
    const nextNodes = await this.findNextNodes(definition, currentNode.id);

    for (const nextNodeId of nextNodes) {
      await this.continueExecution(instance, definition, nextNodeId);
    }
  }

  private async executeUserTask(
    instance: WorkflowInstance, 
    definition: WorkflowDefinition, 
    node: WorkflowNode
  ): Promise<void> {
    let approvalConfig = node.config?.approvalConfig || node.approvalConfig;
    
    // 如果没有标准的approvalConfig，尝试从node.config.assignee获取
    if (!approvalConfig && node.config?.assignee) {
      approvalConfig = {
        approvalType: 'single',
        approverSource: node.config.assignee
      };
    }
    
    if (!approvalConfig) {
      console.error(`[EnhancedWorkflowEngine] 节点 ${node.name} (${node.id}) 缺少审批配置，自动跳过`);
      console.error(`[EnhancedWorkflowEngine] 节点完整配置:`, JSON.stringify(node.config, null, 2));
      
      // 自动跳过该节点
      await this.updateCurrentNode(instance.id, node.id, node.name);
      const nextNodes = await this.findNextNodes(definition, node.id);
      if (nextNodes.length > 0) {
        await this.continueExecution(instance, definition, nextNodes[0]);
        return;
      } else {
        await this.endInstance(instance.id, 'completed');
        return;
      }
    }

    const context: ProcessContext = {
      process: instance,
      definition,
      variables: instance.variables,
      formData: instance.variables?.formData || {},
      initiator: { id: instance.initiator_id, name: instance.initiator_name }
    };

    let approvers: any[] = [];
    try {
      approvers = await this.resolveApproversWithCache(node, approvalConfig.approverSource, context);
    } catch (error) {
      console.error(`[EnhancedWorkflowEngine] 节点 ${node.name} (${node.id}) 解析审批人失败:`, error);
      console.error(`[EnhancedWorkflowEngine] 审批人来源配置:`, JSON.stringify(approvalConfig.approverSource, null, 2));
    }

    if (approvers.length === 0) {
      console.log(`[EnhancedWorkflowEngine] 节点 ${node.name} (${node.id}) 无法解析审批人，创建任务给发起人`);
      console.log(`[EnhancedWorkflowEngine] 审批人来源:`, JSON.stringify(approvalConfig.approverSource, null, 2));
      
      // 更新当前节点为正在处理的节点
      await this.updateCurrentNode(instance.id, node.id, node.name);
      
      // 创建任务给流程发起人
      await taskService.createTask({
        instanceId: instance.id,
        nodeId: node.id,
        name: node.name + '（需要指定审批人）',
        description: `无法自动解析审批人，请手动指定审批人后重新提交。审批人来源: ${JSON.stringify(approvalConfig.approverSource)}`,
        assigneeId: instance.initiator_id,
        assigneeName: instance.initiator_name,
        priority: 50,
        variables: {
          approvalType: approvalConfig.approvalType,
          needsManualApprover: true,
          approverSource: approvalConfig.approverSource
        }
      });
      
      return;
    }

    const approvalMode = (approvalConfig as any).approvalMode || 'or_sign';
    const voteThreshold = (approvalConfig as any).voteThreshold || 1;

    // 更新当前节点信息
    await this.updateCurrentNode(instance.id, node.id, node.name);

    if (approvers.length === 1 || approvalMode === 'or_sign') {
      const task = await taskService.createTask({
        instanceId: instance.id,
        nodeId: node.id,
        name: node.name,
        description: approvalConfig.skipCondition,
        assigneeId: approvers[0].id,
        assigneeName: approvers[0].name,
        candidateUsers: approvers.slice(1).map(a => a.id),
        priority: 50,
        variables: {
          approvers,
          approvalType: approvalConfig.approvalType,
          approvalMode,
          voteThreshold
        }
      });

      this.eventBus.emit('task.created', task);
    } else {
      for (const approver of approvers) {
        const task = await taskService.createTask({
          instanceId: instance.id,
          nodeId: node.id,
          name: node.name,
          description: approvalConfig.skipCondition,
          assigneeId: approver.id,
          assigneeName: approver.name,
          priority: 50,
          variables: {
            approvers,
            approvalType: approvalConfig.approvalType,
            approvalMode,
            voteThreshold,
            multiApproval: true
          }
        });

        this.eventBus.emit('task.created', task);
      }
    }
  }

  private async executeExclusiveGateway(
    instance: WorkflowInstance,
    definition: WorkflowDefinition,
    node: WorkflowNode
  ): Promise<void> {
    // 更新当前节点信息
    await this.updateCurrentNode(instance.id, node.id, node.name);

    const context: ProcessContext = {
      process: instance,
      definition,
      variables: instance.variables,
      formData: instance.variables.formData || {},
      initiator: { id: instance.initiator_id, name: instance.initiator_name }
    };

    const targetNodes = await gatewayHandler.handleExclusiveGateway(node, context);

    for (const targetNodeId of targetNodes) {
      await this.continueExecution(instance, definition, targetNodeId);
    }
  }

  private async executeParallelGateway(
    instance: WorkflowInstance,
    definition: WorkflowDefinition,
    node: WorkflowNode
  ): Promise<void> {
    // 更新当前节点信息
    await this.updateCurrentNode(instance.id, node.id, node.name);

    const context: ProcessContext = {
      process: instance,
      definition,
      variables: instance.variables,
      formData: instance.variables.formData || {},
      initiator: { id: instance.initiator_id, name: instance.initiator_name }
    };

    const targetNodes = await gatewayHandler.handleParallelGateway(node, context);

    for (const targetNodeId of targetNodes) {
      await instanceService.createExecution({
        instanceId: instance.id,
        nodeId: node.id,
        parentId: node.id
      });

      await this.continueExecution(instance, definition, targetNodeId);
    }
  }

  private async executeInclusiveGateway(
    instance: WorkflowInstance,
    definition: WorkflowDefinition,
    node: WorkflowNode
  ): Promise<void> {
    // 更新当前节点信息
    await this.updateCurrentNode(instance.id, node.id, node.name);

    const context: ProcessContext = {
      process: instance,
      definition,
      variables: instance.variables,
      formData: instance.variables.formData || {},
      initiator: { id: instance.initiator_id, name: instance.initiator_name }
    };

    const targetNodes = await gatewayHandler.handleInclusiveGateway(node, context);

    for (const targetNodeId of targetNodes) {
      await this.continueExecution(instance, definition, targetNodeId);
    }
  }

  private async executeServiceTask(
    instance: WorkflowInstance,
    definition: WorkflowDefinition,
    node: WorkflowNode
  ): Promise<void> {
    console.log(`[EnhancedWorkflowEngine] 执行服务任务: ${node.name}`);

    // 更新当前节点信息
    await this.updateCurrentNode(instance.id, node.id, node.name);

    const serviceType = node.config?.serviceType;
    const serviceConfig = node.config?.serviceConfig;

    console.log(`[EnhancedWorkflowEngine] 服务类型: ${serviceType}, 节点ID: ${node.id}`);

    try {
      // 如果serviceType未定义，根据节点ID判断服务类型
      if (serviceType === 'createEmployee' || node.id === 'create-employee') {
        await this.executeCreateEmployeeService(instance, serviceConfig);
      }

      await this.executeGatewayOrUserTask(instance, definition, node);
    } catch (error) {
      console.error(`[EnhancedWorkflowEngine] 服务任务执行失败:`, error);
      throw error;
    }
  }

  /**
   * 执行创建员工服务任务
   */
  private async executeCreateEmployeeService(
    instance: WorkflowInstance,
    config: any
  ): Promise<void> {
    try {
      console.log('[EnhancedWorkflowEngine] 开始执行创建员工服务任务');
      
      const formData = instance.variables?.formData || {};
      
      console.log('[EnhancedWorkflowEngine] formData:', JSON.stringify(formData));
      
      // 直接从表单数据提取员工信息（不再依赖dataMapping）
      const employeeName = formData.employee_name;
      const employeeNo = formData.employee_id;
      const departmentId = formData.department_id;
      const positionId = formData.position_id;
      const hireDate = formData.start_date;
      const email = formData.email || '';
      const phone = formData.phone || '';
      
      console.log('[EnhancedWorkflowEngine] 解析后的数据:', { employeeName, employeeNo, departmentId, positionId, hireDate });
      
      if (!employeeName) {
        console.error('[EnhancedWorkflowEngine] 员工姓名为空，无法创建员工记录');
        return;
      }
      
      // 生成拼音用户名
      console.log('[EnhancedWorkflowEngine] 开始生成拼音用户名');
      const username = await this.generatePinyinUsername(employeeName);
      console.log('[EnhancedWorkflowEngine] 生成的用户名:', username);
      
      // 1. 创建员工记录
      // 注意：employees表使用position字段存储岗位名称，不是position_id
      const employeeId = uuidv4();
      await db.execute(
        `INSERT INTO employees (id, name, employee_no, department_id, position, email, phone, hire_date, status, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [employeeId, employeeName, employeeNo, departmentId, positionId, email, phone, hireDate, 'active']
      );
      console.log(`[EnhancedWorkflowEngine] 员工记录创建成功: ${employeeName} (${employeeId})`);
      
      // 2. 创建用户账号
      const userId = uuidv4();
      const defaultPassword = '123456'; // 默认密码
      await db.execute(
        `INSERT INTO users (id, username, password, name, email, role, status, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [userId, username, defaultPassword, employeeName, email, 'user', 'active']
      );
      console.log(`[EnhancedWorkflowEngine] 用户账号创建成功: ${username} (${userId})`);
      
      // 3. 关联用户账号到员工记录
      await db.execute(
        `UPDATE employees SET user_id = ? WHERE id = ?`,
        [userId, employeeId]
      );
      console.log(`[EnhancedWorkflowEngine] 员工记录已关联用户账号: ${employeeId} -> ${userId}`);
      
      // 记录执行日志
      if (this.config.enableExecutionLog) {
        await executionLogger.log({
          executionId: uuidv4(),
          action: 'create_employee_and_user',
          instanceId: instance.id,
          details: { employeeId, userId, username, employeeName },
          timestamp: new Date()
        });
      }
      
    } catch (error) {
      console.error('[EnhancedWorkflowEngine] 创建员工和用户失败:', error);
      throw error;
    }
  }

  /**
   * 解析数据映射
   */
  private resolveDataMapping(mapping: string, formData: any): any {
    if (!mapping) return null;
    
    // 处理 ${formData.xxx} 格式
    const match = mapping.match(/^\$\{formData\.(\w+)\}$/);
    if (match) {
      return formData[match[1]];
    }
    
    // 直接返回值
    return mapping;
  }

  /**
   * 生成拼音用户名
   */
  private async generatePinyinUsername(name: string): Promise<string> {
    // 转换为拼音（小写，无空格）
    const py = pinyin(name, {
      style: 'normal', // 普通风格，不带声调
      heteronym: false // 不启用多音字
    });
    
    let baseUsername = py.map((item: string[]) => item[0]).join('').toLowerCase();
    
    // 移除特殊字符，只保留字母和数字
    baseUsername = baseUsername.replace(/[^a-z0-9]/g, '');
    
    if (!baseUsername) {
      baseUsername = 'user';
    }
    
    // 检查用户名是否已存在
    let username = baseUsername;
    let counter = 1;
    
    while (await this.isUsernameExists(username)) {
      username = `${baseUsername}${counter}`;
      counter++;
    }
    
    return username;
  }

  /**
   * 检查用户名是否已存在
   */
  private async isUsernameExists(username: string): Promise<boolean> {
    const result = await db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM users WHERE username = ?',
      [username]
    );
    return result ? result.count > 0 : false;
  }

  // ==================== 缓存管理 ====================

  private async getCachedDefinition(processKey: string): Promise<WorkflowDefinition> {
    const cacheKey = `latest_${processKey}`;
    const cached = this.definitionCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
      this.metrics.cacheHitRate = (this.metrics.cacheHitRate * 99 + 1) / 100;
      return cached.value;
    }

    const definition = await definitionService.getLatestDefinition(processKey);
    if (!definition) {
      throw new Error('流程定义不存在');
    }

    this.definitionCache.set(cacheKey, { value: definition, timestamp: Date.now() });
    this.definitionCache.set(definition.id, { value: definition, timestamp: Date.now() });
    
    this.cleanupCache();
    
    return definition;
  }

  private async getCachedDefinitionById(definitionId: string): Promise<WorkflowDefinition> {
    const cached = this.definitionCache.get(definitionId);
    
    if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
      return cached.value;
    }

    const definition = await definitionService.getDefinition(definitionId);
    if (!definition) {
      throw new Error('流程定义不存在');
    }

    this.definitionCache.set(definitionId, { value: definition, timestamp: Date.now() });
    
    return definition;
  }

  private async resolveApproversWithCache(
    node: WorkflowNode,
    approverSource: any,
    context: ProcessContext
  ): Promise<any[]> {
    const cacheKey = `${node.id}_${JSON.stringify(approverSource)}_${JSON.stringify(context.formData)}`;
    const cached = this.approverCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
      return cached.value;
    }

    const approvers = await approverResolver.resolveApprovers(approverSource, context);
    
    this.approverCache.set(cacheKey, { value: approvers, timestamp: Date.now() });
    this.cleanupApproverCache();
    
    return approvers;
  }

  private async findNextNodes(definition: WorkflowDefinition, nodeId: string): Promise<string[]> {
    let definitionCache = this.nextNodesCache.get(definition.id);
    if (!definitionCache) {
      definitionCache = new Map();
      this.nextNodesCache.set(definition.id, definitionCache);
    }

    let nextNodes = definitionCache.get(nodeId);
    if (!nextNodes) {
      nextNodes = [];
      if (definition.node_config?.edges) {
        for (const edge of definition.node_config.edges) {
          if (edge.source === nodeId) {
            nextNodes.push(edge.target);
          }
        }
      }
      definitionCache.set(nodeId, nextNodes);
    }

    return nextNodes;
  }

  private cleanupCache(): void {
    if (this.definitionCache.size > this.config.cacheSize) {
      const entries = Array.from(this.definitionCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toDelete = entries.slice(0, Math.floor(this.config.cacheSize * 0.2));
      for (const [key] of toDelete) {
        this.definitionCache.delete(key);
      }
    }
  }

  private cleanupApproverCache(): void {
    if (this.approverCache.size > this.config.cacheSize) {
      const entries = Array.from(this.approverCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toDelete = entries.slice(0, Math.floor(this.config.cacheSize * 0.2));
      for (const [key] of toDelete) {
        this.approverCache.delete(key);
      }
    }
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      
      for (const [key, item] of this.definitionCache.entries()) {
        if (now - item.timestamp > this.config.cacheTTL) {
          this.definitionCache.delete(key);
        }
      }
      
      for (const [key, item] of this.approverCache.entries()) {
        if (now - item.timestamp > this.config.cacheTTL) {
          this.approverCache.delete(key);
        }
      }
    }, 60000); // 每分钟清理一次
  }

  // ==================== 重试机制 ====================

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    executionId: string,
    operation: string
  ): Promise<T> {
    let attempts = 0;
    
    while (attempts < this.config.retryAttempts) {
      try {
        return await fn();
      } catch (error) {
        attempts++;
        
        if (attempts >= this.config.retryAttempts) {
          throw error;
        }
        
        console.log(`[EnhancedWorkflowEngine] ${operation} 失败，第 ${attempts} 次重试...`);
        await this.delay(this.config.retryDelay * attempts);
      }
    }
    
    throw new Error(`${operation} 执行失败，已重试 ${attempts} 次`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== 辅助方法 ====================

  private async endInstance(instanceId: string, result: string): Promise<void> {
    console.log(`[EnhancedWorkflowEngine] endInstance 被调用: instanceId=${instanceId}, result=${result}`);
    await this.clearCurrentNode(instanceId);
    await instanceService.endInstance(instanceId, result as any);
    console.log(`[EnhancedWorkflowEngine] 准备触发 process.ended 事件: instanceId=${instanceId}, result=${result}`);
    this.eventBus.emit('process.ended', { instanceId, result, timestamp: new Date() });
    console.log(`[EnhancedWorkflowEngine] process.ended 事件已触发`);
  }

  private async updateCurrentNode(instanceId: string, nodeId: string, nodeName: string): Promise<void> {
    await db.update(
      `UPDATE workflow_instances SET current_node_id = ?, current_node_name = ? WHERE id = ?`,
      [nodeId, nodeName, instanceId]
    );
  }

  private async clearCurrentNode(instanceId: string): Promise<void> {
    await db.update(
      `UPDATE workflow_instances SET current_node_id = NULL, current_node_name = NULL WHERE id = ?`,
      [instanceId]
    );
  }

  private async findLastActiveNode(instanceId: string): Promise<string | null> {
    const tasks = await taskService.getTasksByInstance(instanceId);
    const activeTask = tasks.find(t => ['created', 'assigned', 'in_progress'].includes(t.status));
    return activeTask?.node_id || null;
  }

  private updateMetrics(success: boolean, duration: number): void {
    if (success) {
      this.metrics.successfulExecutions++;
    } else {
      this.metrics.failedExecutions++;
    }
    
    this.metrics.avgExecutionTime = 
      (this.metrics.avgExecutionTime * (this.metrics.totalExecutions - 1) + duration) / 
      this.metrics.totalExecutions;
  }

  // ==================== 事件订阅 ====================

  on(event: string, listener: (...args: any[]) => void): void {
    this.eventBus.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.eventBus.off(event, listener);
  }

  once(event: string, listener: (...args: any[]) => void): void {
    this.eventBus.once(event, listener);
  }

  getEventBus(): EventEmitter {
    return this.eventBus;
  }

  // ==================== 管理员干预功能 ====================

  // 强制跳转到指定节点
  async jumpToNode(
    instanceId: string,
    targetNodeId: string,
    operator: { id: string; name: string },
    reason?: string
  ): Promise<void> {
    const instance = await instanceService.getInstance(instanceId);
    if (!instance) {
      throw new Error('流程实例不存在');
    }

    if (instance.status !== 'running') {
      throw new Error('流程实例未在运行状态，无法跳转');
    }

    const definition = await this.getCachedDefinitionById(instance.definition_id);
    const targetNode = definition.node_config.nodes.find((n: WorkflowNode) => n.id === targetNodeId);
    
    if (!targetNode) {
      throw new Error('目标节点不存在');
    }

    // 取消当前活动的任务
    await this.cancelActiveTasks(instanceId, operator, reason);

    // 记录干预操作
    if (this.config.enableExecutionLog) {
      await executionLogger.log({
        executionId: uuidv4(),
        action: 'admin_jump',
        instanceId,
        nodeId: targetNodeId,
        operator,
        reason,
        metadata: { fromNode: await this.findLastActiveNode(instanceId) },
        timestamp: new Date()
      });
    }

    // 继续执行到目标节点
    await this.continueExecution(instance, definition, targetNodeId);

    this.eventBus.emit('process.jumped', {
      instanceId,
      targetNodeId,
      operator,
      reason,
      timestamp: new Date()
    });
  }

  // 回退到上一个节点
  async rollbackToPreviousNode(
    instanceId: string,
    operator: { id: string; name: string },
    reason?: string
  ): Promise<void> {
    const instance = await instanceService.getInstance(instanceId);
    if (!instance) {
      throw new Error('流程实例不存在');
    }

    // 获取当前活动节点
    const currentNodeId = await this.findLastActiveNode(instanceId);
    if (!currentNodeId) {
      throw new Error('未找到当前活动节点');
    }

    const definition = await this.getCachedDefinitionById(instance.definition_id);
    
    // 查找前一个节点（通过边反向查找）
    const previousNodeId = this.findPreviousNode(definition, currentNodeId);
    if (!previousNodeId) {
      throw new Error('未找到前一个节点，无法回退');
    }

    // 取消当前活动的任务
    await this.cancelActiveTasks(instanceId, operator, reason);

    // 记录回退操作
    if (this.config.enableExecutionLog) {
      await executionLogger.log({
        executionId: uuidv4(),
        action: 'admin_rollback',
        instanceId,
        nodeId: previousNodeId,
        operator,
        reason,
        metadata: { fromNode: currentNodeId },
        timestamp: new Date()
      });
    }

    // 继续执行到前一个节点
    await this.continueExecution(instance, definition, previousNodeId);

    this.eventBus.emit('process.rolled_back', {
      instanceId,
      fromNodeId: currentNodeId,
      toNodeId: previousNodeId,
      operator,
      reason,
      timestamp: new Date()
    });
  }

  // 强制完成任务（管理员直接通过或拒绝）
  async forceCompleteTask(
    taskId: string,
    result: 'approved' | 'rejected',
    operator: { id: string; name: string },
    comment?: string
  ): Promise<void> {
    const task = await taskService.getTask(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    const instance = await instanceService.getInstance(task.instance_id);
    if (!instance) {
      throw new Error('流程实例不存在');
    }

    // 记录强制完成操作
    if (this.config.enableExecutionLog) {
      await executionLogger.log({
        executionId: uuidv4(),
        action: 'admin_force_complete',
        instanceId: instance.id,
        taskId,
        operator,
        result,
        comment,
        timestamp: new Date()
      });
    }

    // 完成任务
    await taskService.completeTask(taskId, {
      action: result === 'approved' ? 'approve' : 'reject',
      comment: `[管理员强制${result === 'approved' ? '通过' : '拒绝'}] ${comment || ''}`,
      operator
    });

    this.eventBus.emit('task.force_completed', {
      taskId,
      result,
      operator,
      timestamp: new Date()
    });

    // 继续流程执行
    if (result === 'rejected') {
      await this.endInstance(instance.id, 'rejected');
    } else {
      const definition = await this.getCachedDefinitionById(instance.definition_id);
      await this.continueExecution(instance, definition, task.node_id);
    }
  }

  // 强制关闭流程
  async forceCloseProcess(
    instanceId: string,
    operator: { id: string; name: string },
    reason?: string
  ): Promise<void> {
    const instance = await instanceService.getInstance(instanceId);
    if (!instance) {
      throw new Error('流程实例不存在');
    }

    // 取消所有活动任务
    await this.cancelActiveTasks(instanceId, operator, reason);

    // 结束流程实例
    await instanceService.endInstance(instanceId, 'terminated', operator, reason);

    // 记录强制关闭操作
    if (this.config.enableExecutionLog) {
      await executionLogger.log({
        executionId: uuidv4(),
        action: 'admin_force_close',
        instanceId,
        operator,
        reason,
        timestamp: new Date()
      });
    }

    this.eventBus.emit('process.force_closed', {
      instanceId,
      operator,
      reason,
      timestamp: new Date()
    });
  }

  // 重新分配任务
  async reassignTask(
    taskId: string,
    newAssignee: { id: string; name: string },
    operator: { id: string; name: string },
    reason?: string
  ): Promise<void> {
    const task = await taskService.getTask(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    await taskService.reassignTask(taskId, newAssignee);

    // 记录重新分配操作
    if (this.config.enableExecutionLog) {
      await executionLogger.log({
        executionId: uuidv4(),
        action: 'admin_reassign',
        instanceId: task.instance_id,
        taskId,
        operator,
        reason,
        metadata: { 
          oldAssignee: { id: task.assignee_id, name: task.assignee_name },
          newAssignee 
        },
        timestamp: new Date()
      });
    }

    this.eventBus.emit('task.reassigned', {
      taskId,
      oldAssignee: { id: task.assignee_id, name: task.assignee_name },
      newAssignee,
      operator,
      timestamp: new Date()
    });
  }

  // 获取所有流程实例（管理员用）
  async getAllInstances(params?: {
    status?: string;
    processKey?: string;
    category?: string;
    startTime?: Date;
    endTime?: Date;
    page?: number;
    pageSize?: number;
  }): Promise<{ instances: WorkflowInstance[]; total: number }> {
    return instanceService.getAllInstances(params);
  }

  // 获取流程统计（管理员用）
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
    return instanceService.getProcessStatistics(params);
  }

  // 获取实时流程监控数据
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
    return instanceService.getRealtimeMonitoring();
  }

  // 辅助方法：取消活动任务
  private async cancelActiveTasks(
    instanceId: string,
    operator: { id: string; name: string },
    reason?: string
  ): Promise<void> {
    const tasks = await taskService.getTasksByInstance(instanceId, ['created', 'assigned', 'in_progress']);
    
    for (const task of tasks) {
      await taskService.cancelTask(task.id, `[管理员干预] ${reason || ''}`);
      
      if (this.config.enableExecutionLog) {
        await executionLogger.log({
          executionId: uuidv4(),
          action: 'task_cancelled_by_admin',
          instanceId,
          taskId: task.id,
          operator,
          reason,
          timestamp: new Date()
        });
      }
    }
  }

  // 辅助方法：查找前一个节点
  private findPreviousNode(definition: WorkflowDefinition, nodeId: string): string | null {
    if (!definition.node_config?.edges) return null;
    
    const edge = definition.node_config.edges.find(e => e.target === nodeId);
    return edge?.source || null;
  }

  // ==================== 查询方法 ====================

  async getProcessInstance(instanceId: string): Promise<WorkflowInstance | null> {
    return instanceService.getInstance(instanceId);
  }

  async getTasksByInstance(instanceId: string): Promise<WorkflowTask[]> {
    return taskService.getTasksByInstance(instanceId);
  }

  async getTasksByAssignee(assigneeId: string): Promise<WorkflowTask[]> {
    return taskService.getTasksByAssignee(assigneeId, ['created', 'assigned', 'in_progress']);
  }

  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  clearCache(): void {
    this.definitionCache.clear();
    this.approverCache.clear();
    this.nextNodesCache.clear();
  }

  // 兼容基础引擎的 getProcessMetrics 方法
  async getProcessMetrics(processKey?: string): Promise<any> {
    const stats = await this.getProcessStatistics({ processKey });
    return {
      totalInstances: stats.totalInstances,
      runningInstances: stats.byStatus.running,
      completedInstances: stats.byStatus.completed,
      avgDuration: stats.avgDuration
    };
  }
}

// 导出单例
export const enhancedWorkflowEngine = new EnhancedWorkflowEngine();
