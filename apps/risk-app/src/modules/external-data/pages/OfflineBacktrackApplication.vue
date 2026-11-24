<template>
  <div class="offline-backtrack">
    <!-- 流程定位条：参照外数回溯落库申请的步骤头部样式 -->
    <div class="step-header">
      <div class="step-header-main">
        <span class="step-header-index">{{ currentStep + 1 }} / {{ stepsList.length }}</span>
        <span class="step-header-title">{{ stepsList[currentStep].title }}</span>
        <div class="step-header-dots">
          <span
            v-for="(s, i) in stepsList"
            :key="s.title"
            class="step-header-dot"
            :class="{ 'is-done': i < currentStep, 'is-current': i === currentStep }"
            :title="`${i + 1} ${s.title}`"
          />
        </div>
      </div>
      <div class="step-sections">
        <span class="step-sections-label">当前步骤</span>
        <a-tag v-for="s in stepsList[currentStep].sections" :key="s" size="small" color="arcoblue">{{ s }}</a-tag>
      </div>
    </div>

    <a-card class="apply-card">
      <div class="step-content">
        <!-- ============ 步骤1：持牌机构与样本、申请说明 ============ -->
        <div v-show="currentStep === 0">
          <a-divider orientation="left" style="margin-top: 0">1.1 选择持牌机构</a-divider>
          <a-form :model="formModel" layout="vertical">
            <a-row :gutter="16">
              <a-col :span="10">
                <a-form-item label="持牌机构" required help="仅展示合作机构管理中状态为「启用」的持牌机构">
                  <a-select v-model="form.agencyId" placeholder="请选择持牌机构" @change="onAgencyChange">
                    <a-option v-for="a in agencies" :key="a.id" :value="a.id">
                      {{ a.agencyName }}（{{ a.agencyCode }}）
                    </a-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="14">
                <a-form-item label="机构资质信息">
                  <a-descriptions :column="1" size="small" bordered v-if="selectedAgency">
                    <a-descriptions-item label="社会统一征信编号">
                      <span class="mono">{{ selectedAgency.licenseNo }}</span>
                    </a-descriptions-item>
                  </a-descriptions>
                  <span v-else class="table-tip">请先选择持牌机构</span>
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>

          <a-divider orientation="left">1.2 选择样本</a-divider>
          <a-form :model="formModel" layout="vertical">
            <a-form-item label="样本来源" required>
              <a-radio-group v-model="form.sampleMode" type="button" @change="onSampleModeChange">
                <a-radio value="library">样本库（选库选表）</a-radio>
                <a-radio value="upload">上传 CSV 文件</a-radio>
              </a-radio-group>
            </a-form-item>
            <a-alert v-if="form.sampleMode === 'library'" type="info">
              从固定外数库的样本表中选取，进入下一步时自动读取表结构，仅展示字段数与行数概要。
            </a-alert>
            <a-alert v-else type="info">
              上传本地 CSV 样本文件（UTF-8，单文件上限 100 万行），进入下一步时自动解析表头与数据行。
            </a-alert>
          </a-form>

          <a-divider orientation="left">1.3 申请说明</a-divider>
          <a-form :model="formModel" layout="vertical">
            <a-form-item label="申请说明" required>
              <a-textarea
                v-model="form.description"
                placeholder="请描述本次离线回溯的业务背景、样本范围与用途"
                :rows="4"
                :max-length="500"
                show-word-limit
              />
            </a-form-item>
          </a-form>
        </div>

        <!-- ============ 步骤2：样本获取（样本库选表 / CSV 上传解析） ============ -->
        <div v-show="currentStep === 1">
          <template v-if="form.sampleMode === 'library'">
            <a-divider orientation="left" style="margin-top: 0">2.1 选择样本库（库 → 表）</a-divider>
            <a-form :model="formModel" layout="vertical">
              <a-row :gutter="16">
                <a-col :span="8">
                  <a-form-item label="样本库" required>
                    <a-select v-model="form.database" placeholder="请选择样本库" @change="onDatabaseChange">
                      <a-option v-for="db in databaseOptions" :key="db" :value="db">{{ db }}</a-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :span="10">
                  <a-form-item label="样本表" required>
                    <a-select
                      v-model="form.table"
                      :placeholder="form.database ? '请选择样本表' : '请先选择样本库'"
                      :disabled="!form.database"
                      allow-search
                      @change="loadLibrarySample"
                    >
                      <a-option v-for="t in tableOptions" :key="t.fullName" :value="t.fullName">
                        {{ t.table }}（{{ t.description }}）
                      </a-option>
                    </a-select>
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>
            <a-alert v-if="!tableOptions.length && form.database" type="warning">
              该库下暂无可用样本表，请更换样本库或改用上传 CSV 文件。
            </a-alert>
          </template>

          <template v-else>
            <a-divider orientation="left" style="margin-top: 0">2.1 上传 CSV 样本文件</a-divider>
            <a-upload
              draggable
              :auto-upload="false"
              :limit="1"
              accept=".csv"
              :file-list="uploadFileList"
              @change="onUploadChange"
              @remove="onUploadRemove"
            >
              <div class="upload-drop">
                <p class="arco-upload-drag-icon"><icon-upload /></p>
                <div style="margin-top: 8px; font-weight: 500">点击或拖拽 CSV 文件到此处上传</div>
                <div class="table-tip" style="margin-top: 4px">仅支持 UTF-8 编码 CSV 格式</div>
              </div>
            </a-upload>
          </template>

          <!-- 2.2 样本概要：只展示字段数与行数，不提供明细数据预览 -->
          <template v-if="sampleColumns.length">
            <a-divider orientation="left">2.2 样本概要</a-divider>
            <a-descriptions :column="3" size="small" bordered>
              <a-descriptions-item label="样本来源">{{ sampleSourceText }}</a-descriptions-item>
              <a-descriptions-item label="数据行数">{{ sampleRows.length.toLocaleString() }}</a-descriptions-item>
              <a-descriptions-item label="字段数">{{ sampleColumns.length }}</a-descriptions-item>
            </a-descriptions>
            <div class="table-tip">样本已读取成功，本页不展示明细数据；确认可后进入下一步绑定参数列。</div>
          </template>
          <a-empty v-else :description="form.sampleMode === 'library' ? '请选择样本库与样本表，选择后自动读取样本内容' : '请先上传 CSV 样本文件，上传后自动解析样本内容'" />
        </div>

        <!-- ============ 步骤3：外部数据参数列绑定与校验 ============ -->
        <div v-show="currentStep === 2">
          <a-divider orientation="left" style="margin-top: 0">3.1 选择外部数据（可多选）</a-divider>
          <a-form :model="formModel" layout="vertical">
            <a-form-item label="外部数据" required help="一个样本可同时回溯多个外部数据；参数列绑定取全部所选产品必填入参的并集">
              <a-select
                v-model="form.externalData"
                multiple
                allow-search
                :max-tag-count="4"
                placeholder="可搜索并选择多个外部数据"
                @change="onExternalDataChange"
              >
                <a-option v-for="e in externalDataOptions" :key="e.name" :value="e.name">
                  {{ e.name }}<template v-if="e.interfaceId">｜接口号 {{ e.interfaceId }}</template>
                </a-option>
              </a-select>
            </a-form-item>
          </a-form>
          <template v-if="form.externalData.length">
            <div v-for="e in selectedProducts" :key="e.name" class="product-req-row">
              <a-tag color="arcoblue" size="small">{{ e.name }}</a-tag>
              <span class="table-tip">出数机构 {{ e.agency }} · 必填入参：</span>
              <a-tag v-for="k in e.requiredParams" :key="k" size="small">{{ paramLabel(k) }}</a-tag>
            </div>
          </template>

          <a-divider orientation="left">3.2 绑定参数列</a-divider>
          <a-alert type="info" style="margin-bottom: 12px">
            <template v-if="activeDefs.length">
              将样本列与外部数据查询入参逐项绑定，多个外部数据共用同一套参数绑定；本次需绑定
              <b>{{ activeDefs.map((d) => d.label).join(' / ') }}</b>，全部绑定并通过格式校验后方可提交。
            </template>
            <template v-else>请先在 3.1 选择外部数据（可多选），绑定项将按所选产品的必填入参自动生成。</template>
          </a-alert>
          <a-table v-if="activeDefs.length" :data="bindingRows" :pagination="false" size="small" row-key="key">
            <template #columns>
              <a-table-column title="参数" data-index="label" :width="140" />
              <a-table-column title="格式要求" :width="240">
                <template #cell="{ record }">
                  <span class="mono">{{ record.rule }}</span>
                </template>
              </a-table-column>
              <a-table-column title="绑定样本列" :width="260">
                <template #cell="{ record }">
                  <a-select
                    v-model="bindings[record.key]"
                    placeholder="选择样本列"
                    allow-search
                    allow-clear
                    size="small"
                    @change="onBindingChange"
                  >
                    <a-option v-for="c in sampleColumns" :key="c" :value="c">{{ c }}</a-option>
                  </a-select>
                </template>
              </a-table-column>
              <a-table-column title="校验结果">
                <template #cell="{ record }">
                  <template v-if="validation === 'success' || validation === 'error'">
                    <a-tag v-if="results[record.key].ok && !results[record.key].errors.length" color="green" size="small">
                      通过（{{ results[record.key].hitCount }} / {{ sampleRows.length }} 行格式命中）
                    </a-tag>
                    <a-tag v-else-if="results[record.key].ok" color="orange" size="small">
                      通过（{{ results[record.key].errors.join('；') }}）
                    </a-tag>
                    <span v-else class="binding-error">{{ results[record.key].errors.join('；') }}</span>
                  </template>
                  <span v-else class="table-tip">待校验</span>
                </template>
              </a-table-column>
            </template>
          </a-table>

          <a-divider orientation="left">3.3 样本校验</a-divider>
          <a-space style="margin-bottom: 12px">
            <a-button type="outline" :loading="validating" @click="runValidation">
              <template #icon><icon-safe /></template>
              执行参数列校验
            </a-button>
            <a-tag v-if="validation === 'success'" color="green" size="medium">全部参数列校验通过</a-tag>
            <a-tag v-else-if="validation === 'error'" color="red" size="medium">
              {{ resultsSummary.failCount }} / {{ activeDefs.length }} 项未通过
            </a-tag>
          </a-space>
          <a-descriptions v-if="resultsSummary.detailRows.length" :column="1" size="small" bordered>
            <a-descriptions-item v-for="d in resultsSummary.detailRows" :key="d.label" :label="d.label">
              <a-space wrap :size="4">
                <a-tag v-if="d.ok" color="orange" size="small">{{ d.hit }} / {{ d.total }} 行通过</a-tag>
                <a-tag v-else color="red" size="small">{{ d.errors.join('；') }}</a-tag>
                <span v-for="(e, i) in d.samples.slice(0, 3)" :key="i" class="mono table-tip">失败行：第 {{ e }} 行{{ i === Math.min(d.samples.length, 3) - 1 && d.samples.length > 3 ? ' 等' : '' }}</span>
              </a-space>
            </a-descriptions-item>
          </a-descriptions>
          <div class="table-tip">
            校验口径：身份证号按 18 位（末位允许 X）逐行校验，手机号按 1 开头 3~9 段 11 位逐行校验，姓名按中文（含「·」）或英文名逐行校验；
            空值与格式不符行会计入失败样例，绑定列与其他参数重复时整体拦截；多个外部数据必填入参不一致时取并集统一校验。
          </div>
        </div>
      </div>

      <!-- 操作区 -->
      <div class="step-footer">
        <a-button v-if="currentStep > 0" @click="prevStep">上一步</a-button>
        <span v-else />
        <a-space>
          <a-button @click="goBack">取消申请</a-button>
          <a-button v-if="currentStep < stepsList.length - 1" type="primary" @click="nextStep">下一步</a-button>
          <a-button
            v-else
            type="primary"
            :loading="submitting"
            :disabled="validation !== 'success'"
            @click="submitApplication"
          >
            <template #icon><icon-check-circle /></template>
            提交回溯申请
          </a-button>
        </a-space>
      </div>
    </a-card>

    <!-- 提交结果 -->
    <a-modal v-model:visible="successVisible" title="申请已提交" :footer="false">
      <a-result status="success" title="外数离线回溯申请已提交，状态为「审批中」">
        <template #subtitle>
          样本 {{ sampleSourceText }} · 数据行数 {{ sampleRows.length.toLocaleString() }} ·
          外部数据 {{ form.externalData.length }} 个 · 参数列绑定 {{ boundCount }} / {{ activeDefs.length }}，校验通过。审批与执行进度可在「服务任务列表」查看。
        </template>
        <template #extra>
          <a-space>
            <a-button @click="goBack">返回服务场景</a-button>
            <a-button type="primary" @click="goTaskList">查看服务任务列表</a-button>
          </a-space>
        </template>
      </a-result>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import type { UploadFile } from '@arco-design/web-vue'
import { IconUpload, IconSafe, IconCheckCircle } from '@arco-design/web-vue/es/icon'
import { fetchEnabledAgencies } from '../api/creditAgency'
import type { CreditAgency } from '../mock/creditAgencies'
import { listOnlineSampleTables, listHiveTableColumns } from '../mock/hiveTables'
import type { HiveTableItem } from '../mock/hiveTables'
import { externalDataCatalogMock, unionRequiredParams } from '../mock/externalDataCatalog'
import type { ParamKey } from '../mock/externalDataCatalog'
import { useExternalDataStore } from '@/modules/external-data/stores'

const router = useRouter()
const store = useExternalDataStore()
const currentStep = ref(0)

/** 表单容器模型（Arco Form 要求 model prop，本页表单项不走 field 校验，仅用于布局） */
const formModel = reactive<Record<string, unknown>>({})

const stepsList = [
  { title: '机构与样本', sections: ['1.1 选择持牌机构', '1.2 选择样本', '1.3 申请说明'] },
  { title: '样本获取', sections: ['2.1 样本库选表 / CSV 上传', '2.2 样本概要（字段数 / 行数）'] },
  { title: '参数列绑定与提交', sections: ['3.1 选择外部数据（可多选）', '3.2 绑定参数列', '3.3 样本校验'] },
]

/* ---------- 步骤1：持牌机构与样本 ---------- */
const agencies = ref<CreditAgency[]>([])
const form = reactive({
  agencyId: '',
  sampleMode: 'library' as 'library' | 'upload',
  description: '',
  database: '',
  table: '',
  externalData: [] as string[],
})

const selectedAgency = computed(() => agencies.value.find((a) => a.id === form.agencyId) || null)

const loadAgencies = async () => {
  agencies.value = await fetchEnabledAgencies()
}

/** 切换机构：与回溯落库口径一致，机构仅用于出数主体登记，不影响样本来源 */
const onAgencyChange = () => {
  resetSample()
}

/* ---------- 步骤2：样本获取 ---------- */
const sampleTables = ref<HiveTableItem[]>([])
const uploadFileList = ref<UploadFile[]>([])
const sampleColumns = ref<string[]>([])
const sampleRows = ref<Record<string, string>[]>([])

/** 样本库列表（库级去重，来自固定外数库的线上样本表） */
const databaseOptions = computed(() => Array.from(new Set(sampleTables.value.map((t) => t.database))))
/** 当前库下可选样本表 */
const tableOptions = computed(() => sampleTables.value.filter((t) => t.database === form.database))

const loadSampleTables = async () => {
  sampleTables.value = await listOnlineSampleTables()
  if (!form.database && databaseOptions.value.length) form.database = databaseOptions.value[0]
}

const onDatabaseChange = () => {
  form.table = ''
  resetSample()
}

/** 清空已读取样本与绑定结果（样本来源变化后必须重新校验） */
const resetSample = () => {
  sampleColumns.value = []
  sampleRows.value = []
  validation.value = 'idle'
}

/* ---------- 样本库读取（mock：按表列清单生成确定性样例数据） ---------- */
/** 固定种子伪随机，保证同一张表两次读取结果一致 */
const makeRng = (seedStr: string) => {
  let h = 2166136261
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

const GEN_NAMES = ['张伟', '王芳', '李娜', '刘洋', '陈静', '赵磊', '孙七', '周涛', '吴霞', '郑强']
const GEN_PROV = ['110', '310', '440', '510', '330', '420', '320', '610']

/** 生成身份证号：6 位地区 + 8 位出生日期 + 3 位顺序 = 17 位本体，校验位按 GB 11643 权重表计算 */
const genIdNo = (rng: () => number) => {
  const d = () => String(Math.floor(rng() * 10))
  const region = GEN_PROV[Math.floor(rng() * GEN_PROV.length)] + d() + d() + d()
  const year = String(1965 + Math.floor(rng() * 45))
  const month = String(1 + Math.floor(rng() * 12)).padStart(2, '0')
  const day = String(1 + Math.floor(rng() * 28)).padStart(2, '0')
  const seq = d() + d() + d()
  const body = `${region}${year}${month}${day}${seq}`
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  const checkMap = '10X98765432'
  const sum = body.split('').reduce((acc, ch, i) => acc + Number(ch) * weights[i], 0)
  return `${body}${checkMap[sum % 11]}`
}

const genMobile = (rng: () => number) => {
  const seg = ['3', '5', '7', '8', '9'][Math.floor(rng() * 5)]
  let rest = ''
  for (let i = 0; i < 9; i++) rest += String(Math.floor(rng() * 10))
  return `1${seg}${rest}`
}

/** 库模式读取：列清单来自表结构 mock，另补 cust_name（样本库存量姓名列）与 sample_date */
const loadLibrarySample = () => {
  resetSample()
  if (!form.table) return
  const meta = sampleTables.value.find((t) => t.fullName === form.table)
  if (!meta) return
  const cols = Array.from(new Set(['cust_name', ...listHiveTableColumns(meta.fullName)]))
  const rng = makeRng(meta.fullName)
  const rowCount = 50
  const rows: Record<string, string>[] = []
  for (let r = 0; r < rowCount; r++) {
    const row: Record<string, string> = { __rowNo: String(r + 1) }
    for (const c of cols) {
      if (c === 'cust_name') row[c] = GEN_NAMES[Math.floor(rng() * GEN_NAMES.length)]
      else if (c === 'cert_no') row[c] = genIdNo(rng)
      else if (c === 'mobile') row[c] = genMobile(rng)
      else if (c === 'create_time' || c === 'sample_date') row[c] = `2026-0${1 + Math.floor(rng() * 9)}-1${Math.floor(rng() * 9)}`
      else if (c === 'extraParam') row[c] = '{}'
      else if (c === 'backid') row[c] = `BACK-2026-${String(1000 + Math.floor(rng() * 8999))}`
      else if (c === 'source_product') row[c] = '外数回溯样本库'
      else if (c === 'interface_id') row[c] = `IF-0${Math.floor(rng() * 20)}`
      else if (c === 'load_time') row[c] = `2026-10-0${1 + Math.floor(rng() * 9)} 02:10:00`
      else row[c] = String(Math.floor(rng() * 9999))
    }
    rows.push(row)
  }
  sampleColumns.value = cols
  sampleRows.value = rows
  autoBind()
  Message.success(`已读取样本 ${meta.fullName}，${cols.length} 列、${rowCount} 行`)
}

/* ---------- CSV 上传解析 ---------- */
/** 拆一行 CSV（支持双引号包裹与转义 ""） */
const splitCsvLine = (line: string): string[] => {
  const out: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuote) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') inQuote = false
      else cur += ch
    } else if (ch === '"') inQuote = true
    else if (ch === ',') { out.push(cur.trim()); cur = '' }
    else cur += ch
  }
  out.push(cur.trim())
  return out
}

const parseCsvText = (text: string): { columns: string[]; rows: Record<string, string>[]; skipped: number } => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length)
  if (!lines.length) return { columns: [], rows: [], skipped: 0 }
  const columns = splitCsvLine(lines[0]).filter((c) => c)
  const rows: Record<string, string>[] = []
  let skipped = 0
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i])
    if (cells.length !== columns.length) { skipped++; continue }
    const row: Record<string, string> = { __rowNo: String(rows.length + 1) }
    columns.forEach((c, idx) => { row[c] = cells[idx] })
    rows.push(row)
  }
  return { columns, rows, skipped }
}

const onUploadChange = (fileList: UploadFile[]) => {
  uploadFileList.value = fileList
  resetSample()
  const file = fileList[0]?.file
  if (!file) return
  if (!/\.csv$/i.test(file.name)) {
    Message.error('仅支持 CSV 格式样本文件')
    uploadFileList.value = []
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    const { columns, rows, skipped } = parseCsvText(String(reader.result || '').replace(/^\uFEFF/, ''))
    if (!columns.length) {
      Message.error('未能解析出表头，请确认首行为列名')
      return
    }
    if (!rows.length) {
      Message.error('文件无有效数据行（列数与表头不一致的行已跳过）')
      return
    }
    sampleColumns.value = columns
    sampleRows.value = rows
    autoBind()
    let tip = `解析成功：${columns.length} 列、${rows.length} 行`
    if (skipped) tip += `，${skipped} 行与表头列数不符已跳过`
    Message.success(tip)
  }
  reader.onerror = () => Message.error('文件读取失败，请确认文件未被占用')
  reader.readAsText(file, 'UTF-8')
}

const onUploadRemove = () => {
  uploadFileList.value = []
  resetSample()
}

const onSampleModeChange = () => {
  resetSample()
  uploadFileList.value = []
  form.table = ''
}

const sampleSourceText = computed(() =>
  form.sampleMode === 'library' ? form.table || '—' : uploadFileList.value[0]?.name || '—'
)

/* ---------- 步骤3：外部数据（多选）与参数列绑定 ---------- */
/** 外部数据候选目录（含接口号与必填入参，见 mock/externalDataCatalog.ts） */
const externalDataOptions = externalDataCatalogMock

/** 已选外部数据产品明细 */
const selectedProducts = computed(() =>
  externalDataOptions.filter((e) => form.externalData.includes(e.name))
)

const paramLabel = (k: ParamKey) => PARAM_LABELS[k]
const PARAM_LABELS: Record<ParamKey, string> = { name: '姓名', mobile: '手机号', certNo: '身份证号' }

/** 参数列候选全集：姓名 / 手机号 / 身份证号，按所选产品必填入参并集激活 */
interface ParamDef { key: ParamKey; label: string; rule: string; re: RegExp }
const PARAM_DEFS: ParamDef[] = [
  { key: 'name', label: '姓名', rule: '中文（含·）或英文名', re: /^([\u4e00-\u9fa5]{2,}(?:·[\u4e00-\u9fa5]{2,})*)|([A-Za-z]+(?:\s+[A-Za-z.]+)*)$/ },
  { key: 'mobile', label: '手机号', rule: '1[3-9] 开头 11 位数字', re: /^1[3-9]\d{9}$/ },
  { key: 'certNo', label: '身份证号', rule: '18 位（末位允许 X）', re: /^\d{17}[\dXx]$/ },
]

/** 当前生效的参数列（所选外部数据必填入参的并集） */
const activeDefs = computed(() => {
  const keys = unionRequiredParams(form.externalData)
  return PARAM_DEFS.filter((d) => keys.includes(d.key as ParamKey))
})

const bindingRows = computed(() => activeDefs.value.map((d) => ({ key: d.key, label: d.label, rule: d.rule })))
const bindings = reactive<Record<string, string>>({ name: '', mobile: '', certNo: '' })

/** 按列名启发式自动预绑定，人工可改 */
const autoBind = () => {
  const find = (pats: RegExp[]) => sampleColumns.value.find((c) => pats.some((p) => p.test(c))) || ''
  bindings.name = find([/^cust_name$/i, /^name$/i, /姓名/])
  bindings.mobile = find([/^mobile$/i, /(^|_)phone($|_)/i, /手机/])
  bindings.certNo = find([/^cert_no$/i, /^id_?no$/i, /^idcard$/i, /身份证/])
}

const boundCount = computed(() => activeDefs.value.filter((d) => bindings[d.key]).length)

/* ---------- 校验 ---------- */
type ValidationState = 'idle' | 'processing' | 'success' | 'error'
const validation = ref<ValidationState>('idle')
const validating = ref(false)

interface ParamResult { ok: boolean; errors: string[]; hitCount: number; samples: string[] }
const emptyResult = (): ParamResult => ({ ok: false, errors: [], hitCount: 0, samples: [] })
/** samples 只记失败行号不记字段值，避免页面回显样本明细 */
const results = reactive<Record<string, ParamResult>>({ name: emptyResult(), mobile: emptyResult(), certNo: emptyResult() })

/** 任一绑定变更即作废上次校验结果 */
const onBindingChange = () => {
  validation.value = 'idle'
}

/** 外部数据多选变更：作废上次校验，并重算激活项的预绑定 */
const onExternalDataChange = () => {
  validation.value = 'idle'
  for (const d of activeDefs.value) {
    if (!bindings[d.key]) autoBindOne(d.key)
  }
}

/** 单项启发式预绑定（多选场景下只补空不覆盖人工选择） */
const autoBindOne = (key: ParamKey) => {
  const pats: Record<ParamKey, RegExp[]> = {
    name: [/^cust_name$/i, /^name$/i, /姓名/],
    mobile: [/^mobile$/i, /(^|_)phone($|_)/i, /手机/],
    certNo: [/^cert_no$/i, /^id_?no$/i, /^idcard$/i, /身份证/],
  }
  bindings[key] = sampleColumns.value.find((c) => pats[key].some((p) => p.test(c))) || ''
}

/** 激活项集合变化（如新选了一个需要姓名的产品）时重算空绑定并作废校验结果 */
watch(activeDefs, () => {
  validation.value = 'idle'
  for (const d of activeDefs.value) {
    if (!bindings[d.key]) autoBindOne(d.key)
  }
})

const validateOne = (def: ParamDef): ParamResult => {
  const r = emptyResult()
  const col = bindings[def.key]
  if (!col) {
    r.errors.push('未绑定样本列')
    return r
  }
  const dup = activeDefs.value.find((d) => d.key !== def.key && bindings[d.key] === col)
  if (dup) {
    r.errors.push(`与「${dup.label}」绑定同一列，不允许重复`)
    return r
  }
  if (!sampleColumns.value.includes(col)) {
    r.errors.push('该列不在样本中')
    return r
  }
  let hit = 0
  const badRows: string[] = []
  let empty = 0
  for (const row of sampleRows.value) {
    const v = (row[col] ?? '').trim()
    if (!v) { empty++; continue }
    if (def.re.test(v)) hit++
    else if (badRows.length < 5) badRows.push(row.__rowNo)
  }
  const total = sampleRows.value.length
  if (empty === total) {
    r.errors.push('该列全部为空值')
    return r
  }
  if (hit === 0) {
    r.errors.push(`无一行符合「${def.rule}」，疑似绑错列`)
    r.samples = badRows
    return r
  }
  if (badRows.length) {
    r.errors.push(`${badRows.length} 行格式不符`)
    r.samples = badRows
  }
  if (empty) r.errors.push(`${empty} 行为空值`)
  r.hitCount = hit
  // 口径：逐行校验，格式不符/空值行给出样例；命中行占比不足 95% 视为未通过
  r.ok = hit / total >= 0.95
  if (!r.ok && !r.errors.length) r.errors.push(`格式命中率 ${Math.round((hit / total) * 100)}% 低于 95%`)
  return r
}

const runValidation = async () => {
  if (!sampleRows.value.length) {
    Message.warning('请先完成样本获取')
    return
  }
  if (!activeDefs.value.length) {
    Message.warning('请先选择外部数据')
    return
  }
  validating.value = true
  validation.value = 'processing'
  await new Promise((r) => setTimeout(r, 600))
  for (const def of activeDefs.value) results[def.key] = validateOne(def)
  validating.value = false
  const fail = activeDefs.value.filter((d) => !results[d.key].ok).length
  validation.value = fail ? 'error' : 'success'
  if (fail) Message.warning(`${fail} 项参数列校验未通过，请修正后重新校验`)
  else Message.success(`${activeDefs.value.map((d) => d.label).join(' / ')} 全部校验通过`)
}

const resultsSummary = computed(() => {
  const list = activeDefs.value.map((d) => ({
    label: d.label,
    ok: results[d.key].ok,
    hit: results[d.key].hitCount,
    total: sampleRows.value.length,
    errors: results[d.key].errors,
    samples: results[d.key].samples,
  }))
  // 明细仅在校验后展示：未通过或有告警的行展开，全部通过时收口为绿色标签
  return {
    failCount: list.filter((x) => !x.ok).length,
    detailRows: list.filter((x) => !x.ok || x.errors.length),
  }
})

/* ---------- 步骤流转 ---------- */
const nextStep = () => {
  if (currentStep.value === 0) {
    if (!form.agencyId) {
      Message.warning('请选择持牌机构')
      return
    }
    if (form.sampleMode === 'library' && !form.table) {
      Message.warning('样本来源为样本库时，请在本步或下一步完成样本表选择')
    }
    if (!form.description.trim()) {
      Message.warning('请填写申请说明')
      return
    }
  } else if (currentStep.value === 1) {
    // 外部数据多选位于步骤 3，不在这里拦截流转（否则永远无法进入 3.1）；提交与校验处已有守卫
    if (form.sampleMode === 'library' && !form.table) {
      Message.warning('请选择样本库与样本表')
      return
    }
    if (!sampleColumns.value.length) {
      Message.warning(form.sampleMode === 'library' ? '请先选择样本表完成样本读取' : '请上传 CSV 样本文件并完成解析')
      return
    }
    if (!sampleRows.value.length) {
      Message.warning('样本无有效数据行')
      return
    }
  }
  currentStep.value = Math.min(currentStep.value + 1, stepsList.length - 1)
}

const prevStep = () => {
  currentStep.value = Math.max(currentStep.value - 1, 0)
}

/* ---------- 提交 ---------- */
const submitting = ref(false)
const successVisible = ref(false)

const submitApplication = async () => {
  if (!form.externalData.length) {
    Message.warning('请至少选择一个外部数据')
    return
  }
  if (validation.value !== 'success') {
    Message.warning('请先执行参数列校验并通过')
    return
  }
  submitting.value = true
  const payload = {
    name: `${selectedAgency.value?.agencyName ?? '—'}-外数离线回溯`,
    serviceType: '外数离线回溯申请',
    description: form.description,
    relatedProduct: form.externalData,
    applyData: {
      agency: { id: form.agencyId, name: selectedAgency.value?.agencyName, code: selectedAgency.value?.agencyCode, licenseNo: selectedAgency.value?.licenseNo },
      sample: {
        mode: form.sampleMode,
        source: sampleSourceText.value,
        database: form.sampleMode === 'library' ? form.database : undefined,
        table: form.sampleMode === 'library' ? form.table : undefined,
        rows: sampleRows.value.length,
        columns: sampleColumns.value.length,
      },
      externalData: form.externalData.map((n) => {
        const p = externalDataOptions.find((e) => e.name === n)
        return { name: n, interfaceId: p?.interfaceId, agency: p?.agency, requiredParams: p?.requiredParams }
      }),
      bindings: activeDefs.value.map((d) => ({
        element: d.label,
        sampleField: bindings[d.key],
        hitCount: results[d.key].hitCount,
        total: sampleRows.value.length,
      })),
    },
    status: 'approving',
    currentStage: 'approval',
  }
  const ok = await store.createService(payload as any)
  submitting.value = false
  if (ok) {
    successVisible.value = true
  } else {
    Message.error(store.error || '提交失败')
  }
}

/* ---------- 导航 ---------- */
const goBack = () => {
  successVisible.value = false
  router.push({ name: 'RiskExternalDataServiceScene' })
}

const goTaskList = () => {
  successVisible.value = false
  router.push({ name: 'RiskExternalDataTaskList' })
}

onMounted(() => {
  loadAgencies()
  loadSampleTables()
})
</script>

<style scoped>
.offline-backtrack {
  padding: 0 16px;
}

.apply-card {
  margin-top: 16px;
}

.step-header {
  margin-top: 12px;
  padding: 12px 16px;
  background: var(--color-fill-1);
  border-radius: 4px;
}

.step-header-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.step-header-index {
  font-weight: 600;
  color: rgb(var(--primary-6));
}

.step-header-title {
  font-weight: 600;
}

.step-header-dots {
  display: flex;
  gap: 6px;
  margin-left: 8px;
}

.step-header-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-fill-3);
}

.step-header-dot.is-done {
  background: rgb(var(--primary-3));
}

.step-header-dot.is-current {
  background: rgb(var(--primary-6));
}

.step-sections {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.step-sections-label {
  font-size: 12px;
  color: var(--color-text-3);
}

.step-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--color-neutral-3);
}

.table-tip {
  font-size: 12px;
  color: var(--color-text-3);
}

.mono {
  font-family: 'JetBrains Mono', Menlo, Consolas, monospace;
  font-size: 12px;
}

.upload-drop {
  padding: 12px;
  text-align: center;
}

.binding-error {
  color: rgb(var(--danger-6));
  font-size: 12px;
}

.product-req-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}
</style>
