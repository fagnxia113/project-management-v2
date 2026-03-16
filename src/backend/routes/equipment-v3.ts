import express from 'express';
import { equipmentServiceV3 } from '../services/EquipmentServiceV3.js';
import { equipmentAccessoryService } from '../services/EquipmentAccessoryService.js';
import { equipmentInboundServiceV2 } from '../services/EquipmentInboundServiceV2.js';
import { transferServiceV2 } from '../services/TransferServiceV2.js';
import { authenticate } from '../middleware/authMiddleware.js';
import multer from 'multer';

const router = express.Router();
router.use(authenticate);
const upload = multer({ storage: multer.memoryStorage() });

// ========== 设备管理路由 ==========

// 校验管理编码唯一性
router.get('/manage-code/check', async (req, res) => {
  try {
    const code = req.query.code as string;
    const excludeId = req.query.excludeId as string;
    
    if (!code) {
      res.json({ unique: true });
      return;
    }
    
    const isUnique = await equipmentInboundServiceV2.checkManageCodeUnique(code, excludeId);
    res.json({ unique: isUnique });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 获取设备列表
router.get('/equipment', async (req, res) => {
  try {
    const params = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 10,
      category: req.query.category as string,
      status: req.query.status as string,
      locationId: req.query.locationId as string,
      trackingType: req.query.trackingType as 'SERIALIZED' | 'BATCH'
    };

    const result = await equipmentServiceV3.getInstances(params);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 获取设备列表（兼容前端 /instances 路径）
router.get('/instances', async (req, res) => {
  try {
    const params = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 100,
      category: req.query.category as string,
      status: req.query.status as string,
      locationId: req.query.location_id as string || req.query.locationId as string,
      trackingType: req.query.trackingType as 'SERIALIZED' | 'BATCH'
    };

    const result = await equipmentServiceV3.getInstances(params);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 获取设备统计
router.get('/equipment/statistics', async (req, res) => {
  try {
    const statistics = await equipmentServiceV3.getStatistics();
    res.json(statistics);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 获取批次库存
router.get('/equipment/batch-inventory', async (req, res) => {
  try {
    const inventory = await equipmentServiceV3.getBatchInventory();
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 获取设备档案（报废、遗失、维修）
router.get('/equipment/archives', async (req, res) => {
  try {
    const params = {
      status: req.query.status as string,
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 10
    };

    const result = await equipmentServiceV3.getArchives(params);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 创建设备
router.post('/equipment', async (req, res) => {
  try {
    const equipment = await equipmentServiceV3.createInstance(req.body);
    res.json(equipment);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// 更新设备
router.put('/equipment/:id', async (req, res) => {
  try {
    const { version, ...data } = req.body;
    const equipment = await equipmentServiceV3.updateInstance(req.params.id, data, version);
    res.json(equipment);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// 更新设备状态
router.put('/equipment/:id/status', async (req, res) => {
  try {
    const equipment = await equipmentServiceV3.updateInstanceStatus(req.params.id, req.body);
    res.json(equipment);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// ========== 配件管理路由（必须在 /equipment/:id 之前）==========

// 获取配件列表
router.get('/equipment/accessories', async (req, res) => {
  try {
    const result = await equipmentAccessoryService.getAllAccessories({});
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 获取未绑定配件
router.get('/equipment/accessories/unbound', async (req, res) => {
  try {
    const accessories = await equipmentAccessoryService.getUnboundAccessories({});
    res.json(accessories);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 创建配件
router.post('/equipment/accessories', async (req, res) => {
  try {
    const result = await equipmentAccessoryService.createAccessoryInstance(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// 绑定配件
router.post('/equipment/accessories/:id/bind', async (req, res) => {
  try {
    const result = await equipmentAccessoryService.bindAccessoryToEquipment(
      req.params.id as string, 
      req.body.equipment_id || req.body.host_equipment_id,
      req.body.quantity || 1
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// 解绑配件
router.post('/equipment/accessories/:id/unbind', async (req, res) => {
  try {
    const { host_equipment_id, equipment_id, quantity } = req.body;
    const result = await equipmentAccessoryService.unbindAccessoryFromEquipment(
      req.params.id as string,
      host_equipment_id || equipment_id,
      quantity || 1
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// ========== 设备详情（必须在配件路由之后）==========

// 获取设备详情
router.get('/equipment/:id', async (req, res) => {
  try {
    const instance = await equipmentServiceV3.getInstanceById(req.params.id);
    res.json(instance);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

// ========== 入库路由 ==========

// 设备入库（支持文件上传）
router.post('/inbound', upload.array('files'), async (req, res) => {
  try {
    const files = req.files as any[];
    const body = JSON.parse(req.body.data);

    // 处理文件上传
    if (files && files.length > 0) {
      const fileUrls = await equipmentInboundServiceV2.handleBatchFileUpload(files);
      // 这里需要根据文件类型分配到 images 或 attachments
      // 简化处理，实际项目中需要更复杂的逻辑
    }

    const equipment = await equipmentInboundServiceV2.processInbound(body);
    res.json(equipment);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// 配件独立入库
router.post('/inbound/accessory', upload.array('files'), async (req, res) => {
  try {
    const files = req.files as any[];
    const body = JSON.parse(req.body.data);

    // 处理文件上传
    if (files && files.length > 0) {
      const fileUrls = await equipmentInboundServiceV2.handleBatchFileUpload(files);
    }

    const accessory = await equipmentInboundServiceV2.processAccessoryInbound(body);
    res.json(accessory);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// 调拨路由

// 创建调拨单
router.post('/transfer', async (req, res) => {
  try {
    const order = await transferServiceV2.createTransferOrder(req.body);
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// 获取调拨单详情
router.get('/transfer/:id', async (req, res) => {
  try {
    const order = await transferServiceV2.getTransferOrderById(req.params.id);
    res.json(order);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

// 发货
router.post('/transfer/:id/dispatch', async (req, res) => {
  try {
    let body = req.body;

    // 如果body是字符串，尝试解析
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        // 解析失败，继续使用原始body
      }
    }

    // 如果items是字符串，也需要解析
    if (body && body.items && typeof body.items === 'string') {
      try {
        body.items = JSON.parse(body.items);
      } catch (e) {
        // 解析失败，继续使用原始items
      }
    }

    if (!body || !body.items) {
      res.status(400).json({ error: '请求体格式错误', body: req.body });
      return;
    }

    const files = req.files as any[];
    if (files && files.length > 0) {
      const fileUrls = await equipmentInboundServiceV2.handleBatchFileUpload(files);
    }

    const result = await transferServiceV2.dispatchOrder(req.params.id, body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// 收货
router.post('/transfer/:id/receive', async (req, res) => {
  try {
    const files = req.files as any[];
    let body = req.body;

    if (req.body.data) {
      body = JSON.parse(req.body.data);
    }

    if (files && files.length > 0) {
      const fileUrls = await equipmentInboundServiceV2.handleBatchFileUpload(files);
    }

    const result = await transferServiceV2.receiveOrder(req.params.id, body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// 确认异常
router.post('/transfer/:id/confirm-exception', async (req, res) => {
  try {
    const result = await transferServiceV2.confirmException(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// 获取调拨单列表
router.get('/transfer', async (req, res) => {
  try {
    const params = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 10,
      status: req.query.status as string
    };

    const result = await transferServiceV2.getTransferOrders(params);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;