<template>
  <div class="composer-panel">
    <div class="composer-tabs" role="radiogroup">
      <button v-for="tab in tabs" :key="tab.value" type="button"
        :class="{ active: activeTab === tab.value }" @click="activeTab = tab.value">
        {{ tab.icon }} {{ tab.label }}
      </button>
    </div>

    <form class="composer-form" @submit.prevent="submit">
      <label>标题 *</label>
      <input v-model.trim="title" maxlength="120" placeholder="一句话说清楚" />

      <label v-if="activeTab === 'tools'">链接</label>
      <input v-if="activeTab === 'tools'" v-model.trim="url" maxlength="500" placeholder="https://..." />

      <label v-if="activeTab === 'news'">来源</label>
      <input v-if="activeTab === 'news'" v-model.trim="source" maxlength="100" placeholder="来源名称" />

      <label v-if="activeTab === 'news'">来源链接</label>
      <input v-if="activeTab === 'news'" v-model.trim="sourceUrl" maxlength="500" placeholder="https://..." />

      <label>分类</label>
      <select v-model="category">
        <option value="general">一般</option>
        <option v-if="activeTab === 'news'" value="ai">AI</option>
        <option v-if="activeTab === 'news'" value="tech">科技</option>
        <option v-if="activeTab === 'news'" value="opensource">开源</option>
        <option v-if="activeTab === 'discussions'" value="question">提问</option>
        <option v-if="activeTab === 'discussions'" value="share">分享</option>
        <option v-if="activeTab === 'tools'" value="self">自建</option>
        <option v-if="activeTab === 'tools'" value="third">第三方</option>
      </select>

      <label>内容</label>
      <textarea v-model.trim="body" maxlength="8000" rows="6" placeholder="可选：Markdown 格式"></textarea>

      <div class="composer-actions">
        <button type="submit" :disabled="busy || !title" class="composer-primary">
          {{ busy ? '发布中...' : '发布' }}
        </button>
        <span v-if="notice" class="composer-notice">{{ notice }}</span>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['created'])

const tabs = [
  { value: 'news', label: '新闻', icon: '📰' },
  { value: 'tools', label: '小工具', icon: '🔧' },
  { value: 'discussions', label: '讨论', icon: '💬' },
]

const activeTab = ref('news')
const title = ref('')
const body = ref('')
const url = ref('')
const source = ref('')
const sourceUrl = ref('')
const category = ref('general')
const busy = ref(false)
const notice = ref('')

async function submit() {
  busy.value = true; notice.value = ''
  try {
    const payload = {
      type: activeTab.value,
      title: title.value,
      category: category.value,
    }
    if (activeTab.value === 'tools') {
      payload.description = body.value
      payload.url = url.value
    } else {
      payload.body = body.value
    }
    if (activeTab.value === 'news') { payload.source = source.value; payload.source_url = sourceUrl.value }

    const res = await fetch('/api/items', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const data = await res.json()
      notice.value = '发布成功'
      title.value = ''; body.value = ''; url.value = ''; source.value = ''; sourceUrl.value = ''
      emit('created', data)
    } else {
      const err = await res.json()
      notice.value = err.error || '发布失败'
    }
  } catch (e) {
    notice.value = '网络错误'
  } finally { busy.value = false }
}
</script>
