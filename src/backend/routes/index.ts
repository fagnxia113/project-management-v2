import { Router } from 'express'
import dataRouter from './data.js'
import metadataRouter from './metadata.js'
import workflowRouter from './workflow.js'
import workflowAdminRouter from './workflowAdmin.js'
import enhancedWorkflowRouter from './enhancedWorkflowRoutes.js'
import authRouter from './auth.js'
import organizationRouter from './organization.js'
import employeesRouter from './employees.js'
import equipmentRouter from './equipment.js'
import equipmentV3Router from './equipment-v3.js'
import equipmentImagesRouter from './equipment-images.js'
import warehouseRouter from './warehouse.js'
import inboundRouter from './inbound.js'
import transferRouter from './transfer.js'
import repairsRouter from './repairs.js'
import scrapSalesRouter from './scrapSales.js'
import projectsRouter from './projects.js'
import workTimeRouter from './work-time.js'
import notificationsRouter from './notifications.js'
import permissionsRouter from './permissions.js'
import processFormsRouter from './process-forms.js'
import uploadRouter from './upload.js'
import adminRouter from './admin.js'
import healthRouter from './health.js'
import performanceRoutes from './performanceRoutes.js'
import formTemplateRoutes from './formTemplateRoutes.js'

const router = Router()

router.use('/data', dataRouter)
router.use('/metadata', metadataRouter)
router.use('/workflow', workflowRouter)
router.use('/workflow', workflowAdminRouter)
router.use('/workflow/v2', enhancedWorkflowRouter)
router.use('/workflow/form-presets', processFormsRouter)
router.use('/workflow/performance', performanceRoutes)
router.use('/workflow/form-templates', formTemplateRoutes)
router.use('/auth', authRouter)
router.use('/organization', organizationRouter)
router.use('/personnel/employees', employeesRouter)
router.use('/equipment/transfers', transferRouter)
router.use('/equipment', equipmentRouter)
router.use('/equipment/v3', equipmentV3Router)
router.use('/equipment/images', equipmentImagesRouter)
router.use('/warehouses', warehouseRouter)
router.use('/equipment/inbounds', inboundRouter)
router.use('/equipment/repairs', repairsRouter)
router.use('/equipment/scrap-sales', scrapSalesRouter)
router.use('/projects', projectsRouter)
router.use('/work-time', workTimeRouter)
router.use('/notifications', notificationsRouter)
router.use('/permissions', permissionsRouter)
router.use('/upload', uploadRouter)
router.use('/admin', adminRouter)
router.use('/health', healthRouter)

export default router