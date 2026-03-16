import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 数据库连接池
 */
class Database {
  private pool: mysql.Pool | null = null;

  /**
   * 创建连接池
   */
  async connect(): Promise<void> {
    try {
      this.pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'project_management_v2',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        timezone: '+08:00',
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        connectTimeout: 60000,
        charset: 'utf8mb4',
        multipleStatements: false,
        namedPlaceholders: true,
        flags: ['+MULTI_STATEMENTS', '-FOUND_ROWS']
      } as any);

      // 测试连接
      const connection = await this.pool.getConnection();
      console.log('✅ 数据库连接成功');
      connection.release();
    } catch (error) {
      console.error('❌ 数据库连接失败:', error);
      throw error;
    }
  }

  /**
   * 获取连接池实例
   */
  getPool(): mysql.Pool {
    if (!this.pool) {
      throw new Error('数据库连接池未初始化');
    }
    return this.pool;
  }

  /**
   * 执行查询
   */
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const pool = this.getPool();
    const [rows] = await pool.query(sql, params);
    return rows as T[];
  }

  /**
   * 执行单条查询
   */
  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 执行插入
   */
  async insert(sql: string, params?: any[]): Promise<any> {
    const pool = this.getPool();
    const safeParams = params ? params.map(p => p === undefined ? null : p) : [];
    const [result] = await pool.execute(sql, safeParams);
    return result;
  }

  /**
   * 执行更新
   */
  async update(sql: string, params?: any[]): Promise<any> {
    const pool = this.getPool();
    const safeParams = params ? params.map(p => p === undefined ? null : p) : [];
    const [result] = await pool.execute(sql, safeParams);
    return result;
  }

  /**
   * 执行删除
   */
  async delete(sql: string, params?: any[]): Promise<any> {
    return this.insert(sql, params);
  }

  /**
   * 执行SQL语句（通用方法）
   */
  async execute(sql: string, params?: any[]): Promise<any> {
    const pool = this.getPool();
    const safeParams = params ? params.map(p => p === undefined ? null : p) : [];
    const [result] = await pool.execute(sql, safeParams);
    return result;
  }

  /**
   * 关闭连接池
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('数据库连接已关闭');
    }
  }

  /**
   * 开始一个事务，返回获得连接
   */
  async beginTransaction(): Promise<mysql.PoolConnection> {
    const pool = this.getPool();
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    return connection;
  }

  /**
   * 为连接提供统一的 API 封装
   */
  use(connection: mysql.PoolConnection) {
    return {
      query: async <T = any>(sql: string, params?: any[]): Promise<T[]> => {
        const [rows] = await connection.query(sql, params);
        return rows as T[];
      },
      queryOne: async <T = any>(sql: string, params?: any[]): Promise<T | null> => {
        const [rows] = await connection.query(sql, params) as any[];
        return rows.length > 0 ? rows[0] : null;
      },
      execute: async (sql: string, params?: any[]): Promise<any> => {
        const safeParams = params ? params.map(p => p === undefined ? null : p) : [];
        const [result] = await connection.execute(sql, safeParams);
        return result;
      },
      insert: async (sql: string, params?: any[]): Promise<any> => {
        return this.use(connection).execute(sql, params);
      },
      update: async (sql: string, params?: any[]): Promise<any> => {
        return this.use(connection).execute(sql, params);
      },
      delete: async (sql: string, params?: any[]): Promise<any> => {
        return this.use(connection).execute(sql, params);
      }
    };
  }

  /**
   * 自动包裹事务的执行工具
   * 回调参数现在提供一个封装好的上下文对象，其 API 与 db 实例一致
   */
  async executeTransaction<T>(
    callback: (tx: ReturnType<Database['use']>, connection: mysql.PoolConnection) => Promise<T>
  ): Promise<T> {
    const connection = await this.beginTransaction();
    try {
      const tx = this.use(connection);
      const result = await callback(tx, connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

// 导出单例
export const db = new Database();
