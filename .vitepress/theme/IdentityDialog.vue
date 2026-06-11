<template>
  <div class="identity-widget">
    <div v-if="loading" class="id-loading">⋯</div>
    <template v-else-if="needsName">
      <div class="id-form-compact">
        <input v-model.trim="nameInput" maxlength="40" placeholder="昵称" @keyup.enter="save" />
        <button :disabled="saving || !nameInput" @click="save">设置</button>
      </div>
    </template>
    <div v-else class="id-badge" title="点击修改昵称" @click="editing = !editing">
      <span class="id-avatar">{{ (displayName || '?')[0] }}</span>
      <span class="id-name">{{ displayName }}</span>
    </div>
    <div v-if="editing" class="id-edit-dropdown">
      <input v-model.trim="nameInput" maxlength="40" placeholder="新昵称" />
      <input v-model.trim="avatarInput" maxlength="300" placeholder="头像 URL（可选）" />
      <button :disabled="saving" @click="save">保存</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const loading = ref(true)
const needsName = ref(true)
const displayName = ref('')
const avatarUrl = ref('')
const editing = ref(false)
const saving = ref(false)
const nameInput = ref('')
const avatarInput = ref('')

onMounted(load)

async function load() {
  try {
    const res = await fetch('/api/identity/status', { credentials: 'same-origin' })
    if (res.ok) {
      const d = await res.json()
      needsName.value = d.needsName !== false
      displayName.value = d.displayName || ''
      avatarUrl.value = d.avatarUrl || ''
      nameInput.value = (d.displayName && !d.displayName.startsWith('访客-')) ? d.displayName : ''
      avatarInput.value = d.avatarUrl || ''
    }
  } catch {} finally { loading.value = false }
}

async function save() {
  saving.value = true
  try {
    const res = await fetch('/api/identity/manual', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: nameInput.value, avatarUrl: avatarInput.value }),
    })
    if (res.ok) {
      editing.value = false
      await load()
    }
  } catch {} finally { saving.value = false }
}
</script>

