import { db } from '../database/connection.js'
import { v4 as uuidv4 } from 'uuid'

interface FormDraft {
  id: string
  userId: string
  templateId: string
  templateKey: string
  formData: Record<string, any>
  status: 'draft' | 'auto_saved'
  createdAt: Date
  updatedAt: Date
  metadata?: {
    title?: string
    description?: string
    businessKey?: string
    businessId?: string
  }
}

interface SaveDraftParams {
  userId: string
  templateId: string
  templateKey: string
  formData: Record<string, any>
  status?: 'draft' | 'auto_saved'
  metadata?: {
    title?: string
    description?: string
    businessKey?: string
    businessId?: string
  }
}

export class FormDraftService {
  async saveDraft(params: SaveDraftParams): Promise<FormDraft> {
    const { userId, templateId, templateKey, formData, status = 'draft', metadata } = params

    const existingDraft = await this.getLatestDraft(userId, templateId)

    const now = new Date()

    if (existingDraft) {
      await db.update(
        `UPDATE form_drafts 
         SET form_data = ?, status = ?, updated_at = ?, metadata = ?
         WHERE id = ?`,
        [
          JSON.stringify(formData),
          status,
          now,
          JSON.stringify(metadata || {}),
          existingDraft.id
        ]
      )

      return {
        ...existingDraft,
        formData,
        status,
        updatedAt: now,
        metadata
      }
    } else {
      const id = uuidv4()
      const draft: FormDraft = {
        id,
        userId,
        templateId,
        templateKey,
        formData,
        status,
        createdAt: now,
        updatedAt: now,
        metadata
      }

      await db.insert(
        `INSERT INTO form_drafts (
          id, user_id, template_id, template_key, 
          form_data, status, created_at, updated_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          draft.id,
          draft.userId,
          draft.templateId,
          draft.templateKey,
          JSON.stringify(draft.formData),
          draft.status,
          draft.createdAt,
          draft.updatedAt,
          JSON.stringify(draft.metadata || {})
        ]
      )

      return draft
    }
  }

  async getDraft(draftId: string): Promise<FormDraft | null> {
    const row = await db.queryOne<any>(
      `SELECT * FROM form_drafts WHERE id = ?`,
      [draftId]
    )

    if (!row) {
      return null
    }

    return this.parseDraftRow(row)
  }

  async getLatestDraft(userId: string, templateId: string): Promise<FormDraft | null> {
    const row = await db.queryOne<any>(
      `SELECT * FROM form_drafts 
       WHERE user_id = ? AND template_id = ? 
       ORDER BY updated_at DESC 
       LIMIT 1`,
      [userId, templateId]
    )

    if (!row) {
      return null
    }

    return this.parseDraftRow(row)
  }

  async getDraftsByUser(
    userId: string,
    options?: {
      templateId?: string
      templateKey?: string
      status?: 'draft' | 'auto_saved'
      limit?: number
      offset?: number
    }
  ): Promise<{ drafts: FormDraft[]; total: number }> {
    let whereClause = 'user_id = ?'
    const params: any[] = [userId]

    if (options?.templateId) {
      whereClause += ' AND template_id = ?'
      params.push(options.templateId)
    }

    if (options?.templateKey) {
      whereClause += ' AND template_key = ?'
      params.push(options.templateKey)
    }

    if (options?.status) {
      whereClause += ' AND status = ?'
      params.push(options.status)
    }

    const limit = options?.limit || 20
    const offset = options?.offset || 0

    const [drafts, countResult] = await Promise.all([
      db.query<any[]>(
        `SELECT * FROM form_drafts 
         WHERE ${whereClause} 
         ORDER BY updated_at DESC 
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
      db.queryOne<any>(
        `SELECT COUNT(*) as total FROM form_drafts WHERE ${whereClause}`,
        params
      )
    ])

    return {
      drafts: drafts.map(row => this.parseDraftRow(row)),
      total: countResult?.total || 0
    }
  }

  async deleteDraft(draftId: string, userId: string): Promise<boolean> {
    const result = await db.execute(
      `DELETE FROM form_drafts 
       WHERE id = ? AND user_id = ?`,
      [draftId, userId]
    )

    return result.affectedRows > 0
  }

  async deleteDraftsByTemplate(userId: string, templateId: string): Promise<number> {
    const result = await db.execute(
      `DELETE FROM form_drafts 
       WHERE user_id = ? AND template_id = ?`,
      [userId, templateId]
    )

    return result.affectedRows
  }

  async deleteOldDrafts(userId: string, daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const result = await db.execute(
      `DELETE FROM form_drafts 
       WHERE user_id = ? AND updated_at < ?`,
      [userId, cutoffDate]
    )

    return result.affectedRows
  }

  async restoreDraft(draftId: string, userId: string): Promise<FormDraft | null> {
    const draft = await this.getDraft(draftId)

    if (!draft || draft.userId !== userId) {
      return null
    }

    return draft
  }

  async getDraftsByBusiness(
    userId: string,
    businessKey?: string,
    businessId?: string
  ): Promise<FormDraft[]> {
    let whereClause = 'user_id = ?'
    const params: any[] = [userId]

    if (businessKey) {
      whereClause += ' AND JSON_EXTRACT(metadata, "$.businessKey") = ?'
      params.push(businessKey)
    }

    if (businessId) {
      whereClause += ' AND JSON_EXTRACT(metadata, "$.businessId") = ?'
      params.push(businessId)
    }

    const rows = await db.query<any[]>(
      `SELECT * FROM form_drafts 
       WHERE ${whereClause} 
       ORDER BY updated_at DESC`,
      params
    )

    return rows.map(row => this.parseDraftRow(row))
  }

  async getDraftStats(userId: string): Promise<{
    totalDrafts: number
    autoSavedDrafts: number
    manualDrafts: number
    draftsByTemplate: Record<string, number>
  }> {
    const rows = await db.query<any[]>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'auto_saved' THEN 1 ELSE 0 END) as auto_saved,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as manual,
        template_key,
        COUNT(*) as count
       FROM form_drafts 
       WHERE user_id = ? 
       GROUP BY template_key`,
      [userId]
    )

    const stats = {
      totalDrafts: 0,
      autoSavedDrafts: 0,
      manualDrafts: 0,
      draftsByTemplate: {} as Record<string, number>
    }

    for (const row of rows) {
      stats.totalDrafts += row.total
      stats.autoSavedDrafts += row.auto_saved
      stats.manualDrafts += row.manual
      stats.draftsByTemplate[row.template_key] = row.count
    }

    return stats
  }

  async mergeDraftWithFormData(
    draftId: string,
    userId: string,
    currentFormData: Record<string, any>
  ): Promise<Record<string, any>> {
    const draft = await this.getDraft(draftId)

    if (!draft || draft.userId !== userId) {
      return currentFormData
    }

    return {
      ...draft.formData,
      ...currentFormData
    }
  }

  private parseDraftRow(row: any): FormDraft {
    return {
      id: row.id,
      userId: row.user_id,
      templateId: row.template_id,
      templateKey: row.template_key,
      formData: JSON.parse(row.form_data),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }
  }
}

export const formDraftService = new FormDraftService()
