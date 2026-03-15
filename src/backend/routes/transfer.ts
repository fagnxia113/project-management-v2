import { Router } from 'express';
import { transferOrderServiceV2 as transferOrderService } from '../services/TransferOrderServiceV2.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

/**
 * POST /api/equipment/transfers
 * 创建调拨单
 */
router.post('/', asyncHandler(async (req, res) => {
  const userId = (req as any).user?.id || 'system';
  const userName = (req as any).user?.name || '系统';

  const order = await transferOrderService.createOrder(req.body, userId, userName);
  res.status(201).json({ success: true, data: order });
}));

/**
 * GET /api/equipment/transfers
 * 分页获取调拨单列表
 */
router.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const { status, from_warehouse_id, from_project_id, to_warehouse_id, to_project_id, applicant_id, search } = req.query;

  const result = await transferOrderService.getList({
    status: status as string,
    from_warehouse_id: from_warehouse_id as string,
    from_project_id: from_project_id as string,
    to_warehouse_id: to_warehouse_id as string,
    to_project_id: to_project_id as string,
    applicant_id: applicant_id as string,
    search: search as string,
    page,
    pageSize
  });

  res.json({ success: true, ...result });
}));

/**
 * GET /api/equipment/transfers/:id
 * 获取调拨单详情
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const order = await transferOrderService.getById(req.params.id as string);
  if (!order) {
    return res.status(404).json({ success: false, error: '调拨单不存在' });
  }
  res.json({ success: true, data: order });
}));

/**
 * PUT /api/equipment/transfers/:id/submit
 * 提交调拨单
 */
router.put('/:id/submit', asyncHandler(async (req, res) => {
  await transferOrderService.submitOrder(req.params.id as string);
  res.json({ success: true, message: '提交成功' });
}));

/**
 * PUT /api/equipment/transfers/:id/approve
 * 审批调拨单
 */
router.put('/:id/approve', asyncHandler(async (req, res) => {
  const userId = (req as any).user?.id || 'system';
  const userName = (req as any).user?.name || '系统';
  const { approved, remark } = req.body;

  if (approved) {
    await transferOrderService.approveOrder(req.params.id as string, userId, userName, remark);
  } else {
    await transferOrderService.rejectOrder(req.params.id as string, userId, userName, remark);
  }
  res.json({ success: true, message: '操作完成' });
}));

/**
 * PUT /api/equipment/transfers/:id/ship
 * 发货
 */
router.put('/:id/ship', asyncHandler(async (req, res) => {
  const userId = (req as any).user?.id || 'system';
  const { shipped_at, shipping_no, shipping_attachment, item_images, package_images } = req.body;

  const order = await transferOrderService.confirmShipping(req.params.id as string, {
    shipping_no,
    shipped_by: userId,
    shipped_at,
    shipping_attachment,
    item_images,
    package_images
  });
  res.json({ success: true, data: order });
}));

/**
 * PUT /api/equipment/transfers/:id/receive
 * 收货
 */
router.put('/:id/receive', asyncHandler(async (req, res) => {
  const userId = (req as any).user?.id || 'system';
  const { receive_status, receive_comment, item_images, package_images, received_items } = req.body;

  const success = await transferOrderService.confirmReceiving(req.params.id as string, {
    received_by: userId,
    receive_status,
    receive_comment,
    item_images,
    package_images,
    received_items
  });
  res.json({ success, message: success ? '收货成功' : '收货失败' });
}));

/**
 * PUT /api/equipment/transfers/:id/return-to-shipping
 * 从收货中状态回退到发货中
 */
router.put('/:id/return-to-shipping', asyncHandler(async (req, res) => {
  const userId = (req as any).user?.id || 'system';
  const { return_comment } = req.body;

  const success = await transferOrderService.returnToShipping(req.params.id as string, userId, return_comment);
  res.json({ success, message: success ? '回退成功' : '回退失败' });
}));

/**
 * PUT /api/equipment/transfers/:id/cancel
 * 取消调拨单
 */
router.put('/:id/cancel', asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const order = await transferOrderService.cancelOrder(req.params.id as string, reason);
  res.json({ success: true, data: order });
}));

export default router;
