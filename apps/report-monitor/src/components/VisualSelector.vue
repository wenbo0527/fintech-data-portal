<template>
  <div class="visual-selector">
    <div class="selector-header">
      <h3>可视化选择器</h3>
      <div class="selector-controls">
        <a-button size="small" @click="toggleSelector">
          <template #icon><icon-cursor /></template>
          {{ isSelecting ? '退出选择' : '开始选择' }}
        </a-button>
        <a-button size="small" @click="clearSelection">
          <template #icon><icon-delete /></template>
          清除
        </a-button>
      </div>
    </div>
    
    <div class="selector-content">
      <!-- Preview Area -->
      <div class="preview-area" v-if="screenshotUrl">
        <img 
          :src="screenshotUrl" 
          alt="页面预览"
          class="preview-image"
          @click="handleImageClick"
          @mousemove="handleImageHover"
          ref="previewImage"
        />
        
        <!-- Selection Overlay -->
        <div 
          v-if="selectedElement"
          class="selection-overlay"
          :style="getSelectionStyle(selectedElement)"
        >
          <div class="selection-info">
            <div class="element-tag">{{ selectedElement.tagName }}</div>
            <div class="element-text" v-if="selectedElement.textContent">
              {{ selectedElement.textContent.substring(0, 50) }}
            </div>
          </div>
        </div>
        
        <!-- Hover Highlight -->
        <div 
          v-if="hoveredElement && hoveredElement !== selectedElement"
          class="hover-overlay"
          :style="getSelectionStyle(hoveredElement)"
        >
          <div class="element-tag">{{ hoveredElement.tagName }}</div>
        </div>
      </div>
      
      <!-- Element Details -->
      <div class="element-details" v-if="selectedElement">
        <a-card title="元素详情" size="small">
          <div class="detail-item">
            <span class="detail-label">选择器:</span>
            <code class="detail-value">{{ selectedElement.selector }}</code>
            <a-button size="mini" @click="copySelector">复制</a-button>
          </div>
          
          <div class="detail-item">
            <span class="detail-label">标签名:</span>
            <span class="detail-value">{{ selectedElement.tagName }}</span>
          </div>
          
          <div class="detail-item">
            <span class="detail-label">文本内容:</span>
            <span class="detail-value">{{ selectedElement.textContent || '无' }}</span>
          </div>
          
          <div class="detail-item">
            <span class="detail-label">可见性:</span>
            <a-tag :color="selectedElement.isVisible ? 'green' : 'red'">
              {{ selectedElement.isVisible ? '可见' : '不可见' }}
            </a-tag>
          </div>
          
          <div class="detail-item">
            <span class="detail-label">可点击:</span>
            <a-tag :color="selectedElement.isClickable ? 'green' : 'gray'">
              {{ selectedElement.isClickable ? '是' : '否' }}
            </a-tag>
          </div>
          
          <div class="detail-item">
            <span class="detail-label">唯一性评分:</span>
            <a-rate :default-value="selectedElement.uniquenessScore * 5" readonly size="small" />
          </div>
          
          <div class="detail-item" v-if="selectedElement.attributes && Object.keys(selectedElement.attributes).length > 0">
            <span class="detail-label">属性:</span>
            <div class="attributes-list">
              <div v-for="(value, key) in selectedElement.attributes" :key="key" class="attribute-item">
                <span class="attr-key">{{ key }}:</span>
                <span class="attr-value">{{ value }}</span>
              </div>
            </div>
          </div>
        </a-card>
      </div>
      
      <!-- Quick Rules -->
      <div class="quick-rules" v-if="selectedElement">
        <a-card title="快速创建规则" size="small">
          <div class="rule-options">
            <a-button 
              v-for="rule in availableRules" 
              :key="rule.type"
              size="small"
              @click="createRule(rule)"
              :type="selectedRuleType === rule.type ? 'primary' : 'secondary'"
            >
              {{ rule.name }}
            </a-button>
          </div>
          
          <div class="rule-preview" v-if="selectedRuleType">
            <div class="preview-title">规则预览</div>
            <div class="preview-content">
              <div>类型: {{ getRuleTypeLabel(selectedRuleType) }}</div>
              <div>选择器: {{ selectedElement.selector }}</div>
              <div v-if="ruleExpect">期望值: {{ ruleExpect }}</div>
            </div>
            
            <div class="rule-actions">
              <a-button type="primary" size="small" @click="applyRule">
                应用规则
              </a-button>
              <a-button size="small" @click="previewRule">
                预览效果
              </a-button>
            </div>
          </div>
        </a-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  IconSort,
  IconDelete
} from '@arco-design/web-vue/es/icon'

interface ElementInfo {
  selector: string
  tagName: string
  textContent?: string
  attributes: Record<string, string>
  boundingBox: {
    x: number
    y: number
    width: number
    height: number
  }
  isVisible: boolean
  isClickable: boolean
  uniquenessScore: number
}

interface RuleOption {
  type: string
  name: string
  description: string
}

// Props
const props = defineProps<{
  screenshotUrl?: string
  elements: ElementInfo[]
}>()

// Emits
const emit = defineEmits<{
  elementSelected: [element: ElementInfo]
  ruleCreated: [rule: any]
}>()

// State
const isSelecting = ref(false)
const selectedElement = ref<ElementInfo | null>(null)
const hoveredElement = ref<ElementInfo | null>(null)
const selectedRuleType = ref<string>('')
const ruleExpect = ref<string>('')

// Refs
const previewImage = ref<HTMLImageElement>()

// Computed
const availableRules = computed<RuleOption[]>(() => {
  if (!selectedElement.value) return []
  
  const rules: RuleOption[] = [
    { type: 'exists', name: '存在性检查', description: '验证元素是否存在' },
    { type: 'visible', name: '可见性检查', description: '验证元素是否可见' }
  ]
  
  if (selectedElement.value.textContent) {
    rules.push(
      { type: 'textMatch', name: '文本匹配', description: '验证文本内容' },
      { type: 'nonEmpty', name: '非空检查', description: '验证文本不为空' }
    )
  }
  
  if (selectedElement.value.tagName === 'table') {
    rules.push({ type: 'tableRows', name: '表格行数', description: '验证表格行数' })
  }
  
  return rules
})

// Methods
const toggleSelector = () => {
  isSelecting.value = !isSelecting.value
  if (!isSelecting.value) {
    hoveredElement.value = null
  }
}

const clearSelection = () => {
  selectedElement.value = null
  hoveredElement.value = null
  selectedRuleType.value = ''
}

const handleImageClick = (event: MouseEvent) => {
  if (!isSelecting.value || !props.elements.length) return
  
  const rect = (event.target as HTMLImageElement).getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  // Find element at click position
  const element = findElementAtPosition(x, y, rect)
  if (element) {
    selectedElement.value = element
    emit('elementSelected', element)
  }
}

const handleImageHover = (event: MouseEvent) => {
  if (!isSelecting.value || !props.elements.length) return
  
  const rect = (event.target as HTMLImageElement).getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  const element = findElementAtPosition(x, y, rect)
  hoveredElement.value = element
}

const findElementAtPosition = (x: number, y: number, containerRect: DOMRect): ElementInfo | null => {
  // Convert relative coordinates to percentage
  const relX = (x / containerRect.width) * 100
  const relY = (y / containerRect.height) * 100
  
  // Find elements that contain this position
  const candidates = props.elements.filter(element => {
    const { boundingBox } = element
    return relX >= boundingBox.x && relX <= boundingBox.x + boundingBox.width &&
           relY >= boundingBox.y && relY <= boundingBox.y + boundingBox.height
  })
  
  // Return the smallest/most specific element
  return candidates.sort((a, b) => {
    const areaA = a.boundingBox.width * a.boundingBox.height
    const areaB = b.boundingBox.width * b.boundingBox.height
    return areaA - areaB // Smaller area first
  })[0] || null
}

const getSelectionStyle = (element: ElementInfo) => {
  const { boundingBox } = element
  return {
    left: `${boundingBox.x}%`,
    top: `${boundingBox.y}%`,
    width: `${boundingBox.width}%`,
    height: `${boundingBox.height}%`
  }
}

const copySelector = () => {
  if (selectedElement.value) {
    navigator.clipboard.writeText(selectedElement.value.selector)
  }
}

const createRule = (rule: RuleOption) => {
  selectedRuleType.value = rule.type
  // Set default expectation based on rule type
  switch (rule.type) {
    case 'exists':
    case 'visible':
    case 'nonEmpty':
      ruleExpect.value = 'true'
      break
    case 'textMatch':
      ruleExpect.value = selectedElement.value?.textContent?.substring(0, 50) || ''
      break
    case 'tableRows':
      ruleExpect.value = '1'
      break
  }
}

const getRuleTypeLabel = (type: string) => {
  const rule = availableRules.value.find(r => r.type === type)
  return rule?.name || type
}

const applyRule = () => {
  if (!selectedElement.value || !selectedRuleType.value) return
  
  const rule = {
    type: selectedRuleType.value,
    selector: selectedElement.value.selector,
    expect: ruleExpect.value,
    description: `基于元素 "${selectedElement.value.tagName}" 的${getRuleTypeLabel(selectedRuleType.value)}`
  }
  
  emit('ruleCreated', rule)
  
  // Reset
  selectedRuleType.value = ''
  ruleExpect.value = ''
}

const previewRule = () => {
  console.log('预览规则效果:', {
    element: selectedElement.value,
    ruleType: selectedRuleType.value,
    expect: ruleExpect.value
  })
  // TODO: Implement rule preview
}
</script>

<style scoped>
.visual-selector {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.selector-controls {
  display: flex;
  gap: 8px;
}

.selector-content {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 16px;
  padding: 16px;
}

.preview-area {
  position: relative;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  background: #f9fafb;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  cursor: crosshair;
}

.selection-overlay {
  position: absolute;
  border: 2px solid #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  pointer-events: none;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
}

.hover-overlay {
  position: absolute;
  border: 1px solid #6b7280;
  background: rgba(107, 114, 128, 0.1);
  pointer-events: none;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
}

.element-tag {
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 2px 6px;
  font-size: 12px;
  border-radius: 2px;
  margin: 2px;
}

.element-text {
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 2px 6px;
  font-size: 10px;
  border-radius: 2px;
  margin: 2px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selection-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  font-size: 12px;
}

.element-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.detail-label {
  font-weight: 500;
  color: #374151;
  min-width: 80px;
}

.detail-value {
  flex: 1;
  color: #6b7280;
  word-break: break-all;
}

.attributes-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.attribute-item {
  display: flex;
  gap: 8px;
  font-size: 12px;
}

.attr-key {
  color: #6b7280;
  font-weight: 500;
}

.attr-value {
  color: #374151;
}

.quick-rules {
  margin-top: 12px;
}

.rule-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.rule-preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 12px;
}

.preview-title {
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.preview-content {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 12px;
}

.rule-actions {
  display: flex;
  gap: 8px;
}

@media (max-width: 768px) {
  .selector-content {
    grid-template-columns: 1fr;
  }
  
  .selector-header {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
  
  .selector-controls {
    justify-content: center;
  }
}
</style>