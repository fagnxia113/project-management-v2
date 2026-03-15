import { lazy } from 'react'
import { RouteObject, Navigate, useNavigate } from 'react-router-dom'

// 项目
const ProjectListPage = lazy(() => import('../pages/projects/ProjectListPage'))
const ProjectCreatePage = lazy(() => import('../pages/projects/ProjectCreatePage'))
const ProjectDetailPage = lazy(() => import('../pages/projects/ProjectDetailPage'))
const ProjectCompletionPage = lazy(() => import('../pages/projects/ProjectCompletionPage'))

// 任务
const TaskBoardPage = lazy(() => import('../pages/tasks/TaskBoardPage'))

// 设备
const EquipmentListPage = lazy(() => import('../pages/equipment/EquipmentListPage'))
const EquipmentDetailPage = lazy(() => import('../pages/equipment/EquipmentDetailPage'))
const EquipmentStatisticsPage = lazy(() => import('../pages/equipment/EquipmentStatisticsPage'))
const ScrapSaleListPage = lazy(() => import('../pages/equipment/ScrapSaleListPage'))
const TransferListPage = lazy(() => import('../pages/equipment/TransferListPage'))
const TransferCreatePage = lazy(() => import('../pages/equipment/TransferCreatePage'))
const TransferDetailPage = lazy(() => import('../pages/equipment/TransferDetailPage'))
const RepairCreatePage = lazy(() => import('../pages/equipment/RepairCreatePage'))
const ScrapSaleCreatePage = lazy(() => import('../pages/equipment/ScrapSaleCreatePage'))
const AccessoryManagementPage = lazy(() => import('../pages/equipment/AccessoryManagementPage'))
const AccessoryDetailPage = lazy(() => import('../pages/equipment/AccessoryDetailPage'))

// 人员
const PersonnelListPage = lazy(() => import('../pages/personnel/PersonnelListPage'))
const EmployeeDetailPage = lazy(() => import('../pages/personnel/EmployeeDetailPage'))
const PersonnelTransferPage = lazy(() => import('../pages/personnel/PersonnelTransferPage'))
const PersonnelOnboardPage = lazy(() => import('../pages/personnel/PersonnelOnboardPage'))
const PersonnelOnboardDetailPage = lazy(() => import('../pages/personnel/PersonnelOnboardDetailPage'))

// 客户与地点
const CustomerListPage = lazy(() => import('../pages/customers/CustomerListPage'))
const WarehouseListPage = lazy(() => import('../pages/warehouses/WarehouseListPage'))
const WarehouseDetailPage = lazy(() => import('../pages/warehouses/WarehouseDetailPage'))

// 审批处理
const ApprovalPendingPage = lazy(() => import('../pages/approvals/ApprovalPendingPageNew'))
const ApprovalMinePage = lazy(() => import('../pages/approvals/ApprovalMinePageNew'))
const ApprovalCompletedPage = lazy(() => import('../pages/approvals/ApprovalCompletedPage'))
const ApprovalDraftPage = lazy(() => import('../pages/approvals/ApprovalDraftPage'))
const NewProcessPage = lazy(() => import('../pages/approvals/NewProcessPage'))
const WorkflowFormPage = lazy(() => import('../pages/approvals/WorkflowFormPage'))

// 工作流管理
const WorkflowVisualizationPage = lazy(() => import('../pages/workflow/WorkflowVisualizationPage'))
const WorkflowDetailPage = lazy(() => import('../pages/workflow/WorkflowDetailPage'))
const WorkflowDesignerNewPage = lazy(() => import('../pages/workflow/WorkflowDesignerNewPage'))
const WorkflowDefinitionListPage = lazy(() => import('../pages/workflow/WorkflowDefinitionListPage'))
const ProcessInstanceDetailPage = lazy(() => import('../pages/workflow/ProcessInstanceDetailPage'))

// 其他功能
const PurchaseRequestPage = lazy(() => import('../pages/purchase/PurchaseRequestPage'))
const DailyReportDashboard = lazy(() => import('../pages/reports/DailyReportDashboard'))
const NotificationCenterPage = lazy(() => import('../pages/notifications/NotificationCenterPage'))
const AlertManagementPage = lazy(() => import('../pages/notifications/AlertManagementPage'))
const DepartmentPage = lazy(() => import('../pages/organization/DepartmentPage'))
const PositionPage = lazy(() => import('../pages/organization/PositionPage'))
const FormDesignerPage = lazy(() => import('../pages/forms/FormDesignerPage'))
const FormTemplatesPage = lazy(() => import('../pages/forms/FormTemplatesPage'))

// 系统设置与管理
const SystemSettingsPage = lazy(() => import('../pages/settings/SystemSettingsPage'))
const MetadataConfigPage = lazy(() => import('../pages/settings/MetadataConfigPage'))
const DataLinkagePage = lazy(() => import('../pages/settings/DataLinkagePage'))
const ChangePasswordPage = lazy(() => import('../pages/settings/ChangePasswordPage'))
const UserManagementPage = lazy(() => import('../pages/admin/UserManagementPage'))
const AdminDataPage = lazy(() => import('../pages/admin/AdminDataPage'))
const WorkflowMonitorPage = lazy(() => import('../pages/admin/WorkflowMonitorPage'))
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'))

const HomeRedirect = () => {
  const navigate = useNavigate()
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8"><h1 className="text-2xl font-bold text-gray-900">欢迎回来</h1></div>
      <div className="mb-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div><h2 className="text-lg font-semibold">开始使用项目管理系统</h2></div>
          <button onClick={() => navigate('/projects/new')} className="px-4 py-2 bg-white text-blue-600 rounded-lg">新建项目</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"><p className="text-sm text-gray-500">进行中项目</p><p className="text-3xl font-bold text-gray-900 mt-2">0</p></div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"><p className="text-sm text-gray-500">待处理任务</p><p className="text-3xl font-bold text-gray-900 mt-2">0</p></div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"><p className="text-sm text-gray-500">设备在库</p><p className="text-3xl font-bold text-gray-900 mt-2">0</p></div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"><p className="text-sm text-gray-500">待审批</p><p className="text-3xl font-bold text-gray-900 mt-2">0</p></div>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">快捷入口</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button onClick={() => navigate('/projects/new')} className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100"><span className="text-sm text-gray-700">新建项目</span></button>
          <button onClick={() => navigate('/tasks/board')} className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100"><span className="text-sm text-gray-700">任务看板</span></button>
          <button onClick={() => navigate('/approvals')} className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100"><span className="text-sm text-gray-700">审批中心</span></button>
          <button onClick={() => navigate('/reports/dashboard')} className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100"><span className="text-sm text-gray-700">日报看板</span></button>
        </div>
      </div>
    </div>
  )
}

export const routes: RouteObject[] = [
    { path: '/', element: <HomeRedirect /> },
    { path: '/dashboard', element: <DashboardPage /> },

    {
        path: '/projects',
        children: [
            { path: '', element: <ProjectListPage /> },
            { path: 'create', element: <ProjectCreatePage /> },
            { path: 'completion', element: <ProjectCompletionPage /> },
            { path: ':id', element: <ProjectDetailPage /> },
        ]
    },
    { path: '/tasks/board', element: <TaskBoardPage /> },

    {
        path: '/equipment',
        children: [
            { path: '', element: <EquipmentListPage /> },
            { path: 'statistics', element: <EquipmentStatisticsPage /> },
            { path: 'accessories', element: <AccessoryManagementPage /> },
            { path: 'accessories/:id', element: <AccessoryDetailPage /> },
            { path: 'scrap-sales', element: <ScrapSaleListPage /> },
            { path: 'scrap-sales/create', element: <ScrapSaleCreatePage /> },
            { path: 'repairs/create', element: <RepairCreatePage /> },
            { path: 'transfers', element: <Navigate to="/equipment/transfers/list" replace /> },
            { path: 'transfers/list', element: <TransferListPage /> },
            { path: 'transfers/create', element: <TransferCreatePage /> },
            { path: 'transfers/:id', element: <TransferDetailPage /> },
            { path: ':id', element: <EquipmentDetailPage /> }
        ]
    },

    {
        path: '/personnel',
        children: [
            { path: '', element: <PersonnelListPage /> },
            { path: 'transfer', element: <PersonnelTransferPage /> },
            { path: 'onboard', element: <PersonnelOnboardPage /> },
            { path: 'onboard/:instanceId', element: <PersonnelOnboardDetailPage /> },
            { path: ':id', element: <EmployeeDetailPage /> },
        ]
    },

    { path: '/customers', element: <CustomerListPage /> },
    {
        path: '/warehouses',
        children: [
            { path: '', element: <WarehouseListPage /> },
            { path: ':id', element: <WarehouseDetailPage /> },
        ]
    },

    {
        path: '/approvals',
        children: [
            { path: 'pending', element: <ApprovalPendingPage /> },
            { path: 'completed', element: <ApprovalCompletedPage /> },
            { path: 'mine', element: <ApprovalMinePage /> },
            { path: 'draft', element: <ApprovalDraftPage /> },
            { path: 'new', element: <NewProcessPage /> },
            { path: 'workflow/:definitionKey', element: <WorkflowFormPage /> },
        ]
    },

    {
        path: '/workflow',
        children: [
            { path: 'definitions', element: <WorkflowDefinitionListPage /> },
            { path: 'designer/new', element: <WorkflowDesignerNewPage /> },
            { path: 'designer/:id', element: <WorkflowDesignerNewPage /> },
            { path: 'visualization/:instanceId', element: <WorkflowVisualizationPage /> },
            { path: 'detail/:instanceId', element: <WorkflowDetailPage /> },
            { path: 'instance/:instanceId', element: <ProcessInstanceDetailPage /> },
        ]
    },

    { path: '/purchase/request', element: <PurchaseRequestPage /> },
    { path: '/reports/dashboard', element: <DailyReportDashboard /> },

    {
        path: '/notifications',
        children: [
            { path: '', element: <NotificationCenterPage /> },
            { path: 'alerts', element: <AlertManagementPage /> }
        ]
    },

    {
        path: '/organization',
        children: [
            { path: 'departments', element: <DepartmentPage /> },
            { path: 'positions', element: <PositionPage /> },
        ]
    },

    {
        path: '/forms',
        children: [
            { path: 'templates', element: <FormTemplatesPage /> },
            { path: 'designer/new', element: <FormDesignerPage /> },
            { path: 'designer/:id', element: <FormDesignerPage /> },
        ]
    },

    {
        path: '/settings',
        children: [
            { path: '', element: <SystemSettingsPage /> },
            { path: 'metadata', element: <MetadataConfigPage /> },
            { path: 'linkage', element: <DataLinkagePage /> },
            { path: 'password', element: <ChangePasswordPage /> },
        ]
    },

    {
        path: '/admin',
        children: [
            { path: 'data', element: <AdminDataPage /> },
            { path: 'users', element: <UserManagementPage /> },
            { path: 'workflow-monitor', element: <WorkflowMonitorPage /> },
        ]
    },

    { path: '*', element: <Navigate to="/" replace /> }
]
