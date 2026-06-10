<template>
  <div class="identity-trigger" @click="show = true">
    <div v-if="identity.displayName" class="identity-badge" title="点击设置用户名">
      <span v-else class="avatar-placeholder">{{ identity.displayName[0] }}</span>
      <span class="id-name">{{ identity.displayName }}</span>
    </div>
    <button v-else class="identity-btn" title="设置显示名称">👤</button>
  </div>
