import { Router, Request, Response } from 'express';
import { TransferOrderService } from '../services/TransferOrderService.js';

const router = Router();
const transferOrderService = new TransferOrderService();

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'system';
    const userName = (req as any).user?.name || '系统';
    
    console.log('[Transfer] Creating order:', JSON.stringify(req.body, null, 2));
    console.log('[Transfer] User:', userId, userName);
    
    const order = await transferOrderService.createOrder(req.body, userId, userName);
    res.status(201).json({ success: true, data: order });
  } catch (error: any) {
    console.error('[Transfer] Error creating order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const { status, from_project_id, to_project_id, applicant_id } = req.query;
    
    const result = await transferOrderService.getOrders({
      status: status as string,
      from_project_id: from_project_id as string,
      to_project_id: to_project_id as string,
      applicant_id: applicant_id as string,
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
    const order = await transferOrderService.getById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, error: '调拨单不存在' });
    }
    
    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/submit', async (req: Request, res: Response) => {
  try {
    const order = await transferOrderService.submitOrder(req.params.id);
    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/approve', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'system';
    const userName = (req as any).user?.name || '系统';
    const { approved, remark, approve_type } = req.body;
    
    if (approved) {
      if (approve_type === 'from') {
        await transferOrderService.approveFromManager(req.params.id, userId, userName, remark);
      } else if (approve_type === 'to') {
        await transferOrderService.approveToManager(req.params.id, userId, userName, remark);
      } else {
        await transferOrderService.approveOrder(req.params.id, userId, userName, remark);
      }
    } else {
      await transferOrderService.rejectOrder(req.params.id, userId, userName, remark);
    }
    res.json({ success: true, message: '审批完成' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/ship', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'system';
    const userName = (req as any).user?.name || '系统';
    const { shipped_at, shipping_no, shipping_attachment, item_images, package_images } = req.body;
    
    const order = await transferOrderService.shipOrder(req.params.id, userId, userName, {
      shipped_at,
      shipping_no,
      shipping_attachment,
      item_images,
      package_images
    });
    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/receive', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'system';
    const userName = (req as any).user?.name || '系统';
    const { received_at, receive_status, receive_comment, item_images, package_images, received_items } = req.body;
    
    const success = await transferOrderService.confirmReceiving(
      req.params.id, 
      userId, 
      receive_status || 'normal', 
      receive_comment,
      item_images,
      package_images,
      received_items
    );
    res.json({ success, message: success ? '收货成功' : '收货失败' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/confirm-partial', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'system';
    const success = await transferOrderService.confirmPartialReceive(req.params.id, userId);
    res.json({ success, message: success ? '确认成功' : '确认失败' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/return-to-shipping', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'system';
    const { return_comment } = req.body;
    
    const success = await transferOrderService.returnToShipping(req.params.id, userId, return_comment);
    res.json({ success, message: success ? '回退成功' : '回退失败' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const order = await transferOrderService.cancelOrder(req.params.id, reason);
    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/return', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'system';
    const userName = (req as any).user?.name || '系统';
    const { comment } = req.body;
    
    const success = await transferOrderService.returnOrder(req.params.id, userId, userName, comment);
    res.json({ success, message: success ? '回退成功' : '回退失败' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
