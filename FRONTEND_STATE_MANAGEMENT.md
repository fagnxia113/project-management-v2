# 前端状态管理使用指南

## 概述

项目引入了React Context API作为状态管理方案，提供以下全局状态管理：

1. **UserContext** - 用户认证和用户信息管理
2. **PermissionContext** - 权限管理（已存在）
3. **NotificationContext** - 通知管理
4. **TaskContext** - 任务管理

## 使用方法

### 1. UserContext

管理用户登录、登出和用户信息更新。

```tsx
import { useUser } from '../contexts/UserContext'

function MyComponent() {
  const { user, token, loading, login, logout, updateUser, refreshUser } = useUser()

  // 登录
  const handleLogin = async () => {
    try {
      await login('username', 'password')
    } catch (error) {
      console.error('登录失败:', error.message)
    }
  }

  // 登出
  const handleLogout = () => {
    logout()
  }

  // 更新用户信息
  const handleUpdateUser = () => {
    updateUser({ name: '新名称' })
  }

  // 刷新用户信息
  const handleRefreshUser = async () => {
    await refreshUser()
  }

  if (loading) {
    return <div>加载中...</div>
  }

  return (
    <div>
      <p>欢迎, {user?.name}</p>
      <button onClick={handleLogin}>登录</button>
      <button onClick={handleLogout}>登出</button>
    </div>
  )
}
```

### 2. PermissionContext

检查用户权限。

```tsx
import { usePermission } from '../contexts/PermissionContext'

function MyComponent() {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission()

  return (
    <div>
      {hasPermission('user:create') && (
        <button>创建用户</button>
      )}
      
      {hasAnyPermission(['user:edit', 'user:delete']) && (
        <button>编辑或删除用户</button>
      )}
      
      {hasAllPermissions(['user:view', 'user:edit']) && (
        <button>查看和编辑用户</button>
      )}
    </div>
  )
}
```

### 3. NotificationContext

管理通知消息。

```tsx
import { useNotification } from '../contexts/NotificationContext'

function NotificationBadge() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotification()

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id)
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
  }

  const handleDelete = async (id: string) => {
    await deleteNotification(id)
  }

  return (
    <div>
      <span>未读通知: {unreadCount}</span>
      <button onClick={handleMarkAllAsRead}>全部已读</button>
      <ul>
        {notifications.map(notif => (
          <li key={notif.id}>
            <span>{notif.title}</span>
            {!notif.read && (
              <button onClick={() => handleMarkAsRead(notif.id)}>标记已读</button>
            )}
            <button onClick={() => handleDelete(notif.id)}>删除</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

### 4. TaskContext

管理待办任务。

```tsx
import { useTask } from '../contexts/TaskContext'

function TaskList() {
  const { tasks, loading, error, completeTask, claimTask, delegateTask } = useTask()

  const handleComplete = async (taskId: string) => {
    try {
      await completeTask(taskId, 'approve', '同意')
    } catch (error) {
      console.error('完成任务失败:', error.message)
    }
  }

  const handleClaim = async (taskId: string) => {
    try {
      await claimTask(taskId)
    } catch (error) {
      console.error('认领任务失败:', error.message)
    }
  }

  const handleDelegate = async (taskId: string, targetUserId: string) => {
    try {
      await delegateTask(taskId, targetUserId, '委托原因')
    } catch (error) {
      console.error('委托任务失败:', error.message)
    }
  }

  if (loading) {
    return <div>加载中...</div>
  }

  if (error) {
    return <div>错误: {error}</div>
  }

  return (
    <div>
      <h2>我的任务</h2>
      <ul>
        {tasks.map(task => (
          <li key={task.id}>
            <span>{task.name}</span>
            <span>{task.status}</span>
            <button onClick={() => handleComplete(task.id)}>完成</button>
            {task.status === 'created' && (
              <button onClick={() => handleClaim(task.id)}>认领</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

## 优势

1. **类型安全** - 所有Context都有完整的TypeScript类型定义
2. **自动刷新** - 通知和任务会自动定期刷新
3. **统一管理** - 所有全局状态集中管理，避免prop drilling
4. **易于测试** - 可以轻松mock Context进行测试
5. **性能优化** - 使用useCallback优化回调函数

## 注意事项

1. 所有Context都包装在AppProvider中，无需手动引入
2. 使用Context时确保在组件内部调用hook
3. 异步操作需要适当的错误处理
4. 通知和任务会自动每60秒刷新一次
5. 用户信息会在token过期时自动登出

## 迁移指南

如果现有代码使用localStorage直接管理用户信息，建议迁移到UserContext：

```tsx
// 旧代码
const user = JSON.parse(localStorage.getItem('user') || '{}')

// 新代码
const { user } = useUser()
```

如果现有代码直接调用API获取任务，建议迁移到TaskContext：

```tsx
// 旧代码
const [tasks, setTasks] = useState([])
useEffect(() => {
  fetch('/api/workflow/my-tasks')
    .then(res => res.json())
    .then(data => setTasks(data.data))
}, [])

// 新代码
const { tasks, loading } = useTask()
```
