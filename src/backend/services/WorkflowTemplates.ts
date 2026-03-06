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
        },
        actions: {
          allowed: ['approve', 'reject', 'return', 'transfer', 'delegate', 'saveDraft'],
          defaultAction: 'approve'
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
              expression: '${formData.budget != null && formData.budget > 100000}',
              targetNode: 'gm'
            }
          ],
          defaultFlow: 'end-approved'
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
        },
        actions: {
          allowed: ['approve', 'reject', 'return', 'transfer', 'delegate', 'saveDraft'],
          defaultAction: 'approve'
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
    // ========== 基本信息 ==========
    {
      name: 'name',
      label: '项目名称',
      type: 'text',
      required: true,
      placeholder: '请输入项目名称',
      group: '基本信息',
      visibleOn: ['start', 'dept-manager', 'gm'],
      editableOn: ['start']
    },
    {
      name: 'code',
      label: '项目编号',
      type: 'text',
      required: false,
      placeholder: '系统自动生成',
      disabled: true,
      group: '基本信息',
      visibleOn: ['start', 'dept-manager', 'gm'],
      editableOn: []
    },
    {
      name: 'manager_id',
      label: '项目经理',
      type: 'user',
      required: true,
      placeholder: '请选择项目经理',
      group: '基本信息',
      visibleOn: ['start', 'dept-manager', 'gm'],
      editableOn: ['start'],
      display: {
        type: 'user',
        format: 'name'
      }
    },
    {
      name: 'start_date',
      label: '项目开始日期',
      type: 'date',
      required: true,
      group: '基本信息',
      visibleOn: ['start', 'dept-manager', 'gm'],
      editableOn: ['start']
    },
    {
      name: 'end_date',
      label: '项目结束日期',
      type: 'date',
      required: false,
      group: '基本信息',
      visibleOn: ['start', 'dept-manager', 'gm'],
      editableOn: ['start']
    },
    {
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
      ],
      group: '基本信息',
      visibleOn: ['start', 'dept-manager', 'gm'],
      editableOn: ['start']
    },
    {
      name: 'address',
      label: '项目地址',
      type: 'text',
      required: false,
      placeholder: '请输入项目地址',
      group: '基本信息',
      visibleOn: ['start', 'dept-manager', 'gm'],
      editableOn: ['start']
    },
    {
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
      ],
      group: '基本信息',
      visibleOn: ['start', 'dept-manager', 'gm'],
      editableOn: ['start']
    },
    // ========== 项目规模 ==========
    {
      name: 'description',
      label: '项目描述',
      type: 'textarea',
      required: false,
      placeholder: '请输入项目描述信息',
      rows: 3,
      group: '项目规模',
      visibleOn: ['start', 'dept-manager', 'gm'],
      editableOn: ['start']
    },
    {
      name: 'building_area',
      label: '建筑面积(m²)',
      type: 'number',
      required: false,
      min: 0,
      group: '项目规模',
      visibleOn: ['start', 'dept-manager', 'gm'],
      editableOn: ['start']
    },
    {
      name: 'it_capacity',
      label: 'IT容量(MW)',
      type: 'number',
      required: false,
      min: 0,
      group: '项目规模',
      visibleOn: ['start', 'dept-manager', 'gm'],
      editableOn: ['start']
    },
    {
      name: 'cabinet_count',
      label: '机柜数量',
      type: 'number',
      required: false,
      min: 0,
      group: '项目规模',
      visibleOn: ['start', 'dept-manager', 'gm'],
      editableOn: ['start']
    },
    {
      name: 'cabinet_power',
      label: '单机柜功率(KW)',
      type: 'number',
      required: false,
      min: 0,
      group: '项目规模',
      visibleOn: ['start', 'dept-manager', 'gm'],
      editableOn: ['start']
    },
    // ========== 技术架构 ==========
    {
      name: 'power_architecture',
      label: '供电架构',
      type: 'textarea',
      required: false,
      placeholder: '供电系统架构描述',
      rows: 2,
      group: '技术架构',
      visibleOn: ['start', 'dept-manager', 'gm'],
      editableOn: ['start']
    },
    {
      name: 'hvac_architecture',
      label: '暖通架构',
      type: 'textarea',
      required: false,
      placeholder: '暖通系统架构描述',
      rows: 2,
      group: '技术架构',
      visibleOn: ['start', 'dept-manager', 'gm'],
      editableOn: ['start']
    },
    {
      name: 'fire_architecture',
      label: '消防架构',
      type: 'textarea',
      required: false,
      placeholder: '消防系统架构描述',
      rows: 2,
      group: '技术架构',
      visibleOn: ['start', 'dept-manager', 'gm'],
      editableOn: ['start']
    },
    {
      name: 'weak_electric_architecture',
      label: '弱电架构',
      type: 'textarea',
      required: false,
      placeholder: '弱电系统架构描述',
      rows: 2,
      group: '技术架构',
      visibleOn: ['start', 'dept-manager', 'gm'],
      editableOn: ['start']
    },
    // ========== 商务信息 ==========
    {
      name: 'customer_id',
      label: '客户',
      type: 'lookup',
      required: false,
      placeholder: '请选择客户',
      businessConfig: {
        entityType: 'Customer',
        lookupField: 'id',
        displayField: 'name'
      },
      group: '商务信息',
      visibleOn: ['start', 'dept-manager', 'gm'],
      editableOn: ['start'],
      display: {
        type: 'lookup',
        format: 'name'
      }
    },
    {
      name: 'budget',
      label: '预算金额(万元)',
      type: 'number',
      required: false,
      placeholder: '请输入预算金额',
      min: 0,
      group: '商务信息',
      visibleOn: ['start', 'dept-manager', 'gm'],
      editableOn: ['start']
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
  description: '设备调拨审批流程',
  version: '2.0.0',
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
        id: 'from-location-manager',
        type: 'userTask',
        name: '调出位置负责人审批',
        config: {
          approvalConfig: {
            approvalType: 'single',
            approverSource: {
              type: 'expression',
              value: '${formData.fromManagerId}'
            }
          },
          formKey: 'equipment-transfer-shipping-form'
        },
        actions: {
          allowed: ['approve', 'reject', 'return', 'transfer', 'delegate', 'saveDraft'],
          defaultAction: 'approve'
        }
      },
      {
        id: 'to-location-manager',
        type: 'userTask',
        name: '调入位置负责人审批',
        config: {
          approvalConfig: {
            approvalType: 'single',
            approverSource: {
              type: 'expression',
              value: '${formData.toManagerId}'
            },
            allowReject: false,
            allowReturn: true,
            returnTarget: 'from-location-manager'
          },
          formKey: 'equipment-transfer-receiving-form'
        },
        actions: {
          allowed: ['approve', 'return', 'transfer', 'delegate', 'saveDraft'],
          defaultAction: 'approve'
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
        target: 'from-location-manager',
        type: 'sequenceFlow'
      },
      {
        id: 'edge-2',
        source: 'from-location-manager',
        target: 'to-location-manager',
        type: 'sequenceFlow'
      },
      {
        id: 'edge-3',
        source: 'to-location-manager',
        target: 'end-approved',
        type: 'sequenceFlow'
      }
    ]
  },
  formSchema: [
    {
      name: 'fromLocationType',
      label: '调出位置类型',
      type: 'select',
      required: true,
      placeholder: '请选择调出位置类型',
      visibleOn: ['start', 'from-location-manager', 'to-location-manager'],
      editableOn: ['start']
    },
    {
      name: 'fromLocationId',
      label: '调出位置',
      type: 'select',
      required: true,
      placeholder: '请选择调出位置',
      visibleOn: ['start', 'from-location-manager', 'to-location-manager'],
      editableOn: ['start']
    },
    {
      name: 'fromManagerId',
      label: '调出位置负责人',
      type: 'user',
      required: true,
      placeholder: '请选择调出位置负责人',
      visibleOn: ['start', 'from-location-manager', 'to-location-manager'],
      editableOn: ['start'],
      display: {
        type: 'user',
        format: 'name'
      }
    },
    {
      name: 'toLocationType',
      label: '调入位置类型',
      type: 'select',
      required: true,
      placeholder: '请选择调入位置类型',
      visibleOn: ['start', 'from-location-manager', 'to-location-manager'],
      editableOn: ['start']
    },
    {
      name: 'toLocationId',
      label: '调入位置',
      type: 'select',
      required: true,
      placeholder: '请选择调入位置',
      visibleOn: ['start', 'from-location-manager', 'to-location-manager'],
      editableOn: ['start']
    },
    {
      name: 'toManagerId',
      label: '调入位置负责人',
      type: 'user',
      required: true,
      placeholder: '请选择调入位置负责人',
      visibleOn: ['start', 'from-location-manager', 'to-location-manager'],
      editableOn: ['start'],
      display: {
        type: 'user',
        format: 'name'
      }
    },
    {
      name: 'transferReason',
      label: '调拨原因',
      type: 'textarea',
      required: true,
      placeholder: '请输入调拨原因',
      rows: 3,
      visibleOn: ['start', 'from-location-manager', 'to-location-manager'],
      editableOn: ['start']
    },
    {
      name: 'estimatedArrivalDate',
      label: '期望到达时间',
      type: 'date',
      required: true,
      placeholder: '请选择期望到达时间',
      visibleOn: ['start', 'from-location-manager', 'to-location-manager'],
      editableOn: ['start']
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
                targetNode: 'gm'
              },
              {
                id: 'condition-2',
                name: '金额小于等于5万',
                expression: '${formData.amount <= 50000}',
                targetNode: 'finance'
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
 * 设备入库流程模板
 */
export const EQUIPMENT_INBOUND_TEMPLATE: WorkflowTemplate = {
  id: 'equipment-inbound',
  name: '设备入库流程',
  category: 'equipment',
  entityType: 'EquipmentInbound',
  description: '设备入库审批流程',
  version: '1.0.0',
  definition: {
    nodes: [
      {
        id: 'start',
        type: 'startEvent',
        name: '提交入库申请',
        config: {
          formKey: 'equipment-inbound-form'
        }
      },
      {
        id: 'warehouse-manager',
        type: 'userTask',
        name: '仓库管理员审批',
        config: {
          approvalConfig: {
            approvalType: 'single',
            approverSource: {
              type: 'warehouse_manager'
            }
          }
        },
        actions: {
          allowed: ['approve', 'reject', 'return', 'transfer', 'delegate', 'saveDraft'],
          defaultAction: 'approve'
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
        target: 'warehouse-manager',
        type: 'sequenceFlow'
      },
      {
        id: 'edge-2',
        source: 'warehouse-manager',
        target: 'end-approved',
        type: 'sequenceFlow'
      }
    ]
  },
  formSchema: [
    {
      name: 'order_no',
      label: '入库单号',
      type: 'text',
      required: false,
      placeholder: '系统自动生成',
      disabled: true,
      readonly: true,
      visibleOn: ['start', 'warehouse-manager'],
      editableOn: []
    },
    {
      name: 'warehouse_id',
      label: '仓库',
      type: 'select',
      required: true,
      placeholder: '请选择仓库',
      dynamicOptions: 'warehouse',
      dynamicOptionsConfig: {
        source: '/api/warehouses',
        labelField: 'name',
        valueField: 'id'
      },
      visibleOn: ['start', 'warehouse-manager'],
      editableOn: ['start'],
      display: {
        type: 'select',
        format: 'label'
      }
    },
    {
      name: 'warehouse_manager_id',
      label: '仓库管理员',
      type: 'user',
      required: false,
      placeholder: '系统自动获取',
      disabled: true,
      readonly: true,
      visibleOn: ['start', 'warehouse-manager', 'equipment-manager'],
      editableOn: [],
      display: {
        type: 'user',
        format: 'name'
      }
    },
    {
      name: 'supplier',
      label: '供应商',
      type: 'text',
      required: false,
      placeholder: '请输入供应商名称',
      visibleOn: ['start', 'warehouse-manager'],
      editableOn: ['start']
    },
    {
      name: 'purchase_date',
      label: '采购日期',
      type: 'date',
      required: false,
      visibleOn: ['start', 'warehouse-manager'],
      editableOn: ['start']
    },
    {
      name: 'total_price',
      label: '总金额',
      type: 'number',
      required: false,
      placeholder: '请输入总金额',
      visibleOn: ['start', 'warehouse-manager'],
      editableOn: ['start']
    },
    {
      name: 'items',
      label: '设备明细',
      type: 'array',
      required: true,
      visibleOn: ['start', 'warehouse-manager'],
      editableOn: ['start'],
      arrayConfig: {
        fields: [
          {
            name: 'category',
            label: '设备类别',
            type: 'select',
            required: true,
            placeholder: '请选择设备类别',
            options: [
              { label: '仪器类', value: 'instrument' },
              { label: '假负载类', value: 'fake_load' },
              { label: '线材类', value: 'cable' }
            ]
          },
          {
            name: 'equipment_name',
            label: '设备名称',
            type: 'select',
            required: true,
            placeholder: '请选择设备名称',
            dynamicOptions: 'equipment_names',
            dynamicOptionsConfig: {
              source: '/api/equipment/names',
              labelField: 'name',
              valueField: 'name',
              allowManualInput: true
            },
            dependsOn: ['category']
          },
          {
            name: 'model_no',
            label: '设备型号',
            type: 'select',
            required: true,
            placeholder: '请选择设备型号',
            dynamicOptions: 'equipment_models',
            dynamicOptionsConfig: {
              source: '/api/equipment/models',
              labelField: 'model_no',
              valueField: 'model_no',
              allowManualInput: true,
              dependsOnField: 'equipment_name'
            },
            dependsOn: ['equipment_name', 'category']
          },
          {
            name: 'unit',
            label: '单位',
            type: 'select',
            required: false,
            placeholder: '请选择单位',
            defaultValue: '台',
            options: [
              { label: '台', value: '台' },
              { label: '米', value: '米' },
              { label: '套', value: '套' },
              { label: '个', value: '个' },
              { label: '件', value: '件' },
              { label: '根', value: '根' },
              { label: '卷', value: '卷' },
              { label: '箱', value: '箱' },
              { label: '包', value: '包' },
              { label: '组', value: '组' }
            ]
          },
          {
            name: 'quantity',
            label: '数量',
            type: 'number',
            required: true,
            placeholder: '请输入数量',
            defaultValue: 1
          },
          {
            name: 'purchase_price',
            label: '采购单价',
            type: 'number',
            required: false,
            placeholder: '请输入单价'
          },
          {
            name: 'total_price',
            label: '总价',
            type: 'number',
            required: false,
            placeholder: '请输入总价',
            readonly: true
          },
          {
            name: 'serial_numbers',
            label: '序列号',
            type: 'text',
            required: false,
            placeholder: '请输入序列号'
          },
          {
            name: 'manufacturer',
            label: '生产厂家',
            type: 'text',
            required: false,
            placeholder: '请输入生产厂家'
          },
          {
            name: 'technical_params',
            label: '技术参数',
            type: 'textarea',
            required: false,
            placeholder: '请输入技术参数',
            rows: 2
          },
          {
            name: 'certificate_no',
            label: '校准证书编号',
            type: 'text',
            required: false,
            placeholder: '请输入证书编号'
          },
          {
            name: 'certificate_issuer',
            label: '发证单位',
            type: 'text',
            required: false,
            placeholder: '请输入发证单位'
          },
          {
            name: 'certificate_expiry_date',
            label: '校准证书到期时间',
            type: 'date',
            required: false,
            placeholder: '请输入证书到期时间'
          },
          {
            name: 'accessory_desc',
            label: '配件情况',
            type: 'text',
            required: false,
            placeholder: '请输入配件描述'
          },
          {
            name: 'item_notes',
            label: '备注',
            type: 'textarea',
            required: false,
            placeholder: '请输入备注',
            rows: 2
          },
          {
            name: 'main_images',
            label: '主机图片',
            type: 'images',
            required: false,
            placeholder: '请上传主机图片',
            accept: 'image/*'
          },
          {
            name: 'accessory_images',
            label: '配件图片',
            type: 'images',
            required: false,
            placeholder: '请上传配件图片',
            accept: 'image/*'
          },
          {
            name: 'attachments',
            label: '附件信息',
            type: 'files',
            required: false,
            placeholder: '请上传附件'
          },
          {
            name: 'accessory_list',
            label: '配件清单',
            type: 'array',
            required: false,
            placeholder: '请添加配件清单',
            showCondition: {
              field: 'category',
              value: 'instrument'
            },
            arrayConfig: {
              fields: [
                {
                  name: 'accessory_name',
                  label: '配件名称',
                  type: 'text',
                  required: true,
                  placeholder: '请输入配件名称'
                },
                {
                  name: 'accessory_model',
                  label: '规格型号',
                  type: 'text',
                  required: false,
                  placeholder: '请输入规格型号'
                },
                {
                  name: 'accessory_quantity',
                  label: '数量',
                  type: 'number',
                  required: true,
                  placeholder: '请输入数量',
                  defaultValue: 1
                },
                {
                  name: 'accessory_unit',
                  label: '单位',
                  type: 'select',
                  required: false,
                  placeholder: '请选择单位',
                  defaultValue: 'piece',
                  options: [
                    { label: '个', value: 'piece' },
                    { label: '套', value: 'set' },
                    { label: '件', value: 'item' },
                    { label: '台', value: 'unit' },
                    { label: '把', value: 'handle' },
                    { label: '根', value: 'root' },
                    { label: '块', value: 'block' },
                    { label: '张', value: 'sheet' },
                    { label: '条', value: 'strip' },
                    { label: '支', value: 'branch' }
                  ]
                }
              ]
            }
          }
        ]
      }
    },
    {
      name: 'notes',
      label: '备注',
      type: 'textarea',
      required: false,
      placeholder: '请输入备注信息',
      rows: 2,
      visibleOn: ['start', 'warehouse-manager'],
      editableOn: ['start']
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
        },
        actions: {
          allowed: ['approve', 'reject', 'return', 'transfer', 'delegate', 'saveDraft'],
          defaultAction: 'approve'
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
              type: 'expression',
              value: '${formData.department_id}'
            },
            skipCondition: 'no_department_manager'
          }
        },
        actions: {
          allowed: ['approve', 'reject', 'return', 'transfer', 'delegate', 'saveDraft'],
          defaultAction: 'approve'
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
              value: 'admin'
            }
          }
        },
        actions: {
          allowed: ['approve', 'reject', 'return', 'transfer', 'delegate', 'saveDraft'],
          defaultAction: 'approve'
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
              gender: '${formData.gender}',
              employee_no: '${formData.employee_id}',
              department_id: '${formData.department_id}',
              position: '${formData.position_id}',
              phone: '${formData.phone}',
              email: '${formData.email}',
              hire_date: '${formData.start_date}',
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
      name: 'employee_id',
      label: '员工编号',
      type: 'text',
      required: false,
      placeholder: '系统自动生成',
      disabled: true,
      readonly: true,
      visibleOn: ['start', 'hr-manager', 'department-manager', 'gm'],
      editableOn: []
    },
    {
      name: 'employee_name',
      label: '姓名',
      type: 'text',
      required: true,
      placeholder: '请输入姓名',
      minLength: 2,
      maxLength: 50,
      visibleOn: ['start', 'hr-manager', 'department-manager', 'gm'],
      editableOn: ['start']
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
      ],
      visibleOn: ['start', 'hr-manager', 'department-manager', 'gm'],
      editableOn: ['start']
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
      },
      visibleOn: ['start', 'hr-manager', 'department-manager', 'gm'],
      editableOn: ['start']
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
      },
      visibleOn: ['start', 'hr-manager', 'department-manager', 'gm'],
      editableOn: ['start']
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
      },
      visibleOn: ['start', 'hr-manager', 'department-manager', 'gm'],
      editableOn: ['start']
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
      },
      visibleOn: ['start', 'hr-manager', 'department-manager', 'gm'],
      editableOn: ['start'],
      display: {
        type: 'select',
        format: 'label'
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
      },
      cascadeFrom: 'department_id',
      cascadeField: 'department_id',
      refEntity: 'positions',
      refLabel: 'name',
      refValue: 'id',
      visibleOn: ['start', 'hr-manager', 'department-manager', 'gm'],
      editableOn: ['start'],
      display: {
        type: 'select',
        format: 'label'
      }
    },
    {
      name: 'start_date',
      label: '入职日期',
      type: 'date',
      required: true,
      visibleOn: ['start', 'hr-manager', 'department-manager', 'gm'],
      editableOn: ['start']
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
      ],
      visibleOn: ['start', 'hr-manager', 'department-manager', 'gm'],
      editableOn: ['start']
    },
    {
      name: 'notes',
      label: '备注',
      type: 'textarea',
      required: false,
      placeholder: '请输入备注信息',
      rows: 2,
      visibleOn: ['start', 'hr-manager', 'department-manager', 'gm'],
      editableOn: ['start']
    }
  ]
};

/**
 * 设备维修流程模板
 */
export const EQUIPMENT_REPAIR_TEMPLATE: WorkflowTemplate = {
  id: 'equipment-repair',
  name: '设备维修流程',
  category: 'equipment',
  entityType: 'EquipmentRepair',
  description: '设备维修审批流程',
  version: '1.0.0',
  definition: {
    nodes: [
      {
        id: 'start',
        type: 'startEvent',
        name: '提交维修申请',
        config: {
          formKey: 'equipment-repair-form'
        }
      },
      {
        id: 'location-manager',
        type: 'userTask',
        name: '位置管理员审批',
        config: {
          approvalConfig: {
            approvalType: 'single',
            approverSource: {
              type: 'expression',
              value: '${formData.location_manager_id}'
            }
          }
        },
        actions: {
          allowed: ['approve', 'reject', 'return', 'transfer', 'delegate', 'saveDraft'],
          defaultAction: 'approve'
        }
      },
      {
        id: 'shipping',
        type: 'userTask',
        name: '发货',
        config: {
          approvalConfig: {
            approvalType: 'single',
            approverSource: {
              type: 'expression',
              value: '${formData.location_manager_id}'
            }
          },
          formKey: 'equipment-repair-shipping-form'
        },
        actions: {
          allowed: ['approve', 'saveDraft'],
          defaultAction: 'approve'
        }
      },
      {
        id: 'receiving',
        type: 'userTask',
        name: '确认接收',
        config: {
          approvalConfig: {
            approvalType: 'single',
            approverSource: {
              type: 'expression',
              value: '${formData.location_manager_id}'
            }
          },
          formKey: 'equipment-repair-receiving-form'
        },
        actions: {
          allowed: ['approve', 'saveDraft'],
          defaultAction: 'approve'
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
        target: 'location-manager',
        type: 'sequenceFlow'
      },
      {
        id: 'edge-2',
        source: 'location-manager',
        target: 'shipping',
        type: 'sequenceFlow'
      },
      {
        id: 'edge-3',
        source: 'shipping',
        target: 'receiving',
        type: 'sequenceFlow'
      },
      {
        id: 'edge-4',
        source: 'receiving',
        target: 'end-approved',
        type: 'sequenceFlow'
      }
    ]
  },
  formSchema: [
    {
      name: 'equipmentData',
      label: '设备数据',
      type: 'array',
      required: true,
      visibleOn: ['start', 'location-manager', 'shipping', 'receiving'],
      editableOn: ['start'],
      arrayFields: [
        {
          name: 'equipmentId',
          label: '设备ID',
          type: 'text',
          required: true
        },
        {
          name: 'equipmentName',
          label: '设备名称',
          type: 'text',
          required: true
        },
        {
          name: 'equipmentCategory',
          label: '设备类别',
          type: 'select',
          required: true,
          options: [
            { label: '仪器类', value: 'instrument' },
            { label: '假负载类', value: 'fake_load' },
            { label: '线材类', value: 'cable' }
          ]
        },
        {
          name: 'repairQuantity',
          label: '维修数量',
          type: 'number',
          required: true,
          min: 1
        }
      ]
    },
    {
      name: 'originalLocationType',
      label: '原始位置类型',
      type: 'select',
      required: true,
      options: [
        { label: '仓库', value: 'warehouse' },
        { label: '项目', value: 'project' }
      ],
      visibleOn: ['start', 'location-manager', 'shipping', 'receiving'],
      editableOn: ['start']
    },
    {
      name: 'originalLocationId',
      label: '原始位置ID',
      type: 'text',
      required: true,
      visibleOn: ['start', 'location-manager', 'shipping', 'receiving'],
      editableOn: ['start']
    },
    {
      name: 'locationManagerId',
      label: '位置管理员',
      type: 'user',
      required: true,
      visibleOn: ['start', 'location-manager', 'shipping', 'receiving'],
      editableOn: ['start'],
      display: {
        type: 'user',
        format: 'name'
      }
    },
    {
      name: 'faultDescription',
      label: '故障描述',
      type: 'textarea',
      required: true,
      placeholder: '请输入故障描述',
      rows: 3,
      visibleOn: ['start', 'location-manager', 'shipping', 'receiving'],
      editableOn: ['start']
    },
    {
      name: 'repairServiceProvider',
      label: '维修服务商',
      type: 'text',
      required: false,
      placeholder: '请输入维修服务商',
      visibleOn: ['start', 'location-manager', 'shipping', 'receiving'],
      editableOn: ['start']
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
    EQUIPMENT_INBOUND_TEMPLATE,
    EQUIPMENT_REPAIR_TEMPLATE,
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
