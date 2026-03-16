import { enhancedWorkflowEngine } from './EnhancedWorkflowEngine.js';
import { equipmentRepairServiceV2 as equipmentRepairService } from './EquipmentRepairServiceV2.js';
import { equipmentScrapSaleServiceV2 as equipmentScrapSaleService } from './EquipmentScrapSaleServiceV2.js';
import { equipmentInboundServiceV2 as equipmentInboundService } from './EquipmentInboundServiceV2.js';
import { transferOrderServiceV2 as transferOrderService } from './TransferOrderServiceV2.js';
import { instanceService } from './InstanceService.js';

export class WorkflowEventListener {
  private listenersSetup = false;

  constructor() {
    // 不在构造函数中立即设置监听器，避免循环依赖
  }

  setupListeners(): void {
    if (this.listenersSetup) {
      return;
    }
    this.listenersSetup = true;

    enhancedWorkflowEngine.on('task.completed', async (event: any) => {
      try {
        const { task, params } = event;

        if (!task.instance_id) {
          return;
        }

        const instance = await instanceService.getInstance(task.instance_id);
        if (!instance) {
          return;
        }

        const definitionKey = instance.definition_key;

        if (definitionKey === 'equipment-inbound') {
          await this.handleInboundOrderApproval(instance, params, task.node_id);
        } else if (definitionKey === 'equipment-repair') {
          if (!instance.business_id) {
            return;
          }
          await this.handleRepairOrderApproval(instance.business_id, params, task.node_id);
        } else if (definitionKey === 'equipment-scrap-sale') {
          if (!instance.business_id) {
            return;
          }
          await this.handleScrapSaleOrderApproval(instance.business_id, params, task.node_id);
        } else if (definitionKey === 'equipment-transfer' || definitionKey === 'preset-equipment-transfer') {
          await this.handleTransferOrderApproval(instance, params, task.node_id);
        }
      } catch (error) {
        console.error('[WorkflowEventListener] Error handling task.completed event:', error);
      }
    });
  }

  private async handleInboundOrderApproval(instance: any, params: any, nodeId: string): Promise<void> {
    try {
      const action = params.action;
      console.log(`[WorkflowEventListener] 处理入库审批 - instanceId: ${instance.id}, nodeId: ${nodeId}, action: ${action}`);

      // 设备入库流程的数据库操作现在由服务节点处理
      // 保留此注释以便后续参考
      // if (nodeId === 'warehouse-manager' && (action === 'approve' || action === 'approved')) {
      //   console.log(`[WorkflowEventListener] 设备入库审批通过，开始创建设备台账: ${instance.id}`);
      //   await equipmentInboundService.createEquipmentFromWorkflow(instance.id);
      //   console.log(`[WorkflowEventListener] 设备台账创建完成`);
      // } else {
      //   console.log(`[WorkflowEventListener] 跳过入库台账创建 - nodeId不匹配或action不正确`);
      // }
    } catch (error) {
      console.error(`[WorkflowEventListener] Error handling inbound order ${instance.id} approval:`, error);
      throw error;
    }
  }

  private async handleRepairOrderApproval(orderId: string, params: any, nodeId: string): Promise<void> {
    try {
      const action = params.action;
      const operator = params.operator;
      const comment = params.comment;

      if (nodeId === 'location-manager') {
        if (action === 'approve' || action === 'approved') {
          await equipmentRepairService.approveRepairOrder(orderId, operator.id, operator.name, comment);
        } else if (action === 'reject' || action === 'rejected') {
          await equipmentRepairService.rejectRepairOrder(orderId, operator.id, operator.name, comment);
        }
      } else if (nodeId === 'shipping') {
        if (action === 'approve' || action === 'approved') {
          const formData = params.formData || {};
          const shippingNo = formData.shipping_no || '';
          await equipmentRepairService.shipRepairOrder(orderId, shippingNo, operator.id);
        }
      } else if (nodeId === 'receiving') {
        if (action === 'approve' || action === 'approved') {
          await equipmentRepairService.receiveRepairOrder(orderId, operator.id);
        }
      }
    } catch (error) {
      console.error(`[WorkflowEventListener] Error handling repair order ${orderId} approval:`, error);
      throw error;
    }
  }

  private async handleScrapSaleOrderApproval(orderId: string, params: any, nodeId: string): Promise<void> {
    try {
      const action = params.action;
      const operator = params.operator;
      const comment = params.comment;

      if (nodeId === 'location-manager') {
        if (action === 'approve' || action === 'approved') {
          await equipmentScrapSaleService.approveScrapSaleOrder(orderId, operator.id, operator.name, comment);
        } else if (action === 'reject' || action === 'rejected') {
          await equipmentScrapSaleService.rejectScrapSaleOrder(orderId, operator.id, operator.name, comment);
        }
      } else if (nodeId === 'process' || nodeId === 'scrap-process') {
        if (action === 'approve' || action === 'approved') {
          await equipmentScrapSaleService.processScrapSaleOrder(orderId, operator.id);
          
          // 获取订单详情以执行实物报废逻辑
          const order = await equipmentScrapSaleService.getById(orderId);
          if (order && order.equipment_id) {
            await equipmentScrapSaleService.setEquipmentStatusToScrapped(
              order.equipment_id, 
              order.scrap_quantity || 1
            );
          }
        }
      }
    } catch (error) {
      console.error(`[WorkflowEventListener] Error handling scrap/sale order ${orderId} approval:`, error);
      throw error;
    }
  }

  private async handleTransferOrderApproval(instance: any, params: any, nodeId: string): Promise<void> {
    try {
      const action = params.action;
      const operator = params.operator;
      const comment = params.comment;
      const formData = instance.variables?.formData || {};
      const transferOrderId = formData.transferOrderId;

      if (!transferOrderId) {
        return;
      }

      if (nodeId === 'from-location-manager') {
        if (action === 'approve' || action === 'approved') {
          // 处理发货确认
          const shipData = params.formData || {};
          await transferOrderService.confirmShipping(transferOrderId, {
            shipped_by: operator.id,
            shipped_at: shipData.shipped_at || new Date().toISOString(),
            shipping_no: shipData.shipping_no || `AUTO-${Date.now()}`,
            shipping_attachment: shipData.shipping_attachment,
            item_images: shipData.item_images || [],
            package_images: shipData.package_images || [],
            shipping_notes: shipData.shipping_notes || comment
          });
          await transferOrderService.approveFromLocation(transferOrderId, operator.id, comment);
        } else if (action === 'reject' || action === 'rejected') {
          await transferOrderService.rejectOrder(transferOrderId, operator.id, operator.name, comment || '调出位置拒绝');
        }
      } else if (nodeId === 'to-location-manager') {
        if (action === 'approve' || action === 'approved') {
          // 处理收货确认
          const receiveData = params.formData || {};
          const order = await transferOrderService.getById(transferOrderId);
          if (!order) return;

          const receivedItems = (order.items || []).map((item: any) => {
            // 从表单数据中提取实收数量，如果没提供则默认为申请数量
            const actualQty = receiveData.items?.find((i: any) => i.item_id === item.id)?.received_quantity;
            return {
              item_id: item.id,
              received_quantity: actualQty !== undefined ? actualQty : item.quantity
            };
          });

          await transferOrderService.confirmReceiving(transferOrderId, {
            received_by: operator.id,
            received_at: receiveData.received_at || new Date().toISOString(),
            receive_status: receiveData.receive_status || 'normal',
            receive_comment: comment || '确认收货',
            item_images: receiveData.item_images || [],
            package_images: receiveData.package_images || [],
            received_items: receivedItems
          });
          
          await transferOrderService.approveToLocation(transferOrderId, operator.id, comment);
        }
      } else if (nodeId === 'unreceived-review') {
        if (action === 'approve' || action === 'approved') {
          // 调出负责人完成核实未到货项目
          // 这里可以调用相关的业务方法来处理最终的库存调整
          console.log(`[WorkflowEventListener] 调出负责人完成核实: ${transferOrderId}`);
        }
      }
    } catch (error) {
      console.error(`[WorkflowEventListener] Error handling transfer order approval:`, error);
      throw error;
    }
  }
}

export const workflowEventListener = new WorkflowEventListener();
