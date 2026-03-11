/**
 * Repository 统一导出
 * 
 * 使用 Prisma ORM 替代原生 SQL
 * 所有数据访问层都在此统一管理
 */

// 核心业务 Repository
export { EmployeeRepository, employeeRepository } from './EmployeeRepository.js'
export { DepartmentRepository, departmentRepository } from './DepartmentRepository.js'
export { PositionRepository, positionRepository } from './PositionRepository.js'
export { WarehouseRepository, warehouseRepository } from './WarehouseRepository.js'
export { UserRepository, userRepository } from './UserRepository.js'
export { CustomerRepository, customerRepository } from './CustomerRepository.js'
export { EquipmentRepository, equipmentRepository } from './EquipmentRepository.js'
export { EquipmentModelRepository, equipmentModelRepository } from './EquipmentModelRepository.js'
export { TransferOrderRepository, transferOrderRepository } from './TransferOrderRepository.js'
export { ProjectRepository, projectRepository } from './ProjectRepository.js'
export { NotificationRepository, notificationRepository } from './NotificationRepository.js'
export { TaskRepository, taskRepository } from './TaskRepository.js'

// 设备业务 Repository
export { EquipmentRepairOrderRepository, equipmentRepairOrderRepository } from './EquipmentRepairOrderRepository.js'
export { EquipmentScrapOrderRepository, equipmentScrapOrderRepository } from './EquipmentScrapOrderRepository.js'
export { EquipmentInboundOrderRepository, equipmentInboundOrderRepository } from './EquipmentInboundOrderRepository.js'
export { EquipmentOutboundOrderRepository, equipmentOutboundOrderRepository } from './EquipmentOutboundOrderRepository.js'

// 工作流 Repository
export { WorkflowInstanceRepository, workflowInstanceRepository } from './WorkflowInstanceRepository.js'
export { WorkflowTaskRepository, workflowTaskRepository } from './WorkflowTaskRepository.js'
export { WorkflowDefinitionRepository, workflowDefinitionRepository } from './WorkflowDefinitionRepository.js'

// 审批 Repository
export { ApprovalRepository, approvalRepository } from './ApprovalRepository.js'

// 采购 Repository
export { PurchaseRequestRepository, purchaseRequestRepository } from './PurchaseRequestRepository.js'
export { PurchaseOrderRepository, purchaseOrderRepository } from './PurchaseOrderRepository.js'
