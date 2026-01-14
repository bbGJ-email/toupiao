# 投票网站

一个基于Node.js和HTML/CSS/JavaScript的简单投票系统。

## 功能特点

- 创建投票，支持自定义标题、描述和多个选项
- 参与投票，防止同一IP重复投票
- 查看投票结果，使用柱状图可视化展示
- 响应式设计，适配不同设备

## 技术栈

- **前端**：HTML, CSS, JavaScript (原生)
- **后端**：Node.js, Express
- **数据库**：SQLite

## 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 启动后端服务器

```bash
cd backend
npm start
```

后端服务器将在 http://localhost:3000 运行

### 3. 启动前端服务

使用Python内置HTTP服务器（推荐）：

```bash
cd frontend
python -m http.server 8080
```

或者使用其他HTTP服务器，例如：

```bash
cd frontend
npx serve -s -l 8080
```

前端页面将在 http://localhost:8080 可访问

### 4. 访问应用

在浏览器中打开 http://localhost:8080

## API 接口

| 路由 | 方法 | 功能 |
|------|------|------|
| /api/polls | GET | 获取所有投票列表 |
| /api/polls | POST | 创建新投票 |
| /api/polls/:id | GET | 获取单个投票详情 |
| /api/polls/:id/vote | POST | 提交投票 |
| /api/polls/:id/results | GET | 获取投票结果 |

## 项目结构

```
投票网站/
├── frontend/              # 前端代码
│   ├── index.html         # 主页面
│   ├── style.css          # 样式文件
│   └── script.js          # 前端交互逻辑
├── backend/               # 后端代码
│   ├── server.js          # 后端服务器
│   ├── package.json       # 项目依赖
│   └── votes.db           # SQLite数据库文件（自动生成）
└── README.md              # 项目说明
```

## 使用说明

1. **创建投票**：点击页面顶部的"创建投票"按钮，填写投票标题、描述和选项，点击"创建投票"。
2. **参与投票**：在投票列表中找到要参与的投票，点击"参与投票"，选择一个选项后点击"提交投票"。
3. **查看结果**：在投票列表中找到要查看结果的投票，点击"查看结果"，即可看到可视化的投票结果。

## 注意事项

- 同一IP地址只能对同一投票投一次票
- 投票数据存储在SQLite数据库中，重启服务器后数据会保留
- 为了安全起见，建议在生产环境中配置适当的CORS设置和身份验证

## 开发说明

### 开发模式启动后端

```bash
cd backend
npm run dev
```

使用nodemon实现代码热更新

## 许可证

MIT