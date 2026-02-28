import { Router, Request, Response } from 'express';
import { equipmentRepairService } from '../services/EquipmentRepairService.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || 'system';
    const userName = (req as any).user?.username || '系统';
    
    console.log('[Repair] Creating order:', JSON.stringify(req.body, null, 2));
    console.log('[Repair] User:', userId, userName);
    
    if (req.body.equipment_data && Array.isArray(req.body.equipment_data)) {
      const orders = await equipmentRepairService.createBatchRepairOrders(req.body, userId, userName);
      res.status(201).json({ success: true, data: orders });
    } else {
      const order = await equipmentRepairService.createRepairOrder(req.body, userId, userName);
      res.status(201).json({ success: true, data: order });
    }
  } catch (error: any) {
    console.error('[Repair] Error creating order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, applicant_id, equipment_id } = req.query;
    
    const orders = await equipmentRepairService.list({
      status: status as string,
      applicant_id: applicant_id as string,
      equipment_id: equipment_id as string
    });
    
    res.json({ success: true, data: orders });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const order = await equipmentRepairService.getById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, error: '维修单不存在' });
    }
    
    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/ship', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || 'system';
    const userName = (req as any).user?.username || '系统';
    const { shipping_no } = req.body;
    
    if (!shipping_no) {
      return res.status(400).json({ success: false, error: '物流单号不能为空' });
    }
    
    const result = await equipmentRepairService.shipRepairOrder(req.params.id, shipping_no, userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[Repair] Error shipping order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/approve', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || 'system';
    const userName = (req as any).user?.username || '系统';
    const { comment } = req.body;
    
    const result = await equipmentRepairService.approveRepairOrder(req.params.id, userId, userName, comment);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[Repair] Error approving order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/reject', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || 'system';
    const userName = (req as any).user?.username || '系统';
    const { comment } = req.body;
    
    if (!comment) {
      return res.status(400).json({ success: false, error: '驳回意见不能为空' });
    }
    
    const result = await equipmentRepairService.rejectRepairOrder(req.params.id, userId, userName, comment);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[Repair] Error rejecting order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/receive', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || 'system';
    
    const result = await equipmentRepairService.receiveRepairOrder(req.params.id, userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[Repair] Error receiving order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
