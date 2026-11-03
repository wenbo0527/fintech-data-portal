<template>
  <div class="field-mapping-panel">
    <a-alert type="info" class="panel-tip">
      上传本产品的接口字段映射表 CSV，只需维护「接口字段 → 标准落库字段」的对应关系。
      标准字段说明由落库底表的字段注释自动带出，无需手填；撞不上底表列的接口字段选「非标准化字段」，落库时原样透传到 extraParam 列。
    </a-alert>

    <a-descriptions :column="3" size="medium" bordered class="meta-desc">
      <a-descriptions-item label="产品编码">{{ productCode || '—' }}</a-descriptions-item>
      <a-descriptions-item label="落库目标表">{{ targetTable || '—' }}</a-descriptions-item>
      <a-descriptions-item label="映射行">{{ validation.total }}</a-descriptions-item>
      <a-descriptions-item label="待匹配">
        <a-tag v-if="validation.pendingFields.length" color="orangered" size="small">{{ validation.pendingFields.length }} 项</a-tag>
        <span v-else>0 项</span>
      </a-descriptions-item>
      <a-descriptions-item label="映射表文件">{{ sourceFileName || '—' }}</a-descriptions-item>
      <a-descriptions-item label="最近保存">{{ savedAtText }}</a-descriptions-item>
    </a-descriptions>

    <div class="toolbar">
      <a-space wrap>
        <a-upload :show-file-list="false" accept=".csv" :auto-upload="false" @before-upload="onUpload">
          <template #upload-button>
            <a-button type="primary">
              <template #icon><IconUpload /></template>
              上传映射表 CSV
            </a-button>
          </template>
        </a-upload>
        <a-button type="outline" @click="downloadTemplate">
          <template #icon><IconDownload /></template>
          下载模板
        </a-button>
        <a-button type="outline" @click="generateFromArchive">按档案接口出参生成</a-button>
        <a-button type="outline" :disabled="!rows.length" @click="applyAutoCollision()">重新自动匹配</a-button>
        <a-button type="outline" @click="addRow">
          <template #icon><IconPlus /></template>
          新增一行
        </a-button>
      </a-space>
      <a-space class="toolbar-right">
        <a-tag v-if="!savedAt" color="gray">尚未保存过</a-tag>
        <a-tag v-else-if="dirty" color="orange">有未保存修改</a-tag>
        <a-tag v-else color="green">已与保存版本一致</a-tag>
        <a-button :disabled="!dirty" @click="discard">放弃修改</a-button>
        <a-button type="primary" :loading="saving" @click="save">保存映射</a-button>
      </a-space>
    </div>

    <a-alert v-if="validation.errors.length" type="error" class="check-alert">
      <template #title>映射校验未通过（{{ validation.errors.length }} 项），保存前请处理</template>
      <div v-for="(e, i) in validation.errors" :key="i">· {{ e }}</div>
    </a-alert>
    <a-alert v-else-if="validation.warnings.length" type="warning" class="check-alert">
      <template #title>映射可保存，但存在提醒（{{ validation.warnings.length }} 项）</template>
      <div v-for="(w, i) in validation.warnings" :key="i">· {{ w }}</div>
    </a-alert>
    <a-alert v-else-if="rows.length" type="success" class="check-alert">
      校验通过：{{ validation.total }} 行接口字段均有落库结论，落库服务可写入 <strong>{{ targetTable }}</strong>。
    </a-alert>

    <a-table :data="rows" :loading="loading" :pagination="false" size="medium" class="mapping-table" :scroll="{ x: 1060 }">
      <template #columns>
        <a-table-column title="接口字段名" :width="240">
          <template #cell="{ record }">
            <a-input v-model="record.apiField" size="small" placeholder="如 id_no" />
          </template>
        </a-table-column>
        <a-table-column title="标准落库字段" :width="300">
          <template #cell="{ record }">
            <a-select
              :model-value="record.stdField"
              size="small"
              :options="stdFieldOptions"
              :filter-option="filterStdOption"
              placeholder="字段名或中文含义搜索"
              allow-search
              allow-clear
              @change="(v: string) => setStdField(record, v)"
            />
          </template>
        </a-table-column>
        <a-table-column title="标准字段说明（落库底表注释）" :width="460" ellipsis tooltip>
          <template #cell="{ record }">
            <span :class="['std-comment', { 'std-comment--pending': !record.stdField }]">{{ stdFieldComment(record.stdField) }}</span>
          </template>
        </a-table-column>
        <a-table-column title="操作" :width="60" align="center">
          <template #cell="{ rowIndex }">
            <a-button type="text" status="danger" size="small" @click="removeRow(rowIndex)">删除</a-button>
          </template>
        </a-table-column>
      </template>
      <template #empty>
        <a-empty description="暂无映射行，请上传映射表 CSV 或按档案接口出参生成" />
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { IconUpload, IconDownload, IconPlus } from '@arco-design/web-vue/es/icon'
import { useInterfaceFieldMapping } from '../composables/useInterfaceFieldMapping'
import DateUtils from '@/utils/dateUtils'

/**
 * 分产品「API 接口字段 ↔ 标准落库字段」映射面板
 * 挂在档案详情页「落库字段映射」Tab 下，只维护本产品的一份映射关系。
 * 表格三列：接口字段名 / 标准落库字段 / 标准字段说明（后者由落库底表 comment 自动带出）。
 */
const props = defineProps<{
  productCode: string
  productName: string
  supplier: string
  targetTable: string
}>()

const productCode = ref(props.productCode)
const productName = ref(props.productName)
const supplier = ref(props.supplier)
const targetTable = ref(props.targetTable)
watch(() => props.productCode, (v) => { productCode.value = v })
watch(() => props.productName, (v) => { productName.value = v })
watch(() => props.supplier, (v) => { supplier.value = v })
watch(() => props.targetTable, (v) => { targetTable.value = v })

const {
  loading,
  saving,
  rows,
  stdFieldOptions,
  filterStdOption,
  stdFieldComment,
  sourceFileName,
  savedAt,
  validation,
  dirty,
  load,
  downloadTemplate,
  onUpload,
  generateFromArchive,
  applyAutoCollision,
  addRow,
  removeRow,
  setStdField,
  discard,
  save,
} = useInterfaceFieldMapping({ productCode, productName, supplier, targetTable })

const savedAtText = computed(() => {
  if (!savedAt.value) {return '未保存'}
  try { return DateUtils.formatDateTime(savedAt.value) } catch { return savedAt.value }
})

onMounted(load)
</script>

<style scoped>
.field-mapping-panel { padding: 4px 0; }
.panel-tip { margin-bottom: 16px; }
.meta-desc { margin-bottom: 16px; }
.meta-desc :deep(.arco-descriptions-value) { font-weight: 500; }
.toolbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.toolbar-right { margin-left: auto; align-items: center; }
.check-alert { margin-bottom: 12px; }
.std-comment { color: var(--color-text-2); }
.std-comment--pending { color: var(--color-text-4); }
:deep(.arco-table-cell) { vertical-align: middle; }
/* 收紧单元格左右内边距，保证下拉与说明文本不被裁切 */
.mapping-table :deep(.arco-table-cell) { padding-left: 8px; padding-right: 8px; }
</style>
