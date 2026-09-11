<!--
  通用 midloan 状态切换抽屉 · 文档 v2.1 C1 / E0 / E1 / F0 / K1
  - 注册特征（A0·审核注册）：与 VariableRegisterDrawer 审核模式完全一致的 4 区块表单
    （特征核心属性 / 分类信息 / 来源与时效 / 协作信息），所有字段均可编辑。
    注意：实际触发入口（详情页/列表页 submit_requirement）走的是 VariableRegisterDrawer，
    这里的 submit_requirement 分支作为通用入口兜底，内容保持一致。
  - 提开发OA单（C1）：预览特征信息 + 填写 OA 单号 + 说明（接收方=数仓团队，展示但不可改）
  - 业务验证通过（E0·台账内操作）：预览特征信息 + 验证说明（不走OA单）
  - 管理员确认通过（E1·台账内操作）：预览特征信息 + 确认说明（不走OA单）
  - 提投产单（F0）：预览特征信息 + OA投产单号自动生成 + 参数准备提示 + 备注
  - OA 审批通过/驳回（F0.1/F0.2）：审批意见/驳回原因+说明
  - 内数同步失败补表（retry_sync_supplement_table）：先补表再重试
  - 状态修正（管理员专属）：目标状态选择 + 修正原因
-->
<template>
  <a-drawer
    :visible="visible"
    :width="drawerWidth"
    :title="config.title"
    :ok-loading="submitting"
    @cancel="handleCancel"
    @ok="handleSubmit"
  >
    <a-alert v-if="config.alert" :type="config.alertType || 'info'" :show-icon="false" style="margin-bottom: 12px">
      {{ config.alert }}
    </a-alert>

    <!-- 特征信息预览 -->
    <a-card
      v-if="showPreview"
      title="特征信息预览"
      size="small"
      style="margin-bottom: 12px"
    >
      <a-descriptions
        :column="1"
        :data="previewItems"
        :label-style="{ width: '120px', color: 'var(--color-text-2)' }"
        bordered
      />
    </a-card>

    <a-form :model="form" layout="vertical" :disabled="submitting">
      <!-- 注册特征（A0：审核注册，与 VariableRegisterDrawer 审核模式字段一致）-->
      <template v-if="actionKey === 'submit_requirement'">
        <a-alert type="info" :show-icon="false" style="margin-bottom: 12px">
          <p style="margin: 0; font-size: 13px;">
            管理员正在对 A1 需求进行审核+注册。提交后将自动完成：重复备案校验 + 参数映射 + 进入「已注册」状态。所有字段均可编辑修改，流程不做回退。
          </p>
        </a-alert>

        <!-- 区块 1：特征核心属性 -->
        <a-card title="特征核心属性" :bordered="false" size="small" class="reg-block">
          <a-row :gutter="12">
            <a-col :span="12">
              <a-form-item label="特征英文名" required>
                <a-input v-model="form.name" placeholder="例如：MIDLOAN_BIGTXN_CNT_30D" :max-length="30" show-word-limit />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="特征中文名" required>
                <a-input v-model="form.featureCnName" placeholder="例如：近30日大额交易次数" />
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
                <a-input v-model="form.defaultValue" placeholder="例如：0" />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="加工逻辑" required>
            <a-textarea v-model="form.processingLogic" :rows="3" placeholder="描述特征的衍生/计算规则" />
          </a-form-item>
          <a-form-item label="特征粒度" required>
            <a-radio-group v-model="form.featureGranularity">
              <a-radio value="identity_only">身份证号</a-radio>
              <a-radio value="identity_plus_product">身份证号 + 产品号</a-radio>
            </a-radio-group>
          </a-form-item>
          <a-form-item label="特征分类">
            <a-radio-group v-model="form.category">
              <a-radio value="midloan_behavior">贷中行为（一期固定）</a-radio>
            </a-radio-group>
          </a-form-item>
        </a-card>

        <!-- 区块 2：特征分类信息 -->
        <a-card title="特征分类信息" :bordered="false" size="small" class="reg-block">
          <a-row :gutter="12">
            <a-col :span="12">
              <a-form-item label="一级分类" required>
                <a-select v-model="form.l1Category" :options="L1_CATEGORY_OPTIONS" placeholder="请选择一级分类" @change="form.l2Category = ''" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="二级分类（与一级联动）" required>
                <a-select v-model="form.l2Category" :options="l2Options" placeholder="请选择二级分类" :disabled="!form.l1Category" />
              </a-form-item>
            </a-col>
          </a-row>
        </a-card>

        <!-- 区块 3：来源与时效 -->
        <a-card title="来源与时效" :bordered="false" size="small" class="reg-block">
          <a-row :gutter="12">
            <a-col :span="12">
              <a-form-item label="数据时效">
                <a-select v-model="form.dataFreshness" :options="DATA_FRESHNESS_OPTIONS" placeholder="请选择" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="数据源类型">
                <a-select v-model="form.sourceType" :options="SOURCE_TYPE_OPTIONS" placeholder="请选择" />
              </a-form-item>
            </a-col>
          </a-row>
          <a-row :gutter="12">
            <a-col :span="12">
              <a-form-item label="标准化前来源表（非必填）">
                <a-input v-model="form.sourceTableBefore" placeholder="例如：dwd_trade_detail" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="原特征英文名（非必填）">
                <a-input v-model="form.sourceField" placeholder="对应原始字段名" />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="数仓底表" required>
            <a-input v-model="form.dataTableName" placeholder="例如：ads_midloan_bigtxn_30d" />
            <template #extra>
              <span style="color: var(--color-text-3); font-size: 12px;">与「标准化后来源表」一致，默认与特征英文名相同</span>
            </template>
          </a-form-item>
        </a-card>

        <!-- 区块 4：协作信息 -->
        <a-card title="协作信息" :bordered="false" size="small" class="reg-block">
          <a-row :gutter="12">
            <a-col :span="12">
              <a-form-item label="创建人">
                <a-input v-model="form.creator" disabled />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="开发人员（必填，从数仓团队）" required>
                <a-select v-model="form.developer" :options="DEVELOPER_OPTIONS" placeholder="请选择开发人员" />
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
                <a-select v-model="form.listType" :options="LIST_TYPE_OPTIONS" placeholder="可选" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="批次">
                <a-input v-model="form.batch" placeholder="例如：MIDLOAN-2026Q3" />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="审核说明（可选）">
            <a-textarea v-model="form.remark" :rows="2" :max-length="200" show-word-limit placeholder="协作说明、风险点、依赖等" />
          </a-form-item>
        </a-card>
      </template>

      <!-- 提开发 OA 单（C1：批量/单个共用同一表单）-->
      <template v-if="actionKey === 'submit_dev_oa'">
        <!-- 批量模式：选中特征摘要 -->
        <a-card
          v-if="isBatchMode"
          title="批量提单特征"
          size="small"
          style="margin-bottom: 12px"
        >
          <a-descriptions :column="1" bordered :data="[
            { label: '选中数量', value: `${batchSummary?.count ?? 0} 条` },
            { label: '特征列表', value: batchSummary?.names ?? '' }
          ]" :label-style="{ width: '100px' }" />
        </a-card>

        <a-form-item label="需求处理人" required>
          <a-select
            v-model="form.requirementHandler"
            :options="HANDLER_OPTIONS"
            placeholder="请选择需求处理人"
            allow-clear
          />
          <template #extra>
            <span style="color: var(--color-text-3); font-size: 12px;">
              选择负责处理本开发需求的数仓人员
            </span>
          </template>
        </a-form-item>
        <a-form-item label="验收人">
          <a-select
            v-model="form.acceptor"
            :options="ACCEPTOR_OPTIONS"
            placeholder="默认带入需求提出人，可修改"
            allow-clear
          />
          <template #extra>
            <span style="color: var(--color-text-3); font-size: 12px;">
              <icon-info-circle /> 默认需求提出人：{{ form.requirementProposer || '—' }}
            </span>
          </template>
        </a-form-item>
        <a-form-item label="需求名称" required>
          <a-input
            v-model="form.requirementName"
            placeholder="请填写需求名称，如：近30日大额交易次数特征开发"
            :max-length="100"
            show-word-limit
          />
        </a-form-item>
        <a-form-item label="需求说明" required>
          <a-textarea
            v-model="form.requirementDescription"
            :rows="4"
            :max-length="500"
            show-word-limit
            placeholder="请详细描述需求内容，包括加工逻辑、字段说明、数据来源等"
          />
        </a-form-item>

        <!-- 批量模式：字段选择 + 预览表格 -->
        <template v-if="isBatchMode">
          <a-form-item label="需求清单字段">
            <a-checkbox-group
              :model-value="selectedFieldKeys"
              @change="(vals: string[]) => {
                selectedFieldKeys = vals
                if (attachmentList.length > 0) regenerateBatchRequirementFile()
              }"
            >
              <a-checkbox v-for="f in REQUIREMENT_FIELDS" :key="f.key" :value="f.key">
                {{ f.label }}
              </a-checkbox>
            </a-checkbox-group>
            <template #extra>
              <span style="color: var(--color-text-3); font-size: 12px;">
                勾选需要的字段，下方表格预览实时更新
              </span>
            </template>
          </a-form-item>

          <a-form-item label="需求清单预览">
            <a-table
              :columns="previewColumns"
              :data="previewRowData"
              :pagination="false"
              :bordered="{ cell: true, wrapper: true }"
              :max-height="260"
              size="small"
              stripe
            >
              <template #empty>
                <a-empty description="暂无选中特征" />
              </template>
            </a-table>
            <template #extra>
              <a-button type="outline" size="small" @click="regenerateBatchRequirementFile">
                <icon-refresh /> 重新生成 Excel
              </a-button>
            </template>
          </a-form-item>
        </template>

        <a-form-item label="附件上传">
          <a-upload
            :file-list="attachmentList"
            :auto-upload="true"
            :custom-request="customAttachmentUpload"
            :before-upload="beforeAttachmentUpload"
            :show-file-list="true"
            :limit="5"
            multiple
            @change="(fileList: any[]) => attachmentList = fileList"
          >
            <template #upload-button>
              <a-button type="outline">
                <icon-upload /> 上传附件
              </a-button>
            </template>
          </a-upload>
          <template #extra>
            <span style="color: var(--color-text-3); font-size: 12px;">
              支持上传需求文档、数据说明等附件，单个文件不超过 10MB，最多 5 个
            </span>
          </template>
        </a-form-item>
        <a-form-item label="OA 开发单号">
          <a-input :model-value="form.generatedOaOrderId || '提交后由 OA 系统自动生成'" disabled />
          <template #extra>
            <span style="color: var(--color-text-3); font-size: 12px;">
              <icon-info-circle /> OA 单号由 OA 系统提交后返回，无需人工填写
            </span>
          </template>
        </a-form-item>
      </template>

      <!-- 业务验证通过（E0·台账内操作，不走OA单）-->
      <template v-else-if="actionKey === 'business_verify_pass'">
        <a-alert type="success" :show-icon="false" style="margin-bottom: 12px">
          <p style="margin: 0; font-size: 13px;">
            确认后特征状态将变更为「业务已验证」，等待管理员确认（台账内操作，不走OA单）。
          </p>
        </a-alert>
        <a-form-item label="验证说明（可选）">
          <a-textarea v-model="form.remark" :rows="3" placeholder="可填写验证结论/验证点说明" />
        </a-form-item>
      </template>

      <!-- 管理员确认通过（E1·台账内操作，不走OA单）-->
      <template v-else-if="actionKey === 'admin_confirm_pass'">
        <a-alert type="success" :show-icon="false" style="margin-bottom: 12px">
          <p style="margin: 0; font-size: 13px;">
            确认后特征状态将变更为「管理员已确认」，可提投产单上线（台账内操作，不走OA单）。
          </p>
        </a-alert>
        <a-form-item label="确认说明（可选）">
          <a-textarea v-model="form.remark" :rows="3" placeholder="可填写确认意见/注意事项" />
        </a-form-item>
      </template>

      <!-- 提投产单（F0：OA审批通过→参数准备→内数注册中）-->
      <template v-else-if="actionKey === 'submit_production_order'">
        <a-alert type="warning" :show-icon="false" style="margin-bottom: 12px">
          <p style="margin: 0 0 4px 0; font-weight: 500;">上线确认</p>
          <p style="margin: 0; font-size: 13px;">
            提产后将依次完成：OA投产单审批 → 系统自动参数映射+有效性验证 → 内数API注册（INT-01）→ 特征中心注册（INT-03）。
            请确认数据底表/接口字段已准备就绪。
          </p>
        </a-alert>
        <a-form-item label="OA 投产单号">
          <a-input :model-value="form.generatedOaOrderId || '提交后由 OA 系统自动生成'" disabled />
          <template #extra>
            <span style="color: var(--color-text-3); font-size: 12px;">
              <icon-info-circle /> OA 投产单号由 OA 系统提交后返回，无需人工填写
            </span>
          </template>
        </a-form-item>
        <a-form-item label="备注（可选）">
          <a-textarea v-model="form.remark" :rows="3" placeholder="可填写上线批次/灰度策略等说明" />
        </a-form-item>
      </template>

      <!-- OA 投产审批通过（F0.1：通过后系统自动参数映射+内数注册）-->
      <template v-else-if="actionKey === 'oa_production_approve'">
        <a-alert type="success" :show-icon="false" style="margin-bottom: 12px">
          <p style="margin: 0; font-size: 13px;">
            审批通过后将依次进入：参数准备 → 内数注册 → 特征中心注册。系统自动完成参数映射+有效性验证。
          </p>
        </a-alert>
        <a-form-item label="审批意见（可选）">
          <a-textarea v-model="form.remark" :rows="3" placeholder="可填写审批意见/上线批次/灰度策略等说明" />
        </a-form-item>
      </template>

      <!-- OA 投产审批驳回（F0.2：驳回原因必填）-->
      <template v-else-if="actionKey === 'oa_production_reject'">
        <a-alert type="warning" :show-icon="false" style="margin-bottom: 12px">
          <p style="margin: 0; font-size: 13px;">
            驳回后将回退到「管理员已确认」，管理员修正后可重新提投产单。
          </p>
        </a-alert>
        <a-form-item label="驳回原因" required>
          <a-radio-group v-model="form.reason">
            <a-radio value="参数不全">参数不全</a-radio>
            <a-radio value="数据底表未就绪">数据底表未就绪</a-radio>
            <a-radio value="接口字段未对齐">接口字段未对齐</a-radio>
            <a-radio value="上线时机不合适">上线时机不合适</a-radio>
            <a-radio value="其他">其他</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="详细说明（必填）" required>
          <a-textarea v-model="form.remark" :rows="3" placeholder="请详细说明驳回原因，便于管理员修正" />
        </a-form-item>
      </template>

      <!-- 内数同步失败补充数据底表（仅在 internal_sync_failed 状态下打开）-->
      <template v-else-if="actionKey === 'retry_sync_supplement_table'">
        <a-alert type="warning" :show-icon="false" style="margin-bottom: 12px">
          <p style="margin: 0; font-size: 13px;">
            内数同步失败通常因为数据底表名称缺失。请先补充数据底表，再重新触发同步。
          </p>
        </a-alert>
        <a-form-item label="数据底表名称（HIVE 库.表）" required>
          <a-input v-model="form.tableName" placeholder="例如：risk_dw.ads_midloan_feature_001" allow-clear />
          <template #extra>
            <span style="color: var(--color-text-3); font-size: 12px;">
              即标准化后的 Hive 表，需与数仓已上线的表一致；库名与表名合并为一个值填写
            </span>
          </template>
        </a-form-item>
        <a-form-item label="补充说明（可选）">
          <a-textarea v-model="form.remark" :rows="3" placeholder="可填写数据底表来源/字段说明等" />
        </a-form-item>
      </template>

      <!-- 特征归档（管理员专属 · 仅需求提出 / 已注册阶段）-->
      <template v-else-if="actionKey === 'archive_variable'">
        <a-alert type="warning" :show-icon="false" style="margin-bottom: 12px">
          <p style="margin: 0; font-size: 13px;">
            归档后特征将进入「已归档」终态，从主列表移除，可通过「已归档」筛选查看。归档操作不可恢复，请谨慎填写原因。
          </p>
        </a-alert>
        <a-form-item label="当前状态">
          <a-input :model-value="props.variableData?.midloanStatus || props.variableData?.status || '-'" disabled />
        </a-form-item>
        <a-form-item label="归档原因" required>
          <a-radio-group v-model="form.reason">
            <a-radio value="业务取消">业务取消</a-radio>
            <a-radio value="需求重复">需求重复</a-radio>
            <a-radio value="数据源不可用">数据源不可用</a-radio>
            <a-radio value="字段定义变更">字段定义变更</a-radio>
            <a-radio value="其他">其他</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="详细说明（必填）" required>
          <a-textarea v-model="form.remark" :rows="3" placeholder="请详细说明归档原因，便于审计追溯" />
        </a-form-item>
      </template>

      <!-- 状态修正（管理员专属）：跨系统状态不可修正，仅展示可修正的目标态 -->
      <template v-else-if="actionKey === 'correct_status'">
        <a-alert type="warning" :show-icon="false" style="margin-bottom: 12px">
          <p style="margin: 0; font-size: 13px;">
            跨系统状态（内数同步中/特征中心同步中/已上线/已下线）不可手动修正。
            以下为可修正的离线分析阶段状态（管理员专用）。
          </p>
        </a-alert>
        <a-form-item label="当前状态">
          <a-input :model-value="props.variableData?.midloanStatus || props.variableData?.status || '-'" disabled />
        </a-form-item>
        <a-form-item label="修正为" required>
          <a-select v-model="form.targetStatus" placeholder="选择目标状态">
            <a-option
              v-for="opt in correctableOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="修正原因（必填）" required>
          <a-textarea v-model="form.remark" :rows="3" placeholder="请说明修正原因（必填，记录审计日志）" />
        </a-form-item>
      </template>
    </a-form>
  </a-drawer>
</template>

<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import { Message } from '@arco-design/web-vue'
import * as XLSX from 'xlsx'
import {
  FIELD_TYPE_OPTIONS,
  DATA_FRESHNESS_OPTIONS,
  L1_CATEGORY_OPTIONS,
  L1_L2_CATEGORY_MAP,
  SOURCE_TYPE_OPTIONS
} from '@/modules/variable-hub/mock/variable-management/variable-draft-store'
import { UserContext } from '@/modules/variable-hub/mock/risk-feature/permissions'
import { LIST_TYPES } from '@/modules/variable-hub/constants/riskCategoryMap'

interface Props {
  visible: boolean
  actionKey: 'submit_requirement' | 'submit_dev_oa' | 'business_verify_pass' | 'admin_confirm_pass' | 'submit_production_order' | 'oa_production_approve' | 'oa_production_reject' | 'retry_sync_supplement_table' | 'archive_variable' | 'correct_status'
  /** 当前特征数据（用于预览）*/
  variableData?: any
  /** 批量操作时的选中记录列表（非空时为批量模式）*/
  batchRecords?: any[]
}

interface Emits {
  (e: 'update:visible', val: boolean): void
  (e: 'submit', payload: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const submitting = ref(false)
const form = reactive<any>({
  // 注册特征字段（submit_requirement）
  name: '',
  featureCnName: '',
  fieldType: 'Integer',
  defaultValue: '',
  processingLogic: '',
  featureGranularity: 'identity_only',
  category: 'midloan_behavior',
  l1Category: '',
  l2Category: '',
  dataFreshness: undefined,
  sourceType: 'internal',
  sourceTableBefore: '',
  sourceField: '',
  dataTableName: '',
  productScope: '',
  listType: undefined,
  batch: '',
  creator: '小李',
  developer: '',
  remark: '',
  _lastSyncedName: '',
  // 其他动作字段
  oaOrderId: '',
  verifyOaOrderId: '',
  reason: '',
  offlineDate: '',
  generatedOaOrderId: '',
  standardizedAttachment: true,
  targetStatus: '',
  tableName: '',
  // 提开发OA单字段
  requirementHandler: '',
  requirementName: '',
  requirementDescription: '',
  requirementProposer: '',
  acceptor: '',
  attachments: [] as any[]
})

/** 二级分类联动选项（与 VariableRegisterDrawer 保持一致）*/
const l2Options = computed(() => {
  if (!form.l1Category) return []
  return (L1_L2_CATEGORY_MAP[form.l1Category] || []).map((v) => ({ value: v, label: v }))
})

/** 名单类型（与注册表单 / 台账列表共用码值字典：none / white / black / gray）*/
const LIST_TYPE_OPTIONS = LIST_TYPES

/** 开发人员（数仓团队）*/
const DEVELOPER_OPTIONS = [
  { value: '王数仓', label: '王数仓' },
  { value: '数仓_A', label: '数仓_A' },
  { value: '数仓_B', label: '数仓_B' },
  { value: '数仓_C', label: '数仓_C' }
]

/** 状态修正可选项（管理员专用 · 与 allowedActionsByStatus 中 correctableStatuses 对齐）*/
const correctableOptions = [
  { value: 'requirement_proposal', label: '需求提出' },
  { value: 'registered', label: '已注册' },
  { value: 'developing_oa', label: '开发中（OA）' },
  { value: 'dw_online', label: '数仓已上线' },
  { value: 'business_acceptance', label: '待业务验证' },
  { value: 'business_verified', label: '业务已验证' },
  { value: 'admin_confirmed', label: '管理员已确认' },
  { value: 'oa_production_reviewing', label: 'OA 投产审批中' },
  { value: 'dw_online_failed', label: '数仓上线失败' },
  { value: 'internal_sync_failed', label: '内数同步失败' },
  { value: 'variable_sync_failed', label: '特征中心同步失败' },
  { value: 'offline_failed', label: '下线接收失败' }
]

/** 是否为批量模式 */
const isBatchMode = computed(() => props.actionKey === 'submit_dev_oa' && (props.batchRecords?.length ?? 0) > 0)

/** 抽屉宽度（提开发OA单表单更宽）*/
const drawerWidth = computed(() => {
  if (props.actionKey === 'submit_dev_oa') {
    return isBatchMode.value ? 920 : 720
  }
  return 540
})

/** 批量模式下的选中记录摘要 */
const batchSummary = computed(() => {
  if (!isBatchMode.value) return null
  const records = props.batchRecords || []
  return {
    count: records.length,
    names: records.map(r => r.featureCnName || r.name || r.id).join('、'),
    ids: records.map(r => r.id)
  }
})

/** 需求处理人候选列表 */
const HANDLER_OPTIONS = [
  { value: '王数仓', label: '王数仓（数仓团队）' },
  { value: '数仓_A', label: '数仓_A（数仓团队）' },
  { value: '数仓_B', label: '数仓_B（数仓团队）' },
  { value: '数仓_C', label: '数仓_C（数仓团队）' },
  { value: '小李', label: '小李（风险数据成员）' },
  { value: '小张', label: '小张（风险数据管理员）' }
]

/** 验收人候选列表 */
const ACCEPTOR_OPTIONS = [
  { value: '小李', label: '小李（风险数据成员）' },
  { value: '小张', label: '小张（风险数据管理员）' },
  { value: '小王', label: '小王（数字社区管理员）' },
  { value: '数据应用团队', label: '数据应用团队' }
]

/** 数据时效映射 */
const DATA_FRESHNESS_LABELS: Record<string, string> = {
  realtime: '实时',
  offline_t1: '离线 T-1（次日）',
  offline_t2: '离线 T-2（隔日）'
}

/** 需求清单字段定义（key 映射到特征数据字段）*/
const REQUIREMENT_FIELDS = [
  // 协作信息前置：开发人 / 验收人员取自 B1 协作信息（v.developer / v.acceptor）
  { key: 'developer', label: '开发人', defaultChecked: true },
  { key: 'acceptor', label: '验收人员', defaultChecked: true },
  { key: 'l1Category', label: '一级分类', defaultChecked: true },
  { key: 'l2Category', label: '二级分类', defaultChecked: true },
  { key: 'code', label: '特征名称', defaultChecked: true },
  { key: 'featureCnName', label: '中文名', defaultChecked: true },
  { key: 'processingLogic', label: '加工逻辑', defaultChecked: true },
  { key: 'fieldType', label: '字段类型', defaultChecked: true },
  { key: 'defaultValue', label: '默认值', defaultChecked: true },
  { key: 'productScope', label: '产品范围', defaultChecked: false },
  { key: 'dataFreshness', label: '数据时效', defaultChecked: true },
  { key: 'description', label: '备注信息', defaultChecked: true }
]

/** 用户当前选中的字段 key 列表 */
const selectedFieldKeys = ref<string[]>(REQUIREMENT_FIELDS.filter(f => f.defaultChecked).map(f => f.key))

/** 列顺序统一按 REQUIREMENT_FIELDS 定义顺序，避免勾选先后导致列序跳动 */
const orderedFieldKeys = computed(() =>
  REQUIREMENT_FIELDS.filter((f) => selectedFieldKeys.value.includes(f.key)).map((f) => f.key)
)

/** 字段值映射：根据 key 从特征记录中取值 */
function getFieldValue(r: any, key: string): string {
  if (key === 'featureCnName') return r.featureCnName || r.name || '-'
  if (key === 'code') return r.code || r.featureEnName || '-'
  if (key === 'productScope') return r.productScope || r.profile?.productScope || '-'
  if (key === 'dataFreshness') return DATA_FRESHNESS_LABELS[r.dataFreshness] || r.dataFreshness || '-'
  return r[key] || '-'
}

/** 表格预览用的列配置（基于勾选字段，顺序按字段定义）*/
const previewColumns = computed(() => {
  return [
    ...orderedFieldKeys.value.map(key => {
      const def = REQUIREMENT_FIELDS.find(f => f.key === key)
      return {
        title: def?.label || key,
        dataIndex: key,
        width: key === 'processingLogic' ? 220 : key === 'description' ? 180 : key === 'developer' || key === 'acceptor' ? 100 : 120
      }
    })
  ]
})

/** 表格预览用的数据 */
const previewRowData = computed(() => {
  return (props.batchRecords || []).map((r, idx) => {
    const row: any = { __idx: idx + 1 }
    orderedFieldKeys.value.forEach(key => {
      row[key] = getFieldValue(r, key)
    })
    return row
  })
})

/** 根据用户选中的字段重新生成 Excel 附件 */
function regenerateBatchRequirementFile() {
  if (!isBatchMode.value) return
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const keys = orderedFieldKeys.value
  const header = keys.map(key => REQUIREMENT_FIELDS.find(f => f.key === key)?.label || key)
  const rows = (props.batchRecords || []).map(r => keys.map(key => getFieldValue(r, key)))

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
  ws['!cols'] = keys.map(key => {
    if (key === 'processingLogic') return { wch: 50 }
    if (key === 'description') return { wch: 30 }
    if (key === 'developer' || key === 'acceptor') return { wch: 12 }
    return { wch: 18 }
  })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '特征开发需求清单')
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const file = new File([blob], `特征开发需求清单_${dateStr}.xlsx`, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  attachmentList.value = [{
    uid: `batch-req-${Date.now()}`,
    name: file.name,
    url: '',
    file,
    status: 'done'
  }]
}

/** 移除生成的默认附件 */
function removeGeneratedAttachment(file: any) {
  attachmentList.value = attachmentList.value.filter(f => f.uid !== file.uid)
}

/** 切换字段选中状态时重新生成 Excel */
function toggleField(key: string, checked: boolean) {
  if (checked) {
    if (!selectedFieldKeys.value.includes(key)) selectedFieldKeys.value.push(key)
  } else {
    selectedFieldKeys.value = selectedFieldKeys.value.filter(k => k !== key)
  }
  if (isBatchMode.value && attachmentList.value.length > 0) {
    regenerateBatchRequirementFile()
  }
}

/** 附件列表 */
const attachmentList = ref<any[]>([])

/** 附件上传前校验 */
const beforeAttachmentUpload = (file: File) => {
  const isLt10M = file.size / 1024 / 1024 < 10
  if (!isLt10M) {
    Message.warning('附件大小不能超过 10MB')
    return false
  }
  return true
}

/** 附件自定义上传（mock） */
const customAttachmentUpload = (option: any) => {
  const { fileItem, onSuccess } = option
  // mock 上传：模拟延迟后返回文件信息
  setTimeout(() => {
    onSuccess?.({
      ...fileItem,
      url: `https://mock.example.com/files/${fileItem.uid}`,
      name: fileItem.name
    })
  }, 300)
}

/** 哪些 action 需要预览特征信息 */
const showPreview = computed(() => {
  if (isBatchMode.value) return false // 批量模式不显示单条预览
  return ['submit_dev_oa', 'business_verify_pass', 'admin_confirm_pass', 'submit_production_order'].includes(props.actionKey)
})

/** 预览字段映射（文档 E1 R04 明确要求展示的字段）*/
const previewItems = computed(() => {
  const v = props.variableData || {}
  return [
    { label: '特征ID', value: v.id || v.featureId || '-' },
    { label: '特征中文名', value: v.featureCnName || v.name || '-' },
    { label: '特征英文名', value: v.featureEnName || v.code || '-' },
    { label: '数据底表名称', value: v.dataTableName || '（未填写）' },
    { label: '加工逻辑', value: v.processingLogic || '-' },
    { label: '字段类型', value: v.fieldType || '-' },
    { label: '一级分类', value: v.l1Category || '-' },
    { label: '二级分类', value: v.l2Category || '-' }
  ]
})

/** 验收人候选（带默认标记）*/
const acceptorOptions = computed(() => {
  const v = props.variableData || {}
  // 文档 E1 R03：默认取 B1 协作信息中的验收人；B1 未填则默认取创建人
  const defaultAcceptor = v.acceptor || v.creator || '小李'
  const all = [
    { value: '小李', label: '小李（风险数据成员）' },
    { value: '小张', label: '小张（风险数据管理员）' },
    { value: '小王', label: '小王（数字社区管理员）' },
    { value: '数据应用团队', label: '数据应用团队' },
    { value: defaultAcceptor, label: defaultAcceptor }
  ]
  // 去重
  const seen = new Set<string>()
  const unique = all.filter(opt => {
    if (seen.has(opt.value)) return false
    seen.add(opt.value)
    return true
  })
  // 标记默认项
  return unique.map(opt => ({
    ...opt,
    isDefault: opt.value === defaultAcceptor
  }))
})

const defaultAcceptorHint = computed(() => {
  const v = props.variableData || {}
  const defaultAcceptor = v.acceptor || v.creator || '小李'
  if (v.acceptor) {
    return `已自动带入协作信息中的验收人：${defaultAcceptor}`
  }
  if (v.creator) {
    return `协作信息未填写验收人，已默认带入创建人：${defaultAcceptor}`
  }
  return `未配置验收人，默认：${defaultAcceptor}`
})

const config = computed(() => {
  const map: Record<string, { title: string; alert: string; alertType?: 'info' | 'success' | 'warning' | 'error' | 'normal' }> = {
    submit_requirement: {
      title: '注册特征（B1 标准化注册）',
      alert: '管理员正在对 A1 需求进行审核+注册，提交后进入「已注册」状态，流程不做回退。',
      alertType: 'info'
    },
    submit_dev_oa: {
      title: isBatchMode.value ? `提开发 OA 单（批量 · ${batchSummary.value?.count ?? 0} 条）` : '提开发 OA 单',
      alert: '本操作会向 OA 系统提交开发单（接收方=数仓团队）。提交后系统自动等待「数仓回调」。',
      alertType: 'info'
    },
    business_verify_pass: {
      title: '业务验证通过',
      alert: '台账内操作（不走OA单）。确认后进入「业务已验证」，等待管理员确认。',
      alertType: 'success'
    },
    admin_confirm_pass: {
      title: '管理员确认通过',
      alert: '台账内操作（不走OA单）。确认后进入「管理员已确认」，可提投产单上线。',
      alertType: 'success'
    },
    submit_production_order: {
      title: '提投产单',
      alert: '上线确认：提产后将依次完成 OA审批→参数映射+验证→内数注册→特征中心注册。',
      alertType: 'warning'
    },
    oa_production_approve: {
      title: 'OA 投产审批通过',
      alert: '审批通过后系统将依次进入参数准备、内数注册、特征中心注册。',
      alertType: 'success'
    },
    oa_production_reject: {
      title: 'OA 投产审批驳回',
      alert: '驳回后状态将回退到「管理员已确认」，请详细填写驳回原因。',
      alertType: 'warning'
    },
    retry_sync_supplement_table: {
      title: '补充数据底表·重新同步',
      alert: '请先补充数据底表名称，再触发内数同步。',
      alertType: 'warning'
    },
    archive_variable: {
      title: '特征归档',
      alert: '归档后特征进入「已归档」终态，从主列表移除，可通过「已归档」筛选查看。',
      alertType: 'warning'
    },
    correct_status: {
      title: '状态修正（管理员）',
      alert: '仅风险数据管理员可执行；跨系统状态不可手动修正。修正操作将记录审计日志。',
      alertType: 'warning'
    }
  }
  return map[props.actionKey] || { title: '操作', alert: '' }
})

// 打开抽屉时重置表单
watch(() => props.visible, (v) => {
  if (v) {
    form.oaOrderId = ''
    form.acceptor = ''
    form.verifyOaOrderId = ''
    form.reason = ''
    form.offlineDate = ''
    form.remark = ''
    form.targetStatus = ''
    form.tableName = props.variableData?.dataTableName || ''
    // 提开发OA单：重置新字段
    if (props.actionKey === 'submit_dev_oa') {
      // 需求提出人：从 UserContext 中获取当前用户名
      const proposer = UserContext.get().name || '小李'
      form.requirementHandler = ''
      form.requirementName = ''
      form.requirementDescription = ''
      form.requirementProposer = proposer
      form.acceptor = proposer // 默认验收人 = 需求提出人
      form.attachments = []
      // 批量模式：自动生成需求清单附件；单个模式：清空附件
      if (isBatchMode.value) {
        // 重置字段选择为默认
        selectedFieldKeys.value = REQUIREMENT_FIELDS.filter(f => f.defaultChecked).map(f => f.key)
        regenerateBatchRequirementFile()
      } else {
        attachmentList.value = []
        // 单个模式：从特征数据预填需求名称
        if (props.variableData) {
          form.requirementName = `${props.variableData.featureCnName || props.variableData.name || ''}开发需求`
        }
      }
    }
    // submit_requirement：进入审核注册模式，重置注册表单字段，并预填默认值
    if (props.actionKey === 'submit_requirement') {
      form.name = props.variableData?.code || props.variableData?.featureEnName || props.variableData?.name || ''
      form.featureCnName = props.variableData?.featureCnName || props.variableData?.name || ''
      form.fieldType = props.variableData?.fieldType || 'Integer'
      form.processingLogic = props.variableData?.processingLogic || ''
      form.defaultValue = props.variableData?.defaultValue || ''
      form.featureGranularity = props.variableData?.featureGranularity || 'identity_only'
      form.category = props.variableData?.category || 'midloan_behavior'
      form.l1Category = props.variableData?.l1Category || ''
      form.l2Category = props.variableData?.l2Category || ''
      form.dataFreshness = props.variableData?.dataFreshness || undefined
      form.sourceType = props.variableData?.sourceType || 'internal'
      form.sourceTableBefore = props.variableData?.sourceTableBefore || ''
      form.sourceField = props.variableData?.sourceField || ''
      form.productScope = props.variableData?.productScope || ''
      form.listType = props.variableData?.listType || undefined
      form.batch = props.variableData?.batch || ''
      form.developer = props.variableData?.developer || ''
      form.acceptor = props.variableData?.acceptor || props.variableData?.creator || '小李'
      form.creator = props.variableData?.creator || '小李'
      // 数仓底表（合并后的字段）：默认与特征英文名一致
      form.dataTableName = props.variableData?.dataTableName || form.name || ''
    }
  }
})

/** 注册特征模式：特征英文名变化时，默认同步数仓底表（用户可手动调整）*/
watch(() => form.name, (n) => {
  if (props.actionKey === 'submit_requirement' && (!form.dataTableName || form.dataTableName === form._lastSyncedName)) {
    form.dataTableName = n
    form._lastSyncedName = n
  }
})

function handleCancel() {
  emit('update:visible', false)
}

async function handleSubmit() {
  if (props.actionKey === 'oa_production_reject' && (!form.reason || !form.remark?.trim())) {
    Message.warning('请选择驳回原因并填写详细说明')
    return
  }
  if (props.actionKey === 'retry_sync_supplement_table' && !form.tableName?.trim()) {
    Message.warning('请填写数据底表名称')
    return
  }
  if (props.actionKey === 'archive_variable' && (!form.reason || !form.remark?.trim())) {
    Message.warning('请选择归档原因并填写详细说明')
    return
  }
  if (props.actionKey === 'correct_status' && (!form.targetStatus || !form.remark?.trim())) {
    Message.warning('请选择目标状态并填写修正原因')
    return
  }
  // 提开发OA单：校验必填字段
  if (props.actionKey === 'submit_dev_oa') {
    if (!form.requirementHandler) {
      Message.warning('请选择需求处理人')
      return
    }
    if (!form.requirementName?.trim()) {
      Message.warning('请填写需求名称')
      return
    }
    if (!form.requirementDescription?.trim()) {
      Message.warning('请填写需求说明')
      return
    }
  }
  submitting.value = true
  try {
    const payload = { ...form }
    // 提开发OA单：附加附件信息到 payload
    if (props.actionKey === 'submit_dev_oa') {
      payload.attachments = attachmentList.value.map(f => ({
        name: f.name,
        uid: f.uid,
        url: f.url,
        size: f.file?.size
      }))
    }
    emit('submit', payload)
  } finally {
    submitting.value = false
  }
}
</script>