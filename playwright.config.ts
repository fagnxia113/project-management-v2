import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 测试配置
 * 文档参考: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // 测试目录
  testDir: './tests',
  
  // 测试文件匹配模式
  testMatch: /.*\.spec\.ts/,
  
  // 完全并行运行测试
  fullyParallel: false,
  
  // CI 环境下禁止 only
  forbidOnly: !!process.env.CI,
  
  // CI 环境下重试次数
  retries: process.env.CI ? 2 : 0,
  
  // 工作线程数（单线程避免数据库冲突）
  workers: 1,
  
  // 测试报告配置
  reporter: [
    ['html', { open: 'never', outputFolder: 'test-results/html' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],
  
  // 全局配置
  use: {
    // 基础 URL
    baseURL: 'http://localhost:3000',
    
    // 失败时收集 trace
    trace: 'on-first-retry',
    
    // 失败时截图
    screenshot: 'only-on-failure',
    
    // 失败时保留视频
    video: 'retain-on-failure',
    
    // 导航超时
    navigationTimeout: 30000,
    
    // 操作超时
    actionTimeout: 10000,
  },

  // 测试项目配置
  projects: [
    // 认证设置项目 - 保存登录状态
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    
    // Chromium 浏览器 - 管理员测试
    {
      name: 'admin-chromium',
      testMatch: /0[1-8]-.*\.spec\.ts/,
      use: { 
        storageState: '.auth/admin.json',
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup'],
    },
    
    // Chromium 浏览器 - 普通员工权限测试
    {
      name: 'employee-chromium',
      testMatch: /09-permissions\.spec\.ts/,
      use: { 
        storageState: '.auth/employee.json',
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup'],
    },
  ],

  // Web 服务器配置（可选，如果服务已运行则复用）
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
