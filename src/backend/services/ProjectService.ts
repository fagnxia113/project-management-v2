import { db } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

export interface Project {
    id: string;
    code: string;
    name: string;
    type: 'domestic' | 'foreign' | 'rd' | 'service';
    // 基本信息
    manager_id?: string;
    start_date: string;
    end_date?: string;
    country?: string;
    address?: string;
    attachments?: string;
    // 项目阶段
    status: 'proposal' | 'in_progress' | 'completed' | 'paused' | 'delayed';
    progress: number;
    // 项目相关信息
    description?: string;
    building_area?: number;
    it_capacity?: number;
    cabinet_count?: number;
    cabinet_power?: number;
    // 技术架构
    power_architecture?: string;
    hvac_architecture?: string;
    fire_architecture?: string;
    weak_electric_architecture?: string;
    // 商务信息
    customer_id?: string;
    budget: number;
    organization_id?: string;
}

export interface Task {
    id: string;
    project_id: string;
    parent_id?: string;
    wbs_path: string;
    wbs_code: string;
    name: string;
    task_type: 'milestone' | 'subtask' | 'process';
    description?: string;
    assignee_id?: string;
    planned_start_date: string;
    planned_end_date: string;
    actual_start_date?: string;
    actual_end_date?: string;
    progress: number;
    status: 'unassigned' | 'pending_confirm' | 'accepted' | 'in_progress' | 'completed' | 'closed';
    priority: 'high' | 'medium' | 'low';
}

export class ProjectService {
    // --- Project Methods ---

    async createProject(data: Omit<Project, 'id' | 'progress'>): Promise<Project> {
        const id = uuidv4();
        // 生成项目编号
        const code = data.code || `PRJ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        
        await db.execute(
            `INSERT INTO projects (
                id, code, name, type, 
                manager_id,
                status, progress, start_date, end_date,
                country, address, attachments,
                description, building_area, it_capacity, cabinet_count, cabinet_power,
                power_architecture, hvac_architecture, fire_architecture, weak_electric_architecture,
                budget, customer_id, organization_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, code, data.name, data.type || 'domestic',
                data.manager_id || null,
                data.status || 'proposal', 0, data.start_date, data.end_date || null,
                data.country || '中国', data.address || null, data.attachments || null,
                data.description || null, data.building_area || null, data.it_capacity || null, 
                data.cabinet_count || null, data.cabinet_power || null,
                data.power_architecture || null, data.hvac_architecture || null, data.fire_architecture || null, data.weak_electric_architecture || null,
                data.budget || 0, data.customer_id || null, data.organization_id || null
            ]
        );
        return { 
            id, 
            code, 
            progress: 0, 
            name: data.name,
            type: data.type || 'domestic',
            manager_id: data.manager_id,
            status: data.status || 'proposal',
            start_date: data.start_date,
            end_date: data.end_date,
            country: data.country || '中国',
            address: data.address,
            attachments: data.attachments,
            description: data.description,
            building_area: data.building_area,
            it_capacity: data.it_capacity,
            cabinet_count: data.cabinet_count,
            cabinet_power: data.cabinet_power,
            power_architecture: data.power_architecture,
            hvac_architecture: data.hvac_architecture,
            fire_architecture: data.fire_architecture,
            weak_electric_architecture: data.weak_electric_architecture,
            customer_id: data.customer_id,
            budget: data.budget || 0,
            organization_id: data.organization_id
        };
    }

    async getProjects(filters: { search?: string; page: number; pageSize: number }): Promise<{ data: Project[]; total: number; totalPages: number }> {
        const { search, page, pageSize } = filters;
        const offset = (page - 1) * pageSize;
        let whereClause = '1=1';
        const params: any[] = [];

        if (search) {
            whereClause += ' AND (name LIKE ? OR code LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        const countRes = await db.queryOne<{ total: number }>(`SELECT COUNT(*) as total FROM projects WHERE ${whereClause}`, params);
        const total = countRes?.total || 0;

        const data = await db.query<Project>(
            `SELECT * FROM projects WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [...params, pageSize, offset]
        );

        return {
            data,
            total,
            totalPages: Math.ceil(total / pageSize)
        };
    }

    async getProjectById(id: string): Promise<Project | undefined> {
        const res = await db.queryOne<Project>('SELECT * FROM projects WHERE id = ?', [id]);
        return res || undefined;
    }

    async deleteProject(id: string): Promise<void> {
        // 先删除项目下的所有任务
        await db.execute('DELETE FROM tasks WHERE project_id = ?', [id]);
        // 再删除项目
        await db.execute('DELETE FROM projects WHERE id = ?', [id]);
    }

    // --- WBS/Task Methods ---

    async createTask(data: Omit<Task, 'id' | 'progress' | 'wbs_path' | 'wbs_code' | 'status'>): Promise<Task> {
        const id = uuidv4();
        let wbs_path = '';
        let wbs_code = '';

        if (data.parent_id) {
            const parent = await db.queryOne<Task>('SELECT wbs_path, wbs_code FROM tasks WHERE id = ?', [data.parent_id]);
            if (!parent) throw new Error('Parent task not found');

            const siblingCount = await db.queryOne<{ count: number }>(
                'SELECT COUNT(*) as count FROM tasks WHERE parent_id = ?',
                [data.parent_id]
            );
            const nextIndex = (siblingCount?.count || 0) + 1;

            wbs_path = `${parent.wbs_path}${id}/`;
            wbs_code = `${parent.wbs_code}.${nextIndex}`;
        } else {
            const rootCount = await db.queryOne<{ count: number }>(
                'SELECT COUNT(*) as count FROM tasks WHERE project_id = ? AND parent_id IS NULL',
                [data.project_id]
            );
            const nextIndex = (rootCount?.count || 0) + 1;

            wbs_path = `/${id}/`;
            wbs_code = `${nextIndex}`;
        }

        await db.execute(
            `INSERT INTO tasks (
        id, project_id, parent_id, wbs_path, wbs_code, name, task_type, 
        description, assignee_id, planned_start_date, planned_end_date, progress, status, priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'unassigned', ?)`,
            [
                id, data.project_id, data.parent_id || null, wbs_path, wbs_code, data.name,
                data.task_type || 'subtask', data.description || null, data.assignee_id || null,
                data.planned_start_date, data.planned_end_date, data.priority || 'medium'
            ]
        );

        return { id, progress: 0, wbs_path, wbs_code, status: 'unassigned', ...data };
    }

    /**
     * 自动向上滚动更新进度
     */
    async updateTaskProgress(taskId: string, progress: number): Promise<void> {
        const task = await db.queryOne<Task>('SELECT id, project_id, parent_id, wbs_path FROM tasks WHERE id = ?', [taskId]);
        if (!task) return;

        // 1. 更新当前任务
        await db.execute('UPDATE tasks SET progress = ?, updated_at = NOW() WHERE id = ?', [progress, taskId]);

        // 2. 向上滚动递归更新父任务进度 (简单平均值，实际可根据权重)
        let currentParentId = task.parent_id;
        while (currentParentId) {
            const siblings = await db.query<{ progress: number }>(
                'SELECT progress FROM tasks WHERE parent_id = ?',
                [currentParentId]
            );

            const avgProgress = Math.round(siblings.reduce((acc, s) => acc + s.progress, 0) / siblings.length);

            await db.execute('UPDATE tasks SET progress = ?, updated_at = NOW() WHERE id = ?', [avgProgress, currentParentId]);

            const parent = await db.queryOne<{ parent_id: string }>('SELECT parent_id FROM tasks WHERE id = ?', [currentParentId]);
            currentParentId = parent?.parent_id;
        }

        // 3. 更新项目整体进度
        const rootTasks = await db.query<{ progress: number }>(
            'SELECT progress FROM tasks WHERE project_id = ? AND parent_id IS NULL',
            [task.project_id]
        );
        if (rootTasks.length > 0) {
            const projectAvgProgress = Math.round(rootTasks.reduce((acc, t) => acc + t.progress, 0) / rootTasks.length);
            await db.execute('UPDATE projects SET progress = ?, updated_at = NOW() WHERE id = ?', [projectAvgProgress, task.project_id]);
        }
    }

    async getProjectStructure(projectId: string): Promise<Task[]> {
        return db.query<Task>('SELECT * FROM tasks WHERE project_id = ? ORDER BY wbs_code', [projectId]);
    }
}

export const projectService = new ProjectService();
