import { ReactNode, useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { API_URL } from '../config/api'

interface MenuItem {
  label: string
  path?: string
  icon: string
  badge?: number
  adminOnly?: boolean
  children?: { label: string; path: string; badge?: number; adminOnly?: boolean }[]
}

// 图标定义
const icons: Record<string, string> = {
  // 工作台
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  // 项目管理
  folder: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
  // 审批中心
  clipboard: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  // 人员管理
  users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  // 设备管理
  box: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  // 组织架构
  building: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  // 系统管理
  shield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  // 设置
  cog: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  // 展开/收起
  chevron: 'M19 9l-7 7-7-7',
  // 通知
  bell: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
}

// 菜单配置 - 按照新设计文档重构
const getMenus = (role: string): MenuItem[] => {
  const isAdmin = role === 'admin' || role === 'root'
  
  return [
    // 1. 工作台
    { 
      label: '工作台', 
      path: '/dashboard', 
      icon: 'home' 
    },
    
    // 2. 项目管理
    {
      label: '项目管理',
      icon: 'folder',
      children: [
        { label: '项目列表', path: '/projects' },
        { label: '新建项目', path: '/projects/create' },
        { label: '任务看板', path: '/tasks/board' },
      ]
    },
    
    // 3. 审批中心
    {
      label: '审批中心',
      icon: 'clipboard',
      children: [
        { label: '发起审批', path: '/approvals/new' },
        { label: '待我处理', path: '/approvals/pending', badge: 3 },
        { label: '我已发起', path: '/approvals/mine' },
      ]
    },
    
    // 4. 人员管理
    {
      label: '人员管理',
      icon: 'users',
      children: [
        { label: '员工列表', path: '/personnel' },
        // 入离职办理仅管理员可操作
        ...(isAdmin ? [
          { label: '入职办理', path: '/personnel/onboard', adminOnly: true },
          { label: '离职办理', path: '/personnel/offboard', adminOnly: true },
        ] : []),
        { label: '转正申请', path: '/personnel/regular' },
        { label: '请假申请', path: '/personnel/leave' },
        { label: '出差申请', path: '/personnel/trip' },
        { label: '调岗申请', path: '/personnel/transfer' },
      ]
    },
    
    // 5. 设备管理
    {
      label: '设备管理',
      icon: 'box',
      children: [
        { label: '设备台账', path: '/equipment' },
        { label: '仓库管理', path: '/warehouses' },
        { label: '入库登记', path: '/equipment/inbounds/create' },
        { label: '设备调拨', path: '/equipment/transfers/create' },
      ]
    },
    
    // 6. 组织架构
    {
      label: '组织架构',
      icon: 'building',
      children: [
        { label: '部门管理', path: '/organization/departments' },
        { label: '岗位管理', path: '/organization/positions' },
        { label: '客户管理', path: '/customers' },
      ]
    },
    
    // 7. 系统管理（仅管理员可见）
    ...(isAdmin ? [{
      label: '系统管理',
      icon: 'shield',
      adminOnly: true,
      children: [
        { label: '流程监控', path: '/admin/workflow-monitor', adminOnly: true },
        { label: '流程定义', path: '/workflow/definitions', adminOnly: true },
        { label: '表单设计', path: '/forms/templates', adminOnly: true },
        { label: '用户管理', path: '/admin/users', adminOnly: true },
        { label: '数据字典', path: '/settings/metadata', adminOnly: true },
        { label: '系统设置', path: '/settings', adminOnly: true },
      ]
    }] : []),
  ]
}

export default function Layout({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ 
    '项目管理': true,
    '审批中心': true 
  })
  const [menuConfig, setMenuConfig] = useState<MenuItem[]>([])
  const [user, setUser] = useState<any>(null)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (u) {
      const parsed = JSON.parse(u)
      setUser(parsed)
      setMenuConfig(getMenus(parsed.role))
    }
    
    // 获取待办数量
    fetchPendingCount()
  }, [])
  
  const fetchPendingCount = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      
      let userId = 'current-user'
      try {
        const base64Payload = token.split('.')[1]
        if (base64Payload) {
          const payload = JSON.parse(atob(base64Payload))
          userId = payload.userId || payload.id || 'current-user'
        }
      } catch (e) {
        console.warn('Token解析失败')
      }
      const response = await fetch(`${API_URL.BASE}/api/workflow/tasks?assigneeId=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setPendingCount(data.data.length)
        }
      }
    } catch (error) {
      console.error('获取待办数量失败:', error)
    }
  }

  const location = useLocation()
  const navigate = useNavigate()
  const currentPath = location.pathname

  // 检查当前路径是否匹配菜单项
  const isActivePath = (path: string) => {
    if (path === '/dashboard' && currentPath === '/') return true
    return currentPath === path || currentPath.startsWith(path + '/')
  }

  return (
    <div className="flex h-screen bg-[#f8fafc]">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 flex flex-col shadow-2xl z-50">
        {/* Logo区域 */}
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-white font-black tracking-tight text-lg leading-tight">项目管理系统</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Enterprise OS</p>
            </div>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar pt-4">
          {menuConfig.map((item) => (
            <div key={item.label} className="space-y-1">
              {item.children ? (
                <>
                  {/* 有子菜单的项 */}
                  <button
                    onClick={() => setExpanded(prev => ({ ...prev, [item.label]: !prev[item.label] }))}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all group ${
                      expanded[item.label] 
                        ? 'text-white bg-slate-800' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 opacity-70 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[item.icon]} />
                      </svg>
                      <span className="text-sm font-bold tracking-tight">{item.label}</span>
                    </div>
                    <svg 
                      className={`w-4 h-4 transition-transform duration-300 ${expanded[item.label] ? 'rotate-180' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons.chevron} />
                    </svg>
                  </button>
                  
                  {/* 子菜单 */}
                  {expanded[item.label] && (
                    <div className="pl-12 space-y-1 animate-in slide-in-from-top-2 duration-300">
                      {item.children.map(child => (
                        <button
                          key={child.path}
                          onClick={() => navigate(child.path)}
                          className={`w-full text-left px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-between ${
                            isActivePath(child.path) 
                              ? 'text-blue-400 bg-blue-500/10' 
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          <span>{child.label}</span>
                          {/* 显示待办数量徽章 */}
                          {child.label === '待我处理' && pendingCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                              {pendingCount > 99 ? '99+' : pendingCount}
                            </span>
                          )}
                          {/* 管理员标识 */}
                          {child.adminOnly && (
                            <span className="text-[8px] bg-purple-500/20 text-purple-400 px-1 py-0.5 rounded">
                              管
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                // 无子菜单的项
                <button
                  onClick={() => item.path && navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                    isActivePath(item.path || '') 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[item.icon]} />
                  </svg>
                  <span className="text-sm font-bold tracking-tight">{item.label}</span>
                  {/* 工作台显示待办总数 */}
                  {item.label === '工作台' && pendingCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          ))}
        </nav>

        {/* 用户信息 */}
        <div className="p-6">
          <div className="bg-slate-800/50 rounded-2xl p-4 flex items-center gap-3 border border-slate-700/50">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-inner">
              {user?.name?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold truncate">{user?.name || '管理员'}</p>
              <p className="text-[10px] text-slate-500 font-bold truncate">
                {user?.role === 'admin' || user?.role === 'root' ? '系统管理员' : '普通员工'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate('/settings/password')}
                className="p-2 text-slate-500 hover:text-blue-400 transition-colors"
                title="修改密码"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </button>
              <button
                onClick={() => { 
                  localStorage.clear(); 
                  window.location.href = '/';
                }}
                className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                title="退出登录"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* 顶部导航栏 */}
        <header className="h-16 bg-white/70 backdrop-blur-xl border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-40">
          {/* 面包屑导航 */}
          <div className="flex items-center text-sm">
            <span className="text-slate-400 font-medium">
              {currentPath === '/' ? '工作台' : ''}
            </span>
            {currentPath !== '/' && (
              <nav className="flex items-center space-x-2">
                <span className="text-slate-400">/</span>
                <span className="text-slate-800 font-semibold">
                  {currentPath.split('/')[1] === 'dashboard' && '工作台'}
                  {currentPath.split('/')[1] === 'projects' && '项目管理'}
                  {currentPath.split('/')[1] === 'tasks' && '项目管理'}
                  {currentPath.split('/')[1] === 'approvals' && '审批中心'}
                  {currentPath.split('/')[1] === 'personnel' && '人员管理'}
                  {currentPath.split('/')[1] === 'equipment' && '设备管理'}
                  {currentPath.split('/')[1] === 'organization' && '组织架构'}
                  {currentPath.split('/')[1] === 'customers' && '组织架构'}
                  {currentPath.split('/')[1] === 'admin' && '系统管理'}
                  {currentPath.split('/')[1] === 'workflow' && '系统管理'}
                  {currentPath.split('/')[1] === 'forms' && '系统管理'}
                  {currentPath.split('/')[1] === 'settings' && '系统管理'}
                </span>
                {currentPath.split('/')[2] && (
                  <>
                    <span className="text-slate-400">/</span>
                    <span className="text-slate-600">
                      {currentPath.split('/')[2] === 'create' && '新建项目'}
                      {currentPath.split('/')[2] === 'board' && '任务看板'}
                      {currentPath.split('/')[2] === 'new' && '发起审批'}
                      {currentPath.split('/')[2] === 'pending' && '待我处理'}
                      {currentPath.split('/')[2] === 'mine' && '我已发起'}
                      {currentPath.split('/')[2] === 'onboard' && '入职办理'}
                      {currentPath.split('/')[2] === 'offboard' && '离职办理'}
                      {currentPath.split('/')[2] === 'regular' && '转正申请'}
                      {currentPath.split('/')[2] === 'leave' && '请假申请'}
                      {currentPath.split('/')[2] === 'trip' && '出差申请'}
                      {currentPath.split('/')[2] === 'transfer' && '调岗申请'}
                      {currentPath.split('/')[2] === 'inbound' && '入库登记'}
                      {currentPath.split('/')[2] === 'outbound' && '出库领用'}
                      {currentPath.split('/')[2] === 'return' && '归还入库'}
                      {currentPath.split('/')[2] === 'repair' && '维修报废'}
                      {currentPath.split('/')[2] === 'departments' && '部门管理'}
                      {currentPath.split('/')[2] === 'positions' && '岗位管理'}
                      {currentPath.split('/')[2] === 'workflow-monitor' && '流程监控'}
                      {currentPath.split('/')[2] === 'users' && '用户管理'}
                      {currentPath.split('/')[2] === 'definitions' && '流程定义'}
                      {currentPath.split('/')[2] === 'templates' && '表单设计'}
                      {currentPath.split('/')[2] === 'metadata' && '数据字典'}
                    </span>
                  </>
                )}
              </nav>
            )}
          </div>
          
          {/* 右侧操作区 */}
          <div className="flex items-center gap-4">
            {/* 系统状态 */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-black text-slate-500">运行正常</span>
            </div>
            
            {/* 通知按钮 */}
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-all">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons.bell} />
              </svg>
              {pendingCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
          </div>
        </header>
        
        {/* 页面内容 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
