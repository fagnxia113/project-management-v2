import { Router, Request, Response } from 'express';
import { db } from '../database/connection.js';
import { metadataService } from '../services/MetadataService.js';
import { wbsService } from '../services/WBSService.js';

const router = Router();

// 辅助函数：安全获取字符串类型的 query 参数
function getQueryParam(value: any, defaultValue: string = ''): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return defaultValue;
}

/**
 * 查询列表（分页）
 * GET /api/data/:entity
 */
router.get('/:entity', async (req: Request, res: Response) => {
  try {
    const { entity } = req.params;
    const page = getQueryParam(req.query.page, '1');
    const pageSize = getQueryParam(req.query.pageSize, '20');
    const search = getQueryParam(req.query.search, '');
    const filter = getQueryParam(req.query.filter, '');
    const sort = getQueryParam(req.query.sort, '');
    const order = getQueryParam(req.query.order, 'ASC');

    // 验证实体
    const entityDef = metadataService.getEntity(entity);
    if (!entityDef) {
      return res.status(404).json({ error: `实体 ${entity} 不存在` });
    }

    const tableName = metadataService.getTableName(entity);
    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const offset = (pageNum - 1) * pageSizeNum;

    // 构建查询条件
    let whereClause = '1=1';
    const params: any[] = [];

    // 搜索
    if (search) {
      const searchFields = Object.keys(entityDef.fields)
        .filter(key => ['string', 'text'].includes(entityDef.fields[key].type));
      
      if (searchFields.length > 0) {
        const searchConditions = searchFields.map(f => `\`${f}\` LIKE ?`).join(' OR ');
        whereClause += ` AND (${searchConditions})`;
        params.push(`%${search}%`, ...Array(searchFields.length - 1).fill(`%${search}%`));
      }
    }

    // 筛选
    if (filter) {
      try {
        const filterObj = JSON.parse(filter);
        Object.entries(filterObj).forEach(([key, value]) => {
          if (value !== null && value !== '') {
            whereClause += ` AND \`${key}\` = ?`;
            params.push(value);
          }
        });
      } catch (e) {
        // 忽略无效的JSON
      }
    }

    // 统计总数
    const countResult = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${tableName} WHERE ${whereClause}`,
      params
    );
    const total = countResult?.count || 0;

    // 构建排序
    let orderClause = 'ORDER BY created_at DESC';
    if (sort) {
      orderClause = `ORDER BY \`${sort}\` ${order}`;
    }

    // 查询数据
    let data: any[];
    
    // 特殊处理：Employee 实体关联 Position 表获取岗位名称
    if (entity === 'Employee') {
      data = await db.query(
        `SELECT e.*, p.name as position_name, d.name as department_name 
         FROM \`${tableName}\` e 
         LEFT JOIN positions p ON e.position = p.id 
         LEFT JOIN departments d ON e.department_id = d.id 
         WHERE ${whereClause.replace(/`position`/g, 'e.`position`').replace(/`department_id`/g, 'e.`department_id`')} 
         ${orderClause} LIMIT ${pageSizeNum} OFFSET ${offset}`,
        params
      );
    } else {
      data = await db.query(
        `SELECT * FROM \`${tableName}\` WHERE ${whereClause} ${orderClause} LIMIT ${pageSizeNum} OFFSET ${offset}`,
        params
      );
    }

    res.json({
      data,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(total / pageSizeNum)
    });
  } catch (error) {
    console.error('查询列表失败:', error);
    res.status(500).json({ error: '查询列表失败', message: error });
  }
});

/**
 * 查询单条记录
 * GET /api/data/:entity/:id
 */
router.get('/:entity/:id', async (req: Request, res: Response) => {
  try {
    const { entity, id } = req.params;

    const entityDef = metadataService.getEntity(entity);
    if (!entityDef) {
      return res.status(404).json({ success: false, error: `实体 ${entity} 不存在` });
    }

    const tableName = metadataService.getTableName(entity);
    const pkField = metadataService.getPrimaryKey(entity);

    let data: any;

    if (entity === 'Employee') {
      data = await db.queryOne(
        `SELECT e.*, p.name as position_name, d.name as department_name 
         FROM \`${tableName}\` e 
         LEFT JOIN positions p ON e.position = p.id 
         LEFT JOIN departments d ON e.department_id = d.id 
         WHERE e.\`${pkField}\` = ?`,
        [id]
      );
    } else {
      data = await db.queryOne(
        `SELECT * FROM ${tableName} WHERE \`${pkField}\` = ?`,
        [id]
      );
    }

    if (!data) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('查询详情失败:', error);
    res.status(500).json({ success: false, error: '查询详情失败', message: error });
  }
});

/**
 * 创建记录
 * POST /api/data/:entity
 */
router.post('/:entity', async (req: Request, res: Response) => {
  try {
    const { entity } = req.params;
    let data = req.body;

    const entityDef = metadataService.getEntity(entity);
    if (!entityDef) {
      return res.status(404).json({ error: `实体 ${entity} 不存在` });
    }

    if (entityDef.isView) {
      return res.status(400).json({ error: '视图不支持创建操作' });
    }

    // 处理自动生成字段
    data = await metadataService.processAutoFields(entity, data);

    // 处理时间戳
    data = metadataService.addTimestampFields(entity, data, false);

    // 特殊处理：任务WBS编号自动生成
    if (entity === 'Task' || entity === 'tasks') {
      if (!data.wbs_code && data.project_id) {
        data.wbs_code = await wbsService.generateWBSCode(
          data.project_id,
          data.parent_id || null,
          data.task_type || 'milestone'
        );
      }
    }

    // 验证必填字段
    const errors: string[] = [];
    for (const [fieldName, fieldDef] of Object.entries(entityDef.fields)) {
      if (fieldDef.required && !data[fieldName]) {
        errors.push(`${fieldDef.label} 不能为空`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: '验证失败', errors });
    }

    // 构建INSERT语句
    const tableName = metadataService.getTableName(entity);
    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(data);

    await db.insert(
      `INSERT INTO ${tableName} (\`${fields.join('`, `')}\`) VALUES (${placeholders})`,
      values
    );

    // 获取插入后的完整记录
    const pkField = metadataService.getPrimaryKey(entity);
    const insertedData = await db.queryOne(
      `SELECT * FROM ${tableName} WHERE \`${pkField}\` = ?`,
      [data[pkField]]
    );

    res.status(201).json(insertedData);
} catch (error: any) {
    console.error('创建记录失败:', error);
    res.status(500).json({ error: '创建记录失败', message: error.message, sql: error.sql, code: error.code });
  }
});

/**
 * 更新记录
 * PUT /api/data/:entity/:id
 */
router.put('/:entity/:id', async (req: Request, res: Response) => {
  try {
    const { entity, id } = req.params;
    let data = req.body;

    const entityDef = metadataService.getEntity(entity);
    if (!entityDef) {
      return res.status(404).json({ error: `实体 ${entity} 不存在` });
    }

    if (entityDef.isView) {
      return res.status(400).json({ error: '视图不支持更新操作' });
    }

    // 处理时间戳
    data = metadataService.addTimestampFields(entity, data, true);

    // 验证必填字段
    const errors: string[] = [];
    for (const [fieldName, fieldDef] of Object.entries(entityDef.fields)) {
      if (fieldDef.required && data[fieldName] !== undefined && data[fieldName] === '') {
        errors.push(`${fieldDef.label} 不能为空`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: '验证失败', errors });
    }

    // 构建UPDATE语句
    const tableName = metadataService.getTableName(entity);
    const pkField = metadataService.getPrimaryKey(entity);
    const fields = Object.keys(data);
    const setClause = fields.map(f => `\`${f}\` = ?`).join(', ');
    const values = [...Object.values(data), id];

    await db.update(
      `UPDATE ${tableName} SET ${setClause} WHERE \`${pkField}\` = ?`,
      values
    );

    // 获取更新后的完整记录
    const updatedData = await db.queryOne(
      `SELECT * FROM ${tableName} WHERE \`${pkField}\` = ?`,
      [id]
    );

    res.json(updatedData);
  } catch (error) {
    console.error('更新记录失败:', error);
    res.status(500).json({ error: '更新记录失败', message: error });
  }
});

/**
 * 删除记录
 * DELETE /api/data/:entity/:id
 */
router.delete('/:entity/:id', async (req: Request, res: Response) => {
  try {
    const { entity, id } = req.params;

    const entityDef = metadataService.getEntity(entity);
    if (!entityDef) {
      return res.status(404).json({ error: `实体 ${entity} 不存在` });
    }

    if (entityDef.isView) {
      return res.status(400).json({ error: '视图不支持删除操作' });
    }

    const tableName = metadataService.getTableName(entity);
    const pkField = metadataService.getPrimaryKey(entity);

    await db.delete(
      `DELETE FROM ${tableName} WHERE \`${pkField}\` = ?`,
      [id]
    );

    res.json({ message: '删除成功' });
  } catch (error: any) {
    console.error('删除记录失败:', error);
    
    // 检查是否是外键约束错误
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ error: '无法删除：该记录被其他数据引用' });
    }
    res.status(500).json({ error: '删除记录失败', message: error });
  }
});

/**
 * 批量操作
 * POST /api/data/:entity/batch
 */
router.post('/:entity/batch', async (req: Request, res: Response) => {
  try {
    const { entity } = req.params;
    const { action, data, ids } = req.body;

    const entityDef = metadataService.getEntity(entity);
    if (!entityDef) {
      return res.status(404).json({ error: `实体 ${entity} 不存在` });
    }

    const tableName = metadataService.getTableName(entity);
    const pkField = metadataService.getPrimaryKey(entity);

    switch (action) {
      case 'batchDelete':
        if (!Array.isArray(ids) || ids.length === 0) {
          return res.status(400).json({ error: '请提供要删除的ID列表' });
        }
        const placeholders = ids.map(() => '?').join(', ');
        await db.delete(
          `DELETE FROM ${tableName} WHERE \`${pkField}\` IN (${placeholders})`,
          ids
        );
        res.json({ message: `成功删除 ${ids.length} 条记录` });
        break;

      case 'batchUpdate':
        if (!Array.isArray(ids) || ids.length === 0) {
          return res.status(400).json({ error: '请提供要更新的ID列表' });
        }
        if (!data || typeof data !== 'object') {
          return res.status(400).json({ error: '请提供更新数据' });
        }
        const updatePlaceholders = ids.map(() => '?').join(', ');
        const updateSetClause = Object.keys(data).map(f => `\`${f}\` = ?`).join(', ');
        await db.update(
          `UPDATE ${tableName} SET ${updateSetClause} WHERE \`${pkField}\` IN (${updatePlaceholders})`,
          [...Object.values(data), ...ids]
        );
        res.json({ message: `成功更新 ${ids.length} 条记录` });
        break;

      default:
        res.status(400).json({ error: `不支持的操作: ${action}` });
    }
  } catch (error) {
    console.error('批量操作失败:', error);
    res.status(500).json({ error: '批量操作失败', message: error });
  }
});

/**
 * 清空所有记录（仅管理员）
 * POST /api/data/:entity/clear-all
 */
router.post('/:entity/clear-all', async (req: Request, res: Response) => {
  try {
    const { entity } = req.params;

    // 验证实体
    const entityDef = metadataService.getEntity(entity);
    if (!entityDef) {
      return res.status(404).json({ error: `实体 ${entity} 不存在` });
    }

    if (entityDef.isView) {
      return res.status(400).json({ error: '视图不支持清空操作' });
    }

    const tableName = metadataService.getTableName(entity);

    // 执行清空操作
    await db.execute(`DELETE FROM ${tableName}`);

    res.json({ message: '所有记录已清空' });
  } catch (error: any) {
    console.error('清空记录失败:', error);

    // 检查是否是外键约束错误
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ error: '无法清空：部分记录被其他数据引用' });
    }
    res.status(500).json({ error: '清空记录失败', message: error });
  }
});

export default router;
