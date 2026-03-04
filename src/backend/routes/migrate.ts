import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { db } from '../database/connection.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()

router.post('/', async (req, res) => {
  try {
    const migrationsDir = path.join(__dirname, '..', 'database', 'migrations')
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()
    
    const allResults = []
    
    for (const file of files) {
      try {
        const migrationPath = path.join(migrationsDir, file)
        const sql = fs.readFileSync(migrationPath, 'utf8')
        
        const cleanedSql = sql.replace(/^--.*$/gm, '').trim()
        
        const statements = cleanedSql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0)
        
        const results = []
        
        for (const statement of statements) {
          if (statement.trim()) {
            try {
              await db.execute(statement)
              results.push({ status: 'success', statement: statement.substring(0, 50) + '...' })
            } catch (error: any) {
              if (error.code === 'ER_DUP_ENTRY' || error.code === 'ER_DUP_FIELDNAME') {
                results.push({ status: 'skipped', statement: statement.substring(0, 50) + '...', reason: 'Already exists' })
              } else {
                results.push({ status: 'error', statement: statement.substring(0, 50) + '...', error: error.message })
              }
            }
          }
        }
        
        allResults.push({ file, results })
      } catch (error: any) {
        allResults.push({ file, error: error.message })
      }
    }
    
    res.json({ success: true, message: '数据库迁移完成', results: allResults })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/009', async (req, res) => {
  try {
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '009_add_category_to_instances.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')
    
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    const results = []
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.execute(statement)
          results.push({ status: 'success', statement: statement.substring(0, 50) + '...' })
        } catch (error: any) {
          if (error.code === 'ER_DUP_ENTRY' || error.code === 'ER_DUP_FIELDNAME') {
            results.push({ status: 'skipped', statement: statement.substring(0, 50) + '...', reason: 'Already exists' })
          } else {
            results.push({ status: 'error', statement: statement.substring(0, 50) + '...', error: error.message })
          }
        }
      }
    }
    
    res.json({ success: true, message: '数据库迁移完成', results })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/010', async (req, res) => {
  try {
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '010_add_execution_logs.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')
    
    const cleanSql = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
    
    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)
    
    const results = []
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.execute(statement)
          results.push({ status: 'success', statement: statement.substring(0, 50) + '...' })
        } catch (error: any) {
          if (error.code === 'ER_DUP_ENTRY' || error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_TABLE_EXISTS_ERROR') {
            results.push({ status: 'skipped', statement: statement.substring(0, 50) + '...', reason: 'Already exists' })
          } else {
            results.push({ status: 'error', statement: statement.substring(0, 50) + '...', error: error.message })
          }
        }
      }
    }
    
    res.json({ success: true, message: '执行日志表迁移完成', results })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router
