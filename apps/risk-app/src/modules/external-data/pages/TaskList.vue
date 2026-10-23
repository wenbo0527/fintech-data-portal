<template>
  <div class="task-list-page">
    <a-page-header title="服务任务列表" subtitle="外数落库异步任务追踪：解析落库 / 推进 Hive / 行数验证 / 一致性校验">
      <template #extra>
        <a-button @click="loadTasks">
          <template #icon><icon-refresh /></template>
          刷新
        </a-button>
      </template>
    </a-page-header>

    <!-- 状态统计条（R84 五种执行状态） -->
    <a-row :gutter="12" class="stat-row">
      <a-col v-for="s in statusStats" :key="s.status" :span="4">
        <div class="stat-card" :class="{ active: filters.status === s.status }" @click="toggleStatusFilter(s.status)">
          <div class="stat-value">{{ s.count }}</div>
          <div class="stat-label">{{ s.status }}</div>
        </div>
      </a-col>
    </a-row>

    <a-card class="list-card">
      <a-form :model="filters" layout="inline" class="filter-bar">
        <a-form-item label="任务类型">
          <a-select v-model="filters.taskType" placeholder="全部类型" allow-clear style="width: 160px">
            <a-option v-for="t in taskTypes" :key="t" :value="t">{{ t }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="执行状态">
          <a-select v-model="filters.status" placeholder="全部状态" allow-clear style="width: 140px">
            <a-option v-for="s in taskTypesStatus" :key="s" :value="s">{{ s }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="文件名 / backid / 任务ID">
          <a-input v-model="filters.keyword" placeholder="搜索文件名、backid 或任务ID" allow-clear style="width: 260px" />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="loadTasks">
              <template #icon><icon-search /></template>
              查询
            </a-button>
            <a-button @click="resetFilters">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>

      <a-table :data="pagedTasks" :loading="loading" :pagination="pagination" row-key="taskId" @page-change="onPageChange">
        <template #columns>
          <a-table-column title="任务ID" data-index="taskId" :width="160">
            <template #cell="{ record }">
              <span class="mono">{{ record.taskId }}</span>
              <a-tag v-if="record.writeOperation" size="small" color="orange" style="margin-left: 4px">写操作</a-tag>
              <a-tag v-else size="small" color="gray" style="margin-left: 4px">只读</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="任务类型" data-index="taskType" :width="110">
            <template #cell="{ record }">
              <a-tag size="small" :color="taskTypeColor(record.taskType)">{{ record.taskType }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="关联backid" data-index="backid" :width="150">
            <template #cell="{ record }">
              <a-link v-if="record.backid" class="mono" @click="openPersistRecord(record)">{{ record.backid }}</a-link>
              <span v-else class="dim">—</span>
            </template>
          </a-table-column>
          <a-table-column title="征信机构" data-index="agencyName" :width="200" ellipsis tooltip />
          <a-table-column title="文件名" data-index="fileName" :width="230" ellipsis tooltip />
          <a-table-column title="创建时间" data-index="createTime" :width="170" />
          <a-table-column title="执行状态" data-index="status" :width="120">
            <template #cell="{ record }">
              <a-tag size="small" :color="statusColor(record.status)">{{ record.status }}</a-tag>
              <div v-if="record.status === '疑似卡死'" class="dim stuck-tip">
                超阈值 {{ record.stuckThresholdMinutes }} 分钟，系统不自动重跑
              </div>
            </template>
          </a-table-column>
          <a-table-column title="完成时间" data-index="finishTime" :width="170">
            <template #cell="{ record }">
              <span :class="{ dim: !record.finishTime }">{{ record.finishTime || '—' }}</span>
            </template>
          </a-table-column>
          <a-table-column title="操作人" data-index="operator" :width="170" ellipsis tooltip />
          <a-table-column title="操作" :width="200" fixed="right">
            <template #cell="{ record }">
              <a-space>
                <!-- R88：成功任务可跳转落库记录 / 验证报告 -->
                <a-button
                  v-if="record.status === '成功'"
                  type="text"
                  size="small"
                  @click="openPersistRecord(record)"
                >
                  落库记录
                </a-button>
                <a-button
                  v-if="record.status === '成功' && (record.taskType === '行数验证' || record.taskType === '一致性校验')"
                  type="text"
                  size="small"
                  @click="openValidationReport(record)"
                >
                  验证报告
                </a-button>
                <!-- R89：失败任务展示原因 + 重新发起 -->
                <a-button v-if="record.status === '失败'" type="text" size="small" @click="showFailReason(record)">
                  失败原因
                </a-button>
                <a-button
                  v-if="record.status === '失败' || record.status === '疑似卡死'"
                  type="text"
                  size="small"
                  @click="restartTask(record)"
                >
                  重新发起
                </a-button>
                <a-button v-if="record.status === '疑似卡死'" type="text" size="small" status="danger" @click="terminateTask(record)">
                  终止
                </a-button>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- 失败原因弹窗（R89） -->
    <a-modal v-model:visible="failVisible" title="任务失败原因" :footer="false">
      <a-descriptions :column="1" bordered size="small">
        <a-descriptions-item label="任务ID">{{ failTask?.taskId }}</a-descriptions-item>
        <a-descriptions-item label="任务类型">{{ failTask?.taskType }}</a-descriptions-item>
        <a-descriptions-item label="关联backid">{{ failTask?.backid || '—' }}</a-descriptions-item>
        <a-descriptions-item label="征信机构">{{ failTask?.agencyName }}</a-descriptions-item>
        <a-descriptions-item label="文件名">{{ failTask?.fileName }}</a-descriptions-item>
        <a-descriptions-item label="失败原因">
          <span class="fail-reason">{{ failTask?.failReason || '未记录失败原因' }}</span>
        </a-descriptions-item>
      </a-descriptions>
    </a-modal>

    <!-- 落库记录抽屉（R88） -->
    <a-drawer v-model:visible="recordVisible" :width="760" title="落库记录" :footer="false">
      <a-descriptions v-if="persistRecord" :column="2" bordered size="small">
        <a-descriptions-item label="backid 批次标识">
          <span class="mono">{{ persistRecord.backid }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="落库状态">
          <a-tag size="small" color="arcoblue">{{ persistRecord.baseInfo.status }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="操作人">{{ persistRecord.baseInfo.operator }}</a-descriptions-item>
        <a-descriptions-item label="操作时间">{{ persistRecord.baseInfo.operateTime }}</a-descriptions-item>
        <a-descriptions-item label="征信机构">{{ persistRecord.agencyInfo.agencyName }}</a-descriptions-item>
        <a-descriptions-item label="机构类型">{{ persistRecord.agencyInfo.agencyType }}</a-descriptions-item>
        <a-descriptions-item label="牌照编号">{{ persistRecord.agencyInfo.licenseNo }}</a-descriptions-item>
        <a-descriptions-item label="获取方式">{{ persistRecord.fileInfo.acquireMode }}</a-descriptions-item>
        <a-descriptions-item label="文件名" :span="2">{{ persistRecord.fileInfo.fileName }}</a-descriptions-item>
        <a-descriptions-item label="文件行数">{{ persistRecord.fileInfo.fileRows.toLocaleString() }}</a-descriptions-item>
        <a-descriptions-item label="文件大小">{{ formatSize(persistRecord.fileInfo.fileSize) }}</a-descriptions-item>
        <a-descriptions-item label="编码格式">{{ persistRecord.fileInfo.encoding }}</a-descriptions-item>
        <a-descriptions-item label="分隔符">{{ persistRecord.fileInfo.delimiter }}</a-descriptions-item>
        <a-descriptions-item label="外数产品">{{ persistRecord.mappingInfo.product }}</a-descriptions-item>
        <a-descriptions-item label="接口号">{{ persistRecord.mappingInfo.interfaceId || '—' }}</a-descriptions-item>
        <a-descriptions-item label="映射版本">{{ persistRecord.mappingInfo.mappingVersion }}</a-descriptions-item>
        <a-descriptions-item label="标准 / 非标字段数">
          {{ persistRecord.mappingInfo.stdFieldCount }} / {{ persistRecord.mappingInfo.nonStdFieldCount }}
        </a-descriptions-item>
        <a-descriptions-item label="Hive 目标表" :span="2">
          <span class="mono">{{ persistRecord.storageInfo.hiveTable }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="临时库表">{{ persistRecord.storageInfo.tempTable }}</a-descriptions-item>
        <a-descriptions-item label="入库行数">{{ persistRecord.storageInfo.loadedRows.toLocaleString() }}</a-descriptions-item>
        <a-descriptions-item label="分区字段">
          <span class="mono">{{ persistRecord.storageInfo.partitionField }}={{ persistRecord.storageInfo.partitionValue }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="写入策略">{{ persistRecord.storageInfo.writeStrategy }}</a-descriptions-item>
        <a-descriptions-item label="临时库清理">{{ persistRecord.storageInfo.tempTableCleanup }}</a-descriptions-item>
        <a-descriptions-item label="上传文件清理">{{ persistRecord.storageInfo.uploadFileCleanup }}</a-descriptions-item>
        <a-descriptions-item label="计费主体">{{ persistRecord.billing.billingSubject }}</a-descriptions-item>
        <a-descriptions-item label="计费类型">{{ persistRecord.billing.billingType }}</a-descriptions-item>
        <a-descriptions-item label="计费条数">{{ persistRecord.billing.billingRows.toLocaleString() }}</a-descriptions-item>
        <a-descriptions-item label="预估费用">¥ {{ persistRecord.billing.estimatedAmount.toFixed(2) }}</a-descriptions-item>
      </a-descriptions>
      <a-empty v-else description="未找到该 backid 对应的落库记录" />
    </a-drawer>

    <!-- 验证报告抽屉（R88） -->
    <a-drawer v-model:visible="reportVisible" :width="760" title="验证报告" :footer="false">
      <a-descriptions v-if="validationReport" :column="2" bordered size="small">
        <a-descriptions-item label="报告编号">
          <span class="mono">{{ validationReport.reportId }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="关联backid">
          <span class="mono">{{ validationReport.backid }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="验证类型">{{ validationReport.type }}</a-descriptions-item>
        <a-descriptions-item label="生成时间">{{ validationReport.generatedAt }}</a-descriptions-item>
        <a-descriptions-item label="操作人" :span="2">{{ validationReport.operator }}</a-descriptions-item>
      </a-descriptions>
      <a-result v-if="validationReport?.rowCount" :status="validationReport.rowCount.matched ? 'success' : 'warning'" style="margin-top: 16px">
        <template #title>三重行数验证{{ validationReport.rowCount.matched ? '通过' : '未通过' }}</template>
        <template #subtitle>
          入库行数 {{ validationReport.rowCount.loadedRows.toLocaleString() }} ·
          源文件行数 {{ validationReport.rowCount.sourceFileRows.toLocaleString() }} ·
          原样本行数 {{ validationReport.rowCount.sampleFileRows.toLocaleString() }} ·
          差值 {{ validationReport.rowCount.diff }}
        </template>
      </a-result>
      <a-empty v-if="!validationReport" description="未找到该任务对应的验证报告" />
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import { IconRefresh, IconSearch } from '@arco-design/web-vue/es/icon'
import { fetchAsyncTasks, fetchPersistRecord } from '../api/backtrack'
import type { AsyncTask, PersistRecord, ValidationReport } from '../mock/backtrackPersist'

/** 任务类型枚举（R85） */
const taskTypes = ['解析落库', '推进Hive', '行数验证', '一致性校验'] as const

/** 执行状态枚举（R84） */
const taskTypesStatus = ['排队中', '执行中', '成功', '失败', '疑似卡死'] as const

const loading = ref(false)
const tasks = ref<AsyncTask[]>([])

/** 筛选条件 */
const filters = reactive({ taskType: '', status: '', keyword: '' })

/** 分页配置 */
const pagination = reactive({ current: 1, pageSize: 10, total: 0 })

/** 过滤后的任务列表 */
const filteredTasks = computed(() => {
  const kw = filters.keyword.trim()
  return tasks.value.filter((t) => {
    if (filters.taskType && t.taskType !== filters.taskType) return false
    if (filters.status && t.status !== filters.status) return false
    if (kw && !t.fileName.includes(kw) && !t.backid.includes(kw) && !t.taskId.includes(kw)) return false
    return true
  })
})

/** 前端分页数据 */
const pagedTasks = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredTasks.value.slice(start, start + pagination.pageSize)
})

/** 状态统计（R84） */
const statusStats = computed(() =>
  taskTypesStatus.map((status) => ({
    status,
    count: tasks.value.filter((t) => t.status === status).length,
  }))
)

/** 状态标签色 */
const statusColor = (s: string) =>
  ({ 排队中: 'gray', 执行中: 'arcoblue', 成功: 'green', 失败: 'red', 疑似卡死: 'orange' }[s] || 'gray')

/** 任务类型标签色 */
const taskTypeColor = (t: string) =>
  ({ 解析落库: 'purple', 推进Hive: 'cyan', 行数验证: 'blue', 一致性校验: 'gold' }[t] || 'gray')

/** 加载任务列表 */
const loadTasks = async () => {
  loading.value = true
  try {
    tasks.value = await fetchAsyncTasks()
    pagination.total = tasks.value.length
  } catch (e: any) {
    Message.error(e?.message ?? '获取任务列表失败')
  } finally {
    loading.value = false
  }
}

/** 点击状态卡片切换筛选 */
const toggleStatusFilter = (status: string) => {
  filters.status = filters.status === status ? '' : status
  pagination.current = 1
}

/** 重置筛选 */
const resetFilters = () => {
  filters.taskType = ''
  filters.status = ''
  filters.keyword = ''
  pagination.current = 1
}

/** 翻页 */
const onPageChange = (page: number) => {
  pagination.current = page
}

/* ---------- 落库记录抽屉（R88） ---------- */
const recordVisible = ref(false)
const persistRecord = ref<PersistRecord | null>(null)

/** 打开落库记录 */
const openPersistRecord = async (record: AsyncTask) => {
  if (!record.backid) {
    Message.info('该任务未关联 backid，暂无落库记录')
    return
  }
  persistRecord.value = (await fetchPersistRecord(record.backid)) ?? null
  recordVisible.value = true
}

/* ---------- 验证报告抽屉（R88） ---------- */
const reportVisible = ref(false)
const validationReport = ref<ValidationReport | null>(null)

/** 打开验证报告（按任务类型组装行数验证结果） */
const openValidationReport = (record: AsyncTask) => {
  validationReport.value = {
    reportId: `VR${record.taskId.replace('TASK', '')}`,
    backid: record.backid,
    type: record.taskType === '行数验证' ? '三重行数验证' : '一致性校验',
    generatedAt: record.finishTime || record.createTime,
    operator: record.operator,
    rowCount: {
      loadedRows: 96210,
      sourceFileRows: 96210,
      sampleFileRows: 96210,
      matched: true,
      diff: 0,
      mergedRows: 96210,
      requiredFieldPass: true,
    },
    details: [],
  }
  reportVisible.value = true
}

/* ---------- 失败原因（R89） ---------- */
const failVisible = ref(false)
const failTask = ref<AsyncTask | null>(null)

/** 展示失败原因 */
const showFailReason = (record: AsyncTask) => {
  failTask.value = record
  failVisible.value = true
}

/** 重新发起任务（R89：失败任务可重新发起） */
const restartTask = (record: AsyncTask) => {
  Modal.info({
    title: '确认重新发起该任务？',
    content: `任务 ${record.taskId}（${record.taskType}）将重新进入队列排队执行，原失败记录保留。`,
    okText: '确认发起',
    onOk: () => {
      Message.success(`任务 ${record.taskId} 已重新发起，进入排队中`)
    },
  })
}

/** 终止疑似卡死任务（R91：系统不自动重跑，需人工终止） */
const terminateTask = (record: AsyncTask) => {
  Modal.warning({
    title: '确认终止疑似卡死的任务？',
    content: `任务 ${record.taskId} 执行时长已超过阈值 ${record.stuckThresholdMinutes} 分钟。终止后状态置为「失败」，系统不会自动重跑，如需继续请手动重新发起。`,
    okText: '确认终止',
    hideCancel: false,
    onOk: () => {
      Message.success(`任务 ${record.taskId} 已终止，状态置为失败`)
    },
  })
}

/** 文件大小格式化 */
const formatSize = (bytes: number) => {
  if (!bytes) return '0 B'
  const mb = bytes / 1024 / 1024
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`
}

onMounted(loadTasks)
</script>

<style scoped>
.task-list-page {
  padding: 0 16px;
}

.stat-row {
  margin-top: 16px;
}

.stat-card {
  padding: 14px 16px;
  text-align: center;
  background: var(--color-fill-1);
  border: 1px solid var(--color-neutral-2);
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.12s ease;
}

.stat-card:hover,
.stat-card.active {
  border-color: rgb(var(--primary-6));
}

.stat-value {
  font-size: 22px;
  font-weight: 600;
  line-height: 30px;
}

.stat-label {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-3);
}

.list-card {
  margin-top: 16px;
}

.filter-bar {
  margin-bottom: 16px;
}

.mono {
  font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 12px;
}

.dim {
  color: var(--color-text-3);
}

.stuck-tip {
  margin-top: 2px;
  font-size: 12px;
  line-height: 16px;
}

.fail-reason {
  color: rgb(var(--danger-6));
}
</style>
