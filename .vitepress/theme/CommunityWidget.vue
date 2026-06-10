<template>
  <div class="community-widget">
    <ContentReactions :item-type="itemType" :item-id="itemId" />
  </div>
</template>

<script setup>
import ContentReactions from './ContentReactions.vue'
defineProps({
  itemType: { type: String, required: true },
  itemId: { type: [String, Number], required: true },
})
</script>

<style scoped>
.community-widget {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-light, #efebe6);
}
</style>
