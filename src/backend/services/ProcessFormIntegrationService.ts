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

  constructor() {
    this.presets = new Map();
    this.categoryToPresetsMap = new Map();
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
        id: 'preset-equipment-transfer',
        name: '设备调拨流程',
        category: 'equipment',
        description: '设备跨项目调拨审批流程',
        formTemplateKey: 'equipment-transfer-form',
        workflowTemplateId: 'equipment-transfer',
        businessType: 'EquipmentTransfer',
        status: 'active',
        defaultVariables: {},
        version: '1.0.0'
      },
      {
        id: 'preset-equipment-create',
        name: '设备创建流程',
        category: 'equipment',
        description: '新设备采购入库审批流程',
        formTemplateKey: 'equipment-create-form',
        workflowTemplateId: 'equipment-transfer',
        businessType: 'Equipment',
        status: 'active',
        defaultVariables: {},
        version: '1.0.0'
      },
      {
        id: 'preset-task-approval',
        name: '任务审批流程',
        category: 'task',
        description: '任务创建、完成、取消审批流程',
        formTemplateKey: 'task-create-form',
        workflowTemplateId: 'task-approval',
        businessType: 'Task',
        status: 'active',
        defaultVariables: {},
        version: '1.0.0'
      },
      {
        id: 'preset-employee-onboard',
        name: '人员入职流程',
        category: 'hr',
        description: '新员工入职审批流程',
        formTemplateKey: 'personnel-onboard-form',
        workflowTemplateId: 'employee-onboard',
        businessType: 'Employee',
        status: 'active',
        defaultVariables: {},
        version: '1.0.0'
      },
      {
        id: 'preset-employee-offboard',
        name: '人员离职流程',
        category: 'hr',
        description: '员工离职审批流程',
        formTemplateKey: 'personnel-offboard-form',
        workflowTemplateId: 'employee-offboard',
        businessType: 'Employee',
        status: 'active',
        defaultVariables: {},
        version: '1.0.0'
      },
      {
        id: 'preset-employee-regular',
        name: '人员转正流程',
        category: 'hr',
        description: '员工转正审批流程',
        formTemplateKey: 'personnel-regular-form',
        workflowTemplateId: 'employee-regular',
        businessType: 'Employee',
        status: 'active',
        defaultVariables: {},
        version: '1.0.0'
      },
      {
        id: 'preset-employee-leave',
        name: '请假申请流程',
        category: 'hr',
        description: '员工请假审批流程',
        formTemplateKey: 'personnel-leave-form',
        workflowTemplateId: 'employee-leave',
        businessType: 'LeaveRequest',
        status: 'active',
        defaultVariables: {},
        version: '1.0.0'
      },
      {
        id: 'preset-employee-trip',
        name: '出差申请流程',
        category: 'hr',
        description: '员工出差审批流程',
        formTemplateKey: 'personnel-trip-form',
        workflowTemplateId: 'employee-trip',
        businessType: 'BusinessTrip',
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
      // 获取预设配置
      const preset = this.presets.get(params.presetId);
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
      
      // 获取或创建流程定义
      let definition = await definitionService.getLatestDefinition(preset.workflowTemplateId);
      let formSchema = formTemplate?.fields || null;
      
      if (!formTemplate && definition?.form_schema) {
        // 从流程定义获取表单schema
        formSchema = definition.form_schema;
      }
      
      if (!formTemplate && !formSchema) {
        // 既没有表单模板也没有流程定义的form_schema，尝试从模板创建
        const workflowTemplate = WorkflowTemplatesService.getTemplateById(preset.workflowTemplateId);
        if (workflowTemplate?.formSchema) {
          formSchema = workflowTemplate.formSchema;
        }
      }

      // 自动生成编号
      const enhancedFormData = { ...params.formData };
      
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
        // 处理业务数据联动
        const businessLinkResult = await unifiedFormService.handleBusinessLink(formTemplate.id, enhancedFormData);
        if (!businessLinkResult.success) {
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
        if (!validationResult.isValid) {
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

      // 根据业务类型创建业务数据
      let businessId = params.businessId;
      
      if (preset.businessType === 'Project') {
        // 创建项目 - 使用新的字段结构
        const project = await projectService.createProject({
          code: cleanedFormData.code,
          name: cleanedFormData.name,
          type: cleanedFormData.type || 'domestic',
          manager_id: cleanedFormData.manager_id,
          technical_lead_id: cleanedFormData.technical_lead_id,
          status: cleanedFormData.status || 'proposal',
          start_date: cleanedFormData.start_date,
          end_date: cleanedFormData.end_date,
          country: cleanedFormData.country || '中国',
          address: cleanedFormData.address,
          attachments: cleanedFormData.attachments,
          // 项目相关信息
          description: cleanedFormData.description,
          building_area: cleanedFormData.building_area,
          it_capacity: cleanedFormData.it_capacity,
          cabinet_count: cleanedFormData.cabinet_count,
          cabinet_power: cleanedFormData.cabinet_power,
          // 技术架构
          power_architecture: cleanedFormData.power_architecture,
          hvac_architecture: cleanedFormData.hvac_architecture,
          fire_architecture: cleanedFormData.fire_architecture,
          weak_electric_architecture: cleanedFormData.weak_electric_architecture,
          // 商务信息
          customer_id: cleanedFormData.customer_id,
          end_customer: cleanedFormData.end_customer,
          budget: cleanedFormData.budget || 0,
          organization_id: cleanedFormData.organization_id
        });
        
        businessId = project.id;
        
        // 更新流程实例的 businessId
        await instanceService.updateInstance(instance.id, { business_id: businessId });
      }

      return {
        success: true,
        message: '流程启动成功',
        data: {
          processInstanceId: instance.id,
          businessId: businessId,
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
   * 从流程定义的 form_schema 获取，实现表单与流程强绑定
   */
  async getFormFields(presetId: string): Promise<any[]> {
    const preset = this.presets.get(presetId);
    if (!preset) {
      return [];
    }

    // 从流程定义获取表单 schema
    const definition = await definitionService.getLatestDefinition(preset.workflowTemplateId);
    if (definition && definition.form_schema) {
      return definition.form_schema;
    }

    // 降级：从表单模板获取（兼容旧数据）
    const formTemplate = unifiedFormService.getTemplateByKey(preset.formTemplateKey);
    if (formTemplate) {
      return formTemplate.fields;
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
