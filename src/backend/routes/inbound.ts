import { Router, Request, Response } from 'express';
import { InboundOrderService } from '../services/InboundOrderService.js';

const router = Router();
const inboundOrderService = new InboundOrderService();

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'system';
    const userName = (req as any).user?.name || '系统';
    
    console.log('[Inbound] Creating order:', JSON.stringify(req.body, null, 2));
    console.log('[Inbound] User:', userId, userName);
    
    const order = await inboundOrderService.createOrder(req.body, userId, userName);
    res.status(201).json({ success: true, data: order });
  } catch (error: any) {
    console.error('[Inbound] Error creating order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const { status, warehouse_id, model_id } = req.query;
    
    const result = await inboundOrderService.getOrders({
      status: status as string,
      warehouse_id: warehouse_id as string,
      model_id: model_id as string,
      page,
      pageSize
    });
    
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const order = await inboundOrderService.getById(req.params.id);
    const items = await inboundOrderService.getItems(req.params.id);
    
    res.json({ success: true, data: { ...order, items } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const order = await inboundOrderService.updateOrder(req.params.id, req.body);
    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await inboundOrderService.deleteOrder(req.params.id);
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/submit', async (req: Request, res: Response) => {
  try {
    const order = await inboundOrderService.submitOrder(req.params.id);
    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/approve', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'system';
    const userName = (req as any).user?.name || '系统';
    const { approved, remark } = req.body;
    
    if (approved) {
      await inboundOrderService.approveOrder(req.params.id, userId, userName, remark);
    } else {
      await inboundOrderService.rejectOrder(req.params.id, userId, userName, remark);
    }
    res.json({ success: true, message: '审批完成' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const order = await inboundOrderService.cancelOrder(req.params.id, reason);
    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/items', async (req: Request, res: Response) => {
  try {
    const items = await inboundOrderService.getItems(req.params.id);
    res.json({ success: true, data: items });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
