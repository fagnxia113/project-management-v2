import { ReactNode, useEffect, useRef } from 'react'

interface ModalDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  footer?: ReactNode
}

export default function ModalDialog({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer
}: ModalDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // ESC键关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // 禁止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* 对话框内容 */}
      <div
        ref={dialogRef}
        className={`relative glass-card rounded-[2.5rem] shadow-2xl ${sizeClasses[size]} w-full max-h-[90vh] flex flex-col overflow-hidden animate-slide-up border border-white/50`}
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

        {/* 头部 */}
        <div className="flex items-center justify-between px-10 py-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h2>
            <div className="h-1 w-12 bg-blue-600 rounded-full mt-2"></div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar">
          {children}
        </div>

        {/* 底部 */}
        {footer && (
          <div className="flex items-center justify-end px-10 py-8 bg-slate-50/50 border-t border-slate-200/60 space-x-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
