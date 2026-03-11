import { Router, Request, Response } from 'express';
import { equipmentServiceV2 as equipmentService } from '../services/EquipmentServiceV2.js';
import { equipmentAccessoryService } from '../services/EquipmentAccessoryService.js';

const router = Router();

router.use((req, res, next) => {
  console.log('[EquipmentRoute] 收到请求:', req.method, req.path, req.params);
  next();
});

// --- Instances ---
router.get('/instances', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const { model_id, location_id, status, search, location_status, category, health_status, usage_status, equipment_source, aggregated } = req.query;

    const useAggregated = aggregated !== 'false';
    
    const result = useAggregated 
      ? await equipmentService.getAggregatedInstances({
          location_id: (location_id as string),
          status: (status as string),
          search: (search as string),
          location_status: (location_status as string),
          category: (category as string),
          health_status: (health_status as string),
          usage_status: (usage_status as string),
          equipment_source: (equipment_source as string),
          page,
          pageSize
        })
      : await equipmentService.getInstances({
          model_id: (model_id as string),
          location_id: (location_id as string),
          status: (status as string),
          search: (search as string),
          location_status: (location_status as string),
          category: (category as string),
          health_status: (health_status as string),
          usage_status: (usage_status as string),
          equipment_source: (equipment_source as string),
          page,
          pageSize
        });
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/instances/:id', async (req: Request, res: Response) => {
  try {
    const instance = await equipmentService.getInstanceById(req.params.id as string);
    if (!instance) return res.status(404).json({ success: false, error: 'Instance not found' });
    res.json({ success: true, data: instance });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/instances', async (req: Request, res: Response) => {
  try {
    const instance = await equipmentService.createInstance(req.body);
    res.status(201).json({ success: true, data: instance });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/instances/:id', async (req: Request, res: Response) => {
  try {
    await equipmentService.updateInstanceStatus(req.params.id as string, req.body);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/instances/:id', async (req: Request, res: Response) => {
  try {
    const instance = await equipmentService.updateInstance(req.params.id as string, req.body);
    if (!instance) return res.status(404).json({ success: false, error: 'Instance not found' });
    res.json({ success: true, data: instance });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/instances/:id', async (req: Request, res: Response) => {
  try {
    await equipmentService.deleteInstance(req.params.id as string);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Stock Distribution ---
// 查询设备在各位置的库存分布
router.get('/stock-distribution', async (req: Request, res: Response) => {
  try {
    const equipmentName = req.query.equipment_name as string;
    const modelNo = req.query.model_no as string;
    
    if (!equipmentName || !modelNo) {
      return res.status(400).json({ success: false, error: 'equipment_name and model_no are required' });
    }
    
    const distribution = await equipmentService.getStockDistribution(equipmentName, modelNo);
    res.json({ success: true, data: distribution });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Statistics ---
// 获取设备统计信息
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const statistics = await equipmentService.getStatistics();
    res.json({ success: true, data: statistics });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Equipment Names & Models ---
// 获取所有设备名称列表
router.get('/names', async (req: Request, res: Response) => {
  try {
    const names = await equipmentService.getEquipmentNames();
    res.json({ success: true, data: names });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 根据设备名称获取型号列表
router.get('/models', async (req: Request, res: Response) => {
  try {
    const equipmentName = req.query.equipment_name as string;
    const category = req.query.category as string;
    
    if (equipmentName) {
      const models = await equipmentService.getModelsByName(equipmentName);
      res.json({ success: true, data: models });
    } else if (category) {
      const models = await equipmentService.getModelsByCategory(category);
      res.json({ success: true, data: models });
    } else {
      const models = await equipmentService.getAllModels();
      res.json({ success: true, data: models });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Equipment Images ---
router.get('/images/equipment/:equipmentId', async (req: Request, res: Response) => {
  try {
    const images = await equipmentService.getImagesByEquipmentId(req.params.equipmentId);
    res.json({ success: true, data: images });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 配件管理相关路由
// ============================================

// 获取所有配件（支持分页和筛选）
router.get('/accessories', async (req: Request, res: Response) => {
  try {
    const { category, status, location_status, bound, keyword, page, pageSize } = req.query;
    
    const result = await equipmentAccessoryService.getAllAccessories({
      category: category as string,
      status: status as string,
      location_status: location_status as string,
      bound: bound !== undefined ? bound === 'true' : undefined,
      keyword: keyword as string,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20
    });
    
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取未绑定配件列表
router.get('/accessories/unbound', async (req: Request, res: Response) => {
  try {
    const { category, status, keyword } = req.query;
    
    const accessories = await equipmentAccessoryService.getUnboundAccessories({
      category: category as string,
      status: status as string,
      keyword: keyword as string
    });
    
    res.json({ success: true, data: accessories });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取单个配件详情
router.get('/accessories/:id', async (req: Request, res: Response) => {
  try {
    const accessory = await equipmentAccessoryService.getAccessoryById(req.params.id);
    if (!accessory) {
      return res.status(404).json({ success: false, error: '配件不存在' });
    }
    res.json({ success: true, data: accessory });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 创建配件（单独入库）
router.post('/accessories', async (req: Request, res: Response) => {
  try {
    const dto = req.body;
    const accessory = await equipmentAccessoryService.createAccessoryInstance(dto);
    res.json({ success: true, data: accessory });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新配件信息
router.put('/accessories/:id', async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const result = await equipmentAccessoryService.updateAccessoryInstance(req.params.id, updates);
    res.json({ success: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除配件
router.delete('/accessories/:id', async (req: Request, res: Response) => {
  try {
    const result = await equipmentAccessoryService.deleteAccessoryInstance(req.params.id);
    res.json({ success: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 绑定配件到设备
router.post('/accessories/:id/bind', async (req: Request, res: Response) => {
  try {
    const { host_equipment_id, quantity } = req.body;
    const result = await equipmentAccessoryService.bindAccessoryToEquipment(
      req.params.id,
      host_equipment_id,
      quantity || 1
    );
    res.json({ success: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 解绑配件
router.post('/accessories/:id/unbind', async (req: Request, res: Response) => {
  try {
    const { host_equipment_id, quantity } = req.body;
    const result = await equipmentAccessoryService.unbindAccessoryFromEquipment(
      req.params.id,
      host_equipment_id,
      quantity || 1
    );
    res.json({ success: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 标记配件遗失
router.post('/accessories/:id/mark-lost', async (req: Request, res: Response) => {
  try {
    const { operator_id, operator_name, reason, equipment_id, transfer_order_id } = req.body;
    const result = await equipmentAccessoryService.markAccessoryLost(
      req.params.id,
      operator_id,
      operator_name,
      reason,
      equipment_id,
      transfer_order_id
    );
    res.json({ success: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 恢复配件（找到遗失的配件）
router.post('/accessories/:id/recover', async (req: Request, res: Response) => {
  try {
    const { operator_id, operator_name, notes } = req.body;
    const result = await equipmentAccessoryService.recoverAccessory(
      req.params.id,
      operator_id,
      operator_name,
      notes
    );
    res.json({ success: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取配件的遗失记录
router.get('/accessories/:id/lost-records', async (req: Request, res: Response) => {
  try {
    const records = await equipmentAccessoryService.getLostRecords(req.params.id);
    res.json({ success: true, data: records });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取设备绑定的配件列表
router.get('/instances/:id/accessories', async (req: Request, res: Response) => {
  try {
    const accessories = await equipmentAccessoryService.getAccessoriesWithDetails(req.params.id);
    res.json({ success: true, data: accessories });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
