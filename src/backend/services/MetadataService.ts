import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '../database/connection.js';

/**
 * 字段定义
 */
export interface FieldDefinition {
  type: string;
  label: string;
  primaryKey?: boolean;
  required?: boolean;
  unique?: boolean;
  autoGenerate?: string;
  default?: any;
  min?: number;
  max?: number;
  relatedEntity?: string;
  refEntity?: string;
  refDisplay?: string;
  relationField?: string;
  itemType?: string;
  computed?: boolean;
  autoValue?: string;
}

/**
 * 实体定义
 */
export interface EntityDefinition {
  name: string;
  table: string;
  isView?: boolean;
  fields: Record<string, FieldDefinition>;
}

/**
 * 枚举值定义
 */
export interface EnumValue {
  value: string;
  label: string;
  color?: string;
  order?: number;
}

/**
 * 枚举定义
 */
export interface EnumDefinition {
  label: string;
  values: EnumValue[];
}

/**
 * 元数据服务
 * 提供实体和枚举的元数据访问
 */
export class MetadataService {
  private entities: Record<string, EntityDefinition> = {};
  private enums: Record<string, EnumDefinition> = {};

  /**
   * 加载元数据
   */
  async load(): Promise<void> {
    try {
      // 加载实体元数据
      const entityPath = join(process.cwd(), 'src/core/metadata/EntityMeta.json');
      const entityData = JSON.parse(readFileSync(entityPath, 'utf-8'));
      this.entities = entityData.entities;

      // 加载枚举元数据
      const enumPath = join(process.cwd(), 'src/core/metadata/EnumConfig.json');
      const enumData = JSON.parse(readFileSync(enumPath, 'utf-8'));
      this.enums = enumData.enums;

      console.log('✅ 元数据加载成功');
      console.log(`   - 实体数量: ${Object.keys(this.entities).length}`);
      console.log(`   - 枚举数量: ${Object.keys(this.enums).length}`);
    } catch (error) {
      console.error('❌ 元数据加载失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有实体
   */
  getEntities(): Record<string, EntityDefinition> {
    return this.entities;
  }

  /**
   * 获取单个实体
   */
  getEntity(entityName: string): EntityDefinition | undefined {
    return this.entities[entityName];
  }

  /**
   * 获取所有枚举
   */
  getEnums(): Record<string, EnumDefinition> {
    return this.enums;
  }

  /**
   * 获取单个枚举
   */
  getEnum(enumName: string): EnumDefinition | undefined {
    return this.enums[enumName];
  }

  /**
   * 获取单个字段的定义
   */
  getField(entityName: string, fieldName: string): FieldDefinition | undefined {
    const entity = this.getEntity(entityName);
    return entity?.fields[fieldName];
  }

  /**
   * 生成主键UUID
   */
  generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * 生成自动编号
   */
  async generateAutoCode(entityName: string, format: string): Promise<string> {
    // 提取表名
    const entity = this.getEntity(entityName);
    if (!entity) {
      throw new Error(`实体 ${entityName} 不存在`);
    }

    // 查询当前最大编号
    const tableName = entity.table;
    const result = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${tableName}`
    );

    const seq = (result?.count || 0) + 1;
    const seqStr = String(seq).padStart(5, '0');

    // 替换模板
    return format
      .replace('{seq}', seqStr)
      .replace('{date}', new Date().toISOString().slice(0, 10).replace(/-/g, ''))
      .replace('{datetime}', new Date().toISOString().slice(0, 16).replace(/[-:T]/g, ''));
  }

  /**
   * 处理自动生成字段
   */
  async processAutoFields(
    entityName: string,
    data: Record<string, any>
  ): Promise<Record<string, any>> {
    const entity = this.getEntity(entityName);
    if (!entity) {
      throw new Error(`实体 ${entityName} 不存在`);
    }

    const processedData = { ...data };

    for (const [fieldName, fieldDef] of Object.entries(entity.fields)) {
      // 主键自动生成UUID
      if (fieldDef.primaryKey && fieldDef.type === 'uuid' && !data[fieldName]) {
        processedData[fieldName] = this.generateId();
      }

      // 自动编号
      if (fieldDef.autoGenerate && !data[fieldName]) {
        processedData[fieldName] = await this.generateAutoCode(entityName, fieldDef.autoGenerate);
      }

      // 默认值
      if (fieldDef.default !== undefined && data[fieldName] === undefined) {
        processedData[fieldName] = fieldDef.default;
      }
    }

    return processedData;
  }

  /**
   * 处理时间戳自动更新
   */
  addTimestampFields(entityName: string, data: Record<string, any>, isUpdate: boolean = false): Record<string, any> {
    const entity = this.getEntity(entityName);
    if (!entity) {
      return data;
    }

    const processedData = { ...data };

    for (const [fieldName, fieldDef] of Object.entries(entity.fields)) {
      if (fieldDef.type === 'datetime' || fieldDef.type === 'timestamp') {
        if (fieldDef.autoValue === 'now' && !isUpdate && !data[fieldName]) {
          processedData[fieldName] = new Date();
        } else if (fieldDef.autoValue === 'now_on_update' && !data[fieldName]) {
          processedData[fieldName] = new Date();
        }
      }

      if (fieldDef.type === 'date' && data[fieldName] === '') {
        processedData[fieldName] = null;
      }
    }

    return processedData;
  }

  /**
   * 获取实体的表名
   */
  getTableName(entityName: string): string {
    const entity = this.getEntity(entityName);
    return entity?.table || entityName.toLowerCase() + 's';
  }

  /**
   * 获取主键字段名
   */
  getPrimaryKey(entityName: string): string {
    const entity = this.getEntity(entityName);
    if (!entity) {
      throw new Error(`实体 ${entityName} 不存在`);
    }

    for (const [fieldName, fieldDef] of Object.entries(entity.fields)) {
      if (fieldDef.primaryKey) {
        return fieldName;
      }
    }

    return 'id';
  }
}

// 导出单例
export const metadataService = new MetadataService();
