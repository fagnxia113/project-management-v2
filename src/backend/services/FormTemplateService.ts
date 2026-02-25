/**
 * 表单模板服务
 * 提供表单模板的管理功能，包括创建、获取、更新和删除表单模板
 * 支持表单字段的验证和处理
 */

import { v4 as uuidv4 } from 'uuid';

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'user' | 'boolean';
  required: boolean;
  placeholder?: string;
  defaultValue?: any;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  options?: { label: string; value: any }[];
  rows?: number;
  cols?: number;
  disabled?: boolean;
  readonly?: boolean;
  hidden?: boolean;
  dependencies?: {
    field: string;
    value: any;
    operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains' | 'notContains';
  }[];
  validation?: {
    message?: string;
    custom?: string;
  };
  dynamicOptions?: 'department' | 'position' | 'employee' | 'project' | 'warehouse';
  dynamicOptionsConfig?: {
    source: string;
    labelField: string;
    valueField: string;
    filter?: Record<string, any>;
  };
}

interface FormTemplate {
  id: string;
  name: string;
  key: string;
  category: string;
  description: string;
  fields: FormField[];
  version: number;
  status: 'active' | 'draft' | 'archived';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface FormValidationResult {
  isValid: boolean;
  errors: {
    field: string;
    message: string;
  }[];
}

/**
 * 表单模板服务类
 */
export class FormTemplateService {
  private templates: Map<string, FormTemplate>;
  private keyToIdMap: Map<string, string>;
  private categoryToTemplatesMap: Map<string, FormTemplate[]>;

  constructor() {
    this.templates = new Map();
    this.keyToIdMap = new Map();
    this.categoryToTemplatesMap = new Map();
    this.initializeDefaultTemplates();
  }

  /**
   * 初始化默认表单模板
   */
  private initializeDefaultTemplates() {
    const defaultTemplates: FormTemplate[] = [
      {
        id: 'form-project-approval',
        key: 'project-approval-form',
        name: '项目审批表单',
        category: 'project',
        description: '项目立项、变更、结项审批表单',
        version: 1,
        status: 'active',
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fields: [
          {
            name: 'project_name',
            label: '项目名称',
            type: 'text',
            required: true,
            placeholder: '请输入项目名称',
            minLength: 2,
            maxLength: 100
          },
          {
            name: 'project_manager',
            label: '项目经理',
            type: 'user',
            required: true,
            placeholder: '请选择项目经理'
          },
          {
            name: 'budget',
            label: '预算(元)',
            type: 'number',
            required: true,
            placeholder: '请输入项目预算',
            min: 0
          },
          {
            name: 'start_date',
            label: '开始日期',
            type: 'date',
            required: true
          },
          {
            name: 'end_date',
            label: '结束日期',
            type: 'date',
            required: true,
            dependencies: [
              {
                field: 'start_date',
                value: '',
                operator: 'notEquals'
              }
            ]
          },
          {
            name: 'description',
            label: '项目描述',
            type: 'textarea',
            required: true,
            placeholder: '请输入项目描述',
            rows: 4,
            minLength: 10
          }
        ]
      },
      {
        id: 'form-equipment-transfer',
        key: 'equipment-transfer-form',
        name: '设备调拨表单',
        category: 'equipment',
        description: '设备跨项目调拨审批表单',
        version: 1,
        status: 'active',
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fields: [
          {
            name: 'equipment_id',
            label: '设备编号',
            type: 'text',
            required: true,
            placeholder: '请输入设备编号'
          },
          {
            name: 'equipment_name',
            label: '设备名称',
            type: 'text',
            required: true,
            placeholder: '请输入设备名称'
          },
          {
            name: 'current_project',
            label: '当前项目',
            type: 'select',
            required: true,
            placeholder: '请选择当前项目'
          },
          {
            name: 'currentProjectManager',
            label: '当前项目负责人',
            type: 'user',
            required: true,
            placeholder: '请选择当前项目负责人'
          },
          {
            name: 'target_project',
            label: '目标项目',
            type: 'select',
            required: true,
            placeholder: '请选择目标项目'
          },
          {
            name: 'targetProjectManager',
            label: '目标项目负责人',
            type: 'user',
            required: true,
            placeholder: '请选择目标项目负责人'
          },
          {
            name: 'transfer_reason',
            label: '调拨原因',
            type: 'textarea',
            required: true,
            placeholder: '请输入调拨原因',
            rows: 3,
            minLength: 10
          }
        ]
      },
      {
        id: 'form-task-approval',
        key: 'task-approval-form',
        name: '任务审批表单',
        category: 'task',
        description: '任务创建、完成、取消审批表单',
        version: 1,
        status: 'active',
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fields: [
          {
            name: 'task_name',
            label: '任务名称',
            type: 'text',
            required: true,
            placeholder: '请输入任务名称',
            minLength: 2,
            maxLength: 100
          },
          {
            name: 'project_id',
            label: '所属项目',
            type: 'select',
            required: true,
            placeholder: '请选择所属项目'
          },
          {
            name: 'projectManager',
            label: '项目经理',
            type: 'user',
            required: true,
            placeholder: '请选择项目经理'
          },
          {
            name: 'assignee',
            label: '任务负责人',
            type: 'user',
            required: true,
            placeholder: '请选择任务负责人'
          },
          {
            name: 'deadline',
            label: '截止日期',
            type: 'date',
            required: true
          },
          {
            name: 'priority',
            label: '优先级',
            type: 'select',
            required: true,
            options: [
              { label: '低', value: 'low' },
              { label: '中', value: 'medium' },
              { label: '高', value: 'high' }
            ]
          },
          {
            name: 'description',
            label: '任务描述',
            type: 'textarea',
            required: true,
            placeholder: '请输入任务描述',
            rows: 3,
            minLength: 10
          }
        ]
      },
      {
        id: 'form-purchase-approval',
        key: 'purchase-approval-form',
        name: '采购审批表单',
        category: 'purchase',
        description: '采购申请审批表单',
        version: 1,
        status: 'active',
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fields: [
          {
            name: 'purchase_name',
            label: '采购名称',
            type: 'text',
            required: true,
            placeholder: '请输入采购名称',
            minLength: 2,
            maxLength: 100
          },
          {
            name: 'amount',
            label: '采购金额(元)',
            type: 'number',
            required: true,
            placeholder: '请输入采购金额',
            min: 0
          },
          {
            name: 'purchase_reason',
            label: '采购原因',
            type: 'textarea',
            required: true,
            placeholder: '请输入采购原因',
            rows: 3,
            minLength: 10
          },
          {
            name: 'supplier',
            label: '供应商',
            type: 'text',
            required: true,
            placeholder: '请输入供应商名称',
            minLength: 2,
            maxLength: 100
          },
          {
            name: 'expected_delivery_date',
            label: '预计交付日期',
            type: 'date',
            required: true
          }
        ]
      },
      {
        id: 'form-employee-onboard',
        key: 'employee-onboard-form',
        name: '人员入职表单',
        category: 'hr',
        description: '新员工入职审批表单',
        version: 1,
        status: 'active',
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fields: [
          {
            name: 'employee_id',
            label: '员工编号',
            type: 'text',
            required: true,
            placeholder: '系统自动生成',
            disabled: true,
            readonly: true
          },
          {
            name: 'employee_name',
            label: '姓名',
            type: 'text',
            required: true,
            placeholder: '请输入姓名',
            minLength: 2,
            maxLength: 50
          },
          {
            name: 'gender',
            label: '性别',
            type: 'select',
            required: true,
            placeholder: '请选择性别',
            options: [
              { label: '男', value: 'male' },
              { label: '女', value: 'female' }
            ]
          },
          {
            name: 'phone',
            label: '手机号',
            type: 'text',
            required: true,
            placeholder: '请输入手机号',
            pattern: '^1[3-9]\\d{9}$',
            validation: {
              message: '手机号格式不正确'
            }
          },
          {
            name: 'email',
            label: '邮箱',
            type: 'text',
            required: false,
            placeholder: '请输入邮箱',
            pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
            validation: {
              message: '邮箱格式不正确'
            }
          },
          {
            name: 'id_card',
            label: '身份证号',
            type: 'text',
            required: false,
            placeholder: '请输入身份证号',
            pattern: '^[1-9]\\d{5}(18|19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]$',
            validation: {
              message: '身份证号格式不正确'
            }
          },
          {
            name: 'department_id',
            label: '入职部门',
            type: 'select',
            required: true,
            placeholder: '请选择入职部门',
            dynamicOptions: 'department',
            dynamicOptionsConfig: {
              source: '/api/organization/departments',
              labelField: 'name',
              valueField: 'id'
            }
          },
          {
            name: 'position_id',
            label: '入职岗位',
            type: 'select',
            required: true,
            placeholder: '请选择入职岗位',
            dynamicOptions: 'position',
            dynamicOptionsConfig: {
              source: '/api/organization/positions',
              labelField: 'name',
              valueField: 'id'
            }
          },
          {
            name: 'start_date',
            label: '入职日期',
            type: 'date',
            required: true
          },
          {
            name: 'employee_type',
            label: '员工性质',
            type: 'select',
            required: true,
            placeholder: '请选择员工性质',
            options: [
              { label: '正式', value: 'regular' },
              { label: '实习', value: 'intern' },
              { label: '外包', value: 'outsourced' }
            ]
          },
          {
            name: 'notes',
            label: '备注',
            type: 'textarea',
            required: false,
            placeholder: '请输入备注信息',
            rows: 2
          }
        ]
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
      this.keyToIdMap.set(template.key, template.id);
      
      const categoryTemplates = this.categoryToTemplatesMap.get(template.category) || [];
      categoryTemplates.push(template);
      this.categoryToTemplatesMap.set(template.category, categoryTemplates);
    });
  }

  /**
   * 创建表单模板
   */
  createTemplate(template: Omit<FormTemplate, 'id' | 'version' | 'createdAt' | 'updatedAt'>): FormTemplate {
    const id = uuidv4();
    const version = 1;
    const now = new Date().toISOString();

    const newTemplate: FormTemplate = {
      ...template,
      id,
      version,
      createdAt: now,
      updatedAt: now
    };

    this.templates.set(id, newTemplate);
    this.keyToIdMap.set(template.key, id);

    const categoryTemplates = this.categoryToTemplatesMap.get(template.category) || [];
    categoryTemplates.push(newTemplate);
    this.categoryToTemplatesMap.set(template.category, categoryTemplates);

    return newTemplate;
  }

  /**
   * 获取表单模板
   */
  getTemplate(id: string): FormTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * 根据key获取表单模板
   */
  getTemplateByKey(key: string): FormTemplate | undefined {
    const id = this.keyToIdMap.get(key);
    return id ? this.templates.get(id) : undefined;
  }

  /**
   * 获取所有表单模板
   */
  getAllTemplates(): FormTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * 根据分类获取表单模板
   */
  getTemplatesByCategory(category: string): FormTemplate[] {
    return this.categoryToTemplatesMap.get(category) || [];
  }

  /**
   * 更新表单模板
   */
  updateTemplate(id: string, updates: Partial<FormTemplate>): FormTemplate | undefined {
    const template = this.templates.get(id);
    if (!template) {
      return undefined;
    }

    const updatedTemplate: FormTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date().toISOString(),
      version: template.version + 1
    };

    this.templates.set(id, updatedTemplate);

    // 更新分类映射
    if (updates.category && updates.category !== template.category) {
      // 从旧分类中移除
      let categoryTemplates = this.categoryToTemplatesMap.get(template.category) || [];
      categoryTemplates = categoryTemplates.filter(t => t.id !== id);
      this.categoryToTemplatesMap.set(template.category, categoryTemplates);

      // 添加到新分类
      categoryTemplates = this.categoryToTemplatesMap.get(updates.category) || [];
      categoryTemplates.push(updatedTemplate);
      this.categoryToTemplatesMap.set(updates.category, categoryTemplates);
    }

    return updatedTemplate;
  }

  /**
   * 删除表单模板
   */
  deleteTemplate(id: string): boolean {
    const template = this.templates.get(id);
    if (!template) {
      return false;
    }

    this.templates.delete(id);
    this.keyToIdMap.delete(template.key);

    // 从分类映射中移除
    let categoryTemplates = this.categoryToTemplatesMap.get(template.category) || [];
    categoryTemplates = categoryTemplates.filter(t => t.id !== id);
    this.categoryToTemplatesMap.set(template.category, categoryTemplates);

    return true;
  }

  /**
   * 激活表单模板
   */
  activateTemplate(id: string): FormTemplate | undefined {
    return this.updateTemplate(id, { status: 'active' });
  }

  /**
   * 归档表单模板
   */
  archiveTemplate(id: string): FormTemplate | undefined {
    return this.updateTemplate(id, { status: 'archived' });
  }

  /**
   * 验证表单数据
   */
  validateForm(templateId: string, data: Record<string, any>): FormValidationResult {
    const template = this.templates.get(templateId);
    if (!template) {
      return {
        isValid: false,
        errors: [
          {
            field: 'template',
            message: '表单模板不存在'
          }
        ]
      };
    }

    const errors: { field: string; message: string }[] = [];

    template.fields.forEach(field => {
      // 检查字段是否可见（基于依赖）
      const isVisible = this.isFieldVisible(field, data);
      if (!isVisible) {
        return;
      }

      const value = data[field.name];

      // 检查必填字段
      if (field.required && !this.hasValue(value)) {
        errors.push({
          field: field.name,
          message: `${field.label}是必填字段`
        });
        return;
      }

      // 如果字段有值，进行类型和范围验证
      if (this.hasValue(value)) {
        // 类型验证
        if (!this.validateType(value, field.type)) {
          errors.push({
            field: field.name,
            message: `${field.label}类型不正确`
          });
        }

        // 长度验证
        if (field.type === 'text' || field.type === 'textarea') {
          if (field.minLength && String(value).length < field.minLength) {
            errors.push({
              field: field.name,
              message: `${field.label}长度不能小于${field.minLength}个字符`
            });
          }
          if (field.maxLength && String(value).length > field.maxLength) {
            errors.push({
              field: field.name,
              message: `${field.label}长度不能大于${field.maxLength}个字符`
            });
          }
        }

        // 数值范围验证
        if (field.type === 'number') {
          if (field.min !== undefined && value < field.min) {
            errors.push({
              field: field.name,
              message: `${field.label}不能小于${field.min}`
            });
          }
          if (field.max !== undefined && value > field.max) {
            errors.push({
              field: field.name,
              message: `${field.label}不能大于${field.max}`
            });
          }
        }

        // 正则表达式验证
        if (field.pattern) {
          const regex = new RegExp(field.pattern);
          if (!regex.test(String(value))) {
            errors.push({
              field: field.name,
              message: field.validation?.message || `${field.label}格式不正确`
            });
          }
        }

        // 日期验证
        if (field.type === 'date') {
          const dateValue = new Date(value);
          if (isNaN(dateValue.getTime())) {
            errors.push({
              field: field.name,
              message: `${field.label}日期格式不正确`
            });
          }
        }

        // 选择验证
        if (field.type === 'select' && field.options) {
          const optionValues = field.options.map(opt => opt.value);
          if (!optionValues.includes(value)) {
            errors.push({
              field: field.name,
              message: `${field.label}选择值无效`
            });
          }
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 检查字段是否有值
   */
  private hasValue(value: any): boolean {
    if (value === null || value === undefined) {
      return false;
    }
    if (typeof value === 'string') {
      return value.trim() !== '';
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return true;
  }

  /**
   * 验证类型
   */
  private validateType(value: any, type: FormField['type']): boolean {
    switch (type) {
      case 'text':
      case 'textarea':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'date':
        return !isNaN(new Date(value).getTime());
      case 'boolean':
        return typeof value === 'boolean';
      case 'user':
        return typeof value === 'string';
      case 'select':
        return true; // 选择值的验证在其他地方处理
      default:
        return true;
    }
  }

  /**
   * 检查字段是否可见
   */
  private isFieldVisible(field: FormField, data: Record<string, any>): boolean {
    if (!field.dependencies || field.dependencies.length === 0) {
      return true;
    }

    return field.dependencies.every(dep => {
      const fieldValue = data[dep.field];
      
      switch (dep.operator) {
        case 'equals':
          return fieldValue === dep.value;
        case 'notEquals':
          return fieldValue !== dep.value;
        case 'greaterThan':
          return fieldValue > dep.value;
        case 'lessThan':
          return fieldValue < dep.value;
        case 'contains':
          return Array.isArray(fieldValue) ? fieldValue.includes(dep.value) : String(fieldValue).includes(String(dep.value));
        case 'notContains':
          return Array.isArray(fieldValue) ? !fieldValue.includes(dep.value) : !String(fieldValue).includes(String(dep.value));
        default:
          return true;
      }
    });
  }

  /**
   * 获取表单的默认值
   */
  getDefaultValues(templateId: string): Record<string, any> {
    const template = this.templates.get(templateId);
    if (!template) {
      return {};
    }

    const defaultValues: Record<string, any> = {};

    template.fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        defaultValues[field.name] = field.defaultValue;
      }
    });

    return defaultValues;
  }

  /**
   * 清理表单数据（移除不可见字段的值）
   */
  cleanFormData(templateId: string, data: Record<string, any>): Record<string, any> {
    const template = this.templates.get(templateId);
    if (!template) {
      return data;
    }

    const cleanedData: Record<string, any> = {};

    template.fields.forEach(field => {
      if (this.isFieldVisible(field, data)) {
        cleanedData[field.name] = data[field.name];
      }
    });

    return cleanedData;
  }
}

// 导出单例
export const formTemplateService = new FormTemplateService();
