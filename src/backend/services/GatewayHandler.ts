import { db } from '../database/connection.js';
import { WorkflowNode, GatewayCondition, ProcessContext } from '../types/workflow.js';

export class GatewayHandler {
  async handleExclusiveGateway(
    gateway: WorkflowNode,
    context: ProcessContext
  ): Promise<string[]> {
    const gatewayConfig = gateway.config?.gatewayConfig || gateway.gatewayConfig;
    if (!gatewayConfig) {
      throw new Error('排他网关配置缺失');
    }

    const { conditions, defaultFlow } = gatewayConfig;
    
    console.log('🔍 网关处理 - conditions:', conditions?.length, 'defaultFlow:', defaultFlow);
    console.log('🔍 上下文 variables:', JSON.stringify(context.variables));
    console.log('🔍 上下文 formData:', JSON.stringify(context.formData));
    
    // 评估每个条件
    for (const condition of conditions) {
      console.log('🔍 评估条件:', condition.expression, 'targetNode:', condition.targetNode);
      const result = await this.evaluateExpression(condition.expression, context);
      console.log('🔍 条件结果:', result);
      if (result) {
        return [condition.targetNode];
      }
    }

    // 如果没有匹配的条件，使用默认流程
    if (defaultFlow) {
      console.log('🔍 使用默认流程:', defaultFlow);
      return [defaultFlow];
    }

    throw new Error('排他网关无有效路径');
  }

  async handleParallelGateway(
    gateway: WorkflowNode,
    context: ProcessContext
  ): Promise<string[]> {
    const gatewayConfig = gateway.config?.gatewayConfig || gateway.gatewayConfig;
    if (!gatewayConfig) {
      throw new Error('并行网关配置缺失');
    }

    // 并行网关激活所有分支
    return gatewayConfig.conditions.map(
      condition => condition.targetNode
    );
  }

  async handleInclusiveGateway(
    gateway: WorkflowNode,
    context: ProcessContext
  ): Promise<string[]> {
    const gatewayConfig = gateway.config?.gatewayConfig || gateway.gatewayConfig;
    if (!gatewayConfig) {
      throw new Error('包容网关配置缺失');
    }

    const { conditions, defaultFlow } = gatewayConfig;
    const selectedNodes: string[] = [];

    // 评估每个条件
    for (const condition of conditions) {
      const result = await this.evaluateExpression(condition.expression, context);
      if (result) {
        selectedNodes.push(condition.targetNode);
      }
    }

    // 如果没有匹配的条件，使用默认流程
    if (selectedNodes.length === 0 && defaultFlow) {
      selectedNodes.push(defaultFlow);
    }

    return selectedNodes;
  }

  async evaluateExpression(expression: string, context: ProcessContext): Promise<boolean> {
    try {
      // 支持的表达式格式：
      // ${formData.amount > 1000}
      // ${variables.status === 'approved'}
      // ${action == 'approve'}
      // ${formData.level IN ('senior', 'expert')}

      // 替换上下文变量 - 使用更智能的替换逻辑
      let evaluatedExpression = expression.replace(/\$\{(.*?)\}/g, (_, expr) => {
        // 检查是否是简单的变量访问（如 action, variables.action, formData.amount）
        const variableMatch = expr.match(/^([a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*)/);
        if (variableMatch) {
          const variablePath = variableMatch[1];
          const parts = variablePath.split('.');
          
          // 首先尝试从 context 的直接属性中查找
          let current: any = context;
          let found = false;
          
          for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
              current = current[part];
              found = true;
            } else {
              found = false;
              break;
            }
          }
          
          // 如果在 context 中找不到，尝试从 variables 中查找
          if (!found) {
            current = context.variables;
            for (const part of parts) {
              if (current && typeof current === 'object') {
                current = current[part];
              } else {
                return 'undefined';
              }
            }
          }

          const valueStr = JSON.stringify(current);
          console.log('🔍 变量替换:', variablePath, '=>', valueStr);
          // 如果表达式只是变量名，直接返回值
          if (expr === variablePath) {
            return valueStr;
          }
          // 否则替换变量部分，保留运算符
          const result = expr.replace(variablePath, valueStr);
          console.log('🔍 表达式替换:', expr, '=>', result);
          return result;
        }

        return expr;
      });

      console.log('🔍 替换后的表达式:', evaluatedExpression);

      // 处理IN操作符
      evaluatedExpression = evaluatedExpression.replace(/\s+IN\s+\(([^)]+)\)/g, (_, values) => {
        const valueArray = values.split(',').map(v => v.trim().replace(/['"]/g, ''));
        return ` ${JSON.stringify(valueArray)}.includes(this)`;
      });

      // 使用Function构造器安全地执行表达式
      const evaluator = new Function('context', `
        with (context) {
          return (${evaluatedExpression});
        }
      `);

      const result = evaluator({
        formData: context.formData,
        variables: context.variables,
        initiator: context.initiator,
        process: context.process,
        // 添加常用方法
        includes: (arr: any[], value: any) => arr.includes(value),
        hasProperty: (obj: any, prop: string) => obj && obj.hasOwnProperty(prop)
      });

      return Boolean(result);
    } catch (error) {
      console.error('表达式评估失败:', error, '表达式:', expression);
      return false;
    }
  }

  async findNextNodes(
    definition: any,
    currentNodeId: string
  ): Promise<string[]> {
    const nextNodes: string[] = [];

    if (definition.node_config && definition.node_config.edges) {
      for (const edge of definition.node_config.edges) {
        if (edge.source === currentNodeId) {
          nextNodes.push(edge.target);
        }
      }
    }

    return nextNodes;
  }

  async getGatewayDirection(gateway: WorkflowNode, definition: any): Promise<'diverging' | 'converging'> {
    // 计算网关的入度和出度
    let inDegree = 0;
    let outDegree = 0;

    if (definition.node_config && definition.node_config.edges) {
      for (const edge of definition.node_config.edges) {
        if (edge.target === gateway.id) {
          inDegree++;
        }
        if (edge.source === gateway.id) {
          outDegree++;
        }
      }
    }

    // 入度 > 1 或出度 == 0 为汇聚网关
    if (inDegree > 1 || outDegree === 0) {
      return 'converging';
    }
    return 'diverging';
  }

  async isJoinGatewayComplete(
    gatewayId: string,
    instanceId: string
  ): Promise<boolean> {
    // 检查是否所有入边都已完成
    const pendingExecutions = await db.query<any>(
      `SELECT * FROM workflow_executions 
       WHERE instance_id = ? AND parent_id IS NOT NULL 
       AND status = 'active' AND node_id = ?`,
      [instanceId, gatewayId]
    );

    return pendingExecutions.length === 0;
  }
}

export const gatewayHandler = new GatewayHandler();
