<template>
  <div class="report-create-page">
    <a-page-header :title="isEdit ? '编辑报表' : '新增报表'" :show-back="true" @back="goBack" />

    <a-form :model="formData" layout="vertical" class="report-form">
      <a-tabs v-model:activeKey="activeTab" class="reader-tabs">
        <!-- ── 人读属性 ── -->
        <a-tab-pane key="human" title="人读属性">
          <a-card title="基本信息" class="form-card">
            <a-row :gutter="16">
              <a-col :span="8">
                <a-form-item label="报表名称" required>
                  <a-input v-model="formData.name" placeholder="2-50字符" :max-length="50" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="报表类型">
                  <a-select v-model="formData.type">
                    <a-option v-for="o in REPORT_TYPE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</a-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="负责人" required>
                  <a-select v-model="formData.owner" placeholder="请选择" :filterable="true">
                    <a-option v-for="p in persons" :key="p.id" :value="p.name">{{ p.name }}（{{ p.department }}）</a-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="更新频率" required>
                  <a-select v-model="formData.updateFrequency">
                    <a-option v-for="o in FREQUENCY_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</a-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="状态">
                  <a-tag :color="formData.status === 'active' ? 'green' : 'red'">
                    {{ formData.status === 'active' ? '启用中' : '已下线' }}
                  </a-tag>
                  <span class="status-hint">{{ isEdit ? '状态通过详情页上/下线操作变更' : '新建后默认启用' }}</span>
                </a-form-item>
              </a-col>
            </a-row>
            <a-form-item label="报表跳转路径（人机共用）" required>
              <a-input v-model="formData.accessEntry" placeholder="如 /reports/credit/daily?date={yyyyMMdd}" />
              <template #extra>人点击直达、Agent 打开报表同用此入口（R27 人机同源），挂载该报表的指标详情页"报表位置"由此派生</template>
            </a-form-item>
          </a-card>
        </a-tab-pane>

        <!-- ── Agent 可读契约 ── -->
        <a-tab-pane key="agent">
          <template #title>
            <span>Agent 可读信息</span>
          </template>
          <a-alert type="info" class="agent-hint">
            人机同源（R27）：报表跳转路径已在「人读属性」统一维护，Agent 与人使用同一入口，挂载指标的"报表位置"由此派生，修改后同步生效。必填参数、可筛维度、权限约束等调用语义不再单独结构化，统一写入下方 Agent 说明文档。
          </a-alert>
          <a-card title="跳转路径回显" class="form-card">
            <a-form-item field="accessEntry" label="跳转路径（人机共用，人读页签维护）">
              <a-input :model-value="formData.accessEntry" placeholder="请先在「人读属性」页签填写" disabled />
            </a-form-item>
          </a-card>
          <a-card title="Agent 说明文档（Markdown · 选填）" class="form-card">
            <div class="md-hint">长文本补充：调用方式示例、口径注意事项、FAQ 等，Markdown 编写，详情页以统一样式渲染。</div>
            <MarkdownEditor v-model="formData.agentDoc" placeholder="## 使用说明&#10;- 调用示例：…&#10;- 注意事项：…" />
          </a-card>
        </a-tab-pane>
      </a-tabs>

      <!-- 操作按钮 -->
      <div class="form-actions">
        <a-space>
          <a-button @click="goBack">取消</a-button>
          <a-button type="primary" :loading="saving" @click="handleSave">{{ isEdit ? '保存修改' : '新增报表' }}</a-button>
        </a-space>
      </div>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { MetricsCenterStore } from '@/mock-dca/metrics-center/store'
import { REPORT_TYPE_OPTIONS, FREQUENCY_OPTIONS } from '@/mock-dca/metrics-center/data'
import MarkdownEditor from '@/components-dca/common/MarkdownEditor.vue'
import type { ReportType, ReportStatus, CalculationFrequency } from '@/mock-dca/metrics-center/types'

const route = useRoute()
const router = useRouter()

const activeTab = ref('human')
const isEdit = ref(false)
const editId = ref('')
const saving = ref(false)

const persons = MetricsCenterStore.getPersons()

const formData = reactive({
  name: '',
  type: 'fixed' as ReportType,
  owner: '',
  updateFrequency: 'T+1' as CalculationFrequency,
  status: 'active' as ReportStatus,
  accessEntry: '',
  agentDoc: '',
})

/** 必填校验：名称/负责人/跳转路径（人机共用）；报表以「名称 + 跳转路径」标识，无编码字段 */
function validateForm(): { ok: boolean; tab: string; msg: string } {
  if (!formData.name.trim() || formData.name.trim().length < 2) {
    return { ok: false, tab: 'human', msg: '报表名称必填（2-50字符）' }
  }
  if (!formData.owner.trim()) {
    return { ok: false, tab: 'human', msg: '负责人必填' }
  }
  if (!formData.accessEntry.trim()) {
    return { ok: false, tab: 'human', msg: '报表跳转路径必填（人机共用入口，指标侧挂载展示依赖此字段）' }
  }
  return { ok: true, tab: '', msg: '' }
}

function handleSave() {
  const result = validateForm()
  if (!result.ok) {
    activeTab.value = result.tab
    Message.warning(result.msg)
    return
  }

  const payload = {
    name: formData.name.trim(),
    type: formData.type,
    owner: formData.owner,
    updateFrequency: formData.updateFrequency,
    accessEntry: formData.accessEntry.trim(),
    agentDoc: formData.agentDoc,
  }

  saving.value = true
  try {
    if (isEdit.value) {
      // updateReport 内已强制 id 不可变更
      MetricsCenterStore.updateReport(editId.value, payload)
      Message.success('报表已更新，所有挂载指标的访问入口同步生效')
      router.push({ name: 'metrics-center-reports-detail', params: { id: editId.value } })
    } else {
      const created = MetricsCenterStore.createReport(payload)
      Message.success(`报表「${created.name}」已新增并默认启用`)
      router.push({ name: 'metrics-center-reports-detail', params: { id: created.id } })
    }
  } catch (e) {
    Message.error((e as Error).message || '操作失败')
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.push({ name: 'metrics-center-reports' })
}

function loadEditData() {
  const id = route.query.id as string
  if (!id) return
  const r = MetricsCenterStore.getReportById(id)
  if (!r) {
    Message.error('报表不存在或已被删除')
    return
  }
  isEdit.value = true
  editId.value = id
  Object.assign(formData, {
    name: r.name,
    type: r.type,
    owner: r.owner,
    updateFrequency: r.updateFrequency,
    status: r.status,
    accessEntry: r.accessEntry,
    agentDoc: r.agentDoc || '',
  })
}

onMounted(loadEditData)
</script>

<style scoped lang="less">
.report-create-page {
  padding: 24px;
  max-width: 1000px;
  margin: 0 auto;

  .reader-tabs {
    :deep(.arco-tabs-content) {
      padding-top: 16px;
    }
  }

  .agent-hint {
    margin-bottom: 16px;
  }

  .form-card {
    margin-bottom: 16px;
  }

  .md-hint {
    margin-bottom: 8px;
    font-size: 12px;
    color: #86909c;
  }

  .status-hint {
    margin-left: 8px;
    font-size: 12px;
    color: #86909c;
  }

  .form-actions {
    display: flex;
    justify-content: center;
    padding: 24px 0;
  }
}
</style>
