import { Router, Request, Response } from 'express'
import { permissionService } from '../services/PermissionService.js'
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js'

const router = Router()

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const permissions = await permissionService.getUserPermissions(req.user!.userId)
    res.json({ success: true, data: permissions })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/check', authenticate, async (req: Request, res: Response) => {
  try {
    const { code } = req.query
    
    if (!code) {
      return res.status(400).json({ error: '缺少权限码' })
    }
    
    const hasPermission = await permissionService.hasPermission(
      req.user!.userId,
      code as string
    )
    
    res.json({ success: true, data: { hasPermission } })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/menus', authenticate, async (req: Request, res: Response) => {
  try {
    const menus = await permissionService.getUserMenus(req.user!.userId)
    res.json({ success: true, data: menus })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/roles', authenticate, async (req: Request, res: Response) => {
  try {
    const roles = await permissionService.getRoles()
    res.json({ success: true, data: roles })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/roles/:code', authenticate, async (req: Request, res: Response) => {
  try {
    const role = await permissionService.getRoleByCode(req.params.code)
    
    if (!role) {
      return res.status(404).json({ error: '角色不存在' })
    }
    
    res.json({ success: true, data: role })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/data-filter', authenticate, async (req: Request, res: Response) => {
  try {
    const { query, params, table } = req.body
    
    const result = await permissionService.applyDataPermission(
      req.user!.userId,
      query || 'SELECT * FROM table WHERE 1=1',
      params || [],
      table || 't'
    )
    
    res.json({ success: true, data: result })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router
