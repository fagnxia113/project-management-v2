import { useState, useRef } from 'react'
import { API_URL } from '../config/api'

export interface EquipmentImage {
  id: string
  image_type: string
  image_url: string
  image_name?: string
  image_size?: number
  created_at: string
  business_type?: string
  business_id?: string
}

interface ImageUploadProps {
  imageType: string
  businessType?: string
  businessId?: string
  equipmentName?: string
  modelNo?: string
  category?: string
  existingImages?: EquipmentImage[]
  maxImages?: number
  onUploadSuccess?: (image: EquipmentImage) => void
  onUploadError?: (error: string) => void
  onDelete?: (imageId: string) => void
}

export default function ImageUpload({
  imageType,
  businessType,
  businessId,
  equipmentName,
  modelNo,
  category,
  existingImages = [],
  maxImages = 5,
  onUploadSuccess,
  onUploadError,
  onDelete
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [images, setImages] = useState<EquipmentImage[]>(existingImages)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getImageTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'inbound_main': '仪器主体图片',
      'inbound_model': '设备识别图片',
      'transfer_shipping': '发货图片',
      'transfer_packed': '打包图片',
      'transfer_receiving': '收货图片'
    }
    return labels[type] || '图片'
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (images.length + files.length > maxImages) {
      onUploadError?.(`最多只能上传${maxImages}张图片`)
      return
    }

    setUploading(true)
    const token = localStorage.getItem('token')

    for (const file of files) {
      try {
        const formData = new FormData()
        formData.append('image', file)
        formData.append('image_type', imageType)
        if (businessType) formData.append('business_type', businessType)
        if (businessId) formData.append('business_id', businessId)
        if (equipmentName) formData.append('equipment_name', equipmentName)
        if (modelNo) formData.append('model_no', modelNo)
        if (category) formData.append('category', category)

        const response = await fetch(`${API_URL.BASE}/api/equipment/images/upload`, {
          method: 'POST',
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: formData
        })

        const result = await response.json()
        if (result.success && result.data && result.data.image_url) {
          const newImage = result.data
          setImages(prev => [...prev, newImage])
          onUploadSuccess?.(newImage)
        } else {
          onUploadError?.(result.error || '上传失败，返回数据格式错误')
        }
      } catch (error) {
        console.error('上传失败:', error)
        onUploadError?.('上传失败，请重试')
      }
    }

    setUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (imageId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.BASE}/api/equipment/images/${imageId}`, {
        method: 'DELETE',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      const result = await response.json()
      if (result.success) {
        setImages(prev => prev.filter(img => img.id !== imageId))
        onDelete?.(imageId)
      } else {
        onUploadError?.(result.error || '删除失败')
      }
    } catch (error) {
      console.error('删除失败:', error)
      onUploadError?.('删除失败，请重试')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {getImageTypeLabel(imageType)}
        </label>
        <span className="text-xs text-gray-500">
          {images.length}/{maxImages}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {images.filter(image => image && image.image_url).map((image) => (
          <div key={image.id} className="relative group">
            <img
              src={image.image_url}
              alt={image.image_name || '图片'}
              className="w-full h-32 object-cover rounded-lg border border-gray-200"
            />
            <button
              type="button"
              onClick={() => handleDelete(image.id)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <div className="text-sm">上传中...</div>
            ) : (
              <>
                <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm">添加图片</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}
