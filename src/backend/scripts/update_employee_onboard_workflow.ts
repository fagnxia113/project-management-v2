import { db } from '../database/connection.js';

async function updateEmployeeOnboardWorkflow() {
  console.log('开始更新人员入职流程定义...\n');

  try {
    await db.connect();
    console.log('✅ 数据库连接成功\n');

    const newNodes = [
      {
        id: 'start',
        type: 'start',
        name: '开始',
        position: { x: 100, y: 200 }
      },
      {
        id: 'dept_approval',
        type: 'approval',
        name: '部门经理审批',
        position: { x: 300, y: 200 },
        config: {
          approvalConfig: {
            approvalType: 'single',
            approverSource: {
              type: 'expression',
              value: '${formData.department_id}'
            },
            skipCondition: 'no_department_manager'
          }
        }
      },
      {
        id: 'hr_approval',
        type: 'approval',
        name: '人事审批',
        position: { x: 500, y: 200 },
        config: {
          approvalConfig: {
            approvalType: 'single',
            approverSource: {
              type: 'role',
              value: 'hr_manager'
            }
          }
        }
      },
      {
        id: 'gm_approval',
        type: 'approval',
        name: '总经理审批',
        position: { x: 700, y: 200 },
        config: {
          approvalConfig: {
            approvalType: 'single',
            approverSource: {
              type: 'role',
              value: 'admin'
            }
          }
        }
      },
      {
        id: 'create_employee',
        type: 'service',
        name: '创建员工记录',
        position: { x: 900, y: 200 },
        config: {
          serviceType: 'createEmployee',
          serviceConfig: {
            entityType: 'Employee'
          }
        }
      },
      {
        id: 'end',
        type: 'end',
        name: '结束',
        position: { x: 1100, y: 200 }
      }
    ];

    const newEdges = [
      { id: 'e1', source: 'start', target: 'dept_approval', type: 'sequenceFlow' },
      { id: 'e2', source: 'dept_approval', target: 'hr_approval', type: 'sequenceFlow' },
      { id: 'e3', source: 'hr_approval', target: 'gm_approval', type: 'sequenceFlow' },
      { id: 'e4', source: 'gm_approval', target: 'create_employee', type: 'sequenceFlow' },
      { id: 'e5', source: 'create_employee', target: 'end', type: 'sequenceFlow' }
    ];

    const nodeConfig = {
      nodes: newNodes,
      edges: newEdges
    };

    const sql = `UPDATE workflow_definitions 
                 SET node_config = ?, updated_at = NOW() 
                 WHERE \`key\` = 'employee-onboard' AND status = 'active'`;

    console.log('执行SQL:', sql);
    console.log('参数:', JSON.stringify(nodeConfig));

    const result = await db.query(sql, [JSON.stringify(nodeConfig)]);
    console.log(`\n✅ 更新成功，影响行数: ${JSON.stringify(result)}`);

    console.log('\n📋 新节点列表:');
    console.log('节点ID | 类型 | 名称');
    console.log('-------|------|------');
    newNodes.forEach((node: any) => {
      console.log(`${node.id.padEnd(20)} | ${node.type.padEnd(12)} | ${node.name}`);
    });

    console.log('\n✅ 人员入职流程定义更新完成！');
    
    await db.close();
  } catch (error) {
    console.error('❌ 更新失败:', error);
    process.exit(1);
  }
}

updateEmployeeOnboardWorkflow().then(() => process.exit(0));