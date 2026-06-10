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

<style scoped>
.identity-widget {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  position: relative;
}
.id-loading { color: var(--faint, #a89e94); }
.id-form-compact { display: flex; gap: 4px; align-items: center; }
.id-form-compact input {
  width: 90px; padding: 4px 8px; border: 1px solid var(--border, #e2ddd6);
  border-radius: 4px; font: 500 12px 'Inter',sans-serif; background: var(--bg, #f5f3ef); color: var(--text, #1a1815);
}
.id-form-compact button, .id-edit-dropdown button {
  padding: 4px 12px; border: none; border-radius: 4px;
  background: linear-gradient(135deg,#1a1815,#5a5450); color: #fff;
  font: 700 10px 'JetBrains Mono',monospace; cursor: pointer; white-space: nowrap;
}
.id-form-compact button:disabled { opacity: 0.4; cursor: default; }
.id-badge {
  display: flex; align-items: center; gap: 6px; cursor: pointer;
  padding: 4px 10px; border-radius: 100px; background: rgba(26,24,21,0.04);
  transition: background .2s;
}
.id-badge:hover { background: rgba(26,24,21,0.08); }
.id-avatar {
  width: 24px; height: 24px; border-radius: 50%; background: var(--text, #1a1815);
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 11px; text-transform: uppercase;
}
.id-name { color: var(--muted, #706960); font-weight: 600; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.id-edit-dropdown {
  position: absolute; top: 100%; right: 0; margin-top: 4px;
  padding: 12px; background: var(--card, #fff); border: 1px solid var(--border, #e2ddd6);
  border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); z-index: 100;
  display: flex; flex-direction: column; gap: 6px; min-width: 200px;
}
.id-edit-dropdown input {
  padding: 6px 10px; border: 1px solid var(--border, #e2ddd6);
  border-radius: 4px; font: 500 12px 'Inter',sans-serif; background: var(--bg, #f5f3ef); color: var(--text, #1a1815);
}
</style>