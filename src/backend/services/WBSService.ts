import { db } from '../database/connection.js';

export interface WBSNode {
  id: string;
  wbs_code: string;
  name: string;
  parent_id: string | null;
  level: number;
  order: number;
}

export class WBSService {
  /**
   * 生成WBS编号
   * @param projectId 项目ID
   * @param parentId 父任务ID（可选）
   * @param taskType 任务类型（milestone/subtask/process）
   */
  async generateWBSCode(
    projectId: string,
    parentId: string | null,
    taskType: 'milestone' | 'subtask' | 'process'
  ): Promise<string> {
    if (!parentId) {
      // 顶级任务（里程碑）
      const maxOrder = await this.getMaxSiblingOrder(projectId, null);
      return `${maxOrder + 1}`;
    }

    // 获取父任务信息
    const parent = await db.queryOne<WBSNode>(
      'SELECT id, wbs_code, parent_id FROM tasks WHERE id = ?',
      [parentId]
    );

    if (!parent) {
      throw new Error('父任务不存在');
    }

    // 获取同级任务的最大序号
    const maxOrder = await this.getMaxSiblingOrder(projectId, parentId);
    const newOrder = maxOrder + 1;

    // 生成新的WBS编号
    return `${parent.wbs_code}.${newOrder}`;
  }

  /**
   * 获取同级任务的最大序号
   */
  private async getMaxSiblingOrder(projectId: string, parentId: string | null): Promise<number> {
    let query: string;
    let params: any[];

    if (parentId) {
      query = `
        SELECT MAX(CAST(SUBSTRING_INDEX(wbs_code, '.', -1) AS UNSIGNED)) as max_order
        FROM tasks
        WHERE project_id = ? AND parent_id = ?
      `;
      params = [projectId, parentId];
    } else {
      query = `
        SELECT MAX(CAST(wbs_code AS UNSIGNED)) as max_order
        FROM tasks
        WHERE project_id = ? AND parent_id IS NULL
      `;
      params = [projectId];
    }

    const result = await db.queryOne<{ max_order: number | null }>(query, params);
    return result?.max_order || 0;
  }

  /**
   * 重新计算项目的所有WBS编号
   * 当任务顺序发生变化时使用
   */
  async recalculateWBS(projectId: string): Promise<void> {
    // 获取所有任务，按层级和创建时间排序
    const tasks = await db.query<WBSNode>(
      `SELECT id, wbs_code, name, parent_id, 
        (LENGTH(wbs_code) - LENGTH(REPLACE(wbs_code, '.', ''))) as level
       FROM tasks 
       WHERE project_id = ? 
       ORDER BY level, created_at`,
      [projectId]
    );

    // 按层级分组
    const tasksByLevel: Record<number, WBSNode[]> = {};
    tasks.forEach(task => {
      const level = (task.wbs_code.match(/\./g) || []).length;
      if (!tasksByLevel[level]) {
        tasksByLevel[level] = [];
      }
      tasksByLevel[level].push(task);
    });

    // 重新编号
    const updates: Array<{ id: string; newCode: string }> = [];
    
    // 处理第一层（里程碑）
    const level0 = tasksByLevel[0] || [];
    level0.forEach((task, index) => {
      updates.push({ id: task.id, newCode: `${index + 1}` });
    });

    // 处理其他层级
    Object.keys(tasksByLevel)
      .map(Number)
      .sort((a, b) => a - b)
      .slice(1)
      .forEach(level => {
        const levelTasks = tasksByLevel[level];
        const parentGroups: Record<string, WBSNode[]> = {};
        
        levelTasks.forEach(task => {
          // 找到父任务
          const parent = tasks.find(t => t.id === task.parent_id);
          if (parent) {
            const parentCode = updates.find(u => u.id === parent.id)?.newCode || parent.wbs_code;
            if (!parentGroups[parentCode]) {
              parentGroups[parentCode] = [];
            }
            parentGroups[parentCode].push(task);
          }
        });

        Object.entries(parentGroups).forEach(([parentCode, siblings]) => {
          siblings.forEach((task, index) => {
            updates.push({ id: task.id, newCode: `${parentCode}.${index + 1}` });
          });
        });
      });

    // 批量更新
    for (const update of updates) {
      await db.execute(
        'UPDATE tasks SET wbs_code = ? WHERE id = ?',
        [update.newCode, update.id]
      );
    }
  }

  /**
   * 验证WBS编号格式
   */
  validateWBSCode(code: string): boolean {
    const pattern = /^(\d+)(\.\d+)*$/;
    return pattern.test(code);
  }

  /**
   * 获取WBS层级深度
   */
  getWBSLevel(code: string): number {
    return (code.match(/\./g) || []).length + 1;
  }

  /**
   * 获取WBS路径
   * 返回从根节点到当前节点的所有WBS编号
   */
  async getWBSPath(taskId: string): Promise<string[]> {
    const path: string[] = [];
    let currentId: string | null = taskId;

    while (currentId) {
      const task = await db.queryOne<WBSNode>(
        'SELECT id, wbs_code, parent_id FROM tasks WHERE id = ?',
        [currentId]
      );
      
      if (!task) break;
      
      path.unshift(task.wbs_code);
      currentId = task.parent_id;
    }

    return path;
  }

  /**
   * 获取任务的所有子任务
   */
  async getChildren(taskId: string): Promise<WBSNode[]> {
    return db.query<WBSNode>(
      'SELECT * FROM tasks WHERE parent_id = ? ORDER BY wbs_code',
      [taskId]
    );
  }

  /**
   * 获取任务的所有后代任务
   */
  async getDescendants(taskId: string): Promise<WBSNode[]> {
    const task = await db.queryOne<WBSNode>(
      'SELECT wbs_code FROM tasks WHERE id = ?',
      [taskId]
    );

    if (!task) return [];

    return db.query<WBSNode>(
      `SELECT * FROM tasks 
       WHERE wbs_code LIKE ? AND id != ?
       ORDER BY wbs_code`,
      [`${task.wbs_code}.%`, taskId]
    );
  }
}

export const wbsService = new WBSService();
