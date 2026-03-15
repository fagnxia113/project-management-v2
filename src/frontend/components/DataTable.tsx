import { ReactNode } from 'react'

interface Column<T> {
  key: keyof T
  header: string
  render?: (value: any, row: T) => ReactNode
  width?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  emptyMessage?: string
  rowKey?: keyof T
  onRowClick?: (row: T) => void
}

export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  emptyMessage = '暂无数据',
  rowKey = 'id',
  onRowClick
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="premium-card p-12 text-center text-slate-400">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="font-bold text-sm tracking-widest uppercase">正在同步数据...</span>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="premium-card p-16 text-center text-slate-400">
        <svg className="w-16 h-16 mx-auto mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="font-bold text-lg text-slate-500 mb-1">{emptyMessage}</p>
        <p className="text-sm">没有找到相关记录，您可以尝试更换关键词或稍后再试</p>
      </div>
    )
  }

  return (
    <div className="premium-card overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200/60">
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] ${
                    column.width ? '' : 'whitespace-nowrap'
                  }`}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, index) => (
              <tr
                key={String(row[rowKey] || index)}
                onClick={() => onRowClick?.(row)}
                className={`transition-all duration-200 ${onRowClick ? 'hover:bg-blue-50/50 cursor-pointer active:bg-blue-100/30' : 'hover:bg-slate-50/50'}`}
              >
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className={`px-6 py-5 text-sm text-slate-600 font-medium ${
                      column.width ? '' : 'whitespace-nowrap'
                    }`}
                  >
                    {column.render
                      ? column.render(row[column.key], row)
                      : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// 分页组件
interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  total?: number
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  total
}: PaginationProps) {
  return (
    <div className="flex items-center justify-between px-8 py-6">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
        Showing Page <span className="text-slate-900">{currentPage}</span> of <span className="text-slate-900">{totalPages}</span>
        {total && (
          <span className="ml-2 border-l border-slate-200 pl-2">Total <span className="text-blue-600">{total}</span> Results</span>
        )}
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 disabled:opacity-30 hover:bg-slate-50 hover:text-blue-600 transition-all active:scale-90"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum: number
          if (totalPages <= 5) pageNum = i + 1
          else if (currentPage <= 3) pageNum = i + 1
          else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
          else pageNum = currentPage - 2 + i
          
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`min-w-[40px] h-10 flex items-center justify-center rounded-xl text-xs font-black transition-all active:scale-90 ${
                currentPage === pageNum
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-white border border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              {pageNum}
            </button>
          )
        })}
        
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 disabled:opacity-30 hover:bg-slate-50 hover:text-blue-600 transition-all active:scale-90"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// 搜索框组件
interface SearchBoxProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onSearch?: () => void
}

export function SearchBox({
  value,
  onChange,
  placeholder = '搜索...',
  onSearch
}: SearchBoxProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch?.()
  }

  return (
    <form onSubmit={handleSubmit} className="relative group max-w-sm">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-12 pr-4 py-3 bg-white/80 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold placeholder:text-slate-400 placeholder:font-normal"
      />
      <button 
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-md shadow-blue-500/20"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </form>
  )
}
