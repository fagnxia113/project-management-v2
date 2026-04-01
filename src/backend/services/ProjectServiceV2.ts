/**
 * ProjectServiceV2
 *
 * 项目服务 - 使用 Prisma ORM + Repository
 */
import { ProjectRepository, projectRepository } from '../repository/ProjectRepository.js'
import { Prisma } from '@prisma/client'
import { equipmentServiceV3 } from './EquipmentServiceV3.js'
import { BaseService } from './BaseService.js'
import { cacheService } from './CacheService.js'

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

export class ProjectServiceV2 extends BaseService<Project> {
  constructor(repo: ProjectRepository = projectRepository) {
    super(repo)
  }

  async createProject(data: Partial<Project>): Promise<Project> {
    return (await this.create(data as any)) as Project
  }

  async getProjectById(id: string): Promise<Project | null> {
    const cacheKey = cacheService.generateKey('project', id)
    const cachedProject = cacheService.get(cacheKey)
    if (cachedProject) {
      return cachedProject
    }

    const project = (await this.getById(id)) as Project | null
    if (project) {
      cacheService.set(cacheKey, project)
    }
    return project
  }

  async getProjects(params: {
    search?: string
    status?: string
    manager_id?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: Project[]; total: number }> {
    const cacheKey = cacheService.generateKey('projects', params)
    const cachedProjects = cacheService.get(cacheKey)
    if (cachedProjects) {
      return cachedProjects
    }

    const projects = await this.getMany(params as any)
    cacheService.set(cacheKey, projects, 2 * 60 * 1000) // 缓存2分钟
    return projects
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    const project = (await this.update(id, data as any)) as unknown as Project
    if (data.manager_id) {
      await equipmentServiceV3.syncKeepersByLocation(project.id, data.manager_id);
    }
    
    // 清除缓存
    const cacheKey = cacheService.generateKey('project', id)
    cacheService.delete(cacheKey)
    // 清除列表缓存
    cacheService.clear()
    
    return project
  }

  async deleteProject(id: string): Promise<void> {
    await this.delete(id)
    
    // 清除缓存
    const cacheKey = cacheService.generateKey('project', id)
    cacheService.delete(cacheKey)
    // 清除列表缓存
    cacheService.clear()
  }

  async getProjectsByCustomer(customerId: string): Promise<Project[]> {
    return (await this.getMany({ 
      customer_id: customerId 
    })).data as Project[]
  }

  async getProjectsByManager(managerId: string): Promise<Project[]> {
    return (await this.getMany({ 
      manager_id: managerId 
    })).data as Project[]
  }
}

export const projectServiceV2 = new ProjectServiceV2()
