import { ValidationRule } from '../middleware/validator.js'

export const commonValidators = {
  id: (field: string = 'id'): ValidationRule => ({
    field,
    required: true,
    type: 'uuid',
  }),

  username: (): ValidationRule => ({
    field: 'username',
    required: true,
    type: 'string',
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_]+$/,
  }),

  password: (): ValidationRule => ({
    field: 'password',
    required: true,
    type: 'string',
    minLength: 6,
    maxLength: 100,
  }),

  email: (field: string = 'email'): ValidationRule => ({
    field,
    required: false,
    type: 'email',
  }),

  name: (field: string = 'name'): ValidationRule => ({
    field,
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 100,
  }),

  role: (): ValidationRule => ({
    field: 'role',
    required: false,
    type: 'string',
    enum: ['admin', 'project_manager', 'hr_manager', 'equipment_manager', 'implementer', 'user'],
  }),

  status: (field: string = 'status', allowedValues?: string[]): ValidationRule => ({
    field,
    required: false,
    type: 'string',
    enum: allowedValues || ['active', 'inactive', 'pending', 'completed', 'cancelled'],
  }),

  page: (): ValidationRule => ({
    field: 'page',
    required: false,
    type: 'number',
    min: 1,
    custom: (value) => value === undefined || value >= 1,
  }),

  pageSize: (): ValidationRule => ({
    field: 'pageSize',
    required: false,
    type: 'number',
    min: 1,
    max: 100,
    custom: (value) => value === undefined || (value >= 1 && value <= 100),
  }),

  limit: (): ValidationRule => ({
    field: 'limit',
    required: false,
    type: 'number',
    min: 1,
    max: 1000,
  }),

  offset: (): ValidationRule => ({
    field: 'offset',
    required: false,
    type: 'number',
    min: 0,
  }),

  date: (field: string = 'date'): ValidationRule => ({
    field,
    required: false,
    type: 'date',
  }),

  startDate: (field: string = 'startDate'): ValidationRule => ({
    field,
    required: false,
    type: 'date',
  }),

  endDate: (field: string = 'endDate'): ValidationRule => ({
    field,
    required: false,
    type: 'date',
  }),

  url: (field: string = 'url'): ValidationRule => ({
    field,
    required: false,
    type: 'url',
  }),

  boolean: (field: string): ValidationRule => ({
    field,
    required: false,
    type: 'boolean',
  }),

  number: (field: string, options?: { min?: number; max?: number }): ValidationRule => ({
    field,
    required: false,
    type: 'number',
    ...options,
  }),

  string: (field: string, options?: { minLength?: number; maxLength?: number }): ValidationRule => ({
    field,
    required: false,
    type: 'string',
    ...options,
  }),
}

export const workflowValidators = {
  definitionId: (): ValidationRule => commonValidators.id('definitionId'),
  instanceId: (): ValidationRule => commonValidators.id('instanceId'),
  taskId: (): ValidationRule => commonValidators.id('taskId'),
  nodeId: (): ValidationRule => ({
    field: 'nodeId',
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 100,
  }),
  comment: (): ValidationRule => ({
    field: 'comment',
    required: false,
    type: 'string',
    maxLength: 1000,
  }),
  action: (): ValidationRule => ({
    field: 'action',
    required: true,
    type: 'string',
    enum: ['approve', 'reject', 'withdraw', 'terminate'],
  }),
  assigneeId: (): ValidationRule => commonValidators.id('assigneeId'),
  delegateTo: (): ValidationRule => commonValidators.id('delegateTo'),
  transferTo: (): ValidationRule => commonValidators.id('transferTo'),
}

export const projectValidators = {
  projectName: (): ValidationRule => ({
    field: 'name',
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 200,
  }),
  projectCode: (): ValidationRule => ({
    field: 'code',
    required: false,
    type: 'string',
    minLength: 1,
    maxLength: 50,
    pattern: /^[A-Z0-9-]+$/,
  }),
  projectManager: (): ValidationRule => commonValidators.id('projectManager'),
  projectStatus: (): ValidationRule => commonValidators.status('status', ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled']),
  startDate: (): ValidationRule => commonValidators.startDate(),
  endDate: (): ValidationRule => commonValidators.endDate(),
  budget: (): ValidationRule => ({
    field: 'budget',
    required: false,
    type: 'number',
    min: 0,
  }),
}

export const equipmentValidators = {
  equipmentCode: (): ValidationRule => ({
    field: 'code',
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 50,
  }),
  equipmentName: (): ValidationRule => ({
    field: 'name',
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 200,
  }),
  equipmentType: (): ValidationRule => ({
    field: 'type',
    required: true,
    type: 'string',
    enum: ['instrument', 'load', 'cable'],
  }),
  equipmentStatus: (): ValidationRule => commonValidators.status('status', ['in_stock', 'in_use', 'maintenance', 'scrapped']),
  quantity: (): ValidationRule => ({
    field: 'quantity',
    required: true,
    type: 'number',
    min: 1,
  }),
  positionId: (): ValidationRule => commonValidators.id('positionId'),
  warehouseId: (): ValidationRule => commonValidators.id('warehouseId'),
}

export const employeeValidators = {
  employeeId: (): ValidationRule => commonValidators.id('employeeId'),
  employeeName: (): ValidationRule => commonValidators.name('name'),
  employeeNumber: (): ValidationRule => ({
    field: 'employeeNumber',
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 50,
  }),
  departmentId: (): ValidationRule => commonValidators.id('departmentId'),
  positionId: (): ValidationRule => commonValidators.id('positionId'),
  hireDate: (): ValidationRule => commonValidators.date('hireDate'),
  employeeStatus: (): ValidationRule => commonValidators.status('status', ['active', 'inactive', 'on_leave', 'resigned']),
}
