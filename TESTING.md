# 测试框架文档

本项目使用 Vitest 作为测试框架，配合 @testing-library/react 进行 React 组件测试。

## 安装依赖

```bash
npm install --save-dev vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

## 测试脚本

- `npm test` - 运行测试（监视模式）
- `npm run test:run` - 运行测试一次
- `npm run test:ui` - 运行测试 UI 界面
- `npm run test:coverage` - 运行测试并生成覆盖率报告

## 测试文件结构

```
src/
├── tests/
│   ├── setup.ts              # 测试环境配置
│   ├── framework.test.tsx    # 测试框架验证
│   ├── jwt.test.ts           # JWT 服务测试
│   └── validator.test.ts     # 验证器测试
└── ...
```

## 编写测试

### 基本测试示例

```typescript
import { describe, it, expect } from 'vitest'

describe('测试组名称', () => {
  it('测试用例描述', () => {
    expect(1 + 1).toBe(2)
  })
})
```

### React 组件测试

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  it('应该渲染组件', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('应该处理用户交互', async () => {
    const user = userEvent.setup()
    render(<MyComponent />)

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('Clicked')).toBeInTheDocument()
    })
  })
})
```

### 异步测试

```typescript
import { describe, it, expect } from 'vitest'

describe('异步测试', () => {
  it('应该测试异步函数', async () => {
    const result = await fetchData()
    expect(result).toBeDefined()
  })

  it('应该测试 Promise', async () => {
    await expect(fetchData()).resolves.toBe('data')
  })
})
```

### 模拟函数

```typescript
import { describe, it, expect, vi } from 'vitest'

describe('模拟函数', () => {
  it('应该模拟函数调用', () => {
    const mockFn = vi.fn()
    mockFn('hello')
    expect(mockFn).toHaveBeenCalledWith('hello')
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  it('应该模拟返回值', () => {
    const mockFn = vi.fn().mockReturnValue(42)
    expect(mockFn()).toBe(42)
  })
})
```

## 测试覆盖率

运行测试覆盖率报告：

```bash
npm run test:coverage
```

覆盖率报告会生成在 `coverage/` 目录下。

## 最佳实践

1. **测试文件命名**：测试文件应该以 `.test.ts`、`.test.tsx` 或 `.spec.ts`、`.spec.tsx` 结尾
2. **测试描述**：使用清晰、描述性的测试名称
3. **测试隔离**：每个测试应该是独立的，不依赖于其他测试
4. **测试覆盖**：确保关键逻辑都有测试覆盖
5. **使用 waitFor**：对于异步操作，使用 `waitFor` 等待状态更新
6. **使用 userEvent**：优先使用 `userEvent` 而不是 `fireEvent` 来模拟用户交互

## 已有测试

### framework.test.tsx
验证测试框架是否正常工作，包括：
- 基本断言
- 异步测试
- 函数模拟
- React 组件测试
- 用户交互测试

### jwt.test.ts
测试 JWT 服务的功能：
- 生成 token
- 验证 token
- 过期 token 处理
- 无效 token 处理
- 自定义过期时间

### validator.test.ts
测试验证器的功能：
- 基本验证（必填、类型）
- 长度验证
- 范围验证
- 模式验证
- 枚举验证
- 自定义验证
- 复杂场景

## 持续集成

测试会在每次代码提交时自动运行，确保代码质量。
