<template>
  <section class="content-reactions" @click.stop>
    <div class="cr-bar">
      <button
        v-for="emoji in quickEmojis"
        :key="emoji"
        :class="['cr-btn', { active: state.mine.includes(emoji) }]"
        :disabled="busy"
        type="button"
        @click.prevent="toggle(emoji)"
      >
        <span>{{ emoji }}</span>
        <small>{{ state.counts[emoji] || 0 }}</small>
      </button>
      <button
        :class="['cr-btn cr-picker-toggle', { active: pickerOpen }]"
        type="button"
        aria-label="选择更多表情"
        @click.prevent="pickerOpen = !pickerOpen"
      >
        <span>＋</span>
      </button>
      <button class="cr-btn cr-exp-toggle" type="button" @click.prevent="expOpen = !expOpen">
        <span>💬</span>
        <small>评论 / 启发</small>
      </button>
    </div>

    <div v-if="pickerOpen" class="cr-picker">
      <button
        v-for="emoji in allEmojis"
        :key="emoji"
        :class="['cr-pick', { active: state.mine.includes(emoji) }]"
        :disabled="busy"
        type="button"
        @click.prevent="toggle(emoji)"
      >
        {{ emoji }}
      </button>
    </div>

    <ExperiencePanel v-if="expOpen" :item-type="itemType" :item-id="itemId" />
  </section>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import ExperiencePanel from './ExperiencePanel.vue'

const props = defineProps({
  itemType: { type: String, required: true },
  itemId: { type: [String, Number], required: true },
})

const quickEmojis = ['👍', '❤️', '🔥', '🚀', '👀', '💡']
const allEmojis = [
  '👍', '👎', '❤️', '😂', '😮', '🤔', '😢', '👏',
  '🙏', '✨', '👀', '🔥', '🚀', '💯', '✅', '🎉',
  '💡', '🧠', '📝', '🔗', '☕', '🌱', '🧪', '🛠️',
]

const state = ref({ counts: {}, mine: [] })
const pickerOpen = ref(false)
const expOpen = ref(false)
const busy = ref(false)

const itemPath = () => `/api/items/${encodeURIComponent(props.itemType)}/${encodeURIComponent(String(props.itemId))}`

onMounted(load)
watch(() => [props.itemType, props.itemId], load)

async function load() {
  try {
    const res = await fetch(`${itemPath()}/reactions`, { credentials: 'same-origin' })
    if (res.ok) state.value = await res.json()
  } catch {}
}

async function toggle(emoji) {
  busy.value = true
  try {
    const headers = { 'Content-Type': 'application/json' }
    const csrf = document.cookie.match(/csrf_token=([^;]+)/)?.[1]
    if (csrf) headers['X-CSRF-Token'] = csrf
    const res = await fetch(`${itemPath()}/reactions`, {
      method: 'POST',
      credentials: 'same-origin',
      headers,
      body: JSON.stringify({ emoji }),
    })
    if (res.ok) state.value = await res.json()
  } catch {} finally {
    busy.value = false
  }
}
</script>
