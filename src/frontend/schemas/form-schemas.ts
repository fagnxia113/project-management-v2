/**
 * Formily表单Schema配置
 * 支持字段权限控制、联动逻辑
 */

// 基础字段组件映射
export const baseFieldComponents = {
  Input: 'Input',
  Select: 'Select',
  DatePicker: 'DatePicker',
  NumberPicker: 'NumberPicker',
  TextArea: 'TextArea',
  Radio: 'Radio.Group',
  Checkbox: 'Checkbox.Group',
  Upload: 'Upload',
  Cascader: 'Cascader'
}

// 字段权限类型
export type FieldPermission = 'editable' | 'readonly' | 'hidden' | 'visible'

// 审批节点字段权限配置
export interface NodeFieldPermission {
  nodeId: string
  nodeName: string
  fields: Record<string, FieldPermission>
}

// 表单Schema配置
export interface FormSchemaConfig {
  type: string
  title: string
  schema: any
  nodePermissions?: NodeFieldPermission[]
}

// 入职申请表单Schema
export const personOnboardSchema: FormSchemaConfig = {
  type: 'person_onboard',
  title: '入职申请',
  schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: '姓名',
        'x-decorator': 'FormItem',
        'x-decorator-props': {
          required: true
        },
        'x-component': 'Input',
        'x-component-props': {
          placeholder: '请输入姓名'
        }
      },
      gender: {
        type: 'string',
        title: '性别',
        required: true,
        'x-decorator': 'FormItem',
        'x-component': 'Radio.Group',
        enum: [
          { label: '男', value: 'male' },
          { label: '女', value: 'female' }
        ]
      },
      phone: {
        type: 'string',
        title: '手机号',
        required: true,
        'x-decorator': 'FormItem',
        'x-component': 'Input',
        'x-component-props': {
          placeholder: '请输入手机号'
        },
        'x-rules': [
          { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }
        ]
      },
      email: {
        type: 'string',
        title: '邮箱',
        'x-decorator': 'FormItem',
        'x-component': 'Input',
        'x-component-props': {
          placeholder: '请输入邮箱'
        },
        'x-rules': [
          { type: 'email', message: '请输入正确的邮箱格式' }
        ]
      },
      department: {
        type: 'string',
        title: '部门',
        required: true,
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [
          { label: '技术部', value: 'tech' },
          { label: '产品部', value: 'product' },
          { label: '运营部', value: 'operation' },
          { label: '市场部', value: 'market' },
          { label: '财务部', value: 'finance' },
          { label: '人事部', value: 'hr' }
        ]
      },
      position: {
        type: 'string',
        title: '岗位',
        required: true,
        'x-decorator': 'FormItem',
        'x-component': 'Input'
      },
      hire_date: {
        type: 'string',
        title: '入职日期',
        required: true,
        'x-decorator': 'FormItem',
        'x-component': 'DatePicker',
        'x-component-props': {
          format: 'YYYY-MM-DD'
        }
      },
      id_card: {
        type: 'string',
        title: '身份证号',
        'x-decorator': 'FormItem',
        'x-component': 'Input',
        'x-rules': [
          { pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/, message: '请输入正确的身份证号' }
        ]
      },
      employee_no: {
        type: 'string',
        title: '工号',
        'x-decorator': 'FormItem',
        'x-component': 'Input',
        'x-visible': false,  // 默认隐藏，HR节点可见
        'x-reactions': {
          dependencies: ['_currentNode'],
          fulfill: {
            state: {
              visible: '{{$deps[0] === "hr_approve"}}'
            }
          }
        }
      },
      notes: {
        type: 'string',
        title: '备注',
        'x-decorator': 'FormItem',
        'x-component': 'TextArea',
        'x-component-props': {
          rows: 3,
          placeholder: '请输入备注信息'
        }
      }
    }
  },
  nodePermissions: [
    {
      nodeId: 'apply',
      nodeName: '发起申请',
      fields: {
        name: 'editable',
        gender: 'editable',
        phone: 'editable',
        email: 'editable',
        department: 'editable',
        position: 'editable',
        hire_date: 'editable',
        id_card: 'editable',
        employee_no: 'hidden',
        notes: 'editable'
      }
    },
    {
      nodeId: 'dept_approve',
      nodeName: '部门审批',
      fields: {
        name: 'readonly',
        gender: 'readonly',
        phone: 'readonly',
        email: 'readonly',
        department: 'readonly',
        position: 'readonly',
        hire_date: 'readonly',
        id_card: 'readonly',
        employee_no: 'hidden',
        notes: 'readonly'
      }
    },
    {
      nodeId: 'hr_approve',
      nodeName: 'HR审批',
      fields: {
        name: 'readonly',
        gender: 'readonly',
        phone: 'readonly',
        email: 'readonly',
        department: 'readonly',
        position: 'readonly',
        hire_date: 'readonly',
        id_card: 'readonly',
        employee_no: 'editable',  // HR可编辑工号
        notes: 'readonly'
      }
    }
  ]
}

// 设备入库表单Schema
export const equipmentInboundSchema: FormSchemaConfig = {
  type: 'equipment_inbound',
  title: '设备入库',
  schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: '设备名称',
        required: true,
        'x-decorator': 'FormItem',
        'x-component': 'Input',
        'x-component-props': {
          placeholder: '请输入设备名称'
        }
      },
      model: {
        type: 'string',
        title: '型号规格',
        'x-decorator': 'FormItem',
        'x-component': 'Input',
        'x-component-props': {
          placeholder: '请输入设备型号规格'
        }
      },
      category: {
        type: 'string',
        title: '设备类型',
        required: true,
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        'x-component-props': {
          placeholder: '请选择设备类型'
        },
        enum: [
          { label: '电脑', value: 'computer' },
          { label: '打印机', value: 'printer' },
          { label: '服务器', value: 'server' },
          { label: '网络设备', value: 'network' },
          { label: '办公家具', value: 'furniture' },
          { label: '其他', value: 'other' }
        ]
      },
      quantity: {
        type: 'number',
        title: '数量',
        required: true,
        'x-decorator': 'FormItem',
        'x-component': 'NumberPicker',
        'x-component-props': {
          min: 1,
          placeholder: '请输入数量'
        }
      },
      warehouse_id: {
        type: 'string',
        title: '入库仓库',
        required: true,
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        'x-component-props': {
          placeholder: '请选择入库仓库'
        },
        'x-reactions': {
          fulfill: {
            state: {
              dataSource: '{{$self.queryWarehouses()}}'
            }
          }
        }
      },
      supplier: {
        type: 'string',
        title: '供应商',
        'x-decorator': 'FormItem',
        'x-component': 'Input',
        'x-component-props': {
          placeholder: '请输入供应商名称'
        }
      },
      purchase_date: {
        type: 'string',
        title: '采购日期',
        'x-decorator': 'FormItem',
        'x-component': 'DatePicker',
        'x-component-props': {
          placeholder: '请选择采购日期'
        }
      },
      price: {
        type: 'number',
        title: '单价',
        'x-decorator': 'FormItem',
        'x-component': 'NumberPicker',
        'x-component-props': {
          prefix: '¥',
          precision: 2,
          placeholder: '请输入单价'
        }
      },
      notes: {
        type: 'string',
        title: '备注',
        'x-decorator': 'FormItem',
        'x-component': 'TextArea',
        'x-component-props': {
          placeholder: '请输入备注信息（选填）',
          rows: 3
        }
      }
    }
  }
}

// 项目结项表单Schema
export const projectCompletionSchema: FormSchemaConfig = {
  type: 'project_completion',
  title: '项目结项',
  schema: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        title: '项目名称',
        required: true,
        'x-decorator': 'FormItem',
        'x-component': 'Select'
      },
      actual_start: {
        type: 'string',
        title: '实际开始日期',
        'x-decorator': 'FormItem',
        'x-component': 'DatePicker'
      },
      actual_end: {
        type: 'string',
        title: '实际结束日期',
        required: true,
        'x-decorator': 'FormItem',
        'x-component': 'DatePicker'
      },
      total_cost: {
        type: 'number',
        title: '实际成本',
        'x-decorator': 'FormItem',
        'x-component': 'NumberPicker',
        'x-component-props': {
          prefix: '¥',
          precision: 2
        }
      },
      total_revenue: {
        type: 'number',
        title: '实际收入',
        'x-decorator': 'FormItem',
        'x-component': 'NumberPicker',
        'x-component-props': {
          prefix: '¥',
          precision: 2
        }
      },
      completion_status: {
        type: 'string',
        title: '完成状态',
        required: true,
        'x-decorator': 'FormItem',
        'x-component': 'Radio.Group',
        enum: [
          { label: '按时完成', value: 'on_time' },
          { label: '提前完成', value: 'early' },
          { label: '延期完成', value: 'delayed' }
        ]
      },
      summary: {
        type: 'string',
        title: '项目总结',
        'x-decorator': 'FormItem',
        'x-component': 'TextArea',
        'x-component-props': {
          rows: 5
        }
      }
    }
  }
}

// Schema注册表
export const formSchemaRegistry: Record<string, FormSchemaConfig> = {
  'person_onboard': personOnboardSchema,
  'equipment_inbound': equipmentInboundSchema,
  'project_completion': projectCompletionSchema
}

// 根据类型获取Schema
export function getFormSchema(type: string): FormSchemaConfig | null {
  return formSchemaRegistry[type] || null
}

// 根据节点权限过滤Schema
export function applyNodePermissions(schema: any, nodePermissions: NodeFieldPermission[], currentNode: string) {
  const permission = nodePermissions.find(p => p.nodeId === currentNode)
  if (!permission) return schema

  const newSchema = JSON.parse(JSON.stringify(schema))
  
  Object.keys(permission.fields).forEach(fieldKey => {
    const fieldPermission = permission.fields[fieldKey]
    if (newSchema.properties[fieldKey]) {
      switch (fieldPermission) {
        case 'hidden':
          newSchema.properties[fieldKey]['x-visible'] = false
          break
        case 'readonly':
          newSchema.properties[fieldKey]['x-disabled'] = true
          newSchema.properties[fieldKey]['x-visible'] = true
          break
        case 'editable':
          newSchema.properties[fieldKey]['x-disabled'] = false
          newSchema.properties[fieldKey]['x-visible'] = true
          break
        case 'visible':
          newSchema.properties[fieldKey]['x-visible'] = true
          break
      }
    }
  })
  
  return newSchema
}
