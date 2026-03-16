import { db } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
import { equipmentServiceV3 } from './EquipmentServiceV3.js';
import { equipmentAccessoryService } from './EquipmentAccessoryService.js';

/**
 * 调拨服务 V2
 * 支持双轨制库存的调拨流程
 */
export class TransferServiceV2 {
  /**
   * 创建调拨单
   */
  async createTransferOrder(data: {
    from_location_id: string;
    to_location_id: string;
    equipment_id: string;
    dispatcher_id: string;
  }) {
    const { from_location_id, to_location_id, equipment_id, dispatcher_id } = data;

    // 验证设备存在
    const equipment = await equipmentServiceV3.getInstanceById(equipment_id);

    // 生成订单号
    const orderNo = `TR${Date.now()}${Math.floor(Math.random() * 10000)}`;
    const orderId = uuidv4();

    // 开始事务
    await db.executeTransaction(async (tx) => {
      // 创建主单
      await tx.execute(
        `INSERT INTO workflow_orders 
         (id, order_no, type, status, from_location_id, to_location_id, dispatcher_id)
         VALUES (?, ?, 'transfer', 'CREATED', ?, ?, ?)`,
        [orderId, orderNo, from_location_id, to_location_id, dispatcher_id]
      );

      // 创建设备明细
      await tx.execute(
        `INSERT INTO workflow_order_items 
         (id, order_id, item_type, item_id, plan_qty, status)
         VALUES (?, ?, 'equipment', ?, ?, 'PENDING')`,
        [uuidv4(), orderId, equipment_id, equipment.quantity]
      );

      // 自动关联配件
      if (equipment.accessories && equipment.accessories.length > 0) {
        for (const accessory of equipment.accessories) {
          await tx.execute(
            `INSERT INTO workflow_order_items 
             (id, order_id, item_type, item_id, plan_qty, status)
             VALUES (?, ?, 'accessory', ?, ?, 'PENDING')`,
            [uuidv4(), orderId, accessory.id, accessory.quantity]
          );
        }
      }
    });

    // 查询创建的明细
    const items = await db.query<any>(
      'SELECT * FROM workflow_order_items WHERE order_id = ?',
      [orderId]
    );

    return { order_id: orderId, order_no: orderNo, items };
  }

  /**
   * 获取调拨单详情
   */
  async getTransferOrderById(orderId: string) {
    const order = await db.queryOne<any>(
      'SELECT * FROM workflow_orders WHERE id = ?',
      [orderId]
    );

    if (!order) {
      throw new Error('调拨单不存在');
    }

    const items = await db.query<any>(
      'SELECT * FROM workflow_order_items WHERE order_id = ?',
      [orderId]
    );

    for (const item of items) {
      if (item.item_type === 'equipment' && item.item_id) {
        const equipment = await db.queryOne<any>(
          'SELECT * FROM equipment_instances WHERE id = ?',
          [item.item_id]
        );
        if (equipment) {
          Object.assign(item, {
            equipment_name: equipment.name,
            equipment_category: equipment.category,
            model_no: equipment.model_no,
            manufacturer: equipment.manufacturer,
            serial_number: equipment.serial_number,
            management_number: equipment.management_number,
            purchase_date: equipment.purchase_date,
            purchase_price: equipment.purchase_price,
            technical_params: equipment.technical_params,
            calibration_date: equipment.calibration_date,
            certificate_number: equipment.certificate_number,
            issuing_authority: equipment.issuing_authority,
            status: equipment.status
          });
        }
      }
    }

    return { ...order, items };
  }

  /**
   * 发货
   */
  async dispatchOrder(orderId: string, data: {
    dispatch_overall_image: string;
    items: Array<{
      item_id: string;
      dispatch_item_image: string;
    }>;
  }) {
    let { dispatch_overall_image, items } = data;

    // 兼容 items 是 JSON 字符串的情况
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch (e) {
        throw new Error('items 解析失败');
      }
    }

    // 验证订单存在
    const order = await db.queryOne<any>(
      'SELECT * FROM workflow_orders WHERE id = ?',
      [orderId]
    );

    if (!order) {
      throw new Error('调拨单不存在');
    }

    if (order.status !== 'CREATED') {
      throw new Error('调拨单状态不正确');
    }

    // 验证图片
    if (!dispatch_overall_image) {
      throw new Error('必须上传发货整体包裹图');
    }

    // 开始事务
    await db.executeTransaction(async (tx) => {
      // 获取订单明细
      const orderItems = await tx.query<any>(
        'SELECT * FROM workflow_order_items WHERE order_id = ?',
        [orderId]
      );

      // 构建 item_id 到 dispatchData 的映射
      const itemMap = new Map();
      if (Array.isArray(items)) {
        for (const item of items) {
          // 使用 orderItems 中的 id 作为 key
          if (item.item_id) {
            itemMap.set(item.item_id, item);
          }
        }
      }

      // 验证每个明细的图片并更新
      for (const orderItem of orderItems) {
        if (!orderItem || !orderItem.id) continue;
        
        const dispatchData = itemMap.get(orderItem.id);
        if (!dispatchData) {
          throw new Error(`明细 ${orderItem.id} 缺少发货数据`);
        }
        
        if (!dispatchData.dispatch_item_image) {
          throw new Error(`明细 ${orderItem.id} 缺少发货图片`);
        }

        // 更新明细
        await tx.execute(
          'UPDATE workflow_order_items SET status = ?, dispatch_item_image = ? WHERE id = ?',
          ['DISPATCHED', dispatchData.dispatch_item_image, orderItem.id]
        );
      }

      // 更新主单
      await tx.execute(
        'UPDATE workflow_orders SET status = ?, dispatch_overall_image = ? WHERE id = ?',
        ['DISPATCHED', dispatch_overall_image, orderId]
      );

      // 处理批次库存
      for (const item of orderItems) {
        if (item.item_type === 'equipment') {
          const equipment = await equipmentServiceV3.getInstanceById(item.item_id);
          if (equipment.tracking_type === 'BATCH') {
            // 扣减批次库存
            await equipmentServiceV3.updateBatchInventory(
              equipment.model_no,
              order.from_location_id,
              -item.plan_qty
            );
          }
        }
      }
    });

    return { success: true };
  }

  /**
   * 收货
   */
  async receiveOrder(orderId: string, data: {
    receive_overall_image: string;
    receiver_id: string;
    items: Array<{
      item_id: string;
      actual_qty: number;
      receive_item_image: string;
    }>;
  }) {
    let { receive_overall_image, receiver_id, items } = data;

    // 兼容 items 是 JSON 字符串的情况
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch (e) {
          throw new Error('items 解析失败');
      }
    }

    // 验证订单存在
    const order = await db.queryOne<any>(
      'SELECT * FROM workflow_orders WHERE id = ?',
      [orderId]
    );

    if (!order) {
      throw new Error('调拨单不存在');
    }

    if (order.status !== 'DISPATCHED') {
      throw new Error('调拨单状态不正确');
    }

    // 获取目标位置的负责人和类型
    const loc = await equipmentServiceV3.getLocationDetails(order.to_location_id);
    const keeperId = loc.manager_id;
    const locationStatus = loc.type || 'warehouse';

    // 开始事务
    await db.executeTransaction(async (tx) => {
      // 查询订单明细
      const orderItems = await tx.query<any>(
        'SELECT * FROM workflow_order_items WHERE order_id = ?',
        [orderId]
      );

      // 构建 items Map
      const itemMap = new Map();
      if (items && Array.isArray(items)) {
        for (const item of items) {
          if (item.item_id) {
            itemMap.set(item.item_id, item);
          }
        }
      }
      
      const exceptionItems = [];

      for (const item of orderItems) {
        if (!item || !item.id) continue;
        
        const receiveData = itemMap.get(item.id); // Use item.id from orderItems to match
        if (!receiveData) {
          // 如果申请单里有，但收货数据没传，说明可能没收到
          exceptionItems.push({
             item_id: item.id,
             shortage_qty: item.plan_qty,
             item_type: item.item_type,
             original_item_id: item.item_id
          });
          continue;
        }

        if (receiveData.actual_qty < 0) {
          throw new Error('实收数量不能为负数');
        }

        if (receiveData.actual_qty >= item.plan_qty) {
          // 全数收货 (或超收)
          await tx.execute(
            'UPDATE workflow_order_items SET status = ?, actual_qty = ?, receive_item_image = ? WHERE id = ?',
            ['RECEIVED', receiveData.actual_qty, receiveData.receive_item_image, item.id]
          );

          // 更新设备位置
          if (item.item_type === 'equipment') {
            await equipmentServiceV3.updateInstanceStatus(item.item_id, {
              location_id: order.to_location_id,
              location_status: locationStatus as any,
              usage_status: 'idle',
              keeper_id: keeperId || undefined
            });
          } else if (item.item_type === 'accessory') {
            await equipmentAccessoryService.updateAccessoryInstance(item.item_id, {
              location_id: order.to_location_id,
              location_status: locationStatus as any,
              usage_status: 'idle',
              keeper_id: keeperId || undefined
            });
          }

          // 处理批次库存
          if (item.item_type === 'equipment') {
            const equipment = await equipmentServiceV3.getInstanceById(item.item_id);
            if (equipment.tracking_type === 'BATCH') {
              await equipmentServiceV3.updateBatchInventory(
                equipment.model_no,
                order.to_location_id,
                receiveData.actual_qty
              );
            }
          }
        } else if (receiveData.actual_qty < item.plan_qty) {
          // 部分收货
          await tx.execute(
            'UPDATE workflow_order_items SET status = ?, actual_qty = ?, receive_item_image = ? WHERE id = ?',
            ['EXCEPTION', receiveData.actual_qty, receiveData.receive_item_image, item.id]
          );

          // 处理已收到的部分
          if (receiveData.actual_qty > 0) {
            // 更新设备位置
            if (item.item_type === 'equipment') {
              await equipmentServiceV3.updateInstanceStatus(item.item_id, {
                location_id: order.to_location_id,
                location_status: 'warehouse',
                usage_status: 'idle'
              });
            } else if (item.item_type === 'accessory') {
              await equipmentAccessoryService.updateAccessoryInstance(item.item_id, {
                location_id: order.to_location_id,
                location_status: 'warehouse',
                usage_status: 'idle'
              });
            }

            // 处理批次库存
            if (item.item_type === 'equipment') {
              const equipment = await equipmentServiceV3.getInstanceById(item.item_id);
              if (equipment.tracking_type === 'BATCH') {
                await equipmentServiceV3.updateBatchInventory(
                  equipment.model_no,
                  order.to_location_id,
                  receiveData.actual_qty
                );
              }
            }
          }

          // 记录异常
          exceptionItems.push({
            item_id: item.id,
            shortage_qty: item.plan_qty - receiveData.actual_qty,
            item_type: item.item_type,
            original_item_id: item.item_id
          });
        }
      }

      // 更新主单
      if (exceptionItems.length > 0) {
        await tx.execute(
          'UPDATE workflow_orders SET status = ?, receive_overall_image = ?, receiver_id = ? WHERE id = ?',
          ['EXCEPTION_CONFIRMING', receive_overall_image, receiver_id, orderId]
        );

        // 创建异常任务
        for (const exception of exceptionItems) {
          const taskId = uuidv4();
          await tx.execute(
            `INSERT INTO exception_tasks 
             (id, order_id, item_id, type, description, responsible_id)
             VALUES (?, ?, ?, 'SHORTAGE', ?, ?)`,
            [
              taskId,
              orderId,
              exception.item_id,
              `缺少 ${exception.shortage_qty} 件`,
              order.dispatcher_id
            ]
          );
        }
      } else {
        await tx.execute(
          'UPDATE workflow_orders SET status = ?, receive_overall_image = ?, receiver_id = ? WHERE id = ?',
          ['COMPLETED', receive_overall_image, receiver_id, orderId]
        );
      }
    });

    return { success: true };
  }

  /**
   * 确认异常
   */
  async confirmException(orderId: string, data: {
    exception_ids: string[];
  }) {
    const { exception_ids } = data;

    // 验证订单存在
    const order = await db.queryOne<any>(
      'SELECT * FROM workflow_orders WHERE id = ?',
      [orderId]
    );

    if (!order) {
      throw new Error('调拨单不存在');
    }

    if (order.status !== 'EXCEPTION_CONFIRMING') {
      throw new Error('调拨单状态不正确');
    }

    // 开始事务
    await db.executeTransaction(async (tx) => {
      for (const exceptionId of exception_ids) {
        // 验证异常任务
        const exception = await tx.queryOne<any>(
          'SELECT * FROM exception_tasks WHERE id = ? AND order_id = ?',
          [exceptionId, orderId]
        );

        if (!exception) {
          throw new Error('异常任务不存在');
        }

        // 获取关联的明细
        const item = await tx.queryOne<any>(
          'SELECT * FROM workflow_order_items WHERE id = ?',
          [exception.item_id]
        );

        if (!item) {
          throw new Error('明细不存在');
        }

        // 回滚库存
        if (item.item_type === 'equipment') {
          const equipment = await equipmentServiceV3.getInstanceById(item.item_id);
          if (equipment.tracking_type === 'BATCH') {
            const shortageQty = item.plan_qty - (item.actual_qty || 0);
            // 加回到原位置
            await equipmentServiceV3.updateBatchInventory(
              equipment.model_no,
              order.from_location_id,
              shortageQty
            );
          }
        }

        // 更新异常任务状态
        await tx.execute(
          'UPDATE exception_tasks SET status = ? WHERE id = ?',
          ['CONFIRMED', exceptionId]
        );
      }

      // 关闭订单
      await tx.execute(
        'UPDATE workflow_orders SET status = ? WHERE id = ?',
        ['CLOSED', orderId]
      );
    });

    return { success: true };
  }

  /**
   * 获取调拨单列表
   */
  async getTransferOrders(params: {
    page?: number;
    pageSize?: number;
    status?: string;
  } = {}) {
    const {
      page = 1,
      pageSize = 10,
      status
    } = params;

    const offset = (page - 1) * pageSize;
    let whereClause = 'WHERE type = \'transfer\'';
    const values: any[] = [];

    if (status) {
      whereClause += ' AND status = ?';
      values.push(status);
    }

    const totalResult = await db.queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM workflow_orders ${whereClause}`,
      values
    );

    const total = totalResult?.total || 0;

    const orders = await db.query<any>(
      `SELECT * FROM workflow_orders 
       ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );

    // 获取每个订单的明细
    for (const order of orders) {
      order.items = await db.query<any>(
        'SELECT * FROM workflow_order_items WHERE order_id = ?',
        [order.id]
      );
    }

    return {
      total,
      page,
      pageSize,
      data: orders
    };
  }
}

export const transferServiceV2 = new TransferServiceV2();