<template>
  <DefaultTheme.Layout>
    <template #nav-bar-content-after>
      <IdentityDialog />
    </template>
  </DefaultTheme.Layout>
</template>

<script setup>
import DefaultTheme from 'vitepress/theme'
import IdentityDialog from './IdentityDialog.vue'
</script>