export interface FieldDependency {
  field: string
  value: any
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains' | 'notContains' | 'in' | 'notIn' | 'between'
  logic?: 'and' | 'or'
}

export interface DependencyCondition {
  dependencies: FieldDependency[]
  logic?: 'and' | 'or'
}

export interface DependencyNode {
  fieldName: string
  dependencies: string[]
  dependents: string[]
}

export class FormDependencyProcessor {
  private dependencyGraph: Map<string, Set<string>>
  private reverseDependencyGraph: Map<string, Set<string>>
  private evaluationCache: Map<string, boolean>

  constructor() {
    this.dependencyGraph = new Map()
    this.reverseDependencyGraph = new Map()
    this.evaluationCache = new Map()
  }

  buildDependencyGraph(fields: Array<{ name: string; dependencies?: FieldDependency[] }>): void {
    this.dependencyGraph.clear()
    this.reverseDependencyGraph.clear()

    fields.forEach(field => {
      if (!field.dependencies || field.dependencies.length === 0) {
        return
      }

      const dependencies = new Set<string>()
      field.dependencies.forEach(dep => {
        dependencies.add(dep.field)
      })

      this.dependencyGraph.set(field.name, dependencies)

      dependencies.forEach(depField => {
        if (!this.reverseDependencyGraph.has(depField)) {
          this.reverseDependencyGraph.set(depField, new Set())
        }
        this.reverseDependencyGraph.get(depField)!.add(field.name)
      })
    })
  }

  detectCircularDependencies(): string[][] {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    const cycles: string[][] = []

    const dfs = (node: string, path: string[]): void => {
      visited.add(node)
      recursionStack.add(node)
      path.push(node)

      const dependencies = this.dependencyGraph.get(node)
      if (dependencies) {
        for (const dep of dependencies) {
          if (!visited.has(dep)) {
            dfs(dep, [...path])
          } else if (recursionStack.has(dep)) {
            const cycleStart = path.indexOf(dep)
            cycles.push([...path.slice(cycleStart), dep])
          }
        }
      }

      recursionStack.delete(node)
    }

    for (const node of this.dependencyGraph.keys()) {
      if (!visited.has(node)) {
        dfs(node, [])
      }
    }

    return cycles
  }

  getTopologicalOrder(): string[] {
    const inDegree = new Map<string, number>()
    const queue: string[] = []
    const result: string[] = []

    for (const [node, deps] of this.dependencyGraph.entries()) {
      inDegree.set(node, deps.size)
      if (deps.size === 0) {
        queue.push(node)
      }
    }

    for (const node of this.dependencyGraph.keys()) {
      if (!inDegree.has(node)) {
        inDegree.set(node, 0)
        queue.push(node)
      }
    }

    while (queue.length > 0) {
      const node = queue.shift()!
      result.push(node)

      const dependents = this.reverseDependencyGraph.get(node)
      if (dependents) {
        for (const dependent of dependents) {
          const degree = inDegree.get(dependent)! - 1
          inDegree.set(dependent, degree)
          if (degree === 0) {
            queue.push(dependent)
          }
        }
      }
    }

    return result
  }

  evaluateCondition(
    dependencies: FieldDependency[],
    data: Record<string, any>,
    logic: 'and' | 'or' = 'and'
  ): boolean {
    if (dependencies.length === 0) {
      return true
    }

    const results = dependencies.map(dep => this.evaluateSingleDependency(dep, data))

    return logic === 'and' ? results.every(r => r) : results.some(r => r)
  }

  evaluateSingleDependency(dependency: FieldDependency, data: Record<string, any>): boolean {
    const fieldValue = data[dependency.field]

    switch (dependency.operator) {
      case 'equals':
        return fieldValue === dependency.value
      case 'notEquals':
        return fieldValue !== dependency.value
      case 'greaterThan':
        return fieldValue > dependency.value
      case 'lessThan':
        return fieldValue < dependency.value
      case 'contains':
        return String(fieldValue).includes(String(dependency.value))
      case 'notContains':
        return !String(fieldValue).includes(String(dependency.value))
      case 'in':
        return Array.isArray(dependency.value) && dependency.value.includes(fieldValue)
      case 'notIn':
        return Array.isArray(dependency.value) && !dependency.value.includes(fieldValue)
      case 'between':
        if (!Array.isArray(dependency.value) || dependency.value.length !== 2) {
          return false
        }
        const [min, max] = dependency.value
        return fieldValue >= min && fieldValue <= max
      default:
        return true
    }
  }

  isFieldVisible(
    fieldName: string,
    dependencies: FieldDependency[] | undefined,
    data: Record<string, any>
  ): boolean {
    if (!dependencies || dependencies.length === 0) {
      return true
    }

    const cacheKey = `${fieldName}_${JSON.stringify(dependencies)}_${JSON.stringify(data)}`
    if (this.evaluationCache.has(cacheKey)) {
      return this.evaluationCache.get(cacheKey)!
    }

    const result = this.evaluateCondition(dependencies, data, 'and')
    this.evaluationCache.set(cacheKey, result)

    return result
  }

  getAffectedFields(changedField: string): string[] {
    const affected = this.reverseDependencyGraph.get(changedField)
    return affected ? Array.from(affected) : []
  }

  getEvaluationOrder(fields: Array<{ name: string; dependencies?: FieldDependency[] }>): string[] {
    this.buildDependencyGraph(fields)
    const cycles = this.detectCircularDependencies()

    if (cycles.length > 0) {
      console.warn('检测到循环依赖:', cycles)
    }

    return this.getTopologicalOrder()
  }

  clearCache(): void {
    this.evaluationCache.clear()
  }

  validateDependencies(
    fields: Array<{ name: string; dependencies?: FieldDependency[] }>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const fieldNames = new Set(fields.map(f => f.name))

    fields.forEach(field => {
      if (!field.dependencies) {
        return
      }

      field.dependencies.forEach(dep => {
        if (!fieldNames.has(dep.field)) {
          errors.push(`字段 "${field.name}" 依赖的字段 "${dep.field}" 不存在`)
        }
      })
    })

    const cycles = this.detectCircularDependencies()
    if (cycles.length > 0) {
      cycles.forEach(cycle => {
        errors.push(`检测到循环依赖: ${cycle.join(' -> ')}`)
      })
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  getDependencyTree(fieldName: string): { field: string; dependencies: any[] }[] {
    const result: { field: string; dependencies: any[] }[] = []
    const visited = new Set<string>()

    const buildTree = (node: string, level: number): void => {
      if (visited.has(node) || level > 10) {
        return
      }

      visited.add(node)
      const deps = this.dependencyGraph.get(node)
      result.push({
        field: node,
        dependencies: deps ? Array.from(deps) : []
      })

      if (deps) {
        deps.forEach(dep => buildTree(dep, level + 1))
      }
    }

    buildTree(fieldName, 0)
    return result
  }

  getFieldsByEvaluationOrder(
    fields: Array<{ name: string; dependencies?: FieldDependency[] }>,
    data: Record<string, any>
  ): Array<{ field: any; visible: boolean }> {
    const order = this.getEvaluationOrder(fields)
    const fieldMap = new Map(fields.map(f => [f.name, f]))

    return order.map(fieldName => {
      const field = fieldMap.get(fieldName)
      if (!field) {
        return { field: null, visible: false }
      }

      const visible = this.isFieldVisible(
        fieldName,
        field.dependencies,
        data
      )

      return { field, visible }
    })
  }
}

export const formDependencyProcessor = new FormDependencyProcessor()
