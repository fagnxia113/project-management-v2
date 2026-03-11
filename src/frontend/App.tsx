import React, { useState, useEffect, Suspense, lazy } from 'react'
import { useRoutes, Navigate, useNavigate } from 'react-router-dom'
import { routes } from './router'
import Layout from './components/Layout'
import LoginPage from './pages/auth/LoginPage'
import { useUser } from './contexts/UserContext'
import { API_URL } from './config/api'

// 页面组件懒加载
const ProjectListPage = lazy(() => import('./pages/projects/ProjectListPage'))
const ProjectCreatePage = lazy(() => import('./pages/projects/ProjectCreatePage'))
const ProjectDetailPage = lazy(() => import('./pages/projects/ProjectDetailPage'))
const ProjectCompletionPage = lazy(() => import('./pages/projects/ProjectCompletionPage'))
const TaskBoardPage = lazy(() => import('./pages/tasks/TaskBoardPage'))
const EquipmentListPage = lazy(() => import('./pages/equipment/EquipmentListPage'))
const EquipmentDetailPage = lazy(() => import('./pages/equipment/EquipmentDetailPage'))
const EquipmentStatisticsPage = lazy(() => import('./pages/equipment/EquipmentStatisticsPage'))
const ScrapSaleListPage = lazy(() => import('./pages/equipment/ScrapSaleListPage'))
const TransferListPage = lazy(() => import('./pages/equipment/TransferListPage'))
const TransferCreatePage = lazy(() => import('./pages/equipment/TransferCreatePage'))
const TransferDetailPage = lazy(() => import('./pages/equipment/TransferDetailPage'))
const RepairCreatePage = lazy(() => import('./pages/equipment/RepairCreatePage'))
const ScrapSaleCreatePage = lazy(() => import('./pages/equipment/ScrapSaleCreatePage'))
const PersonnelListPage = lazy(() => import('./pages/personnel/PersonnelListPage'))
const EmployeeDetailPage = lazy(() => import('./pages/personnel/EmployeeDetailPage'))
const PersonnelTransferPage = lazy(() => import('./pages/personnel/PersonnelTransferPage'))
const PersonnelOnboardPage = lazy(() => import('./pages/personnel/PersonnelOnboardPage'))
const PersonnelOnboardDetailPage = lazy(() => import('./pages/personnel/PersonnelOnboardDetailPage'))
const PurchaseRequestPage = lazy(() => import('./pages/purchase/PurchaseRequestPage'))
const NotificationCenterPage = lazy(() => import('./pages/notifications/NotificationCenterPage'))
const AlertManagementPage = lazy(() => import('./pages/notifications/AlertManagementPage'))
const SystemSettingsPage = lazy(() => import('./pages/settings/SystemSettingsPage'))
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage'))
const CustomerListPage = lazy(() => import('./pages/customers/CustomerListPage'))
const WarehouseListPage = lazy(() => import('./pages/warehouses/WarehouseListPage'))
const WarehouseDetailPage = lazy(() => import('./pages/warehouses/WarehouseDetailPage'))
const ApprovalPendingPage = lazy(() => import('./pages/approvals/ApprovalPendingPageNew'))
const ApprovalMinePage = lazy(() => import('./pages/approvals/ApprovalMinePageNew'))
const ApprovalCompletedPage = lazy(() => import('./pages/approvals/ApprovalCompletedPage'))
const ApprovalDraftPage = lazy(() => import('./pages/approvals/ApprovalDraftPage'))
const NewProcessPage = lazy(() => import('./pages/approvals/NewProcessPage'))
const WorkflowFormPage = lazy(() => import('./pages/approvals/WorkflowFormPage'))
const DailyReportDashboard = lazy(() => import('./pages/reports/DailyReportDashboard'))
const MetadataConfigPage = lazy(() => import('./pages/settings/MetadataConfigPage'))
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'))
const AdminDataPage = lazy(() => import('./pages/admin/AdminDataPage'))
const WorkflowVisualizationPage = lazy(() => import('./pages/workflow/WorkflowVisualizationPage'))
const WorkflowDetailPage = lazy(() => import('./pages/workflow/WorkflowDetailPage'))
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
// 首页快捷入口
export const HomeRedirect = () => {
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

function AppContent() {
  const element = useRoutes(routes)
  return element
}

function App() {
  const { user, loading } = useUser()
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading')

  useEffect(() => {
    fetch(API_URL.HEALTH)
      .then(res => res.json())
      .then(() => setStatus('connected'))
      .catch(() => setStatus('error'))
  }, [])

  // 如果还在加载中，显示加载页面
  if (loading) {
    return <LoadingFallback />
  }

  // 如果没有用户信息，显示登录页面
  if (!user) {
    return <LoginPage />
  }

  // 用户已登录，显示主应用
  return (
    <Layout>
      <Suspense fallback={<LoadingFallback />}>
        <AppContent />
      </Suspense>
    </Layout>
  )
}

export default App
