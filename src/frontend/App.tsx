import React, { useState, useEffect, Suspense } from 'react'
import { useRoutes } from 'react-router-dom'
import { routes } from './router'
import Layout from './components/Layout'
import LoginPage from './pages/auth/LoginPage'
import { useUser } from './contexts/UserContext'
import { API_URL } from './config/api'

// 加载占位符
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
  </div>
)


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
