import {
  ThirdPartyConfig,
  SyncResult,
  ThirdPartyDepartment,
  ThirdPartyEmployee,
  PlatformType
} from '../types/organization.js';
import { BaseThirdPartyAdapter, thirdPartyConfigService, syncLogService } from './ThirdPartyService.js';
import { departmentService } from './DepartmentService.js';

interface WeChatWorkTokenResponse {
  errcode: number;
  errmsg: string;
  access_token: string;
  expires_in: number;
}

interface WeChatWorkDepartment {
  id: number;
  name: string;
  parentid: number;
  order: number;
}

interface WeChatWorkUser {
  userid: string;
  name: string;
  department: number[];
  position: string;
  mobile: string;
  email: string;
  avatar: string;
  status: number;
}

export class WeChatWorkAdapter extends BaseThirdPartyAdapter {
  private baseUrl = 'https://qyapi.weixin.qq.com/cgi-bin';

  constructor(config: ThirdPartyConfig) {
    super(config);
  }

  async getAccessToken(): Promise<string> {
    if (this.config.access_token && this.config.token_expire_time) {
      const expireTime = new Date(this.config.token_expire_time);
      if (expireTime > new Date(Date.now() + 5 * 60 * 1000)) {
        return this.config.access_token;
      }
    }

    const response = await fetch(
      `${this.baseUrl}/gettoken?corpid=${this.config.corp_id}&corpsecret=${this.config.app_secret}`
    );

    const data: WeChatWorkTokenResponse = await response.json();

    if (data.errcode !== 0) {
      throw new Error(`获取企业微信access_token失败: ${data.errmsg}`);
    }

    const expireTime = new Date(Date.now() + data.expires_in * 1000);
    await thirdPartyConfigService.updateAccessToken(this.config.id, data.access_token, expireTime);

    return data.access_token;
  }

  async getDepartments(): Promise<ThirdPartyDepartment[]> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(
      `${this.baseUrl}/department/list?access_token=${accessToken}`
    );

    const data = await response.json();

    if (data.errcode !== 0) {
      throw new Error(`获取企业微信部门列表失败: ${data.errmsg}`);
    }

    return data.department.map((dept: WeChatWorkDepartment) => ({
      id: String(dept.id),
      name: dept.name,
      parent_id: dept.parentid ? String(dept.parentid) : undefined,
      order: dept.order
    }));
  }

  async getEmployees(departmentId?: string): Promise<ThirdPartyEmployee[]> {
    const accessToken = await this.getAccessToken();

    let url = `${this.baseUrl}/user/list?access_token=${accessToken}`;
    if (departmentId) {
      url = `${this.baseUrl}/user/list?access_token=${accessToken}&department_id=${departmentId}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.errcode !== 0) {
      throw new Error(`获取企业微信员工列表失败: ${data.errmsg}`);
    }

    return data.userlist.map((user: WeChatWorkUser) => ({
      id: user.userid,
      name: user.name,
      department_ids: user.department.map(String),
      position: user.position,
      mobile: user.mobile,
      email: user.email,
      avatar: user.avatar,
      status: user.status
    }));
  }

  async syncDepartments(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      message: '同步成功',
      total_count: 0,
      success_count: 0,
      failed_count: 0,
      created_count: 0,
      updated_count: 0,
      errors: []
    };

    try {
      const wechatDepartments = await this.getDepartments();
      result.total_count = wechatDepartments.length;

      const idMapping: Record<string, string> = {};

      const sortedDepts = [...wechatDepartments].sort((a, b) => {
        if (!a.parent_id) return -1;
        if (!b.parent_id) return 1;
        return 0;
      });

      for (const wechatDept of sortedDepts) {
        try {
          const existingDept = await this.findDepartmentByThirdPartyId(wechatDept.id);

          if (existingDept) {
            await departmentService.updateDepartment(existingDept.id, {
              name: wechatDept.name,
              sort_order: wechatDept.order || 0
            });
            idMapping[wechatDept.id] = existingDept.id;
            result.updated_count++;
          } else {
            const newDept = await departmentService.createDepartment({
              name: wechatDept.name,
              parent_id: wechatDept.parent_id ? idMapping[wechatDept.parent_id] : undefined,
              sort_order: wechatDept.order || 0
            });

            await this.updateDepartmentThirdPartyId(newDept.id, wechatDept.id, 'wechat_work');
            idMapping[wechatDept.id] = newDept.id;
            result.created_count++;
          }

          result.success_count++;
        } catch (error: any) {
          result.failed_count++;
          result.errors?.push({
            id: wechatDept.id,
            name: wechatDept.name,
            error: error.message
          });
        }
      }

      if (result.failed_count > 0) {
        result.success = false;
        result.message = `同步完成，成功 ${result.success_count} 条，失败 ${result.failed_count} 条`;
      }
    } catch (error: any) {
      result.success = false;
      result.message = error.message;
    }

    return result;
  }

  private async findDepartmentByThirdPartyId(thirdPartyId: string): Promise<any> {
    const result = await fetch(
      `${process.env.API_BASE_URL || 'http://localhost:8081'}/api/organization/departments?include_inactive=true`
    );
    const data = await result.json();
    
    if (data.success && Array.isArray(data.data)) {
      return data.data.find((dept: any) => 
        dept.third_party_id === thirdPartyId && 
        dept.third_party_source === 'wechat_work'
      );
    }
    return null;
  }

  private async updateDepartmentThirdPartyId(
    departmentId: string, 
    thirdPartyId: string, 
    source: PlatformType
  ): Promise<void> {
    const { db } = await import('../database/connection.js');
    await db.execute(
      'UPDATE departments SET third_party_id = ?, third_party_source = ? WHERE id = ?',
      [thirdPartyId, source, departmentId]
    );
  }

  async syncEmployees(): Promise<SyncResult> {
    return {
      success: false,
      message: '员工同步功能待实现',
      total_count: 0,
      success_count: 0,
      failed_count: 0,
      created_count: 0,
      updated_count: 0
    };
  }
}

export function createWeChatWorkAdapter(config: ThirdPartyConfig): WeChatWorkAdapter {
  return new WeChatWorkAdapter(config);
}
