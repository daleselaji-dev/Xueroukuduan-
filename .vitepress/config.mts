import { defineConfig } from 'vitepress'

export default defineConfig({
  appearance: false,
  title: '血肉苦短研讨班',
  description: '群友讨论与分享',
  base: '/',
  
  
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&family=JetBrains+Mono:wght@400;700;800&display=swap', rel: 'stylesheet' }]
  ],
  
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '新闻', link: '/news' },
      { text: '小工具', link: '/tools' },
      { text: '讨论', link: '/discussions' },
      { text: '热榜', link: '/pages/hotlist' },
      { text: '杂志', link: '/pages/magazine' },
      { text: '发布', link: '/create' },
      { text: '贡献者', link: '/contributors' },
      { text: 'GitHub', link: 'https://github.com/daleselaji-dev/Xueroukuduan-' }
    ],
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com/daleselaji-dev/Xueroukuduan-' }
    ],
    
    footer: {
      message: '由血肉苦短研讨班群友共同维护',
      copyright: 'MIT License'
    }
  }
})
