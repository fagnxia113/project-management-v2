# 项目管理系统 v2

基于元数据驱动的企业级项目管理系统。

## 技术栈

### 后端
- **Node.js** + **Express** - 服务器框架
- **MySQL** - 数据库
- **TypeScript** - 类型安全
- **mysql2** - 数据库驱动

### 前端
- **React 18** - UI框架
- **Vite** - 构建工具
- **Tailwind CSS** - 样式框架
- **React Router** - 路由管理
- **Lucide React** - 图标库

## 架构特点

### 数据驱动架构
- **EntityMeta.json** - 定义所有实体的元数据
- **EnumConfig.json** - 定义所有枚举的元数据
- **通用CRUD API** - 自动根据元数据生成数据接口

### 核心实体（8个主表）
1. `Project` - 项目信息
2. `ProjectPhase` - 项目阶段
3. `Task` - 任务管理
4. `Equipment` - 设备信息（一物一码）
5. `EquipmentStock` - 设备库存统计（视图）
6. `Employee` - 员工信息
7. `Customer` - 客户信息
8. `Warehouse` - 仓库信息

## 快速开始

### 1. 环境准备
- Node.js 18+
- MySQL 8.0+

### 2. 安装依赖
```bash
cd project-management-v2
npm install
```

### 3. 配置环境变量
编辑 `.env` 文件：
```
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=
DB_DATABASE=project_management_v2

SERVER_PORT=8080
CORS_ORIGIN=http://localhost:3000
```

### 4. 初始化数据库
```bash
npm run init:db
```

### 5. 启动开发服务器
```bash
npm run dev
```

这将同时启动：
- 前端服务: http://localhost:3000
- 后端服务: http://localhost:8080

## API文档

### 元数据API
- `GET /api/metadata/entities` - 获取所有实体元数据
- `GET /api/metadata/entities/:entity` - 获取单个实体元数据
- `GET /api/metadata/enums` - 获取所有枚举
- `GET /api/metadata/enums/:enumName` - 获取单个枚举

### 通用数据API
- `GET /api/data/:entity` - 查询列表（分页）
- `GET /api/data/:entity/:id` - 查询单条记录
- `POST /api/data/:entity` - 创建记录
- `PUT /api/data/:entity/:id` - 更新记录
- `DELETE /api/data/:entity/:id` - 删除记录
- `POST /api/data/:entity/batch` - 批量操作

### 请求示例
```bash
# 查询项目列表
curl "http://localhost:8080/api/data/Project?page=1&pageSize=10"

# 获取元数据
curl "http://localhost:8080/api/metadata/entities/Project"

# 创建项目
curl -X POST "http://localhost:8080/api/data/Project" \
  -H "Content-Type: application/json" \
  -d '{"name": "测试项目", "type": "domestic", "country": "China", "start_date": "2024-01-01"}'
```

## 项目结构
```
project-management-v2/
├── src/
│   ├── core/
│   │   └── metadata/
│   │       ├── EntityMeta.json      # 实体元数据
│   │       └── EnumConfig.json      # 枚举配置
│   ├── backend/
│   │   ├── database/
│   │   │   ├── connection.ts        # 数据库连接
│   │   │   ├── init.ts              # 数据库初始化
│   │   │   └── migrations/
│   │   │       └── 001_create_core_tables.sql
│   │   ├── services/
│   │   │   └── MetadataService.ts   # 元数据服务
│   │   ├── routes/
│   │   │   ├── data.ts              # 通用CRUD路由
│   │   │   └── metadata.ts          # 元数据路由
│   │   └── server.ts                # Express服务器
│   └── frontend/
│       ├── App.tsx
│       ├── main.tsx
│       └── index.css
├── .env
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

## 开发计划

### 第二阶段 - 核心功能模块
- [ ] 页面框架（布局、导航）
- [ ] 项目管理模块
- [ ] 任务管理模块
- [ ] 设备管理模块
- [ ] 人员管理模块
- [ ] 客户管理模块
- [ ] 仓库管理模块

### 第三阶段 - 高级功能
- [ ] 审批中心
- [ ] 日报系统
- [ ] 任务评价
- [ ] 数据统计报表
- [ ] 权限管理

## 许可证
MIT
