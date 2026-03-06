import { db } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowDefinition, WorkflowNode, WorkflowEdge } from '../types/workflow.js';

export class DefinitionService {
  async createDefinition(params: {
    key: string;
    name: string;
    category?: string;
    entity_type?: string;
    bpmn_xml?: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    form_schema?: any[];
    variables?: any[];
    created_by?: string;
  }): Promise<WorkflowDefinition> {
    // 获取当前版本号
    const maxVersion = await this.getMaxVersion(params.key);
    const version = maxVersion + 1;

    const id = `wf-${params.key}-${version}`;
    const definition: WorkflowDefinition = {
      id,
      key: params.key,
      name: params.name,
      version,
      category: params.category,
      entity_type: params.entity_type,
      bpmn_xml: params.bpmn_xml,
      node_config: {
        nodes: params.nodes,
        edges: params.edges
      },
      form_schema: params.form_schema,
      variables: params.variables,
      status: 'active',
      created_by: params.created_by,
      created_at: new Date(),
      updated_at: new Date()
    };

    await db.insert(
      `INSERT INTO workflow_definitions (
        id, \`key\`, name, version, category, entity_type, bpmn_xml, 
        node_config, form_schema, variables, status, created_by, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        definition.id,
        definition.key,
        definition.name,
        definition.version,
        definition.category ?? null,
        definition.entity_type ?? null,
        definition.bpmn_xml ?? null,
        JSON.stringify(definition.node_config),
        JSON.stringify(definition.form_schema),
        JSON.stringify(definition.variables),
        definition.status,
        definition.created_by ?? null,
        definition.created_at,
        definition.updated_at
      ]
    );

    // 停用旧版本
    await this.suspendOldVersions(params.key, version);

    return definition;
  }

  async getDefinition(id: string): Promise<WorkflowDefinition | null> {
    const row = await db.queryOne<any>(
      `SELECT * FROM workflow_definitions WHERE id = ?`,
      [id]
    );

    if (!row) {
      return null;
    }

    return this.parseDefinitionRow(row);
  }

  async getDefinitionByKey(key: string): Promise<WorkflowDefinition | null> {
    const row = await db.queryOne<any>(
      `SELECT * FROM workflow_definitions 
       WHERE \`key\` = ? AND status = 'active' 
       ORDER BY version DESC LIMIT 1`,
      [key]
    );

    if (!row) {
      return null;
    }

    return this.parseDefinitionRow(row);
  }

  async getLatestDefinition(processKey: string): Promise<WorkflowDefinition | null> {
    const row = await db.queryOne<any>(
      `SELECT * FROM workflow_definitions 
       WHERE \`key\` = ? AND status = 'active' 
       ORDER BY version DESC LIMIT 1`,
      [processKey]
    );

    if (!row) {
      return null;
    }

    return this.parseDefinitionRow(row);
  }

  async getDefinitions(params?: {
    category?: string;
    entity_type?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<WorkflowDefinition[]> {
    let whereClause = '';
    const queryParams: any[] = [];

    if (params?.category) {
      whereClause += `${whereClause ? ' AND ' : 'WHERE'} category = ?`;
      queryParams.push(params.category);
    }

    if (params?.entity_type) {
      whereClause += `${whereClause ? ' AND ' : 'WHERE'} entity_type = ?`;
      queryParams.push(params.entity_type);
    }

    if (params?.status) {
      whereClause += `${whereClause ? ' AND ' : 'WHERE'} status = ?`;
      queryParams.push(params.status);
    }

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const offset = (page - 1) * pageSize;

    const rows = await db.query<any>(
      `SELECT * FROM workflow_definitions 
       ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [...queryParams, pageSize, offset]
    );

    return rows.map((row: any) => this.parseDefinitionRow(row));
  }

  async updateDefinition(id: string, updates: Partial<WorkflowDefinition>): Promise<boolean> {
    const existing = await this.getDefinition(id);
    if (!existing) {
      return false;
    }

    const updateFields: string[] = [];
    const updateParams: any[] = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      updateParams.push(updates.name);
    }

    if (updates.category !== undefined) {
      updateFields.push('category = ?');
      updateParams.push(updates.category);
    }

    if (updates.entity_type !== undefined) {
      updateFields.push('entity_type = ?');
      updateParams.push(updates.entity_type);
    }

    if (updates.bpmn_xml !== undefined) {
      updateFields.push('bpmn_xml = ?');
      updateParams.push(updates.bpmn_xml);
    }

    if (updates.node_config !== undefined) {
      updateFields.push('node_config = ?');
      updateParams.push(JSON.stringify(updates.node_config));
    }

    if (updates.form_schema !== undefined) {
      updateFields.push('form_schema = ?');
      updateParams.push(JSON.stringify(updates.form_schema));
    }

    if (updates.variables !== undefined) {
      updateFields.push('variables = ?');
      updateParams.push(JSON.stringify(updates.variables));
    }

    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      updateParams.push(updates.status);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    if (updateFields.length > 1) {
      await db.update(
        `UPDATE workflow_definitions SET ${updateFields.join(', ')} WHERE id = ?`,
        [...updateParams, id]
      );
    }

    return true;
  }

  async deleteDefinition(id: string): Promise<boolean> {
    const definition = await this.getDefinition(id);
    if (!definition) {
      return false;
    }

    if (definition.status === 'archived') {
      const result = await db.delete(
        `DELETE FROM workflow_definitions WHERE id = ?`,
        [id]
      );
      return !!result;
    } else {
      const result = await db.update(
        `UPDATE workflow_definitions SET status = 'archived' WHERE id = ?`,
        [id]
      );
      return !!result;
    }
  }

  async activateDefinition(id: string): Promise<boolean> {
    const definition = await this.getDefinition(id);
    if (!definition) {
      return false;
    }

    // 停用其他版本
    await this.suspendOldVersions(definition.key, definition.version);

    await db.update(
      `UPDATE workflow_definitions SET status = 'active' WHERE id = ?`,
      [id]
    );

    return true;
  }

  async getMaxVersion(keyOrParams: string | { key: string; category?: string; entity_type?: string }): Promise<number> {
    const key = typeof keyOrParams === 'string' ? keyOrParams : keyOrParams.key;
    const category = typeof keyOrParams === 'string' ? undefined : keyOrParams.category;
    const entity_type = typeof keyOrParams === 'string' ? undefined : keyOrParams.entity_type;

    let whereClause = '`key` = ?';
    const queryParams: any[] = [key];

    if (category) {
      whereClause += ' AND category = ?';
      queryParams.push(category);
    }

    if (entity_type) {
      whereClause += ' AND entity_type = ?';
      queryParams.push(entity_type);
    }

    const row = await db.queryOne<any>(
      `SELECT MAX(version) as max_version FROM workflow_definitions WHERE ${whereClause}`,
      queryParams
    );

    return row?.max_version || 0;
  }

  private async suspendOldVersions(key: string, currentVersion: number): Promise<void> {
    await db.update(
      `UPDATE workflow_definitions SET status = 'suspended' 
       WHERE \`key\` = ? AND version != ? AND status = 'active'`,
      [key, currentVersion]
    );
  }

  private parseDefinitionRow(row: any): WorkflowDefinition {
    // 处理可能的JSON字符串或已解析的对象
    const parseJSON = (value: any): any => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'object') return value;
      try {
        return JSON.parse(String(value));
      } catch {
        return null;
      }
    };

    const nodeConfig = parseJSON(row.node_config) || {};
    const formSchema = parseJSON(row.form_schema);
    const variables = parseJSON(row.variables);

    // 节点类型映射：数据库类型 -> 引擎类型
    const typeMap: Record<string, string> = {
      'start': 'startEvent',
      'end': 'endEvent',
      'approval': 'userTask',
      'service': 'serviceTask',
      'exclusive': 'exclusiveGateway',
      'parallel': 'parallelGateway'
    };

    // 转换节点类型
    const nodes = (nodeConfig.nodes || []).map((node: any) => ({
      ...node,
      type: typeMap[node.type] || node.type
    }));

    return {
      id: row.id,
      key: row.key,
      name: row.name,
      version: row.version,
      category: row.category,
      entity_type: row.entity_type,
      bpmn_xml: row.bpmn_xml,
      node_config: {
        nodes,
        edges: nodeConfig.edges || []
      },
      form_schema: formSchema,
      variables: variables,
      status: row.status,
      created_by: row.created_by,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}

export const definitionService = new DefinitionService();
