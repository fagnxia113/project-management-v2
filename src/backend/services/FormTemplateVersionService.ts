import { db } from '../database/connection.js'
import { v4 as uuidv4 } from 'uuid'

interface FormTemplateVersion {
  id: string
  templateId: string
  version: number
  fields: any[]
  status: 'draft' | 'active' | 'archived'
  createdBy: string
  createdAt: Date
  activatedAt?: Date
  archivedAt?: Date
  notes?: string
  changeLog?: string
}

interface CreateVersionParams {
  templateId: string
  fields: any[]
  status?: 'draft' | 'active'
  createdBy: string
  notes?: string
  changeLog?: string
}

interface ActivateVersionParams {
  versionId: string
  activatedBy: string
}

export class FormTemplateVersionService {
  async createVersion(params: CreateVersionParams): Promise<FormTemplateVersion> {
    const { templateId, fields, status = 'draft', createdBy, notes, changeLog } = params

    const latestVersion = await this.getLatestVersion(templateId)
    const newVersionNumber = latestVersion ? latestVersion.version + 1 : 1

    const id = uuidv4()
    const now = new Date()

    const version: FormTemplateVersion = {
      id,
      templateId,
      version: newVersionNumber,
      fields,
      status,
      createdBy,
      createdAt: now,
      notes,
      changeLog
    }

    await db.insert(
      `INSERT INTO form_template_versions (
        id, template_id, version, fields, status, 
        created_by, created_at, notes, change_log
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        version.id,
        version.templateId,
        version.version,
        JSON.stringify(version.fields),
        version.status,
        version.createdBy,
        version.createdAt,
        version.notes || null,
        version.changeLog || null
      ]
    )

    if (status === 'active') {
      await this.deactivateOtherVersions(templateId, id)
      await this.markVersionAsActivated(id, now)
    }

    return version
  }

  async getVersion(versionId: string): Promise<FormTemplateVersion | null> {
    const row = await db.queryOne<any>(
      `SELECT * FROM form_template_versions WHERE id = ?`,
      [versionId]
    )

    if (!row) {
      return null
    }

    return this.parseVersionRow(row)
  }

  async getLatestVersion(templateId: string): Promise<FormTemplateVersion | null> {
    const row = await db.queryOne<any>(
      `SELECT * FROM form_template_versions 
       WHERE template_id = ? 
       ORDER BY version DESC 
       LIMIT 1`,
      [templateId]
    )

    if (!row) {
      return null
    }

    return this.parseVersionRow(row)
  }

  async getActiveVersion(templateId: string): Promise<FormTemplateVersion | null> {
    const row = await db.queryOne<any>(
      `SELECT * FROM form_template_versions 
       WHERE template_id = ? AND status = 'active' 
       LIMIT 1`,
      [templateId]
    )

    if (!row) {
      return null
    }

    return this.parseVersionRow(row)
  }

  async getAllVersions(
    templateId: string,
    options?: {
      status?: 'draft' | 'active' | 'archived'
      limit?: number
      offset?: number
    }
  ): Promise<{ versions: FormTemplateVersion[]; total: number }> {
    let whereClause = 'template_id = ?'
    const params: any[] = [templateId]

    if (options?.status) {
      whereClause += ' AND status = ?'
      params.push(options.status)
    }

    const limit = options?.limit || 20
    const offset = options?.offset || 0

    const [versions, countResult] = await Promise.all([
      db.query<any[]>(
        `SELECT * FROM form_template_versions 
         WHERE ${whereClause} 
         ORDER BY version DESC 
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
      db.queryOne<any>(
        `SELECT COUNT(*) as total FROM form_template_versions WHERE ${whereClause}`,
        params
      )
    ])

    return {
      versions: versions.map(row => this.parseVersionRow(row)),
      total: countResult?.total || 0
    }
  }

  async activateVersion(params: ActivateVersionParams): Promise<FormTemplateVersion | null> {
    const { versionId, activatedBy } = params

    const version = await this.getVersion(versionId)
    if (!version) {
      return null
    }

    const now = new Date()

    await db.execute(
      `UPDATE form_template_versions 
       SET status = 'active', activated_at = ? 
       WHERE id = ?`,
      [now, versionId]
    )

    await this.deactivateOtherVersions(version.templateId, versionId)

    return {
      ...version,
      status: 'active',
      activatedAt: now
    }
  }

  async archiveVersion(versionId: string, archivedBy: string): Promise<boolean> {
    const version = await this.getVersion(versionId)
    if (!version) {
      return false
    }

    const now = new Date()

    const result = await db.execute(
      `UPDATE form_template_versions 
       SET status = 'archived', archived_at = ? 
       WHERE id = ?`,
      [now, versionId]
    )

    return result.affectedRows > 0
  }

  async deleteVersion(versionId: string): Promise<boolean> {
    const version = await this.getVersion(versionId)
    if (!version || version.status === 'active') {
      return false
    }

    const result = await db.execute(
      `DELETE FROM form_template_versions WHERE id = ?`,
      [versionId]
    )

    return result.affectedRows > 0
  }

  async compareVersions(
    versionId1: string,
    versionId2: string
  ): Promise<{
    version1: FormTemplateVersion
    version2: FormTemplateVersion
    differences: Array<{
      field: string
      change: 'added' | 'removed' | 'modified'
      oldValue?: any
      newValue?: any
    }>
  }> {
    const [version1, version2] = await Promise.all([
      this.getVersion(versionId1),
      this.getVersion(versionId2)
    ])

    if (!version1 || !version2) {
      throw new Error('版本不存在')
    }

    const differences: Array<{
      field: string
      change: 'added' | 'removed' | 'modified'
      oldValue?: any
      newValue?: any
    }> = []

    const fields1Map = new Map(version1.fields.map((f: any) => [f.name, f]))
    const fields2Map = new Map(version2.fields.map((f: any) => [f.name, f]))

    const allFieldNames = new Set([
      ...fields1Map.keys(),
      ...fields2Map.keys()
    ])

    for (const fieldName of allFieldNames) {
      const field1 = fields1Map.get(fieldName)
      const field2 = fields2Map.get(fieldName)

      if (!field1 && field2) {
        differences.push({
          field: fieldName,
          change: 'added',
          newValue: field2
        })
      } else if (field1 && !field2) {
        differences.push({
          field: fieldName,
          change: 'removed',
          oldValue: field1
        })
      } else if (field1 && field2) {
        const field1Str = JSON.stringify(field1)
        const field2Str = JSON.stringify(field2)

        if (field1Str !== field2Str) {
          differences.push({
            field: fieldName,
            change: 'modified',
            oldValue: field1,
            newValue: field2
          })
        }
      }
    }

    return {
      version1,
      version2,
      differences
    }
  }

  async rollbackToVersion(
    templateId: string,
    targetVersion: number,
    rolledBackBy: string
  ): Promise<FormTemplateVersion | null> {
    const targetVersionRecord = await db.queryOne<any>(
      `SELECT * FROM form_template_versions 
       WHERE template_id = ? AND version = ?`,
      [templateId, targetVersion]
    )

    if (!targetVersionRecord) {
      return null
    }

    const now = new Date()

    await this.createVersion({
      templateId,
      fields: JSON.parse(targetVersionRecord.fields),
      status: 'active',
      createdBy: rolledBackBy,
      notes: `回滚到版本 ${targetVersion}`,
      changeLog: `从版本 ${targetVersion} 回滚`
    })

    return this.parseVersionRow(targetVersionRecord)
  }

  async getVersionHistory(templateId: string): Promise<{
    versions: FormTemplateVersion[]
    timeline: Array<{
      version: number
      action: string
      timestamp: Date
      user: string
      notes?: string
    }>
  }> {
    const { versions } = await this.getAllVersions(templateId)

    const timeline = versions.map(v => ({
      version: v.version,
      action: v.status === 'active' ? '激活' : v.status === 'archived' ? '归档' : '创建',
      timestamp: v.activatedAt || v.archivedAt || v.createdAt,
      user: v.createdBy,
      notes: v.notes
    }))

    return {
      versions,
      timeline: timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    }
  }

  private async deactivateOtherVersions(
    templateId: string,
    excludeVersionId: string
  ): Promise<void> {
    await db.execute(
      `UPDATE form_template_versions 
       SET status = 'archived', archived_at = ? 
       WHERE template_id = ? AND id != ? AND status = 'active'`,
      [new Date(), templateId, excludeVersionId]
    )
  }

  private async markVersionAsActivated(
    versionId: string,
    activatedAt: Date
  ): Promise<void> {
    await db.execute(
      `UPDATE form_template_versions 
       SET activated_at = ? 
       WHERE id = ?`,
      [activatedAt, versionId]
    )
  }

  private parseVersionRow(row: any): FormTemplateVersion {
    return {
      id: row.id,
      templateId: row.template_id,
      version: row.version,
      fields: JSON.parse(row.fields),
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      activatedAt: row.activated_at,
      archivedAt: row.archived_at,
      notes: row.notes,
      changeLog: row.change_log
    }
  }
}

export const formTemplateVersionService = new FormTemplateVersionService()
