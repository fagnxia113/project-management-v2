// API配置
// 使用空字符串让请求走相对路径，通过Vite代理转发到后端
export const API_BASE_URL = ''

// JWT Token 解析函数 - 仅用于解码，不验证签名
// 注意：此函数仅用于前端显示，不用于安全验证
export function parseJWTToken(token: string): any {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) {
      return null
    }
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))
    return JSON.parse(jsonPayload)
  } catch (e) {
    console.warn('Token解析失败', e)
    return null
  }
}

// 安全的Token验证函数（仅用于调试，生产环境不应在前端验证）
export function isTokenExpired(token: string): boolean {
  try {
    const payload = parseJWTToken(token)
    if (!payload || !payload.exp) {
      return true
    }
    const now = Math.floor(Date.now() / 1000)
    return payload.exp < now
  } catch (e) {
    return true
  }
}

// 通用API路径
export const API_PATHS = {
  DATA: '/api/data',
  METADATA: '/api/metadata',
  HEALTH: '/health',
  WORKFLOW: '/api/workflow',
  PROJECTS: '/api/projects',
  WORK_TIME: '/api/work-time',
  AUTH: '/api/auth'
}

export const API_URL = {
  BASE: API_BASE_URL,
  HEALTH: `${API_BASE_URL}${API_PATHS.HEALTH}`,
  DATA: (entity: string) => `${API_BASE_URL}${API_PATHS.DATA}/${entity}`,
  WORKFLOW: {
    DEFINITIONS: `${API_BASE_URL}${API_PATHS.WORKFLOW}/definitions`,
    DEFINITION_DETAIL: (id: string) => `${API_BASE_URL}${API_PATHS.WORKFLOW}/definitions/${id}`,
    DEFINITION_ACTIVATE: (id: string) => `${API_BASE_URL}${API_PATHS.WORKFLOW}/definitions/${id}/activate`,
    PROCESSES: `${API_BASE_URL}${API_PATHS.WORKFLOW}/processes`,
    PROCESS_DETAIL: (id: string) => `${API_BASE_URL}${API_PATHS.WORKFLOW}/processes/${id}`,
    PROCESS_TERMINATE: (id: string) => `${API_BASE_URL}${API_PATHS.WORKFLOW}/processes/${id}/terminate`,
    TASKS: `${API_BASE_URL}${API_PATHS.WORKFLOW}/tasks`,
    MY_TASKS: `${API_BASE_URL}${API_PATHS.WORKFLOW}/my-tasks`,
    TASK_DETAIL: (id: string) => `${API_BASE_URL}${API_PATHS.WORKFLOW}/tasks/${id}`,
    TASK_COMPLETE: (id: string) => `${API_BASE_URL}${API_PATHS.WORKFLOW}/tasks/${id}/complete`,
    TASK_CLAIM: (id: string) => `${API_BASE_URL}${API_PATHS.WORKFLOW}/tasks/${id}/claim`,
    TASK_DELEGATE: (id: string) => `${API_BASE_URL}${API_PATHS.WORKFLOW}/tasks/${id}/delegate`,
    TASK_TRANSFER: (id: string) => `${API_BASE_URL}${API_PATHS.WORKFLOW}/tasks/${id}/transfer`,
    METRICS: `${API_BASE_URL}${API_PATHS.WORKFLOW}/metrics`,
    FORM_PRESETS: `${API_BASE_URL}${API_PATHS.WORKFLOW}/form-presets`,
    FORM_PRESET_DETAIL: (id: string) => `${API_BASE_URL}${API_PATHS.WORKFLOW}/form-presets/${id}`,
    FORM_PRESET_START: (id: string) => `${API_BASE_URL}${API_PATHS.WORKFLOW}/form-presets/${id}/start`,
    FORM_PRESET_DEFAULT_VALUES: (id: string) => `${API_BASE_URL}${API_PATHS.WORKFLOW}/form-presets/${id}/default-values`,
    FORM_PRESET_FORM_FIELDS: (id: string) => `${API_BASE_URL}${API_PATHS.WORKFLOW}/form-presets/${id}/form-fields`,
    FORM_TEMPLATES: `${API_BASE_URL}${API_PATHS.WORKFLOW}/form-templates`,
    FORM_TEMPLATE_DETAIL: (id: string) => `${API_BASE_URL}${API_PATHS.WORKFLOW}/form-templates/${id}`,
    FORM_TEMPLATE_VALIDATE: (id: string) => `${API_BASE_URL}${API_PATHS.WORKFLOW}/form-templates/${id}/validate`,
    FORM_TEMPLATE_LINK: (id: string) => `${API_BASE_URL}${API_PATHS.WORKFLOW}/form-templates/${id}/link`,
    PROCESS_PRESETS: `${API_BASE_URL}/api/workflow/form-presets`,
  },
  ORGANIZATION: {
    DEPARTMENTS: `${API_BASE_URL}/api/organization/departments`,
    DEPARTMENT_TREE: `${API_BASE_URL}/api/organization/departments?tree=true`,
    DEPARTMENT_DETAIL: (id: string) => `${API_BASE_URL}/api/organization/departments/${id}`,
    DEPARTMENT_PATH: (id: string) => `${API_BASE_URL}/api/organization/departments/${id}/path`,
    DEPARTMENT_CHILDREN: (id: string) => `${API_BASE_URL}/api/organization/departments/${id}/children`,
    DEPARTMENT_POSITIONS: (id: string) => `${API_BASE_URL}/api/organization/departments/${id}/positions`,
    POSITIONS: `${API_BASE_URL}/api/organization/positions`,
    POSITION_DETAIL: (id: string) => `${API_BASE_URL}/api/organization/positions/${id}`,
    POSITION_CATEGORIES: `${API_BASE_URL}/api/organization/positions/categories`,
    THIRD_PARTY_CONFIGS: `${API_BASE_URL}/api/organization/third-party/configs`,
    THIRD_PARTY_CONFIG_DETAIL: (id: string) => `${API_BASE_URL}/api/organization/third-party/configs/${id}`,
    THIRD_PARTY_SYNC: (id: string) => `${API_BASE_URL}/api/organization/third-party/configs/${id}/sync`,
    THIRD_PARTY_SYNC_LOGS: `${API_BASE_URL}/api/organization/third-party/sync-logs`,
  },
  EQUIPMENT: {
    TRANSFERS: `${API_BASE_URL}/api/equipment/transfers`,
    TRANSFER_DETAIL: (id: string) => `${API_BASE_URL}/api/equipment/transfers/${id}`,
    TRANSFER_APPROVE: (id: string) => `${API_BASE_URL}/api/equipment/transfers/${id}/approve`,
    DETERMINE_SCENARIO: `${API_BASE_URL}/api/equipment/determine-scenario`,
  },
  NOTIFICATIONS: {
    LIST: `${API_BASE_URL}/api/notifications/notifications`,
    UNREAD_COUNT: `${API_BASE_URL}/api/notifications/notifications/unread-count`,
    MARK_READ: (id: string) => `${API_BASE_URL}/api/notifications/notifications/${id}/read`,
    MARK_ALL_READ: `${API_BASE_URL}/api/notifications/notifications/read-all`,
    ALERTS: `${API_BASE_URL}/api/notifications/alerts`,
    ALERT_ACKNOWLEDGE: (id: string) => `${API_BASE_URL}/api/notifications/alerts/${id}/acknowledge`,
    ALERT_RESOLVE: (id: string) => `${API_BASE_URL}/api/notifications/alerts/${id}/resolve`,
    ALERT_CHECK: `${API_BASE_URL}/api/notifications/alerts/check`,
    DAILY_REPORT_STATUS: `${API_BASE_URL}/api/notifications/daily-reports/status`,
    DAILY_REPORT_STATISTICS: `${API_BASE_URL}/api/notifications/daily-reports/statistics`,
    DAILY_REPORT_REMIND: `${API_BASE_URL}/api/notifications/daily-reports/remind`,
    DAILY_REPORT_REMIND_ALL: `${API_BASE_URL}/api/notifications/daily-reports/remind-all`,
    DAILY_REPORT_HISTORY: `${API_BASE_URL}/api/notifications/daily-reports/history`,
    SCHEDULER_STATUS: `${API_BASE_URL}/api/notifications/scheduler/status`,
    SCHEDULER_TRIGGER: `${API_BASE_URL}/api/notifications/scheduler/trigger`,
    PURCHASE_CHECK_INVENTORY: `${API_BASE_URL}/api/notifications/purchase/check-inventory`,
    PURCHASE_REQUESTS: `${API_BASE_URL}/api/notifications/purchase/requests`,
    PURCHASE_REQUEST_CREATE: `${API_BASE_URL}/api/notifications/purchase/requests`,
    PURCHASE_REQUEST_STATUS: (id: string) => `${API_BASE_URL}/api/notifications/purchase/requests/${id}/status`,
  },
  PERMISSIONS: {
    LIST: `${API_BASE_URL}/api/permissions`,
    CHECK: `${API_BASE_URL}/api/permissions/check`,
    MENUS: `${API_BASE_URL}/api/permissions/menus`,
    ROLES: `${API_BASE_URL}/api/permissions/roles`,
    ROLE_DETAIL: (code: string) => `${API_BASE_URL}/api/permissions/roles/${code}`,
  },
  PROJECTS: {
    LIST: `${API_BASE_URL}${API_PATHS.PROJECTS}`,
    DETAIL: (id: string) => `${API_BASE_URL}${API_PATHS.PROJECTS}/${id}`,
    STRUCTURE: (id: string) => `${API_BASE_URL}${API_PATHS.PROJECTS}/${id}/structure`,
    CREATE_TASK: (id: string) => `${API_BASE_URL}${API_PATHS.PROJECTS}/${id}/tasks`,
    UPDATE_TASK_PROGRESS: (taskId: string) => `${API_BASE_URL}${API_PATHS.PROJECTS}/tasks/${taskId}/progress`,
  },
  WORK_TIME: {
    SUBMIT_REPORT: `${API_BASE_URL}${API_PATHS.WORK_TIME}/daily-reports`,
    REPORT_DETAIL: (id: string) => `${API_BASE_URL}${API_PATHS.WORK_TIME}/daily-reports/${id}`,
    EMPLOYEE_HISTORY: (id: string) => `${API_BASE_URL}${API_PATHS.WORK_TIME}/employee/${id}/history`,
    PROJECT_COST: (id: string) => `${API_BASE_URL}${API_PATHS.WORK_TIME}/projects/${id}/cost`,
  },
  AUTH: {
    LOGIN: `${API_BASE_URL}${API_PATHS.AUTH}/login`,
    VERIFY: `${API_BASE_URL}${API_PATHS.AUTH}/verify`,
    USERS: `${API_BASE_URL}${API_PATHS.AUTH}/users`,
    USER_DETAIL: (id: string) => `${API_BASE_URL}${API_PATHS.AUTH}/users/${id}`,
    USER_STATUS: (id: string) => `${API_BASE_URL}${API_PATHS.AUTH}/users/${id}/status`,
    CHANGE_PASSWORD: `${API_BASE_URL}${API_PATHS.AUTH}/change-password`
  }
}
