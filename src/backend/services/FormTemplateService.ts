import { db } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
import { FormTemplate, FormField } from '../types/workflow.js';

class FormTemplateService {
  async createTemplate(template: Omit<FormTemplate, 'id' | 'version'>): Promise<FormTemplate> {
    const id = uuidv4();
    const newTemplate: FormTemplate = {
      ...template,
      id,
      version: 1
    };

    await db.insert(
      `INSERT INTO form_templates (id, name, version, layout, fields, sections, style, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        template.name,
        1,
        JSON.stringify(template.layout),
        JSON.stringify(template.fields),
        template.sections ? JSON.stringify(template.sections) : null,
        template.style ? JSON.stringify(template.style) : null,
        new Date(),
        new Date()
      ]
    );

    return newTemplate;
  }

  async getTemplate(id: string): Promise<FormTemplate | null> {
    const row = await db.queryOne<any>(
      `SELECT * FROM form_templates WHERE id = ?`,
      [id]
    );

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      version: row.version,
      layout: typeof row.layout === 'string' ? JSON.parse(row.layout) : row.layout,
      fields: typeof row.fields === 'string' ? JSON.parse(row.fields) : row.fields,
      sections: row.sections ? (typeof row.sections === 'string' ? JSON.parse(row.sections) : row.sections) : undefined,
      style: row.style ? (typeof row.style === 'string' ? JSON.parse(row.style) : row.style) : undefined
    };
  }

  async getTemplateByName(name: string): Promise<FormTemplate | null> {
    const row = await db.queryOne<any>(
      `SELECT * FROM form_templates WHERE name = ? ORDER BY version DESC LIMIT 1`,
      [name]
    );

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      version: row.version,
      layout: typeof row.layout === 'string' ? JSON.parse(row.layout) : row.layout,
      fields: typeof row.fields === 'string' ? JSON.parse(row.fields) : row.fields,
      sections: row.sections ? (typeof row.sections === 'string' ? JSON.parse(row.sections) : row.sections) : undefined,
      style: row.style ? (typeof row.style === 'string' ? JSON.parse(row.style) : row.style) : undefined
    };
  }

  async updateTemplate(id: string, updates: Partial<FormTemplate>): Promise<FormTemplate> {
    const existing = await this.getTemplate(id);
    if (!existing) {
      throw new Error('表单模板不存在');
    }

    const newVersion = existing.version + 1;
    const updatedTemplate: FormTemplate = {
      ...existing,
      ...updates,
      version: newVersion
    };

    await db.update(
      `UPDATE form_templates SET 
        name = ?, 
        version = ?, 
        layout = ?, 
        fields = ?, 
        sections = ?, 
        style = ?, 
        updated_at = ? 
      WHERE id = ?`,
      [
        updatedTemplate.name,
        newVersion,
        JSON.stringify(updatedTemplate.layout),
        JSON.stringify(updatedTemplate.fields),
        updatedTemplate.sections ? JSON.stringify(updatedTemplate.sections) : null,
        updatedTemplate.style ? JSON.stringify(updatedTemplate.style) : null,
        new Date(),
        id
      ]
    );

    return updatedTemplate;
  }

  async deleteTemplate(id: string): Promise<void> {
    await db.delete(
      `DELETE FROM form_templates WHERE id = ?`,
      [id]
    );
  }

  async listTemplates(): Promise<FormTemplate[]> {
    const rows = await db.query<any>(
      `SELECT * FROM form_templates ORDER BY created_at DESC`
    );

    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      version: row.version,
      layout: typeof row.layout === 'string' ? JSON.parse(row.layout) : row.layout,
      fields: typeof row.fields === 'string' ? JSON.parse(row.fields) : row.fields,
      sections: row.sections ? (typeof row.sections === 'string' ? JSON.parse(row.sections) : row.sections) : undefined,
      style: row.style ? (typeof row.style === 'string' ? JSON.parse(row.style) : row.style) : undefined
    }));
  }

  getFieldPermissions(field: FormField, nodeId?: string): {
    visible: boolean;
    editable: boolean;
    required: boolean;
  } {
    if (!field.permissions) {
      return {
        visible: true,
        editable: true,
        required: field.required || false
      };
    }

    if (nodeId && field.permissions.nodePermissions && field.permissions.nodePermissions[nodeId]) {
      return {
        visible: field.permissions.nodePermissions[nodeId].visible,
        editable: field.permissions.nodePermissions[nodeId].editable,
        required: field.permissions.nodePermissions[nodeId].required ?? field.required ?? false
      };
    }

    if (field.permissions.default) {
      return {
        visible: field.permissions.default.visible,
        editable: field.permissions.default.editable,
        required: field.permissions.default.required ?? field.required ?? false
      };
    }

    return {
      visible: true,
      editable: true,
      required: field.required || false
    };
  }

  validateFormData(template: FormTemplate, data: Record<string, any>, nodeId?: string): {
    valid: boolean;
    errors: Record<string, string>;
  } {
    const errors: Record<string, string> = {};

    for (const field of template.fields) {
      const permissions = this.getFieldPermissions(field, nodeId);
      
      if (!permissions.visible) {
        continue;
      }

      const value = data[field.name];

      if (permissions.required && (value === undefined || value === null || value === '')) {
        errors[field.name] = `${field.label}是必填项`;
        continue;
      }

      if (value !== undefined && value !== null && value !== '') {
        if (field.validation) {
          if (field.validation.min !== undefined && typeof value === 'number' && value < field.validation.min) {
            errors[field.name] = field.validation.message || `${field.label}不能小于${field.validation.min}`;
          }

          if (field.validation.max !== undefined && typeof value === 'number' && value > field.validation.max) {
            errors[field.name] = field.validation.message || `${field.label}不能大于${field.validation.max}`;
          }

          if (field.validation.pattern && typeof value === 'string') {
            const regex = new RegExp(field.validation.pattern);
            if (!regex.test(value)) {
              errors[field.name] = field.validation.message || `${field.label}格式不正确`;
            }
          }
        }
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
}

export const formTemplateService = new FormTemplateService();
