import { Router } from 'express'
import { db } from '../database/connection.js'

const router = Router()

router.post('/update-definitions', async (req, res) => {
  try {
    const definitions = await db.query(
      `SELECT id, \`key\`, category FROM workflow_definitions`
    )
    
    const results = []
    
    for (const def of definitions) {
      let newCategory = def.category
      
      if (!newCategory) {
        if (def.key.includes('employee') || def.key.includes('onboard') || def.key.includes('offboard') || def.key.includes('leave') || def.key.includes('trip')) {
          newCategory = 'hr'
        } else if (def.key.includes('project') || def.key.includes('task')) {
          newCategory = 'project'
        } else if (def.key.includes('equipment')) {
          newCategory = 'equipment'
        } else if (def.key.includes('production')) {
          newCategory = 'production'
        } else {
          newCategory = 'general'
        }
        
        if (newCategory !== def.category) {
          await db.execute(
            `UPDATE workflow_definitions SET category = ? WHERE id = ?`,
            [newCategory, def.id]
          )
          results.push({ id: def.id, key: def.key, oldCategory: def.category, newCategory })
        }
      }
    }
    
    res.json({ success: true, message: '流程定义分类更新完成', results })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/migrate-data', async (req, res) => {
  try {
    const results: any = {}
    
    const instances = await db.query(
      `SELECT i.id, i.definition_id, d.category 
       FROM workflow_instances i
       LEFT JOIN workflow_definitions d ON i.definition_id = d.id
       WHERE i.definition_id IS NOT NULL`
    )
    
    let instanceCount = 0
    for (const instance of instances) {
      if (instance.category) {
        await db.execute(
          `UPDATE workflow_instances SET category = ? WHERE id = ?`,
          [instance.category, instance.id]
        )
        instanceCount++
      }
    }
    results.instancesUpdated = instanceCount
    
    const tasks = await db.query(
      `SELECT id FROM workflow_tasks WHERE approval_mode IS NULL`
    )
    
    for (const task of tasks) {
      await db.execute(
        `UPDATE workflow_tasks 
         SET approval_mode = 'or_sign', vote_threshold = 1 
         WHERE id = ?`,
        [task.id]
      )
    }
    results.tasksUpdated = tasks.length
    
    const taskHistory = await db.query(
      `SELECT * FROM workflow_task_history 
       WHERE action IN ('complete', 'approve', 'reject') 
       ORDER BY created_at DESC`
    )
    
    let approvalCount = 0
    for (const history of taskHistory) {
      const existingApproval = await db.queryOne(
        `SELECT id FROM workflow_approvals 
         WHERE task_id = ? AND approver_id = ?`,
        [history.task_id, history.operator_id]
      )
      
      if (!existingApproval) {
        const approvalId = `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
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
        )
        approvalCount++
      }
    }
    results.approvalsCreated = approvalCount
    
    const tasksWithoutTime = await db.query(
      `SELECT id, created_at, started_at, completed_at 
       FROM workflow_tasks 
       WHERE started_at IS NULL OR completed_at IS NULL`
    )
    
    for (const task of tasksWithoutTime) {
      await db.execute(
        `UPDATE workflow_tasks 
         SET started_at = COALESCE(?, started_at), completed_at = COALESCE(?, completed_at) 
         WHERE id = ?`,
        [task.created_at, task.completed_at, task.id]
      )
    }
    results.taskTimesUpdated = tasksWithoutTime.length
    
    res.json({ success: true, message: '流程数据迁移完成', results })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router
