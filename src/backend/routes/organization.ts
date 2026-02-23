import { Router, Request, Response } from 'express';
import { departmentService } from '../services/DepartmentService.js';
import { positionService } from '../services/PositionService.js';
import { thirdPartyConfigService, syncLogService } from '../services/ThirdPartyService.js';
import { createWeChatWorkAdapter } from '../services/WeChatWorkAdapter.js';

const router = Router();

router.get('/departments', async (req: Request, res: Response) => {
  try {
    const { parent_id, status, include_inactive, tree } = req.query;
    
    if (tree === 'true') {
      const departmentTree = await departmentService.getDepartmentTree();
      res.json({ success: true, data: departmentTree });
      return;
    }
    
    const departments = await departmentService.getDepartments({
      parent_id: parent_id as string,
      status: status as string,
      include_inactive: include_inactive === 'true'
    });
    
    res.json({ success: true, data: departments });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/departments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const department = await departmentService.getDepartmentById(id);
    
    if (!department) {
      return res.status(404).json({ error: '部门不存在' });
    }
    
    res.json({ success: true, data: department });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/departments', async (req: Request, res: Response) => {
  try {
    const { name, parent_id, manager_id, sort_order, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: '部门名称不能为空' });
    }
    
    const department = await departmentService.createDepartment({
      name,
      parent_id,
      manager_id,
      sort_order,
      description
    });
    
    res.status(201).json({ success: true, data: department });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/departments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const department = await departmentService.updateDepartment(id, updates);
    
    if (!department) {
      return res.status(404).json({ error: '部门不存在' });
    }
    
    res.json({ success: true, data: department });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/departments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await departmentService.deleteDepartment(id);
    
    if (!result) {
      return res.status(404).json({ error: '部门不存在' });
    }
    
    res.json({ success: true, message: '部门删除成功' });
  } catch (error: any) {
    if (error.message.includes('存在子部门') || error.message.includes('存在员工')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

router.get('/departments/:id/path', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const path = await departmentService.getDepartmentPath(id);
    res.json({ success: true, data: path });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/departments/:id/children', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const children = await departmentService.getAllChildren(id);
    res.json({ success: true, data: children });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/departments/:id/positions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const positions = await positionService.getPositionsByDepartment(id);
    res.json({ success: true, data: positions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/positions', async (req: Request, res: Response) => {
  try {
    const { department_id, status, category, include_inactive } = req.query;
    
    const positions = await positionService.getPositions({
      department_id: department_id as string,
      status: status as string,
      category: category as string,
      include_inactive: include_inactive === 'true'
    });
    
    res.json({ success: true, data: positions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/positions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const position = await positionService.getPositionById(id);
    
    if (!position) {
      return res.status(404).json({ error: '岗位不存在' });
    }
    
    res.json({ success: true, data: position });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/positions', async (req: Request, res: Response) => {
  try {
    const { name, department_id, level, category, description, requirements, sort_order } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: '岗位名称不能为空' });
    }
    
    const position = await positionService.createPosition({
      name,
      department_id,
      level,
      category,
      description,
      requirements,
      sort_order
    });
    
    res.status(201).json({ success: true, data: position });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/positions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const position = await positionService.updatePosition(id, updates);
    
    if (!position) {
      return res.status(404).json({ error: '岗位不存在' });
    }
    
    res.json({ success: true, data: position });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/positions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await positionService.deletePosition(id);
    
    if (!result) {
      return res.status(404).json({ error: '岗位不存在' });
    }
    
    res.json({ success: true, message: '岗位删除成功' });
  } catch (error: any) {
    if (error.message.includes('存在员工')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

router.get('/positions/categories', async (req: Request, res: Response) => {
  try {
    const categories = await positionService.getPositionCategories();
    res.json({ success: true, data: categories });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/third-party/configs', async (req: Request, res: Response) => {
  try {
    const { platform_type, status } = req.query;
    const configs = await thirdPartyConfigService.getConfigs({
      platform_type: platform_type as any,
      status: status as string
    });
    res.json({ success: true, data: configs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/third-party/configs/:id', async (req: Request, res: Response) => {
  try {
    const config = await thirdPartyConfigService.getConfigById(req.params.id);
    if (!config) {
      return res.status(404).json({ error: '配置不存在' });
    }
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/third-party/configs', async (req: Request, res: Response) => {
  try {
    const config = await thirdPartyConfigService.createConfig(req.body);
    res.status(201).json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/third-party/configs/:id', async (req: Request, res: Response) => {
  try {
    const config = await thirdPartyConfigService.updateConfig(req.params.id, req.body);
    if (!config) {
      return res.status(404).json({ error: '配置不存在' });
    }
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/third-party/configs/:id', async (req: Request, res: Response) => {
  try {
    const result = await thirdPartyConfigService.deleteConfig(req.params.id);
    if (!result) {
      return res.status(404).json({ error: '配置不存在' });
    }
    res.json({ success: true, message: '配置删除成功' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/third-party/configs/:id/sync', async (req: Request, res: Response) => {
  try {
    const { sync_type } = req.body;
    const config = await thirdPartyConfigService.getConfigById(req.params.id);
    
    if (!config) {
      return res.status(404).json({ error: '配置不存在' });
    }

    if (config.platform_type === 'wechat_work') {
      const adapter = createWeChatWorkAdapter(config);
      
      const log = await syncLogService.createLog({
        config_id: config.id,
        platform_type: config.platform_type,
        sync_type: sync_type || 'full',
        sync_mode: 'manual'
      });

      let result;
      if (sync_type === 'department' || sync_type === 'full') {
        result = await adapter.syncDepartments();
      } else if (sync_type === 'employee') {
        result = await adapter.syncEmployees();
      } else {
        result = await adapter.syncDepartments();
      }

      await syncLogService.updateLog(log.id, {
        status: result.success ? 'success' : 'partial',
        total_count: result.total_count,
        success_count: result.success_count,
        failed_count: result.failed_count,
        created_count: result.created_count,
        updated_count: result.updated_count,
        end_time: new Date(),
        error_message: result.message
      });

      await thirdPartyConfigService.updateSyncStatus(
        config.id, 
        result.success ? 'success' : 'partial'
      );

      res.json({ success: true, data: result });
    } else {
      res.status(400).json({ error: '暂不支持该平台类型' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/third-party/sync-logs', async (req: Request, res: Response) => {
  try {
    const { config_id, platform_type, status, limit } = req.query;
    const logs = await syncLogService.getLogs({
      config_id: config_id as string,
      platform_type: platform_type as any,
      status: status as string,
      limit: limit ? parseInt(limit as string) : 20
    });
    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
