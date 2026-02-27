import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_URL } from '../../config/api'
import {
  GitBranch,
  History,
  CheckCircle,
  XCircle,
  Clock,
  ChevronUp,
  ChevronDown,
  Send,
  User,
  RotateCcw,
  ArrowLeft,
  FileText,
  Calendar,
  Building2,
  MapPin,
  Phone,
  Mail,
  DollarSign
} from 'lucide-react'

interface WorkflowInstance {
  id: string
  definition_id: string
  definition_key: string
  title: string
  status: string
  result: string | null
  initiator_id: string
  initiator_name: string
  start_time: string
  end_time: string | null
  current_node_id: string | null
  current_node_name: string | null
  business_id: string | null
  variables: {
    formData: Record<string, any>
  }
}

interface WorkflowTask {
  id: string
  name: string
  node_id: string
  status: string
  assignee_id: string
  assignee_name: string
  result: string | null
  comment: string | null
  created_at: string
  completed_at: string | null
}

interface WorkflowLog {
  id: string
  action: string
  node_id: string
  node_name?: string
  status: string
  operator_id?: string
  operator_name?: string
  comment?: string
  created_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  'pending': { label: '审批中', color: 'text-yellow-700', bgColor: 'bg-yellow-50', icon: Clock },
  'running': { label: '审批中', color: 'text-yellow-700', bgColor: 'bg-yellow-50', icon: Clock },
  'approved': { label: '已通过', color: 'text-green-700', bgColor: 'bg-green-50', icon: CheckCircle },
  'rejected': { label: '已驳回', color: 'text-red-700', bgColor: 'bg-red-50', icon: XCircle },
  'withdrawn': { label: '已撤回', color: 'text-gray-700', bgColor: 'bg-gray-50', icon: RotateCcw },
  'completed': { label: '已完成', color: 'text-green-700', bgColor: 'bg-green-50', icon: CheckCircle },
  'terminated': { label: '已终止', color: 'text-red-700', bgColor: 'bg-red-50', icon: XCircle },
  'skipped': { label: '已跳过', color: 'text-gray-700', bgColor: 'bg-gray-50', icon: ChevronDown }
}

const PROCESS_TYPE_LABELS: Record<string, string> = {
  'person_onboard': '人员入职',
  'personnel_onboard': '人员入职',
  'personnel_offboard': '人员离职',
  'personnel_transfer': '人员调拨',
  'personnel_leave': '请假申请',
  'personnel_trip': '出差申请',
  'equipment_inbound': '设备入库',
  'equipment_outbound': '设备出库',
  'equipment_transfer': '设备调动',
  'equipment_repair': '设备维修',
  'equipment_scrap': '设备报废',
  'project_completion': '项目结项',
  'purchase_request': '采购申请',
  'project-approval': '项目审批'
}

const FORM_FIELD_LABELS: Record<string, { label: string; icon?: any }> = {
  'employee_name': { label: '员工姓名', icon: User },
  'employee_id': { label: '员工编号' },
  'department_id': { label: '部门', icon: Building2 },
  'position_id': { label: '职位' },
  'phone': { label: '联系电话', icon: Phone },
  'gender': { label: '性别' },
  'start_date': { label: '入职日期', icon: Calendar },
  'employee_type': { label: '员工类型' },
  'email': { label: '邮箱', icon: Mail },
  'address': { label: '地址', icon: MapPin },
  'id_card': { label: '身份证号' },
  'emergency_contact': { label: '紧急联系人' },
  'emergency_phone': { label: '紧急联系电话', icon: Phone },
  'education': { label: '学历' },
  'major': { label: '专业' },
  'graduation_school': { label: '毕业院校' },
  'graduation_date': { label: '毕业日期', icon: Calendar },
  'bank_account': { label: '银行卡号' },
  'bank_name': { label: '开户银行' },
  'remark': { label: '备注' },
  'code': { label: '编号' },
  'name': { label: '名称' },
  'type': { label: '类型' },
  'manager_id': { label: '负责人', icon: User },
  'status': { label: '状态' },
  'end_date': { label: '结束日期', icon: Calendar },
  'country': { label: '国家' },
  'description': { label: '描述' },
  'budget': { label: '预算', icon: DollarSign },
  'warehouse_id': { label: '仓库', icon: Building2 },
  'supplier': { label: '供应商' },
  'purchase_date': { label: '采购日期', icon: Calendar },
  'total_price': { label: '总金额', icon: DollarSign },
  'inbound_type': { label: '入库类型' },
  'items': { label: '设备明细', icon: FileText },
  'equipment_type': { label: '设备类型' },
  'equipment_name': { label: '设备名称' },
  'equipment_model': { label: '设备型号' },
  'quantity': { label: '数量' },
  'serial_numbers': { label: '序列号' },
  'from_location': { label: '来源位置' },
  'to_location': { label: '目标位置', icon: MapPin },
  'transfer_reason': { label: '调拨原因' },
  'repair_type': { label: '维修类型' },
  'estimated_cost': { label: '预估费用', icon: DollarSign },
  // 设备调拨相关字段
  'fromLocationType': { label: '调出位置类型', icon: MapPin },
  'fromLocationId': { label: '调出位置', icon: Building2 },
  'fromManagerId': { label: '调出负责人', icon: User },
  'fromManagerName': { label: '调出负责人' },
  'fromLocationName': { label: '调出位置名称' },
  'toLocationType': { label: '调入位置类型', icon: MapPin },
  'toLocationId': { label: '调入位置', icon: Building2 },
  'toManagerId': { label: '调入负责人', icon: User },
  'toManagerName': { label: '调入负责人' },
  'toLocationName': { label: '调入位置名称' },
  'estimatedArrivalDate': { label: '预计到达日期', icon: Calendar },
  'transferItems': { label: '调拨设备明细', icon: FileText },
  // 发货信息字段
  'shipping_date': { label: '发货时间', icon: Calendar },
  'shipping_no': { label: '物流单号' },
  'shipping_notes': { label: '发货备注' },
  // 收货信息字段
  'receive_status': { label: '收货状态' },
  'receive_comment': { label: '收货备注' }
}

const GENDER_LABELS: Record<string, string> = {
  'male': '男',
  'female': '女',
  'other': '其他'
}

const EMPLOYEE_TYPE_LABELS: Record<string, string> = {
  'regular': '正式员工',
  'probation': '试用期',
  'intern': '实习生',
  'contract': '合同工',
  'part_time': '兼职'
}

export default function WorkflowDetailPage() {
  const { instanceId } = useParams<{ instanceId: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [instance, setInstance] = useState<WorkflowInstance | null>(null)
  const [tasks, setTasks] = useState<WorkflowTask[]>([])
  const [logs, setLogs] = useState<WorkflowLog[]>([])
  const [currentTask, setCurrentTask] = useState<WorkflowTask | null>(null)
  const [showAllLogs, setShowAllLogs] = useState(false)

  const [actionType, setActionType] = useState<'approve' | 'reject' | ''>('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')

  // 设备调拨相关状态
  const [shippingNo, setShippingNo] = useState('')
  const [shippedAt, setShippedAt] = useState('')
  const [shippingNotes, setShippingNotes] = useState('')
  const [receiveStatus, setReceiveStatus] = useState<'normal' | 'exception'>('normal')
  const [receiveComment, setReceiveComment] = useState('')
  // 发货信息（调入方查看）
  const [transferOrder, setTransferOrder] = useState<any>(null)
  // 表单字段
  const [formFields, setFormFields] = useState<any[]>([])

  const [activeTab, setActiveTab] = useState<'form' | 'workflow' | 'history'>('form')

  const [deptMap, setDeptMap] = useState<Record<string, string>>({})
  const [posMap, setPosMap] = useState<Record<string, string>>({})
  const [warehouseMap, setWarehouseMap] = useState<Record<string, string>>({})
  const [projectMap, setProjectMap] = useState<Record<string, string>>({})
  const [userMap, setUserMap] = useState<Record<string, string>>({})

  useEffect(() => {
    if (instanceId) {
      loadInstanceData()
    }
  }, [instanceId])

  const loadInstanceData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      let userId = 'current-user'
      if (token) {
        try {
          const base64Payload = token.split('.')[1]
          if (base64Payload) {
            const payload = JSON.parse(atob(base64Payload))
            userId = payload.userId || payload.id || 'current-user'
            setCurrentUserId(userId)
          }
        } catch (e) {
          console.warn('Token解析失败')
        }
      }

      const instanceRes = await fetch(`${API_URL.BASE}/api/workflow/processes/${instanceId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      if (instanceRes.ok) {
        const instanceResult = await instanceRes.json()
        if (instanceResult.success && instanceResult.data) {
          setInstance(instanceResult.data)

          // 加载表单字段
          const formKey = instanceResult.data.definition_key + '-form'
          const formRes = await fetch(`${API_URL.BASE}/api/form-templates/key/${formKey}`, {
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` })
            }
          })
          if (formRes.ok) {
            const formResult = await formRes.json()
            if (formResult.success && formResult.data) {
              setFormFields(formResult.data.fields || [])
            }
          }

          const tasksRes = await fetch(`${API_URL.BASE}/api/workflow/v2/process/instance/${instanceId}/tasks`, {
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` })
            }
          })

          if (tasksRes.ok) {
            const tasksResult = await tasksRes.json()
            if (tasksResult.success && tasksResult.data) {
              setTasks(tasksResult.data)

              const myTask = tasksResult.data.find((task: WorkflowTask) => {
                return task.assignee_id === userId && task.status === 'assigned'
              })
              setCurrentTask(myTask || null)
            }
          }

          const logsRes = await fetch(`${API_URL.BASE}/api/workflow/v2/process/instance/${instanceId}/logs`, {
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` })
            }
          })

          if (logsRes.ok) {
            const logsResult = await logsRes.json()
            if (logsResult.success && logsResult.data) {
              setLogs(logsResult.data)
            }
          }

          const formData = instanceResult.data.variables?.formData || {}
          
          // 初始化发货信息状态
          if (formData.shipping_date) setShippedAt(formData.shipping_date)
          if (formData.shipping_no) setShippingNo(formData.shipping_no)
          if (formData.shipping_notes) setShippingNotes(formData.shipping_notes)
          if (formData.receive_status) setReceiveStatus(formData.receive_status)
          if (formData.receive_comment) setReceiveComment(formData.receive_comment)
          
          // 收集需要加载的ID
          const deptIds = formData.department_id ? [formData.department_id] : []
          const posIds = formData.position_id ? [formData.position_id] : []
          const warehouseIds: string[] = []
          const projectIds: string[] = []
          const userIds: string[] = []
          
          // 设备调拨相关ID
          if (formData.fromLocationId) {
            if (formData.fromLocationType === 'warehouse') {
              warehouseIds.push(formData.fromLocationId)
            } else {
              projectIds.push(formData.fromLocationId)
            }
          }
          if (formData.toLocationId) {
            if (formData.toLocationType === 'warehouse') {
              warehouseIds.push(formData.toLocationId)
            } else {
              projectIds.push(formData.toLocationId)
            }
          }
          if (formData.fromManagerId) {
            userIds.push(formData.fromManagerId)
          }
          if (formData.toManagerId) {
            userIds.push(formData.toManagerId)
          }

          // 加载所有需要的映射数据
          const loadPromises: Promise<void>[] = []
          
          if (deptIds.length > 0) {
            loadPromises.push(
              fetch(`${API_URL.BASE}/api/departments`, {
                headers: { 'Authorization': `Bearer ${token}` }
              }).then(async (res) => {
                if (res.ok) {
                  const result = await res.json()
                  if (result.success && result.data) {
                    setDeptMap(Object.fromEntries(result.data.map((d: any) => [d.id, d.name])))
                  }
                }
              }).catch(() => {})
            )
          }
          
          if (posIds.length > 0) {
            loadPromises.push(
              fetch(`${API_URL.BASE}/api/positions`, {
                headers: { 'Authorization': `Bearer ${token}` }
              }).then(async (res) => {
                if (res.ok) {
                  const result = await res.json()
                  if (result.success && result.data) {
                    setPosMap(Object.fromEntries(result.data.map((p: any) => [p.id, p.name])))
                  }
                }
              }).catch(() => {})
            )
          }
          
          if (warehouseIds.length > 0) {
            loadPromises.push(
              fetch(`${API_URL.BASE}/api/warehouses`, {
                headers: { 'Authorization': `Bearer ${token}` }
              }).then(async (res) => {
                if (res.ok) {
                  const result = await res.json()
                  if (result.success && result.data) {
                    setWarehouseMap(Object.fromEntries(result.data.map((w: any) => [w.id, w.name])))
                  }
                }
              }).catch(() => {})
            )
          }
          
          if (projectIds.length > 0) {
            loadPromises.push(
              fetch(`${API_URL.BASE}/api/projects`, {
                headers: { 'Authorization': `Bearer ${token}` }
              }).then(async (res) => {
                if (res.ok) {
                  const result = await res.json()
                  if (result.success && result.data) {
                    setProjectMap(Object.fromEntries(result.data.map((p: any) => [p.id, p.name])))
                  }
                }
              }).catch(() => {})
            )
          }
          
          if (userIds.length > 0) {
            loadPromises.push(
              fetch(`${API_URL.BASE}/api/personnel`, {
                headers: { 'Authorization': `Bearer ${token}` }
              }).then(async (res) => {
                if (res.ok) {
                  const result = await res.json()
                  if (result.success && result.data) {
                    setUserMap(Object.fromEntries(result.data.map((u: any) => [u.id, u.name])))
                  }
                }
              }).catch(() => {})
            )
          }
          
          // 并行加载所有数据
          await Promise.all(loadPromises)
          
          // 设备调拨 - 如果是调入方审批节点，加载调拨单详情获取发货信息
          const isEquipmentTransfer = instanceResult.data.definition_key === 'equipment_transfer' || instanceResult.data.definition_key === 'equipment-transfer'
          const transferOrderId = instanceResult.data.business_id || formData.transferOrderId
          console.log('[WorkflowDetailPage] 加载调拨单 - isEquipmentTransfer:', isEquipmentTransfer)
          console.log('[WorkflowDetailPage] 加载调拨单 - instanceResult.data:', instanceResult.data)
          console.log('[WorkflowDetailPage] 加载调拨单 - instanceResult.data.business_id:', instanceResult.data.business_id)
          console.log('[WorkflowDetailPage] 加载调拨单 - formData:', formData)
          console.log('[WorkflowDetailPage] 加载调拨单 - formData.transferOrderId:', formData.transferOrderId)
          console.log('[WorkflowDetailPage] 加载调拨单 - transferOrderId:', transferOrderId)
          if (isEquipmentTransfer && transferOrderId) {
            try {
              const transferRes = await fetch(`${API_URL.BASE}/api/equipment/transfers/${transferOrderId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              })
              if (transferRes.ok) {
                const transferResult = await transferRes.json()
                if (transferResult.success && transferResult.data) {
                  setTransferOrder(transferResult.data)
                }
              }
            } catch (e) {
              console.warn('加载调拨单详情失败', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('加载流程数据失败:', error)
      alert('加载失败')
      navigate(-1)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!currentTask || !instance) return
    
    const isEquipmentTransfer = instance.definition_key === 'equipment_transfer' || instance.definition_key === 'equipment-transfer'
    const formData = instance.variables?.formData || {}
    const transferOrderId = instance.business_id || formData.transferOrderId
    
    console.log('[WorkflowDetailPage] handleApprove - isEquipmentTransfer:', isEquipmentTransfer)
    console.log('[WorkflowDetailPage] handleApprove - currentTask.node_id:', currentTask?.node_id)
    console.log('[WorkflowDetailPage] handleApprove - instance.business_id:', instance.business_id)
    console.log('[WorkflowDetailPage] handleApprove - formData.transferOrderId:', formData.transferOrderId)
    console.log('[WorkflowDetailPage] handleApprove - transferOrderId:', transferOrderId)
    
    // 设备调拨 - 调出方审批时验证发货时间
    if (isEquipmentTransfer && currentTask?.node_id && (currentTask.node_id === 'from-location-manager' || currentTask.node_id.includes('from'))) {
      if (!shippedAt) {
        alert('请填写发货时间')
        return
      }
    }
    
    // 设备调拨 - 调入方收货时验证异常说明
    if (isEquipmentTransfer && currentTask?.node_id && (currentTask.node_id === 'to-location-manager' || currentTask.node_id.includes('to'))) {
      if (receiveStatus === 'exception' && !receiveComment.trim()) {
        alert('请填写异常说明')
        return
      }
    }
    
    if (!confirm('确定要通过此申请吗？')) return

    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      let userId = 'current-user'
      let userName = '当前用户'
      if (token) {
        try {
          const base64Payload = token.split('.')[1]
          if (base64Payload) {
            const payload = JSON.parse(atob(base64Payload))
            userId = payload.userId || payload.id || 'current-user'
            userName = payload.name || payload.username || payload.sub || '当前用户'
          }
        } catch (e) {
          console.warn('Token解析失败')
        }
      }

      // 设备调拨 - 调出方审批时先调用发货API
      console.log('[WorkflowDetailPage] 准备调用发货API - 条件检查:', {
        isEquipmentTransfer,
        nodeId: currentTask?.node_id,
        isFromNode: currentTask?.node_id === 'from-location-manager' || currentTask?.node_id.includes('from'),
        hasTransferOrderId: !!transferOrderId
      })
      
      if (isEquipmentTransfer && currentTask?.node_id && (currentTask.node_id === 'from-location-manager' || currentTask.node_id.includes('from')) && transferOrderId) {
        console.log('[WorkflowDetailPage] 调用发货API - transferOrderId:', transferOrderId)
        const shipRes = await fetch(`${API_URL.BASE}/api/equipment/transfers/${transferOrderId}/ship`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            shipped_at: shippedAt,
            shipping_no: shippingNo
          })
        })
        if (!shipRes.ok) {
          const errData = await shipRes.json()
          throw new Error(errData.error || '发货确认失败')
        }
        console.log('[WorkflowDetailPage] 发货API调用成功')
      }
      
      // 设备调拨 - 调入方确认收货时先调用收货API
      if (isEquipmentTransfer && currentTask?.node_id && (currentTask.node_id === 'to-location-manager' || currentTask.node_id.includes('to')) && transferOrderId) {
        const receiveRes = await fetch(`${API_URL.BASE}/api/equipment/transfers/${transferOrderId}/receive`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            receive_status: receiveStatus === 'normal' ? 'normal' : 'exception',
            receive_comment: receiveComment
          })
        })
        if (!receiveRes.ok) {
          const errData = await receiveRes.json()
          throw new Error(errData.error || '收货确认失败')
        }
      }

      // 准备任务完成参数
      const completeParams: any = {
        action: 'approved',
        comment: comment,
        operator: { id: userId, name: userName }
      }

      // 设备调拨 - 调出方审批时传递发货信息到流程变量
      if (isEquipmentTransfer && currentTask?.node_id && (currentTask.node_id === 'from-location-manager' || currentTask.node_id.includes('from'))) {
        completeParams.formData = {
          shipping_date: shippedAt,
          shipping_no: shippingNo,
          shipping_notes: shippingNotes
        }
      }

      // 设备调拨 - 调入方审批时传递收货信息到流程变量
      if (isEquipmentTransfer && currentTask?.node_id && (currentTask.node_id === 'to-location-manager' || currentTask.node_id.includes('to'))) {
        completeParams.formData = {
          receive_status: receiveStatus === 'normal' ? 'normal' : 'exception',
          receive_comment: receiveComment
        }
      }

      const res = await fetch(`${API_URL.BASE}/api/workflow/v2/task/${currentTask.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(completeParams)
      })

      if (res.ok) {
        alert('审批通过')
        setActionType('')
        setComment('')
        setShippingNo('')
        setShippedAt('')
        setShippingNotes('')
        setReceiveStatus('normal')
        setReceiveComment('')
        loadInstanceData()
      } else {
        throw new Error('审批失败')
      }
    } catch (error: any) {
      console.error('审批失败:', error)
      alert(error.message || '审批失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!currentTask) return
    if (!comment.trim()) {
      alert('请填写驳回原因')
      return
    }
    if (!confirm('确定要驳回此申请吗？')) return

    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      let userId = 'current-user'
      let userName = '当前用户'
      if (token) {
        try {
          const base64Payload = token.split('.')[1]
          if (base64Payload) {
            const payload = JSON.parse(atob(base64Payload))
            userId = payload.userId || payload.id || 'current-user'
            userName = payload.name || payload.username || payload.sub || '当前用户'
          }
        } catch (e) {
          console.warn('Token解析失败')
        }
      }

      const res = await fetch(`${API_URL.BASE}/api/workflow/v2/task/${currentTask.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'rejected',
          comment: comment,
          operator: { id: userId, name: userName }
        })
      })

      if (res.ok) {
        alert('已驳回')
        setActionType('')
        setComment('')
        loadInstanceData()
      } else {
        throw new Error('驳回失败')
      }
    } catch (error) {
      console.error('驳回失败:', error)
      alert('驳回失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleWithdraw = async () => {
    if (!instance) return
    if (!confirm('确定要撤回此申请吗？')) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL.BASE}/api/workflow/processes/${instance.id}/withdraw`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        alert('已撤回')
        loadInstanceData()
      } else {
        throw new Error('撤回失败')
      }
    } catch (error) {
      console.error('撤回失败:', error)
      alert('撤回失败，请重试')
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFieldValue = (key: string, value: any, formData?: Record<string, any>): string => {
    if (value === null || value === undefined || value === '') {
      return '-'
    }

    if (key === 'gender' && GENDER_LABELS[value]) {
      return GENDER_LABELS[value]
    }

    if (key === 'employee_type' && EMPLOYEE_TYPE_LABELS[value]) {
      return EMPLOYEE_TYPE_LABELS[value]
    }

    if (key === 'department_id' && deptMap[value]) {
      return deptMap[value]
    }

    if (key === 'position_id' && posMap[value]) {
      return posMap[value]
    }

    if (key === 'warehouse_id' && warehouseMap[value]) {
      return warehouseMap[value]
    }

    if (key === 'inbound_type') {
      const typeLabels: Record<string, string> = {
        'purchase': '采购入库',
        'other': '其他入库'
      }
      return typeLabels[value] || value
    }

    // 设备调拨相关字段转换
    if (key === 'fromLocationType' || key === 'toLocationType') {
      const typeLabels: Record<string, string> = {
        'warehouse': '仓库',
        'project': '项目'
      }
      return typeLabels[value] || value
    }

    if (key === 'fromLocationId' && formData) {
      if (formData.fromLocationType === 'warehouse' && warehouseMap[value]) {
        return warehouseMap[value]
      } else if (formData.fromLocationType === 'project' && projectMap[value]) {
        return projectMap[value]
      }
    }

    if (key === 'toLocationId' && formData) {
      if (formData.toLocationType === 'warehouse' && warehouseMap[value]) {
        return warehouseMap[value]
      } else if (formData.toLocationType === 'project' && projectMap[value]) {
        return projectMap[value]
      }
    }

    if (key === 'fromManagerId' && userMap[value]) {
      return userMap[value]
    }

    if (key === 'toManagerId' && userMap[value]) {
      return userMap[value]
    }

    if (key === 'items' && Array.isArray(value)) {
      return `${value.length} 项设备`
    }

    if (key === 'transferItems' && Array.isArray(value)) {
      return `${value.length} 项设备`
    }

    // 发货和收货字段格式化
    if (key === 'shippingDate' || key === 'receiveDate') {
      try {
        return new Date(value).toLocaleDateString('zh-CN')
      } catch {
        return value
      }
    }

    if (key === 'receiveStatus') {
      const statusLabels: Record<string, string> = {
        'normal': '正常',
        'exception': '异常',
        'damaged': '损坏',
        'missing': '缺失',
        'partial': '部分'
      }
      return statusLabels[value] || value
    }

    if (Array.isArray(value)) {
      return value.join(', ')
    }

    if (typeof value === 'object') {
      return JSON.stringify(value)
    }

    return String(value)
  }

  // 检查字段是否在当前节点可见
  const isFieldVisibleForNode = (fieldName: string): boolean => {
    const field = formFields.find(f => f.name === fieldName)
    if (!field) return true // 如果没有字段配置，默认可见
    
    // 如果没有 visibleOn 条件，默认可见
    if (!field.visibleOn) return true
    
    // 如果 visible 是 false，则检查 visibleOn 条件
    if (field.visible === false) {
      try {
        const nodeId = currentTask?.node_id || ''
        const visibleOn = field.visibleOn.replace(/node_id/g, `'${nodeId}'`)
        return eval(visibleOn)
      } catch (e) {
        console.warn('visibleOn 表达式解析失败:', field.visibleOn, e)
        return false
      }
    }
    
    return true
  }

  // 隐藏原始ID字段，只显示转换后的名称
  const HIDDEN_FIELDS = ['fromManagerId', 'toManagerId', 'fromLocationId', 'toLocationId']

  const renderFormField = (key: string, value: any, formData?: Record<string, any>) => {
    // 如果是隐藏字段，不渲染
    if (HIDDEN_FIELDS.includes(key)) {
      return null
    }

    const fieldConfig = FORM_FIELD_LABELS[key] || { label: key }
    const Icon = fieldConfig.icon
    const displayValue = formatFieldValue(key, value, formData)

    if (key === 'items' && Array.isArray(value)) {
      return (
        <div key={key} className="col-span-1 md:col-span-2 p-3 bg-white rounded-lg border border-gray-100">
          <div className="text-sm text-gray-500 mb-3 flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-blue-600" />}
            {fieldConfig.label}
          </div>
          <div className="space-y-2">
            {value.map((item: any, index: number) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <div className="text-gray-500 mb-1">设备名称</div>
                    <div className="text-gray-900">{item.equipment_name || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">设备型号</div>
                    <div className="text-gray-900">{item.model_no || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">数量</div>
                    <div className="text-gray-900">{item.quantity || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">单价</div>
                    <div className="text-gray-900">{item.purchase_price || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">小计</div>
                    <div className="text-gray-900">{item.total_price || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">序列号</div>
                    <div className="text-gray-900 break-all">{item.serial_numbers || '-'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div key={key} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-blue-600" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-500 mb-1">{fieldConfig.label}</div>
          <div className="text-sm text-gray-900 break-words">{displayValue}</div>
        </div>
      </div>
    )
  }

  const renderFormTab = () => {
    if (!instance) return null

    const formData = instance.variables?.formData || {}
    const entries = Object.entries(formData).filter(([key, value]) => {
      // 过滤掉隐藏的ID字段
      if (HIDDEN_FIELDS.includes(key)) return false
      return value !== null && value !== undefined && value !== ''
    })

    const isEquipmentTransfer = instance.definition_key === 'equipment_transfer' || instance.definition_key === 'equipment-transfer'
    const isInboundApproval = currentTask?.node_id && (currentTask.node_id === 'to-location-manager' || currentTask.node_id.includes('to'))

    return (
      <div className="space-y-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" />
            申请内容
          </h3>
          {entries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {entries.map(([key, value]) => renderFormField(key, value, formData))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">暂无表单数据</div>
          )}
        </div>

        {isEquipmentTransfer && isInboundApproval && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              发货信息
            </h3>
            {(formData.shipping_date || formData.shipping_no || formData.shipping_notes) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {formData.shipping_date && (
                  <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100">
                    <Calendar className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-500 mb-1">发货时间</div>
                      <div className="text-sm text-gray-900">{formData.shipping_date}</div>
                    </div>
                  </div>
                )}
                {formData.shipping_no && (
                  <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100">
                    <FileText className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-500 mb-1">物流单号</div>
                      <div className="text-sm text-gray-900">{formData.shipping_no}</div>
                    </div>
                  </div>
                )}
                {formData.shipping_notes && (
                  <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100 md:col-span-2">
                    <FileText className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-500 mb-1">发货备注</div>
                      <div className="text-sm text-gray-900">{formData.shipping_notes}</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">暂无发货信息</div>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderWorkflowTab = () => {
    if (!instance) return null

    return (
      <div className="space-y-6">
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-gray-400" />
            流程状态
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">流程状态</div>
              <div className="font-medium text-gray-900">
                {STATUS_CONFIG[instance.status]?.label || instance.status}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">发起人</div>
              <div className="font-medium text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500" />
                {instance.initiator_name}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">当前节点</div>
              <div className="font-medium text-gray-900">
                {instance.current_node_name || '-'}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">开始时间</div>
              <div className="font-medium text-gray-900 text-sm">
                {formatDate(instance.start_time)}
              </div>
            </div>
          </div>
        </div>

        {tasks.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-gray-400" />
              审批节点
            </h3>
            <div className="space-y-3">
              {tasks.map((task, index) => (
                <div
                  key={task.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border ${
                    task.status === 'completed'
                      ? 'bg-green-50 border-green-200'
                      : task.status === 'assigned'
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    task.status === 'completed'
                      ? 'bg-green-500 text-white'
                      : task.status === 'assigned'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}>
                    {task.status === 'completed' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium text-gray-900">{task.name}</div>
                      {task.status === 'completed' && task.result && (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          task.result === 'approved' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {task.result === 'approved' ? '已通过' : '已驳回'}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      审批人: {task.assignee_name}
                    </div>
                    {task.comment && (
                      <div className="bg-white border border-gray-200 p-3 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1">审批意见:</div>
                        <div className="text-sm text-gray-900">{task.comment}</div>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 flex flex-col items-end">
                    <div>{task.completed_at ? formatDate(task.completed_at) : formatDate(task.created_at)}</div>
                    {task.completed_at && (
                      <div className="text-gray-400">{formatTime(task.completed_at)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderHistoryTab = () => {
    const displayLogs = showAllLogs ? logs : logs.slice(0, 5)

    return (
      <div className="space-y-6">
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-400" />
            流程历史
          </h3>
          {logs.length > 0 ? (
            <div className="space-y-4">
              {displayLogs.map((log, index) => (
                <div key={log.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${
                      log.action === 'approved' ? 'bg-green-500' :
                      log.action === 'rejected' ? 'bg-red-500' :
                      log.action === 'withdrawn' ? 'bg-gray-500' :
                      'bg-blue-500'
                    }`} />
                    {index < displayLogs.length - 1 && (
                      <div className="w-0.5 h-full bg-gray-300 mt-2" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{log.operator_name || '系统'}</span>
                      <span className="text-sm text-gray-500">
                        {log.node_name && `在 ${log.node_name}`}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 mb-1">
                      {log.action === 'approved' && '通过了申请'}
                      {log.action === 'rejected' && '驳回了申请'}
                      {log.action === 'withdrawn' && '撤回了申请'}
                      {log.action === 'started' && '发起了申请'}
                      {log.action === 'completed' && '完成了审批'}
                      {log.action === 'terminated' && '终止了流程'}
                    </div>
                    {log.comment && (
                      <div className="text-sm text-gray-600 bg-white p-2 rounded border border-gray-200">
                        {log.comment}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">{formatDate(log.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">暂无流程历史</div>
          )}
          {logs.length > 5 && (
            <button
              onClick={() => setShowAllLogs(!showAllLogs)}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              {showAllLogs ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  收起
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  查看全部 {logs.length} 条记录
                </>
              )}
            </button>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!instance) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">流程不存在或已被删除</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回
          </button>
        </div>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[instance.status] || STATUS_CONFIG['pending']
  const StatusIcon = statusConfig.icon

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            返回
          </button>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {statusConfig.label}
                  </span>
                  <span className="text-sm text-gray-500">
                    {PROCESS_TYPE_LABELS[instance.definition_key] || instance.definition_key}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{instance.title}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {instance.initiator_name}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(instance.start_time)}
                  </span>
                </div>
              </div>

              {currentTask && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setActionType('approve')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    通过
                  </button>
                  <button
                    onClick={() => setActionType('reject')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    驳回
                  </button>
                </div>
              )}

              {instance.status === 'running' && !currentTask && currentUserId === instance.initiator_id && (
                <button
                  onClick={handleWithdraw}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  撤回
                </button>
              )}
            </div>
          </div>
        </div>

        {actionType && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              {actionType === 'approve' ? '审批通过' : '审批驳回'}
            </h3>
            
            {/* 设备调拨 - 调出方审批时显示发货信息 */}
            {actionType === 'approve' && (instance?.definition_key === 'equipment_transfer' || instance?.definition_key === 'equipment-transfer') && 
             currentTask?.node_id && (currentTask.node_id === 'from-location-manager' || currentTask.node_id.includes('from')) && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-3">发货信息填写</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      发货时间 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={shippedAt}
                      onChange={(e) => setShippedAt(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      物流单号
                    </label>
                    <input
                      type="text"
                      value={shippingNo}
                      onChange={(e) => setShippingNo(e.target.value)}
                      placeholder="请输入物流单号"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      发货备注
                    </label>
                    <textarea
                      value={shippingNotes}
                      onChange={(e) => setShippingNotes(e.target.value)}
                      placeholder="请输入发货备注"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* 设备调拨 - 调入方确认时显示收货信息 */}
            {actionType === 'approve' && (instance?.definition_key === 'equipment_transfer' || instance?.definition_key === 'equipment-transfer') && 
             currentTask?.node_id && (currentTask.node_id === 'to-location-manager' || currentTask.node_id.includes('to')) && (
              <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-800 mb-3">收货确认</h4>
                
                {/* 显示发货信息 - 优先从流程变量获取，其次从调拨单获取 */}
                {(instance?.variables?.formData?.shipping_date || instance?.variables?.formData?.shipping_no || 
                   instance?.variables?.formData?.shipping_notes || transferOrder?.shipped_at || transferOrder?.shipping_no) && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h5 className="font-medium text-blue-800 mb-2 text-sm">发货信息</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {(instance?.variables?.formData?.shipping_date || transferOrder?.shipped_at) && (
                        <div>
                          <span className="text-gray-500">发货时间：</span>
                          <span className="text-gray-900">
                            {instance?.variables?.formData?.shipping_date || transferOrder?.shipped_at?.substring(0, 10)}
                          </span>
                        </div>
                      )}
                      {(instance?.variables?.formData?.shipping_no || transferOrder?.shipping_no) && (
                        <div>
                          <span className="text-gray-500">物流单号：</span>
                          <span className="text-gray-900">
                            {instance?.variables?.formData?.shipping_no || transferOrder?.shipping_no}
                          </span>
                        </div>
                      )}
                      {instance?.variables?.formData?.shipping_notes && (
                        <div className="col-span-1 md:col-span-2">
                          <span className="text-gray-500">发货备注：</span>
                          <span className="text-gray-900">{instance.variables.formData.shipping_notes}</span>
                        </div>
                      )}
                      {transferOrder?.shipping_attachment && (
                        <div className="col-span-1 md:col-span-2">
                          <span className="text-gray-500">发货凭证：</span>
                          <a
                            href={transferOrder.shipping_attachment}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline ml-2"
                          >
                            查看附件
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      收货状态 <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="receiveStatus"
                          value="normal"
                          checked={receiveStatus === 'normal'}
                          onChange={() => setReceiveStatus('normal')}
                          className="text-green-600"
                        />
                        <span className="text-sm">正常收货</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="receiveStatus"
                          value="exception"
                          checked={receiveStatus === 'exception'}
                          onChange={() => setReceiveStatus('exception')}
                          className="text-red-600"
                        />
                        <span className="text-sm">异常收货</span>
                      </label>
                    </div>
                  </div>
                  {receiveStatus === 'exception' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        异常说明 <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={receiveComment}
                        onChange={(e) => setReceiveComment(e.target.value)}
                        placeholder="请描述收货异常情况"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                审批意见
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={actionType === 'approve' ? '请输入审批意见（可选）' : '请输入驳回原因（必填）'}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={actionType === 'approve' ? handleApprove : handleReject}
                disabled={submitting || (actionType === 'reject' && !comment.trim())}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {submitting ? '提交中...' : '提交'}
              </button>
              <button
                onClick={() => { 
                  setActionType(''); 
                  setComment('');
                  setShippingNo('');
                  setShippedAt('');
                  setReceiveStatus('normal');
                  setReceiveComment('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                取消
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex gap-4 px-6">
              <button
                onClick={() => setActiveTab('form')}
                className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'form'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                申请内容
              </button>
              <button
                onClick={() => setActiveTab('workflow')}
                className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'workflow'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                流程状态
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'history'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                流程历史
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'form' && renderFormTab()}
            {activeTab === 'workflow' && renderWorkflowTab()}
            {activeTab === 'history' && renderHistoryTab()}
          </div>
        </div>
      </div>
    </div>
  )
}
