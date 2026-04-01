/**
 * BaseService
 *
 * 基础服务类，提供通用的CRUD操作
 */
export interface BaseRepository<T> {
  create(data: Partial<T>): Promise<T>
  findById(id: string): Promise<T | null>
  findMany(params?: any): Promise<{ data: T[]; total: number }>
  update(id: string, data: Partial<T>): Promise<T>
  delete(id: string): Promise<void>
  findAll?(params?: any): Promise<{ data: T[]; total: number }>
}

export class BaseService<T> {
  protected repo: BaseRepository<T>

  constructor(repo: BaseRepository<T>) {
    this.repo = repo
  }

  async create(data: Partial<T>): Promise<T> {
    return await this.repo.create(data)
  }

  async getById(id: string): Promise<T | null> {
    return await this.repo.findById(id)
  }

  async getMany(params?: any): Promise<{ data: T[]; total: number }> {
    return await this.repo.findMany(params)
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    return await this.repo.update(id, data)
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id)
  }

  async getAll(params?: any): Promise<{ data: T[]; total: number }> {
    if (this.repo.findAll) {
      return await this.repo.findAll(params)
    }
    return await this.repo.findMany(params)
  }

  async getPagedData(params: {
    page?: number
    pageSize?: number
    [key: string]: any
  }): Promise<{ data: T[]; total: number; totalPages: number }> {
    const { page = 1, pageSize = 10, ...filters } = params
    
    const result = await this.getMany({
      ...filters,
      page,
      pageSize
    })

    return {
      data: result.data,
      total: result.total,
      totalPages: Math.ceil(result.total / pageSize)
    }
  }
}
