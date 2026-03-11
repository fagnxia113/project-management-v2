/**
 * WorkflowServiceV2
 *
 * 工作流服务 - 使用 Prisma ORM + Repository
 */
import { 
  WorkflowInstanceRepository, workflowInstanceRepository,
  WorkflowTaskRepository, workflowTaskRepository,
  WorkflowDefinitionRepository, workflowDefinitionRepository
} from '../repository/index.js'
import { Prisma } from '@prisma/client'

export interface WorkflowInstance {
  id: string
  definition_id: string
  status?: 'pending' | 'running' | 'completed' | 'cancelled' | 'suspended'
  current_node_id?: string
  initiator_id?: string
  business_key?: string
  created_at?: string
  updated_at?: string
}

export interface WorkflowTask {
  id: string
  instance_id: string
  node_id?: string
  assignee_id?: string
  status?: 'created' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  result?: 'approved' | 'rejected' | 'withdrawn' | 'delegated' | 'transferred' | 'skipped'
  created_at?: string
  updated_at?: string
}

export class WorkflowServiceV2 {
  private instanceRepo: WorkflowInstanceRepository
  private taskRepo: WorkflowTaskRepository
  private definitionRepo: WorkflowDefinitionRepository

  constructor(
    instanceRepo: WorkflowInstanceRepository = workflowInstanceRepository,
    taskRepo: WorkflowTaskRepository = workflowTaskRepository,
    definitionRepo: WorkflowDefinitionRepository = workflowDefinitionRepository
  ) {
    this.instanceRepo = instanceRepo
    this.taskRepo = taskRepo
    this.definitionRepo = definitionRepo
  }

  async getInstanceById(id: string): Promise<WorkflowInstance | null> {
    return (await this.instanceRepo.findById(id)) as WorkflowInstance | null
  }

  async getInstances(params: {
    definition_id?: string
    status?: string
    initiator_id?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: WorkflowInstance[]; total: number }> {
    const where: Prisma.workflow_instancesWhereInput = {}
    if (params.definition_id) where.definition_id = params.definition_id
    if (params.status) where.status = params.status as any
    if (params.initiator_id) where.initiator_id = params.initiator_id

    return await this.instanceRepo.findAll({
      where,
      orderBy: { created_at: 'desc' },
      skip: ((params.page || 1) - 1) * (params.pageSize || 50),
      take: params.pageSize || 50
    })
  }

  async createInstance(data: Partial<WorkflowInstance>): Promise<WorkflowInstance> {
    return (await this.instanceRepo.create(data as any)) as WorkflowInstance
  }

  async updateInstance(id: string, data: Partial<WorkflowInstance>): Promise<WorkflowInstance> {
    return (await this.instanceRepo.update(id, data as any)) as WorkflowInstance
  }

  async getTaskById(id: string): Promise<WorkflowTask | null> {
    return (await this.taskRepo.findById(id)) as WorkflowTask | null
  }

  async getTasksByInstance(instanceId: string): Promise<WorkflowTask[]> {
    return (await this.taskRepo.findByInstance(instanceId)) as WorkflowTask[]
  }

  async getPendingTasksByUser(userId: string): Promise<WorkflowTask[]> {
    return (await this.taskRepo.findPendingByAssignee(userId)) as WorkflowTask[]
  }

  async createTask(data: Partial<WorkflowTask>): Promise<WorkflowTask> {
    return (await this.taskRepo.create(data as any)) as WorkflowTask
  }

  async updateTask(id: string, data: Partial<WorkflowTask>): Promise<WorkflowTask> {
    return (await this.taskRepo.update(id, data as any)) as WorkflowTask
  }
}

export const workflowServiceV2 = new WorkflowServiceV2()
