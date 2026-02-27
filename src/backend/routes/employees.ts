import { Router, Request, Response } from 'express';
import { employeeService } from '../services/EmployeeService.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, status, department_id, role, page, pageSize } = req.query;
    
    const result = await employeeService.getEmployees({
      search: search as string,
      status: status as string,
      department_id: department_id as string,
      role: role as string,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 100
    });
    
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/active', async (req: Request, res: Response) => {
  try {
    const employees = await employeeService.getActiveEmployees();
    res.json({ success: true, data: employees });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const employee = await employeeService.getEmployeeById(id);
    
    if (!employee) {
      return res.status(404).json({ error: '员工不存在' });
    }
    
    res.json({ success: true, data: employee });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/user-id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const employee = await employeeService.getEmployeeById(id);
    
    if (!employee) {
      return res.status(404).json({ error: '员工不存在' });
    }
    
    if (!employee.user_id) {
      return res.status(404).json({ error: '该员工没有关联的用户账号' });
    }
    
    res.json({ success: true, data: { userId: employee.user_id } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
