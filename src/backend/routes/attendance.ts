import { Router, Request, Response } from 'express';
import { attendanceService } from '../services/AttendanceService.js';

const router = Router();

// 上班打卡
router.post('/clock-in', async (req: Request, res: Response) => {
  try {
    const result = await attendanceService.clockIn(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 下班打卡
router.post('/clock-out', async (req: Request, res: Response) => {
  try {
    const result = await attendanceService.clockOut(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 全员考勤一览
router.get('/status-board', async (req: Request, res: Response) => {
  try {
    const date = req.query.date as string || new Date().toISOString().split('T')[0];
    const stats = await attendanceService.getAllPersonnelStatus(date);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 项目考勤核对 (PM用)
router.get('/project-attendance', async (req: Request, res: Response) => {
  try {
    const { projectId, startDate, endDate } = req.query;
    if (!projectId || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }
    const data = await attendanceService.getProjectAttendance(
      projectId as string, 
      startDate as string, 
      endDate as string
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 个人历史记录
router.get('/employee-history/:id', async (req: Request, res: Response) => {
  try {
    const data = await attendanceService.getEmployeeHistory(req.params.id);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
