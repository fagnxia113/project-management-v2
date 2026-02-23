import { db } from '../database/connection.js';
import { notificationService } from './NotificationService.js';
import { v4 as uuidv4 } from 'uuid';

export interface PurchaseRequest {
  id: string;
  request_no: string;
  equipment_id?: string;
  equipment_name: string;
  equipment_spec?: string;
  quantity: number;
  reason: string;
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'purchasing' | 'arrived' | 'cancelled';
  requester_id: string;
  requester_name: string;
  project_id?: string;
  project_name?: string;
  estimated_price?: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export class PurchaseReminderService {
  /**
   * 检查设备库存并发送采购提醒
   */
  async checkInventoryAndRemind(): Promise<{
    checked: number;
    needsPurchase: number;
    reminders: string[];
  }> {
    const reminders: string[] = [];
    let checked = 0;
    let needsPurchase = 0;

    // 获取所有仓库的设备统计
    const warehouseStats = await db.query<{
      warehouse_id: string;
      warehouse_name: string;
      location: string;
      total_equipment: number;
      available_equipment: number;
    }>(
      `SELECT 
        w.id as warehouse_id,
        w.name as warehouse_name,
        w.location,
        COUNT(e.id) as total_equipment,
        SUM(CASE WHEN e.location_status = 'warehouse' AND e.use_status = 'idle' THEN 1 ELSE 0 END) as available_equipment
       FROM warehouses w
       LEFT JOIN equipment e ON e.warehouse_id = w.id
       GROUP BY w.id, w.name, w.location`
    );

    checked = warehouseStats.length;

    // 检查每个仓库的库存情况
    for (const stat of warehouseStats) {
      if (stat.available_equipment === 0 && stat.total_equipment > 0) {
        // 仓库有设备但无可用设备
        needsPurchase++;
        const message = `${stat.warehouse_name}(${stat.location})无可用设备，共${stat.total_equipment}台设备均在使用或维修中`;
        reminders.push(message);
      }
    }

    // 检查待处理的设备调拨请求（无库存可调）
    const pendingTransfers = await db.query<{
      id: string;
      equipment_name: string;
      to_project_name: string;
      scenario: string;
    }>(
      `SELECT id, equipment_name, to_project_name, scenario
       FROM equipment_transfers
       WHERE status = 'pending' AND scenario = 'B'`
    );

    for (const transfer of pendingTransfers) {
      const message = `设备调拨请求待处理: ${transfer.equipment_name} -> ${transfer.to_project_name}，需要采购`;
      reminders.push(message);
    }

    return { checked, needsPurchase, reminders };
  }

  /**
   * 创建采购申请
   */
  async createPurchaseRequest(params: {
    equipment_id?: string;
    equipment_name: string;
    equipment_spec?: string;
    quantity: number;
    reason: string;
    urgency?: 'low' | 'normal' | 'high' | 'urgent';
    requester_id: string;
    requester_name: string;
    project_id?: string;
    estimated_price?: number;
    notes?: string;
  }): Promise<PurchaseRequest> {
    const id = uuidv4();
    const requestNo = `PUR-${Date.now().toString().slice(-6)}`;

    // 获取项目名称
    let projectName: string | undefined;
    if (params.project_id) {
      const project = await db.queryOne<{ name: string }>(
        'SELECT name FROM projects WHERE id = ?',
        [params.project_id]
      );
      projectName = project?.name;
    }

    await db.insert(
      `INSERT INTO purchase_requests (
        id, request_no, equipment_id, equipment_name, equipment_spec,
        quantity, reason, urgency, status, requester_id, requester_name,
        project_id, project_name, estimated_price, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id, requestNo, params.equipment_id || null, params.equipment_name,
        params.equipment_spec || null, params.quantity, params.reason,
        params.urgency || 'normal', params.requester_id, params.requester_name,
        params.project_id || null, projectName || null,
        params.estimated_price || null, params.notes || null
      ]
    );

    // 通知采购负责人
    await this.notifyPurchaseManager(id, params);

    return this.getPurchaseRequestById(id) as Promise<PurchaseRequest>;
  }

  /**
   * 通知采购负责人
   */
  private async notifyPurchaseManager(requestId: string, params: {
    equipment_name: string;
    quantity: number;
    urgency: string;
    requester_name: string;
  }): Promise<void> {
    // 获取采购负责人（这里假设有一个系统配置）
    const config = await db.queryOne<{ value: string }>(
      `SELECT value FROM system_configs WHERE key = 'purchase_manager_id'`
    );

    if (config?.value) {
      const urgencyText = {
        'low': '低',
        'normal': '普通',
        'high': '高',
        'urgent': '紧急'
      }[params.urgency] || '普通';

      await notificationService.sendNotification({
        user_id: config.value,
        type: 'in_app',
        title: `【采购申请】${params.equipment_name} x ${params.quantity}`,
        content: `紧急程度: ${urgencyText}\n申请人: ${params.requester_name}\n请及时处理采购申请。`,
        priority: params.urgency === 'urgent' ? 'urgent' : params.urgency === 'high' ? 'high' : 'normal',
        link: `/purchase/${requestId}`
      });
    }
  }

  /**
   * 获取采购申请
   */
  private async getPurchaseRequestById(id: string): Promise<PurchaseRequest | undefined> {
    return db.queryOne<PurchaseRequest>(
      'SELECT * FROM purchase_requests WHERE id = ?',
      [id]
    );
  }

  /**
   * 获取采购申请列表
   */
  async getPurchaseRequests(params?: {
    status?: string;
    project_id?: string;
    requester_id?: string;
  }): Promise<PurchaseRequest[]> {
    let sql = 'SELECT * FROM purchase_requests WHERE 1=1';
    const values: any[] = [];

    if (params?.status) {
      sql += ' AND status = ?';
      values.push(params.status);
    }

    if (params?.project_id) {
      sql += ' AND project_id = ?';
      values.push(params.project_id);
    }

    if (params?.requester_id) {
      sql += ' AND requester_id = ?';
      values.push(params.requester_id);
    }

    sql += ' ORDER BY created_at DESC';

    return db.query<PurchaseRequest>(sql, values);
  }

  /**
   * 更新采购申请状态
   */
  async updatePurchaseRequestStatus(
    id: string,
    status: PurchaseRequest['status'],
    notes?: string
  ): Promise<void> {
    await db.execute(
      `UPDATE purchase_requests SET status = ?, notes = CONCAT(IFNULL(notes, ''), ?), updated_at = NOW() WHERE id = ?`,
      [status, notes ? `\n${notes}` : '', id]
    );
  }

  /**
   * 自动创建采购申请（当设备调拨场景B时）
   */
  async autoCreateFromTransfer(transferId: string): Promise<PurchaseRequest | null> {
    const transfer = await db.queryOne<{
      equipment_id: string;
      equipment_name: string;
      to_project_id: string;
      to_project_name: string;
      requester_id: string;
      requester_name: string;
    }>(
      'SELECT * FROM equipment_transfers WHERE id = ? AND scenario = ?',
      [transferId, 'B']
    );

    if (!transfer) return null;

    return this.createPurchaseRequest({
      equipment_id: transfer.equipment_id,
      equipment_name: transfer.equipment_name,
      quantity: 1,
      reason: `项目 ${transfer.to_project_name} 需要该设备，但仓库无库存`,
      urgency: 'high',
      requester_id: transfer.requester_id,
      requester_name: transfer.requester_name,
      project_id: transfer.to_project_id
    });
  }
}

export const purchaseReminderService = new PurchaseReminderService();
