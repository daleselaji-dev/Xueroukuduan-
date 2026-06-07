<template>
  <section class="community" @click.stop>
    <div class="community-reactions">
      <button
        v-for="emoji in quickEmojis"
        :key="emoji"
        type="button"
        :class="['reaction-btn', { active: reactionState.mine.includes(emoji) }]"
        :disabled="busy"
        @click.prevent="toggleReaction(emoji)"
      >
        <span>{{ emoji }}</span>
        <span>{{ reactionState.counts[emoji] || 0 }}</span>
      </button>
      <button type="button" class="comment-toggle" @click.prevent="commentsOpen = !commentsOpen">
        留言 {{ comments.length }}
      </button>
    </div>

    <div class="emoji-tools">
      <button type="button" :class="['emoji-toggle', { active: pickerOpen }]" @click.prevent="pickerOpen = !pickerOpen">
        表情面板
      </button>
    </div>

    <div v-if="pickerOpen" class="emoji-panel">
      <button
        v-for="emoji in emojis"
        :key="emoji"
        type="button"
        :class="['emoji-choice', { active: reactionState.mine.includes(emoji) }]"
        :disabled="busy"
        @click.prevent="toggleReaction(emoji)"
      >
        <span>{{ emoji }}</span>
        <small>{{ reactionState.counts[emoji] || 0 }}</small>
      </button>
    </div>

    <div v-if="commentsOpen" class="community-comments">
      <div v-if="identity.needsName" class="identity-box">
        <input v-model.trim="displayName" maxlength="40" placeholder="昵称" />
        <input v-model.trim="avatarUrl" maxlength="300" placeholder="头像 URL，可选" />
        <button type="button" @click="saveIdentity">保存身份</button>
        <a v-if="wechatEnabled" href="/api/auth/wechat/start" rel="nofollow">微信登录</a>
      </div>

      <form class="comment-form" @submit.prevent="submitComment">
        <textarea v-model.trim="commentText" maxlength="1000" placeholder="写一条留言"></textarea>
        <button type="submit" :disabled="busy || !commentText">发布</button>
      </form>

      <p v-if="notice" class="community-notice">{{ notice }}</p>

      <div v-if="comments.length === 0" class="comment-empty">暂无留言</div>
      <article v-for="comment in comments" :key="comment.id" class="comment-item">
        <img v-if="comment.avatarUrl" :src="comment.avatarUrl" alt="" />
        <div>
          <header>
            <strong>{{ comment.displayName }}</strong>
            <time>{{ formatDate(comment.createdAt) }}</time>
          </header>
          <p>{{ comment.body }}</p>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'

const props = defineProps({
  itemType: { type: String, required: true },
  itemId: { type: [String, Number], required: true },
})

const quickEmojis = ['👍', '❤️', '😂', '😮', '👀', '🚀']
const emojis = [
  '👍', '👎', '❤️', '😂', '😮', '😢', '😡', '👏',
  '🙏', '🤔', '👀', '🔥', '🚀', '💯', '✨', '🎉',
  '💡', '🧠', '🫡', '🤝', '☕', '🌊', '🧩', '🛠️',
]
const reactionState = ref({ counts: {}, mine: [] })
const comments = ref([])
const commentsOpen = ref(false)
const pickerOpen = ref(false)
const busy = ref(false)
const notice = ref('')
const displayName = ref('')
const avatarUrl = ref('')
const commentText = ref('')
const wechatEnabled = ref(false)
const identity = ref({ needsName: false })

const itemPath = () => `/api/items/${encodeURIComponent(props.itemType)}/${encodeURIComponent(String(props.itemId))}`

onMounted(loadAll)
watch(() => [props.itemType, props.itemId], loadAll)

async function loadAll() {
  try {
    await Promise.all([loadReactions(), loadComments(), loadIdentityStatus()])
  } catch (error) {
    notice.value = '互动服务暂不可用'
  }
}

async function loadReactions() {
  const data = await api(`${itemPath()}/reactions`)
  reactionState.value = { counts: data.counts || {}, mine: data.mine || [] }
}

async function loadComments() {
  const data = await api(`${itemPath()}/comments`)
  comments.value = data.comments || []
}

async function loadIdentityStatus() {
  const data = await api('/api/identity/status')
  identity.value = data
  wechatEnabled.value = !!data.wechatEnabled
  if (data.displayName) displayName.value = data.displayName
  if (data.avatarUrl) avatarUrl.value = data.avatarUrl
}

async function saveIdentity() {
  busy.value = true
  notice.value = ''
  try {
    await api('/api/identity/manual', {
      method: 'POST',
      body: { displayName: displayName.value, avatarUrl: avatarUrl.value },
    })
    await loadIdentityStatus()
    notice.value = '身份已保存'
  } catch (error) {
    notice.value = error.message
  } finally {
    busy.value = false
  }
}

async function toggleReaction(emoji) {
  busy.value = true
  notice.value = ''
  try {
    const data = await api(`${itemPath()}/reactions`, {
      method: 'POST',
      body: { emoji },
    })
    reactionState.value = { counts: data.counts || {}, mine: data.mine || [] }
  } catch (error) {
    notice.value = error.message
  } finally {
    busy.value = false
  }
}

async function submitComment() {
  busy.value = true
  notice.value = ''
  try {
    const data = await api(`${itemPath()}/comments`, {
      method: 'POST',
      body: { body: commentText.value },
    })
    commentText.value = ''
    if (data.status === 'pending') notice.value = '留言已进入审核队列'
    await loadComments()
  } catch (error) {
    notice.value = error.message
  } finally {
    busy.value = false
  }
}

async function api(url, options = {}) {
  const headers = { Accept: 'application/json' }
  const init = { credentials: 'same-origin', method: options.method || 'GET', headers }
  if (options.body) {
    headers['Content-Type'] = 'application/json'
    headers['X-CSRF-Token'] = readCookie('csrf_token')
    init.body = JSON.stringify(options.body)
  }
  const response = await fetch(url, init)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || '请求失败')
  return data
}

function readCookie(name) {
  const prefix = `${name}=`
  return document.cookie.split(';').map(x => x.trim()).find(x => x.startsWith(prefix))?.slice(prefix.length) || ''
}

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' })
}
</script>
