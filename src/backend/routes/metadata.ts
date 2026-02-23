import { Router, Request, Response } from 'express';
import { metadataService } from '../services/MetadataService.js';

const router = Router();

/**
 * 获取所有实体元数据
 * GET /api/metadata/entities
 */
router.get('/entities', (req: Request, res: Response) => {
  try {
    const entities = metadataService.getEntities();
    res.json(entities);
  } catch (error) {
    console.error('获取实体元数据失败:', error);
    res.status(500).json({ error: '获取实体元数据失败', message: error });
  }
});

/**
 * 获取单个实体元数据
 * GET /api/metadata/entities/:entity
 */
router.get('/entities/:entity', (req: Request, res: Response) => {
  try {
    const { entity } = req.params;
    const entityName = Array.isArray(entity) ? entity[0] : entity;
    const entityDef = metadataService.getEntity(entityName);
    
    if (!entityDef) {
      return res.status(404).json({ error: `实体 ${entity} 不存在` });
    }

    res.json(entityDef);
  } catch (error) {
    console.error('获取实体元数据失败:', error);
    res.status(500).json({ error: '获取实体元数据失败', message: error });
  }
});

/**
 * 获取所有枚举
 * GET /api/metadata/enums
 */
router.get('/enums', (req: Request, res: Response) => {
  try {
    const enums = metadataService.getEnums();
    res.json(enums);
  } catch (error) {
    console.error('获取枚举失败:', error);
    res.status(500).json({ error: '获取枚举失败', message: error });
  }
});

/**
 * 获取单个枚举
 * GET /api/metadata/enums/:enumName
 */
router.get('/enums/:enumName', (req: Request, res: Response) => {
  try {
    const { enumName } = req.params;
    const enumNameStr = Array.isArray(enumName) ? enumName[0] : enumName;
    const enumDef = metadataService.getEnum(enumNameStr);
    
    if (!enumDef) {
      return res.status(404).json({ error: `枚举 ${enumName} 不存在` });
    }

    res.json(enumDef);
  } catch (error) {
    console.error('获取枚举失败:', error);
    res.status(500).json({ error: '获取枚举失败', message: error });
  }
});

export default router;
