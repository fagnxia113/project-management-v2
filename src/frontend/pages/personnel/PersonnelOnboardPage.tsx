import React from 'react'
import { useNavigate } from 'react-router-dom'
import ProcessFormLauncher from '../../components/ProcessFormLauncher'

export default function PersonnelOnboardPage() {
  const navigate = useNavigate()

  const handleSuccess = (processInstanceId: string) => {
    console.log('入职流程启动成功:', processInstanceId)
    navigate(-1)
  }

  const handleCancel = () => {
    navigate('/personnel')
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">员工入职申请</h1>
        
        <ProcessFormLauncher 
          presetId="preset-employee-onboard"
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </div>
  )
}
