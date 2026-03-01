import { Router, Request, Response } from 'express';
import { equipmentScrapSaleService } from '../services/EquipmentScrapSaleService.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || 'system';
    const userName = (req as any).user?.username || '系统';
    
    console.log('[ScrapSale] Creating order:', JSON.stringify(req.body, null, 2));
    console.log('[ScrapSale] User:', userId, userName);
    
    if (req.body.equipment_data && Array.isArray(req.body.equipment_data)) {
      const orders = await equipmentScrapSaleService.createBatchScrapSaleOrders(req.body, userId, userName);
      res.status(201).json({ success: true, data: orders });
    } else {
      const order = await equipmentScrapSaleService.createScrapSaleOrder(req.body, userId, userName);
      res.status(201).json({ success: true, data: order });
    }
  } catch (error: any) {
    console.error('[ScrapSale] Error creating order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, applicant_id, equipment_id, type, search, page, pageSize } = req.query;
    
    const result = await equipmentScrapSaleService.list({
      status: status as string,
      applicant_id: applicant_id as string,
      equipment_id: equipment_id as string,
      type: type as string,
      search: search as string,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 10
    });
    
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const order = await equipmentScrapSaleService.getById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, error: '报废/售出单不存在' });
    }
    
    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/approve', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || 'system';
    const userName = (req as any).user?.username || '系统';
    const { comment } = req.body;
    
    const result = await equipmentScrapSaleService.approveScrapSaleOrder(req.params.id, userId, userName, comment);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[ScrapSale] Error approving order:', error);
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
    
    const result = await equipmentScrapSaleService.rejectScrapSaleOrder(req.params.id, userId, userName, comment);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[ScrapSale] Error rejecting order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/process', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || 'system';
    
    const result = await equipmentScrapSaleService.processScrapSaleOrder(req.params.id, userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[ScrapSale] Error processing order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;