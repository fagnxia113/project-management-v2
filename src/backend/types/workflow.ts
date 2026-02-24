export interface WorkflowNode {
  id: string;
  name: string;
  type: 'startEvent' | 'endEvent' | 'userTask' | 'serviceTask' | 'exclusiveGateway' | 'parallelGateway' | 'inclusiveGateway' | 'subProcess' | 'intermediateCatchEvent' | 'boundaryEvent';
  config?: {
    formKey?: string;
    approvalConfig?: ApprovalConfig;
    gatewayConfig?: GatewayConfig;
    serviceConfig?: ServiceConfig;
    timeoutConfig?: TimeoutConfig;
  };
  approvalConfig?: ApprovalConfig;
  gatewayConfig?: GatewayConfig;
  serviceConfig?: ServiceConfig;
  timeoutConfig?: TimeoutConfig;
}

export interface ApprovalConfig {
  approvalType: 'single' | 'sequential' | 'parallel' | 'any';
  approverSource: ApproverSource;
  timeout?: {
    duration: string;
    action: 'auto_approve' | 'auto_reject' | 'escalate';
  };
  skipCondition?: string;
  multiInstance?: {
    collection?: string;
    completionCondition?: string;
  };
  formConfig?: TaskFormConfig;
}

export interface TaskFormConfig {
  formKey?: string;
  fields?: FormField[];
  required?: boolean;
  fieldPermissions?: FieldPermission[];
}

export interface FieldPermission {
  fieldName: string;
  visible: boolean;
  editable: boolean;
  required?: boolean;
  roles?: string[];
}

export interface ApproverSource {
  type: 'fixed' | 'role' | 'department' | 'superior' | 'form_field' | 'expression' | 'previous_handler' | 'initiator';
  value: string | string[];
  fallback?: ApproverSource;
}

export interface GatewayConfig {
  conditions: GatewayCondition[];
  defaultFlow?: string;
}

export interface GatewayCondition {
  id: string;
  name: string;
  expression: string;
  targetNode: string;
}

export interface ServiceConfig {
  type: 'script' | 'http' | 'message' | 'custom';
  expression: string;
  inputVariables?: string[];
  outputVariable?: string;
}

export interface TimeoutConfig {
  duration: string;
  action: 'auto_approve' | 'auto_reject' | 'escalate' | 'notify';
  escalationTarget?: string;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
  name?: string;
}

export interface WorkflowDefinition {
  id: string;
  key: string;
  name: string;
  version: number;
  category?: string;
  entity_type?: string;
  bpmn_xml?: string;
  node_config: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
  form_schema?: FormField[];
  variables?: ProcessVariable[];
  status: 'draft' | 'active' | 'suspended' | 'archived';
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'file' | 'user' | 'department' | 'textarea';
  required?: boolean;
  options?: string[];
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface ProcessVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue?: any;
  scope: 'process' | 'local';
}

export interface WorkflowInstance {
  id: string;
  definition_id: string;
  definition_key: string;
  definition_version: number;
  business_key?: string;
  business_id?: string;
  title?: string;
  initiator_id: string;
  initiator_name: string;
  variables: Record<string, any>;
  status: 'running' | 'suspended' | 'completed' | 'terminated';
  start_time: Date;
  end_time?: Date;
  duration?: number;
  result?: 'approved' | 'rejected' | 'withdrawn' | 'terminated';
  created_at: Date;
  updated_at: Date;
}

export interface WorkflowExecution {
  id: string;
  instance_id: string;
  parent_id?: string;
  node_id: string;
  node_name?: string;
  node_type?: string;
  variables?: Record<string, any>;
  status: 'active' | 'completed' | 'cancelled';
  created_at: Date;
  completed_at?: Date;
}

export interface WorkflowTask {
  id: string;
  instance_id: string;
  execution_id?: string;
  node_id: string;
  task_def_key?: string;
  name: string;
  description?: string;
  assignee_id?: string;
  assignee_name?: string;
  candidate_users?: string[];
  candidate_groups?: string[];
  priority: number;
  due_date?: Date;
  claim_time?: Date;
  variables?: Record<string, any>;
  status: 'created' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  result?: 'approved' | 'rejected' | 'withdrawn' | 'delegated' | 'transferred' | 'skipped';
  comment?: string;
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
  duration?: number;
}

export interface TaskHistory {
  id: string;
  task_id: string;
  instance_id: string;
  node_id: string;
  task_name?: string;
  action: 'create' | 'assign' | 'claim' | 'complete' | 'delegate' | 'transfer' | 'withdraw' | 'cancel' | 'skip';
  operator_id?: string;
  operator_name?: string;
  target_id?: string;
  target_name?: string;
  comment?: string;
  created_at: Date;
}

export interface Approver {
  id: string;
  name: string;
  department?: string;
  position?: string;
}

export interface ProcessContext {
  process: WorkflowInstance;
  definition: WorkflowDefinition;
  variables: Record<string, any>;
  formData: Record<string, any>;
  initiator: { id: string; name: string };
  currentTask?: WorkflowTask;
}

export interface StartProcessParams {
  processKey: string;
  businessKey?: string;
  businessId?: string;
  title?: string;
  variables?: Record<string, any>;
  initiator: { id: string; name: string };
}

export interface CompleteTaskParams {
  action: 'approve' | 'reject';
  comment?: string;
  formData?: Record<string, any>;
  variables?: Record<string, any>;
  operator: { id: string; name: string };
}

export interface DelegateTaskParams {
  targetUser: { id: string; name: string };
  comment?: string;
  operator: { id: string; name: string };
}

export interface TransferTaskParams {
  targetUser: { id: string; name: string };
  comment?: string;
  operator: { id: string; name: string };
}

export interface ProcessMetrics {
  totalInstances: number;
  runningInstances: number;
  completedInstances: number;
  terminatedInstances: number;
  avgDuration: number;
  avgTaskDuration: number;
  timeoutRate: number;
  nodeMetrics: NodeMetric[];
  approverStats: ApproverStat[];
}

export interface NodeMetric {
  nodeId: string;
  nodeName: string;
  totalCount: number;
  avgDuration: number;
  timeoutCount: number;
  approveRate: number;
  rejectRate: number;
}

export interface ApproverStat {
  userId: string;
  userName: string;
  totalTasks: number;
  completedTasks: number;
  avgDuration: number;
  approveRate: number;
  rejectRate: number;
}
