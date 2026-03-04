import { Router } from 'express'
import { db } from '../database/connection.js'

const router = Router()

router.get('/table-structure/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params
    const columns = await db.query(
      `SHOW COLUMNS FROM ${tableName}`
    )
    
    res.json({ success: true, data: columns })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/add-category-field', async (req, res) => {
  try {
    try {
      await db.execute(
        `ALTER TABLE workflow_instances 
         ADD COLUMN category VARCHAR(50) COMMENT '流程分类' AFTER definition_version`
      )
      res.json({ success: true, message: '成功添加 category 字段' })
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        res.json({ success: true, message: 'category 字段已存在' })
      } else {
        throw error
      }
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/add-approval-fields', async (req, res) => {
  try {
    const results = []
    
    try {
      await db.execute(
        `ALTER TABLE workflow_tasks 
         ADD COLUMN approval_mode ENUM('or_sign', 'and_sign', 'sequential', 'vote') DEFAULT 'or_sign' COMMENT '审批模式：or_sign/and_sign/sequential/vote' AFTER status`
      )
      results.push({ field: 'approval_mode', status: 'success' })
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        results.push({ field: 'approval_mode', status: 'skipped', reason: 'Already exists' })
      } else {
        results.push({ field: 'approval_mode', status: 'error', error: error.message })
      }
    }
    
    try {
      await db.execute(
        `ALTER TABLE workflow_tasks 
         ADD COLUMN vote_threshold INT DEFAULT 1 COMMENT '票决阈值' AFTER approval_mode`
      )
      results.push({ field: 'vote_threshold', status: 'success' })
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        results.push({ field: 'vote_threshold', status: 'skipped', reason: 'Already exists' })
      } else {
        results.push({ field: 'vote_threshold', status: 'error', error: error.message })
      }
    }
    
    res.json({ success: true, message: '审批字段处理完成', results })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router
