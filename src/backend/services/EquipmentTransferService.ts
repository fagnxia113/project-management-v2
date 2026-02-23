import { db } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

export type TransferScenario = 'A' | 'B' | 'C';
export type TransferStatus = 'pending' | 'approved' | 'rejected' | 'in_transit' | 'completed' | 'cancelled';

export interface EquipmentTransferRequest {
  id: string;
  transfer_no: string;
  scenario: TransferScenario;
  equipment_id: string;
  equipment_name: string;
  equipment_code: string;
  from_warehouse_id?: string;
  from_warehouse_name?: string;
  from_project_id?: string;
  from_project_name?: string;
  to_project_id: string;
  to_project_name: string;
  requester_id: string;
  requester_name: string;
  reason: string;
  status: TransferStatus;
  expected_date?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface TransferApproval {
  id: string;
  transfer_id: string;
  approver_type: 'warehouse_manager' | 'from_pm' | 'to_pm' | 'purchase_manager';
  approver_id: string;
  approver_name: string;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  approved_at?: Date;
}

export class EquipmentTransferService {
  /**
   * 判断调拨场景
   * A: 国内有库存 → 仓库直接发货
   * B: 国内无库存 → 外借或采购后发货
   * C: 国外项目间 → 双方项目经理审批
   */
  async determineScenario(
    equipmentId: string,
    toProjectId: string
  ): Promise<TransferScenario> {
    // 获取设备信息
    const equipment = await db.queryOne<{
      location_status: string;
      warehouse_id: string | null;
      project_id: string | null;
    }>(
      'SELECT location_status, warehouse_id, project_id FROM equipment WHERE id = ?',
      [equipmentId]
    );

    if (!equipment) {
      throw new Error('设备不存在');
    }

    // 获取目标项目信息
    const toProject = await db.queryOne<{ country: string }>(
      'SELECT country FROM projects WHERE id = ?',
      [toProjectId]
    );

    // 获取仓库信息
    let warehouse: any = null;
    if (equipment.warehouse_id) {
      warehouse = await db.queryOne<{ location: string }>(
        'SELECT location FROM warehouses WHERE id = ?',
        [equipment.warehouse_id]
      );
    }

    // 判断场景
    if (equipment.location_status === 'warehouse' && warehouse?.location === 'China') {
      // 设备在国内仓库
      return 'A';
    } else if (equipment.location_status === 'warehouse' && warehouse?.location !== 'China') {
      // 设备在国外仓库
      if (toProject?.country !== 'China') {
        return 'C'; // 国外项目间调拨
      }
      return 'B'; // 需要从国外调回
    } else if (equipment.location_status === 'in_project') {
      // 设备在项目中
      return 'C'; // 项目间调拨
    }

    // 默认场景B
    return 'B';
  }

  /**
   * 创建调拨申请
   */
  async createTransferRequest(params: {
    equipment_id: string;
    to_project_id: string;
    requester_id: string;
    requester_name: string;
    reason: string;
    expected_date?: string;
    notes?: string;
  }): Promise<EquipmentTransferRequest> {
    const id = uuidv4();
    const transferNo = `TRF-${Date.now().toString().slice(-6)}`;

    // 获取设备信息
    const equipment = await db.queryOne<{
      name: string;
      manage_code: string;
      location_status: string;
      warehouse_id: string | null;
      project_id: string | null;
    }>(
      'SELECT name, manage_code, location_status, warehouse_id, project_id FROM equipment WHERE id = ?',
      [params.equipment_id]
    );

    if (!equipment) {
      throw new Error('设备不存在');
    }

    // 判断场景
    const scenario = await this.determineScenario(params.equipment_id, params.to_project_id);

    // 获取来源信息
    let fromWarehouseId: string | null = null;
    let fromWarehouseName: string | null = null;
    let fromProjectId: string | null = null;
    let fromProjectName: string | null = null;

    if (equipment.location_status === 'warehouse' && equipment.warehouse_id) {
      const warehouse = await db.queryOne<{ id: string; name: string }>(
        'SELECT id, name FROM warehouses WHERE id = ?',
        [equipment.warehouse_id]
      );
      fromWarehouseId = warehouse?.id || null;
      fromWarehouseName = warehouse?.name || null;
    } else if (equipment.location_status === 'in_project' && equipment.project_id) {
      const project = await db.queryOne<{ id: string; name: string }>(
        'SELECT id, name FROM projects WHERE id = ?',
        [equipment.project_id]
      );
      fromProjectId = project?.id || null;
      fromProjectName = project?.name || null;
    }

    // 获取目标项目信息
    const toProject = await db.queryOne<{ name: string }>(
      'SELECT name FROM projects WHERE id = ?',
      [params.to_project_id]
    );

    // 创建调拨记录
    await db.insert(
      `INSERT INTO equipment_transfers (
        id, transfer_no, scenario, equipment_id, equipment_name, equipment_code,
        from_warehouse_id, from_warehouse_name, from_project_id, from_project_name,
        to_project_id, to_project_name, requester_id, requester_name, reason,
        status, expected_date, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id, transferNo, scenario, params.equipment_id, equipment.name, equipment.manage_code,
        fromWarehouseId, fromWarehouseName, fromProjectId, fromProjectName,
        params.to_project_id, toProject?.name, params.requester_id, params.requester_name,
        params.reason, 'pending', params.expected_date || null, params.notes || null
      ]
    );

    // 创建审批节点
    await this.createApprovalNodes(id, scenario, fromProjectId, params.to_project_id);

    return this.getTransferById(id) as Promise<EquipmentTransferRequest>;
  }

  /**
   * 创建审批节点
   */
  private async createApprovalNodes(
    transferId: string,
    scenario: TransferScenario,
    fromProjectId: string | null,
    toProjectId: string
  ): Promise<void> {
    const approvers: Array<{ type: string; projectId?: string }> = [];

    switch (scenario) {
      case 'A':
        // 场景A：仓库直接发货 - 需要仓库管理员和目标项目经理审批
        approvers.push({ type: 'warehouse_manager' });
        approvers.push({ type: 'to_pm', projectId: toProjectId });
        break;
      case 'B':
        // 场景B：无库存需采购 - 需要采购经理和目标项目经理审批
        approvers.push({ type: 'purchase_manager' });
        approvers.push({ type: 'to_pm', projectId: toProjectId });
        break;
      case 'C':
        // 场景C：项目间调拨 - 需要双方项目经理审批
        if (fromProjectId) {
          approvers.push({ type: 'from_pm', projectId: fromProjectId });
        }
        approvers.push({ type: 'to_pm', projectId: toProjectId });
        break;
    }

    for (let i = 0; i < approvers.length; i++) {
      const approver = approvers[i];
      let approverId = 'system';
      let approverName = '系统管理员';

      // 获取项目经理信息
      if (approver.projectId) {
        const project = await db.queryOne<{ manager_id: string; manager: string }>(
          'SELECT manager_id, manager FROM projects WHERE id = ?',
          [approver.projectId]
        );
        if (project) {
          approverId = project.manager_id || 'system';
          approverName = project.manager || '系统管理员';
        }
      }

      await db.insert(
        `INSERT INTO transfer_approvals (
          id, transfer_id, approver_type, approver_id, approver_name, status, created_at
        ) VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
        [uuidv4(), transferId, approver.type, approverId, approverName]
      );
    }
  }

  /**
   * 获取调拨记录
   */
  async getTransferById(id: string): Promise<EquipmentTransferRequest | undefined> {
    return db.queryOne<EquipmentTransferRequest>(
      'SELECT * FROM equipment_transfers WHERE id = ?',
      [id]
    );
  }

  /**
   * 处理审批
   */
  async handleApproval(
    transferId: string,
    approverId: string,
    action: 'approve' | 'reject',
    comment?: string
  ): Promise<{ completed: boolean; status: TransferStatus }> {
    // 获取当前审批节点
    const currentApproval = await db.queryOne<TransferApproval>(
      `SELECT * FROM transfer_approvals 
       WHERE transfer_id = ? AND status = 'pending' 
       ORDER BY created_at ASC LIMIT 1`,
      [transferId]
    );

    if (!currentApproval) {
      throw new Error('没有待审批的节点');
    }

    // 更新审批状态
    await db.execute(
      `UPDATE transfer_approvals 
       SET status = ?, comment = ?, approved_at = NOW() 
       WHERE id = ?`,
      [action === 'approve' ? 'approved' : 'rejected', comment || null, currentApproval.id]
    );

    if (action === 'reject') {
      // 拒绝，更新调拨状态
      await db.execute(
        'UPDATE equipment_transfers SET status = ?, updated_at = NOW() WHERE id = ?',
        ['rejected', transferId]
      );
      return { completed: true, status: 'rejected' };
    }

    // 检查是否还有待审批节点
    const nextApproval = await db.queryOne<TransferApproval>(
      `SELECT * FROM transfer_approvals 
       WHERE transfer_id = ? AND status = 'pending' 
       ORDER BY created_at ASC LIMIT 1`,
      [transferId]
    );

    if (nextApproval) {
      // 还有下一个审批节点
      return { completed: false, status: 'pending' };
    }

    // 所有审批通过，执行调拨
    await this.executeTransfer(transferId);
    return { completed: true, status: 'completed' };
  }

  /**
   * 执行调拨
   */
  private async executeTransfer(transferId: string): Promise<void> {
    const transfer = await this.getTransferById(transferId);
    if (!transfer) return;

    // 更新设备位置状态
    await db.execute(
      `UPDATE equipment SET 
        location_status = 'in_project',
        project_id = ?,
        project_name = ?,
        updated_at = NOW()
       WHERE id = ?`,
      [transfer.to_project_id, transfer.to_project_name, transfer.equipment_id]
    );

    // 更新调拨状态
    await db.execute(
      'UPDATE equipment_transfers SET status = ?, updated_at = NOW() WHERE id = ?',
      ['completed', transferId]
    );

    // 如果是从项目调出，更新项目人员表
    if (transfer.from_project_id) {
      // 记录设备调出日志
      console.log(`设备 ${transfer.equipment_name} 从项目 ${transfer.from_project_name} 调拨到 ${transfer.to_project_name}`);
    }
  }

  /**
   * 获取调拨列表
   */
  async getTransfers(params?: {
    status?: TransferStatus;
    scenario?: TransferScenario;
    project_id?: string;
  }): Promise<EquipmentTransferRequest[]> {
    let sql = 'SELECT * FROM equipment_transfers WHERE 1=1';
    const values: any[] = [];

    if (params?.status) {
      sql += ' AND status = ?';
      values.push(params.status);
    }

    if (params?.scenario) {
      sql += ' AND scenario = ?';
      values.push(params.scenario);
    }

    if (params?.project_id) {
      sql += ' AND (from_project_id = ? OR to_project_id = ?)';
      values.push(params.project_id, params.project_id);
    }

    sql += ' ORDER BY created_at DESC';

    return db.query<EquipmentTransferRequest>(sql, values);
  }
}

export const equipmentTransferService = new EquipmentTransferService();
