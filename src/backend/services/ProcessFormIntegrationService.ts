/**
 * 流程表单集成服务
 * 负责整合表单模板和流程模板，提供固化流程的预设配置
 * 确保表单与流程引擎的无缝集成
 */

import { unifiedFormService } from './UnifiedFormService.js';
import WorkflowTemplatesService from './WorkflowTemplates.js';
import { enhancedWorkflowEngine } from './EnhancedWorkflowEngine.js';
import { definitionService } from './DefinitionService.js';
import { projectService } from './ProjectService.js';
import { instanceService } from './InstanceService.js';
import { InboundOrderService } from './InboundOrderService.js';
import { TransferOrderService } from './TransferOrderService.js';
import { equipmentRepairService } from './EquipmentRepairService.js';
import { db } from '../database/connection.js';

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
  private inboundOrderService: InboundOrderService;
  private transferOrderService: TransferOrderService;
  private db: typeof db;

  constructor() {
    this.presets = new Map();
    this.categoryToPresetsMap = new Map();
    this.inboundOrderService = new InboundOrderService();
    this.transferOrderService = new TransferOrderService();
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
        description: '设备跨位置调拨审批流程',
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
        description: '设备维修审批流程',
        formTemplateKey: 'equipment-repair-form',
        workflowTemplateId: 'equipment-repair',
        businessType: 'EquipmentRepair',
        status: 'active',
        defaultVariables: {},
        version: '1.0.0'
      },
      {
        id: 'preset-employee-onboard',
        name: '人员入职流程',
        category: 'hr',
        description: '新员工入职审批流程',
        formTemplateKey: 'employee-onboard-form',
        workflowTemplateId: 'employee-onboard',
        businessType: 'Employee',
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
   * 获取所有流程表单预设
   */
  getAllPresets(): ProcessFormPreset[] {
    return Array.from(this.presets.values());
  }

  /**
   * 根据ID获取流程表单预设
   */
  getPresetById(id: string): ProcessFormPreset | undefined {
    return this.presets.get(id);
  }

  /**
   * 根据formKey获取表单模板
   */
  getFormTemplate(formKey: string): FormTemplate | undefined {
    return unifiedFormService.getTemplateByKey(formKey);
  }

  /**
   * 根据分类获取流程表单预设
   */
  getPresetsByCategory(category: string): ProcessFormPreset[] {
    return this.categoryToPresetsMap.get(category) || [];
  }

  /**
   * 根据业务类型获取流程表单预设
   */
  getPresetsByBusinessType(businessType: string): ProcessFormPreset[] {
    return Array.from(this.presets.values()).filter(preset => preset.businessType === businessType);
  }

  /**
   * 创建流程表单预设
   */
  createPreset(preset: Omit<ProcessFormPreset, 'id' | 'version'>): ProcessFormPreset {
    const id = `preset-${Date.now()}`;
    const newPreset: ProcessFormPreset = {
      ...preset,
      id,
      version: '1.0.0'
    };

    this.presets.set(id, newPreset);
    
    const categoryPresets = this.categoryToPresetsMap.get(preset.category) || [];
    categoryPresets.push(newPreset);
    this.categoryToPresetsMap.set(preset.category, categoryPresets);

    return newPreset;
  }

  /**
   * 更新流程表单预设
   */
  updatePreset(id: string, updates: Partial<ProcessFormPreset>): ProcessFormPreset | undefined {
    const preset = this.presets.get(id);
    if (!preset) {
      return undefined;
    }

    const updatedPreset: ProcessFormPreset = {
      ...preset,
      ...updates,
      version: '1.0.0' // 简化处理，每次更新都重置版本
    };

    this.presets.set(id, updatedPreset);

    // 如果分类变更，更新分类映射
    if (updates.category && updates.category !== preset.category) {
      // 从旧分类中移除
      let categoryPresets = this.categoryToPresetsMap.get(preset.category) || [];
      categoryPresets = categoryPresets.filter(p => p.id !== id);
      this.categoryToPresetsMap.set(preset.category, categoryPresets);

      // 添加到新分类
      categoryPresets = this.categoryToPresetsMap.get(updates.category) || [];
      categoryPresets.push(updatedPreset);
      this.categoryToPresetsMap.set(updates.category, categoryPresets);
    }

    return updatedPreset;
  }

  /**
   * 删除流程表单预设
   */
  deletePreset(id: string): boolean {
    const preset = this.presets.get(id);
    if (!preset) {
      return false;
    }

    this.presets.delete(id);

    // 从分类映射中移除
    let categoryPresets = this.categoryToPresetsMap.get(preset.category) || [];
    categoryPresets = categoryPresets.filter(p => p.id !== id);
    this.categoryToPresetsMap.set(preset.category, categoryPresets);

    return true;
  }

  /**
   * 激活流程表单预设
   */
  activatePreset(id: string): ProcessFormPreset | undefined {
    return this.updatePreset(id, { status: 'active' });
  }

  /**
   * 停用流程表单预设
   */
  deactivatePreset(id: string): ProcessFormPreset | undefined {
    return this.updatePreset(id, { status: 'inactive' });
  }

  /**
   * 获取位置和负责人信息
   */
  private async getLocationInfo(formData: Record<string, any>): Promise<Record<string, any>> {
    const result: Record<string, any> = {};
    
    try {
      // 获取调出位置信息
      if (formData.fromLocationType && formData.fromLocationId) {
        if (formData.fromLocationType === 'warehouse') {
          const warehouse = await this.db.queryOne(
            'SELECT * FROM warehouses WHERE id = ?',
            [formData.fromLocationId]
          );
          
          if (warehouse) {
            result._fromLocationName = warehouse.name;
            result.fromManagerId = warehouse.manager_id;
            
            // 获取负责人信息
            if (warehouse.manager_id) {
              const manager = await this.db.queryOne(
                'SELECT * FROM employees WHERE id = ?',
                [warehouse.manager_id]
              );
              
              if (manager) {
                result._fromManagerName = manager.name;
              }
            }
          }
        } else if (formData.fromLocationType === 'project') {
          const project = await this.db.queryOne(
            'SELECT * FROM projects WHERE id = ?',
            [formData.fromLocationId]
          );
          
          if (project) {
            result._fromLocationName = project.name;
            result.fromManagerId = project.manager_id;
            
            // 获取负责人信息
            if (project.manager_id) {
              const manager = await this.db.queryOne(
                'SELECT * FROM employees WHERE id = ?',
                [project.manager_id]
              );
              
              if (manager) {
                result._fromManagerName = manager.name;
              }
            }
          }
        }
      }
      
      // 获取调入位置信息
      if (formData.toLocationType && formData.toLocationId) {
        if (formData.toLocationType === 'warehouse') {
          const warehouse = await this.db.queryOne(
            'SELECT * FROM warehouses WHERE id = ?',
            [formData.toLocationId]
          );
          
          if (warehouse) {
            result._toLocationName = warehouse.name;
            result.toManagerId = warehouse.manager_id;
            
            // 获取负责人信息
            if (warehouse.manager_id) {
              const manager = await this.db.queryOne(
                'SELECT * FROM employees WHERE id = ?',
                [warehouse.manager_id]
              );
              
              if (manager) {
                result._toManagerName = manager.name;
              }
            }
          }
        } else if (formData.toLocationType === 'project') {
          const project = await this.db.queryOne(
            'SELECT * FROM projects WHERE id = ?',
            [formData.toLocationId]
          );
          
          if (project) {
            result._toLocationName = project.name;
            result.toManagerId = project.manager_id;
            
            // 获取负责人信息
            if (project.manager_id) {
              const manager = await this.db.queryOne(
                'SELECT * FROM employees WHERE id = ?',
                [project.manager_id]
              );
              
              if (manager) {
                result._toManagerName = manager.name;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('获取位置信息失败:', error);
    }
    
    return result;
  }

  /**
   * 获取维修位置和负责人信息
   */
  private async getRepairLocationInfo(formData: Record<string, any>): Promise<Record<string, any>> {
    const result: Record<string, any> = {};
    
    try {
      // 获取原始位置信息
      if (formData.original_location_type && formData.original_location_id) {
        if (formData.original_location_type === 'warehouse') {
          const warehouse = await this.db.queryOne(
            'SELECT * FROM warehouses WHERE id = ?',
            [formData.original_location_id]
          );
          
          if (warehouse) {
            result._originalLocationName = warehouse.name;
            
            // 获取负责人信息
            if (warehouse.manager_id) {
              const manager = await this.db.queryOne(
                'SELECT * FROM employees WHERE id = ?',
                [warehouse.manager_id]
              );
              
              if (manager) {
                result._locationManagerName = manager.name;
                // 使用employees表中的user_id
                result.location_manager_id = manager.user_id;
              }
            }
          }
        } else if (formData.original_location_type === 'project') {
          const project = await this.db.queryOne(
            'SELECT * FROM projects WHERE id = ?',
            [formData.original_location_id]
          );
          
          if (project) {
            result._originalLocationName = project.name;
            
            // 获取负责人信息
            if (project.manager_id) {
              const manager = await this.db.queryOne(
                'SELECT * FROM employees WHERE id = ?',
                [project.manager_id]
              );
              
              if (manager) {
                result._locationManagerName = manager.name;
                // 使用employees表中的user_id
                result.location_manager_id = manager.user_id;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('获取维修位置信息失败:', error);
    }
    
    return result;
  }

  /**
   * 生成业务编号
   */
  private generateBusinessCode(prefix: string): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * 启动流程（包含表单验证和流程初始化）
   */
  async startProcessWithForm(params: StartProcessWithFormParams): Promise<ProcessFormIntegrationResult> {
    try {
      console.log('Start process with form params:', params);
      
      // 获取预设配置
      const preset = this.presets.get(params.presetId);
      console.log('Found preset:', preset);
      
      if (!preset) {
        return {
          success: false,
          message: '流程表单预设不存在'
        };
      }

      if (preset.status !== 'active') {
        return {
          success: false,
          message: '流程表单预设已停用'
        };
      }

      // 获取表单模板（可选）
      const formTemplate = unifiedFormService.getTemplateByKey(preset.formTemplateKey);
      console.log('Found form template:', formTemplate ? formTemplate.name : 'None');
      
      // 获取或创建流程定义
      let definition = await definitionService.getLatestDefinition(preset.workflowTemplateId);
      console.log('Found definition:', definition ? definition.key : 'None');
      
      let formSchema = formTemplate?.fields || null;
      console.log('Form schema from template:', formSchema ? formSchema.length : 0, 'fields');
      
      if (!formTemplate && definition?.form_schema) {
        // 从流程定义获取表单schema
        formSchema = definition.form_schema;
        console.log('Form schema from definition:', formSchema ? formSchema.length : 0, 'fields');
      }
      
      if (!formTemplate && !formSchema) {
        // 既没有表单模板也没有流程定义的form_schema，尝试从模板创建
        const workflowTemplate = WorkflowTemplatesService.getTemplateById(preset.workflowTemplateId);
        console.log('Found workflow template:', workflowTemplate ? workflowTemplate.name : 'None');
        
        if (workflowTemplate?.formSchema) {
          formSchema = workflowTemplate.formSchema;
          console.log('Form schema from workflow template:', formSchema ? formSchema.length : 0, 'fields');
        }
      }

      // 自动生成编号
      const enhancedFormData = { ...params.formData };
      console.log('Enhanced form data:', enhancedFormData);
      
      // 根据业务类型生成不同的编号
      switch (preset.businessType) {
        case 'Project':
          if (!enhancedFormData.code) {
            enhancedFormData.code = this.generateBusinessCode('PRJ');
          }
          break;
        case 'Equipment':
          if (!enhancedFormData.code) {
            enhancedFormData.code = this.generateBusinessCode('EQP');
          }
          break;
        case 'Employee':
          if (!enhancedFormData.employee_id) {
            enhancedFormData.employee_id = this.generateBusinessCode('EMP');
          }
          break;
        case 'EquipmentTransfer':
          if (!enhancedFormData.order_no) {
            enhancedFormData.order_no = this.generateBusinessCode('TRF');
          }
          break;
        case 'Task':
          if (!enhancedFormData.code) {
            enhancedFormData.code = this.generateBusinessCode('TSK');
          }
          break;
      }

      // 处理业务数据联动和验证（仅在表单模板存在时）
      let cleanedFormData = enhancedFormData;
      let validationResult = { isValid: true, errors: [] as Array<{ field: string; message: string }> };
      
      if (formTemplate) {
        console.log('Processing business link for template:', formTemplate.id);
        
        // 处理业务数据联动
        const businessLinkResult = await unifiedFormService.handleBusinessLink(formTemplate.id, enhancedFormData);
        console.log('Business link result:', businessLinkResult);
        
        if (!businessLinkResult.success) {
          console.error('Business link failed:', businessLinkResult.messages);
          return {
            success: false,
            message: '业务数据联动处理失败',
            data: {
              formValidation: {
                isValid: false,
                errors: businessLinkResult.messages.map(msg => ({ field: 'business', message: msg }))
              }
            }
          };
        }

        // 验证表单数据
        validationResult = unifiedFormService.validateForm(formTemplate.id, businessLinkResult.data);
        console.log('Validation result:', validationResult);
        
        if (!validationResult.isValid) {
          console.error('Form validation failed:', validationResult.errors);
          return {
            success: false,
            message: '表单数据验证失败',
            data: {
              formValidation: validationResult
            }
          };
        }

        // 清理表单数据（移除不可见字段的值）
        cleanedFormData = unifiedFormService.cleanFormData(formTemplate.id, businessLinkResult.data);
        console.log('Cleaned form data:', cleanedFormData);
      }

      // 在启动流程之前，为设备维修流程获取位置信息
      if (preset.businessType === 'EquipmentRepair') {
        const locationInfo = await this.getRepairLocationInfo(cleanedFormData);
        console.log('[ProcessFormIntegrationService] 获取维修位置信息:', locationInfo);
        
        // 将位置和负责人信息添加到表单数据中
        cleanedFormData = {
          ...cleanedFormData,
          ...locationInfo
        };
        
        console.log('[ProcessFormIntegrationService] 增强后的维修表单数据:', cleanedFormData);
      }

      if (!definition) {
        // 从模板创建流程定义
        const workflowTemplate = WorkflowTemplatesService.getTemplateById(preset.workflowTemplateId);
        if (!workflowTemplate) {
          return {
            success: false,
            message: '流程模板不存在'
          };
        }

        definition = await definitionService.createDefinition({
          key: workflowTemplate.id,
          name: workflowTemplate.name,
          category: workflowTemplate.category,
          entity_type: workflowTemplate.entityType,
          nodes: workflowTemplate.definition.nodes,
          edges: workflowTemplate.definition.edges,
          form_schema: workflowTemplate.formSchema,
          variables: Object.entries(preset.defaultVariables).map(([name, value]) => ({
            name,
            type: typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : typeof value === 'object' ? 'object' : 'string',
            defaultValue: value,
            scope: 'process'
          })),
          created_by: params.initiator.id
        });

        // 激活流程定义
        await definitionService.activateDefinition(definition.id);
      }

      // 启动流程实例
      const instance = await enhancedWorkflowEngine.startProcess({
        processKey: preset.workflowTemplateId,
        businessKey: params.businessKey,
        businessId: params.businessId,
        title: params.title || preset.name,
        variables: {
          ...preset.defaultVariables,
          ...params.additionalVariables,
          formData: cleanedFormData
        },
        initiator: {
          id: params.initiator.id,
          name: params.initiator.name
        }
      });

      // 根据业务类型，在流程启动时创建业务数据
      if (preset.businessType === 'Project') {
        // 注册流程完成事件监听器，在审批通过后创建项目
        const eventHandler = async (data: { instanceId: string; result: string; timestamp: Date }) => {
          if (data.instanceId === instance.id && data.result === 'approved') {
            try {
              // 创建项目 - 使用新的字段结构
              const project = await projectService.createProject({
                code: cleanedFormData.code,
                name: cleanedFormData.name,
                type: cleanedFormData.type || 'domestic',
                manager_id: cleanedFormData.manager_id,
                status: 'in_progress',
                start_date: cleanedFormData.start_date,
                end_date: cleanedFormData.end_date,
                country: cleanedFormData.country || '中国',
                address: cleanedFormData.address,
                attachments: cleanedFormData.attachments,
                description: cleanedFormData.description,
                building_area: cleanedFormData.building_area,
                it_capacity: cleanedFormData.it_capacity,
                cabinet_count: cleanedFormData.cabinet_count,
                cabinet_power: cleanedFormData.cabinet_power,
                power_architecture: cleanedFormData.power_architecture,
                hvac_architecture: cleanedFormData.hvac_architecture,
                fire_architecture: cleanedFormData.fire_architecture,
                weak_electric_architecture: cleanedFormData.weak_electric_architecture,
                customer_id: cleanedFormData.customer_id,
                budget: cleanedFormData.budget || 0,
                organization_id: cleanedFormData.organization_id
              });
              
              // 更新流程实例的 businessId
              await instanceService.updateInstance(instance.id, { business_id: project.id });
              
              console.log(`[ProcessFormIntegrationService] 项目创建成功: ${project.id}`);
              
              // 移除事件监听器
              enhancedWorkflowEngine.off('process.ended', eventHandler);
            } catch (error) {
              console.error(`[ProcessFormIntegrationService] 项目创建失败:`, error);
              // 即使失败也要移除监听器，避免内存泄漏
              enhancedWorkflowEngine.off('process.ended', eventHandler);
            }
          }
        };
        
        // 使用 on 而不是 once，并在回调中手动移除监听器
        enhancedWorkflowEngine.on('process.ended', eventHandler);
      } else if (preset.businessType === 'EquipmentInbound') {
        // 在流程启动时创建入库单
        try {
          const order = await this.inboundOrderService.createOrder(
            cleanedFormData,
            params.initiator.id,
            params.initiator.name
          );
          
          // 更新流程实例的 businessId
          await instanceService.updateInstance(instance.id, { business_id: order.id });
          
          console.log(`[ProcessFormIntegrationService] 入库单创建成功: ${order.id}`);
        } catch (error) {
          console.error(`[ProcessFormIntegrationService] 入库单创建失败:`, error);
        }
      } else if (preset.businessType === 'EquipmentTransfer') {
        // 在流程启动时创建调拨单
        try {
          console.log('[ProcessFormIntegrationService] 开始创建调拨单，formData:', cleanedFormData);
          
          // 获取位置和负责人信息
          const locationInfo = await this.getLocationInfo(cleanedFormData);
          console.log('[ProcessFormIntegrationService] 获取位置信息:', locationInfo);
          
          // 将位置和负责人信息添加到表单数据中
          const enhancedFormData = {
            ...cleanedFormData,
            ...locationInfo
          };
          
          console.log('[ProcessFormIntegrationService] 增强后的表单数据:', enhancedFormData);
          
          const order = await this.transferOrderService.createOrder(
            enhancedFormData,
            params.initiator.id,
            params.initiator.name
          );
          
          console.log('[ProcessFormIntegrationService] 调拨单创建成功:', order);
          
          // 更新流程实例的 businessId 和 formData 中的 transferOrderId
          const updatedVariables = {
            ...instance.variables,
            formData: {
              ...instance.variables?.formData,
              ...cleanedFormData,
              ...locationInfo,
              transferOrderId: order.id
            }
          };
          await instanceService.updateInstance(instance.id, {
            business_id: order.id,
            variables: updatedVariables
          });
          
          console.log(`[ProcessFormIntegrationService] 调拨单创建成功: ${order.id}, 已更新 business_id 和 transferOrderId`);
        } catch (error) {
          console.error(`[ProcessFormIntegrationService] 调拨单创建失败:`, error);
          console.error(`[ProcessFormIntegrationService] 错误详情:`, JSON.stringify(error, null, 2));
          throw error;
        }
      } else if (preset.businessType === 'EquipmentRepair') {
        // 在流程启动时创建维修单
        try {
          console.log('[ProcessFormIntegrationService] 开始创建维修单，formData:', cleanedFormData);
          
          let order;
          if (cleanedFormData.equipment_data && Array.isArray(cleanedFormData.equipment_data)) {
            // 批量维修单
            const orders = await equipmentRepairService.createBatchRepairOrders(
              cleanedFormData,
              params.initiator.id,
              params.initiator.name
            );
            order = orders[0]; // 使用第一个维修单作为主单
            console.log('[ProcessFormIntegrationService] 批量维修单创建成功:', orders);
          } else {
            // 单个维修单
            order = await equipmentRepairService.createRepairOrder(
              cleanedFormData,
              params.initiator.id,
              params.initiator.name
            );
            console.log('[ProcessFormIntegrationService] 维修单创建成功:', order);
          }
          
          // 更新流程实例的 businessId 和 formData 中的 repairOrderId
          const updatedVariables = {
            ...instance.variables,
            formData: {
              ...instance.variables?.formData,
              repairOrderId: order.id
            }
          };
          await instanceService.updateInstance(instance.id, {
            business_id: order.id,
            variables: updatedVariables
          });
          
          console.log(`[ProcessFormIntegrationService] 维修单创建成功: ${order.id}, 已更新 business_id 和 repairOrderId`);
        } catch (error) {
          console.error(`[ProcessFormIntegrationService] 维修单创建失败:`, error);
          console.error(`[ProcessFormIntegrationService] 错误详情:`, JSON.stringify(error, null, 2));
          throw error;
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
    if (!preset) {
      return {};
    }

    const formTemplate = unifiedFormService.getTemplateByKey(preset.formTemplateKey);
    if (!formTemplate) {
      return {};
    }

    return unifiedFormService.getDefaultValues(formTemplate.id);
  }

  /**
   * 获取流程表单的字段定义
   * 优先从 WorkflowTemplates 获取完整的字段配置（包括动态选项）
   */
  async getFormFields(presetId: string): Promise<any[]> {
    const preset = this.presets.get(presetId);
    if (!preset) {
      return [];
    }

    // 优先从 WorkflowTemplates 获取完整字段配置
    const workflowTemplate = WorkflowTemplatesService.getTemplateById(preset.workflowTemplateId);
    if (workflowTemplate && workflowTemplate.formSchema) {
      return workflowTemplate.formSchema;
    }

    // 降级：从表单模板获取
    const formTemplate = unifiedFormService.getTemplateByKey(preset.formTemplateKey);
    if (formTemplate) {
      return formTemplate.fields;
    }

    // 最后降级：从流程定义获取
    const definition = await definitionService.getLatestDefinition(preset.workflowTemplateId);
    if (definition && definition.form_schema) {
      return definition.form_schema;
    }

    return [];
  }

  /**
   * 同步流程模板与表单模板
   * 确保流程模板中的表单schema与表单模板一致
   */
  async syncProcessFormTemplates(presetId: string): Promise<boolean> {
    try {
      const preset = this.presets.get(presetId);
      if (!preset) {
        return false;
      }

      // 获取表单模板
      const formTemplate = unifiedFormService.getTemplateByKey(preset.formTemplateKey);
      if (!formTemplate) {
        return false;
      }

      // 获取最新的流程定义
      const definition = await definitionService.getLatestDefinition(preset.workflowTemplateId);
      if (definition) {
        // 更新流程定义中的表单schema
      await definitionService.updateDefinition(definition.id, {
        form_schema: formTemplate.fields.map(field => {
          let options: string[] | undefined = undefined;
          if (field.type === 'boolean') {
            options = ['true', 'false'];
          } else if (Array.isArray(field.options) && field.options.length > 0) {
            const firstOption = field.options[0];
            // 检查是否是字符串数组
            if (typeof firstOption === 'string') {
              options = field.options as unknown as string[];
            }
            // 如果是 { label, value } 格式，转换为字符串数组
            else if (typeof firstOption === 'object' && firstOption !== null && 'label' in firstOption) {
              options = (field.options as unknown as { label: string; value: any }[]).map(opt => opt.label);
            }
          }
          
          return {
            name: field.name,
            label: field.label,
            type: field.type === 'boolean' ? 'select' : field.type === 'lookup' ? 'text' : field.type,
            required: field.required,
            options,
            defaultValue: field.defaultValue
          };
        })
      });
      }

      return true;
    } catch (error) {
      console.error('同步流程表单模板失败:', error);
      return false;
    }
  }
}

// 导出单例
export const processFormIntegrationService = new ProcessFormIntegrationService();
