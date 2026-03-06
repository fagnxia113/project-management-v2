export interface FormField {
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'date' | 'file' | 'user' | 'department' | 'textarea' | 'array' | 'currency' | 'phone' | 'email' | 'checkbox' | 'radio' | 'reference' | 'lookup' | 'images' | 'files'
  required?: boolean
  options?: string[]
  defaultValue?: any
  placeholder?: string
  accept?: string
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
  layout?: {
    width?: 'full' | 'half' | 'third'
    row?: number
    col?: number
  }
  permissions?: FieldPermissionConfig
  displayConfig?: {
    showLabel?: boolean
    readonly?: boolean
    hidden?: boolean
  }
  autoGenerate?: boolean
  readonly?: boolean
  disabled?: boolean
  editorProps?: {
    format?:(value: any) => string,
    parse?:(value: string) => any
  }
  refEntity?: string
  refLabel?: string
  refValue?: string
  cascadeFrom?: string
  cascadeField?: string
  dynamicOptions?: 'department' | 'position' | 'employee' | 'project' | 'warehouse'
  dynamicOptionsConfig?: {
    source: string
    labelField: string
    valueField: string
    filter?: Record<string, any>
  }
  showCondition?: {
    field: string
    value: any
  }
}

export interface FieldPermissionConfig {
  default?: {
    visible: boolean
    editable: boolean
    required?: boolean
  }
  nodePermissions?: Record<string, {
    visible: boolean
    editable: boolean
    required?: boolean
  }>
}

export interface FormTemplate {
  id: string
  name: string
  version: number
  layout: FormLayout
  fields: FormField[]
  sections?: FormSection[]
  style?: FormStyle
}

export interface FormLayout {
  type: 'single' | 'tabs' | 'steps'
  columns: number
  labelWidth?: string
  labelPosition?: 'left' | 'right' | 'top'
}

export interface FormSection {
  id: string
  title: string
  collapsible?: boolean
  defaultExpanded?: boolean
  fields: string[]
  layout?: FormLayout
}

export interface FormStyle {
  theme?: 'default' | 'compact' | 'bordered'
  size?: 'small' | 'medium' | 'large'
  labelAlign?: 'left' | 'right' | 'top'
}

export interface WorkflowDefinition {
  id: string
  key: string
  name: string
  version: number
  category?: string
  entity_type?: string
  bpmn_xml?: string
  node_config: {
    nodes: WorkflowNode[]
    edges: WorkflowEdge[]
  }
  form_schema?: FormField[]
  variables?: ProcessVariable[]
  status: 'draft' | 'active' | 'suspended' | 'archived'
  created_by?: string
  created_at: Date
  updated_at: Date
}

export interface WorkflowNode {
  id: string
  name: string
  type: 'startEvent' | 'endEvent' | 'userTask' | 'serviceTask' | 'exclusiveGateway' | 'parallelGateway' | 'inclusiveGateway' | 'subProcess' | 'intermediateCatchEvent' | 'boundaryEvent'
  config?: any
  approvalConfig?: any
  gatewayConfig?: any
  serviceConfig?: any
  timeoutConfig?: any
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  name?: string
  type?: string
}

export interface ProcessVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  defaultValue?: any
  scope: 'process' | 'local'
}
