import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

describe('测试框架验证', () => {
  it('Vitest 应该正常工作', () => {
    expect(1 + 1).toBe(2)
  })

  it('应该能够测试异步代码', async () => {
    const promise = Promise.resolve(42)
    await expect(promise).resolves.toBe(42)
  })

  it('应该能够模拟函数', () => {
    const mockFn = vi.fn()
    mockFn('hello')
    expect(mockFn).toHaveBeenCalledWith('hello')
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  it('应该能够测试 React 组件', () => {
    const TestComponent = () => <div>测试组件</div>
    render(<TestComponent />)
    expect(screen.getByText('测试组件')).toBeInTheDocument()
  })

  it('应该能够处理用户交互', async () => {
    const TestComponent = () => {
      const [count, setCount] = React.useState(0)
      return (
        <div>
          <span>计数: {count}</span>
          <button onClick={() => setCount(count + 1)}>增加</button>
        </div>
      )
    }

    const user = userEvent.setup()
    render(<TestComponent />)

    expect(screen.getByText('计数: 0')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '增加' }))

    await waitFor(() => {
      expect(screen.getByText('计数: 1')).toBeInTheDocument()
    })
  })
})
