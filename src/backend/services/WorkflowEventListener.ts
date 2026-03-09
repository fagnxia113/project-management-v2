import { enhancedWorkflowEngine } from './EnhancedWorkflowEngine.js';
import { equipmentRepairService } from './EquipmentRepairService.js';
import { equipmentScrapSaleService } from './EquipmentScrapSaleService.js';
import { equipmentInboundService } from './EquipmentInboundService.js';
import { TransferOrderService } from './TransferOrderService.js';
import { instanceService } from './InstanceService.js';

const transferOrderService = new TransferOrderService();

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
      } else if (nodeId === 'process') {
        if (action === 'approve' || action === 'approved') {
          await equipmentScrapSaleService.processScrapSaleOrder(orderId, operator.id);
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

      if (nodeId === 'from-location-manager' || nodeId === 'from_manager' || nodeId === 'from-manager' || nodeId === 'from-manager-approval') {
        if (action === 'approve' || action === 'approved') {
          await transferOrderService.approveFromLocation(transferOrderId, operator.id, comment);
        } else if (action === 'reject' || action === 'rejected') {
          await transferOrderService.rejectOrder(transferOrderId, operator.id, comment || '');
        }
      } else if (nodeId === 'shipping' || nodeId === 'ship') {
        if (action === 'approve' || action === 'approved') {
          const shipFormData = params.formData || {};
          await transferOrderService.shipOrder(transferOrderId, operator.id, operator.name, {
            shipped_at: shipFormData.shipped_at,
            shipping_no: shipFormData.shipping_no,
            shipping_attachment: shipFormData.shipping_attachment,
            item_images: shipFormData.item_images,
            package_images: shipFormData.package_images
          });
        }
      } else if (nodeId === 'to-location-manager' || nodeId === 'receiving' || nodeId === 'receive') {
        if (action === 'approve' || action === 'approved') {
          await transferOrderService.approveToLocation(transferOrderId, operator.id, comment);
          
          const order = await transferOrderService.getById(transferOrderId);
          if (!order) {
            return;
          }
          
          await transferOrderService.shipOrder(transferOrderId, operator.id, operator.name, {
            shipped_at: new Date().toISOString(),
            shipping_no: `AUTO-${Date.now()}`,
            shipping_attachment: undefined,
            item_images: [],
            package_images: []
          });
          
          const items = order.items || [];
          const receivedItems = items.map((item: any) => ({
            item_id: item.id,
            received_quantity: item.quantity
          }));
          
          const receiveFormData = params.formData || {};
          await transferOrderService.receiveOrder(transferOrderId, operator.id, operator.name, {
            received_at: new Date().toISOString(),
            receive_status: receiveFormData.receive_status || 'normal',
            receive_comment: comment || '审批通过自动收货',
            item_images: receiveFormData.item_images || [],
            package_images: receiveFormData.package_images || [],
            received_items: receivedItems
          });
        }
      }
    } catch (error) {
      console.error(`[WorkflowEventListener] Error handling transfer order approval:`, error);
      throw error;
    }
  }
}

export const workflowEventListener = new WorkflowEventListener();
