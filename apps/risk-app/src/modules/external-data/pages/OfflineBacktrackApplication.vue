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
        <!-- ============ 步骤1：合作机构与样本、申请说明 ============ -->
        <div v-show="currentStep === 0">
          <a-divider orientation="left" style="margin-top: 0">1.1 选择合作机构</a-divider>
          <a-form :model="formModel" layout="vertical">
            <a-row :gutter="16">
              <a-col :span="10">
                <a-form-item label="合作机构" required help="仅展示合作机构管理中状态为「启用」的机构">
                  <a-select v-model="form.agencyId" placeholder="请选择合作机构" @change="onAgencyChange">
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
                  <span v-else class="table-tip">请先选择合作机构</span>
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>

          <a-divider orientation="left">1.2 添加样本（可多个）</a-divider>
          <a-alert type="info" style="margin-bottom: 12px">
            一次回溯申请可挂多个样本：从样本库添加多张表、上传多个 CSV，两种来源可混用。
            样本逐个独立解析，参数列绑定默认按同名共用，个别样本缺列时再在第二步单独补选。
          </a-alert>
          <a-row :gutter="16">
            <a-col :span="13">
              <div class="sample-entry">
                <div class="sample-entry-title">从样本库添加</div>
                <a-row :gutter="8">
                  <a-col :span="9">
                    <a-form :model="formModel" layout="vertical">
                      <a-form-item label="样本库">
                        <a-select v-model="picker.database" placeholder="请选择样本库" @change="onDatabaseChange">
                          <a-option v-for="db in databaseOptions" :key="db" :value="db">{{ db }}</a-option>
                        </a-select>
                      </a-form-item>
                    </a-form>
                  </a-col>
                  <a-col :span="15">
                    <a-form :model="formModel" layout="vertical">
                      <a-form-item label="样本表">
                        <a-select
                          v-model="picker.table"
                          :placeholder="picker.database ? '请选择样本表' : '请先选择样本库'"
                          :disabled="!picker.database"
                          allow-search
                        >
                          <a-option v-for="t in tableOptions" :key="t.fullName" :value="t.fullName">
                            {{ t.table }}（{{ t.description }}）
                          </a-option>
                        </a-select>
                      </a-form-item>
                    </a-form>
                  </a-col>
                </a-row>
                <a-space>
                  <a-button type="outline" size="small" :disabled="!picker.table" @click="addLibrarySample">
                    <template #icon><icon-plus /></template>
                    添加为样本
                  </a-button>
                  <span v-if="!tableOptions.length && picker.database" class="table-tip">该库下暂无可用样本表</span>
                </a-space>
              </div>
            </a-col>
            <a-col :span="11">
              <div class="sample-entry">
                <div class="sample-entry-title">上传 CSV 样本（可一次选多个）</div>
                <a-upload
                  draggable
                  multiple
                  :auto-upload="false"
                  :limit="0"
                  accept=".csv"
                  :show-file-list="false"
                  @change="onUploadChange"
                >
                  <!-- a-upload 不渲染外层默认插槽，自定义拖拽区必须放进 #upload-button -->
                  <template #upload-button>
                    <div class="upload-drop">
                      <p class="arco-upload-drag-icon"><icon-upload /></p>
                      <div style="margin-top: 8px; font-weight: 500">点击或拖拽 CSV 文件到此处</div>
                      <div class="table-tip" style="margin-top: 4px">仅支持 UTF-8 编码 CSV，可一次选多个</div>
                    </div>
                  </template>
                </a-upload>
              </div>
            </a-col>
          </a-row>

          <!-- 已添加样本：本页不展示明细数据，只给来源 / 字段数 / 行数与解析状态 -->
          <template v-if="samples.length">
            <div class="sample-list-head">
              <span class="table-tip">
                已添加 {{ samples.length }} 个样本，已就绪 {{ readySamples.length }} 个，合计 {{ totalSampleRows.toLocaleString() }} 行
              </span>
              <a-button type="text" size="mini" status="danger" @click="clearAllSamples">清空全部</a-button>
            </div>
            <a-table :data="samples" :pagination="false" size="small" row-key="uid">
              <template #columns>
                <a-table-column title="#" :width="46">
                  <template #cell="{ rowIndex }">{{ rowIndex + 1 }}</template>
                </a-table-column>
                <a-table-column title="样本名称" data-index="name" :width="230" ellipsis tooltip />
                <a-table-column title="来源" :width="96">
                  <template #cell="{ record }">
                    <a-tag size="small" :color="record.kind === 'library' ? 'arcoblue' : 'purple'">
                      {{ record.kind === 'library' ? '样本库表' : 'CSV 上传' }}
                    </a-tag>
                  </template>
                </a-table-column>
                <a-table-column title="字段数" :width="76">
                  <template #cell="{ record }">{{ record.status === 'ready' ? record.columns.length : '—' }}</template>
                </a-table-column>
                <a-table-column title="数据行数" :width="92">
                  <template #cell="{ record }">{{ record.status === 'ready' ? record.rows.length.toLocaleString() : '—' }}</template>
                </a-table-column>
                <a-table-column title="解析状态">
                  <template #cell="{ record }">
                    <a-space :size="6">
                      <icon-loading v-if="record.status === 'loading'" spin />
                      <a-tag v-if="record.status === 'loading'" size="small" color="arcoblue">解析中</a-tag>
                      <a-tag v-else-if="record.status === 'ready'" size="small" color="green">
                        已就绪{{ record.skipped ? `，跳过 ${record.skipped} 行` : '' }}
                      </a-tag>
                      <a-tag v-else size="small" color="red">解析失败</a-tag>
                    </a-space>
                    <div v-if="record.error" class="table-tip sample-error">{{ record.error }}</div>
                  </template>
                </a-table-column>
                <a-table-column title="操作" :width="70">
                  <template #cell="{ record }">
                    <a-button type="text" size="mini" status="danger" @click="removeSample(record)">移除</a-button>
                  </template>
                </a-table-column>
              </template>
            </a-table>
            <div v-if="!schemaAligned && readySamples.length > 1" class="table-tip sample-error">
              各样本列名不完全一致，第二步里未命中共用列的样本需要单独补选参数列。
            </div>
          </template>
          <a-empty v-else description="尚未添加样本：可从样本库添加表，或上传一个 / 多个 CSV 文件" />

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

        <!-- ============ 步骤2：样本确认 + 外部数据选择 + 参数列绑定与校验 ============ -->
        <div v-show="currentStep === 1">
          <a-divider orientation="left" style="margin-top: 0">2.1 样本确认</a-divider>
          <a-descriptions :column="4" size="small" bordered>
            <a-descriptions-item label="合作机构">{{ selectedAgency?.agencyName || '—' }}</a-descriptions-item>
            <a-descriptions-item label="样本数">{{ readySamples.length }}</a-descriptions-item>
            <a-descriptions-item label="合计行数">{{ totalSampleRows.toLocaleString() }}</a-descriptions-item>
            <a-descriptions-item label="列名并集">{{ unionColumns.length }} 列</a-descriptions-item>
          </a-descriptions>
          <div class="sample-chips">
            <a-tag v-for="s in readySamples" :key="s.uid" size="small" :color="s.kind === 'library' ? 'arcoblue' : 'purple'">
              {{ s.name }} · {{ s.columns.length }} 列 / {{ s.rows.length.toLocaleString() }} 行
            </a-tag>
          </div>
          <div class="table-tip">本页不展示样本明细数据；需要增删样本请回到第一步。</div>

          <a-divider orientation="left">2.2 选择外部数据（可多选）</a-divider>
          <a-form :model="formModel" layout="vertical">
            <a-form-item label="外部数据" required help="多个样本共用同一批外部数据；参数列绑定取全部所选产品必填入参的并集">
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

          <a-divider orientation="left">2.3 绑定参数列</a-divider>
          <a-alert type="info" style="margin-bottom: 12px">
            <template v-if="activeDefs.length">
              多个样本默认共用同一个列名；某样本没有该列时，在该样本上单独补选一列。本次需绑定
              <b>{{ activeDefs.map((d) => d.label).join(' / ') }}</b>，全部样本绑定并通过格式校验后方可提交。
            </template>
            <template v-else>请先在 2.2 选择外部数据（可多选），绑定项将按所选产品的必填入参自动生成。</template>
          </a-alert>
          <a-table v-if="activeDefs.length" :data="bindingRows" :pagination="false" size="small" row-key="key">
            <template #columns>
              <a-table-column title="参数" data-index="label" :width="104" />
              <a-table-column title="格式要求" :width="190">
                <template #cell="{ record }">
                  <span class="mono">{{ record.rule }}</span>
                </template>
              </a-table-column>
              <a-table-column title="共用样本列" :width="220">
                <template #cell="{ record }">
                  <a-select
                    v-model="bindings[record.key]"
                    placeholder="选择样本列"
                    allow-search
                    allow-clear
                    size="small"
                    @change="onBindingChange"
                  >
                    <a-option v-for="c in unionColumns" :key="c" :value="c">
                      {{ c }}{{ columnCoverage.get(c) ? `（${columnCoverage.get(c)}/${readySamples.length} 样本）` : '' }}
                    </a-option>
                  </a-select>
                </template>
              </a-table-column>
              <a-table-column title="覆盖情况" :width="150">
                <template #cell="{ record }">
                  <a-tag v-if="!bindings[record.key]" size="small">未绑定</a-tag>
                  <a-tag v-else-if="!uncoveredSamples(record.key).length" size="small" color="green">
                    {{ readySamples.length }} 个样本全部命中
                  </a-tag>
                  <a-tag v-else size="small" color="orange">
                    {{ sharedCoverage(record.key) }} 命中 / {{ uncoveredSamples(record.key).length }} 需补选
                  </a-tag>
                </template>
              </a-table-column>
              <a-table-column title="校验结果">
                <template #cell="{ record }">
                  <template v-if="validation === 'success' || validation === 'error'">
                    <a-tag v-if="results[record.key].ok" color="green" size="small">
                      通过（{{ results[record.key].perSample.length }} 个样本）
                    </a-tag>
                    <span v-else class="binding-error">{{ results[record.key].errors.join('；') }}</span>
                  </template>
                  <span v-else class="table-tip">待校验</span>
                </template>
              </a-table-column>
            </template>
          </a-table>

          <!-- 逐样本补选：只在共用列没覆盖到的样本上出现 -->
          <div v-for="p in pendingPicks" :key="`pick-${p.def.key}`" class="pick-block">
            <div class="pick-title">
              「{{ p.def.label }}」共用列
              <span class="mono">{{ bindings[p.def.key] || '（未选）' }}</span>
              在以下 {{ p.picks.length }} 个样本中不存在，请逐个补选：
            </div>
            <div v-for="s in p.picks" :key="s.uid" class="pick-row">
              <span class="mono pick-name" :title="s.name">{{ s.name }}</span>
              <a-select
                size="small"
                :model-value="sampleBindings[s.uid]?.[p.def.key] || ''"
                placeholder="为该样本选择一列"
                allow-search
                allow-clear
                @change="(v) => pickSampleColumn(s.uid, p.def.key, (v as string) || '')"
              >
                <a-option v-for="c in s.columns" :key="c" :value="c">{{ c }}</a-option>
              </a-select>
            </div>
          </div>

          <a-divider orientation="left">2.4 样本校验</a-divider>
          <a-space style="margin-bottom: 12px">
            <a-button type="outline" :loading="validating" @click="runValidation">
              <template #icon><icon-safe /></template>
              执行参数列校验
            </a-button>
            <a-tag v-if="validation === 'success'" color="green" size="medium">
              {{ readySamples.length }} 个样本的参数列全部校验通过
            </a-tag>
            <a-tag v-else-if="validation === 'error'" color="red" size="medium">
              {{ resultsSummary.failCount }} / {{ activeDefs.length }} 项存在未通过样本
            </a-tag>
          </a-space>
          <a-descriptions v-if="resultsSummary.detailRows.length" :column="1" size="small" bordered>
            <a-descriptions-item v-for="d in resultsSummary.detailRows" :key="d.key" :label="d.label">
              <div v-for="item in d.perSample" :key="item.uid" class="check-row">
                <a-tag v-if="item.ok && !item.errors.length" color="green" size="small">
                  {{ item.name }}：{{ item.hit }} / {{ item.total }} 行通过（{{ item.col }}）
                </a-tag>
                <a-tag v-else-if="item.ok" color="orange" size="small">
                  {{ item.name }}：{{ item.errors.join('；') }}（{{ item.hit }} / {{ item.total }}，{{ item.col }}）
                </a-tag>
                <a-tag v-else color="red" size="small">{{ item.name }}：{{ item.errors.join('；') }}</a-tag>
                <span v-if="item.badRows.length" class="mono table-tip">失败行：{{ item.badRows.join(', ') }}</span>
              </div>
            </a-descriptions-item>
          </a-descriptions>
          <div class="table-tip">
            校验口径：身份证号按 18 位（末位允许 X）逐行校验，手机号按 1 开头 3~9 段 11 位逐行校验，姓名按中文（含「·」）或英文名逐行校验；
            空值与格式不符行会计入失败样例，同一样本内绑定列与其他参数重复时拦截；校验逐样本独立执行，任一样本未通过则该参数整体不通过；
            多个外部数据必填入参不一致时取并集统一校验。
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
          {{ readySamples.length }} 个样本（{{ sampleSourceText }}）· 合计 {{ totalSampleRows.toLocaleString() }} 行 ·
          外部数据 {{ form.externalData.length }} 个 · 参数列绑定 {{ boundCount }} / {{ activeDefs.length }}，逐样本校验通过。审批与执行进度可在「服务任务列表」查看。
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
import { IconUpload, IconSafe, IconCheckCircle, IconPlus, IconLoading } from '@arco-design/web-vue/es/icon'
import { fetchEnabledAgencies } from '../api/creditAgency'
import type { CreditAgency } from '../mock/creditAgencies'
import { listOnlineSampleTables, listHiveTableColumns } from '../mock/hiveTables'
import type { HiveTableItem } from '../mock/hiveTables'
import { externalDataCatalogMock, unionRequiredParams } from '../mock/externalDataCatalog'
import type { ParamKey } from '../mock/externalDataCatalog'
import { makeStableRng } from '../mock/stableHash'
import { useExternalDataStore } from '@/modules/external-data/stores'

const router = useRouter()
const store = useExternalDataStore()
const currentStep = ref(0)

/** 表单容器模型（Arco Form 要求 model prop，本页表单项不走 field 校验，仅用于布局） */
const formModel = reactive<Record<string, unknown>>({})

const stepsList = [
  { title: '机构与样本', sections: ['1.1 选择合作机构', '1.2 添加样本（可多个）', '1.3 申请说明'] },
  { title: '确认与参数绑定', sections: ['2.1 样本确认', '2.2 选择外部数据（可多选）', '2.3 绑定参数列', '2.4 样本校验'] },
]

/* ---------- 步骤1：合作机构 ---------- */
const agencies = ref<CreditAgency[]>([])
const form = reactive({
  agencyId: '',
  description: '',
  externalData: [] as string[],
})

const selectedAgency = computed(() => agencies.value.find((a) => a.id === form.agencyId) || null)

const loadAgencies = async () => {
  agencies.value = await fetchEnabledAgencies()
}

/** 切换机构仅登出数主体，不抖掉已添加的样本（样本本身没变，只需重新校验） */
const onAgencyChange = () => {
  clearValidation()
}

/* ---------- 步骤1：样本列表（库表与 CSV 可混合、可多个） ---------- */
type SampleKind = 'library' | 'upload'
interface SampleEntry {
  uid: string
  kind: SampleKind
  /** 列表展示名：库表取 fullName，CSV 取文件名 */
  name: string
  database?: string
  table?: string
  columns: string[]
  rows: Record<string, string>[]
  status: 'loading' | 'ready' | 'failed'
  error?: string
  /** CSV 中与表头列数不符、已跳过的行数 */
  skipped?: number
}

const samples = ref<SampleEntry[]>([])
/** 样本库选择器：只是「待添加」的候选，不代表已选定样本 */
const picker = reactive({ database: '', table: '' })
const sampleTables = ref<HiveTableItem[]>([])

/** 样本库列表（库级去重，来自固定外数库的线上样本表） */
const databaseOptions = computed(() => Array.from(new Set(sampleTables.value.map((t) => t.database))))
/** 当前库下可选样本表 */
const tableOptions = computed(() => sampleTables.value.filter((t) => t.database === picker.database))
const readySamples = computed(() => samples.value.filter((s) => s.status === 'ready' && s.rows.length))
const loadingSamples = computed(() => samples.value.filter((s) => s.status === 'loading'))
const failedSamples = computed(() => samples.value.filter((s) => s.status === 'failed'))
const totalSampleRows = computed(() => readySamples.value.reduce((n, s) => n + s.rows.length, 0))
/** 就绪样本列名并集：共用绑定列的下拉候选 */
const unionColumns = computed(() => Array.from(new Set(readySamples.value.flatMap((s) => s.columns))))
/** 某列名在多少个就绪样本里存在，用于判断共用绑定要不要逐样本补选 */
const columnCoverage = computed(() => {
  const m = new Map<string, number>()
  for (const s of readySamples.value) {
    for (const c of new Set(s.columns)) m.set(c, (m.get(c) || 0) + 1)
  }
  return m
})
const sampleSourceText = computed(() => readySamples.value.map((s) => s.name).join('、') || '—')

const loadSampleTables = async () => {
  sampleTables.value = await listOnlineSampleTables()
  if (!picker.database && databaseOptions.value.length) {
    picker.database = databaseOptions.value[0]
  }
}

const onDatabaseChange = () => {
  picker.table = ''
}

/* ---------- 样本库读取（mock：随机流复用 mock/stableHash 的 makeStableRng，不在此另起散列实现） ---------- */
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

/** 库样本数据：列清单来自表结构 mock，另补 cust_name（样本库存量姓名列），按表名固定种子生成确定性数据 */
const buildLibraryRows = (fullName: string): { columns: string[]; rows: Record<string, string>[] } => {
  const cols = Array.from(new Set(['cust_name', ...listHiveTableColumns(fullName)]))
  const rng = makeStableRng(fullName)
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
  return { columns: cols, rows }
}

/** 把选择器里的库表加进样本列表，同一张表不重复添加 */
const addLibrarySample = () => {
  const fullName = picker.table
  if (!fullName) {
    Message.warning('请先选择样本库与样本表')
    return
  }
  const meta = sampleTables.value.find((t) => t.fullName === fullName)
  if (!meta) {
    return
  }
  if (samples.value.some((s) => s.uid === fullName)) {
    Message.warning(`样本「${fullName}」已在列表中`)
    return
  }
  const { columns, rows } = buildLibraryRows(fullName)
  samples.value.push({ uid: fullName, kind: 'library', name: fullName, database: meta.database, table: meta.table, columns, rows, status: 'ready' })
  onSamplesChanged()
  Message.success(`已添加样本 ${fullName}，${columns.length} 列、${rows.length} 行`)
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

/* ---------- 样本列表维护 ---------- */
/** 改写样本条目要走数组代理，直接改 push 前的原始对象不触发视图更新 */
const patchSample = (uid: string, patch: Partial<SampleEntry>) => {
  const s = samples.value.find((x) => x.uid === uid)
  if (s) {
    Object.assign(s, patch)
  }
}

/** 样本增删后：作废上次校验、按新列集补空绑定、清掉已移除样本的逐样本补选 */
const onSamplesChanged = () => {
  clearValidation()
  autoBindShared()
  const alive = new Set(samples.value.map((s) => s.uid))
  for (const id of Object.keys(sampleBindings)) {
    if (!alive.has(id)) {
      delete sampleBindings[id]
    }
  }
}

const removeSample = (s: SampleEntry) => {
  samples.value = samples.value.filter((x) => x.uid !== s.uid)
  onSamplesChanged()
}

const clearAllSamples = () => {
  samples.value = []
  onSamplesChanged()
}

/* ---------- CSV 上传解析（多文件） ---------- */
// 不维护 Arco 自己的 file-list（show-file-list 已关），samples 就是已选文件的唯一事实源
const onUploadChange = (fileList: UploadFile[], fileItem?: UploadFile) => {
  const uid = fileItem?.uid
  const name = fileItem?.name || '未命名 CSV'
  const raw = fileItem?.file
  if (!uid || samples.value.some((s) => s.uid === uid)) {
    return
  }
  if (!/\.csv$/i.test(name)) {
    Message.error(`「${name}」不是 CSV 文件，已忽略`)
    return
  }
  samples.value.push({ uid, kind: 'upload', name, columns: [], rows: [], status: 'loading' })
  if (!raw) {
    patchSample(uid, { status: 'failed', error: '未取到文件内容，请重新选择' })
    onSamplesChanged()
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    const { columns, rows, skipped } = parseCsvText(String(reader.result || '').replace(/^\uFEFF/, ''))
    if (!columns.length) {
      patchSample(uid, { status: 'failed', error: '未能解析出表头，请确认首行为列名' })
    } else if (!rows.length) {
      patchSample(uid, { status: 'failed', error: `文件无有效数据行${skipped ? `（${skipped} 行与表头列数不符已跳过）` : ''}` })
    } else {
      patchSample(uid, { columns, rows, skipped, status: 'ready' })
      Message.success(`「${name}」解析成功：${columns.length} 列、${rows.length} 行${skipped ? `，${skipped} 行与表头列数不符已跳过` : ''}`)
    }
    onSamplesChanged()
  }
  reader.onerror = () => {
    patchSample(uid, { status: 'failed', error: '文件读取失败，请确认文件未被占用' })
    onSamplesChanged()
  }
  reader.readAsText(raw, 'UTF-8')
}

/* ---------- 步骤2：外部数据（多选）与参数列绑定 ---------- */
/** 外部数据候选目录（含接口号与必填入参，见 mock/externalDataCatalog.ts） */
const externalDataOptions = externalDataCatalogMock

/** 已选外部数据产品明细 */
const selectedProducts = computed(() =>
  externalDataOptions.filter((e) => form.externalData.includes(e.name))
)

const paramLabel = (k: ParamKey) => PARAM_LABELS[k]
const PARAM_LABELS: Record<ParamKey, string> = { name: '姓名', mobile: '手机号', certNo: '身份证号' }

/**
 * 参数列候选全集：姓名 / 手机号 / 身份证号，按所选产品必填入参并集激活。
 * re 是逐行格式校验口径，match 是列名启发式（原先 autoBind 与 autoBindOne 各写一份，合一至此）
 */
interface ParamDef { key: ParamKey; label: string; rule: string; re: RegExp; match: RegExp[] }
const PARAM_DEFS: ParamDef[] = [
  { key: 'name', label: '姓名', rule: '中文（含·）或英文名', re: /^([\u4e00-\u9fa5]{2,}(?:·[\u4e00-\u9fa5]{2,})*)|([A-Za-z]+(?:\s+[A-Za-z.]+)*)$/, match: [/^cust_name$/i, /^name$/i, /^user_?name$/i, /姓名/] },
  { key: 'mobile', label: '手机号', rule: '1[3-9] 开头 11 位数字', re: /^1[3-9]\d{9}$/, match: [/^mobile$/i, /(^|_)phone($|_)/i, /^phone$/i, /手机/] },
  { key: 'certNo', label: '身份证号', rule: '18 位（末位允许 X）', re: /^\d{17}[\dXx]$/, match: [/^cert_?no$/i, /^id_?no$/i, /^id_?card$/i, /身份证/] },
]

/** 当前生效的参数列（所选外部数据必填入参的并集） */
const activeDefs = computed(() => {
  const keys = unionRequiredParams(form.externalData)
  return PARAM_DEFS.filter((d) => keys.includes(d.key as ParamKey))
})

const bindingRows = computed(() => activeDefs.value.map((d) => ({ key: d.key, label: d.label, rule: d.rule })))
/** 共用绑定：一个参数对一个列名，多样本按同名自动命中 */
const bindings = reactive<Record<string, string>>({ name: '', mobile: '', certNo: '' })
/**
 * 逐样本补选：sampleBindings[样本uid][参数key] = 该样本自己的列名。
 * 只在共用列在该样本不存在时生效，避免把用户为某个文件选的列静默覆盖掉
 */
const sampleBindings = reactive<Record<string, Record<string, string>>>({})

/**
 * 共用绑定预填：优先取覆盖样本数最多的候选列（交集列天然零补选），
 * 只在当前值为空或已不在列并集里时重填，不覆盖人工选择
 */
const autoBindShared = () => {
  if (!readySamples.value.length) {
    for (const d of PARAM_DEFS) {
      bindings[d.key] = ''
    }
    return
  }
  for (const d of PARAM_DEFS) {
    if (bindings[d.key] && columnCoverage.value.has(bindings[d.key])) {
      continue
    }
    const hit = [...columnCoverage.value.entries()]
      .filter(([c]) => d.match.some((p) => p.test(c)))
      .sort((a, b) => b[1] - a[1])
    bindings[d.key] = hit.length ? hit[0][0] : ''
  }
}

/** 某参数在某样本上真正生效的列：共用列在该样本存在就用，否则退到该样本的补选值 */
const effectiveColumn = (key: ParamKey, s: SampleEntry) => {
  const shared = bindings[key]
  if (shared && s.columns.includes(shared)) {
    return shared
  }
  return sampleBindings[s.uid]?.[key] || ''
}

/** 既没用上共用列、也还没补选的就绪样本，这些样本需要在 2.3 单独选列 */
const uncoveredSamples = (key: ParamKey) => readySamples.value.filter((s) => !effectiveColumn(key, s))

/** 共用列直接覆盖了多少个就绪样本，用于绑定行右侧的覆盖提示 */
const sharedCoverage = (key: ParamKey) => {
  const shared = bindings[key]
  if (!shared) {
    return 0
  }
  return readySamples.value.filter((s) => s.columns.includes(shared)).length
}

/** 完全就绪（共用列覆盖全部样本且无需补选）的参数数 */
const boundCount = computed(() =>
  activeDefs.value.filter((d) => bindings[d.key] && !uncoveredSamples(d.key).length).length
)

/** 待逐样本补选的参数及其未覆盖样本 */
const pendingPicks = computed(() =>
  activeDefs.value
    .map((d) => ({ def: d, picks: uncoveredSamples(d.key) }))
    .filter((x) => x.picks.length)
)

/** 就绪样本列名是否完全同构：不同构时提前告知可能要逐样本补选 */
const schemaAligned = computed(() => {
  const ready = readySamples.value
  if (ready.length < 2) {
    return true
  }
  const fingerprint = (s: SampleEntry) => [...new Set(s.columns)].sort().join('|')
  return new Set(ready.map(fingerprint)).size === 1
})

/* ---------- 校验（逐样本 × 逐参数） ---------- */
type ValidationState = 'idle' | 'processing' | 'success' | 'error'
const validation = ref<ValidationState>('idle')
const validating = ref(false)

/** 单个样本在某个参数上的校验明细；badRows 只记行号不记字段值，避免页面回显样本明细 */
interface SampleCheck {
  uid: string
  name: string
  col: string
  ok: boolean
  hit: number
  total: number
  errors: string[]
  badRows: string[]
}
interface ParamResult { ok: boolean; errors: string[]; perSample: SampleCheck[] }
const emptyResult = (): ParamResult => ({ ok: false, errors: [], perSample: [] })
const results = reactive<Record<string, ParamResult>>({ name: emptyResult(), mobile: emptyResult(), certNo: emptyResult() })

/** 作废上次校验结果：样本、绑定、外部数据任一变化都必须重新跑 */
const clearValidation = () => {
  validation.value = 'idle'
  for (const d of PARAM_DEFS) {
    results[d.key] = emptyResult()
  }
}

/** 共用绑定列变更：补选值保留，它们只在共用列缺失时生效 */
const onBindingChange = () => {
  clearValidation()
}

/** 逐样本补选写入 */
const pickSampleColumn = (uid: string, key: ParamKey, col: string) => {
  if (!sampleBindings[uid]) {
    sampleBindings[uid] = {}
  }
  sampleBindings[uid][key] = col
  clearValidation()
}

/** 外部数据多选变更：作废上次校验，并按新并集补空绑定 */
const onExternalDataChange = () => {
  clearValidation()
  autoBindShared()
}

/** 激活项集合变化（如新选了一个需要姓名的产品）时重算空绑定并作废校验结果 */
watch(activeDefs, () => {
  clearValidation()
  autoBindShared()
})

/** 单样本单列逐行校验：命中行占比不足 95% 视为未通过 */
const checkSampleColumn = (def: ParamDef, s: SampleEntry, col: string): SampleCheck => {
  const base = { uid: s.uid, name: s.name, col, total: s.rows.length }
  if (!s.columns.includes(col)) return { ...base, ok: false, hit: 0, errors: ['该列不在样本中'], badRows: [] }
  let hit = 0
  let empty = 0
  const badRows: string[] = []
  for (const row of s.rows) {
    const v = (row[col] ?? '').trim()
    if (!v) { empty++; continue }
    if (def.re.test(v)) hit++
    else if (badRows.length < 5) badRows.push(row.__rowNo)
  }
  const total = s.rows.length
  if (total && empty === total) return { ...base, ok: false, hit: 0, errors: ['该列全部为空值'], badRows: [] }
  if (hit === 0) return { ...base, ok: false, hit: 0, errors: [`无一行符合「${def.rule}」，疑似绑错列`], badRows }
  const errors: string[] = []
  if (badRows.length) errors.push(`${badRows.length} 行格式不符`)
  if (empty) errors.push(`${empty} 行为空值`)
  const ok = total > 0 && hit / total >= 0.95
  if (!ok && !errors.length) errors.push(`格式命中率 ${Math.round((hit / total) * 100)}% 低于 95%`)
  return { ...base, ok, hit, errors, badRows }
}

/**
 * 逐样本校验一个参数：共用列命中的样本直接算，未命中的用该样本自己补选的列；
 * 全部就绪样本都通过才算该参数通过
 */
const validateOne = (def: ParamDef): ParamResult => {
  const r: ParamResult = { ok: false, errors: [], perSample: [] }
  const ready = readySamples.value
  if (!ready.length) {
    r.errors.push('无已就绪样本')
    return r
  }
  if (!bindings[def.key] && ready.every((s) => !sampleBindings[s.uid]?.[def.key])) {
    r.errors.push('未绑定样本列')
    return r
  }
  for (const s of ready) {
    const col = effectiveColumn(def.key, s)
    if (!col) {
      r.perSample.push({ uid: s.uid, name: s.name, col: '', ok: false, hit: 0, total: s.rows.length, errors: ['该样本无同名列，请在下方补选'], badRows: [] })
      continue
    }
    const dup = activeDefs.value.find((d) => d.key !== def.key && effectiveColumn(d.key, s) === col)
    if (dup) {
      r.perSample.push({ uid: s.uid, name: s.name, col, ok: false, hit: 0, total: s.rows.length, errors: [`与「${dup.label}」绑定同一列，不允许重复`], badRows: [] })
      continue
    }
    r.perSample.push(checkSampleColumn(def, s, col))
  }
  r.ok = r.perSample.every((x) => x.ok)
  if (!r.ok) {
    const bad = r.perSample.filter((x) => !x.ok).map((x) => x.name)
    r.errors.push(`${bad.length} / ${ready.length} 个样本未通过：${bad.join('、')}`)
  }
  return r
}

const runValidation = async () => {
  if (!readySamples.value.length) {
    Message.warning('请先在第一步添加已完成读取的样本')
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
  if (fail) Message.warning(`${fail} 项参数列在部分样本上未通过，请修正后重新校验`)
  else Message.success(`${activeDefs.value.map((d) => d.label).join(' / ')} 在 ${readySamples.value.length} 个样本上全部校验通过`)
}

const resultsSummary = computed(() => {
  const list = activeDefs.value.map((d) => ({
    key: d.key,
    label: d.label,
    ok: results[d.key].ok,
    errors: results[d.key].errors,
    perSample: results[d.key].perSample,
  }))
  // 明细仅在校验后展示：未通过或含告警的行展开，全部通过时收口为绿色标签
  return {
    failCount: list.filter((x) => !x.ok).length,
    detailRows: list.filter((x) => !x.ok || x.perSample.some((p) => p.errors.length)),
  }
})

/* ---------- 步骤流转 ---------- */
/** 只剩两步：步骤1 收齐机构 + 多样本 + 说明，步骤2 确认、绑定、校验并提交 */
const nextStep = () => {
  if (currentStep.value === 0) {
    if (!form.agencyId) {
      Message.warning('请选择合作机构')
      return
    }
    if (!samples.value.length) {
      Message.warning('请至少添加一个样本（从样本库选表或上传 CSV）')
      return
    }
    if (loadingSamples.value.length) {
      Message.warning('有样本正在解析，请等待完成')
      return
    }
    if (failedSamples.value.length) {
      Message.warning(`${failedSamples.value.length} 个样本解析失败，请移除或重新上传`)
      return
    }
    if (!readySamples.value.length) {
      Message.warning('没有含有效数据行的样本，请检查文件内容或换表')
      return
    }
    if (!form.description.trim()) {
      Message.warning('请填写申请说明')
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
      /** 多样本：一个申请可带多个样本，逐个记录来源与规模 */
      samples: readySamples.value.map((s) => ({
        kind: s.kind,
        name: s.name,
        database: s.kind === 'library' ? s.database : undefined,
        table: s.kind === 'library' ? s.table : undefined,
        rows: s.rows.length,
        columns: s.columns.length,
        skipped: s.skipped,
      })),
      sampleSummary: { count: readySamples.value.length, rows: totalSampleRows.value },
      externalData: form.externalData.map((n) => {
        const p = externalDataOptions.find((e) => e.name === n)
        return { name: n, interfaceId: p?.interfaceId, agency: p?.agency, requiredParams: p?.requiredParams }
      }),
      /** 绑定按共用列 + 逐样本补选两层记录，回看时能知道哪个文件用的哪一列 */
      bindings: activeDefs.value.map((d) => ({
        element: d.label,
        sharedField: bindings[d.key] || undefined,
        perSample: results[d.key].perSample.map((p) => ({
          sample: p.name,
          sampleField: p.col,
          hitCount: p.hit,
          total: p.total,
        })),
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
  padding: 16px 12px;
  text-align: center;
  border: 1px dashed var(--color-neutral-3);
  border-radius: 4px;
  background: var(--color-fill-1);
  transition: border-color 0.2s;
}

.upload-drop:hover {
  border-color: rgb(var(--primary-6));
}

/* UploadButton 会把 #upload-button 的内容包一层 span，不撑满则 hover 区只剩文字 */
.sample-entry :deep(.arco-upload),
.sample-entry :deep(.arco-upload > span) {
  display: block;
  width: 100%;
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

/* 步骤1 的两个样本添加入口平级并列，各自带小标题避免混为一谈 */
.sample-entry {
  padding: 12px;
  border: 1px solid var(--color-neutral-3);
  border-radius: 4px;
  height: 100%;
}

.sample-entry-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
}

.sample-list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 0 6px;
}

.sample-error {
  color: rgb(var(--danger-6));
  margin-top: 6px;
}

.sample-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0 4px;
}

/* 逐样本补选区：只在共用列没覆盖时出现 */
.pick-block {
  margin-top: 12px;
  padding: 10px 12px;
  background: var(--color-fill-1);
  border-radius: 4px;
}

.pick-title {
  font-size: 12px;
  color: var(--color-text-2);
  margin-bottom: 8px;
}

.pick-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.pick-name {
  flex: 0 0 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.check-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 4px;
}
</style>
