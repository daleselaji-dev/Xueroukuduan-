<template>
<div class="forum-links">
  <a href="https://github.com/BoHuYeShan/flesh-is-weak-seminar/discussions" target="_blank" class="forum-link-card github">
    <div class="forum-link-icon">🐙</div>
    <div class="forum-link-info">
      <h3>GitHub Discussions</h3>
      <p>有 GitHub 账号？直接在 GitHub 上发帖讨论</p>
    </div>
    <span class="forum-link-arrow">→</span>
  </a>

  <a v-if="remark42Enabled" :href="remark42Url" target="_blank" class="forum-link-card email">
    <div class="forum-link-icon">📧</div>
    <div class="forum-link-info">
      <h3>邮箱论坛</h3>
      <p>没有 GitHub 账号？用邮箱登录即可发帖</p>
    </div>
    <span class="forum-link-arrow">→</span>
  </a>
</div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const remark42Enabled = ref(false)
const remark42Url = ref('')

onMounted(async () => {
  try {
    const res = await fetch('/flesh-is-weak-seminar/data/config.json')
    const config = await res.json()
    remark42Enabled.value = config.remark42?.enabled || false
    remark42Url.value = config.remark42?.url || ''
  } catch (e) {
    // config.json 不存在或读取失败，只显示 GitHub
    remark42Enabled.value = false
  }
})
</script>
