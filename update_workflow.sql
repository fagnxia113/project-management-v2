UPDATE workflow_definitions SET node_config = '{
  "edges": [
    {"id": "edge-1", "source": "start", "target": "hr-manager"},
    {"id": "edge-2", "source": "hr-manager", "target": "department-manager"},
    {"id": "edge-3", "source": "department-manager", "target": "gm"},
    {"id": "edge-4", "source": "gm", "target": "create-employee"},
    {"id": "edge-5", "source": "create-employee", "target": "end-approved"}
  ],
  "nodes": [
    {"id": "start", "name": "提交入职申请", "type": "startEvent", "position": {"x": 310, "y": 100}},
    {"id": "hr-manager", "name": "HR经理审批", "type": "userTask", "position": {"x": 310, "y": 280}, "approvalConfig": {"approvalType": "single", "skipCondition": "no_approvers", "approverSource": {"type": "role", "value": "hr_manager"}, "skipIfNoApprover": true}},
    {"id": "department-manager", "name": "部门经理审批", "type": "userTask", "position": {"x": 310, "y": 460}, "approvalConfig": {"approvalType": "single", "skipCondition": "no_approvers", "approverSource": {"type": "expression", "value": "${formData.departmentManager}"}, "skipIfNoApprover": true}},
    {"id": "gm", "name": "总经理审批", "type": "userTask", "position": {"x": 310, "y": 640}, "approvalConfig": {"approvalType": "single", "skipCondition": "no_approvers", "approverSource": {"type": "role", "value": "admin"}, "skipIfNoApprover": true}},
    {"id": "create-employee", "name": "创建员工记录", "type": "serviceTask", "position": {"x": 310, "y": 820}, "config": {"serviceType": "createEmployee", "serviceConfig": {"entityType": "Employee", "dataMapping": {"name": "${formData.employee_name}", "employee_no": "${formData.employee_id}", "department_id": "${formData.department_id}", "position_id": "${formData.position_id}", "hire_date": "${formData.start_date}", "email": "${formData.email}", "phone": "${formData.phone}"}}}},
    {"id": "end-approved", "name": "审批通过", "type": "endEvent", "position": {"x": 310, "y": 1000}}
  ]
}' WHERE `key` = 'employee-onboard';
