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
    <div className="min-h-screen bg-mesh flex items-center justify-center p-4 relative overflow-hidden">
      {/* 装饰元素 */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 rounded-full blur-[120px] animate-pulse-subtle"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/20 rounded-full blur-[120px] animate-pulse-subtle" style={{ animationDelay: '1.5s' }}></div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo区域 */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-white/80 backdrop-blur-xl border border-white/50 rounded-3xl shadow-2xl mx-auto flex items-center justify-center group transition-transform hover:scale-110 active:scale-95 duration-500">
            <svg className="w-12 h-12 text-blue-600 transition-colors group-hover:text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mt-6 tracking-tight">
            <span className="text-gradient">四为信网</span> 项目管理
          </h1>
          <p className="text-slate-500 font-medium mt-2">Enterprise Solutions for Quality Testing</p>
        </div>

        {/* 登录表单 */}
        <div className="glass-card rounded-[2rem] p-10 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
          
          <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center">欢迎回来</h2>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 ml-1">用户名</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                  placeholder="请输入您的用户名"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 ml-1">密码</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                  placeholder="请输入您的登录密码"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-600 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 animate-shake">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:shadow-[0_10px_25px_-5px_rgba(37,99,235,0.4)] disabled:opacity-50 font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/20"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  正在安全连接...
                </div>
              ) : '进入系统'}
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
              如需开通权限，请联系技术中心
            </p>
          </div>
        </div>

        {/* 底部信息 */}
        <div className="text-center mt-12 text-slate-400 text-xs font-bold tracking-tight">
          <p>© 2026 江苏四为信网检测技术有限公司 · 版权所有</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <span className="hover:text-blue-500 cursor-pointer transition-colors">隐私政策</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span className="hover:text-blue-500 cursor-pointer transition-colors">服务条款</span>
          </div>
        </div>
      </div>
    </div>
  )
}
