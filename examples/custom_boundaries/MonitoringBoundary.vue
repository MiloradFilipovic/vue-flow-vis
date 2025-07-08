<script setup lang="ts">
import { getCurrentInstance, provide } from 'vue'

const props = defineProps<{
  name: string
  threshold?: number
}>()

const instance = getCurrentInstance()
const monitor = instance?.appContext.config.globalProperties.$componentMonitor

if (monitor) {
  // Create custom monitoring context
  provide('boundaryMonitor', {
    name: props.name,
    threshold: props.threshold ?? 16
  })
}
</script>

<template>
  <div class="monitoring-boundary">
    <slot />
  </div>
</template>