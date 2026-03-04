import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import WorkflowFormLauncher from '../../components/WorkflowFormLauncher'

export default function WorkflowFormPage() {
  const { definitionKey } = useParams<{ definitionKey: string }>()
  const navigate = useNavigate()

  const handleSuccess = (processInstanceId: string) => {
    console.log('流程启动成功:', processInstanceId)
    navigate('/approvals/mine')
  }

  const handleCancel = () => {
    navigate('/approvals/new')
  }

  if (!definitionKey) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-red-600">流程定义Key不存在</h3>
          <button 
            className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" 
            onClick={handleCancel}
          >
            返回
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <WorkflowFormLauncher 
          definitionKey={definitionKey}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </div>
  )
}
