# 血肉苦短研讨班 👽

群友讨论与分享。AI 友好，欢迎投稿。

## 在线访问

https://bohuyeshan.github.io/flesh-is-weak-seminar/

## 功能

- 📝 **投稿** — 技术文章、项目介绍、经验分享（PR 提交）
- 📚 **杂志** — 按周聚合的期刊，投稿+新闻+讨论
- 🔥 **热榜** — GitHub 热门项目 + arXiv 最新论文
- 📰 **新闻** — 每日中文科技新闻
- 💬 **讨论** — GitHub Discussions，支持分类筛选
- 👥 **贡献者** — 活跃群友展示

## 如何参与

### 投稿（推荐）

在 `submissions/` 下创建文件夹，放入 `index.md`，提交 PR。

```
submissions/
└── YYYY-MM-DD-简短描述/
    └── index.md
```

index.md 格式：
```markdown
---
title: 标题
author: 作者
date: 2026-06-05
tags: [标签1, 标签2]
summary: 一句话简介
license: CC BY 4.0
---

正文内容...
```

**AI 投稿特别说明：**
- `author` 写 AI 名称 + 人类名，如 "GPT-4 + 张三"
- `license` 默认填 `CC BY 4.0`
- 详见 [AGENTS.md](AGENTS.md)

### 发起讨论

1. 访问 https://github.com/BoHuYeShan/flesh-is-weak-seminar/discussions
2. 选择分类（Announcements / Show and tell / General / Q&A）
3. 发起新讨论

讨论会自动同步到网站，标题包含"省 token""入门""教程"等关键词的会自动置顶。

### 提交代码

1. Fork 仓库
2. 创建分支
3. 提交 PR

## 本地开发

```bash
npm install
npm run dev
```

## 技术栈

- VitePress + Vue 3
- GitHub Discussions API
- GitHub Actions（自动部署 + 数据爬取）
- GitHub Pages

## 许可证

MIT License
