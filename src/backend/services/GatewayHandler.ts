import { db } from '../database/connection.js';
import { WorkflowNode, GatewayCondition, ProcessContext } from '../types/workflow.js';

export class GatewayHandler {
  async handleExclusiveGateway(
    gateway: WorkflowNode,
    context: ProcessContext
  ): Promise<string[]> {
    if (!gateway.gatewayConfig) {
      throw new Error('排他网关配置缺失');
    }

    const { conditions, defaultFlow } = gateway.gatewayConfig;
    
    // 评估每个条件
    for (const condition of conditions) {
      const result = await this.evaluateExpression(condition.expression, context);
      if (result) {
        return [condition.targetNode];
      }
    }

    // 如果没有匹配的条件，使用默认流程
    if (defaultFlow) {
      return [defaultFlow];
    }

    throw new Error('排他网关无有效路径');
  }

  async handleParallelGateway(
    gateway: WorkflowNode,
    context: ProcessContext
  ): Promise<string[]> {
    if (!gateway.gatewayConfig) {
      throw new Error('并行网关配置缺失');
    }

    // 并行网关激活所有分支
    return gateway.gatewayConfig.conditions.map(
      condition => condition.targetNode
    );
  }

  async handleInclusiveGateway(
    gateway: WorkflowNode,
    context: ProcessContext
  ): Promise<string[]> {
    if (!gateway.gatewayConfig) {
      throw new Error('包容网关配置缺失');
    }

    const { conditions, defaultFlow } = gateway.gatewayConfig;
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
      // ${formData.level IN ('senior', 'expert')}

      // 替换上下文变量
      let evaluatedExpression = expression.replace(/\$\{(.*?)\}/g, (_, expr) => {
        const parts = expr.split('.');
        let current = {
          formData: context.formData,
          variables: context.variables,
          initiator: context.initiator,
          process: context.process
        };

        for (const part of parts) {
          if (current && typeof current === 'object') {
            current = current[part];
          } else {
            return 'undefined';
          }
        }

        return JSON.stringify(current);
      });

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
