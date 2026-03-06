import { Router, Request, Response } from 'express';
import { equipmentService } from '../services/EquipmentService.js';

const router = Router();

// --- Instances ---
router.get('/instances', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const { model_id, location_id, status, search, location_status, category, health_status, usage_status, equipment_source } = req.query;

    const result = await equipmentService.getInstances({
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

export default router;
