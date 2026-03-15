import { Router } from 'express';
import { equipmentRepairServiceV2 as equipmentRepairService } from '../services/EquipmentRepairServiceV2.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// 创建维修单
router.post('/', asyncHandler(async (req, res) => {
  const userId = req.user?.id || 'system';
  const userName = req.user?.name || '系统';
  const data = {
    ...req.body,
    applicant_id: userId,
    applicant_name: userName,
  };

  const order = await equipmentRepairService.createRepairOrder(data);
  res.status(201).json({ success: true, data: order });
}));

// 维修单列表
router.get('/', asyncHandler(async (req, res) => {
  const { status, page, pageSize } = req.query;

  const result = await equipmentRepairService.list({
    status: status as string,
    page: page ? parseInt(page as string) : 1,
    pageSize: pageSize ? parseInt(pageSize as string) : 10
  });

  res.json({ success: true, ...result });
}));

// 维修单详情
router.get('/:id', asyncHandler(async (req, res) => {
  const order = await equipmentRepairService.getById(req.params.id);

  if (!order) {
    return res.status(404).json({ success: false, error: '维修单不存在' });
  }

  res.json({ success: true, data: order });
}));

// 发货
router.put('/:id/ship', asyncHandler(async (req, res) => {
  const { shipping_no } = req.body;

  if (!shipping_no) {
    return res.status(400).json({ success: false, error: '物流单号不能为空' });
  }

  const result = await equipmentRepairService.shipRepairOrder(req.params.id, shipping_no);
  res.json({ success: true, data: result });
}));

// 审批
router.put('/:id/approve', asyncHandler(async (req, res) => {
  const result = await equipmentRepairService.approveRepairOrder(req.params.id);
  res.json({ success: true, data: result });
}));

// 驳回
router.put('/:id/reject', asyncHandler(async (req, res) => {
  const { comment } = req.body;

  if (!comment) {
    return res.status(400).json({ success: false, error: '驳回意见不能为空' });
  }

  const result = await equipmentRepairService.rejectRepairOrder(req.params.id);
  res.json({ success: true, data: result });
}));

// 收货
router.put('/:id/receive', asyncHandler(async (req, res) => {
  const result = await equipmentRepairService.receiveRepairOrder(req.params.id);
  res.json({ success: true, data: result });
}));

export default router;
