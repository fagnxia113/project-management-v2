/**
 * 项目管理路由 (v2 重构版)
 * 对照 SYSTEM_DESIGN.md 第 7.2.2 节，补全所有缺失接口
 *
 * 设计文档要求的接口：
 *  GET    /api/projects                    ✅
 *  POST   /api/projects                    ✅
 *  GET    /api/projects/:id                ✅
 *  PUT    /api/projects/:id                ✅
 *  DELETE /api/projects/:id                ✅
 *  GET    /api/projects/:id/tasks          ✅ (新增，原只有 structure)
 *  POST   /api/projects/:id/tasks          ✅
 *  PATCH  /api/projects/tasks/:taskId/progress  ✅
 *
 * 新增：
 *  GET  /api/projects/:id/members          📌 项目成员列表
 *  POST /api/projects/:id/members          📌 添加项目成员
 *  DELETE /api/projects/:id/members/:memberId  📌 移除项目成员
 */
import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { projectRepository } from '../repository/ProjectRepository.js'
import { prisma } from '../database/prisma.js'
import { authenticate } from '../middleware/authMiddleware.js'

const router = Router()
router.use(authenticate)

// =====================================================================
// 项目 CRUD
// =====================================================================

/**
 * GET /api/projects
 * 获取项目列表（支持分页、搜索、状态过滤）
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const page = typeof req.query.page === 'string' ? parseInt(req.query.page) : 1
        const pageSize = typeof req.query.pageSize === 'string' ? parseInt(req.query.pageSize) : 10
        const search = typeof req.query.search === 'string' ? req.query.search : undefined
        const status = typeof req.query.status === 'string' ? req.query.status : undefined
        const manager_id = typeof req.query.manager_id === 'string' ? req.query.manager_id : undefined

        const result = await projectRepository.findMany({ search, status, manager_id, page, pageSize })
        res.json({
            success: true,
            data: result.data,
            total: result.total,
            totalPages: Math.ceil(result.total / pageSize)
        })
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message })
    }
})

/**
 * POST /api/projects
 * 创建项目
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const body = req.body
        const id = uuidv4()
        const code = body.code || `PRJ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

        const project = await projectRepository.create({
            id,
            code,
            name: body.name,
            type: body.type ?? 'domestic',
            manager_id: body.manager_id ?? null,
            technical_lead_id: body.technical_lead_id ?? null,
            status: body.status ?? 'proposal',
            progress: 0,
            start_date: new Date(body.start_date),
            end_date: body.end_date ? new Date(body.end_date) : null,
            country: body.country ?? undefined,
            address: body.address ?? null,
            description: body.description ?? null,
            building_area: body.building_area ?? null,
            it_capacity: body.it_capacity ?? null,
            cabinet_count: body.cabinet_count ?? null,
            cabinet_power: body.cabinet_power ?? null,
            power_architecture: body.power_architecture ?? null,
            hvac_architecture: body.hvac_architecture ?? null,
            fire_architecture: body.fire_architecture ?? null,
            weak_electric_architecture: body.weak_electric_architecture ?? null,
            budget: body.budget ?? 0,
            customer_id: body.customer_id ?? null,
            organization_id: body.organization_id ?? null,
            end_customer: body.end_customer ?? null,
            attachments: body.attachments ?? null
        } as any)

        res.status(201).json({ success: true, data: project })
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message })
    }
})

/**
 * GET /api/projects/:id
 * 获取项目详情
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string
        const project = await projectRepository.findById(id)
        if (!project) return res.status(404).json({ success: false, error: '项目不存在' })
        res.json({ success: true, data: project })
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message })
    }
})

/**
 * PUT /api/projects/:id
 * 更新项目信息
 */
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string
        const body = req.body

        // 类型处理：日期字段转换
        const data: any = { ...body }
        if (data.start_date) data.start_date = new Date(data.start_date)
        if (data.end_date) data.end_date = new Date(data.end_date)
        delete data.id
        delete data.code
        delete data.created_at

        const project = await projectRepository.update(id, data)

        // 如果更新了负责人，同步更新该项目下设备的保管人
        if (body.manager_id !== undefined) {
            await (prisma.equipment_instances as any).updateMany({
                where: { location_id: id, location_status: 'in_project' },
                data: { keeper_id: body.manager_id, updated_at: new Date() }
            })
        }

        res.json({ success: true, data: project })
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message })
    }
})

/**
 * DELETE /api/projects/:id
 * 删除项目（管理员权限）
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string
        // 权限检查：仅管理员可删除
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ success: false, error: '无权限删除项目，需要管理员权限' })
        }
        await projectRepository.delete(id)
        res.json({ success: true, message: '项目已删除' })
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message })
    }
})

// =====================================================================
// 任务管理
// =====================================================================

/**
 * GET /api/projects/:id/tasks
 * 获取项目任务列表（新增：补全设计文档要求的接口）
 */
router.get('/:id/tasks', async (req: Request, res: Response) => {
    try {
        const tasks = await projectRepository.findTasksByProject(req.params.id as string)
        res.json({ success: true, data: tasks, total: tasks.length })
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message })
    }
})

/**
 * GET /api/projects/:id/structure
 * 获取项目 WBS 结构（原有，保留兼容）
 */
router.get('/:id/structure', async (req: Request, res: Response) => {
    try {
        const tasks = await projectRepository.findTasksByProject(req.params.id as string)
        res.json({ success: true, data: tasks })
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message })
    }
})

/**
 * POST /api/projects/:id/tasks
 * 创建任务
 */
router.post('/:id/tasks', async (req: Request, res: Response) => {
    try {
        const projectId = req.params.id as string
        const body = req.body
        const id = uuidv4()

        // 计算 WBS 路径和编码
        let wbs_path = ''
        let wbs_code = ''

        if (body.parent_id) {
            const parent = await projectRepository.findTaskById(body.parent_id as string)
            if (!parent) return res.status(404).json({ success: false, error: '父任务不存在' })

            const siblingCount = await projectRepository.countChildTasks(body.parent_id as string)
            wbs_path = `${parent.wbs_path}${id}/`
            wbs_code = `${parent.wbs_code}.${siblingCount + 1}`
        } else {
            const rootCount = await projectRepository.countRootTasks(projectId)
            wbs_path = `/${id}/`
            wbs_code = `${rootCount + 1}`
        }

        const task = await projectRepository.createTask({
            id,
            project_id: projectId,
            parent_id: (body.parent_id as string) ?? null,
            wbs_path,
            wbs_code,
            name: body.name,
            task_type: (body.task_type as any) ?? 'subtask',
            description: body.description ?? null,
            assignee_id: (body.assignee_id as string) ?? null,
            planned_start_date: new Date(body.planned_start_date),
            planned_end_date: new Date(body.planned_end_date),
            progress: 0,
            status: (body.status as any) ?? 'unassigned',
            priority: (body.priority as any) ?? 'medium'
        })

        res.status(201).json({ success: true, data: task })
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message })
    }
})

/**
 * PATCH /api/projects/tasks/:taskId/progress
 * 更新任务进度（自动向上滚动，并更新项目整体进度）
 */
router.patch('/tasks/:taskId/progress', async (req: Request, res: Response) => {
    try {
        const taskId = req.params.taskId as string
        const { progress } = req.body
        if (progress === undefined || progress < 0 || progress > 100) {
            return res.status(400).json({ success: false, error: '进度值无效（需为 0-100 的整数）' })
        }

        const task = await projectRepository.findTaskById(taskId)
        if (!task) return res.status(404).json({ success: false, error: '任务不存在' })

        // 1. 更新当前任务
        await projectRepository.updateTaskProgress(taskId, progress)

        // 2. 向上滚动：递归更新所有父任务进度（简单平均）
        let currentParentId: string | null = task.parent_id
        while (currentParentId) {
            const siblings = await projectRepository.findSiblingTasksProgress(currentParentId)
            const avgProgress = siblings.length > 0
                ? Math.round(siblings.reduce((acc, s) => acc + s.progress, 0) / siblings.length)
                : 0
            await projectRepository.updateTaskProgress(currentParentId, avgProgress)

            const parent = await projectRepository.findTaskById(currentParentId)
            currentParentId = parent?.parent_id ?? null
        }

        // 3. 更新项目整体进度（根任务平均值）
        const rootTasksProgress = await projectRepository.findRootTasksProgress(task.project_id)
        if (rootTasksProgress.length > 0) {
            const projectProgress = Math.round(
                rootTasksProgress.reduce((acc, t) => acc + t.progress, 0) / rootTasksProgress.length
            )
            await projectRepository.updateProjectProgress(task.project_id, projectProgress)
        }

        res.json({ success: true, message: '进度已更新' })
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message })
    }
})

// =====================================================================
// 项目成员管理（新增，补全设计文档功能）
// =====================================================================

/**
 * GET /api/projects/:id/members
 * 获取项目成员列表
 */
router.get('/:id/members', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string
        const members = await projectRepository.findMembers(id)
        res.json({ success: true, data: members, total: members.length })
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message })
    }
})

/**
 * POST /api/projects/:id/members
 * 添加项目成员
 */
router.post('/:id/members', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string
        const { employee_id, role_in_project } = req.body
        if (!employee_id) return res.status(400).json({ success: false, error: '缺少员工ID' })

        const member = await projectRepository.addMember({
            project_id: id,
            employee_id: employee_id as string,
            role: (role_in_project as string) || 'member'
        })
        res.status(201).json({ success: true, data: member })
    } catch (error: any) {
        // 唯一键冲突（成员已存在）
        if (error.code === 'P2002') {
            return res.status(409).json({ success: false, error: '该成员已在项目中' })
        }
        res.status(500).json({ success: false, error: error.message })
    }
})

/**
 * DELETE /api/projects/:id/members/:memberId
 * 移除项目成员
 */
router.delete('/:id/members/:memberId', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string
        const memberId = req.params.memberId as string

        await projectRepository.removeMember(id, memberId)
        res.json({ success: true, message: '成员已移除' })
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message })
    }
})

export default router
