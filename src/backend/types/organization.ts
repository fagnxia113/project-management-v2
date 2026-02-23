export type PlatformType = 'wechat_work' | 'dingtalk' | 'feishu';
export type SyncStatus = 'success' | 'failed' | 'partial';
export type SyncType = 'department' | 'employee' | 'full';
export type SyncMode = 'manual' | 'auto';

export interface Department {
  id: string;
  code: string;
  name: string;
  parent_id?: string;
  manager_id?: string;
  manager_name?: string;
  level: number;
  path?: string;
  sort_order: number;
  status: 'active' | 'inactive';
  description?: string;
  third_party_id?: string;
  third_party_source?: PlatformType;
  created_at: Date;
  updated_at: Date;
  children?: Department[];
  employee_count?: number;
}

export interface Position {
  id: string;
  code: string;
  name: string;
  department_id?: string;
  department_name?: string;
  level: number;
  category?: string;
  description?: string;
  requirements?: string;
  status: 'active' | 'inactive';
  sort_order: number;
  third_party_id?: string;
  third_party_source?: PlatformType;
  created_at: Date;
  updated_at: Date;
  employee_count?: number;
}

export interface ThirdPartyConfig {
  id: string;
  platform_type: PlatformType;
  name: string;
  corp_id?: string;
  agent_id?: string;
  app_id?: string;
  app_secret?: string;
  access_token?: string;
  token_expire_time?: Date;
  sync_departments: boolean;
  sync_employees: boolean;
  sync_enabled: boolean;
  sync_interval: number;
  last_sync_time?: Date;
  last_sync_status?: SyncStatus;
  config?: Record<string, any>;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

export interface SyncLog {
  id: string;
  config_id: string;
  platform_type: PlatformType;
  sync_type: SyncType;
  sync_mode: SyncMode;
  status: SyncStatus;
  total_count: number;
  success_count: number;
  failed_count: number;
  created_count: number;
  updated_count: number;
  deleted_count: number;
  start_time: Date;
  end_time?: Date;
  duration?: number;
  error_message?: string;
  details?: Record<string, any>;
  created_at: Date;
}

export interface CreateDepartmentParams {
  name: string;
  parent_id?: string;
  manager_id?: string;
  sort_order?: number;
  description?: string;
}

export interface UpdateDepartmentParams {
  name?: string;
  parent_id?: string;
  manager_id?: string;
  sort_order?: number;
  status?: 'active' | 'inactive';
  description?: string;
}

export interface CreatePositionParams {
  name: string;
  department_id?: string;
  level?: number;
  category?: string;
  description?: string;
  requirements?: string;
  sort_order?: number;
}

export interface UpdatePositionParams {
  name?: string;
  department_id?: string;
  level?: number;
  category?: string;
  description?: string;
  requirements?: string;
  sort_order?: number;
  status?: 'active' | 'inactive';
}

export interface CreateThirdPartyConfigParams {
  platform_type: PlatformType;
  name: string;
  corp_id?: string;
  agent_id?: string;
  app_id?: string;
  app_secret?: string;
  sync_departments?: boolean;
  sync_employees?: boolean;
  sync_enabled?: boolean;
  sync_interval?: number;
  config?: Record<string, any>;
}

export interface UpdateThirdPartyConfigParams {
  name?: string;
  corp_id?: string;
  agent_id?: string;
  app_id?: string;
  app_secret?: string;
  sync_departments?: boolean;
  sync_employees?: boolean;
  sync_enabled?: boolean;
  sync_interval?: number;
  config?: Record<string, any>;
  status?: 'active' | 'inactive';
}

export interface DepartmentTree extends Department {
  children: DepartmentTree[];
}

export interface SyncResult {
  success: boolean;
  message: string;
  total_count: number;
  success_count: number;
  failed_count: number;
  created_count: number;
  updated_count: number;
  errors?: Array<{
    id: string;
    name: string;
    error: string;
  }>;
}

export interface ThirdPartyDepartment {
  id: string;
  name: string;
  parent_id?: string;
  order?: number;
}

export interface ThirdPartyEmployee {
  id: string;
  name: string;
  department_ids?: string[];
  position?: string;
  mobile?: string;
  email?: string;
  avatar?: string;
  status?: number;
}

export interface ThirdPartySyncAdapter {
  getAccessToken(): Promise<string>;
  getDepartments(): Promise<ThirdPartyDepartment[]>;
  getEmployees(departmentId?: string): Promise<ThirdPartyEmployee[]>;
  syncDepartments(): Promise<SyncResult>;
  syncEmployees(): Promise<SyncResult>;
}
