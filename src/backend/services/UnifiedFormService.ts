/**
 * 统一表单管理服务
 * 整合现有业务模块的表单结构，提供统一的表单定义、渲染和验证机制
 * 支持与业务数据的联动，确保表单内容与现有数据一致
 */

import { v4 as uuidv4 } from 'uuid';

// 业务模块类型
export type BusinessModule = 'project' | 'equipment' | 'personnel' | 'task' | 'purchase' | 'customer' | 'warehouse';

// 表单字段类型
export type FormFieldType = 'text' | 'number' | 'date' | 'select' | 'textarea' | 'boolean' | 'user' | 'lookup';

// 表单字段定义
export interface UnifiedFormField {
  id: string;
  name: string;
  label: string;
  type: FormFieldType;
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
  // 业务数据联动配置
  businessConfig?: {
    module?: BusinessModule;
    entityType?: string;
    lookupField?: string;
    displayField?: string;
    filter?: Record<string, any>;
    autoFill?: boolean;
  };
}

// 表单模板定义
export interface UnifiedFormTemplate {
  id: string;
  name: string;
  key: string;
  module: BusinessModule;
  category: string;
  description: string;
  fields: UnifiedFormField[];
  version: number;
  status: 'active' | 'draft' | 'archived';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  businessEntityType: string;
  workflowTemplateId?: string;
}

// 表单验证结果
export interface FormValidationResult {
  isValid: boolean;
  errors: {
    field: string;
    message: string;
  }[];
}

// 表单数据与业务数据联动结果
export interface FormBusinessLinkResult {
  success: boolean;
  data: Record<string, any>;
  messages: string[];
}

/**
 * 统一表单管理服务类
 */
export class UnifiedFormService {
  private templates: Map<string, UnifiedFormTemplate>;
  private keyToIdMap: Map<string, string>;
  private moduleToTemplatesMap: Map<BusinessModule, UnifiedFormTemplate[]>;
  private entityToTemplateMap: Map<string, UnifiedFormTemplate[]>;

  constructor() {
    this.templates = new Map();
    this.keyToIdMap = new Map();
    this.moduleToTemplatesMap = new Map();
    this.entityToTemplateMap = new Map();
    this.initializeDefaultTemplates();
  }

  /**
   * 初始化默认表单模板
   * 基于现有的业务模块表单结构创建统一的表单模板
   */
  private initializeDefaultTemplates() {
    const defaultTemplates: UnifiedFormTemplate[] = [
      {
        id: 'form-project-create',
        key: 'project-create-form',
        name: '项目创建表单',
        module: 'project',
        category: 'project',
        description: '项目立项审批表单',
        businessEntityType: 'Project',
        workflowTemplateId: 'project-approval',
        version: 1,
        status: 'active',
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fields: [
          // ========== 基本信息 ==========
          {
            id: 'field-project-name',
            name: 'name',
            label: '项目名称',
            type: 'text',
            required: true,
            placeholder: '请输入项目名称',
            minLength: 2,
            maxLength: 100
          },
          {
            id: 'field-project-code',
            name: 'code',
            label: '项目编号',
            type: 'text',
            required: false,
            placeholder: '系统自动生成',
            disabled: true,
            readonly: true
          },
          {
            id: 'field-project-manager',
            name: 'manager_id',
            label: '项目经理',
            type: 'user',
            required: true,
            placeholder: '请选择项目经理'
          },
          {
            id: 'field-project-technical-lead',
            name: 'technical_lead_id',
            label: '技术负责人',
            type: 'user',
            required: false,
            placeholder: '请选择技术负责人'
          },
          {
            id: 'field-project-start-date',
            name: 'start_date',
            label: '项目开始日期',
            type: 'date',
            required: true
          },
          {
            id: 'field-project-end-date',
            name: 'end_date',
            label: '项目结束日期',
            type: 'date',
            required: false
          },
          {
            id: 'field-project-country',
            name: 'country',
            label: '所属国家',
            type: 'select',
            required: false,
            defaultValue: '中国',
            options: [
              { label: '中国', value: '中国' },
              { label: '美国', value: '美国' },
              { label: '新加坡', value: '新加坡' },
              { label: '马来西亚', value: '马来西亚' },
              { label: '印度尼西亚', value: '印度尼西亚' },
              { label: '泰国', value: '泰国' },
              { label: '越南', value: '越南' },
              { label: '菲律宾', value: '菲律宾' },
              { label: '日本', value: '日本' },
              { label: '韩国', value: '韩国' },
              { label: '阿联酋', value: '阿联酋' },
              { label: '沙特阿拉伯', value: '沙特阿拉伯' },
              { label: '德国', value: '德国' },
              { label: '英国', value: '英国' },
              { label: '其他', value: '其他' }
            ]
          },
          {
            id: 'field-project-address',
            name: 'address',
            label: '项目地址',
            type: 'text',
            required: false,
            placeholder: '请输入项目地址'
          },
          {
            id: 'field-project-type',
            name: 'type',
            label: '项目类型',
            type: 'select',
            required: false,
            defaultValue: 'domestic',
            options: [
              { label: '国内项目', value: 'domestic' },
              { label: '海外项目', value: 'foreign' },
              { label: '研发项目', value: 'rd' },
              { label: '服务项目', value: 'service' }
            ]
          },
          {
            id: 'field-project-status',
            name: 'status',
            label: '项目状态',
            type: 'select',
            required: true,
            defaultValue: 'proposal',
            options: [
              { label: '立项', value: 'proposal' },
              { label: '进行中', value: 'in_progress' },
              { label: '已完成', value: 'completed' },
              { label: '暂停', value: 'paused' }
            ]
          },
          // ========== 项目规模 ==========
          {
            id: 'field-project-description',
            name: 'description',
            label: '项目描述',
            type: 'textarea',
            required: false,
            placeholder: '请输入项目描述信息',
            rows: 3
          },
          {
            id: 'field-project-building-area',
            name: 'building_area',
            label: '建筑面积(m²)',
            type: 'number',
            required: false,
            min: 0
          },
          {
            id: 'field-project-it-capacity',
            name: 'it_capacity',
            label: 'IT容量(MW)',
            type: 'number',
            required: false,
            min: 0
          },
          {
            id: 'field-project-cabinet-count',
            name: 'cabinet_count',
            label: '机柜数量',
            type: 'number',
            required: false,
            min: 0
          },
          {
            id: 'field-project-cabinet-power',
            name: 'cabinet_power',
            label: '单机柜功率(KW)',
            type: 'number',
            required: false,
            min: 0
          },
          // ========== 技术架构 ==========
          {
            id: 'field-project-power-architecture',
            name: 'power_architecture',
            label: '供电架构',
            type: 'textarea',
            required: false,
            placeholder: '供电系统架构描述',
            rows: 2
          },
          {
            id: 'field-project-hvac-architecture',
            name: 'hvac_architecture',
            label: '暖通架构',
            type: 'textarea',
            required: false,
            placeholder: '暖通系统架构描述',
            rows: 2
          },
          {
            id: 'field-project-fire-architecture',
            name: 'fire_architecture',
            label: '消防架构',
            type: 'textarea',
            required: false,
            placeholder: '消防系统架构描述',
            rows: 2
          },
          {
            id: 'field-project-weak-electric-architecture',
            name: 'weak_electric_architecture',
            label: '弱电架构',
            type: 'textarea',
            required: false,
            placeholder: '弱电系统架构描述',
            rows: 2
          },
          // ========== 商务信息 ==========
          {
            id: 'field-project-customer',
            name: 'customer_id',
            label: '客户',
            type: 'lookup',
            required: false,
            placeholder: '请选择客户',
            businessConfig: {
              module: 'customer',
              entityType: 'Customer',
              lookupField: 'id',
              displayField: 'name',
              autoFill: true
            }
          },
          {
            id: 'field-project-end-customer',
            name: 'end_customer',
            label: '最终客户',
            type: 'text',
            required: false,
            placeholder: '请输入最终客户名称'
          },
          {
            id: 'field-project-budget',
            name: 'budget',
            label: '预算金额(万元)',
            type: 'number',
            required: false,
            placeholder: '请输入预算金额',
            min: 0
          }
        ]
      },
      {
        id: 'form-equipment-create',
        key: 'equipment-create-form',
        name: '设备创建表单',
        module: 'equipment',
        category: 'equipment',
        description: '设备创建表单，基于现有EquipmentForm组件',
        businessEntityType: 'Equipment',
        version: 1,
        status: 'active',
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fields: [
          {
            id: 'field-equipment-name',
            name: 'name',
            label: '设备名称',
            type: 'text',
            required: true,
            placeholder: '请输入设备名称',
            minLength: 2,
            maxLength: 100
          },
          {
            id: 'field-equipment-code',
            name: 'code',
            label: '设备编号',
            type: 'text',
            required: false,
            placeholder: '系统自动生成',
            minLength: 1,
            maxLength: 50,
            disabled: true,
            readonly: true
          },
          {
            id: 'field-equipment-type',
            name: 'type',
            label: '设备类型',
            type: 'select',
            required: true,
            defaultValue: 'machinery',
            options: [
              { label: '机械设备', value: 'machinery' },
              { label: '运输工具', value: 'vehicle' },
              { label: '工具', value: 'tool' },
              { label: '电子设备', value: 'electronics' },
              { label: '其他', value: 'other' }
            ]
          },
          {
            id: 'field-equipment-status',
            name: 'status',
            label: '设备状态',
            type: 'select',
            required: true,
            defaultValue: 'available',
            options: [
              { label: '可用', value: 'available' },
              { label: '使用中', value: 'in_use' },
              { label: '维护中', value: 'maintenance' },
              { label: '报废', value: 'scrapped' }
            ]
          },
          {
            id: 'field-equipment-purchase-date',
            name: 'purchase_date',
            label: '采购日期',
            type: 'date',
            required: false
          },
          {
            id: 'field-equipment-purchase-price',
            name: 'purchase_price',
            label: '采购价格（元）',
            type: 'number',
            required: false,
            min: 0,
            placeholder: '请输入采购价格'
          },
          {
            id: 'field-equipment-supplier',
            name: 'supplier',
            label: '供应商',
            type: 'lookup',
            required: false,
            placeholder: '请选择供应商',
            businessConfig: {
              module: 'customer',
              entityType: 'Customer',
              lookupField: 'id',
              displayField: 'name',
              filter: { type: 'supplier' },
              autoFill: true
            }
          },
          {
            id: 'field-equipment-location',
            name: 'location',
            label: '存放位置',
            type: 'lookup',
            required: false,
            placeholder: '请选择存放位置',
            businessConfig: {
              module: 'warehouse',
              entityType: 'Warehouse',
              lookupField: 'id',
              displayField: 'name',
              autoFill: true
            }
          },
          {
            id: 'field-equipment-notes',
            name: 'notes',
            label: '备注',
            type: 'textarea',
            required: false,
            placeholder: '请输入备注信息',
            rows: 3
          }
        ]
      },
      {
        id: 'form-equipment-transfer',
        key: 'equipment-transfer-form',
        name: '设备调拨表单',
        module: 'equipment',
        category: 'equipment',
        description: '设备调拨表单，基于现有EquipmentTransferPage组件',
        businessEntityType: 'EquipmentTransfer',
        version: 1,
        status: 'active',
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fields: [
          {
            id: 'field-transfer-equipment',
            name: 'equipment_id',
            label: '设备',
            type: 'lookup',
            required: true,
            placeholder: '请选择设备',
            businessConfig: {
              module: 'equipment',
              entityType: 'Equipment',
              lookupField: 'id',
              displayField: 'name',
              filter: { status: { $in: ['available', 'in_use'] } },
              autoFill: true
            }
          },
          {
            id: 'field-transfer-current-project',
            name: 'current_project',
            label: '当前项目',
            type: 'lookup',
            required: true,
            placeholder: '请选择当前项目',
            businessConfig: {
              module: 'project',
              entityType: 'Project',
              lookupField: 'id',
              displayField: 'name',
              filter: { status: { $in: ['planning', 'in_progress'] } },
              autoFill: true
            }
          },
          {
            id: 'field-transfer-current-manager',
            name: 'current_project_manager',
            label: '当前项目负责人',
            type: 'user',
            required: true,
            placeholder: '请选择当前项目负责人'
          },
          {
            id: 'field-transfer-target-project',
            name: 'target_project',
            label: '目标项目',
            type: 'lookup',
            required: true,
            placeholder: '请选择目标项目',
            businessConfig: {
              module: 'project',
              entityType: 'Project',
              lookupField: 'id',
              displayField: 'name',
              filter: { status: { $in: ['planning', 'in_progress'] } },
              autoFill: true
            }
          },
          {
            id: 'field-transfer-target-manager',
            name: 'target_project_manager',
            label: '目标项目负责人',
            type: 'user',
            required: true,
            placeholder: '请选择目标项目负责人'
          },
          {
            id: 'field-transfer-reason',
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
        id: 'form-task-create',
        key: 'task-create-form',
        name: '任务创建表单',
        module: 'task',
        category: 'task',
        description: '任务创建表单，基于现有TaskForm组件',
        businessEntityType: 'Task',
        version: 1,
        status: 'active',
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fields: [
          {
            id: 'field-task-name',
            name: 'name',
            label: '任务名称',
            type: 'text',
            required: true,
            placeholder: '请输入任务名称',
            minLength: 2,
            maxLength: 100
          },
          {
            id: 'field-task-project',
            name: 'project_id',
            label: '所属项目',
            type: 'lookup',
            required: true,
            placeholder: '请选择所属项目',
            businessConfig: {
              module: 'project',
              entityType: 'Project',
              lookupField: 'id',
              displayField: 'name',
              filter: { status: { $in: ['planning', 'in_progress'] } },
              autoFill: true
            }
          },
          {
            id: 'field-task-assignee',
            name: 'assignee',
            label: '任务负责人',
            type: 'user',
            required: true,
            placeholder: '请选择任务负责人'
          },
          {
            id: 'field-task-deadline',
            name: 'deadline',
            label: '截止日期',
            type: 'date',
            required: true
          },
          {
            id: 'field-task-priority',
            name: 'priority',
            label: '优先级',
            type: 'select',
            required: true,
            defaultValue: 'medium',
            options: [
              { label: '低', value: 'low' },
              { label: '中', value: 'medium' },
              { label: '高', value: 'high' }
            ]
          },
          {
            id: 'field-task-description',
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
        id: 'form-personnel-onboard',
        key: 'personnel-onboard-form',
        name: '人员入职表单',
        module: 'personnel',
        category: 'personnel',
        description: '人员入职表单，基于现有PersonnelOnboardPage组件',
        businessEntityType: 'Employee',
        version: 1,
        status: 'active',
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fields: [
          {
            id: 'field-employee-id',
            name: 'employee_id',
            label: '员工编号',
            type: 'text',
            required: false,
            placeholder: '系统自动生成',
            minLength: 1,
            maxLength: 20,
            disabled: true,
            readonly: true
          },
          {
            id: 'field-employee-name',
            name: 'employee_name',
            label: '姓名',
            type: 'text',
            required: true,
            placeholder: '请输入姓名',
            minLength: 2,
            maxLength: 50
          },
          {
            id: 'field-employee-gender',
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
            id: 'field-employee-phone',
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
            id: 'field-employee-email',
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
            id: 'field-employee-id-card',
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
            id: 'field-employee-department',
            name: 'department_id',
            label: '入职部门',
            type: 'select',
            required: true,
            placeholder: '请选择入职部门',
            businessConfig: {
              module: 'personnel',
              entityType: 'Department',
              lookupField: 'id',
              displayField: 'name',
              autoFill: true
            }
          },
          {
            id: 'field-employee-position',
            name: 'position_id',
            label: '入职岗位',
            type: 'select',
            required: true,
            placeholder: '请选择入职岗位',
            businessConfig: {
              module: 'personnel',
              entityType: 'Position',
              lookupField: 'id',
              displayField: 'name',
              autoFill: true
            }
          },
          {
            id: 'field-employee-start-date',
            name: 'start_date',
            label: '入职日期',
            type: 'date',
            required: true
          },
          {
            id: 'field-employee-type',
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
            id: 'field-employee-notes',
            name: 'notes',
            label: '备注',
            type: 'textarea',
            required: false,
            placeholder: '请输入备注信息',
            rows: 2
          }
        ]
      },
      {
        id: 'form-personnel-offboard',
        key: 'personnel-offboard-form',
        name: '人员离职表单',
        module: 'personnel',
        category: 'personnel',
        description: '员工离职审批表单',
        businessEntityType: 'Employee',
        version: 1,
        status: 'active',
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fields: [
          {
            id: 'field-offboard-employee',
            name: 'employee_id',
            label: '离职员工',
            type: 'select',
            required: true,
            placeholder: '请选择离职员工',
            businessConfig: {
              module: 'personnel',
              entityType: 'Employee',
              lookupField: 'id',
              displayField: 'name',
              filter: { status: 'active' },
              autoFill: true
            }
          },
          {
            id: 'field-offboard-employee-name',
            name: 'employee_name',
            label: '员工姓名',
            type: 'text',
            required: false,
            disabled: true,
            readonly: true
          },
          {
            id: 'field-offboard-department',
            name: 'department_name',
            label: '所属部门',
            type: 'text',
            required: false,
            disabled: true,
            readonly: true
          },
          {
            id: 'field-offboard-position',
            name: 'position_name',
            label: '岗位',
            type: 'text',
            required: false,
            disabled: true,
            readonly: true
          },
          {
            id: 'field-offboard-type',
            name: 'offboard_type',
            label: '离职类型',
            type: 'select',
            required: true,
            placeholder: '请选择离职类型',
            options: [
              { label: '主动离职', value: 'voluntary' },
              { label: '被动离职', value: 'involuntary' },
              { label: '合同到期', value: 'contract_expired' },
              { label: '退休', value: 'retirement' }
            ]
          },
          {
            id: 'field-offboard-date',
            name: 'leave_date',
            label: '离职日期',
            type: 'date',
            required: true
          },
          {
            id: 'field-offboard-reason',
            name: 'offboard_reason',
            label: '离职原因',
            type: 'textarea',
            required: true,
            placeholder: '请输入离职原因',
            rows: 3
          },
          {
            id: 'field-offboard-handover',
            name: 'handover_status',
            label: '工作交接情况',
            type: 'textarea',
            required: false,
            placeholder: '请描述工作交接情况',
            rows: 2
          },
          {
            id: 'field-offboard-notes',
            name: 'notes',
            label: '备注',
            type: 'textarea',
            required: false,
            placeholder: '请输入备注信息',
            rows: 2
          }
        ]
      },
      {
        id: 'form-personnel-regular',
        key: 'personnel-regular-form',
        name: '人员转正表单',
        module: 'personnel',
        category: 'personnel',
        description: '员工转正审批表单',
        businessEntityType: 'Employee',
        version: 1,
        status: 'active',
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fields: [
          {
            id: 'field-regular-employee',
            name: 'employee_id',
            label: '转正员工',
            type: 'select',
            required: true,
            placeholder: '请选择转正员工',
            businessConfig: {
              module: 'personnel',
              entityType: 'Employee',
              lookupField: 'id',
              displayField: 'name',
              filter: { status: 'probation' },
              autoFill: true
            }
          },
          {
            id: 'field-regular-employee-name',
            name: 'employee_name',
            label: '员工姓名',
            type: 'text',
            required: false,
            disabled: true,
            readonly: true
          },
          {
            id: 'field-regular-department',
            name: 'department_name',
            label: '所属部门',
            type: 'text',
            required: false,
            disabled: true,
            readonly: true
          },
          {
            id: 'field-regular-position',
            name: 'position_name',
            label: '岗位',
            type: 'text',
            required: false,
            disabled: true,
            readonly: true
          },
          {
            id: 'field-regular-hire-date',
            name: 'hire_date',
            label: '入职日期',
            type: 'date',
            required: false,
            disabled: true,
            readonly: true
          },
          {
            id: 'field-regular-date',
            name: 'regular_date',
            label: '转正日期',
            type: 'date',
            required: true
          },
          {
            id: 'field-regular-summary',
            name: 'work_summary',
            label: '试用期工作总结',
            type: 'textarea',
            required: true,
            placeholder: '请输入试用期工作总结',
            rows: 4
          },
          {
            id: 'field-regular-achievement',
            name: 'achievement',
            label: '主要工作成果',
            type: 'textarea',
            required: false,
            placeholder: '请输入主要工作成果',
            rows: 3
          },
          {
            id: 'field-regular-suggestion',
            name: 'suggestion',
            label: '改进建议',
            type: 'textarea',
            required: false,
            placeholder: '请输入改进建议',
            rows: 2
          },
          {
            id: 'field-regular-notes',
            name: 'notes',
            label: '备注',
            type: 'textarea',
            required: false,
            placeholder: '请输入备注信息',
            rows: 2
          }
        ]
      },
      {
        id: 'form-personnel-leave',
        key: 'personnel-leave-form',
        name: '请假申请表单',
        module: 'personnel',
        category: 'attendance',
        description: '员工请假申请表单',
        businessEntityType: 'LeaveRequest',
        version: 1,
        status: 'active',
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fields: [
          {
            id: 'field-leave-employee',
            name: 'employee_id',
            label: '申请人',
            type: 'select',
            required: true,
            placeholder: '请选择申请人',
            businessConfig: {
              module: 'personnel',
              entityType: 'Employee',
              lookupField: 'id',
              displayField: 'name',
              filter: { status: ['active', 'probation'] },
              autoFill: true
            }
          },
          {
            id: 'field-leave-type',
            name: 'leave_type',
            label: '请假类型',
            type: 'select',
            required: true,
            placeholder: '请选择请假类型',
            options: [
              { label: '事假', value: 'personal' },
              { label: '病假', value: 'sick' },
              { label: '年假', value: 'annual' },
              { label: '婚假', value: 'marriage' },
              { label: '产假', value: 'maternity' },
              { label: '陪产假', value: 'paternity' },
              { label: '丧假', value: 'bereavement' },
              { label: '调休', value: 'compensatory' }
            ]
          },
          {
            id: 'field-leave-start',
            name: 'start_date',
            label: '开始日期',
            type: 'date',
            required: true
          },
          {
            id: 'field-leave-end',
            name: 'end_date',
            label: '结束日期',
            type: 'date',
            required: true
          },
          {
            id: 'field-leave-days',
            name: 'leave_days',
            label: '请假天数',
            type: 'number',
            required: true,
            min: 0.5,
            step: 0.5
          },
          {
            id: 'field-leave-reason',
            name: 'leave_reason',
            label: '请假原因',
            type: 'textarea',
            required: true,
            placeholder: '请输入请假原因',
            rows: 3
          },
          {
            id: 'field-leave-attachment',
            name: 'attachment',
            label: '附件（如病假单等）',
            type: 'text',
            required: false,
            placeholder: '请上传相关附件'
          },
          {
            id: 'field-leave-notes',
            name: 'notes',
            label: '备注',
            type: 'textarea',
            required: false,
            placeholder: '请输入备注信息',
            rows: 2
          }
        ]
      },
      {
        id: 'form-personnel-trip',
        key: 'personnel-trip-form',
        name: '出差申请表单',
        module: 'personnel',
        category: 'attendance',
        description: '员工出差申请表单',
        businessEntityType: 'BusinessTrip',
        version: 1,
        status: 'active',
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fields: [
          {
            id: 'field-trip-employee',
            name: 'employee_id',
            label: '申请人',
            type: 'select',
            required: true,
            placeholder: '请选择申请人',
            businessConfig: {
              module: 'personnel',
              entityType: 'Employee',
              lookupField: 'id',
              displayField: 'name',
              filter: { status: ['active', 'probation'] },
              autoFill: true
            }
          },
          {
            id: 'field-trip-project',
            name: 'project_id',
            label: '关联项目',
            type: 'select',
            required: false,
            placeholder: '请选择关联项目',
            businessConfig: {
              module: 'projects',
              entityType: 'Project',
              lookupField: 'id',
              displayField: 'name',
              filter: { status: ['in_progress', 'delayed'] },
              autoFill: true
            }
          },
          {
            id: 'field-trip-destination',
            name: 'destination',
            label: '出差目的地',
            type: 'text',
            required: true,
            placeholder: '请输入出差目的地'
          },
          {
            id: 'field-trip-start',
            name: 'start_date',
            label: '出发日期',
            type: 'date',
            required: true
          },
          {
            id: 'field-trip-end',
            name: 'end_date',
            label: '返回日期',
            type: 'date',
            required: true
          },
          {
            id: 'field-trip-days',
            name: 'trip_days',
            label: '出差天数',
            type: 'number',
            required: true,
            min: 1
          },
          {
            id: 'field-trip-purpose',
            name: 'trip_purpose',
            label: '出差目的',
            type: 'textarea',
            required: true,
            placeholder: '请输入出差目的',
            rows: 3
          },
          {
            id: 'field-trip-itinerary',
            name: 'itinerary',
            label: '行程安排',
            type: 'textarea',
            required: false,
            placeholder: '请输入行程安排',
            rows: 3
          },
          {
            id: 'field-trip-budget',
            name: 'budget_estimate',
            label: '预计费用（元）',
            type: 'number',
            required: false,
            min: 0
          },
          {
            id: 'field-trip-notes',
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

    // 初始化模板映射
    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
      this.keyToIdMap.set(template.key, template.id);
      
      // 按模块分类
      const moduleTemplates = this.moduleToTemplatesMap.get(template.module) || [];
      moduleTemplates.push(template);
      this.moduleToTemplatesMap.set(template.module, moduleTemplates);
      
      // 按实体类型分类
      const entityTemplates = this.entityToTemplateMap.get(template.businessEntityType) || [];
      entityTemplates.push(template);
      this.entityToTemplateMap.set(template.businessEntityType, entityTemplates);
    });
  }

  /**
   * 获取所有表单模板
   */
  getAllTemplates(): UnifiedFormTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * 根据ID获取表单模板
   */
  getTemplateById(id: string): UnifiedFormTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * 根据key获取表单模板
   */
  getTemplateByKey(key: string): UnifiedFormTemplate | undefined {
    const id = this.keyToIdMap.get(key);
    return id ? this.templates.get(id) : undefined;
  }

  /**
   * 根据模块获取表单模板
   */
  getTemplatesByModule(module: BusinessModule): UnifiedFormTemplate[] {
    return this.moduleToTemplatesMap.get(module) || [];
  }

  /**
   * 根据实体类型获取表单模板
   */
  getTemplatesByEntityType(entityType: string): UnifiedFormTemplate[] {
    return this.entityToTemplateMap.get(entityType) || [];
  }

  /**
   * 创建表单模板
   */
  createTemplate(template: Omit<UnifiedFormTemplate, 'id' | 'version' | 'createdAt' | 'updatedAt'>): UnifiedFormTemplate {
    const id = uuidv4();
    const version = 1;
    const now = new Date().toISOString();

    const newTemplate: UnifiedFormTemplate = {
      ...template,
      id,
      version,
      createdAt: now,
      updatedAt: now
    };

    this.templates.set(id, newTemplate);
    this.keyToIdMap.set(template.key, id);

    // 更新模块映射
    const moduleTemplates = this.moduleToTemplatesMap.get(template.module) || [];
    moduleTemplates.push(newTemplate);
    this.moduleToTemplatesMap.set(template.module, moduleTemplates);

    // 更新实体类型映射
    const entityTemplates = this.entityToTemplateMap.get(template.businessEntityType) || [];
    entityTemplates.push(newTemplate);
    this.entityToTemplateMap.set(template.businessEntityType, entityTemplates);

    return newTemplate;
  }

  /**
   * 更新表单模板
   */
  updateTemplate(id: string, updates: Partial<UnifiedFormTemplate>): UnifiedFormTemplate | undefined {
    const template = this.templates.get(id);
    if (!template) {
      return undefined;
    }

    const updatedTemplate: UnifiedFormTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date().toISOString(),
      version: template.version + 1
    };

    this.templates.set(id, updatedTemplate);

    // 如果模块变更，更新模块映射
    if (updates.module && updates.module !== template.module) {
      // 从旧模块中移除
      let moduleTemplates = this.moduleToTemplatesMap.get(template.module) || [];
      moduleTemplates = moduleTemplates.filter(t => t.id !== id);
      this.moduleToTemplatesMap.set(template.module, moduleTemplates);

      // 添加到新模块
      moduleTemplates = this.moduleToTemplatesMap.get(updates.module) || [];
      moduleTemplates.push(updatedTemplate);
      this.moduleToTemplatesMap.set(updates.module, moduleTemplates);
    }

    // 如果实体类型变更，更新实体类型映射
    if (updates.businessEntityType && updates.businessEntityType !== template.businessEntityType) {
      // 从旧实体类型中移除
      let entityTemplates = this.entityToTemplateMap.get(template.businessEntityType) || [];
      entityTemplates = entityTemplates.filter(t => t.id !== id);
      this.entityToTemplateMap.set(template.businessEntityType, entityTemplates);

      // 添加到新实体类型
      entityTemplates = this.entityToTemplateMap.get(updates.businessEntityType) || [];
      entityTemplates.push(updatedTemplate);
      this.entityToTemplateMap.set(updates.businessEntityType, entityTemplates);
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

    // 从模块映射中移除
    let moduleTemplates = this.moduleToTemplatesMap.get(template.module) || [];
    moduleTemplates = moduleTemplates.filter(t => t.id !== id);
    this.moduleToTemplatesMap.set(template.module, moduleTemplates);

    // 从实体类型映射中移除
    let entityTemplates = this.entityToTemplateMap.get(template.businessEntityType) || [];
    entityTemplates = entityTemplates.filter(t => t.id !== id);
    this.entityToTemplateMap.set(template.businessEntityType, entityTemplates);

    return true;
  }

  /**
   * 激活表单模板
   */
  activateTemplate(id: string): UnifiedFormTemplate | undefined {
    return this.updateTemplate(id, { status: 'active' });
  }

  /**
   * 归档表单模板
   */
  archiveTemplate(id: string): UnifiedFormTemplate | undefined {
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
        if ((field.type === 'text' || field.type === 'textarea') && typeof value === 'string') {
          if (field.minLength && value.length < field.minLength) {
            errors.push({
              field: field.name,
              message: `${field.label}长度不能小于${field.minLength}个字符`
            });
          }
          if (field.maxLength && value.length > field.maxLength) {
            errors.push({
              field: field.name,
              message: `${field.label}长度不能大于${field.maxLength}个字符`
            });
          }
        }

        // 数值范围验证
        if (field.type === 'number' && typeof value === 'number') {
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
        if (field.pattern && typeof value === 'string') {
          const regex = new RegExp(field.pattern);
          if (!regex.test(value)) {
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
  private validateType(value: any, type: FormFieldType): boolean {
    switch (type) {
      case 'text':
      case 'textarea':
      case 'user':
      case 'lookup':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'date':
        const dateValue = new Date(value);
        return !isNaN(dateValue.getTime());
      case 'boolean':
        return typeof value === 'boolean';
      case 'select':
        return true; // 选择值的验证在其他地方处理
      default:
        return true;
    }
  }

  /**
   * 检查字段是否可见
   */
  private isFieldVisible(field: UnifiedFormField, data: Record<string, any>): boolean {
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

  /**
   * 处理业务数据联动
   */
  async handleBusinessLink(templateId: string, data: Record<string, any>): Promise<FormBusinessLinkResult> {
    const template = this.templates.get(templateId);
    if (!template) {
      return {
        success: false,
        data,
        messages: ['表单模板不存在']
      };
    }

    const messages: string[] = [];
    const linkedData = { ...data };

    // 处理字段联动
    for (const field of template.fields) {
      if (field.businessConfig && field.businessConfig.autoFill) {
        // 实现与业务数据的联动逻辑
        if (field.businessConfig.module && field.businessConfig.entityType) {
          switch (field.businessConfig.module) {
            case 'project':
              if (field.name === 'project_id' && linkedData[field.name]) {
                // 根据项目ID自动填充项目信息
                messages.push(`根据项目ID ${linkedData[field.name]} 填充项目信息`);
                // 实际项目中，这里应该调用ProjectService获取项目信息
                // 例如：const project = await projectService.getById(linkedData[field.name]);
                // 然后填充相关字段：linkedData.project_name = project.name;
              }
              break;
              
            case 'equipment':
              if (field.name === 'equipment_id' && linkedData[field.name]) {
                // 根据设备ID自动填充设备信息
                messages.push(`根据设备ID ${linkedData[field.name]} 填充设备信息`);
                // 实际项目中，这里应该调用EquipmentService获取设备信息
              }
              break;
              
            case 'personnel':
              if (field.name === 'assignee_id' && linkedData[field.name]) {
                // 根据人员ID自动填充人员信息
                messages.push(`根据人员ID ${linkedData[field.name]} 填充人员信息`);
                // 实际项目中，这里应该调用PersonnelService获取人员信息
              }
              break;
              
            case 'customer':
              if (field.name === 'supplier' && linkedData[field.name]) {
                // 根据供应商ID自动填充供应商信息
                messages.push(`根据供应商ID ${linkedData[field.name]} 填充供应商信息`);
                // 实际项目中，这里应该调用CustomerService获取供应商信息
              }
              break;
              
            case 'warehouse':
              if (field.name === 'location' && linkedData[field.name]) {
                // 根据仓库ID自动填充仓库信息
                messages.push(`根据仓库ID ${linkedData[field.name]} 填充仓库信息`);
                // 实际项目中，这里应该调用WarehouseService获取仓库信息
              }
              break;
          }
        }
      }
    }

    // 处理跨字段联动
    if (linkedData.project_id) {
      // 当选择项目时，自动填充项目负责人
      messages.push(`根据项目ID ${linkedData.project_id} 填充项目负责人`);
      // 实际项目中，这里应该调用ProjectService获取项目负责人信息
    }

    if (linkedData.equipment_id) {
      // 当选择设备时，自动填充设备当前状态和位置
      messages.push(`根据设备ID ${linkedData.equipment_id} 填充设备状态和位置`);
      // 实际项目中，这里应该调用EquipmentService获取设备信息
    }

    return {
      success: true,
      data: linkedData,
      messages
    };
  }

  /**
   * 获取业务模块的表单模板建议
   */
  getFormTemplateSuggestions(module: BusinessModule, context?: Record<string, any>): UnifiedFormTemplate[] {
    const moduleTemplates = this.moduleToTemplatesMap.get(module) || [];
    return moduleTemplates.filter(template => template.status === 'active');
  }
}

// 导出单例
export const unifiedFormService = new UnifiedFormService();
