<template>
  <div v-if="visible" class="node-type-selector" :class="{ 'node-type-selector--dock': dock }" :style="selectorStyle">
    <div class="node-type-selector__header">
      <div class="search-bar">
        <i class="icon-search search-icon"></i>
        <input type="text" class="search-input" placeholder="搜索节点类型" v-model="searchKeyword" />
      </div>
      <button class="close-btn" @click="handleClose">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
          <path d="M18 6L6 18"></path>
          <path d="M6 6l12 12"></path>
        </svg>
      </button>
    </div>
    <div class="node-type-selector__content">
      <div class="node-type-category" v-for="category in filteredCategories" :key="category.key">
        <div class="category-title">{{ category.title }}</div>
        <div class="category-content">
          <div v-for="type in category.types" :key="type" class="node-type-item" :class="{ 'node-type-item--disabled': !isNodeTypeAllowed(type) }" @click="handleSelect(type)" draggable="true" @dragstart="handleDragStart(type, $event)">
            <div class="node-type-icon" :style="{ backgroundColor: getNodeColor(type) }">
              <component :is="getNodeIconComponent(type)" class="arco-icon" />
            </div>
            <div class="node-type-label">{{ getNodeLabel(type) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/*
用途：节点类型选择器（弹层/停靠两种形态）
说明：提供类别过滤、搜索、点击与拖拽选择；事件交由画布页处理并结合 `useNodeInsertion` 完成插入与收尾。
边界：不直接接触 Graph；位置由父组件传入；类型允许性由 `presetSlot.allowedTypes` 控制。
*/
import { computed, ref } from 'vue'
import { getNodeConfig, getAllNodeTypes, getNodeLabel } from '@/utils/nodeTypes.js'
import * as ArcoIcons from '@arco-design/web-vue/es/icon'

const NODE_TYPE_CATEGORIES = [
  { key: 'business', title: '业务逻辑', types: ['crowd-split', 'event-split', 'ab-test', 'wait', 'end'] },
  { key: 'outreach', title: '触达', types: ['sms', 'ai-call', 'manual-call', 'app-push', 'wechat-push'] },
  { key: 'benefit', title: '权益', types: ['benefit'] },
  { key: 'advanced', title: '高级', types: ['sms-touch-combo', 'ai-touch-combo', 'benefit-touch-combo'] }
]

const ICON_NAME_MAP = {
  'crowd-split': 'IconUserGroup',
  'event-split': 'IconThunderbolt',
  'ab-test': 'IconExperiment',
  'wait': 'IconClockCircle',
  'end': 'IconPoweroff',
  'sms': 'IconMessage',
  'ai-call': 'IconPhone',
  'manual-call': 'IconUserAdd',
  'app-push': 'IconNotification',
  'wechat-push': 'IconPublic',
  'benefit': 'IconGift',
  'sms-touch-combo': 'IconSend',
  'ai-touch-combo': 'IconPhone',
  'benefit-touch-combo': 'IconGift'
}

const searchKeyword = ref('')

const props = defineProps({ visible: { type: Boolean, default: false }, position: { type: Object, default: () => ({ x: 0, y: 0 }) }, sourceNode: { type: Object, default: null }, presetSlot: { type: Object, default: null }, dock: { type: Boolean, default: false } })
const emit = defineEmits(['select', 'close', 'dragstart'])

const selectorStyle = computed(() => props.dock ? { left: '16px', top: '16px' } : { left: `${props.position.x}px`, top: `${props.position.y}px` })
const filteredCategories = computed(() => {
  const allTypes = getAllNodeTypes()
  const canvasTypes = allTypes.filter(type => type && typeof type === 'string' && type.trim() !== '' && type !== 'start' && !['preview', 'temp', 'ghost'].includes(type))
  return NODE_TYPE_CATEGORIES.map(category => ({ ...category, types: category.types.filter(type => {
    const isInCanvas = canvasTypes.includes(type)
    if (!isInCanvas) return false
    if (!searchKeyword.value) return true
    const label = getNodeLabel(type)
    return label.toLowerCase().includes(searchKeyword.value.toLowerCase())
  }) })).filter(category => category.types.length > 0)
})

const getNodeIconComponent = (nodeType) => { const name = ICON_NAME_MAP[nodeType] || 'IconApps'; return ArcoIcons[name] || ArcoIcons.IconApps || ArcoIcons.IconUserGroup }
const getNodeColor = (nodeType) => { const config = getNodeConfig(nodeType); return config ? config.color : '#5F95FF' }
const isNodeTypeAllowed = (nodeType) => {
  if (!nodeType || typeof nodeType !== 'string') return false
  const allowed = Array.isArray(props.presetSlot?.allowedTypes) ? props.presetSlot.allowedTypes : null
  if (!allowed || allowed.length === 0) return true
  return allowed.includes(nodeType)
}
const handleSelect = (nodeType) => { if (!nodeType || typeof nodeType !== 'string' || nodeType.trim() === '') return; const normalized = nodeType.trim(); if (!isNodeTypeAllowed(normalized)) return; const nodeConfig = getNodeConfig(normalized); if (!nodeConfig) return; emit('select', normalized) }
const handleDragStart = (nodeType, e) => { if (!nodeType || typeof nodeType !== 'string' || nodeType.trim() === '') return; const normalized = nodeType.trim(); if (!isNodeTypeAllowed(normalized)) return; const nodeConfig = getNodeConfig(normalized); if (!nodeConfig) return; if (e && e.dataTransfer) { try { e.dataTransfer.setData('nodeType', normalized); e.dataTransfer.effectAllowed = 'copy' } catch {} } emit('dragstart', normalized) }
const handleClose = () => { emit('close') }
</script>

<style scoped>
.node-type-selector { position: absolute; width: 280px; background-color: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,.15); z-index: 1000; transform: translate(-50%, 0); margin-top: -20px; border: 1px solid #e5e7eb }
.node-type-selector::after { content: ''; position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 10px solid white }
.node-type-selector--dock { transform: none; margin-top: 0 }
.node-type-selector--dock::after { display: none }
.node-type-selector__header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #f0f0f0; background: #fafafa; border-radius: 8px 8px 0 0 }
.search-bar { flex: 1; position: relative; margin-right: 12px }
.search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #999; font-size: 14px }
.search-input { width: 100%; padding: 8px 12px 8px 36px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; background: white; outline: none; transition: border-color .2s }
.search-input:focus { border-color: #4C78FF }
.search-input::placeholder { color: #999 }
.close-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: none; background: none; cursor: pointer; color: #999; border-radius: 6px; padding: 0; transition: all .2s; flex-shrink: 0 }
.close-btn:hover { background-color: #f5f5f5; color: #666 }
.close-btn:active { background-color: #e5e7eb }
.node-type-selector__content { padding: 16px; max-height: 400px; overflow-y: auto }
.node-type-category { margin-bottom: 16px }
.node-type-category:last-child { margin-bottom: 0 }
.category-title { font-size: 12px; font-weight: 600; color: #6b7280; margin-bottom: 8px; text-transform: uppercase; letter-spacing: .5px; padding-left: 4px }
.category-content { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px }
.node-type-item { display: flex; flex-direction: row; align-items: center; padding: 10px 8px; border-radius: 6px; cursor: pointer; transition: all .2s; border: 1px solid #e5e7eb; background: white; min-height: 56px }
.node-type-item:hover { background-color: #f8fafc; border-color: #cbd5e1; transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0,0,0,.1) }
.node-type-item--disabled { opacity: .5; cursor: not-allowed }
.node-type-item--disabled:hover { background-color: white; border-color: #e5e7eb; transform: none; box-shadow: none }
.node-type-icon { width: 28px; height: 28px; border-radius: 6px; margin-right: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 16px }
.node-type-label { font-size: 12px; text-align: left; color: #374151; font-weight: 500; line-height: 1.2 }
</style>
