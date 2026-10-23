<template>
  <BaseDrawer
    :visible="visible"
    :form-data="formData"
    :form-rules="formRules"
    :is-submitting="isSubmitting"
    :is-form-valid="isFormValid"
    title="人群分流节点配置"
    width="600px"
    :read-only="readOnly"
    @update:visible="visible = $event"
    @confirm="handleSubmit"
    @cancel="handleCancel"
  >
    <template #form>
      <div class="node-name-section">
        <a-form-item label="节点名称" field="nodeName" required>
          <a-input v-model="formData.nodeName" placeholder="请输入节点名称" @change="handleNodeNameChange" />
        </a-form-item>
      </div>
      <div class="system-tip"><a-alert type="info" show-icon>系统将按从上到下顺序，依次命中</a-alert></div>
      <div class="crowd-layers">
        <div v-for="(layer, index) in formData.crowdLayers" :key="layer.id" class="crowd-layer">
          <div class="layer-header">
            <span class="layer-title">人群{{ index + 1 }}：</span><span class="layer-label">命中</span>
            <a-button v-if="formData.crowdLayers.length > 1" type="text" status="danger" size="small" class="remove-btn" @click="removeCrowdLayer(index)"><icon-minus /></a-button>
          </div>
          <div class="layer-content">
            <a-select v-model="layer.crowdId" placeholder="请选择人群" class="crowd-select" @change="(value) => handleCrowdChange(index, value)">
              <a-option v-for="crowd in getAvailableCrowds(index)" :key="crowd.id" :value="crowd.id">{{ crowd.name }}</a-option>
            </a-select>
            <a-button type="text" size="small" class="search-btn"><icon-search /></a-button>
          </div>
        </div>
      </div>
      <div class="unmatch-branch-section">
        <div class="section-title"><span>未命中分支配置</span><a-tooltip content="未命中分支用于处理不满足上述任何人群条件的用户，此分支不可删除"><icon-info-circle class="info-icon" /></a-tooltip></div>
        <div class="crowd-layer unmatch-layer">
          <div class="layer-header"><span class="layer-title">其他：</span><span class="layer-label fixed-label">固定分支</span></div>
          <div class="layer-content">
            <a-input v-model="formData.unmatchBranch.name" placeholder="请输入其他分支名称" class="branch-name-input" @change="handleUnmatchBranchNameChange" />
            <a-button type="text" size="small" class="search-btn" disabled><icon-search /></a-button>
          </div>
        </div>
      </div>
      <div class="action-buttons">
        <a-button type="primary" class="add-crowd-btn" @click="addCrowdLayer">新增人群</a-button>
        <a-button type="primary" class="add-hit-crowd-btn" @click="addHitCrowdLayer">添加命中人群</a-button>
      </div>
    </template>
    <template #content>
      <div class="debug-info">
        <div><strong>表单验证状态:</strong> {{ isFormValid ? '✓' : '✗' }}</div>
        <div><strong>人群层级数量:</strong> {{ formData?.crowdLayers?.length || 0 }}</div>
        <div><strong>已选择人群:</strong> {{ selectedCrowdCount }}</div>
        <div><strong>可用人群数量:</strong> {{ crowdList.length }}</div>
      </div>
      <div class="log-section">
        <div class="log-header">
          <strong>日志信息</strong>
          <span class="log-count">{{ logSummary.totalLogs }} 条日志</span>
          <div class="log-actions">
            <a-button size="mini" @click="exportLogs">导出日志</a-button>
            <a-button size="mini" @click="clearLogs">清空日志</a-button>
          </div>
        </div>
        <div class="log-meta">
          <span>会话ID: {{ logSessionId }}</span>
          <span class="log-error">错误: {{ logSummary.logsByLevel.error || 0 }}</span>
          <span class="log-warn">警告: {{ logSummary.logsByLevel.warn || 0 }}</span>
        </div>
        <div class="log-list">
          <div v-for="(item, index) in recentLogs" :key="index" class="log-item">
            <span class="log-time">{{ formatLogTime(item.timestamp) }}</span>
            <span class="log-category" :style="{ color: getLogColor(item.level) }">{{ item.category }}</span>
            <span class="log-message">{{ item.message }}</span>
          </div>
          <div v-if="!recentLogs.length" class="log-empty">暂无日志</div>
        </div>
      </div>
    </template>
  </BaseDrawer>
</template>
<script setup>
import { ref, reactive, watch, onMounted, computed } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconMinus, IconSearch, IconInfoCircle } from '@arco-design/web-vue/es/icon'
import BaseDrawer from './BaseDrawer.vue'
import { useBaseDrawer } from '@/composables/useBaseDrawer.js'
import crowdSplitLogger from '../utils/canvas/crowdSplitLogger.js'
const mockCrowdData = [ { id: 1, name: '黑名单' }, { id: 2, name: '高响应客群高响应客群高响应客群高响应客群高响应客群高响应客群高响应客群' }, { id: 3, name: '中响应客群' } ]
const props = defineProps({ visible: { type: Boolean, default: false }, nodeData: { type: Object, default: () => ({}) }, readOnly: { type: Boolean, default: false } })
const emit = defineEmits(['update:visible','confirm','cancel'])
const crowdList = ref([])
const formRules = { crowdLayers: [ { required: true, message: '请配置人群分层' } ] }
const generateId = () => Date.now() + Math.random().toString(36).substr(2,9)
const getInitialFormData = () => ({ nodeName: props.nodeData?.nodeName || '人群分流', crowdLayers: [ { id: generateId(), crowdId: null, crowdName: '' }, { id: generateId(), crowdId: null, crowdName: '' } ], unmatchBranch: { id: 'unmatch_default', name: '其他', isDefault: true, crowdId: null, crowdName: '其他' } })
const customValidation = (formData) => { const errors = []; if (!formData) { return errors } if (!formData.crowdLayers || formData.crowdLayers.length === 0) { errors.push('请配置人群分层'); return errors } const emptyLayers = formData.crowdLayers.filter(layer => !layer.crowdId); if (emptyLayers.length > 0) { errors.push(`请为所有人群层级选择对应的人群`) } const validCrowdIds = formData.crowdLayers.map(layer => layer.crowdId).filter(id => id); const uniqueCrowdIds = [...new Set(validCrowdIds)]; if (validCrowdIds.length !== uniqueCrowdIds.length) { errors.push('不能选择重复的人群') } if (!formData.unmatchBranch || !formData.unmatchBranch.name || formData.unmatchBranch.name.trim() === '') { errors.push('请输入其他分支名称') } return errors }
const { formData, visible, isSubmitting, isFormValid, handleSubmit: baseHandleSubmit, handleCancel } = useBaseDrawer({ props, emit, formRules, getInitialFormData, customValidation, nodeType: 'crowd-split' })
// 已选择人群数量（表单中 crowdId 非空的层级数）
const selectedCrowdCount = computed(() => formData?.crowdLayers?.filter(l => l.crowdId !== null && l.crowdId !== undefined && l.crowdId !== '').length || 0)
// 日志汇总（读取 logger.version 建立响应式依赖，日志写入后自动刷新）
const logSummary = computed(() => { crowdSplitLogger.version.value; return crowdSplitLogger.getLogSummary() })
// 最近 20 条日志（最新在前）
const recentLogs = computed(() => { crowdSplitLogger.version.value; return (crowdSplitLogger.logs || []).slice(-20).reverse() })
// 当前日志会话 ID
const logSessionId = computed(() => crowdSplitLogger.sessionId)
/**
 * 格式化日志时间戳为 HH:mm:ss
 * @param {number} timestamp 毫秒时间戳
 * @returns {string} 格式化后的时间文本
 */
const formatLogTime = (timestamp) => { try { const d = new Date(timestamp); const pad = (n) => String(n).padStart(2, '0'); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` } catch { return '' } }
/**
 * 根据日志级别返回展示颜色
 * @param {string} level 日志级别
 * @returns {string} 颜色值
 */
const getLogColor = (level) => ({ debug: '#86909c', info: '#165dff', warn: '#ff7d00', error: '#f53f3f' }[level] || '#4e5969')
/** 导出当前会话的全部日志为 JSON 文件 */
const exportLogs = () => { try { const payload = crowdSplitLogger.exportLogs(); const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `crowd-split-logs-${crowdSplitLogger.sessionId}.json`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); Message.success('日志已导出') } catch { Message.error('日志导出失败') } }
/** 清空当前会话的全部日志 */
const clearLogs = () => { crowdSplitLogger.clearLogs(); Message.success('日志已清空') }
const fetchCrowdList = async () => { crowdList.value = mockCrowdData }
onMounted(() => { fetchCrowdList() })
// 抽屉显示状态变化时记录生命周期日志（打开抽屉即产生一条日志）
watch(() => props.visible, (val, oldVal) => { crowdSplitLogger.info('LIFECYCLE', `抽屉显示状态变化: ${oldVal} -> ${val}`) }, { immediate: true })
// 表单数据变化时记录日志（深度监听）
watch(() => formData, (val) => { if (val) crowdSplitLogger.logFormDataChange('表单数据监听变化', val) }, { deep: true })
const getAvailableCrowds = (currentIndex) => { if (!formData || !formData.crowdLayers) return crowdList.value || []; const selectedCrowdIds = formData.crowdLayers.filter((layer, index) => index !== currentIndex && layer.crowdId).map(layer => layer.crowdId); return crowdList.value.filter(crowd => !selectedCrowdIds.includes(crowd.id)) }
const handleCrowdChange = (index, crowdId) => { if (!formData || !formData.crowdLayers || !formData.crowdLayers[index]) return; const layer = formData.crowdLayers[index]; layer.crowdId = crowdId; if (crowdId) { const selectedCrowd = crowdList.value.find(crowd => crowd.id === crowdId); layer.crowdName = selectedCrowd ? selectedCrowd.name : '' ; crowdSplitLogger.logCrowdSelection(index, crowdId, layer.crowdName) } else { layer.crowdName = '' } }
const addCrowdLayer = () => { if (!formData || !formData.crowdLayers) return; const newLayer = { id: generateId(), crowdId: null, crowdName: '' }; formData.crowdLayers.push(newLayer); crowdSplitLogger.logLayerOperation('新增层级', formData.crowdLayers.length - 1, { layerId: newLayer.id }) }
const addHitCrowdLayer = () => { addCrowdLayer() }
const handleNodeNameChange = (value) => { if (!formData) return; const oldName = formData.nodeName; formData.nodeName = value || '人群分流'; crowdSplitLogger.logFormDataChange('节点名称变化', { oldName, newName: formData.nodeName }) }
const handleUnmatchBranchNameChange = (value) => { if (!formData || !formData.unmatchBranch) return; const oldName = formData.unmatchBranch.name; formData.unmatchBranch.name = value || '其他'; formData.unmatchBranch.crowdName = formData.unmatchBranch.name; crowdSplitLogger.logFormDataChange('其他分支名称变化', { oldName, newName: formData.unmatchBranch.name }) }
const removeCrowdLayer = (index) => { if (!formData || !formData.crowdLayers || formData.crowdLayers.length <= 1) return; const removedLayer = formData.crowdLayers[index]; formData.crowdLayers.splice(index, 1); crowdSplitLogger.logLayerOperation('移除层级', index, { removedLayerId: removedLayer?.id }) }
const handleSubmit = async () => { if (!formData || !formData.crowdLayers) { Message.error('表单数据不完整'); crowdSplitLogger.logValidation(false, ['表单数据不完整'], formData); return } const hasEmptyLayers = formData.crowdLayers.some(layer => !layer.crowdId); if (hasEmptyLayers) { Message.error('请为所有人群层级选择对应的人群'); crowdSplitLogger.logValidation(false, ['请为所有人群层级选择对应的人群'], formData); return } const crowdIds = formData.crowdLayers.map(layer => layer.crowdId); const uniqueCrowdIds = [...new Set(crowdIds)]; if (crowdIds.length !== uniqueCrowdIds.length) { Message.error('不能选择重复的人群'); crowdSplitLogger.logValidation(false, ['不能选择重复的人群'], formData); return } if (!formData.unmatchBranch || !formData.unmatchBranch.name || formData.unmatchBranch.name.trim() === '') { Message.error('请输入未命中分支名称'); crowdSplitLogger.logValidation(false, ['请输入未命中分支名称'], formData); return } const configData = { type: 'crowd-split', crowdLayers: formData.crowdLayers.map((layer, index) => ({ id: layer.id, order: index + 1, crowdId: layer.crowdId, crowdName: layer.crowdName })), unmatchBranch: { id: formData.unmatchBranch.id, name: formData.unmatchBranch.name, isDefault: true, crowdId: null, crowdName: formData.unmatchBranch.name, order: formData.crowdLayers.length + 1 }, nodeType: 'crowd-split' }; crowdSplitLogger.logValidation(true, [], configData); await baseHandleSubmit(configData); Message.success('配置保存成功') }
</script>
<style scoped>
.system-tip { margin-bottom: 24px }
.system-tip .arco-alert { background-color: #e6f4ff; border: 1px solid #91caff; border-radius: 6px }
.crowd-layers { margin-bottom: 24px }
.unmatch-branch-section { margin-bottom: 24px }
.section-title { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; font-size: 14px; font-weight: 500; color: #333 }
.info-icon { color: #1890ff; cursor: help }
.unmatch-layer { background-color: #f0f8ff; border: 1px solid #b3d8ff }
.fixed-label { background-color: #e6f4ff; color: #1890ff; padding: 2px 8px; border-radius: 4px; font-size: 12px }
.branch-name-input { flex: 1 }
.crowd-layer { margin-bottom: 16px; padding: 16px; background-color: #fafafa; border-radius: 8px; border: 1px solid #e5e5e5 }
.layer-header { display: flex; align-items: center; margin-bottom: 12px; gap: 8px }
.layer-title { font-size: 14px; font-weight: 500; color: #333 }
.layer-label { font-size: 14px; color: #666 }
.remove-btn { margin-left: auto; color: #ff4d4f }
.remove-btn:hover { background-color: #fff2f0 }
.layer-content { display: flex; align-items: center; gap: 8px }
.crowd-select { flex: 1 }
.search-btn { flex-shrink: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; color: #666 }
.search-btn:hover { background-color: #f0f0f0; color: #1890ff }
.action-buttons { display: flex; gap: 12px }
.add-crowd-btn, .add-hit-crowd-btn { flex: 1; height: 40px; font-size: 14px; font-weight: 500; border-radius: 6px }
.add-crowd-btn { background-color: #1890ff; border-color: #1890ff }
.add-crowd-btn:hover { background-color: #40a9ff; border-color: #40a9ff }
.add-hit-crowd-btn { background-color: #1890ff; border-color: #1890ff }
.add-hit-crowd-btn:hover { background-color: #40a9ff; border-color: #40a9ff }
.debug-info { font-size: 12px; color: #666; background: #f5f5f5; padding: 8px; border-radius: 4px; margin-bottom: 12px }
.debug-info div { margin-bottom: 4px }
.debug-info div:last-child { margin-bottom: 0 }
.log-section { margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px }
.log-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px }
.log-count { color: #165dff; font-size: 12px }
.log-actions { margin-left: auto; display: flex; gap: 8px }
.log-meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: #86909c; margin-bottom: 8px }
.log-error { color: #f53f3f }
.log-warn { color: #ff7d00 }
.log-list { max-height: 200px; overflow-y: auto; border: 1px solid #f2f3f5; border-radius: 4px; background: #fafafa }
.log-item { display: flex; align-items: baseline; gap: 8px; padding: 4px 8px; font-size: 12px; border-bottom: 1px solid #f2f3f5 }
.log-item:last-child { border-bottom: none }
.log-time { color: #86909c; flex-shrink: 0 }
.log-category { flex-shrink: 0; font-weight: 500 }
.log-message { color: #4e5969; word-break: break-all }
.log-empty { padding: 16px; text-align: center; color: #86909c; font-size: 12px }
@media (max-width: 768px) { .action-buttons { flex-direction: column } .layer-content { flex-direction: column; align-items: stretch } .search-btn { align-self: flex-end; width: auto; padding: 0 12px } }
</style>
