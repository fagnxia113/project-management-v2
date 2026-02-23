import { Router, Request, Response } from 'express';
import { workTimeService } from '../services/WorkTimeService.js';

const router = Router();

router.post('/daily-reports', async (req: Request, res: Response) => {
    try {
        const { report, entries } = req.body;
        if (!report || !entries) return res.status(400).json({ error: 'Missing report or entries' });

        const reportId = await workTimeService.submitDailyReport(report, entries);
        res.status(201).json({ success: true, data: { reportId } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/daily-reports/:id', async (req: Request, res: Response) => {
    try {
        const result = await workTimeService.getReportWithEntries(req.params.id as string);
        if (!result) return res.status(404).json({ error: 'Report not found' });
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/employee/:id/history', async (req: Request, res: Response) => {
    try {
        const history = await workTimeService.getEmployeeWorkHistory(req.params.id as string);
        res.json({ success: true, data: history });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/projects/:id/cost', async (req: Request, res: Response) => {
    try {
        const cost = await workTimeService.getProjectLaborCost(req.params.id as string);
        res.json({ success: true, data: cost });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
