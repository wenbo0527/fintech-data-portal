<template>
  <div class="task-flow-config-drawers">
    <template v-for="key in DRAWER_KEYS" :key="key">
      <component
        v-if="drawerStates?.[key]?.visible"
        :is="registry[key]"
        :visible="!!drawerStates?.[key]?.visible"
        :node-data="drawerStates?.[key]?.data || {}"
        :read-only="!!drawerStates?.[key]?.readOnly"
        @confirm="(config) => emit('config-confirm', { drawerType: key, config })"
        @cancel="emit('config-cancel', { drawerType: key })"
        @update:visible="(visible) => emit('visibility-change', { drawerType: key, visible })"
      />
    </template>
  </div>
</template>

<script setup>
import { CONFIG_DRAWER_REGISTRY as registry, DRAWER_KEYS } from './drawerRegistry.ts'

defineProps({
  drawerStates: { type: Object, required: true },
  readOnly: { type: Boolean, default: false }
})

const emit = defineEmits(['config-confirm', 'config-cancel', 'visibility-change'])
</script>

<style scoped>
.task-flow-config-drawers {}
</style>
