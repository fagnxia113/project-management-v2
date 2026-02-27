import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProcessFormLauncher from '../../components/ProcessFormLauncher'

export default function ProjectCreatePage() {
  const navigate = useNavigate()
  const [isFormOpen, setIsFormOpen] = useState(false)

  const handleSuccess = (processInstanceId: string) => {
    console.log('项目创建流程启动成功:', processInstanceId)
    setIsFormOpen(false)
    navigate('/projects')
  }

  const handleCancel = () => {
    setIsFormOpen(false)
    navigate('/projects')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">项目创建</h1>
          <p className="mt-1 text-sm text-gray-600">创建新项目并提交审批</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <ProcessFormLauncher 
          presetId="preset-project-approval"
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </div>
  )
}
