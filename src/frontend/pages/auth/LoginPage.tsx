/**
 * 登录页面 - 仅支持登录，不开放注册
 */
import React, { useState } from 'react'
import { API_URL } from '../../config/api'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      setError('请输入用户名和密码')
      return
    }
    setLoading(true)
    setError('')
    
    try {
      const res = await fetch(`${API_URL.BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      
      const data = await res.json()
      
      if (data.success) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        // 触发storage事件，让UserContext更新
        window.dispatchEvent(new Event('storage'))
        window.location.href = '/'
      } else {
        setError(data.error || '登录失败')
      }
    } catch (err: any) {
      setError(err.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo区域 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-lg mx-auto flex items-center justify-center">
            <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mt-4">四为信网项目管理系统</h1>
          <p className="text-blue-200 mt-2">江苏四为信网检测技术有限公司</p>
        </div>

        {/* 登录表单 */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">登录账户</h2>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入用户名"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入密码"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>如需开通账号，请联系系统管理员</p>
          </div>
        </div>

        {/* 底部信息 */}
        <div className="text-center mt-8 text-blue-200 text-sm">
          <p>© 2026 江苏四为信网检测技术有限公司 · 版权所有</p>
        </div>
      </div>
    </div>
  )
}
