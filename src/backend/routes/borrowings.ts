import { Router, Request, Response } from 'express';
import { equipmentBorrowingService } from '../services/EquipmentBorrowingService.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const { status, project_id, lender } = req.query;

    const result = await equipmentBorrowingService.getBorrowings({
      status: status as string,
      project_id: project_id as string,
      lender: lender as string,
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
    const borrowing = await equipmentBorrowingService.getById(req.params.id);
    if (!borrowing) {
      return res.status(404).json({ success: false, error: '借用记录不存在' });
    }
    res.json({ success: true, data: borrowing });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'system';
    const userName = (req as any).user?.name || '系统';
    
    const borrowing = await equipmentBorrowingService.createBorrowing(req.body, userId, userName);
    res.status(201).json({ success: true, data: borrowing });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/return', async (req: Request, res: Response) => {
  try {
    await equipmentBorrowingService.returnBorrowing(req.params.id, req.body);
    res.json({ success: true, message: '归还成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/project', async (req: Request, res: Response) => {
  try {
    const { project_id, project_name } = req.body;
    await equipmentBorrowingService.updateBorrowingProject(req.params.id, project_id, project_name);
    res.json({ success: true, message: '更新成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/check-overdue', async (req: Request, res: Response) => {
  try {
    await equipmentBorrowingService.checkOverdueBorrowings();
    res.json({ success: true, message: '检查完成' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
