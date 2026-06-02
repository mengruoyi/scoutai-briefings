# ScoutAI 简报网站

AI行业情报侦察兵 - 每日7:00 & 17:00更新

## 部署到 Vercel

### 1. 准备工作

- 注册 [Vercel](https://vercel.com) 账号
- 安装 Vercel CLI: `npm i -g vercel`

### 2. 部署步骤

```bash
# 登录 Vercel
vercel login

# 部署
vercel --prod
```

### 3. 自动部署配置

在 Vercel Dashboard 中:
1. 导入此 GitHub 仓库
2. Build Command: `node scripts/build.js`
3. Output Directory: `./`

### 4. 更新简报

将生成的 HTML 简报文件放入 `briefing/` 目录，然后:

```bash
# 重新构建首页索引
node scripts/build.js

# 部署更新
vercel --prod
```

## 目录结构

```
scoutai-web/
├── briefing/           # 简报 HTML 文件
├── assets/
│   ├── css/style.css  # 样式
│   └── js/main.js     # 脚本
├── scripts/
│   └── build.js       # 构建脚本
├── index.html         # 首页 (自动生成)
├── feed.xml           # RSS (自动生成)
├── vercel.json        # Vercel 配置
└── package.json
```

## 自定义域名

在 Vercel Dashboard → Settings → Domains 中添加你的域名。
