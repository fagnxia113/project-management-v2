import { Router, Request, Response } from 'express';
import { equipmentService } from '../services/EquipmentService.js';

const router = Router();

// --- Models ---
router.get('/models', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const search = req.query.search as string;
    const result = await equipmentService.getModels({ search, page, pageSize });
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/models', async (req: Request, res: Response) => {
  try {
    const model = await equipmentService.createModel(req.body);
    res.status(201).json({ success: true, data: model });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Instances ---
router.get('/instances', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const { model_id, location_id, status, search } = req.query;

    const result = await equipmentService.getInstances({
      model_id: (model_id as string),
      location_id: (location_id as string),
      status: (status as string),
      search: (search as string),
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

// --- Stock Distribution ---
// 查询设备型号在各位置的库存分布
router.get('/stock-distribution', async (req: Request, res: Response) => {
  try {
    const modelId = req.query.model_id as string;
    if (!modelId) {
      return res.status(400).json({ success: false, error: 'model_id is required' });
    }
    
    const distribution = await equipmentService.getStockDistribution(modelId);
    res.json({ success: true, data: distribution });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
