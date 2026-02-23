import { db } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
import {
  ThirdPartyConfig,
  SyncLog,
  CreateThirdPartyConfigParams,
  UpdateThirdPartyConfigParams,
  SyncResult,
  ThirdPartyDepartment,
  ThirdPartyEmployee,
  ThirdPartySyncAdapter,
  PlatformType,
  SyncType,
  SyncMode
} from '../types/organization.js';

export abstract class BaseThirdPartyAdapter implements ThirdPartySyncAdapter {
  protected config: ThirdPartyConfig;

  constructor(config: ThirdPartyConfig) {
    this.config = config;
  }

  abstract getAccessToken(): Promise<string>;
  abstract getDepartments(): Promise<ThirdPartyDepartment[]>;
  abstract getEmployees(departmentId?: string): Promise<ThirdPartyEmployee[]>;

  async syncDepartments(): Promise<SyncResult> {
    throw new Error('Method not implemented');
  }

  async syncEmployees(): Promise<SyncResult> {
    throw new Error('Method not implemented');
  }
}

export class ThirdPartyConfigService {
  async createConfig(params: CreateThirdPartyConfigParams): Promise<ThirdPartyConfig> {
    const id = uuidv4();

    await db.execute(
      `INSERT INTO third_party_configs (
        id, platform_type, name, corp_id, agent_id, app_id, app_secret,
        sync_departments, sync_employees, sync_enabled, sync_interval, config, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, params.platform_type, params.name, params.corp_id || null,
        params.agent_id || null, params.app_id || null, params.app_secret || null,
        params.sync_departments ?? true, params.sync_employees ?? true,
        params.sync_enabled ?? false, params.sync_interval || 60,
        params.config ? JSON.stringify(params.config) : null, 'active'
      ]
    );

    return this.getConfigById(id) as Promise<ThirdPartyConfig>;
  }

  async getConfigById(id: string): Promise<ThirdPartyConfig | undefined> {
    const config = await db.queryOne<ThirdPartyConfig>(
      'SELECT * FROM third_party_configs WHERE id = ?',
      [id]
    );
    return config ?? undefined;
  }

  async getConfigs(params?: { platform_type?: PlatformType; status?: string }): Promise<ThirdPartyConfig[]> {
    let sql = 'SELECT * FROM third_party_configs WHERE 1=1';
    const values: any[] = [];

    if (params?.platform_type) {
      sql += ' AND platform_type = ?';
      values.push(params.platform_type);
    }

    if (params?.status) {
      sql += ' AND status = ?';
      values.push(params.status);
    }

    sql += ' ORDER BY created_at DESC';

    return db.query<ThirdPartyConfig>(sql, values);
  }

  async updateConfig(id: string, params: UpdateThirdPartyConfigParams): Promise<ThirdPartyConfig | undefined> {
    const updates: string[] = [];
    const values: any[] = [];

    if (params.name !== undefined) {
      updates.push('name = ?');
      values.push(params.name);
    }

    if (params.corp_id !== undefined) {
      updates.push('corp_id = ?');
      values.push(params.corp_id || null);
    }

    if (params.agent_id !== undefined) {
      updates.push('agent_id = ?');
      values.push(params.agent_id || null);
    }

    if (params.app_id !== undefined) {
      updates.push('app_id = ?');
      values.push(params.app_id || null);
    }

    if (params.app_secret !== undefined) {
      updates.push('app_secret = ?');
      values.push(params.app_secret || null);
    }

    if (params.sync_departments !== undefined) {
      updates.push('sync_departments = ?');
      values.push(params.sync_departments);
    }

    if (params.sync_employees !== undefined) {
      updates.push('sync_employees = ?');
      values.push(params.sync_employees);
    }

    if (params.sync_enabled !== undefined) {
      updates.push('sync_enabled = ?');
      values.push(params.sync_enabled);
    }

    if (params.sync_interval !== undefined) {
      updates.push('sync_interval = ?');
      values.push(params.sync_interval);
    }

    if (params.config !== undefined) {
      updates.push('config = ?');
      values.push(params.config ? JSON.stringify(params.config) : null);
    }

    if (params.status !== undefined) {
      updates.push('status = ?');
      values.push(params.status);
    }

    if (updates.length === 0) {
      return this.getConfigById(id);
    }

    await db.execute(
      `UPDATE third_party_configs SET ${updates.join(', ')} WHERE id = ?`,
      [...values, id]
    );

    return this.getConfigById(id);
  }

  async deleteConfig(id: string): Promise<boolean> {
    const result = await db.execute(
      'DELETE FROM third_party_configs WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  async updateAccessToken(id: string, accessToken: string, expireTime: Date): Promise<void> {
    await db.execute(
      'UPDATE third_party_configs SET access_token = ?, token_expire_time = ? WHERE id = ?',
      [accessToken, expireTime, id]
    );
  }

  async updateSyncStatus(id: string, status: 'success' | 'failed' | 'partial'): Promise<void> {
    await db.execute(
      'UPDATE third_party_configs SET last_sync_time = NOW(), last_sync_status = ? WHERE id = ?',
      [status, id]
    );
  }
}

export class SyncLogService {
  async createLog(params: {
    config_id: string;
    platform_type: PlatformType;
    sync_type: SyncType;
    sync_mode: SyncMode;
  }): Promise<SyncLog> {
    const id = uuidv4();

    await db.execute(
      `INSERT INTO sync_logs (
        id, config_id, platform_type, sync_type, sync_mode, status,
        total_count, success_count, failed_count, created_count, updated_count, deleted_count
      ) VALUES (?, ?, ?, ?, ?, 'success', 0, 0, 0, 0, 0, 0)`,
      [id, params.config_id, params.platform_type, params.sync_type, params.sync_mode]
    );

    return this.getLogById(id) as Promise<SyncLog>;
  }

  async getLogById(id: string): Promise<SyncLog | undefined> {
    const log = await db.queryOne<SyncLog>(
      'SELECT * FROM sync_logs WHERE id = ?',
      [id]
    );
    return log ?? undefined;
  }

  async getLogs(params?: {
    config_id?: string;
    platform_type?: PlatformType;
    status?: string;
    limit?: number;
  }): Promise<SyncLog[]> {
    let sql = 'SELECT * FROM sync_logs WHERE 1=1';
    const values: any[] = [];

    if (params?.config_id) {
      sql += ' AND config_id = ?';
      values.push(params.config_id);
    }

    if (params?.platform_type) {
      sql += ' AND platform_type = ?';
      values.push(params.platform_type);
    }

    if (params?.status) {
      sql += ' AND status = ?';
      values.push(params.status);
    }

    sql += ' ORDER BY created_at DESC';

    if (params?.limit) {
      sql += ' LIMIT ?';
      values.push(params.limit);
    }

    return db.query<SyncLog>(sql, values);
  }

  async updateLog(id: string, params: {
    status?: 'success' | 'failed' | 'partial';
    total_count?: number;
    success_count?: number;
    failed_count?: number;
    created_count?: number;
    updated_count?: number;
    deleted_count?: number;
    end_time?: Date;
    duration?: number;
    error_message?: string;
    details?: Record<string, any>;
  }): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];

    if (params.status !== undefined) {
      updates.push('status = ?');
      values.push(params.status);
    }

    if (params.total_count !== undefined) {
      updates.push('total_count = ?');
      values.push(params.total_count);
    }

    if (params.success_count !== undefined) {
      updates.push('success_count = ?');
      values.push(params.success_count);
    }

    if (params.failed_count !== undefined) {
      updates.push('failed_count = ?');
      values.push(params.failed_count);
    }

    if (params.created_count !== undefined) {
      updates.push('created_count = ?');
      values.push(params.created_count);
    }

    if (params.updated_count !== undefined) {
      updates.push('updated_count = ?');
      values.push(params.updated_count);
    }

    if (params.deleted_count !== undefined) {
      updates.push('deleted_count = ?');
      values.push(params.deleted_count);
    }

    if (params.end_time !== undefined) {
      updates.push('end_time = ?');
      values.push(params.end_time);
    }

    if (params.duration !== undefined) {
      updates.push('duration = ?');
      values.push(params.duration);
    }

    if (params.error_message !== undefined) {
      updates.push('error_message = ?');
      values.push(params.error_message || null);
    }

    if (params.details !== undefined) {
      updates.push('details = ?');
      values.push(params.details ? JSON.stringify(params.details) : null);
    }

    if (updates.length === 0) return;

    await db.execute(
      `UPDATE sync_logs SET ${updates.join(', ')} WHERE id = ?`,
      [...values, id]
    );
  }
}

export const thirdPartyConfigService = new ThirdPartyConfigService();
export const syncLogService = new SyncLogService();
