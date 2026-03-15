/**
 * 流程表单集成服务
 * 负责整合表单模板和流程模板，提供固化流程的预设配置
 * 确保表单与流程引擎的无缝集成
 */

import { unifiedFormService, UnifiedFormTemplate, UnifiedFormField } from './UnifiedFormService.js';
import WorkflowTemplatesService from './WorkflowTemplates.js';
import { enhancedWorkflowEngine } from './EnhancedWorkflowEngine.js';
import { definitionService } from './DefinitionService.js';
import { projectServiceV2 as projectService } from './ProjectServiceV2.js';
import { instanceService } from './InstanceService.js';
import { inboundOrderServiceV2 as inboundOrderService } from './InboundOrderServiceV2.js';
import { transferOrderServiceV2 as transferOrderService } from './TransferOrderServiceV2.js';
import { equipmentRepairServiceV2 as equipmentRepairService } from './EquipmentRepairServiceV2.js';
import { equipmentScrapSaleServiceV2 as equipmentScrapSaleService } from './EquipmentScrapSaleServiceV2.js';
import { formDataValidator } from './FormDataValidator.js';
import { db } from '../database/connection.js';
import { notificationService } from './NotificationService.js';

interface ProcessFormPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  formTemplateKey: string;
  workflowTemplateId: string;
  businessType: string;
  status: 'active' | 'inactive';
  defaultVariables: Record<string, any>;
  version: string;
}

interface StartProcessWithFormParams {
  presetId: string;
  formData: Record<string, any>;
  businessKey?: string;
  businessId?: string;
  title?: string;
  initiator: {
    id: string;
    name: string;
  };
  additionalVariables?: Record<string, any>;
}

interface ProcessFormIntegrationResult {
  success: boolean;
  message: string;
  data?: {
    processInstanceId?: string;
    formValidation?: {
      isValid: boolean;
      errors: Array<{ field: string; message: string }>;
    };
  };
}

/**
 * 流程表单集成服务类
 */
export class ProcessFormIntegrationService {
  private presets: Map<string, ProcessFormPreset>;
  private categoryToPresetsMap: Map<string, ProcessFormPreset[]>;
  private db: typeof db;

  constructor() {
    this.presets = new Map();
    this.categoryToPresetsMap = new Map();
    this.db = db;
    this.initializeDefaultPresets();
  }

  /**
   * 初始化默认流程表单预设
   */
  private initializeDefaultPresets() {
    const defaultPresets: ProcessFormPreset[] = [
      {
        id: 'preset-project-approval',
        name: '项目审批流程',
        category: 'project',
        description: '项目立项、变更、结项审批流程',
        formTemplateKey: 'project-create-form',
        workflowTemplateId: 'project-approval',
        businessType: 'Project',
        status: 'active',
        defaultVariables: {},
        version: '1.0.0'
      },
      {
        id: 'preset-equipment-inbound',
        name: '设备入库流程',
        category: 'equipment',
        description: '设备入库审批流程',
        formTemplateKey: 'equipment-inbound-form',
        workflowTemplateId: 'equipment-inbound',
        businessType: 'EquipmentInbound',
        status: 'active',
        defaultVariables: {},
        version: '1.0.0'
      },
      {
        id: 'preset-equipment-transfer',
        name: '设备调拨流程',
        category: 'equipment',
        description: '设备调拨审批流程',
        formTemplateKey: 'equipment-transfer-form',
        workflowTemplateId: 'equipment-transfer',
        businessType: 'EquipmentTransfer',
        status: 'active',
        defaultVariables: {},
        version: '1.0.0'
      },
      {
        id: 'preset-equipment-repair',
        name: '设备维修流程',
        category: 'equipment',
        description: '设备维修申请及流程控制',
        formTemplateKey: 'equipment-repair-form',
        workflowTemplateId: 'equipment-repair',
        businessType: 'EquipmentRepair',
        status: 'active',
        defaultVariables: {},
        version: '1.0.0'
      },
      {
        id: 'preset-equipment-scrap-sale',
        name: '设备报废/售出流程',
        category: 'equipment',
        description: '设备报废或售出申请流程',
        formTemplateKey: 'equipment-scrap-sale-form',
        workflowTemplateId: 'equipment-scrap-sale',
        businessType: 'EquipmentScrapSale',
        status: 'active',
        defaultVariables: {},
        version: '1.0.0'
      }
    ];

    defaultPresets.forEach(preset => {
      this.presets.set(preset.id, preset);

      const categoryPresets = this.categoryToPresetsMap.get(preset.category) || [];
      categoryPresets.push(preset);
      this.categoryToPresetsMap.set(preset.category, categoryPresets);
    });
  }

  /**
   * 根据位置信息获取负责人
   */
  private async getLocationInfo(formData: Record<string, any>) {
    try {
      const { fromLocationType, fromLocationId, toLocationType, toLocationId } = formData;
      const result: any = {};

      // 获取调出负责人
      if (fromLocationType === 'warehouse') {
        const warehouse = await this.db.query('SELECT manager_id FROM warehouses WHERE id = ?', [fromLocationId]);
        if (warehouse && warehouse.length > 0) {
          result.fromManagerId = warehouse[0].manager_id;
        }
      } else if (fromLocationType === 'project') {
        const project = await this.db.query('SELECT manager_id FROM projects WHERE id = ?', [fromLocationId]);
        if (project && project.length > 0) {
          result.fromManagerId = project[0].manager_id;
        }
      }

      // 获取调入负责人
      if (toLocationType === 'warehouse') {
        const warehouse = await this.db.query('SELECT manager_id FROM warehouses WHERE id = ?', [toLocationId]);
        if (warehouse && warehouse.length > 0) {
          result.toManagerId = warehouse[0].manager_id;
        }
      } else if (toLocationType === 'project') {
        const project = await this.db.query('SELECT manager_id FROM projects WHERE id = ?', [toLocationId]);
        if (project && project.length > 0) {
          result.toManagerId = project[0].manager_id;
        }
      }

      return result;
    } catch (error) {
      console.error('[ProcessFormIntegrationService] 获取位置负责人失败:', error);
      return {};
    }
  }

  /**
   * 启动流程并关联表单
   */
  async startProcessWithForm(params: StartProcessWithFormParams): Promise<ProcessFormIntegrationResult> {
    try {
      const preset = this.presets.get(params.presetId);
      if (!preset) {
        return { success: false, message: '流程预设不存在' };
      }

      // 验证表单数据
      const formFields = await this.getFormFields(params.presetId);
      const validationResult = formDataValidator.sanitizeFormData(params.formData, formFields);
      if (!validationResult.isValid) {
        return {
          success: false,
          message: '表单数据验证失败',
          data: { formValidation: { isValid: false, errors: validationResult.errors } }
        };
      }

      // 清理表单数据（使用验证后的数据）
      const cleanedFormData = validationResult.sanitizedData;

      // 获取流程定义
      const definition = await definitionService.getDefinition(preset.workflowTemplateId);
      if (!definition) {
        return { success: false, message: '流程定义不存在' };
      }

      // 准备流程变量
      const variables = {
        ...preset.defaultVariables,
        ...params.additionalVariables,
        formData: cleanedFormData,
        businessType: preset.businessType
      };

      // 特殊业务处理逻辑
      if (preset.businessType === 'EquipmentTransfer') {
        const locationInfo = await this.getLocationInfo(cleanedFormData);
        Object.assign(variables, locationInfo);
        Object.assign(cleanedFormData, locationInfo);
      }

      // 启动流程实例
      const instance = await instanceService.createInstance({
        definitionId: definition.id,
        businessKey: params.businessKey || `BF-${Date.now()}`,
        businessId: params.businessId,
        title: params.title || preset.name,
        variables,
        initiator: params.initiator
      });

      // 后置业务处理逻辑
      if (preset.businessType === 'Project') {
        // 项目立项流程结束后的处理
        const eventHandler = async (data: { instanceId: string; result: string; timestamp: Date }) => {
          if (data.instanceId === instance.id && data.result === 'approved') {
            try {
              // 创建项目
              const project = await projectService.createProject(cleanedFormData);
              console.log(`[ProcessFormIntegrationService] 项目立项成功: ${project.id}`);

              // 通知项目经理
              if (cleanedFormData.manager_id) {
                try {
                  const manager = await this.db.query('SELECT name, user_id FROM employees WHERE id = ?', [cleanedFormData.manager_id]);
                  if (manager && manager.length > 0) {
                    await notificationService.sendNotification({
                      user_id: manager[0].user_id,
                      user_name: manager[0].name,
                      type: 'in_app',
                      title: '项目立项通过',
                      content: `由您负责的项目"${cleanedFormData.name}"已立项通过。`,
                      priority: 'high',
                      link: `/projects/${project.id}`
                    });
                  }
                } catch (notifyError) {
                  console.error('[ProcessFormIntegrationService] 发送抄送通知失败:', notifyError);
                }
              }
              enhancedWorkflowEngine.off('process.ended', eventHandler);
            } catch (error) {
              console.error('[ProcessFormIntegrationService] 项目创建失败:', error);
              enhancedWorkflowEngine.off('process.ended', eventHandler);
            }
          }
        };
        enhancedWorkflowEngine.on('process.ended', eventHandler);
      } else if (preset.businessType === 'EquipmentInbound') {
        try {
          const order = await inboundOrderService.createOrder({
            ...cleanedFormData,
            applicant_id: params.initiator.id,
            status: 'pending'
          } as any);
          await instanceService.updateInstance(instance.id, { business_id: order.id });
        } catch (error) {
          console.error('[ProcessFormIntegrationService] 入库单创建失败:', error);
        }
      } else if (preset.businessType === 'EquipmentTransfer') {
        try {
          const order = await transferOrderService.createOrder(
            cleanedFormData as any,
            params.initiator.id,
            params.initiator.name
          );
          if (order) {
            await instanceService.updateInstance(instance.id, { business_id: order.id });
          }
        } catch (error) {
          console.error('[ProcessFormIntegrationService] 调拨单创建失败:', error);
        }
      } else if (preset.businessType === 'EquipmentRepair') {
        try {
          const orders = await equipmentRepairService.createBatchRepairOrders(
            cleanedFormData as any,
            params.initiator.id,
            params.initiator.name
          );
          if (orders && orders.length > 0) {
            await instanceService.updateInstance(instance.id, { business_id: orders[0].id });
          }
        } catch (error) {
          console.error('[ProcessFormIntegrationService] 维修单创建失败:', error);
        }
      } else if (preset.businessType === 'EquipmentScrapSale') {
        try {
          const orders = await equipmentScrapSaleService.createBatchScrapSaleOrders(
            cleanedFormData as any,
            params.initiator.id,
            params.initiator.name
          );
          if (orders && orders.length > 0) {
            await instanceService.updateInstance(instance.id, { business_id: orders[0].id });
          }
        } catch (error) {
          console.error('[ProcessFormIntegrationService] 报废单创建失败:', error);
        }
      }

      return {
        success: true,
        message: '流程启动成功',
        data: {
          processInstanceId: instance.id,
          formValidation: validationResult
        }
      };
    } catch (error) {
      console.error('启动流程失败:', error);
      return {
        success: false,
        message: `流程启动失败: ${(error as Error).message}`
      };
    }
  }

  /**
   * 获取流程表单的默认值
   */
  getFormDefaultValues(presetId: string): Record<string, any> {
    const preset = this.presets.get(presetId);
    if (!preset) return {};

    const formTemplate = unifiedFormService.getTemplateByKey(preset.formTemplateKey);
    if (!formTemplate) return {};

    return unifiedFormService.getDefaultValues(formTemplate.id);
  }

  /**
   * 获取流程表单的字段定义
   */
  async getFormFields(presetId: string): Promise<any[]> {
    const preset = this.presets.get(presetId);
    if (!preset) return [];

    const formTemplate = unifiedFormService.getTemplateByKey(preset.formTemplateKey);
    if (!formTemplate) return [];

    // 获取工作流模板中的字段定义（如果有）
    const workflowTemplate = WorkflowTemplatesService.getTemplateById(preset.workflowTemplateId);

    // 如果工作流模板有预设字段，则使用工作流模板的字段，否则使用表单模板的字段
    const fields = workflowTemplate && workflowTemplate.stages && workflowTemplate.stages.length > 0
      ? (workflowTemplate.stages[0].formFields as any[] || formTemplate.fields)
      : formTemplate.fields;

    return fields;
  }

  /**
   * 获取所有可用的流程预设
   */
  getPresets(category?: string): ProcessFormPreset[] {
    if (category) {
      return this.categoryToPresetsMap.get(category) || [];
    }
    return Array.from(this.presets.values());
  }

  /**
   * 获取单个流程预设
   */
  getPreset(id: string): ProcessFormPreset | undefined {
    return this.presets.get(id);
  }
}

export const processFormIntegrationService = new ProcessFormIntegrationService();
