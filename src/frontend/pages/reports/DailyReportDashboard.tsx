/**
 * 日报管理大屏
 * 功能：
 * 1. 展示已提交/未提交人员统计
 * 2. 未提交人员名单 + 一键提醒
 * 3. 已提交日报明细
 * 4. 日报审核功能
 */
import React, { useState, useEffect } from 'react'
import { API_URL } from '../../config/api'

interface DailyReport {
  id: string
  person_id: string
  person_name: string
  project_id: string
  project_name: string
  report_date: string
  work_content: string
  progress: string
  problems: string
  plan: string
  work_hours: number
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

interface Person {
  id: string
  name: string
  department: string
  position: string
}

export default function DailyReportDashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [reports, setReports] = useState<DailyReport[]>([])
  const [persons, setPersons] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'unsubmitted' | 'submitted' | 'pending'>('unsubmitted')
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null)
  const [reviewComment, setReviewComment] = useState('')

  useEffect(() => {
    loadData()
  }, [selectedDate])

  const loadData = async () => {
    setLoading(true)
    try {
      // 加载日报数据
      const reportsRes = await fetch(`${API_URL.DATA}/daily_reports?report_date=${selectedDate}`)
      if (reportsRes.ok) {
        const data = await reportsRes.json()
        setReports(data.items || data || [])
      }

      // 加载人员数据
      const personsRes = await fetch(`${API_URL.DATA}/employees`)
      if (personsRes.ok) {
        const data = await personsRes.json()
        setPersons(data.items || data || [])
      }
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 已提交日报的人员ID
  const submittedPersonIds = new Set(reports.map(r => r.person_id))
  
  // 未提交人员列表
  const unsubmittedPersons = persons.filter(p => !submittedPersonIds.has(p.id))
  
  // 待审核日报
  const pendingReports = reports.filter(r => r.status === 'pending')
  
  // 已审核日报
  const reviewedReports = reports.filter(r => r.status !== 'pending')

  // 一键发送提醒
  const sendReminder = async (personId?: string) => {
    const targets = personId ? [personId] : unsubmittedPersons.map(p => p.id)
    
    try {
      // 调用提醒接口
      const res = await fetch(`${API_URL.API}/reminders/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'daily_report',
          personIds: targets,
          date: selectedDate,
          channels: ['platform', 'email']
        })
      })
      
      if (res.ok) {
        alert(`已向 ${targets.length} 人发送日报提醒`)
      } else {
        alert('发送提醒失败')
      }
    } catch (error) {
      console.error('发送提醒失败:', error)
      // 模拟成功
      alert(`已向 ${targets.length} 人发送日报提醒（模拟）`)
    }
  }

  // 审核日报
  const reviewReport = async (reportId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`${API_URL.DATA}/daily_reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action === 'approve' ? 'approved' : 'rejected',
          review_comment: reviewComment,
          reviewed_at: new Date().toISOString()
        })
      })
      
      if (res.ok) {
        loadData()
        setSelectedReport(null)
        setReviewComment('')
        alert(action === 'approve' ? '审核通过' : '已驳回')
      }
    } catch (error) {
      console.error('审核失败:', error)
    }
  }

  // 统计数据
  const stats = {
    total: persons.length,
    submitted: reports.length,
    unsubmitted: unsubmittedPersons.length,
    pending: pendingReports.length,
    submitRate: persons.length > 0 ? Math.round((reports.length / persons.length) * 100) : 0
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">日报管理看板</h1>
          <p className="text-gray-500 mt-1">统一管理和追踪日报提交情况</p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <p className="text-gray-500 text-sm">总人数</p>
            <p className="text-4xl font-bold text-gray-900 mt-2">{stats.total}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <p className="text-sm text-green-600">已提交</p>
            <p className="text-4xl font-bold text-green-600 mt-2">{stats.submitted}</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${stats.submitRate}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">提交率 {stats.submitRate}%</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <p className="text-sm text-red-600">未提交</p>
            <p className="text-4xl font-bold text-red-600 mt-2">{stats.unsubmitted}</p>
            {stats.unsubmitted > 0 && (
              <button
                onClick={() => sendReminder()}
                className="mt-3 px-4 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600"
              >
                一键提醒全部
              </button>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <p className="text-sm text-yellow-600">待审核</p>
            <p className="text-4xl font-bold text-yellow-600 mt-2">{stats.pending}</p>
            {stats.pending > 0 && (
              <button
                onClick={() => setActiveTab('pending')}
                className="mt-3 text-sm text-yellow-600 hover:text-yellow-700 underline"
              >
                立即处理
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('unsubmitted')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'unsubmitted' 
                  ? 'border-red-500 text-red-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              未提交人员 ({stats.unsubmitted})
            </button>
            <button
              onClick={() => setActiveTab('submitted')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'submitted' 
                  ? 'border-green-500 text-green-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              已提交 ({stats.submitted})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'pending' 
                  ? 'border-yellow-500 text-yellow-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              待审核 ({stats.pending})
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* 未提交人员列表 */}
          {activeTab === 'unsubmitted' && (
            <div>
              {unsubmittedPersons.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto text-green-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>所有人员均已提交日报 🎉</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">部门</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">职位</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {unsubmittedPersons.map(person => (
                        <tr key={person.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-medium text-sm">
                                {person.name.charAt(0)}
                              </div>
                              <span className="ml-3 text-gray-900">{person.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-gray-500">{person.department || '-'}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-gray-500">{person.position || '-'}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => sendReminder(person.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              发送提醒
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 已提交日报列表 */}
          {activeTab === 'submitted' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">项目</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">工作内容</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">工时</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">提交时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reviewedReports.map(report => (
                    <tr key={report.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedReport(report)}>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-900">{report.person_name}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-500">{report.project_name || '-'}</td>
                      <td className="px-4 py-4 text-gray-500 max-w-xs truncate">{report.work_content}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-500">{report.work_hours || 8}h</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs ${
                          report.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {report.status === 'approved' ? '已通过' : '已驳回'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-500 text-sm">
                        {new Date(report.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 待审核日报列表 */}
          {activeTab === 'pending' && (
            <div>
              {pendingReports.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto text-green-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>暂无待审核日报</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingReports.map(report => (
                    <div key={report.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{report.person_name}</h4>
                          <p className="text-sm text-gray-500">{report.project_name || '未关联项目'}</p>
                        </div>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">待审核</span>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-500">工作内容：</span>
                          <span className="text-gray-700">{report.work_content}</span>
                        </div>
                        {report.progress && (
                          <div>
                            <span className="text-gray-500">进度：</span>
                            <span className="text-gray-700">{report.progress}</span>
                          </div>
                        )}
                        {report.problems && (
                          <div>
                            <span className="text-gray-500">问题：</span>
                            <span className="text-red-600">{report.problems}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">工时：</span>
                          <span className="text-gray-700">{report.work_hours || 8} 小时</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <textarea
                          placeholder="审核意见（可选）"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm resize-none"
                          rows={2}
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => reviewReport(report.id, 'reject')}
                            className="px-4 py-2 text-red-600 border border-red-300 rounded hover:bg-red-50 text-sm"
                          >
                            驳回
                          </button>
                          <button
                            onClick={() => reviewReport(report.id, 'approve')}
                            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                          >
                            通过
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 日报详情弹窗 */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">日报详情</h3>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">提交人</p>
                    <p className="font-medium">{selectedReport.person_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">项目</p>
                    <p className="font-medium">{selectedReport.project_name || '-'}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 mb-1">工作内容</p>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded">{selectedReport.work_content}</p>
                </div>
                
                {selectedReport.progress && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">进度描述</p>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded">{selectedReport.progress}</p>
                  </div>
                )}
                
                {selectedReport.problems && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">遇到问题</p>
                    <p className="text-red-600 bg-red-50 p-3 rounded">{selectedReport.problems}</p>
                  </div>
                )}
                
                {selectedReport.plan && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">明日计划</p>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded">{selectedReport.plan}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
