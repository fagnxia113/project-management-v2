import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  X,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  Users,
  Activity,
  Search,
  Filter,
  RefreshCw,
  MoreHorizontal,
  UserCheck,
  SkipForward,
  ArrowLeft
} from 'lucide-react';

// 类型定义
interface ProcessInstance {
  id: string;
  title: string;
  definition_key: string;
  category: string;
  status: 'running' | 'completed' | 'terminated' | 'suspended';
  initiator_name: string;
  start_time: string;
  duration?: number;
  result?: string;
}

interface Task {
  id: string;
  name: string;
  assignee_name?: string;
  status: string;
  created_at: string;
  due_date?: string;
}

interface Statistics {
  totalInstances: number;
  runningInstances: number;
  completedInstances: number;
  terminatedInstances: number;
  avgDuration: number;
  approvalRate: number;
  rejectionRate: number;
  byProcessKey: Record<string, {
    total: number;
    running: number;
    completed: number;
  }>;
}

interface RealtimeMonitoring {
  activeInstances: number;
  pendingTasks: number;
  overdueTasks: number;
  todayCompleted: number;
  todayStarted: number;
  avgProcessingTime: number;
  topSlowProcesses: Array<{
    instanceId: string;
    title: string;
    duration: number;
    currentNode?: string;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const WorkflowMonitorPage: React.FC = () => {
  // 状态
  const [instances, setInstances] = useState<ProcessInstance[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [realtimeData, setRealtimeData] = useState<RealtimeMonitoring | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<ProcessInstance | null>(null);
  const [instanceTasks, setInstanceTasks] = useState<Task[]>([]);
  const [instanceHistory, setInstanceHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [interventionType, setInterventionType] = useState<'jump' | 'rollback' | 'force' | 'close' | 'reassign'>('force');
  const [interventionReason, setInterventionReason] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [targetNodeId, setTargetNodeId] = useState('');
  const [newAssignee, setNewAssignee] = useState({ id: '', name: '' });
  const [activeTab, setActiveTab] = useState<'overview' | 'instances' | 'statistics'>('overview');

  // 获取数据
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // 获取实时监控数据
      const realtimeRes = await fetch('/api/workflow/v2/admin/realtime-monitoring');
      if (realtimeRes.ok) {
        const realtimeResult = await realtimeRes.json();
        if (realtimeResult.success) {
          setRealtimeData(realtimeResult.data);
        }
      }

      // 获取统计
      const statsRes = await fetch('/api/workflow/v2/admin/statistics');
      if (statsRes.ok) {
        const statsResult = await statsRes.json();
        if (statsResult.success) {
          setStatistics(statsResult.data);
        }
      }

      // 获取实例列表
      const instancesRes = await fetch(`/api/workflow/v2/admin/instances?${filterStatus ? `status=${filterStatus}&` : ''}pageSize=50`);
      if (instancesRes.ok) {
        const instancesResult = await instancesRes.json();
        if (instancesResult.success) {
          setInstances(instancesResult.data.instances);
        }
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  // 获取实例详情
  const fetchInstanceDetail = async (instanceId: string) => {
    try {
      const [instanceRes, tasksRes, historyRes] = await Promise.all([
        fetch(`/api/workflow/v2/process/instance/${instanceId}`),
        fetch(`/api/workflow/v2/process/instance/${instanceId}/tasks`),
        fetch(`/api/workflow/v2/process/instance/${instanceId}/history`)
      ]);

      if (instanceRes.ok) {
        const instanceResult = await instanceRes.json();
        if (instanceResult.success) {
          setSelectedInstance(instanceResult.data);
        }
      }

      if (tasksRes.ok) {
        const tasksResult = await tasksRes.json();
        if (tasksResult.success) {
          setInstanceTasks(tasksResult.data);
        }
      }

      if (historyRes.ok) {
        const historyResult = await historyRes.json();
        if (historyResult.success) {
          // API 返回 { instanceHistory, taskHistory } 结构
          const historyData = historyResult.data?.instanceHistory || historyResult.data || [];
          setInstanceHistory(Array.isArray(historyData) ? historyData : []);
        }
      }
    } catch (error) {
      console.error('获取实例详情失败:', error);
    }
  };

  // 执行干预操作
  const executeIntervention = async () => {
    if (!selectedInstance) return;

    try {
      const operator = { id: 'admin', name: '系统管理员' };
      let response;

      switch (interventionType) {
        case 'jump':
          if (!targetNodeId) {
            alert('请选择目标节点');
            return;
          }
          response = await fetch(`/api/workflow/v2/admin/instance/${selectedInstance.id}/jump`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetNodeId, operator, reason: interventionReason })
          });
          break;

        case 'rollback':
          response = await fetch(`/api/workflow/v2/admin/instance/${selectedInstance.id}/rollback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operator, reason: interventionReason })
          });
          break;

        case 'force':
          if (!selectedTask) {
            alert('请选择要强制完成的任务');
            return;
          }
          const forceResult = confirm('确定要强制通过此任务吗？选择"确定"为通过，"取消"为拒绝');
          if (!forceResult && !confirm('确定要强制拒绝此任务吗？')) {
            return;
          }
          response = await fetch(`/api/workflow/v2/admin/task/${selectedTask.id}/force-complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              result: forceResult ? 'approved' : 'rejected', 
              operator, 
              comment: interventionReason 
            })
          });
          break;

        case 'close':
          if (!confirm('确定要强制关闭此流程吗？')) return;
          response = await fetch(`/api/workflow/v2/admin/instance/${selectedInstance.id}/force-close`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operator, reason: interventionReason })
          });
          break;

        case 'reassign':
          if (!selectedTask || !newAssignee.id) {
            alert('请选择任务并填写新指派人');
            return;
          }
          response = await fetch(`/api/workflow/v2/admin/task/${selectedTask.id}/reassign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newAssignee, operator, reason: interventionReason })
          });
          break;
      }

      if (response && response.ok) {
        const result = await response.json();
        if (result.success) {
          alert('操作成功');
          setShowInterventionModal(false);
          setInterventionReason('');
          setTargetNodeId('');
          setNewAssignee({ id: '', name: '' });
          fetchData();
          if (selectedInstance) {
            fetchInstanceDetail(selectedInstance.id);
          }
        } else {
          alert('操作失败: ' + (result.error || '未知错误'));
        }
      } else {
        const errorData = await response?.json().catch(() => ({ error: '网络请求失败' }));
        alert('操作失败: ' + (errorData?.error || '网络请求失败'));
      }
    } catch (error) {
      console.error('干预操作失败:', error);
      alert('操作失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 格式化时长
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'terminated': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 自动刷新
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30秒刷新一次
    return () => clearInterval(interval);
  }, [filterStatus]);

  // 准备图表数据
  const statusData = statistics ? [
    { name: '运行中', value: statistics.runningInstances, color: '#0088FE' },
    { name: '已完成', value: statistics.completedInstances, color: '#00C49F' },
    { name: '已终止', value: statistics.terminatedInstances, color: '#FF8042' },
  ] : [];

  const processTypeData = statistics ? Object.entries(statistics.byProcessKey).map(([key, data]) => ({
    name: key,
    total: data.total,
    running: data.running,
    completed: data.completed
  })) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">流程监控中心</h1>
              <p className="text-sm text-gray-500 mt-1">实时监控和管理所有业务流程</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchData}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                刷新数据
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div className="bg-white border-b">
        <div className="px-6">
          <div className="flex space-x-8">
            {[
              { key: 'overview', label: '总览', icon: Activity },
              { key: 'instances', label: '流程实例', icon: Play },
              { key: 'statistics', label: '统计分析', icon: BarChart }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* 加载状态 */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-gray-600">加载中...</span>
          </div>
        )}

        {/* 总览页 */}
        {!loading && activeTab === 'overview' && !realtimeData && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无监控数据</p>
          </div>
        )}

        {!loading && activeTab === 'overview' && realtimeData && (
          <div className="space-y-6">
            {/* 关键指标卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">活动流程</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">
                      {realtimeData?.activeInstances || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Activity className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">待处理任务</p>
                    <p className="text-3xl font-bold text-yellow-600 mt-2">
                      {realtimeData?.pendingTasks || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">逾期任务</p>
                    <p className="text-3xl font-bold text-red-600 mt-2">
                      {realtimeData?.overdueTasks || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">今日完成</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">
                      {realtimeData?.todayCompleted || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* 图表区域 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 流程状态分布 */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">流程状态分布</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* 最慢流程 */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">处理最慢的流程</h3>
                <div className="space-y-3">
                  {realtimeData?.topSlowProcesses.map((process, index) => (
                    <div
                      key={process.instanceId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center">
                        <span className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-xs font-medium text-gray-600 mr-3">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{process.title}</p>
                          <p className="text-xs text-gray-500">{process.currentNode}</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-red-600">
                        {formatDuration(process.duration)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 流程实例页 */}
        {!loading && activeTab === 'instances' && (
          <div className="space-y-6">
            {/* 筛选和搜索 */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="搜索流程标题、发起人..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">全部状态</option>
                  <option value="running">运行中</option>
                  <option value="completed">已完成</option>
                  <option value="terminated">已终止</option>
                  <option value="suspended">已挂起</option>
                </select>
              </div>
            </div>

            {/* 实例列表 */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      流程标题
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      类型
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      发起人
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      耗时
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {instances.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">暂无流程实例</p>
                      </td>
                    </tr>
                  ) : (
                    instances
                      .filter(instance =>
                        instance.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        instance.initiator_name?.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((instance) => (
                        <tr key={instance.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{instance.title}</div>
                            <div className="text-xs text-gray-500">{instance.id}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{instance.definition_key}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{instance.initiator_name}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(instance.status)}`}>
                              {instance.status === 'running' && '运行中'}
                              {instance.status === 'completed' && '已完成'}
                              {instance.status === 'terminated' && '已终止'}
                              {instance.status === 'suspended' && '已挂起'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDuration(instance.duration)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => {
                                setSelectedInstance(instance);
                                fetchInstanceDetail(instance.id);
                              }}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              查看
                            </button>
                            {instance.status === 'running' && (
                              <button
                                onClick={() => {
                                  setSelectedInstance(instance);
                                  setSelectedTask(null);
                                  setInterventionType('force');
                                  setInterventionReason('');
                                  setTargetNodeId('');
                                  setNewAssignee({ id: '', name: '' });
                                  setShowInterventionModal(true);
                                }}
                                className="text-red-600 hover:text-red-900"
                              >
                                干预
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 统计分析页 */}
        {!loading && activeTab === 'statistics' && !statistics && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无统计数据</p>
          </div>
        )}

        {!loading && activeTab === 'statistics' && statistics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 流程类型统计 */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">各类型流程统计</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={processTypeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" fill="#8884d8" name="总数" />
                    <Bar dataKey="running" fill="#0088FE" name="运行中" />
                    <Bar dataKey="completed" fill="#00C49F" name="已完成" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 审批通过率 */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">审批通过率</h3>
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-green-600">
                      {(statistics.approvalRate * 100).toFixed(1)}%
                    </div>
                    <p className="text-gray-500 mt-2">总体通过率</p>
                    <div className="mt-6 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">通过</span>
                        <span className="font-medium text-green-600">
                          {Math.round(statistics.completedInstances * statistics.approvalRate)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">拒绝</span>
                        <span className="font-medium text-red-600">
                          {Math.round(statistics.completedInstances * statistics.rejectionRate)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 实例详情弹窗 */}
      {selectedInstance && !showInterventionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">流程详情</h2>
                <p className="text-sm text-gray-500">{selectedInstance.title}</p>
              </div>
              <button
                onClick={() => setSelectedInstance(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="space-y-6">
                {/* 基本信息 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">流程ID</p>
                    <p className="text-sm font-medium">{selectedInstance.id}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">发起人</p>
                    <p className="text-sm font-medium">{selectedInstance.initiator_name}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">状态</p>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedInstance.status)}`}>
                      {selectedInstance.status}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">启动时间</p>
                    <p className="text-sm font-medium">
                      {new Date(selectedInstance.start_time).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>

                {/* 任务列表 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">任务列表</h3>
                  <div className="space-y-2">
                    {instanceTasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{task.name}</p>
                          <p className="text-xs text-gray-500">
                            指派人: {task.assignee_name || '未分配'} | 状态: {task.status}
                          </p>
                        </div>
                        {selectedInstance.status === 'running' && (
                          <button
                            onClick={() => {
                              setSelectedTask(task);
                              setInterventionType('force');
                              setShowInterventionModal(true);
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            强制处理
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 操作历史 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">操作历史</h3>
                  <div className="space-y-2">
                    {instanceHistory.map((history, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{history.action}</p>
                          <p className="text-xs text-gray-500">
                            {history.operatorName} · {new Date(history.createdAt).toLocaleString('zh-CN')}
                          </p>
                          {history.reason && (
                            <p className="text-xs text-gray-600 mt-1">原因: {history.reason}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end space-x-3">
              {selectedInstance.status === 'running' && (
                <button
                  onClick={() => setShowInterventionModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  管理员干预
                </button>
              )}
              <button
                onClick={() => setSelectedInstance(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 干预操作弹窗 */}
      {showInterventionModal && selectedInstance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">管理员干预</h2>
              <p className="text-sm text-gray-500">对流程进行强制操作</p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* 操作类型选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">操作类型</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'force', label: '强制通过/拒绝', icon: CheckCircle },
                    { key: 'jump', label: '跳转到节点', icon: FastForward },
                    { key: 'rollback', label: '回退上一步', icon: ArrowLeft },
                    { key: 'close', label: '强制关闭', icon: X },
                    { key: 'reassign', label: '重新分配', icon: UserCheck }
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setInterventionType(key as any)}
                      className={`flex items-center p-3 rounded-lg border transition-colors ${
                        interventionType === key
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      <span className="text-sm">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 根据操作类型显示不同选项 */}
              {interventionType === 'force' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">选择任务</label>
                  {instanceTasks.filter(t => ['created', 'assigned', 'in_progress'].includes(t.status)).length > 0 ? (
                    <select
                      value={selectedTask?.id || ''}
                      onChange={(e) => {
                        const task = instanceTasks.find(t => t.id === e.target.value);
                        setSelectedTask(task || null);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">请选择要强制处理的任务</option>
                      {instanceTasks
                        .filter(t => ['created', 'assigned', 'in_progress'].includes(t.status))
                        .map(task => (
                          <option key={task.id} value={task.id}>{task.name}</option>
                        ))}
                    </select>
                  ) : (
                    <div className="px-3 py-2 bg-yellow-50 border border-yellow-300 rounded-lg text-yellow-700 text-sm">
                      <div className="flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        <span>该流程实例当前没有可处理的任务</span>
                      </div>
                      <p className="mt-1 text-xs text-yellow-600">
                        可能原因：流程刚启动尚未创建任务，或审批人配置错误导致任务被跳过。
                        您可以使用"跳转到节点"功能直接推进流程。
                      </p>
                    </div>
                  )}
                </div>
              )}

              {interventionType === 'jump' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">目标节点ID</label>
                  <input
                    type="text"
                    value={targetNodeId}
                    onChange={(e) => setTargetNodeId(e.target.value)}
                    placeholder="输入要跳转到的节点ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}

              {interventionType === 'reassign' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">选择任务</label>
                    {instanceTasks.filter(t => ['created', 'assigned', 'in_progress'].includes(t.status)).length > 0 ? (
                      <select
                        value={selectedTask?.id || ''}
                        onChange={(e) => {
                          const task = instanceTasks.find(t => t.id === e.target.value);
                          setSelectedTask(task || null);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">请选择要重新分配的任务</option>
                        {instanceTasks
                          .filter(t => ['created', 'assigned', 'in_progress'].includes(t.status))
                          .map(task => (
                            <option key={task.id} value={task.id}>{task.name}</option>
                          ))}
                      </select>
                    ) : (
                      <div className="px-3 py-2 bg-yellow-50 border border-yellow-300 rounded-lg text-yellow-700 text-sm">
                        <div className="flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          <span>该流程实例当前没有可重新分配的任务</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {instanceTasks.filter(t => ['created', 'assigned', 'in_progress'].includes(t.status)).length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">新指派人ID</label>
                        <input
                          type="text"
                          value={newAssignee.id}
                          onChange={(e) => setNewAssignee({ ...newAssignee, id: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">新指派人姓名</label>
                        <input
                          type="text"
                          value={newAssignee.name}
                          onChange={(e) => setNewAssignee({ ...newAssignee, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* 原因说明 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">操作原因</label>
                <textarea
                  value={interventionReason}
                  onChange={(e) => setInterventionReason(e.target.value)}
                  placeholder="请输入操作原因（可选）"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowInterventionModal(false);
                  setInterventionReason('');
                  setTargetNodeId('');
                  setNewAssignee({ id: '', name: '' });
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={executeIntervention}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                确认执行
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowMonitorPage;
