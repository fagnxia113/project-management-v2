/**
 * 流程模板服务
 * 提供硬编码的流程模板，支持不同业务场景的流程定义
 * 包含完整的节点定义、审批规则和表单配置
 */

import { WorkflowNode, WorkflowEdge, WorkflowDefinition } from '../types/workflow';

interface WorkflowTemplate {
  id: string;
  name: string;
  category: string;
  entityType: string;
  description: string;
  definition: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
  formSchema: any[];
  version: string;
}

/**
 * 项目审批流程模板
 */
export const PROJECT_APPROVAL_TEMPLATE: WorkflowTemplate = {
  id: 'project-approval',
  name: '项目审批流程',
  category: 'project',
  entityType: 'Project',
  description: '项目立项、变更、结项审批流程',
  version: '1.0.0',
  definition: {
    nodes: [
      {
        id: 'start',
        type: 'startEvent',
        name: '提交申请'
      },
      {
        id: 'dept-manager',
        type: 'userTask',
        name: '部门经理审批',
        approvalConfig: {
          approvalType: 'single',
          approverSource: {
            type: 'role',
            value: 'department_manager'
          }
        }
      },
      {
        id: 'gateway-1',
        type: 'exclusiveGateway',
        name: '审批判断',
        gatewayConfig: {
          conditions: [
            {
              id: 'condition-1',
              name: '预算大于10万',
              expression: '${formData.budget > 100000}',
              targetNode: 'gm'
            },
            {
              id: 'condition-2',
              name: '预算小于等于10万',
              expression: '${formData.budget <= 100000}',
              targetNode: 'end-approved'
            }
          ]
        }
      },
      {
        id: 'gm',
        type: 'userTask',
        name: '总经理审批',
        approvalConfig: {
          approvalType: 'single',
          approverSource: {
            type: 'role',
            value: 'general_manager'
          }
        }
      },
      {
        id: 'end-approved',
        type: 'endEvent',
        name: '审批通过'
      },
      {
        id: 'end-rejected',
        type: 'endEvent',
        name: '审批驳回'
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'start',
        target: 'dept-manager',
        type: 'sequenceFlow'
      },
      {
        id: 'edge-2',
        source: 'dept-manager',
        target: 'gateway-1',
        type: 'sequenceFlow'
      },
      {
        id: 'edge-3',
        source: 'gateway-1',
        target: 'gm',
        type: 'sequenceFlow',
        condition: '${formData.budget > 100000}'
      },
      {
        id: 'edge-4',
        source: 'gateway-1',
        target: 'end-approved',
        type: 'sequenceFlow',
        condition: '${formData.budget <= 100000}'
      },
      {
        id: 'edge-5',
        source: 'gm',
        target: 'end-approved',
        type: 'sequenceFlow'
      }
    ]
  },
  formSchema: [
    {
      name: 'code',
      label: '项目编号',
      type: 'text',
      required: false,
      placeholder: '系统自动生成',
      disabled: true
    },
    {
      name: 'name',
      label: '项目名称',
      type: 'text',
      required: true,
      placeholder: '请输入项目名称'
    },
    {
      name: 'type',
      label: '项目类型',
      type: 'select',
      required: true,
      options: [
        { label: '国内项目', value: 'domestic' },
        { label: '海外项目', value: 'foreign' },
        { label: '研发项目', value: 'rd' },
        { label: '服务项目', value: 'service' }
      ]
    },
    {
      name: 'manager_id',
      label: '项目经理',
      type: 'user',
      required: true,
      placeholder: '请选择项目经理'
    },
    {
      name: 'status',
      label: '项目状态',
      type: 'select',
      required: true,
      options: [
        { label: '提案中', value: 'proposal' },
        { label: '进行中', value: 'in_progress' },
        { label: '已完成', value: 'completed' },
        { label: '已暂停', value: 'paused' },
        { label: '已延期', value: 'delayed' }
      ]
    },
    {
      name: 'start_date',
      label: '开始日期',
      type: 'date',
      required: true
    },
    {
      name: 'end_date',
      label: '预计结束日期',
      type: 'date',
      required: false
    },
    {
      name: 'budget',
      label: '项目预算(元)',
      type: 'number',
      required: false,
      placeholder: '请输入项目预算',
      min: 0
    },
    {
      name: 'customer_id',
      label: '客户',
      type: 'lookup',
      required: false,
      placeholder: '请选择客户'
    },
    {
      name: 'department_id',
      label: '所属部门',
      type: 'lookup',
      required: false,
      placeholder: '请选择所属部门'
    },
    {
      name: 'description',
      label: '项目描述',
      type: 'textarea',
      required: false,
      placeholder: '请输入项目描述',
      rows: 4
    }
  ]
};

/**
 * 设备调拨流程模板
 */
export const EQUIPMENT_TRANSFER_TEMPLATE: WorkflowTemplate = {
  id: 'equipment-transfer',
  name: '设备调拨流程',
  category: 'equipment',
  entityType: 'EquipmentTransfer',
  description: '设备跨项目调拨审批流程',
  version: '1.0.0',
  definition: {
    nodes: [
      {
        id: 'start',
        type: 'startEvent',
        name: '提交调拨申请',
        config: {
          formKey: 'equipment-transfer-form'
        }
      },
      {
        id: 'current-project-manager',
        type: 'userTask',
        name: '当前项目负责人审批',
        config: {
          approvalConfig: {
            approvalType: 'single',
            approverSource: {
              type: 'expression',
              value: '${formData.currentProjectManager}'
            }
          }
        }
      },
      {
        id: 'target-project-manager',
        type: 'userTask',
        name: '目标项目负责人审批',
        config: {
          approvalConfig: {
            approvalType: 'single',
            approverSource: {
              type: 'expression',
              value: '${formData.targetProjectManager}'
            }
          }
        }
      },
      {
        id: 'equipment-manager',
        type: 'userTask',
        name: '设备管理员审批',
        config: {
          approvalConfig: {
            approvalType: 'single',
            approverSource: {
              type: 'role',
              value: 'equipment_manager'
            }
          }
        }
      },
      {
        id: 'end-approved',
        type: 'endEvent',
        name: '审批通过'
      },
      {
        id: 'end-rejected',
        type: 'endEvent',
        name: '审批驳回'
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'start',
        target: 'current-project-manager',
        type: 'sequenceFlow'
      },
      {
        id: 'edge-2',
        source: 'current-project-manager',
        target: 'target-project-manager',
        type: 'sequenceFlow'
      },
      {
        id: 'edge-3',
        source: 'target-project-manager',
        target: 'equipment-manager',
        type: 'sequenceFlow'
      },
      {
        id: 'edge-4',
        source: 'equipment-manager',
        target: 'end-approved',
        type: 'sequenceFlow'
      }
    ]
  },
  formSchema: [
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
      name: 'current_project_manager',
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
      name: 'target_project_manager',
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
      rows: 3
    }
  ]
};

/**
 * 任务审批流程模板
 */
export const TASK_APPROVAL_TEMPLATE: WorkflowTemplate = {
  id: 'task-approval',
  name: '任务审批流程',
  category: 'task',
  entityType: 'Task',
  description: '任务创建、完成、取消审批流程',
  version: '1.0.0',
  definition: {
    nodes: [
      {
        id: 'start',
        type: 'startEvent',
        name: '提交申请',
        config: {
          formKey: 'task-approval-form'
        }
      },
      {
        id: 'project-manager',
        type: 'userTask',
        name: '项目经理审批',
        config: {
          approvalConfig: {
            approvalType: 'single',
            approverSource: {
              type: 'expression',
              value: '${formData.projectManager}'
            }
          }
        }
      },
      {
        id: 'end-approved',
        type: 'endEvent',
        name: '审批通过'
      },
      {
        id: 'end-rejected',
        type: 'endEvent',
        name: '审批驳回'
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'start',
        target: 'project-manager',
        type: 'sequenceFlow'
      },
      {
        id: 'edge-2',
        source: 'project-manager',
        target: 'end-approved',
        type: 'sequenceFlow'
      }
    ]
  },
  formSchema: [
    {
      name: 'task_name',
      label: '任务名称',
      type: 'text',
      required: true,
      placeholder: '请输入任务名称'
    },
    {
      name: 'project_id',
      label: '所属项目',
      type: 'select',
      required: true,
      placeholder: '请选择所属项目'
    },
    {
      name: 'project_manager',
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
      rows: 3
    }
  ]
};

/**
 * 采购审批流程模板
 */
export const PURCHASE_APPROVAL_TEMPLATE: WorkflowTemplate = {
  id: 'purchase-approval',
  name: '采购审批流程',
  category: 'purchase',
  entityType: 'Purchase',
  description: '采购申请审批流程',
  version: '1.0.0',
  definition: {
    nodes: [
      {
        id: 'start',
        type: 'startEvent',
        name: '提交采购申请',
        config: {
          formKey: 'purchase-approval-form'
        }
      },
      {
        id: 'dept-manager',
        type: 'userTask',
        name: '部门经理审批',
        config: {
          approvalConfig: {
            approvalType: 'single',
            approverSource: {
              type: 'role',
              value: 'department_manager'
            }
          }
        }
      },
      {
        id: 'gateway-1',
        type: 'exclusiveGateway',
        name: '金额判断',
        config: {
          gatewayConfig: {
            conditions: [
              {
                id: 'condition-1',
                name: '金额大于5万',
                expression: '${formData.amount > 50000}',
                target: 'gm'
              },
              {
                id: 'condition-2',
                name: '金额小于等于5万',
                expression: '${formData.amount <= 50000}',
                target: 'finance'
              }
            ]
          }
        }
      },
      {
        id: 'gm',
        type: 'userTask',
        name: '总经理审批',
        config: {
          approvalConfig: {
            approvalType: 'single',
            approverSource: {
              type: 'role',
              value: 'general_manager'
            }
          }
        }
      },
      {
        id: 'finance',
        type: 'userTask',
        name: '财务审批',
        config: {
          approvalConfig: {
            approvalType: 'single',
            approverSource: {
              type: 'role',
              value: 'finance_manager'
            }
          }
        }
      },
      {
        id: 'end-approved',
        type: 'endEvent',
        name: '审批通过'
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'start',
        target: 'dept-manager',
        type: 'sequenceFlow'
      },
      {
        id: 'edge-2',
        source: 'dept-manager',
        target: 'gateway-1',
        type: 'sequenceFlow'
      },
      {
        id: 'edge-3',
        source: 'gateway-1',
        target: 'gm',
        type: 'sequenceFlow',
        condition: '${formData.amount > 50000}'
      },
      {
        id: 'edge-4',
        source: 'gateway-1',
        target: 'finance',
        type: 'sequenceFlow',
        condition: '${formData.amount <= 50000}'
      },
      {
        id: 'edge-5',
        source: 'gm',
        target: 'finance',
        type: 'sequenceFlow'
      },
      {
        id: 'edge-6',
        source: 'finance',
        target: 'end-approved',
        type: 'sequenceFlow'
      }
    ]
  },
  formSchema: [
    {
      name: 'purchase_name',
      label: '采购名称',
      type: 'text',
      required: true,
      placeholder: '请输入采购名称'
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
      rows: 3
    },
    {
      name: 'supplier',
      label: '供应商',
      type: 'text',
      required: true,
      placeholder: '请输入供应商名称'
    },
    {
      name: 'expected_delivery_date',
      label: '预计交付日期',
      type: 'date',
      required: true
    }
  ]
};

/**
 * 人员入职流程模板
 */
export const EMPLOYEE_ONBOARD_TEMPLATE: WorkflowTemplate = {
  id: 'employee-onboard',
  name: '人员入职流程',
  category: 'hr',
  entityType: 'Employee',
  description: '新员工入职审批流程',
  version: '1.0.0',
  definition: {
    nodes: [
      {
        id: 'start',
        type: 'startEvent',
        name: '提交入职申请',
        config: {
          formKey: 'employee-onboard-form'
        }
      },
      {
        id: 'hr-manager',
        type: 'userTask',
        name: 'HR经理审批',
        config: {
          approvalConfig: {
            approvalType: 'single',
            approverSource: {
              type: 'role',
              value: 'hr_manager'
            }
          }
        }
      },
      {
        id: 'department-manager',
        type: 'userTask',
        name: '部门经理审批',
        config: {
          approvalConfig: {
            approvalType: 'single',
            approverSource: {
              type: 'fixed',
              value: 'dept_manager'
            }
          }
        }
      },
      {
        id: 'gm',
        type: 'userTask',
        name: '总经理审批',
        config: {
          approvalConfig: {
            approvalType: 'single',
            approverSource: {
              type: 'fixed',
              value: 'admin'
            }
          }
        }
      },
      {
        id: 'create-employee',
        type: 'serviceTask',
        name: '创建员工记录',
        config: {
          serviceType: 'createEmployee',
          serviceConfig: {
            entityType: 'Employee',
            dataMapping: {
              name: '${formData.employee_name}',
              employee_no: '${formData.employee_id}',
              department_id: '${formData.department_id}',
              position_id: '${formData.position_id}',
              hire_date: '${formData.start_date}',
              employee_type: '${formData.employee_type}',
              status: 'active'
            }
          }
        }
      },
      {
        id: 'end-approved',
        type: 'endEvent',
        name: '审批通过'
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'start',
        target: 'hr-manager',
        type: 'sequenceFlow'
      },
      {
        id: 'edge-2',
        source: 'hr-manager',
        target: 'department-manager',
        type: 'sequenceFlow'
      },
      {
        id: 'edge-3',
        source: 'department-manager',
        target: 'gm',
        type: 'sequenceFlow'
      },
      {
        id: 'edge-4',
        source: 'gm',
        target: 'create-employee',
        type: 'sequenceFlow'
      },
      {
        id: 'edge-5',
        source: 'create-employee',
        target: 'end-approved',
        type: 'sequenceFlow'
      }
    ]
  },
  formSchema: [
    {
      name: 'employee_name',
      label: '员工姓名',
      type: 'text',
      required: true,
      placeholder: '请输入员工姓名'
    },
    {
      name: 'employee_id',
      label: '员工编号',
      type: 'text',
      required: true,
      placeholder: '请输入员工编号'
    },
    {
      name: 'department',
      label: '所属部门',
      type: 'select',
      required: true,
      placeholder: '请选择所属部门'
    },
    {
      name: 'department_manager',
      label: '部门经理',
      type: 'user',
      required: true,
      placeholder: '请选择部门经理'
    },
    {
      name: 'position',
      label: '职位',
      type: 'text',
      required: true,
      placeholder: '请输入职位'
    },
    {
      name: 'salary',
      label: '薪资(元)',
      type: 'number',
      required: true,
      placeholder: '请输入薪资',
      min: 0
    },
    {
      name: 'start_date',
      label: '入职日期',
      type: 'date',
      required: true
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
};

/**
 * 流程模板服务类
 */
export class WorkflowTemplatesService {
  private static templates: WorkflowTemplate[] = [
    PROJECT_APPROVAL_TEMPLATE,
    EQUIPMENT_TRANSFER_TEMPLATE,
    TASK_APPROVAL_TEMPLATE,
    PURCHASE_APPROVAL_TEMPLATE,
    EMPLOYEE_ONBOARD_TEMPLATE
  ];

  /**
   * 获取所有流程模板
   */
  static getAllTemplates(): WorkflowTemplate[] {
    return this.templates;
  }

  /**
   * 根据ID获取流程模板
   */
  static getTemplateById(id: string): WorkflowTemplate | undefined {
    return this.templates.find(template => template.id === id);
  }

  /**
   * 根据分类获取流程模板
   */
  static getTemplatesByCategory(category: string): WorkflowTemplate[] {
    return this.templates.filter(template => template.category === category);
  }

  /**
   * 根据实体类型获取流程模板
   */
  static getTemplatesByEntityType(entityType: string): WorkflowTemplate[] {
    return this.templates.filter(template => template.entityType === entityType);
  }

  /**
   * 创建流程定义
   */
  static createDefinitionFromTemplate(templateId: string, variables?: any): WorkflowDefinition {
    const template = this.getTemplateById(templateId);
    if (!template) {
      throw new Error(`Template with id ${templateId} not found`);
    }

    return {
      id: `def-${Date.now()}`,
      key: template.id,
      name: template.name,
      version: 1,
      category: template.category,
      entity_type: template.entityType,
      status: 'draft',
      node_config: {
        nodes: template.definition.nodes,
        edges: template.definition.edges
      },
      form_schema: template.formSchema,
      variables: variables || {},
      created_by: 'system',
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  /**
   * 获取模板的表单模式
   */
  static getFormSchemaByTemplateId(templateId: string): any[] {
    const template = this.getTemplateById(templateId);
    if (!template) {
      throw new Error(`Template with id ${templateId} not found`);
    }
    return template.formSchema;
  }
}

export default WorkflowTemplatesService;
