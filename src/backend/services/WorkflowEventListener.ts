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
      console.log('[WorkflowEventListener] Listeners already setup, skipping');
      return;
    }
    this.listenersSetup = true;

    console.log('[WorkflowEventListener] Setting up task.completed listener');

    enhancedWorkflowEngine.on('task.completed', async (event: any) => {
      try {
        console.log('[WorkflowEventListener] task.completed event received:', JSON.stringify({
          taskId: event.task?.id,
          nodeId: event.task?.node_id,
          instanceId: event.task?.instance_id,
          action: event.params?.action
        }));

        const { task, params } = event;
        
        if (!task.instance_id) {
          console.log('[WorkflowEventListener] No instance_id in task, skipping');
          return;
        }

        const instance = await instanceService.getInstance(task.instance_id);
        if (!instance) {
          console.log('[WorkflowEventListener] No instance, skipping');
          return;
        }

        const definitionKey = instance.definition_key;

        console.log('[WorkflowEventListener] Processing event:', {
          definitionKey,
          businessId: instance.business_id,
          nodeId: task.node_id
        });

        if (definitionKey === 'equipment-inbound') {
          await this.handleInboundOrderApproval(instance, params, task.node_id);
        } else if (definitionKey === 'equipment-repair') {
          if (!instance.business_id) {
            console.log('[WorkflowEventListener] No business_id for repair order, skipping');
            return;
          }
          await this.handleRepairOrderApproval(instance.business_id, params, task.node_id);
        } else if (definitionKey === 'equipment-scrap-sale') {
          if (!instance.business_id) {
            console.log('[WorkflowEventListener] No business_id for scrap/sale order, skipping');
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

    console.log('[WorkflowEventListener] task.completed listener setup complete');
  }

  private async handleInboundOrderApproval(instance: any, params: any, nodeId: string): Promise<void> {
    try {
      const action = params.action;
      
      if (nodeId === 'warehouse-manager' && (action === 'approve' || action === 'approved')) {
        await equipmentInboundService.createEquipmentFromWorkflow(instance.id);
        console.log(`[WorkflowEventListener] Equipment inbound order ${instance.id} approved, creating equipment records`);
      }
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
          console.log(`[WorkflowEventListener] Repair order ${orderId} approved by location manager`);
        } else if (action === 'reject' || action === 'rejected') {
          await equipmentRepairService.rejectRepairOrder(orderId, operator.id, operator.name, comment);
          console.log(`[WorkflowEventListener] Repair order ${orderId} rejected by location manager`);
        }
      } else if (nodeId === 'shipping') {
        if (action === 'approve' || action === 'approved') {
          const formData = params.formData || {};
          const shippingNo = formData.shipping_no || '';
          await equipmentRepairService.shipRepairOrder(orderId, shippingNo, operator.id);
          console.log(`[WorkflowEventListener] Repair order ${orderId} shipped, equipment status changed to repairing`);
        }
      } else if (nodeId === 'receiving') {
        if (action === 'approve' || action === 'approved') {
          await equipmentRepairService.receiveRepairOrder(orderId, operator.id);
          console.log(`[WorkflowEventListener] Repair order ${orderId} received, equipment status changed to normal`);
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
          console.log(`[WorkflowEventListener] Scrap/Sale order ${orderId} approved by location manager`);
        } else if (action === 'reject' || action === 'rejected') {
          await equipmentScrapSaleService.rejectScrapSaleOrder(orderId, operator.id, operator.name, comment);
          console.log(`[WorkflowEventListener] Scrap/Sale order ${orderId} rejected by location manager`);
        }
      } else if (nodeId === 'process') {
        if (action === 'approve' || action === 'approved') {
          await equipmentScrapSaleService.processScrapSaleOrder(orderId, operator.id);
          console.log(`[WorkflowEventListener] Scrap/Sale order ${orderId} processed, equipment status changed to scrapped`);
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
        console.log('[WorkflowEventListener] No transferOrderId in formData, skipping');
        return;
      }

      console.log(`[WorkflowEventListener] Processing transfer order ${transferOrderId}, nodeId: ${nodeId}, action: ${action}`);

      if (nodeId === 'from-location-manager' || nodeId === 'from_manager' || nodeId === 'from-manager' || nodeId === 'from-manager-approval') {
        if (action === 'approve' || action === 'approved') {
          await transferOrderService.approveFromLocation(transferOrderId, operator.id, comment);
          console.log(`[WorkflowEventListener] Transfer order ${transferOrderId} approved by from manager`);
        } else if (action === 'reject' || action === 'rejected') {
          await transferOrderService.rejectOrder(transferOrderId, operator.id, comment || '');
          console.log(`[WorkflowEventListener] Transfer order ${transferOrderId} rejected by from manager`);
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
          console.log(`[WorkflowEventListener] Transfer order ${transferOrderId} shipped`);
        }
      } else if (nodeId === 'to-location-manager' || nodeId === 'receiving' || nodeId === 'receive') {
        if (action === 'approve' || action === 'approved') {
          const receiveFormData = params.formData || {};
          await transferOrderService.receiveOrder(transferOrderId, operator.id, operator.name, {
            received_at: receiveFormData.received_at,
            receive_status: receiveFormData.receive_status,
            receive_comment: receiveFormData.receive_comment,
            item_images: receiveFormData.item_images,
            package_images: receiveFormData.package_images,
            received_items: receiveFormData.receive_items || receiveFormData.received_items
          });
          console.log(`[WorkflowEventListener] Transfer order ${transferOrderId} received`);
        }
      }
    } catch (error) {
      console.error(`[WorkflowEventListener] Error handling transfer order approval:`, error);
      throw error;
    }
  }
}

export const workflowEventListener = new WorkflowEventListener();
