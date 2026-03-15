import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection.js';
import { logger } from '../utils/logger.js';

export interface ClockInDto {
  employee_id: string;
  project_id?: string;
  latitude: number;
  longitude: number;
  location_name: string;
  photo?: string;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  project_id?: string;
  date: string;
  check_in_time?: Date;
  check_in_status?: string;
  check_out_time?: Date;
  check_out_status?: string;
  work_status: 'on_duty' | 'off' | 'leave' | 'business_trip' | 'overtime';
  is_verified: boolean;
}

export class AttendanceService {
  /**
   * 上班打卡
   */
  async clockIn(dto: ClockInDto): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    
    // 检查项目位置偏移
    let status: 'normal' | 'outside' = 'normal';
    if (dto.project_id) {
      const isWithin = await this.checkGeoFence(dto.project_id, dto.latitude, dto.longitude);
      if (!isWithin) status = 'outside';
    }

    const id = uuidv4();
    const now = new Date();

    await db.execute(
      `INSERT INTO attendance_records (
        id, employee_id, project_id, \`date\`, 
        check_in_time, check_in_location_name, check_in_latitude, check_in_longitude, 
        check_in_photo, check_in_status, work_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'on_duty')
      ON DUPLICATE KEY UPDATE 
        check_in_time = VALUES(check_in_time),
        check_in_status = VALUES(check_in_status),
        work_status = 'on_duty'`,
      [
        id, dto.employee_id, dto.project_id || null, today,
        now, dto.location_name, dto.latitude, dto.longitude,
        dto.photo || null, status
      ]
    );

    return { success: true, time: now, status };
  }

  /**
   * 下班打卡
   */
  async clockOut(dto: ClockInDto): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    let status: 'normal' | 'outside' = 'normal';
    if (dto.project_id) {
      const isWithin = await this.checkGeoFence(dto.project_id, dto.latitude, dto.longitude);
      if (!isWithin) status = 'outside';
    }

    await db.execute(
      `UPDATE attendance_records SET 
        check_out_time = ?, 
        check_out_location_name = ?, 
        check_out_latitude = ?, 
        check_out_longitude = ?, 
        check_out_photo = ?, 
        check_out_status = ?,
        updated_at = NOW()
      WHERE employee_id = ? AND \`date\` = ?`,
      [
        now, dto.location_name, dto.latitude, dto.longitude,
        dto.photo || null, status,
        dto.employee_id, today
      ]
    );

    return { success: true, time: now, status };
  }

  /**
   * 检查地理围栏
   */
  private async checkGeoFence(projectId: string, lat: number, lng: number): Promise<boolean> {
    const location = await db.queryOne(
      'SELECT latitude, longitude, radius FROM project_locations WHERE project_id = ?',
      [projectId]
    );

    if (!location) return true; // 如果没设坐标，默认允许

    const distance = this.calculateDistance(lat, lng, location.latitude, location.longitude);
    return distance <= location.radius;
  }

  /**
   * 计算地球两点间距离 (米)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * 获取全员考勤一览 (200人看板)
   */
  async getAllPersonnelStatus(date: string): Promise<any[]> {
    return await db.query(
      `SELECT 
        e.id, e.name, e.employee_no, e.avatar_color,
        p.name as project_name, p.code as project_code,
        ar.check_in_time, ar.check_out_time, ar.work_status,
        dr.id as daily_report_id,
        CASE 
          WHEN ar.check_in_time IS NOT NULL AND ar.check_out_time IS NOT NULL AND dr.id IS NOT NULL THEN 'completed'
          WHEN ar.check_in_time IS NOT NULL THEN 'on_duty'
          ELSE 'off'
        END as display_status
      FROM employees e
      LEFT JOIN attendance_records ar ON e.id = ar.employee_id AND ar.\`date\` = ?
      LEFT JOIN projects p ON ar.project_id = p.id
      LEFT JOIN daily_reports dr ON e.id = dr.employee_id AND dr.report_date = ?
      WHERE e.status = 'active'
      ORDER BY e.name ASC`,
      [date, date]
    );
  }

  /**
   * 获取项目考勤核对表 (PM视图)
   */
  async getProjectAttendance(projectId: string, startDate: string, endDate: string): Promise<any[]> {
    return await db.query(
      `SELECT 
        e.name, e.employee_no,
        ar.*,
        dr.id as daily_report_id, dr.summary as daily_summary
      FROM attendance_records ar
      JOIN employees e ON ar.employee_id = e.id
      LEFT JOIN daily_reports dr ON ar.employee_id = dr.employee_id AND ar.\`date\` = dr.report_date
      WHERE ar.project_id = ? AND ar.\`date\` BETWEEN ? AND ?
      ORDER BY ar.\`date\` DESC, e.name ASC`,
      [projectId, startDate, endDate]
    );
  }

  /**
   * 获取个人详细打卡+日报记录
   */
  async getEmployeeHistory(employeeId: string): Promise<any> {
    const employee = await db.queryOne('SELECT * FROM employees WHERE id = ?', [employeeId]);
    const history = await db.query(
      `SELECT 
        ar.*, p.name as project_name,
        dr.id as daily_report_id, dr.summary as daily_summary, dr.checkload_items
      FROM attendance_records ar
      LEFT JOIN projects p ON ar.project_id = p.id
      LEFT JOIN daily_reports dr ON ar.employee_id = dr.employee_id AND ar.\`date\` = dr.report_date
      WHERE ar.employee_id = ?
      ORDER BY ar.\`date\` DESC
      LIMIT 30`,
      [employeeId]
    );
    
    return { employee, history };
  }
}

export const attendanceService = new AttendanceService();
