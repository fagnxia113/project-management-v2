const API_URL = 'http://localhost:8080/api'

async function login() {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123'
    })
  })
  const data = await res.json()
  return data.token
}

async function testFormTemplate() {
  try {
    console.log('=== 测试表单模板功能 ===\n')

    console.log('0. 登录获取token...')
    const token = await login()
    console.log('Token获取成功\n')

    console.log('1. 创建表单模板...')
    const templateData = {
      name: '设备采购申请表',
      layout: {
        type: 'single',
        columns: 2,
        labelPosition: 'left'
      },
      fields: [
        {
          name: 'equipment_name',
          label: '设备名称',
          type: 'text',
          required: true,
          layout: { width: 'half' },
          permissions: {
            default: { visible: true, editable: true, required: true },
            nodePermissions: {
              'manager-approval': { visible: true, editable: false, required: true }
            }
          }
        },
        {
          name: 'quantity',
          label: '数量',
          type: 'number',
          required: true,
          layout: { width: 'half' },
          validation: { min: 1 },
          permissions: {
            default: { visible: true, editable: true, required: true }
          }
        },
        {
          name: 'estimated_price',
          label: '预估价格',
          type: 'currency',
          required: true,
          layout: { width: 'half' },
          permissions: {
            default: { visible: true, editable: true, required: true }
          }
        },
        {
          name: 'reason',
          label: '采购原因',
          type: 'textarea',
          required: true,
          layout: { width: 'full' },
          permissions: {
            default: { visible: true, editable: true, required: true }
          }
        }
      ],
      style: {
        theme: 'default',
        size: 'medium',
        labelAlign: 'left'
      }
    }

    const createRes = await fetch(`${API_URL}/form-templates/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(templateData)
    })

    const createResult = await createRes.json()
    console.log('创建结果:', JSON.stringify(createResult, null, 2))

    if (!createResult.success) {
      console.error('创建表单模板失败')
      return
    }

    const templateId = createResult.data.id
    console.log(`\n表单模板ID: ${templateId}\n`)

    console.log('2. 获取表单模板...')
    const getRes = await fetch(`${API_URL}/form-templates/templates/${templateId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    const getResult = await getRes.json()
    console.log('获取结果:', JSON.stringify(getResult, null, 2))

    console.log('\n3. 创建工作流定义并绑定表单模板...')
    const workflowData = {
      key: 'equipment-purchase-test',
      name: '设备采购测试流程',
      category: 'equipment',
      nodes: [
        { id: 'start', name: '开始', type: 'startEvent' },
        { id: 'submit', name: '提交申请', type: 'userTask' },
        { id: 'manager-approval', name: '经理审批', type: 'userTask' },
        { id: 'end', name: '结束', type: 'endEvent' }
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'submit' },
        { id: 'e2', source: 'submit', target: 'manager-approval' },
        { id: 'e3', source: 'manager-approval', target: 'end' }
      ],
      form_template_id: templateId
    }

    const workflowRes = await fetch(`${API_URL}/workflow/definitions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(workflowData)
    })

    const workflowResult = await workflowRes.json()
    console.log('工作流创建结果:', JSON.stringify(workflowResult, null, 2))

    if (!workflowResult.success) {
      console.error('创建工作流定义失败')
      return
    }

    const definitionId = workflowResult.data.id
    console.log(`\n工作流定义ID: ${definitionId}\n`)

    console.log('4. 通过工作流定义获取表单模板...')
    const workflowTemplateRes = await fetch(`${API_URL}/form-templates/workflow/${definitionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    const workflowTemplateResult = await workflowTemplateRes.json()
    console.log('工作流表单模板:', JSON.stringify(workflowTemplateResult, null, 2))

    console.log('\n5. 测试字段权限...')
    const fields = workflowTemplateResult.data.fields
    const equipmentNameField = fields.find(f => f.name === 'equipment_name')
    
    console.log('\n设备名称字段权限:')
    console.log('- 默认权限:', equipmentNameField.permissions.default)
    console.log('- 经理审批节点权限:', equipmentNameField.permissions.nodePermissions['manager-approval'])

    console.log('\n=== 测试完成 ===')
  } catch (error) {
    console.error('测试失败:', error)
  }
}

testFormTemplate()
