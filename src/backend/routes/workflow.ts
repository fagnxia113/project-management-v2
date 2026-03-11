import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { enhancedWorkflowEngine } from '../services/EnhancedWorkflowEngine.js';
import { definitionService } from '../services/DefinitionService.js';
import { instanceService } from '../services/InstanceService.js';
import { taskService } from '../services/TaskService.js';
import { processFormIntegrationService } from '../services/ProcessFormIntegrationService.js';
import { unifiedFormService } from '../services/UnifiedFormService.js';
import WorkflowTemplatesService from '../services/WorkflowTemplates.js';
import { db } from '../database/connection.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';
import { 
  checkWorkflowPermission, 
  checkTaskPermission, 
  validateOperator,
  auditLog 
} from '../middleware/workflowAuthMiddleware.js';

const router = Router();

// 所有工作流路由都需要认证
router.use(authenticate);

// 流程定义相关路由

/**
 * 获取流程定义列表
 * GET /api/workflow/definitions
 */
router.get('/definitions', async (req: Request, res: Response) => {
  try {
    const { category, entity_type, status, page, pageSize } = req.query;
    
    const definitions = await definitionService.getDefinitions({
      category: category as string,
      entity_type: entity_type as string,
      status: status as string,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined
    });
    
    res.json({ success: true, data: definitions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 创建流程定义
 * POST /api/workflow/definitions
 */
router.post('/definitions',
  requireAdmin,
  auditLog('create_definition'),
  async (req: Request, res: Response) => {
    try {
      const { key, name, category, entity_type, bpmn_xml, nodes, edges, form_schema, variables, created_by } = req.body;
      
      const definition = await definitionService.createDefinition({
        key,
        name,
        category,
        entity_type,
        bpmn_xml,
        nodes,
        edges,
        form_schema,
        variables,
        created_by
      });
      
      res.status(201).json({ success: true, data: definition });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

/**
 * 根据Key获取流程定义
 * GET /api/workflow/definitions/key/:key
 */
router.get('/definitions/key/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const definition = await definitionService.getDefinitionByKey(key);
    
    if (!definition) {
      return res.status(404).json({ error: '流程定义不存在' });
    }
    
    res.json({ success: true, data: definition });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取流程定义详情
 * GET /api/workflow/definitions/:id
 */
router.get('/definitions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const definition = await definitionService.getDefinition(id);
    
    if (!definition) {
      return res.status(404).json({ error: '流程定义不存在' });
    }
    
    res.json({ success: true, data: definition });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 更新流程定义
 * PUT /api/workflow/definitions/:id
 */
router.put('/definitions/:id',
  requireAdmin,
  auditLog('update_definition'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { key, name, category, entity_type, nodes, edges, variables } = req.body;
      
      // 添加调试日志
      logger.info('收到前端发送的流程定义数据', { 
        id, 
        key, 
        nodesCount: nodes?.length,
        firstNode: nodes?.[0],
        allNodes: nodes?.map(n => ({ 
          id: n.id, 
          name: n.name, 
          approvalConfig: n.approvalConfig,
          gatewayConfig: n.gatewayConfig,
          serviceConfig: n.serviceConfig,
          formKey: n.formKey,
          config: n.config
        }))
      });
      
      // 构建node_config，将前端的数据结构转换为后端期望的格式
      const node_config = {
        nodes: (nodes || []).map((node: any) => {
          const transformedNode: any = {
            id: node.id,
            type: node.type || 'userTask',
            name: node.name,
            position: node.position
          };
          
          // 如果有 approvalConfig，将其放入 config 对象
          if (node.approvalConfig) {
            transformedNode.config = {
              approvalConfig: { ...node.approvalConfig }
            };
          }
          
          // 如果有 gatewayConfig、serviceConfig、formKey，也放入 config 对象
          if (node.gatewayConfig) {
            transformedNode.config = transformedNode.config || {};
            transformedNode.config.gatewayConfig = node.gatewayConfig;
          }
          if (node.serviceConfig) {
            transformedNode.config = transformedNode.config || {};
            transformedNode.config.serviceConfig = node.serviceConfig;
          }
          if (node.formKey) {
            transformedNode.config = transformedNode.config || {};
            transformedNode.config.formKey = node.formKey;
          }
          
          // 如果已经有 config 对象，合并它（但保留 approvalConfig 的优先级）
          if (node.config) {
            transformedNode.config = transformedNode.config || {};
            transformedNode.config = { ...node.config, ...transformedNode.config };
          }
          
          return transformedNode;
        }),
        edges: edges || []
      };
      
      // 添加调试日志
      logger.info('转换后的节点配置', { 
        nodesCount: node_config.nodes.length,
        allNodes: node_config.nodes.map(n => ({ id: n.id, name: n.name, config: n.config }))
      });
      
      const success = await definitionService.updateDefinition(id, {
        key,
        name,
        category,
        entity_type,
        node_config,
        variables
      });
      
      if (!success) {
        return res.status(404).json({ error: '流程定义不存在' });
      }
      
      // 清除流程引擎缓存，确保使用最新的流程定义
      enhancedWorkflowEngine.clearCache();
      
      // 获取更新后的定义
      const updated = await definitionService.getDefinition(id);
      res.json({ success: true, data: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

/**
 * 激活流程定义
 * POST /api/workflow/definitions/:id/activate
 */
router.post('/definitions/:id/activate',
  requireAdmin,
  auditLog('activate_definition'),
  async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await definitionService.activateDefinition(id);
    
    if (!result) {
      return res.status(404).json({ error: '流程定义不存在' });
    }
    
    res.json({ success: true, message: '流程定义已激活' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 重新加载流程定义
 * POST /api/workflow/definitions/:key/reload
 */
router.post('/definitions/:key/reload',
  requireAdmin,
  auditLog('reload_definition'),
  async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    
    const templates = WorkflowTemplatesService.getAllTemplates();
    const template = templates.find(t => t.id === key);
    
    if (!template) {
      return res.status(404).json({ error: '流程模板不存在' });
    }
    
    const existingDefinition = await definitionService.getLatestDefinition(key);
    
    if (existingDefinition) {
      const success = await definitionService.updateDefinition(existingDefinition.id, {
        node_config: {
          nodes: template.definition.nodes,
          edges: template.definition.edges
        },
        form_schema: template.formSchema
      });
      
      if (!success) {
        return res.status(500).json({ error: '更新流程定义失败' });
      }
      
      enhancedWorkflowEngine.clearCache();
      
      const updated = await definitionService.getDefinition(existingDefinition.id);
      res.json({ success: true, data: updated, message: '流程定义已重新加载' });
    } else {
      const definition = await definitionService.createDefinition({
        key: template.id,
        name: template.name,
        category: template.category,
        entity_type: template.entityType,
        nodes: template.definition.nodes,
        edges: template.definition.edges,
        form_schema: template.formSchema,
        version: 1,
        status: 'active',
      });
      
      res.json({ success: true, data: definition, message: '流程定义已创建' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 删除流程定义
 * DELETE /api/workflow/definitions/:id
 */
router.delete('/definitions/:id',
  requireAdmin,
  auditLog('delete_definition'),
  async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await definitionService.deleteDefinition(id);
    
    if (!result) {
      return res.status(404).json({ error: '流程定义不存在' });
    }
    
    res.json({ success: true, message: '流程定义已删除' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 流程实例相关路由

/**
 * 启动流程实例
 * POST /api/workflow/processes
 */
router.post('/processes',
  auditLog('start_process'),
  async (req: Request, res: Response) => {
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
    
    res.status(201).json({ success: true, data: instance });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取流程实例列表
 * GET /api/workflow/processes
 */
router.get('/processes', async (req: Request, res: Response) => {
  try {
    const { definitionKey, status, initiatorId, page, pageSize } = req.query;
    
    const instances = await instanceService.getInstances({
      definitionKey: definitionKey as string,
      status: status as string,
      initiatorId: initiatorId as string,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined
    });

    // 为每个实例获取当前节点名称
    const instancesWithCurrentNode = await Promise.all(
      instances.map(async (instance) => {
        // 如果实例已完成，根据结果确定节点名称
        if (instance.status === 'completed') {
          const resultLabels: Record<string, string> = {
            'approved': '审批通过',
            'rejected': '审批驳回',
            'withdrawn': '已撤回',
            'terminated': '已终止',
            'skipped': '已跳过'
          };
          return {
            ...instance,
            current_node_name: resultLabels[instance.result || 'approved'] || '已完成'
          };
        }

        // 获取当前活动的任务
        const tasks = await taskService.getTasksByInstance(instance.id);
        const activeTasks = tasks.filter(t => 
          t.status === 'created' || t.status === 'assigned' || t.status === 'in_progress'
        );

        let currentNodeName = '未知';
        let currentAssigneeName = '';
        if (activeTasks.length > 0) {
          // 取第一个活动任务的节点名称和审批人
          currentNodeName = activeTasks[0].name || '处理中';
          currentAssigneeName = activeTasks[0].assignee_name || '';
        }

        return {
          ...instance,
          current_node_name: currentNodeName,
          current_assignee_name: currentAssigneeName
        };
      })
    );
    
    res.json({ success: true, data: instancesWithCurrentNode });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取流程实例详情
 * GET /api/workflow/processes/:id
 */
router.get('/processes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const instance = await enhancedWorkflowEngine.getProcessInstance(id);
    
    if (!instance) {
      return res.status(404).json({ error: '流程实例不存在' });
    }
    
    res.json({ success: true, data: instance });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 根据业务ID获取流程实例
 * GET /api/workflow/processes/business/:businessId
 */
router.get('/processes/business/:businessId', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const instances = await instanceService.getInstances({
      businessId: businessId as string,
      page: 1,
      pageSize: 1
    });
    
    if (instances.data && instances.data.length > 0) {
      const instance = await enhancedWorkflowEngine.getProcessInstance(instances.data[0].id);
      res.json({ success: true, data: instance });
    } else {
      res.json({ success: true, data: null });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 终止流程实例
 * POST /api/workflow/processes/:id/terminate
 */
router.post('/processes/:id/terminate', 
  checkWorkflowPermission({ requireInitiator: true, allowAdmin: true }),
  validateOperator,
  auditLog('terminate_process'),
  async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    await enhancedWorkflowEngine.terminateProcess(id, reason);
    
    res.json({ success: true, message: '流程实例已终止' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 撤回流程实例
 * POST /api/workflow/processes/:id/withdraw
 */
router.post('/processes/:id/withdraw',
  checkWorkflowPermission({ requireInitiator: true, allowAdmin: true }),
  validateOperator,
  auditLog('withdraw_process'),
  async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, operator } = req.body;

    // 获取流程实例
    const instance = await instanceService.getInstance(id);
    if (!instance) {
      return res.status(404).json({ error: '流程实例不存在' });
    }

    // 检查流程状态，只能撤回运行中的流程
    if (instance.status !== 'running') {
      return res.status(400).json({ error: '只能撤回运行中的流程' });
    }

    // 结束流程实例，标记为已撤回
    await instanceService.endInstance(id, 'withdrawn', operator || { id: 'system', name: '系统' }, reason);

    // 取消所有待处理的任务
    const tasks = await taskService.getTasksByInstance(id);
    for (const task of tasks) {
      if (task.status === 'created' || task.status === 'assigned' || task.status === 'in_progress') {
        await taskService.cancelTask(task.id, reason);
      }
    }

    res.json({ success: true, message: '流程已撤回' });
  } catch (error: any) {
    console.error('撤回流程失败:', error);
    res.status(500).json({ error: error.message || '撤回流程失败' });
  }
});

// 任务相关路由

/**
 * 获取我的任务列表
 * GET /api/workflow/my-tasks
 */
router.get('/my-tasks', authenticate, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const userId = req.user!.userId;
    
    const tasks = await enhancedWorkflowEngine.getTasksByAssignee(userId);
    
    let filteredTasks = tasks;
    if (status) {
      const statusArray = Array.isArray(status) ? status : [status];
      filteredTasks = tasks.filter(task => statusArray.includes(task.status));
    }
    
    res.json({ success: true, data: filteredTasks });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取我已完成的任务列表
 * GET /api/workflow/my-completed-tasks
 */
router.get('/my-completed-tasks', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    const authenticatedUserId = req.user!.id;
    
    // 获取所有任务（包括已完成的）
    const tasks = await taskService.getTasksByAssignee(authenticatedUserId, []);
    const completedTasks = tasks.filter(task => 
      task.status === 'completed' || task.status === 'approved' || task.status === 'rejected'
    );
    
    const completedTasksWithDetails = await Promise.all(
      completedTasks.map(async (task) => {
        const instance = await instanceService.getInstance(task.instance_id);
        const taskHistory = await db.queryOne(
          `SELECT action, comment, created_at 
           FROM workflow_task_history 
           WHERE task_id = ? AND action IN ('approve', 'reject') 
           ORDER BY created_at DESC 
           LIMIT 1`,
          [task.id]
        );
        
        return {
          task_id: task.id,
          process_id: task.instance_id,
          process_title: instance?.title || '',
          process_type: instance?.definition_key || '',
          node_name: task.name,
          initiator_name: instance?.initiator_name || '',
          action: taskHistory?.action || 'approved',
          comment: taskHistory?.comment || '',
          completed_at: task.completed_at || task.updated_at,
          form_data: instance?.variables?.formData || {}
        };
      })
    );
    
    res.json({ success: true, data: completedTasksWithDetails });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取任务列表
 * GET /api/workflow/tasks
 */
router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const { instanceId, assigneeId, status } = req.query;
    
    let tasks;
    if (instanceId) {
      tasks = await enhancedWorkflowEngine.getTasksByInstance(instanceId as string);
    } else if (assigneeId) {
      tasks = await enhancedWorkflowEngine.getTasksByAssignee(assigneeId as string);
    } else {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    res.json({ success: true, data: tasks });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 完成任务
 * POST /api/workflow/tasks/:id/complete
 */
router.post('/tasks/:id/complete',
  checkTaskPermission({ requireAssignee: true, allowAdmin: true }),
  validateOperator,
  auditLog('complete_task'),
  async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, comment, variables, operator } = req.body;
    
    await enhancedWorkflowEngine.completeTask(id, {
      action,
      comment,
      variables,
      operator
    });
    
    res.json({ success: true, message: '任务已完成' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 认领任务
 * POST /api/workflow/tasks/:id/claim
 */
router.post('/tasks/:id/claim',
  checkTaskPermission({ requireAssignee: false, allowAdmin: true }),
  auditLog('claim_task'),
  async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, userName } = req.body;
    
    await taskService.claimTask(id, userId, userName);
    
    res.json({ success: true, message: '任务已认领' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 委托任务
 * POST /api/workflow/tasks/:id/delegate
 */
router.post('/tasks/:id/delegate',
  checkTaskPermission({ requireAssignee: true, allowAdmin: true }),
  validateOperator,
  auditLog('delegate_task'),
  async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { targetUser, comment, operator } = req.body;
    
    await enhancedWorkflowEngine.delegateTask(id, {
      targetUser,
      comment,
      operator
    });
    
    res.json({ success: true, message: '任务已委托' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 转办任务
 * POST /api/workflow/tasks/:id/transfer
 */
router.post('/tasks/:id/transfer',
  checkTaskPermission({ requireAssignee: true, allowAdmin: true }),
  validateOperator,
  auditLog('transfer_task'),
  async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { targetUser, comment, operator } = req.body;
    
    await enhancedWorkflowEngine.transferTask(id, {
      targetUser,
      comment,
      operator
    });
    
    res.json({ success: true, message: '任务已转办' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 流程监控路由

/**
 * 获取流程指标
 * GET /api/workflow/metrics
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const { processKey } = req.query;
    
    const metrics = await enhancedWorkflowEngine.getProcessMetrics(processKey as string);
    
    res.json({ success: true, data: metrics });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 流程表单集成路由

/**
 * 获取所有流程表单预设
 * GET /api/workflow/form-presets
 */
router.get('/form-presets', async (req: Request, res: Response) => {
  try {
    const { category, businessType } = req.query;
    
    let presets;
    if (category) {
      presets = processFormIntegrationService.getPresetsByCategory(category as string);
    } else if (businessType) {
      presets = processFormIntegrationService.getPresetsByBusinessType(businessType as string);
    } else {
      presets = processFormIntegrationService.getAllPresets();
    }
    
    res.json({ success: true, data: presets });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取流程表单预设详情
 * GET /api/workflow/form-presets/:id
 */
router.get('/form-presets/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const preset = processFormIntegrationService.getPresetById(id);
    
    if (!preset) {
      return res.status(404).json({ error: '流程表单预设不存在' });
    }
    
    res.json({ success: true, data: preset });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 创建流程表单预设
 * POST /api/workflow/form-presets
 */
router.post('/form-presets',
  requireAdmin,
  auditLog('create_form_preset'),
  async (req: Request, res: Response) => {
  try {
    const { name, category, description, formTemplateKey, workflowTemplateId, businessType, status, defaultVariables } = req.body;
    
    const preset = processFormIntegrationService.createPreset({
      name,
      category,
      description,
      formTemplateKey,
      workflowTemplateId,
      businessType,
      status,
      defaultVariables
    });
    
    res.status(201).json({ success: true, data: preset });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 更新流程表单预设
 * PUT /api/workflow/form-presets/:id
 */
router.put('/form-presets/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const preset = processFormIntegrationService.updatePreset(id, updates);
    
    if (!preset) {
      return res.status(404).json({ error: '流程表单预设不存在' });
    }
    
    res.json({ success: true, data: preset });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 删除流程表单预设
 * DELETE /api/workflow/form-presets/:id
 */
router.delete('/form-presets/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = processFormIntegrationService.deletePreset(id);
    
    if (!result) {
      return res.status(404).json({ error: '流程表单预设不存在' });
    }
    
    res.json({ success: true, message: '流程表单预设已删除' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 激活流程表单预设
 * POST /api/workflow/form-presets/:id/activate
 */
router.post('/form-presets/:id/activate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const preset = processFormIntegrationService.activatePreset(id);
    
    if (!preset) {
      return res.status(404).json({ error: '流程表单预设不存在' });
    }
    
    res.json({ success: true, data: preset, message: '流程表单预设已激活' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 停用流程表单预设
 * POST /api/workflow/form-presets/:id/deactivate
 */
router.post('/form-presets/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const preset = processFormIntegrationService.deactivatePreset(id);
    
    if (!preset) {
      return res.status(404).json({ error: '流程表单预设不存在' });
    }
    
    res.json({ success: true, data: preset, message: '流程表单预设已停用' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 启动流程（包含表单验证）
 * POST /api/workflow/form-presets/:id/start
 */
router.post('/form-presets/:id/start', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { formData, businessKey, businessId, title, initiator, additionalVariables } = req.body;
    
    const result = await processFormIntegrationService.startProcessWithForm({
      presetId: id,
      formData,
      businessKey,
      businessId,
      title,
      initiator,
      additionalVariables
    });
    
    if (result.success) {
      res.status(201).json({ success: true, data: result.data, message: result.message });
    } else {
      res.status(400).json({ success: false, message: result.message, error: result.message, data: result.data });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取流程表单的默认值
 * GET /api/workflow/form-presets/:id/default-values
 */
router.get('/form-presets/:id/default-values', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const defaultValues = processFormIntegrationService.getFormDefaultValues(id);
    
    res.json({ success: true, data: defaultValues });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取流程表单的字段定义
 * GET /api/workflow/form-presets/:id/form-fields
 */
router.get('/form-presets/:id/form-fields', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const formFields = await processFormIntegrationService.getFormFields(id);
    
    res.json({ success: true, data: formFields });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 同步流程表单模板
 * POST /api/workflow/form-presets/:id/sync
 */
router.post('/form-presets/:id/sync', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await processFormIntegrationService.syncProcessFormTemplates(id);
    
    if (result) {
      res.json({ success: true, message: '流程表单模板同步成功' });
    } else {
      res.status(404).json({ error: '流程表单预设不存在' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 统一表单管理路由

/**
 * 获取所有表单模板
 * GET /api/workflow/form-templates
 */
router.get('/form-templates', async (req: Request, res: Response) => {
  try {
    const { module } = req.query;
    
    let templates;
    if (module) {
      templates = unifiedFormService.getTemplatesByModule(module as any);
    } else {
      templates = unifiedFormService.getAllTemplates();
    }
    
    res.json({ success: true, data: templates });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取表单模板详情
 * GET /api/workflow/form-templates/:id
 */
router.get('/form-templates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const template = unifiedFormService.getTemplateById(id);
    
    if (!template) {
      return res.status(404).json({ error: '表单模板不存在' });
    }
    
    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 通过 key 获取表单模板
 * GET /api/workflow/form-templates/key/:key
 */
router.get('/form-templates/key/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const template = unifiedFormService.getTemplateByKey(key);
    
    if (!template) {
      return res.status(404).json({ error: '表单模板不存在' });
    }
    
    console.log(`[DEBUG] 模板 ${key} 的 items.arrayConfig.fields:`);
    const itemsField = template.fields?.find((f: any) => f.name === 'items');
    if (itemsField?.arrayConfig?.fields) {
      itemsField.arrayConfig.fields.forEach((f: any) => {
        if (f.type === 'images' || f.type === 'files' || f.name === 'accessory_list') {
          console.log(`  - ${f.name}: type=${f.type}`);
        }
      });
    }
    
    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 创建表单模板
 * POST /api/workflow/form-templates
 */
router.post('/form-templates', async (req: Request, res: Response) => {
  try {
    const templateData = req.body;
    const template = unifiedFormService.createTemplate(templateData);
    
    res.status(201).json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 更新表单模板
 * PUT /api/workflow/form-templates/:id
 */
router.put('/form-templates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const template = unifiedFormService.updateTemplate(id, updates);
    
    if (!template) {
      return res.status(404).json({ error: '表单模板不存在' });
    }
    
    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 删除表单模板
 * DELETE /api/workflow/form-templates/:id
 */
router.delete('/form-templates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = unifiedFormService.deleteTemplate(id);
    
    if (!result) {
      return res.status(404).json({ error: '表单模板不存在' });
    }
    
    res.json({ success: true, message: '表单模板已删除' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 验证表单数据
 * POST /api/workflow/form-templates/:id/validate
 */
router.post('/form-templates/:id/validate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { formData } = req.body;
    const result = unifiedFormService.validateForm(id, formData);
    
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 处理业务数据联动
 * POST /api/workflow/form-templates/:id/link
 */
router.post('/form-templates/:id/link', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { formData } = req.body;
    const result = await unifiedFormService.handleBusinessLink(id, formData);
    
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
