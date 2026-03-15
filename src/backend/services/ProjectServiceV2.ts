/**
 * ProjectServiceV2
 *
 * 项目服务 - 使用 Prisma ORM + Repository
 */
import { ProjectRepository, projectRepository } from '../repository/ProjectRepository.js'
import { Prisma } from '@prisma/client'
import { equipmentServiceV3 } from './EquipmentServiceV3.js'

export interface Project {
  id: string
  code: string
  name: string
  type?: 'domestic' | 'overseas' | 'internal'
  manager_id?: string
  technical_lead_id?: string
  status?: string
  country?: string
  address?: string
  progress?: number
  start_date?: string
  end_date?: string
  budget?: number
  customer_id?: string
  description?: string
  created_at?: string
  updated_at?: string
}

export class ProjectServiceV2 {
  private repo: ProjectRepository

  constructor(repo: ProjectRepository = projectRepository) {
    this.repo = repo
  }

  async createProject(data: Partial<Project>): Promise<Project> {
    return (await this.repo.create(data as any)) as Project
  }

  async getProjectById(id: string): Promise<Project | null> {
    return (await this.repo.findById(id)) as Project | null
  }

  async getProjects(params: {
    search?: string
    status?: string
    manager_id?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: Project[]; total: number }> {
    return await this.repo.findMany(params as any)
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    const project = (await this.repo.update(id, data as any)) as unknown as Project
    if (data.manager_id) {
      await equipmentServiceV3.syncKeepersByLocation(project.id, data.manager_id);
    }
    return project
  }

  async deleteProject(id: string): Promise<void> {
    await this.repo.delete(id)
  }

  async getProjectsByCustomer(customerId: string): Promise<Project[]> {
    return (await this.repo.findMany({ 
      customer_id: customerId 
    })).data as Project[]
  }

  async getProjectsByManager(managerId: string): Promise<Project[]> {
    return (await this.repo.findMany({ 
      manager_id: managerId 
    })).data as Project[]
  }
}

export const projectServiceV2 = new ProjectServiceV2()
