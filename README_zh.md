# Prompt Manager (提示词管理器)

Prompt Manager 是一个全栈应用程序，旨在帮助开发者和提示词工程师高效地管理、版本化和组织 LLM（大型语言模型）提示词。它提供了一个集中式的界面，用于创建项目、管理提示词版本、对比变更，并通过标签和分类来组织提示词。
![alt text](image.png)
![alt text](image-1.png)

## 功能特性

- **项目管理**：将您的提示词组织到不同的项目中。
- **提示词版本控制**：自动追踪提示词的变更，实现版本控制。
- **差异对比 (Diff Viewer)**：可视化对比不同版本的提示词，清晰查看变更内容。
- **回滚能力**：轻松将提示词恢复到之前的版本。
- **组织整理**：使用标签 (Tags) 和分类 (Categories) 有效地筛选和管理提示词。
- **导入/导出**：支持 JSON 格式的数据导入和导出，便于备份或迁移。
- **集成支持**：内置教程和 API 文档，方便将托管的提示词集成到您的应用程序中。

## 技术栈

### 后端 (Backend)
- **语言**: Go (Golang)
- **框架**: Gin Web Framework
- **数据库**: Mysql(默认),、SQLite  支持兼容 GORM 的数据库
- **ORM**: GORM

### 前端 (Frontend)
- **框架**: React
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **状态管理**: Zustand
- **路由**: React Router
- **图标**: Lucide React

## 项目结构

```
prompt-manager/
├── backend/            # Go 后端应用
│   ├── config/         # 配置加载
│   ├── database/       # 数据库初始化
│   ├── handlers/       # HTTP 请求处理
│   ├── middleware/     # HTTP 中间件
│   ├── models/         # 数据模型
│   ├── services/       # 业务逻辑
│   └── main.go         # 入口文件
├── frontend/           # React 前端应用
│   ├── public/         # 静态资源
│   └── src/            # 源代码
│       ├── components/ # 可复用 UI 组件
│       ├── pages/      # 应用页面
│       ├── services/   # API 客户端
│       └── types/      # TypeScript 类型定义
└── README.md           # 项目文档
```

## 快速开始

### 前置要求

- **Go**: 版本 1.18 或更高
- **Node.js**: 版本 16 或更高
- **npm** 或 **yarn**

### 安装与运行

#### 1. 后端设置

进入 backend 目录并安装依赖：

```bash
cd backend
go mod download
```

在 `backend` 目录下创建一个 `.env` 文件（可选，如果省略则使用默认值）：

```env
SERVER_PORT=8080
DB_TYPE=sqlite
DB_NAME=prompt_manager.db
```

启动后端服务器：

```bash
go run main.go
```

后端服务器将在 `http://localhost:8080` 启动。

#### 2. 前端设置

进入 frontend 目录并安装依赖：

```bash
cd frontend
npm install
```

启动开发服务器：

```bash
npm run dev
```

前端应用通常会在 `http://localhost:5173` 启动。

## API 概览

后端在 `http://localhost:8080/api` 提供 RESTful API。主要端点包括：

- `GET /api/projects`: 获取所有项目列表
- `POST /api/projects`: 创建新项目
- `GET /api/projects/:id/prompts`: 获取指定项目的提示词
- `POST /api/projects/:id/prompts`: 创建新提示词
- `GET /api/prompts/:id`: 获取提示词详情
- `PUT /api/prompts/:id`: 更新提示词（创建新版本）
- `GET /api/prompts/:id/diff/:target_id`: 对比两个提示词版本

