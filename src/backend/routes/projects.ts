import { Router, Request, Response } from 'express';
import { projectService } from '../services/ProjectService.js';

const router = Router();

// --- Projects ---
router.get('/', async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 10;
        const search = req.query.search as string;

        const result = await projectService.getProjects({ search, page, pageSize });
        res.json({ success: true, ...result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/', async (req: Request, res: Response) => {
    try {
        const project = await projectService.createProject(req.body);
        res.status(201).json({ success: true, data: project });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/:id', async (req: Request, res: Response) => {
    try {
        const project = await projectService.getProjectById(req.params.id as string);
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
        res.json({ success: true, data: project });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- Tasks (WBS) ---
router.get('/:id/structure', async (req: Request, res: Response) => {
    try {
        const structure = await projectService.getProjectStructure(req.params.id as string);
        res.json({ success: true, data: structure });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/:id/tasks', async (req: Request, res: Response) => {
    try {
        const task = await projectService.createTask({ ...req.body, project_id: (req.params.id as string) });
        res.status(201).json({ success: true, data: task });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.patch('/tasks/:taskId/progress', async (req: Request, res: Response) => {
    try {
        const { progress } = req.body;
        await projectService.updateTaskProgress(req.params.taskId as string, progress);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
