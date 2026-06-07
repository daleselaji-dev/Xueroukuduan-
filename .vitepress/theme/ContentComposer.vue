<template>
  <section class="composer">
    <div class="composer-layout">
      <form class="composer-form" @submit.prevent>
        <div class="composer-field composer-span">
          <label>类型</label>
          <div class="composer-segments" role="radiogroup" aria-label="内容类型">
            <button
              v-for="option in kinds"
              :key="option.value"
              type="button"
              :class="{ active: kind === option.value }"
              @click="kind = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <label class="composer-field composer-span">
          <span>标题</span>
          <input v-model.trim="title" maxlength="120" placeholder="一句话说清楚这是什么" />
        </label>

        <label class="composer-field">
          <span>作者</span>
          <input v-model.trim="author" maxlength="60" placeholder="你的昵称" />
        </label>

        <label class="composer-field">
          <span>链接</span>
          <input v-model.trim="url" maxlength="300" placeholder="https://..." />
        </label>

        <label class="composer-field composer-span">
          <span>摘要</span>
          <textarea v-model.trim="summary" maxlength="300" rows="3" placeholder="用于列表页的短说明"></textarea>
        </label>

        <label class="composer-field composer-span">
          <span>正文</span>
          <textarea v-model.trim="body" maxlength="8000" rows="10" placeholder="支持 Markdown"></textarea>
        </label>

        <div class="composer-actions composer-span">
          <a class="composer-primary" :href="githubLink" target="_blank" rel="noopener noreferrer">
            {{ primaryLabel }}
          </a>
          <button type="button" class="composer-secondary" @click="copyTemplate">复制模板</button>
          <span v-if="notice" class="composer-notice">{{ notice }}</span>
        </div>
      </form>

      <aside class="composer-output">
        <header>
          <span>{{ outputTitle }}</span>
          <small>{{ filename }}</small>
        </header>
        <pre>{{ template }}</pre>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'

const repo = 'https://github.com/daleselaji-dev/Xueroukuduan-'
const kinds = [
  { value: 'news', label: '新闻', category: 'Announcements' },
  { value: 'tool', label: '小工具', category: 'Show and tell' },
  { value: 'discussion', label: '讨论', category: 'General' },
  { value: 'submission', label: '投稿', category: '' },
]

const kind = ref('discussion')
const title = ref('')
const author = ref('')
const url = ref('')
const summary = ref('')
const body = ref('')
const notice = ref('')

const selected = computed(() => kinds.find(item => item.value === kind.value) || kinds[2])
const safeTitle = computed(() => title.value || '未命名内容')
const today = computed(() => new Date().toISOString().slice(0, 10))
const slug = computed(() => {
  const raw = safeTitle.value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return raw || 'untitled'
})
const filename = computed(() => {
  if (kind.value === 'submission') return `${today.value}-${slug.value}/index.md`
  return 'GitHub Discussion'
})
const outputTitle = computed(() => kind.value === 'submission' ? '投稿文件' : `${selected.value.label}讨论`)
const primaryLabel = computed(() => kind.value === 'submission' ? '打开 GitHub 新文件' : '打开 GitHub Discussion')

const template = computed(() => {
  const cleanAuthor = author.value || '群友投稿'
  const cleanSummary = summary.value || '待补充摘要'
  const cleanBody = body.value || '正文待补充。'
  const linkBlock = url.value ? `\n\n链接：${url.value}` : ''

  if (kind.value === 'submission') {
    return `---\ntitle: "${escapeYaml(safeTitle.value)}"\nauthor: "${escapeYaml(cleanAuthor)}"\ndate: ${today.value}\nsummary: "${escapeYaml(cleanSummary)}"\ncover: ""\ntags: []\nlicense: "CC BY 4.0"\n---\n\n${cleanBody}${linkBlock}\n`
  }

  return `# ${safeTitle.value}\n\n${cleanSummary}${linkBlock}\n\n${cleanBody}\n\n---\n\n作者：${cleanAuthor}\n分类：${selected.value.category}\n`
})

const githubLink = computed(() => {
  if (kind.value === 'submission') {
    const path = `submissions/${filename.value}`
    return `${repo}/new/main?filename=${encodeURIComponent(path)}&value=${encodeURIComponent(template.value)}`
  }
  const params = new URLSearchParams({
    title: safeTitle.value,
    body: template.value,
  })
  return `${repo}/discussions/new?${params.toString()}`
})

async function copyTemplate() {
  notice.value = ''
  try {
    await navigator.clipboard.writeText(template.value)
    notice.value = '已复制'
  } catch (error) {
    notice.value = '复制失败'
  }
}

function escapeYaml(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}
</script>
