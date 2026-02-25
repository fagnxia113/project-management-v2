import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './database/connection.js';
import { metadataService } from './services/MetadataService.js';
import dataRouter from './routes/data.js';
import metadataRouter from './routes/metadata.js';
import workflowRouter from './routes/workflow.js';
import enhancedWorkflowRouter from './routes/enhancedWorkflowRoutes.js';
import authRouter, { initUsersTable } from './routes/auth.js';
import organizationRouter from './routes/organization.js';
import equipmentRouter from './routes/equipment.js';
import projectsRouter from './routes/projects.js';
import workTimeRouter from './routes/work-time.js';
import notificationsRouter from './routes/notifications.js';
import permissionsRouter from './routes/permissions.js';
import { schedulerService } from './services/SchedulerService.js';
import { WorkflowTemplatesService } from './services/WorkflowTemplates.js';
import { definitionService } from './services/DefinitionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.SERVER_PORT || 8080;

// 中间件
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
      'http://127.0.0.1:3003',
      'http://127.0.0.1:5173',
      'https://foqyyjbxijhb.sealosbja.site'
    ];
    // 允许无origin（如Postman）或匹配的origin
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API路由
app.use('/api/data', dataRouter);
app.use('/api/metadata', metadataRouter);
app.use('/api/workflow', workflowRouter);
app.use('/api/workflow/v2', enhancedWorkflowRouter);
app.use('/api/auth', authRouter);
app.use('/api/organization', organizationRouter);
app.use('/api/equipment', equipmentRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/work-time', workTimeRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/permissions', permissionsRouter);

// 数据库迁移路由
app.post('/api/migrate', async (req, res) => {
  try {
    const migrationPath = path.join(__dirname, 'database', 'migrations', '008_workflow_tables_optimization.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    const results = [];
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.execute(statement);
          results.push({ status: 'success', statement: statement.substring(0, 50) + '...' });
        } catch (error: any) {
          if (error.code === 'ER_DUP_ENTRY' || error.code === 'ER_DUP_FIELDNAME') {
            results.push({ status: 'skipped', statement: statement.substring(0, 50) + '...', reason: 'Already exists' });
          } else {
            results.push({ status: 'error', statement: statement.substring(0, 50) + '...', error: error.message });
          }
        }
      }
    }
    
    res.json({ success: true, message: '数据库迁移完成', results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 添加category字段到workflow_instances表
app.post('/api/migrate/009', async (req, res) => {
  try {
    const migrationPath = path.join(__dirname, 'database', 'migrations', '009_add_category_to_instances.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    const results = [];
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.execute(statement);
          results.push({ status: 'success', statement: statement.substring(0, 50) + '...' });
        } catch (error: any) {
          if (error.code === 'ER_DUP_ENTRY' || error.code === 'ER_DUP_FIELDNAME') {
            results.push({ status: 'skipped', statement: statement.substring(0, 50) + '...', reason: 'Already exists' });
          } else {
            results.push({ status: 'error', statement: statement.substring(0, 50) + '...', error: error.message });
          }
        }
      }
    }
    
    res.json({ success: true, message: '数据库迁移完成', results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 检查表结构
app.get('/api/debug/table-structure/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const columns = await db.query(
      `SHOW COLUMNS FROM ${tableName}`
    );
    
    res.json({ success: true, data: columns });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 直接添加category字段
app.post('/api/debug/add-category-field', async (req, res) => {
  try {
    try {
      await db.execute(
        `ALTER TABLE workflow_instances 
         ADD COLUMN category VARCHAR(50) COMMENT '流程分类' AFTER definition_version`
      );
      res.json({ success: true, message: '成功添加 category 字段' });
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        res.json({ success: true, message: 'category 字段已存在' });
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 添加workflow_tasks表的审批相关字段
app.post('/api/debug/add-approval-fields', async (req, res) => {
  try {
    const results = [];
    
    try {
      await db.execute(
        `ALTER TABLE workflow_tasks 
         ADD COLUMN approval_mode ENUM('or_sign', 'and_sign', 'sequential', 'vote') DEFAULT 'or_sign' COMMENT '审批模式：or_sign/and_sign/sequential/vote' AFTER status`
      );
      results.push({ field: 'approval_mode', status: 'success' });
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        results.push({ field: 'approval_mode', status: 'skipped', reason: 'Already exists' });
      } else {
        results.push({ field: 'approval_mode', status: 'error', error: error.message });
      }
    }
    
    try {
      await db.execute(
        `ALTER TABLE workflow_tasks 
         ADD COLUMN vote_threshold INT DEFAULT 1 COMMENT '票决阈值' AFTER approval_mode`
      );
      results.push({ field: 'vote_threshold', status: 'success' });
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        results.push({ field: 'vote_threshold', status: 'skipped', reason: 'Already exists' });
      } else {
        results.push({ field: 'vote_threshold', status: 'error', error: error.message });
      }
    }
    
    res.json({ success: true, message: '审批字段处理完成', results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 更新流程定义数据格式路由
app.post('/api/workflow/update-definitions', async (req, res) => {
  try {
    const definitions = await db.query(
      `SELECT id, \`key\`, category FROM workflow_definitions`
    );
    
    const results = [];
    
    for (const def of definitions) {
      let newCategory = def.category;
      
      if (!newCategory) {
        if (def.key.includes('employee') || def.key.includes('onboard') || def.key.includes('offboard') || def.key.includes('leave') || def.key.includes('trip')) {
          newCategory = 'hr';
        } else if (def.key.includes('project') || def.key.includes('task')) {
          newCategory = 'project';
        } else if (def.key.includes('equipment')) {
          newCategory = 'equipment';
        } else if (def.key.includes('production')) {
          newCategory = 'production';
        } else {
          newCategory = 'general';
        }
        
        if (newCategory !== def.category) {
          await db.execute(
            `UPDATE workflow_definitions SET category = ? WHERE id = ?`,
            [newCategory, def.id]
          );
          results.push({ id: def.id, key: def.key, oldCategory: def.category, newCategory });
        }
      }
    }
    
    res.json({ success: true, message: '流程定义分类更新完成', results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 迁移流程数据路由
app.post('/api/workflow/migrate-data', async (req, res) => {
  try {
    const results: any = {};
    
    // 1. 更新流程实例的category字段
    const instances = await db.query(
      `SELECT i.id, i.definition_id, d.category 
       FROM workflow_instances i
       LEFT JOIN workflow_definitions d ON i.definition_id = d.id
       WHERE i.definition_id IS NOT NULL`
    );
    
    let instanceCount = 0;
    for (const instance of instances) {
      if (instance.category) {
        await db.execute(
          `UPDATE workflow_instances SET category = ? WHERE id = ?`,
          [instance.category, instance.id]
        );
        instanceCount++;
      }
    }
    results.instancesUpdated = instanceCount;
    
    // 2. 更新任务表的approval_mode和vote_threshold字段
    const tasks = await db.query(
      `SELECT id FROM workflow_tasks WHERE approval_mode IS NULL`
    );
    
    for (const task of tasks) {
      await db.execute(
        `UPDATE workflow_tasks 
         SET approval_mode = 'or_sign', vote_threshold = 1 
         WHERE id = ?`,
        [task.id]
      );
    }
    results.tasksUpdated = tasks.length;
    
    // 3. 从任务历史中创建审批记录
    const taskHistory = await db.query(
      `SELECT * FROM workflow_task_history 
       WHERE action IN ('complete', 'approve', 'reject') 
       ORDER BY created_at DESC`
    );
    
    let approvalCount = 0;
    for (const history of taskHistory) {
      const existingApproval = await db.queryOne(
        `SELECT id FROM workflow_approvals 
         WHERE task_id = ? AND approver_id = ?`,
        [history.task_id, history.operator_id]
      );
      
      if (!existingApproval) {
        const approvalId = `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        await db.execute(
          `INSERT INTO workflow_approvals (
            id, task_id, instance_id, node_id, approver_id, approver_name,
            action, comment, approval_time, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            approvalId,
            history.task_id,
            history.instance_id,
            history.node_id,
            history.operator_id,
            history.operator_name,
            history.action === 'complete' ? 'approve' : history.action,
            history.comment,
            history.created_at,
            history.created_at
          ]
        );
        approvalCount++;
      }
    }
    results.approvalsCreated = approvalCount;
    
    // 4. 更新任务的开始时间和结束时间
    const tasksWithoutTime = await db.query(
      `SELECT id, created_at, started_at, completed_at 
       FROM workflow_tasks 
       WHERE started_at IS NULL OR completed_at IS NULL`
    );
    
    for (const task of tasksWithoutTime) {
      await db.execute(
        `UPDATE workflow_tasks 
         SET started_at = COALESCE(?, started_at), completed_at = COALESCE(?, completed_at) 
         WHERE id = ?`,
        [task.created_at, task.completed_at, task.id]
      );
    }
    results.taskTimesUpdated = tasksWithoutTime.length;
    
    res.json({ success: true, message: '流程数据迁移完成', results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 执行日志表迁移路由
app.post('/api/migrate/010', async (req, res) => {
  try {
    const migrationPath = path.join(__dirname, 'database', 'migrations', '010_add_execution_logs.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // 移除注释并分割语句
    const cleanSql = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    
    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    const results = [];
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.execute(statement);
          results.push({ status: 'success', statement: statement.substring(0, 50) + '...' });
        } catch (error: any) {
          if (error.code === 'ER_DUP_ENTRY' || error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_TABLE_EXISTS_ERROR') {
            results.push({ status: 'skipped', statement: statement.substring(0, 50) + '...', reason: 'Already exists' });
          } else {
            results.push({ status: 'error', statement: statement.substring(0, 50) + '...', error: error.message });
          }
        }
      }
    }
    
    res.json({ success: true, message: '执行日志表迁移完成', results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 清空所有流程数据（管理员专用）
app.post('/api/admin/clear-all-workflow-data', async (req, res) => {
  try {
    const { confirm } = req.body;
    
    if (confirm !== 'CLEAR_ALL_WORKFLOW_DATA') {
      return res.status(400).json({
        success: false,
        error: '请提供正确的确认码以清空数据'
      });
    }
    
    // 清空所有流程相关表
    const tables = [
      'workflow_execution_logs',
      'workflow_instance_history',
      'workflow_task_history',
      'workflow_performance_metrics',
      'workflow_tasks',
      'workflow_instances',
      'workflow_approvals',
      'approvals'
    ];
    
    const results = [];
    
    for (const table of tables) {
      try {
        await db.execute(`DELETE FROM ${table}`);
        results.push({ table, status: 'success', message: '已清空' });
      } catch (error: any) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
          results.push({ table, status: 'skipped', message: '表不存在' });
        } else {
          results.push({ table, status: 'error', message: error.message });
        }
      }
    }
    
    res.json({
      success: true,
      message: '流程数据清空完成',
      results
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 更新流程定义的form_schema（管理员专用）
app.post('/api/admin/update-workflow-form-schema', async (req, res) => {
  try {
    const { confirm, templateId } = req.body;
    
    if (confirm !== 'UPDATE_FORM_SCHEMA') {
      return res.status(400).json({
        success: false,
        error: '请提供正确的确认码'
      });
    }
    
    // 从模板获取更新后的form_schema
    const template = WorkflowTemplatesService.getTemplateById(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: '模板不存在'
      });
    }
    
    // 更新数据库中的流程定义
    const result = await db.execute(
      `UPDATE workflow_definitions 
       SET form_schema = ?, updated_at = NOW() 
       WHERE \`key\` = ?`,
      [JSON.stringify(template.formSchema), templateId]
    );
    
    res.json({ 
      success: true, 
      message: `流程定义 ${templateId} 的表单字段已更新`,
      affectedRows: result.affectedRows,
      formSchema: template.formSchema
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 执行数据库迁移（管理员专用）
app.post('/api/admin/run-migration', async (req, res) => {
  try {
    const { confirm, migration } = req.body;
    
    if (confirm !== 'RUN_MIGRATION') {
      return res.status(400).json({
        success: false,
        error: '请提供正确的确认码'
      });
    }
    
    // 执行特定的迁移SQL
    if (migration === 'add_skipped_to_instance_result') {
      await db.execute(`
        ALTER TABLE workflow_instances 
        MODIFY COLUMN result ENUM('approved', 'rejected', 'withdrawn', 'terminated', 'skipped') 
        COMMENT '流程结果'
      `);
      
      // 添加当前节点字段（如果不存在）
      try {
        await db.execute(`
          ALTER TABLE workflow_instances 
          ADD COLUMN current_node_id VARCHAR(100) COMMENT '当前活动节点ID' AFTER result
        `);
      } catch (e: any) {
        if (e.code !== 'ER_DUP_FIELDNAME') throw e;
      }
      
      try {
        await db.execute(`
          ALTER TABLE workflow_instances 
          ADD COLUMN current_node_name VARCHAR(200) COMMENT '当前活动节点名称' AFTER current_node_id
        `);
      } catch (e: any) {
        if (e.code !== 'ER_DUP_FIELDNAME') throw e;
      }
      
      res.json({ success: true, message: '迁移执行成功' });
    } else {
      res.status(400).json({ success: false, error: '未知的迁移' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: `路径 ${req.path} 不存在` });
});

// 错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误', message: err.message });
});

// 初始化默认流程定义
async function initializeDefaultWorkflowDefinitions() {
  try {
    console.log('[Server] 初始化默认流程定义...');
    
    const templates = WorkflowTemplatesService.getAllTemplates();
    let createdCount = 0;
    
    for (const template of templates) {
      // 检查是否已存在该流程定义
      const existingDefinition = await definitionService.getLatestDefinition(template.id);
      
      if (!existingDefinition) {
        // 从模板创建流程定义
        const definition = await definitionService.createDefinition({
          key: template.id,
          name: template.name,
          category: template.category,
          entity_type: template.entityType,
          nodes: template.definition.nodes,
          edges: template.definition.edges,
          form_schema: template.formSchema,
          variables: [],
          created_by: 'system'
        });
        
        // 激活流程定义
        await definitionService.activateDefinition(definition.id);
        
        console.log(`[Server] 创建流程定义: ${template.name} (${template.id})`);
        createdCount++;
      }
    }
    
    console.log(`[Server] 流程定义初始化完成，新建 ${createdCount} 个定义`);
  } catch (error) {
    console.error('[Server] 初始化流程定义失败:', error);
  }
}

// 启动服务器
async function startServer() {
  try {
    // 加载元数据
    await metadataService.load();

    // 连接数据库
    await db.connect();

    // 初始化用户表
    await initUsersTable();
    
    // 初始化默认流程定义
    await initializeDefaultWorkflowDefinitions();

    // 启动定时任务调度服务
    await schedulerService.start();

    // 启动监听
    app.listen(PORT, () => {
      console.log(`
=========================================
  项目管理系统 v2 后端服务启动成功
=========================================
  🚀 服务端口: ${PORT}
  🌐 CORS来源: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}
  📊 数据库: ${process.env.DB_DATABASE || 'project_management_v2'}
  ⏰ 启动时间: ${new Date().toLocaleString('zh-CN')}
=========================================
      `);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n正在关闭服务器...');
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n正在关闭服务器...');
  await db.close();
  process.exit(0);
});

startServer();

export default app;
