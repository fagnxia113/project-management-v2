import { Router } from 'express';
import { equipmentScrapSaleServiceV2 as equipmentScrapSaleService } from '../services/EquipmentScrapSaleServiceV2.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// 创建报废/售出单
router.post('/', asyncHandler(async (req, res) => {
  const userId = req.user?.id || 'system';
  const userName = req.user?.name || '系统';
  const data = {
    ...req.body,
    applicant_id: userId,
    applicant_name: userName,
  };

  const order = await equipmentScrapSaleService.createScrapSaleOrder(data);
  res.status(201).json({ success: true, data: order });
}));

// 列表
router.get('/', asyncHandler(async (req, res) => {
  const { status, page, pageSize } = req.query;

  const result = await equipmentScrapSaleService.list({
    status: status as string,
    page: page ? parseInt(page as string) : 1,
    pageSize: pageSize ? parseInt(pageSize as string) : 10
  });

  res.json({ success: true, ...result });
}));

// 详情
router.get('/:id', asyncHandler(async (req, res) => {
  const order = await equipmentScrapSaleService.getById(req.params.id);

  if (!order) {
    return res.status(404).json({ success: false, error: '报废/售出单不存在' });
  }

  res.json({ success: true, data: order });
}));

// 审批
router.put('/:id/approve', asyncHandler(async (req, res) => {
  const result = await equipmentScrapSaleService.approveScrapSaleOrder(req.params.id);
  res.json({ success: true, data: result });
}));

// 驳回
router.put('/:id/reject', asyncHandler(async (req, res) => {
  const { comment } = req.body;

  if (!comment) {
    return res.status(400).json({ success: false, error: '驳回意见不能为空' });
  }

  const result = await equipmentScrapSaleService.rejectScrapSaleOrder(req.params.id);
  res.json({ success: true, data: result });
}));

// 处理（执行报废/售出）
router.put('/:id/process', asyncHandler(async (req, res) => {
  const result = await equipmentScrapSaleService.processScrapSaleOrder(req.params.id);
  res.json({ success: true, data: result });
}));

export default router;