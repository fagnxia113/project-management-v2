import React, { useState, useEffect, Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Layout from './components/Layout'
import LoginPage from './pages/auth/LoginPage'
import { API_URL } from './config/api'

// 页面组件懒加载
const ProjectListPage = lazy(() => import('./pages/projects/ProjectListPage'))
const ProjectCreatePage = lazy(() => import('./pages/projects/ProjectCreatePage'))
const ProjectDetailPage = lazy(() => import('./pages/projects/ProjectDetailPage'))
const ProjectCompletionPage = lazy(() => import('./pages/projects/ProjectCompletionPage'))
const TaskBoardPage = lazy(() => import('./pages/tasks/TaskBoardPage'))
const EquipmentListPage = lazy(() => import('./pages/equipment/EquipmentListPage'))
const EquipmentTransferPage = lazy(() => import('./pages/equipment/EquipmentTransferPage'))
const EquipmentInboundPage = lazy(() => import('./pages/equipment/EquipmentInboundPage'))
const EquipmentOutboundPage = lazy(() => import('./pages/equipment/EquipmentOutboundPage'))
const EquipmentRepairPage = lazy(() => import('./pages/equipment/EquipmentRepairPage'))
const EquipmentScrapPage = lazy(() => import('./pages/equipment/EquipmentScrapPage'))
const PersonnelListPage = lazy(() => import('./pages/personnel/PersonnelListPage'))
const PersonnelTransferPage = lazy(() => import('./pages/personnel/PersonnelTransferPage'))
const PersonnelOnboardPage = lazy(() => import('./pages/personnel/PersonnelOnboardPage'))
const PersonnelOffboardPage = lazy(() => import('./pages/personnel/PersonnelOffboardPage'))
const PersonnelRegularPage = lazy(() => import('./pages/personnel/PersonnelRegularPage'))
const PersonnelLeavePage = lazy(() => import('./pages/personnel/PersonnelLeavePage'))
const PersonnelTripPage = lazy(() => import('./pages/personnel/PersonnelTripPage'))
const EquipmentReturnPage = lazy(() => import('./pages/equipment/EquipmentReturnPage'))
const PurchaseRequestPage = lazy(() => import('./pages/purchase/PurchaseRequestPage'))
const PurchaseListPage = lazy(() => import('./pages/purchase/PurchaseListPage'))
const NotificationCenterPage = lazy(() => import('./pages/notifications/NotificationCenterPage'))
const AlertManagementPage = lazy(() => import('./pages/notifications/AlertManagementPage'))
const SystemSettingsPage = lazy(() => import('./pages/settings/SystemSettingsPage'))
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage'))
const CustomerListPage = lazy(() => import('./pages/customers/CustomerListPage'))
const WarehouseListPage = lazy(() => import('./pages/warehouses/WarehouseListPage'))
const ApprovalPendingPage = lazy(() => import('./pages/approvals/ApprovalPendingPageNew'))
const ApprovalMinePage = lazy(() => import('./pages/approvals/ApprovalMinePageNew'))
const NewProcessPage = lazy(() => import('./pages/approvals/NewProcessPage'))
const DailyReportDashboard = lazy(() => import('./pages/reports/DailyReportDashboard'))
const MetadataConfigPage = lazy(() => import('./pages/settings/MetadataConfigPage'))
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'))
const AdminDataPage = lazy(() => import('./pages/admin/AdminDataPage'))
const WorkflowVisualizationPage = lazy(() => import('./pages/workflow/WorkflowVisualizationPage'))
const WorkflowDesignerNewPage = lazy(() => import('./pages/workflow/WorkflowDesignerNewPage'))
const WorkflowDefinitionListPage = lazy(() => import('./pages/workflow/WorkflowDefinitionListPage'))
const ProcessInstanceDetailPage = lazy(() => import('./pages/workflow/ProcessInstanceDetailPage'))
const WorkflowMonitorPage = lazy(() => import('./pages/admin/WorkflowMonitorPage'))
const DepartmentPage = lazy(() => import('./pages/organization/DepartmentPage'))
const PositionPage = lazy(() => import('./pages/organization/PositionPage'))
const FormDesignerPage = lazy(() => import('./pages/forms/FormDesignerPage'))
const FormTemplatesPage = lazy(() => import('./pages/forms/FormTemplatesPage'))
const DataLinkagePage = lazy(() => import('./pages/settings/DataLinkagePage'))
const ChangePasswordPage = lazy(() => import('./pages/settings/ChangePasswordPage'))

// 加载占位符
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
  </div>
)

// 首页快捷入口
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

function App() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading')
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsAuthenticated(!!token)
    setIsAuthChecking(false)

    fetch(API_URL.HEALTH)
      .then(res => res.json())
      .then(() => setStatus('connected'))
      .catch(() => setStatus('error'))
  }, [])

  if (isAuthChecking) {
    return <LoadingFallback />
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return (
    <Layout>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectListPage />} />
          <Route path="/projects/create" element={<ProjectCreatePage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/projects/completion" element={<ProjectCompletionPage />} />
          <Route path="/tasks/board" element={<TaskBoardPage />} />
          <Route path="/equipment" element={<EquipmentListPage />} />
          <Route path="/equipment/inbound" element={<EquipmentInboundPage />} />
          <Route path="/equipment/outbound" element={<EquipmentOutboundPage />} />
          <Route path="/equipment/transfer" element={<EquipmentTransferPage />} />
          <Route path="/equipment/repair" element={<EquipmentRepairPage />} />
          <Route path="/equipment/scrap" element={<EquipmentScrapPage />} />
          <Route path="/equipment/return" element={<EquipmentReturnPage />} />
          <Route path="/personnel" element={<PersonnelListPage />} />
          <Route path="/personnel/onboard" element={<PersonnelOnboardPage />} />
          <Route path="/personnel/offboard" element={<PersonnelOffboardPage />} />
          <Route path="/personnel/regular" element={<PersonnelRegularPage />} />
          <Route path="/personnel/leave" element={<PersonnelLeavePage />} />
          <Route path="/personnel/trip" element={<PersonnelTripPage />} />
          <Route path="/personnel/transfer" element={<PersonnelTransferPage />} />
          <Route path="/customers" element={<CustomerListPage />} />
          <Route path="/warehouses" element={<WarehouseListPage />} />
          <Route path="/approvals/pending" element={<ApprovalPendingPage />} />
          <Route path="/approvals/mine" element={<ApprovalMinePage />} />
          <Route path="/approvals/new" element={<NewProcessPage />} />
          <Route path="/workflow/definitions" element={<WorkflowDefinitionListPage />} />
          <Route path="/workflow/designer/new" element={<WorkflowDesignerNewPage />} />
          <Route path="/workflow/designer/:id" element={<WorkflowDesignerNewPage />} />
          <Route path="/workflow/visualization/:instanceId" element={<WorkflowVisualizationPage />} />
          <Route path="/workflow/instance/:instanceId" element={<ProcessInstanceDetailPage />} />
          <Route path="/purchase/request" element={<PurchaseRequestPage />} />
          <Route path="/purchase" element={<PurchaseListPage />} />
          <Route path="/reports/dashboard" element={<DailyReportDashboard />} />
          <Route path="/notifications" element={<NotificationCenterPage />} />
          <Route path="/notifications/alerts" element={<AlertManagementPage />} />
          <Route path="/organization/departments" element={<DepartmentPage />} />
          <Route path="/organization/positions" element={<PositionPage />} />
          <Route path="/forms/templates" element={<FormTemplatesPage />} />
          <Route path="/forms/designer/new" element={<FormDesignerPage />} />
          <Route path="/forms/designer/:id" element={<FormDesignerPage />} />
          <Route path="/settings" element={<SystemSettingsPage />} />
          <Route path="/settings/metadata" element={<MetadataConfigPage />} />
          <Route path="/settings/linkage" element={<DataLinkagePage />} />
          <Route path="/settings/password" element={<ChangePasswordPage />} />
          <Route path="/admin/data" element={<AdminDataPage />} />
          <Route path="/admin/users" element={<UserManagementPage />} />
          <Route path="/admin/workflow-monitor" element={<WorkflowMonitorPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

export default App
