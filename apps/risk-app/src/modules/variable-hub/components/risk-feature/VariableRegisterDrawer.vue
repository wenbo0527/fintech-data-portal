<!--
  特征注册（B1 特征注册表单 · 文档 §三 模块 B）
  - 4 区块：特征核心属性 / 特征分类信息 / 来源与时效 / 协作信息
  - 支持 Excel 评估报告附件上传（B1 R14）
  - 提交后状态=已注册，生成 MIDLOAN-FEAT-DRAFT-NNNN，详情页可继续走状态机
  - 三种入口共用本组件（由 source + requirementData 区分）：
      1) source='ledger' + 无 requirementData：台账「注册特征」，空表单
      2) source='ledger' + requirementData（台账资产）：状态机 submit_requirement 审核，预填 A1 需求提案
      3) source='derivation' + requirementData（需求受理单）：需求列表「去注册」，按 DerivationRecord 全量预填
  - 标题与「新增特征」入口统一为「注册特征」，避免需求方/管理员看到不同文案
-->
<template>
  <a-drawer
    :visible="visible"
    :width="640"
    :title="drawerTitle"
    :ok-loading="submitting"
    @cancel="handleCancel"
    @ok="handleSubmit"
  >
    <!-- 审核/注册模式：A1 需求信息预览 -->
    <a-card
      v-if="isReviewMode && requirementData"
      :title="isDerivationMode ? 'A1 需求信息（需求受理单 · 已预填到下方表单）' : 'A1 需求信息（业务方填写）'"
      size="small"
      :bordered="true"
      style="margin-bottom: 16px; background: var(--color-fill-1)"
    >
      <a-descriptions
        :column="1"
        :data="requirementPreviewItems"
        :label-style="{ width: '100px', color: 'var(--color-text-3)' }"
      />
    </a-card>

    <a-alert v-if="alertText" type="info" :show-icon="false" style="margin-bottom: 16px">
      {{ alertText }}
    </a-alert>
    <a-alert v-else type="info" :show-icon="false" style="margin-bottom: 16px">
      提交后将生成特征资产并跳转到详情页，状态为「已注册」，可在详情页继续发起「提开发OA单」等流程。
    </a-alert>

    <a-steps :current="currentStep" size="small" style="margin-bottom: 20px">
      <a-step title="核心属性" />
      <a-step title="分类信息" />
      <a-step title="来源与时效" />
      <a-step title="协作信息" />
    </a-steps>

    <a-form :model="form" layout="vertical" :disabled="submitting" ref="formRef">
      <!-- ============ 区块 1：特征核心属性 ============ -->
      <a-card title="特征核心属性" :bordered="false" size="small" class="reg-block">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item
              label="特征英文名"
              required
              :validate-status="errors.name ? 'error' : ''"
              :help="errors.name || '≤30 字，字母开头，仅英文大小写/数字/下划线'"
            >
              <a-input
                v-model="form.name"
                placeholder="例如：MIDLOAN_BIGTXN_CNT_30D"
                :max-length="30"
                show-word-limit
                @blur="validateNameOnBlur"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item
              label="特征中文名"
              required
              :validate-status="errors.featureCnName ? 'error' : ''"
              :help="errors.featureCnName || '不可重复'"
            >
              <a-input
                v-model="form.featureCnName"
                placeholder="例如：近30日大额交易次数"
                @blur="validateCnNameOnBlur"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="字段类型" required>
              <a-select v-model="form.fieldType" :options="FIELD_TYPE_OPTIONS" placeholder="请选择" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="默认值（非必填）">
              <a-input
                v-model="form.defaultValue"
                :placeholder="form.fieldType === 'Boolean' ? '例如：false' : (form.fieldType === 'String' ? '例如：未知' : '例如：0')"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="业务逻辑" required>
          <a-textarea
            v-model="form.businessLogic"
            :rows="6"
            :max-length="2000"
            show-word-limit
            placeholder="描述业务含义与统计口径，例如：统计用户近30日内金额≥5000元的成功交易笔数。支持较长文本输入。"
            style="min-height: 140px"
          />
        </a-form-item>

        <a-form-item label="代码逻辑" required>
          <SqlEditor
            v-model="form.codeLogic"
            height="240px"
            placeholder="输入 SQL 代码，例如：SELECT count(*) FROM dwd_trade_detail WHERE amount >= 5000 AND status = 'SUCCESS' AND dt >= date_sub(current_date, 30) GROUP BY user_id"
          />
        </a-form-item>
      </a-card>

      <!-- ============ 区块 2：特征分类信息 ============ -->
      <a-card title="特征分类信息" :bordered="false" size="small" class="reg-block">
        <a-form-item label="特征分类">
          <a-radio-group v-model="form.category" disabled>
            <a-radio value="midloan_behavior">贷中行为（一期固定）</a-radio>
          </a-radio-group>
        </a-form-item>

        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="一级分类" required>
              <a-select
                v-model="form.l1Category"
                :options="l1Options"
                placeholder="请选择一级分类"
                @change="onL1Change"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="二级分类（与一级联动）" required>
              <a-select
                v-model="form.l2Category"
                :options="l2Options"
                placeholder="请选择二级分类"
                :disabled="!form.l1Category"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-card>

      <!-- ============ 区块 3：来源与时效 ============ -->
      <a-card title="来源与时效" :bordered="false" size="small" class="reg-block">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="数据时效">
              <a-select
                v-model="form.dataFreshness"
                :options="DATA_FRESHNESS_OPTIONS"
                placeholder="请选择"
                allow-clear
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="数据源类型">
              <a-select
                v-model="form.sourceType"
                :options="SOURCE_TYPE_OPTIONS"
                placeholder="请选择"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="标准化后来源表（非必填）">
              <a-input v-model="form.sourceTableAfter" placeholder="例如：ads_midloan_bigtxn_30d" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="标准化前来源表（非必填）">
              <a-input v-model="form.sourceTableBefore" placeholder="例如：dwd_trade_detail" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="原特征英文名（非必填）">
              <a-input v-model="form.sourceField" placeholder="对应原始字段名" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="数据底表名称（非必填，可暂空）">
              <a-input v-model="form.dataTableName" placeholder="由开发人员后续在详情页补充" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="数仓任务ID（非必填）">
          <a-input v-model="form.dwTaskId" placeholder="例如：DW-TASK-XXXXXX（数仓回调写入或研发手动补充）" />
        </a-form-item>

        <a-divider style="margin: 12px 0">Excel 评估报告附件（非必填）</a-divider>

        <a-upload
          :custom-request="customUpload"
          :before-upload="beforeUpload"
          :show-file-list="false"
          accept=".xlsx,.xls,.csv"
        >
          <a-button>
            <icon-upload /> 选择 Excel 文件
          </a-button>
          <span class="upload-hint" style="margin-left: 8px; color: var(--color-text-3); font-size: 12px">
            支持 .xlsx / .xls / .csv，单文件不超过 10MB
          </span>
        </a-upload>
        <div v-if="form.excelAttachment" style="margin-top: 8px; color: var(--color-text-2); font-size: 12px">
          <icon-file /> {{ form.excelAttachment.name }}
          （{{ formatSize(form.excelAttachment.size) }}，{{ form.excelAttachment.uploadedAt }}）
          <a-link style="margin-left: 8px" @click="form.excelAttachment = undefined">移除</a-link>
        </div>
      </a-card>

      <!-- ============ 区块 4：协作与备注 ============ -->
      <a-card title="协作与备注" :bordered="false" size="small" class="reg-block">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="创建人（自动带入）">
              <a-input :model-value="form.creator" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="开发人员（必填，从数仓团队）" required>
              <a-select
                v-model="form.developer"
                :options="developerOptions"
                placeholder="请选择开发人员"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="验收人（默认带入创建人）">
              <a-input v-model="form.acceptor" placeholder="可手动调整" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="产品范围">
              <a-input v-model="form.productScope" placeholder="例如：风控反欺诈" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="名单类型">
              <a-select
                v-model="form.listType"
                :options="LIST_TYPE_OPTIONS"
                placeholder="可选"
                allow-clear
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="批次">
              <a-input v-model="form.batch" placeholder="例如：MIDLOAN-2026Q3" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="备注">
          <a-textarea
            v-model="form.remark"
            :rows="2"
            :max-length="200"
            show-word-limit
            placeholder="协作说明、风险点、依赖等"
          />
        </a-form-item>

        <a-form-item label="特征粒度">
          <a-radio-group v-model="form.featureGranularity">
            <a-radio value="identity_only">身份证号</a-radio>
            <a-radio value="identity_plus_product">身份证号 + 产品号</a-radio>
          </a-radio-group>
          <template #extra>
            <span style="color: var(--color-text-3); font-size: 12px;">区分特征入参维度：仅身份证号 或 身份证号+产品号</span>
          </template>
        </a-form-item>
      </a-card>
    </a-form>

    <template #footer>
      <a-space>
        <a-button v-if="!isReviewMode" @click="handleSaveDraft">保存草稿</a-button>
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" :loading="submitting" @click="handleSubmit">
          注册特征
        </a-button>
      </a-space>
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import SqlEditor from '@/components/common/SqlEditor.vue'
import {
  FIELD_TYPE_OPTIONS,
  DATA_FRESHNESS_OPTIONS,
  L1_CATEGORY_OPTIONS,
  L1_L2_CATEGORY_MAP,
  SOURCE_TYPE_OPTIONS,
  validateFeatureName,
  validateFeatureCnName,
  type RegisterFormPayload
} from '@/modules/variable-hub/mock/variable-management/variable-draft-store'
import { LIST_TYPES } from '@/modules/variable-hub/constants/riskCategoryMap'

/** 注册入口：ledger = 特征台账（新增/审核）；derivation = 需求列表「去注册」*/
type RegisterSource = 'ledger' | 'derivation'

interface Props {
  visible: boolean
  /** 已存在的英文名列表（用于去重校验）*/
  existingNames?: string[]
  /** 已存在的中文名列表（用于去重校验）*/
  existingCnNames?: string[]
  /** 审核模式：传入 A1 需求数据，预填表单 */
  requirementData?: any
  /** requirementData 的数据形态，决定预填/预览的字段映射 */
  source?: RegisterSource
}

const props = withDefaults(defineProps<Props>(), {
  existingNames: () => [],
  existingCnNames: () => [],
  requirementData: () => null,
  source: 'ledger'
})

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (
    e: 'submit',
    payload: RegisterFormPayload & { isReview?: boolean; requirementId?: string; source?: RegisterSource }
  ): void
  (e: 'save-draft', payload: RegisterFormPayload): void
}>()

/** 审核模式：传入了 requirementData */
const isReviewMode = computed(() => !!props.requirementData)
/** 需求列表「去注册」入口（数据源为 DerivationRecord） */
const isDerivationMode = computed(() => isReviewMode.value && props.source === 'derivation')

const drawerTitle = computed(() =>
  isDerivationMode.value ? '注册特征（需求受理单 → B1 标准化注册）' : '注册特征（B1 标准化注册）'
)

/** 顶部说明文案：区分三种入口，无差异化提示时返回空串走默认文案 */
const alertText = computed(() => {
  if (isDerivationMode.value) {
    return '需求受理单中已填写的信息已预填到下方表单，可在此基础上补充/修改。提交后将写入特征台账（状态「已注册」），并在需求列表中关联生成的特征ID。'
  }
  if (isReviewMode.value) {
    return '管理员正在对 A1 需求进行审核+注册。提交后将自动完成：重复备案校验 + 参数映射 + 进入「已注册」状态。所有字段均可编辑修改，流程不做回退。'
  }
  return ''
})

/** 一级分类中文标签（与需求列表/台账展示保持一致）*/
const L1_LABELS: Record<string, string> = {
  credit_grant: '授信',
  loan_usage: '支用',
  repayment: '还款',
  collection: '催收',
  fraud: '欺诈',
  risk_model: '模型'
}

/** A1 需求信息预览项 */
const requirementPreviewItems = computed(() => {
  const r = props.requirementData || {}
  if (props.source === 'derivation') {
    // 新版需求受理单只填「特征名称」和「需求描述」两个字段
    return [
      { label: '需求ID', value: r.id || '-' },
      { label: '特征名称', value: r.featureCnName || r.name || '-' },
      { label: '需求描述', value: r.requirementDescription || r.expectedEffect || '（未填写）' }
    ]
  }
  return [
    { label: '需求ID', value: r.id || r.midloanFeatureId || '-' },
    { label: '需求名称', value: r.requirementName || r.name || '-' },
    { label: '业务场景', value: r.businessScenario || r.description || '-' },
    { label: '预期效果', value: r.expectedEffect || '（未填写）' },
    { label: '业务逻辑', value: r.businessLogic || r.processingLogic || '（未填写）' },
    { label: '代码逻辑', value: r.codeLogic || '（未填写）' },
    { label: '默认值', value: r.defaultValue || '（未填写）' },
    { label: '特征粒度', value: r.featureGranularity === 'identity_plus_product' ? '身份证号 + 产品号' : '身份证号' },
    { label: '提出人', value: r.requirementProposer || r.creator || '-' }
  ]
})

function l1Label(val?: string) {
  if (!val) return '（未填写）'
  return L1_LABELS[val] ? `${L1_LABELS[val]}（${val}）` : val
}

const submitting = ref(false)
const formRef = ref<any>(null)

// ============ 表单初始值 ============
function createEmptyForm(): RegisterFormPayload {
  return {
    name: '',
    featureCnName: '',
    fieldType: 'Integer',
    businessLogic: '',
    codeLogic: '',
    defaultValue: '',
    description: '',
    featureGranularity: 'identity_only',
    category: 'midloan_behavior',
    l1Category: '',
    l2Category: '',
    dataFreshness: undefined,
    sourceTableAfter: '',
    sourceTableBefore: '',
    sourceField: '',
    dataTableName: '',
    dwTaskId: '',
    productScope: '',
    listType: undefined,
    batch: '',
    acceptor: '小李',
    remark: '',
    developer: '',
    creator: '小李',
    sourceType: 'internal',
    excelAttachment: undefined
  }
}

const form = reactive<RegisterFormPayload>(createEmptyForm())

// ============ 校验错误信息 ============
const errors = reactive<{ name?: string; featureCnName?: string }>({})

// ============ 联动：一级/二级分类（预填值不在字典内时兜底保留，避免下拉显示为空）============
const l1Options = computed(() => {
  const base = L1_CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: l1Label(o.value) }))
  const cur = form.l1Category
  if (cur && !base.some((o) => o.value === cur)) base.unshift({ value: cur, label: l1Label(cur) })
  return base
})

const l2Options = computed(() => {
  if (!form.l1Category) return []
  const list = (L1_L2_CATEGORY_MAP[form.l1Category] || []).map((v) => ({ value: v, label: v }))
  const cur = form.l2Category
  if (cur && !list.some((o) => o.value === cur)) list.unshift({ value: cur, label: cur })
  return list
})

function onL1Change() {
  form.l2Category = ''
}

// ============ 步骤高亮（按当前已填字段）============
const currentStep = computed(() => {
  if (!form.l1Category || !form.l2Category) return 1
  if (!form.dataFreshness && !form.sourceTableAfter && !form.sourceTableBefore) return 2
  if (!form.developer) return 3
  return 4
})

// ============ 开发人员选项（数仓团队，预填值不在列表内时保留原值）============
const DEVELOPER_OPTIONS = [
  { value: '王数仓', label: '王数仓' },
  { value: '数仓_A', label: '数仓_A' },
  { value: '数仓_B', label: '数仓_B' },
  { value: '数仓_C', label: '数仓_C' }
]

const developerOptions = computed(() => {
  const cur = form.developer
  if (cur && !DEVELOPER_OPTIONS.some((o) => o.value === cur)) {
    return [{ value: cur, label: cur }, ...DEVELOPER_OPTIONS]
  }
  return DEVELOPER_OPTIONS
})

// ============ 名单类型（与需求列表 mock 数据共用码值字典）============
const LIST_TYPE_OPTIONS = LIST_TYPES

// ============ 校验函数 ============
function validateNameOnBlur() {
  const err = validateFeatureName(form.name || '', props.existingNames)
  errors.name = err || undefined
}

function validateCnNameOnBlur() {
  const err = validateFeatureCnName(form.featureCnName || '', props.existingCnNames)
  errors.featureCnName = err || undefined
}

function validateAll(): boolean {
  const nameErr = validateFeatureName(form.name || '', props.existingNames)
  const cnErr = validateFeatureCnName(form.featureCnName || '', props.existingCnNames)
  errors.name = nameErr || undefined
  errors.featureCnName = cnErr || undefined
  if (nameErr) {
    Message.error(nameErr)
    return false
  }
  if (cnErr) {
    Message.error(cnErr)
    return false
  }
  if (!form.fieldType) { Message.error('请选择字段类型'); return false }
  if (!form.businessLogic || !form.businessLogic.trim()) { Message.error('请填写业务逻辑'); return false }
  if (!form.codeLogic || !form.codeLogic.trim()) { Message.error('请填写代码逻辑'); return false }
  if (!form.l1Category) { Message.error('请选择一级分类'); return false }
  if (!form.l2Category) { Message.error('请选择二级分类'); return false }
  if (!form.developer) { Message.error('请选择开发人员'); return false }
  return true
}

// ============ 上传 Excel ============
const MAX_EXCEL_SIZE = 10 * 1024 * 1024

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function beforeUpload(file: any) {
  if (file.size > MAX_EXCEL_SIZE) {
    Message.error('Excel 文件超过 10MB 上限')
    return false
  }
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
    Message.error('仅支持 .xlsx / .xls / .csv 格式')
    return false
  }
  return true
}

function customUpload(option: any) {
  const file = option.fileItem?.file
  if (!file) return
  form.excelAttachment = {
    name: file.name,
    size: file.size,
    uploadedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
  }
  option.onSuccess?.(file)
}

// ============ 提交 / 取消 ============
function handleCancel() {
  emit('update:visible', false)
}

function reset() {
  Object.assign(form, createEmptyForm())
  errors.name = undefined
  errors.featureCnName = undefined
}

function handleSubmit() {
  if (!validateAll()) return
  submitting.value = true
  try {
    const payload: RegisterFormPayload & {
      isReview?: boolean
      requirementId?: string
      source?: RegisterSource
    } = { ...form }
    if (isReviewMode.value && props.requirementData) {
      payload.isReview = true
      payload.requirementId = props.requirementData.id || props.requirementData.midloanFeatureId
      payload.source = props.source
    }
    emit('submit', payload)
  } finally {
    submitting.value = false
  }
}

function handleSaveDraft() {
  // 保存草稿：允许必填项留空，仅记录已填字段
  submitting.value = true
  try {
    emit('save-draft', { ...form })
    Message.success('草稿已保存')
  } finally {
    submitting.value = false
  }
}

// 打开时重置 / 按入口预填 A1 数据
watch(() => props.visible, (v) => {
  if (!v) return
  Object.assign(form, createEmptyForm())
  errors.name = undefined
  errors.featureCnName = undefined

  if (!isReviewMode.value || !props.requirementData) return
  if (props.source === 'derivation') {
    prefillFromDerivation(props.requirementData)
  } else {
    prefillFromRequirementProposal(props.requirementData)
  }
})

/** 需求列表「去注册」：DerivationRecord → B1 表单字段映射（全量预填）*/
function prefillFromDerivation(d: any) {
  form.name = d.featureEnName || ''
  form.featureCnName = d.featureCnName || d.name || ''
  form.fieldType = matchFieldType(d.fieldType)
  form.businessLogic = d.businessLogic || d.processingLogic || form.businessLogic
  form.codeLogic = d.codeLogic || form.codeLogic
  form.defaultValue = d.defaultValue ?? form.defaultValue
  form.description = d.requirementDescription || d.expectedEffect || ''
  form.l1Category = d.l1Category || form.l1Category
  form.l2Category = d.l2Category || form.l2Category
  form.dataFreshness = matchDataFreshness(d.dataFreshness)
  form.sourceTableAfter = d.sourceTableAfter || ''
  form.sourceTableBefore = d.sourceTableBefore || ''
  form.sourceField = d.originFeatureEnName || ''
  form.dataTableName = d.dataTableName || ''
  form.dwTaskId = d.dwTaskId || ''
  form.productScope = d.productScope || ''
  form.listType = d.listType || undefined
  form.batch = d.batch || ''
  form.acceptor = d.acceptor || form.acceptor
  form.developer = d.developer || form.developer
  form.creator = d.proposer || form.creator
  form.remark = d.remark || ''
  form.excelAttachment = d.attachment ? { ...d.attachment } : undefined
}

/** 台账审核模式（状态机 submit_requirement）：A1 需求提案 → B1 表单 */
function prefillFromRequirementProposal(r: any) {
  form.featureCnName = r.requirementName || r.name || r.featureCnName || ''
  form.businessLogic = r.businessLogic || r.processingLogic || form.businessLogic
  form.codeLogic = r.codeLogic || form.codeLogic
  form.defaultValue = r.defaultValue || form.defaultValue
  form.featureGranularity = r.featureGranularity || 'identity_only'
  form.description = r.businessScenario || r.description || ''
  form.creator = r.requirementProposer || r.creator || '小李'
  form.remark = `需求审核注册：${r.id || r.midloanFeatureId || ''}`
}

/** 字段类型归一（批量导入的 Excel 文本可能是 'Integer'/'整数' 等写法）*/
function matchFieldType(raw?: string): RegisterFormPayload['fieldType'] {
  const v = (raw || '').trim().toLowerCase()
  if (!v) return 'String'
  const hit = FIELD_TYPE_OPTIONS.find(
    (o) => o.value.toLowerCase() === v || o.label.toLowerCase().includes(v)
  )
  return (hit?.value || 'String') as RegisterFormPayload['fieldType']
}

/** 数据时效归一（支持码值与中文写法）*/
function matchDataFreshness(raw?: string): RegisterFormPayload['dataFreshness'] {
  const v = (raw || '').replace(/\s/g, '').toLowerCase()
  if (!v) return undefined
  if (v === 'realtime' || v.includes('实时')) return 'realtime'
  if (v === 'offline_t2' || v.includes('t-2')) return 'offline_t2'
  if (v === 'offline_t1' || v.includes('t-1')) return 'offline_t1'
  return undefined
}
</script>

<style scoped lang="less">
.reg-block {
  margin-bottom: 12px;
}
</style>