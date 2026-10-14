<template>
  <div class="batch-import-page">
    <a-page-header title="批量注册" :show-back="true" @back="goBack" />

    <!-- 步骤条 -->
    <a-steps :current="step" class="step-bar">
      <a-step description="下载模板并填写数据">下载模板</a-step>
      <a-step description="上传Excel文件">上传文件</a-step>
      <a-step description="校验数据">数据校验</a-step>
      <a-step description="确认并提交">批量提交</a-step>
    </a-steps>

    <!-- Step 1: 下载模板 -->
    <a-card v-if="step === 1" class="step-card">
      <a-space direction="vertical" fill>
        <a-typography-text type="secondary">请选择指标类型，下载对应的Excel模板，按照模板格式填写数据。</a-typography-text>
        <a-space>
          <a-button type="primary" @click="downloadTemplate('business')">
            <template #icon><IconDownload /></template>
            下载业务核心指标模板
          </a-button>
          <a-button type="primary" @click="downloadTemplate('regulatory')">
            <template #icon><IconDownload /></template>
            下载监管指标模板
          </a-button>
        </a-space>
        <a-alert type="info" :show-icon="true">
          <template #title>模板字段说明</template>
          指标编码、指标名称、指标类型、指标域、归属场景、业务负责人、技术负责人、业务口径、使用场景、计算时效、技术口径、技术口径使用说明、结果表、查询代码、报表路径、版本号、版本说明、版本状态
        </a-alert>
        <a-alert type="warning" :show-icon="true">
          <template #title>注意事项</template>
          <ul style="margin: 0; padding-left: 20px;">
            <li>支持 .xlsx 和 .xls 格式，文件大小不超过10MB</li>
            <li>单次最多处理1000条记录</li>
            <li>指标编码+版本号为唯一记录</li>
            <li>技术负责人必须是系统内有效用户</li>
          </ul>
        </a-alert>
        <a-button type="primary" @click="step = 2">下一步：上传文件</a-button>
      </a-space>
    </a-card>

    <!-- Step 2: 上传文件 -->
    <a-card v-if="step === 2" class="step-card">
      <a-space direction="vertical" fill>
        <a-upload
          :auto-upload="false"
          :limit="1"
          accept=".xlsx,.xls"
          :file-list="fileList"
          @change="handleFileChange"
          draggable
          :custom-request="customRequest"
        />
        <a-space>
          <a-button @click="step = 1">上一步</a-button>
          <a-button type="primary" @click="parseAndValidate" :loading="parsing" :disabled="!fileList.length">
            上传并校验
          </a-button>
        </a-space>
      </a-space>
    </a-card>

    <!-- Step 3: 校验结果 -->
    <a-card v-if="step === 3" class="step-card">
      <a-space direction="vertical" fill>
        <a-row :gutter="16">
          <a-col :span="6">
            <a-statistic title="总记录数" :value="validationResult.totalRows" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="有效数据" :value="validationResult.validRows" :value-style="{ color: '#00b42a' }" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="校验失败" :value="validationResult.invalidRows" :value-style="{ color: validationResult.invalidRows > 0 ? '#f53f3f' : '#00b42a' }" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="文件名" :value="fileList[0]?.name || ''" />
          </a-col>
        </a-row>

        <a-alert v-if="validationResult.invalidRows > 0" type="error" :show-icon="true">
          有 {{ validationResult.invalidRows }} 条数据校验失败，请修正后重新上传。验证失败的行不会被创建，但不影响其他有效行。
        </a-alert>
        <a-alert v-else type="success" :show-icon="true">
          全部 {{ validationResult.validRows }} 条数据校验通过，可以提交。
        </a-alert>

        <!-- 校验结果表格 -->
        <a-table
          :data="validationResult.rows"
          :pagination="{ pageSize: 10 }"
          row-key="rowIndex"
          :scroll="{ x: 1200 }"
        >
          <template #columns>
            <a-table-column title="行号" data-index="rowIndex" :width="80" />
            <a-table-column title="状态" :width="80">
              <template #cell="{ record }">
                <a-tag :color="record.valid ? 'green' : 'red'">{{ record.valid ? '有效' : '失败' }}</a-tag>
              </template>
            </a-table-column>
            <a-table-column title="指标名称" :width="150">
              <template #cell="{ record }">{{ record.data['指标名称'] }}</template>
            </a-table-column>
            <a-table-column title="指标编码" :width="150">
              <template #cell="{ record }">{{ record.data['指标编码'] }}</template>
            </a-table-column>
            <a-table-column title="错误信息" :width="400">
              <template #cell="{ record }">
                <span v-if="record.errors.length === 0" style="color: #00b42a;">无</span>
                <a-space wrap v-else>
                  <a-tag v-for="(err, i) in record.errors" :key="i" color="red" size="small">{{ err }}</a-tag>
                </a-space>
              </template>
            </a-table-column>
          </template>
        </a-table>

        <a-space>
          <a-button @click="step = 2">重新上传</a-button>
          <a-button type="primary" @click="handleBatchSubmit" :disabled="validationResult.validRows === 0">
            批量提交{{ validationResult.validRows }}条有效数据
          </a-button>
        </a-space>
      </a-space>
    </a-card>

    <!-- Step 4: 提交成功 -->
    <a-card v-if="step === 4" class="step-card">
      <a-result status="success" title="批量提交成功">
        <template #subtitle>
          成功创建 {{ submitResult.success }} 条指标，失败 {{ submitResult.failed }} 条
        </template>
        <template #extra>
          <a-space>
            <a-button type="primary" @click="goList">返回指标管理</a-button>
            <a-button @click="reset">继续批量注册</a-button>
          </a-space>
        </template>
      </a-result>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { MetricsCenterStore } from '@/mock-dca/metrics-center/store'
import { BATCH_TEMPLATE_FIELDS } from '@/mock-dca/metrics-center/data'
import type { BatchValidationResult, BatchValidationRow } from '@/mock-dca/metrics-center/types'

const router = useRouter()
const step = ref(1)
const fileList = ref<any[]>([])
const parsing = ref(false)
const validationResult = reactive<BatchValidationResult>({
  totalRows: 0,
  validRows: 0,
  invalidRows: 0,
  rows: [],
})
const submitResult = reactive({ success: 0, failed: 0 })

function downloadTemplate(type: 'business' | 'regulatory') {
  const ws = XLSX.utils.aoa_to_sheet([BATCH_TEMPLATE_FIELDS])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, type === 'business' ? '业务核心指标' : '监管指标')
  const fileName = type === 'business' ? '业务核心指标模板.xlsx' : '监管指标模板.xlsx'
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fileName)
  Message.success('模板下载成功')
}

function customRequest() {
  // 不自动上传
}

function handleFileChange(fileItemList: any) {
  fileList.value = fileItemList
}

function parseAndValidate() {
  if (!fileList.value.length) {
    Message.warning('请先选择文件')
    return
  }

  const file = fileList.value[0].file
  if (file.size > 10 * 1024 * 1024) {
    Message.error('文件大小超过10MB，请拆分后上传')
    return
  }

  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext !== 'xlsx' && ext !== 'xls') {
    Message.error('仅支持.xlsx和.xls格式')
    return
  }

  parsing.value = true
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

      if (rows.length > 1000) {
        Message.error('单次最多处理1000条记录，请拆分后上传')
        parsing.value = false
        return
      }

      const result = MetricsCenterStore.validateBatch(rows)
      Object.assign(validationResult, result)
      step.value = 3
      parsing.value = false
    } catch (err) {
      Message.error('文件解析失败，请确认使用标准模板')
      parsing.value = false
    }
  }
  reader.onerror = () => {
    Message.error('文件读取失败')
    parsing.value = false
  }
  reader.readAsArrayBuffer(file)
}

function handleBatchSubmit() {
  const validRows = validationResult.rows.filter(r => r.valid).map(r => r.data)
  const result = MetricsCenterStore.batchCreate(validRows)
  submitResult.success = result.success
  submitResult.failed = result.failed
  step.value = 4
}

function reset() {
  step.value = 1
  fileList.value = []
  validationResult.rows = []
  validationResult.totalRows = 0
  validationResult.validRows = 0
  validationResult.invalidRows = 0
}

function goBack() {
  router.push({ name: 'metrics-center' })
}

function goList() {
  router.push({ name: 'metrics-center' })
}
</script>

<style lang="scss" scoped>
.batch-import-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;

  .step-bar {
    margin-bottom: 24px;
  }

  .step-card {
    margin-bottom: 16px;
  }
}
</style>
