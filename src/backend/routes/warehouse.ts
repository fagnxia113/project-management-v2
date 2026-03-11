import { Router, Request, Response } from 'express';
import { warehouseServiceV2 as warehouseService } from '../services/WarehouseServiceV2.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const type = req.query.type as string;

    const result = await warehouseService.getWarehouses({ search, status, type, page, pageSize });
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const warehouse = await warehouseService.getWarehouseById(req.params.id as string);
    if (!warehouse) return res.status(404).json({ success: false, error: 'Warehouse not found' });
    res.json({ success: true, data: warehouse });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const warehouse = await warehouseService.createWarehouse(req.body);
    res.status(201).json({ success: true, data: warehouse });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    await warehouseService.updateWarehouse(req.params.id as string, req.body);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await warehouseService.deleteWarehouse(req.params.id as string);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/equipment', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const model_id = req.query.model_id as string;
    const search = req.query.search as string;

    const result = await warehouseService.getWarehouseEquipment(req.params.id as string, { model_id, search, page, pageSize });
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/manager', async (req: Request, res: Response) => {
  try {
    const { db } = await import('../database/connection.js');
    const warehouses = await db.query<any>('SELECT id, manager_id FROM warehouses WHERE id = ?', [req.params.id as string]);
    
    if (!Array.isArray(warehouses) || warehouses.length === 0) {
      return res.status(404).json({ success: false, error: 'Warehouse not found' });
    }
    
    const warehouse = warehouses[0];
    
    if (!warehouse.manager_id) {
      return res.json({ success: true, data: null });
    }
    
    // manager_id 是员工ID，需要先查询员工获取user_id，再查询用户
    const employees = await db.query<any>(
      'SELECT id, user_id, name FROM employees WHERE id = ?',
      [warehouse.manager_id]
    );
    
    if (!employees || employees.length === 0) {
      return res.json({ success: true, data: null });
    }
    
    const employee = employees[0];
    
    // 如果员工有user_id，则查询用户表获取完整用户信息
    if (employee.user_id) {
      const users = await db.query<any>(
        'SELECT id, username, name, role FROM users WHERE id = ?',
        [employee.user_id]
      );
      
      if (Array.isArray(users) && users.length > 0) {
        res.json({ success: true, data: users[0] });
      } else {
        // 如果users表没有，直接返回员工信息
        res.json({ success: true, data: { id: employee.user_id, name: employee.name } });
      }
    } else {
      // 如果员工没有关联user_id，返回员工信息
      res.json({ success: true, data: { id: employee.id, name: employee.name } });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
