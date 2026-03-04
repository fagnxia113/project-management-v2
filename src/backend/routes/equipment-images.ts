import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { equipmentImageService } from '../services/EquipmentImageService.js';
import { equipmentAccessoryService } from '../services/EquipmentAccessoryService.js';

const router = Router();

const uploadDir = path.join(process.cwd(), 'uploads', 'equipment-images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `equipment-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('只支持上传图片文件（jpeg, jpg, png, gif, webp）'));
    }
  }
});

router.post('/upload', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '请上传图片' });
    }

    const { 
      equipment_id, 
      equipment_name, 
      model_no, 
      category, 
      image_type, 
      business_type, 
      business_id, 
      notes 
    } = req.body;

    if (!image_type) {
      return res.status(400).json({ success: false, error: '请指定图片类型' });
    }

    const userId = (req as any).user?.id;
    const userName = (req as any).user?.name;

    const imageUrl = `/uploads/equipment-images/${req.file.filename}`;

    const image = await equipmentImageService.createImage({
      equipment_id,
      equipment_name,
      model_no,
      category,
      image_type,
      image_url: imageUrl,
      image_name: req.file.originalname,
      image_size: req.file.size,
      image_format: path.extname(req.file.originalname).toLowerCase().replace('.', ''),
      business_type,
      business_id,
      uploader_id: userId,
      uploader_name: userName,
      notes
    });

    res.json({ success: true, data: image });
  } catch (error: any) {
    console.error('[EquipmentImages] 上传图片失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/batch-upload', upload.array('images', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: '请上传图片' });
    }

    const { 
      equipment_id, 
      equipment_name, 
      model_no, 
      category, 
      image_type, 
      business_type, 
      business_id, 
      notes 
    } = req.body;

    if (!image_type) {
      return res.status(400).json({ success: false, error: '请指定图片类型' });
    }

    const userId = (req as any).user?.id;
    const userName = (req as any).user?.name;

    const imageDtos = files.map(file => ({
      equipment_id,
      equipment_name,
      model_no,
      category,
      image_type,
      image_url: `/uploads/equipment-images/${file.filename}`,
      image_name: file.originalname,
      image_size: file.size,
      image_format: path.extname(file.originalname).toLowerCase().replace('.', ''),
      business_type,
      business_id,
      uploader_id: userId,
      uploader_name: userName,
      notes
    }));

    const images = await equipmentImageService.createBatchImages(imageDtos);

    res.json({ success: true, data: images });
  } catch (error: any) {
    console.error('[EquipmentImages] 批量上传图片失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const image = await equipmentImageService.getById(req.params.id);
    
    if (!image) {
      return res.status(404).json({ success: false, error: '图片不存在' });
    }
    
    res.json({ success: true, data: image });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/equipment/:equipmentId', async (req: Request, res: Response) => {
  try {
    const images = await equipmentImageService.getByEquipmentId(req.params.equipmentId);
    res.json({ success: true, data: images });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/business/:businessType/:businessId', async (req: Request, res: Response) => {
  try {
    const images = await equipmentImageService.getByBusiness(
      req.params.businessType as any,
      req.params.businessId
    );
    res.json({ success: true, data: images });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/equipment/:equipmentId/type/:imageType', async (req: Request, res: Response) => {
  try {
    const images = await equipmentImageService.getByType(
      req.params.equipmentId,
      req.params.imageType as any
    );
    res.json({ success: true, data: images });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/equipment/:equipmentId/inbound', async (req: Request, res: Response) => {
  try {
    const images = await equipmentImageService.getInboundImages(req.params.equipmentId);
    res.json({ success: true, data: images });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/transfer/:transferOrderId', async (req: Request, res: Response) => {
  try {
    const images = await equipmentImageService.getTransferImages(req.params.transferOrderId);
    res.json({ success: true, data: images });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const success = await equipmentImageService.updateImage(req.params.id, req.body);
    
    if (!success) {
      return res.status(400).json({ success: false, error: '更新失败' });
    }
    
    res.json({ success: true, message: '更新成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const success = await equipmentImageService.deleteImage(req.params.id);
    
    if (!success) {
      return res.status(404).json({ success: false, error: '图片不存在' });
    }
    
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/accessories', async (req: Request, res: Response) => {
  try {
    const accessory = await equipmentAccessoryService.createAccessoryInstance(req.body);
    res.json({ success: true, data: accessory });
  } catch (error: any) {
    console.error('[EquipmentAccessories] 创建附件失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/accessories/relation', async (req: Request, res: Response) => {
  try {
    const relation = await equipmentAccessoryService.createAccessoryRelation(req.body);
    res.json({ success: true, data: relation });
  } catch (error: any) {
    console.error('[EquipmentAccessories] 创建附件关联失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/accessories/:id', async (req: Request, res: Response) => {
  try {
    const accessory = await equipmentAccessoryService.getAccessoryById(req.params.id);
    
    if (!accessory) {
      return res.status(404).json({ success: false, error: '附件不存在' });
    }
    
    res.json({ success: true, data: accessory });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/accessories/host/:hostEquipmentId', async (req: Request, res: Response) => {
  try {
    const accessories = await equipmentAccessoryService.getAccessoriesWithDetails(req.params.hostEquipmentId);
    res.json({ success: true, data: accessories });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/accessories/host/:hostEquipmentId/relations', async (req: Request, res: Response) => {
  try {
    const relations = await equipmentAccessoryService.getRelationsByHost(req.params.hostEquipmentId);
    res.json({ success: true, data: relations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/accessories/host/:hostEquipmentId/statistics', async (req: Request, res: Response) => {
  try {
    const stats = await equipmentAccessoryService.getAccessoryStatistics(req.params.hostEquipmentId);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/accessories/:id', async (req: Request, res: Response) => {
  try {
    const success = await equipmentAccessoryService.updateAccessoryInstance(req.params.id, req.body);
    
    if (!success) {
      return res.status(400).json({ success: false, error: '更新失败' });
    }
    
    res.json({ success: true, message: '更新成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/accessories/relation/:id', async (req: Request, res: Response) => {
  try {
    const success = await equipmentAccessoryService.updateAccessoryRelation(req.params.id, req.body);
    
    if (!success) {
      return res.status(400).json({ success: false, error: '更新失败' });
    }
    
    res.json({ success: true, message: '更新成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/accessories/:id', async (req: Request, res: Response) => {
  try {
    const success = await equipmentAccessoryService.deleteAccessoryInstance(req.params.id);
    
    if (!success) {
      return res.status(404).json({ success: false, error: '附件不存在' });
    }
    
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/accessories/relation/:id', async (req: Request, res: Response) => {
  try {
    const success = await equipmentAccessoryService.deleteAccessoryRelation(req.params.id);
    
    if (!success) {
      return res.status(404).json({ success: false, error: '关联不存在' });
    }
    
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/accessories/host/:hostEquipmentId/all', async (req: Request, res: Response) => {
  try {
    const success = await equipmentAccessoryService.deleteAllAccessoriesByHost(req.params.hostEquipmentId);
    
    if (!success) {
      return res.status(400).json({ success: false, error: '删除失败' });
    }
    
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
