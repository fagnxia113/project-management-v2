import { Router } from 'express'
import { db } from '../database/connection.js'
import { WorkflowTemplatesService } from '../services/WorkflowTemplates.js'
import { definitionService } from '../services/DefinitionService.js'

const router = Router()

router.post('/clear-all-workflow-data', async (req, res) => {
  try {
    const { confirm } = req.body
    
    if (confirm !== 'CLEAR_ALL_WORKFLOW_DATA') {
      return res.status(400).json({
        success: false,
        error: '请提供正确的确认码以清空数据'
      })
    }
    
    const tables = [
      'workflow_execution_logs',
      'workflow_instance_history',
      'workflow_task_history',
      'workflow_performance_metrics',
      'workflow_tasks',
      'workflow_instances',
      'workflow_approvals',
      'approvals'
    ]
    
    const results = []
    
    for (const table of tables) {
      try {
        await db.execute(`DELETE FROM ${table}`)
        results.push({ table, status: 'success', message: '已清空' })
      } catch (error: any) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
          results.push({ table, status: 'skipped', message: '表不存在' })
        } else {
          results.push({ table, status: 'error', message: error.message })
        }
      }
    }
    
    res.json({
      success: true,
      message: '流程数据清空完成',
      results
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/update-workflow-form-schema', async (req, res) => {
  try {
    const { confirm, templateId } = req.body
    
    if (confirm !== 'UPDATE_FORM_SCHEMA') {
      return res.status(400).json({
        success: false,
        error: '请提供正确的确认码'
      })
    }
    
    const template = WorkflowTemplatesService.getTemplateById(templateId)
    if (!template) {
      return res.status(404).json({
        success: false,
        error: '模板不存在'
      })
    }
    
    const result = await db.execute(
      `UPDATE workflow_definitions 
       SET form_schema = ?, updated_at = NOW() 
       WHERE \`key\` = ?`,
      [JSON.stringify(template.formSchema), templateId]
    )
    
    res.json({ 
      success: true, 
      message: `流程定义 ${templateId} 的表单字段已更新`,
      affectedRows: result.affectedRows,
      formSchema: template.formSchema
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/run-migration', async (req, res) => {
  try {
    const { confirm, migration } = req.body
    
    if (confirm !== 'RUN_MIGRATION') {
      return res.status(400).json({
        success: false,
        error: '请提供正确的确认码'
      })
    }
    
    if (migration === 'add_skipped_to_instance_result') {
      await db.execute(`
        ALTER TABLE workflow_instances 
        MODIFY COLUMN result ENUM('approved', 'rejected', 'withdrawn', 'terminated', 'skipped') 
        COMMENT '流程结果'
      `)
      
      try {
        await db.execute(`
          ALTER TABLE workflow_instances 
          ADD COLUMN current_node_id VARCHAR(100) COMMENT '当前活动节点ID' AFTER result
        `)
      } catch (e: any) {
        if (e.code !== 'ER_DUP_FIELDNAME') throw e
      }
      
      try {
        await db.execute(`
          ALTER TABLE workflow_instances 
          ADD COLUMN current_node_name VARCHAR(200) COMMENT '当前活动节点名称' AFTER current_node_id
        `)
      } catch (e: any) {
        if (e.code !== 'ER_DUP_FIELDNAME') throw e
      }
      
      res.json({ success: true, message: '迁移执行成功' })
    } else {
      res.status(400).json({ success: false, error: '未知的迁移' })
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router
