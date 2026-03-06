import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { db } from './database/connection.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { performanceMiddleware } from './middleware/performanceMiddleware.js'
import { logger } from './utils/logger.js'
import apiRouter from './routes/index.js'
import performanceRoutes from './routes/performanceRoutes.js'
import formTemplateRoutes from './routes/formTemplateRoutes.js'
import draftRoutes from './routes/draft.js'
import { initUsersTable } from './routes/auth.js'
import { schedulerService } from './services/SchedulerService.js'
import { workflowEventListener } from './services/WorkflowEventListener.js'
import { enhancedWorkflowEngine } from './services/EnhancedWorkflowEngine.js'
import { WorkflowTemplatesService } from './services/WorkflowTemplates.js'
import { definitionService } from './services/DefinitionService.js'
import { metadataService } from './services/MetadataService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.SERVER_PORT || 8080

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
    ]
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('CORS policy violation'))
    }
  }
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(performanceMiddleware)

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
  })
  next()
})

app.use('/api', apiRouter)
app.use('/api/performance', performanceRoutes)
app.use('/api/form-templates', formTemplateRoutes)
app.use('/api/draft', draftRoutes)

app.use('/uploads', express.static(path.join(__dirname, '../../uploads')))

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use(notFoundHandler)
app.use(errorHandler)

async function initializeDefaultWorkflowDefinitions() {
  try {
    logger.info('初始化默认流程定义...')
    
    const templates = WorkflowTemplatesService.getAllTemplates()
    let createdCount = 0
    
    for (const template of templates) {
      const existingDefinition = await definitionService.getLatestDefinition(template.id)
      
      if (!existingDefinition) {
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
        })
        
        logger.info(`创建流程定义: ${template.name}`)
        createdCount++
      }
    }
    
    logger.info(`流程定义初始化完成，共创建 ${createdCount} 个流程定义`)
  } catch (error: any) {
    logger.error('初始化流程定义失败', error)
  }
}

async function startServer() {
  try {
    await db.connect()
    
    await metadataService.load()
    
    await initUsersTable()
    
    await initializeDefaultWorkflowDefinitions()
    
    await schedulerService.start()
    
    workflowEventListener.setupListeners()
    
    const server = app.listen(PORT, () => {
      logger.info(`服务器运行在 http://localhost:${PORT}`)
    })
    
    const gracefulShutdown = async (signal: string) => {
      logger.info(`收到 ${signal} 信号，开始优雅关闭...`)
      
      await schedulerService.stop()
      
      server.close(() => {
        logger.info('服务器已关闭')
        process.exit(0)
      })
      
      setTimeout(() => {
        logger.error('强制关闭服务器')
        process.exit(1)
      }, 10000)
    }
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
    
  } catch (error: any) {
    logger.error('启动服务器失败', error)
    process.exit(1)
  }
}

startServer()

export default app
