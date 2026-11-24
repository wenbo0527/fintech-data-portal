<template>
  <PageContainer>
    <PageHeader
      title="表级权限审批台"
      sub-title="表级权限 · 分级驱动四级审批流（挡板演示）"
    >
      <template #extra>
        <a-space wrap>
          <a-tag :color="roleColor">审批身份：{{ adminActor }}</a-tag>
          <a-button @click="goApply">
            <template #icon><icon-plus /></template>
            去申请权限
          </a-button>
          <a-button @click="goManagement">
            <template #icon><icon-list /></template>
            授权台账
          </a-button>
        </a-space>
      </template>
    </PageHeader>

    <div class="content-wrapper">
      <!-- 角色提示：演示环境不做强管控，仅引导 -->
      <a-alert :type="isAdminRole ? 'info' : 'warning'" show-icon class="role-alert">
        <template #title>
          <span v-if="isAdminRole">
            敏感表由数据管理员单审；高敏表需「管理员通过 + DBA 二次确认」双审，通过后申请人即刻拿到授权。
          </span>
          <span v-else>
            当前身份「{{ adminActor }}」不是数据治理者/系统管理员。演示环境不做强管控，仍可直接操作审批；
            建议用右上角角色切换为「数据治理者」再看审批留痕。
          </span>
        </template>
        字段分级变更（元数据 · 数据分级）走本审批台的「分级变更审批」Tab：L1/L2 治理员单审通过即写入分级目录，
        L3/L4 需「治理员通过 + 管理员复核」双审，复核通过才上线生效。
      </a-alert>

      <a-card :bordered="false">
        <a-tabs v-model:active-key="activeTab" size="large">
          <!-- ==================== 管理员待审队列 ==================== -->
          <a-tab-pane key="admin" :title="`管理员待审（${adminQueue.length}）`">
            <div class="toolbar">
              <a-space wrap>
                <a-select v-model="filterLevel" :options="levelOptions" placeholder="表分级" allow-clear style="width: 140px" />
                <a-input-search
                  v-model="keyword"
                  placeholder="搜索单号 / 表名 / 申请人"
                  allow-clear
                  style="width: 240px"
                />
                <a-button :disabled="!filteredAdmin.length" @click="selectAllFiltered">
                  选中当前筛选（{{ filteredAdmin.length }}）
                </a-button>
                <a-button
                  type="primary"
                  :loading="batchLoading"
                  :disabled="!selectedKeys.length"
                  @click="handleBatchApprove"
                >
                  <template #icon><icon-thumb-up /></template>
                  批量通过（{{ selectedKeys.length }}）
                </a-button>
                <span class="toolbar-hint">
                  高敏（红标）申请通过后自动转入下方「DBA 确认队列」，不会直接生效
                </span>
              </a-space>
            </div>

            <a-table
              :columns="adminColumns"
              :data="filteredAdmin"
              row-key="id"
              :row-selection="rowSelection"
              :expandable="{ width: 44 }"
              :pagination="{ pageSize: 8, showTotal: true, sizeCanChange: false }"
              :scroll="{ x: 1240 }"
              size="medium"
              @selection-change="handleSelectionChange"
            >
              <template #expand-row="{ record }">
                <div class="expand-panel">
                  <div class="expand-block">
                    <div class="expand-title">申请理由</div>
                    <div class="expand-text">{{ record.reason || '（未填写）' }}</div>
                    <div class="expand-title mt">策略留痕</div>
                    <div class="expand-text policy-note">{{ record.policyNote }}</div>
                  </div>
                  <div class="expand-block">
                    <div class="expand-title">授权口径</div>
                    <div class="expand-text">
                      {{ scopeLabel(record.scope) }} · 有效期 {{ record.validMonths }} 个月 · 用途 {{ purposeLabel(record.purpose) }}
                    </div>
                    <div class="expand-title mt">指定列清单</div>
                    <template v-if="fieldsOf(record).length">
                      <div v-for="fd in fieldsOf(record)" :key="fd.name" class="field-row">
                        <span class="field-name">{{ fd.name }}</span>
                        <span class="field-type">{{ fd.type }}</span>
                        <a-tag size="small" :color="SENSITIVITY_COLORS[fd.sensitivity]">
                          {{ SENSITIVITY_LABELS[fd.sensitivity] }}
                        </a-tag>
                        <span class="field-desc">{{ fd.description || '无注释' }}</span>
                      </div>
                    </template>
                    <div v-else class="expand-text muted">全表授权（申请人未限定字段）</div>
                  </div>
                </div>
              </template>

              <template #table="{ record }">
                <div class="cell-cn">{{ record.tableCnName }}</div>
                <div class="cell-en">{{ record.tableName }}</div>
              </template>
              <template #level="{ record }">
                <a-space :size="4">
                  <a-tag size="small" :color="levelColor(record.sensitivity)">
                    {{ levelLabel(record.sensitivity) }}
                  </a-tag>
                  <a-tag v-if="record.flow === 'approval_dba'" size="small" :color="PERM_STATUS_COLOR.dba_confirming">
                    双审
                  </a-tag>
                </a-space>
              </template>
              <template #applicant="{ record }">
                <div class="cell-cn">{{ record.applicant }}</div>
                <div class="cell-en">{{ record.applicantDept }}</div>
              </template>
              <template #grantScope="{ record }">
                <a-tooltip :content="record.fieldNames.length ? `指定字段：${record.fieldNames.join('、')}` : '全表字段'">
                  <span>{{ record.fieldNames.length ? `${record.fieldNames.length} 个字段` : '全表' }}</span>
                </a-tooltip>
                <span class="cell-sub"> / {{ scopeLabel(record.scope) }}</span>
              </template>
              <template #flow="{ record }">
                <a-tooltip :content="record.policyNote">
                  <a-tag size="small" :color="flowTagColor(record.flow)">{{ flowLabel(record.flow) }}</a-tag>
                </a-tooltip>
              </template>
              <template #status="{ record }">
                <a-tag size="small" :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
              </template>
              <template #actions="{ record }">
                <a-space :size="2">
                  <a-button
                    type="text"
                    size="small"
                    status="success"
                    :loading="busyId === record.id"
                    @click="openOp('approve', 'admin', record)"
                  >
                    通过
                  </a-button>
                  <a-button type="text" size="small" status="danger" @click="openOp('reject', 'admin', record)">
                    驳回
                  </a-button>
                </a-space>
              </template>

              <template #empty>
                <a-empty :description="adminQueue.length ? '没有符合筛选条件的待审申请' : '管理员待审队列已清空，暂无需要人工审批的申请'">
                  <a-button v-if="adminQueue.length" @click="clearFilters">清空筛选条件</a-button>
                  <a-button v-else type="primary" @click="goManagement">
                    <template #icon><icon-list /></template>
                    查看授权台账
                  </a-button>
                </a-empty>
              </template>
            </a-table>
          </a-tab-pane>

          <!-- ==================== DBA 二次确认队列 ==================== -->
          <a-tab-pane key="dba" :title="`DBA 确认队列（${dbaQueue.length}）`">
            <a-table
              :columns="dbaColumns"
              :data="dbaQueue"
              row-key="id"
              :expandable="{ width: 44 }"
              :pagination="{ pageSize: 8, showTotal: true, sizeCanChange: false }"
              :scroll="{ x: 1180 }"
              size="medium"
            >
              <template #expand-row="{ record }">
                <div class="expand-panel">
                  <div class="expand-block">
                    <div class="expand-title">申请理由</div>
                    <div class="expand-text">{{ record.reason || '（未填写）' }}</div>
                    <div class="expand-title mt">管理员意见</div>
                    <div class="expand-text">
                      {{ record.approver || '-' }}：{{ record.approvalComment || '（未填写意见）' }}
                    </div>
                  </div>
                  <div class="expand-block">
                    <div class="expand-title">高敏字段清单（DBA 需逐一核对脱敏与落地范围）</div>
                    <div v-for="fd in restrictedFieldsOf(record)" :key="fd.name" class="field-row">
                      <span class="field-name">{{ fd.name }}</span>
                      <span class="field-type">{{ fd.type }}</span>
                      <a-tag size="small" :color="SENSITIVITY_COLORS[fd.sensitivity]">
                        {{ SENSITIVITY_LABELS[fd.sensitivity] }}
                      </a-tag>
                      <span class="field-desc">{{ fd.description || '无注释' }}</span>
                    </div>
                    <div v-if="!restrictedFieldsOf(record).length" class="expand-text muted">
                      该表未登记高敏字段（种子数据快照），请按全表口径评估
                    </div>
                    <div class="expand-title mt">本次申请口径</div>
                    <div class="expand-text">
                      {{ record.fieldNames.length ? `指定字段：${record.fieldNames.join('、')}` : '全表' }} ·
                      {{ scopeLabel(record.scope) }} · {{ record.validMonths }} 个月
                    </div>
                  </div>
                </div>
              </template>

              <template #table="{ record }">
                <div class="cell-cn">{{ record.tableCnName }}</div>
                <div class="cell-en">{{ record.tableName }}</div>
              </template>
              <template #level="{ record }">
                <a-tag size="small" :color="levelColor(record.sensitivity)">
                  {{ levelLabel(record.sensitivity) }}
                </a-tag>
              </template>
              <template #applicant="{ record }">
                <div class="cell-cn">{{ record.applicant }}</div>
                <div class="cell-en">{{ record.applicantDept }}</div>
              </template>
              <template #adminComment="{ record }">
                <a-tooltip :content="record.approvalComment || '管理员未填写意见'">
                  <span class="cell-comment">{{ record.approver || '-' }}：{{ record.approvalComment || '（无意见）' }}</span>
                </a-tooltip>
              </template>
              <template #status="{ record }">
                <a-tag size="small" :color="statusColor(record.status)">
                  {{ statusLabel(record.status) }}
                </a-tag>
              </template>
              <template #actions="{ record }">
                <a-space :size="2">
                  <a-button
                    type="text"
                    size="small"
                    status="success"
                    :loading="busyId === record.id"
                    @click="openOp('approve', 'dba', record)"
                  >
                    确认开通
                  </a-button>
                  <a-button type="text" size="small" status="danger" @click="openOp('reject', 'dba', record)">
                    否决
                  </a-button>
                </a-space>
              </template>

              <template #empty>
                <a-empty description="暂无待二次确认的高敏申请（高敏表需管理员通过后才会进入本队列）">
                  <a-button type="primary" @click="activeTab = 'admin'">
                    <template #icon><icon-clock-circle /></template>
                    回到管理员待审
                  </a-button>
                </a-empty>
              </template>
            </a-table>
          </a-tab-pane>

          <!-- ==================== 分级变更审批（先审后发 · 复用本审批台） ==================== -->
          <a-tab-pane key="classify" :title="`分级变更审批（${classifyQueue.length}）`">
            <div class="toolbar">
              <a-space wrap>
                <a-input-search
                  v-model="classifyKeyword"
                  placeholder="搜索单号 / 表名 / 申请人"
                  allow-clear
                  style="width: 240px"
                />
                <a-button :disabled="!filteredClassify.length" @click="selectAllClassify">
                  选中当前筛选（{{ filteredClassify.length }}）
                </a-button>
                <a-button
                  type="primary"
                  :loading="batchLoading"
                  :disabled="!classifySelected.length"
                  @click="handleClassifyBatchApprove"
                >
                  <template #icon><icon-thumb-up /></template>
                  批量通过（{{ classifySelected.length }}）
                </a-button>
                <span class="toolbar-hint">
                  通过 = 把 diff 写入分级目录并刷新覆盖率；驳回/撤回一律不落地，仅留痕
                </span>
              </a-space>
            </div>

            <a-table
              :columns="classifyColumns"
              :data="filteredClassify"
              row-key="id"
              :row-selection="classifyRowSelection"
              :expandable="{ width: 44 }"
              :pagination="{ pageSize: 8, showTotal: true, sizeCanChange: false }"
              :scroll="{ x: 1320 }"
              size="medium"
              @selection-change="handleClassifySelectionChange"
            >
              <template #expand-row="{ record }">
                <div class="expand-panel">
                  <div class="expand-block">
                    <div class="expand-title">变更原因</div>
                    <div class="expand-text">{{ record.reason || '（未填写）' }}</div>
                    <div class="expand-title mt">策略留痕</div>
                    <div class="expand-text policy-note">{{ record.policyNote }}</div>
                    <div class="expand-title mt">流转历史</div>
                    <div v-for="(h, i) in record.history" :key="i" class="field-row">
                      <span class="field-type">{{ h.ts }}</span>
                      <span class="field-name">{{ h.actor }}</span>
                      <a-tag size="small" :color="statusColor(h.to)">{{ classifyStage(h.to) }}</a-tag>
                      <span class="field-desc">{{ h.action }}{{ h.comment ? `｜${h.comment}` : '' }}</span>
                    </div>
                  </div>
                  <div class="expand-block">
                    <div class="expand-title">字段级 diff（{{ record.diffs.length }} 个字段）</div>
                    <div v-for="d in record.diffs" :key="d.field_name" class="diff-item">
                      <div class="diff-head">
                        <span class="field-name">{{ d.field_name }}</span>
                        <span class="field-desc">{{ d.field_comment || '无注释' }}</span>
                      </div>
                      <div v-for="line in diffLines(d)" :key="line.dim" class="diff-line">
                        <span class="diff-dim">{{ line.dim }}</span>
                        <span class="diff-old">{{ line.from }}</span>
                        <span class="diff-arrow">→</span>
                        <span class="diff-new">{{ line.to }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <template #cTable="{ record }">
                <div class="cell-cn">{{ record.tableCnName }}</div>
                <div class="cell-en">{{ record.schema }}.{{ record.tableName }}</div>
              </template>
              <template #cFields="{ record }">
                <a-tooltip :content="classifyFieldsTip(record)">
                  <a-tag size="small" :color="record.kind === 'batch' ? 'arcoblue' : 'gray'">
                    {{ record.kind === 'batch' ? '批量' : '单字段' }} {{ record.diffs.length }} 个
                  </a-tag>
                </a-tooltip>
              </template>
              <template #cLevel="{ record }">
                <a-tag size="small" :color="classifyLevelColor(record.maxLevelAfter)">
                  {{ classifyLevelLabel(record.maxLevelAfter) }}
                </a-tag>
              </template>
              <template #cFlow="{ record }">
                <a-tooltip :content="record.policyNote">
                  <a-tag size="small" :color="flowTagColor(record.flow)">{{ classifyFlowLabel(record) }}</a-tag>
                </a-tooltip>
              </template>
              <template #cApplicant="{ record }">
                <div class="cell-cn">{{ record.applicant }}</div>
                <div class="cell-en">{{ record.applicantDept }}</div>
              </template>
              <template #cStatus="{ record }">
                <a-tag size="small" :color="statusColor(record.status)">{{ classifyStageLabel(record) }}</a-tag>
              </template>
              <template #cActions="{ record }">
                <a-space :size="2">
                  <template v-if="record.status === 'pending'">
                    <a-button
                      type="text"
                      size="small"
                      status="success"
                      :loading="busyId === record.id"
                      @click="openOp('approve', 'admin', record, 'classify')"
                    >
                      通过
                    </a-button>
                    <a-button type="text" size="small" status="danger" @click="openOp('reject', 'admin', record, 'classify')">
                      驳回
                    </a-button>
                  </template>
                  <template v-else-if="record.status === 'dba_confirming'">
                    <a-button
                      type="text"
                      size="small"
                      status="success"
                      :loading="busyId === record.id"
                      @click="openOp('approve', 'dba', record, 'classify')"
                    >
                      复核通过
                    </a-button>
                    <a-button type="text" size="small" status="danger" @click="openOp('reject', 'dba', record, 'classify')">
                      否决
                    </a-button>
                  </template>
                  <a-tooltip v-else :content="classifyDoneText(record)">
                    <span class="cell-sub">已办结</span>
                  </a-tooltip>
                </a-space>
              </template>

              <template #empty>
                <!-- a-empty 默认插槽会顶掉 description，说明文案写在插槽内才会显示 -->
                <a-empty>
                  <div class="empty-desc">{{ classifyEmptyDesc }}</div>
                  <a-button v-if="classifyQueue.length" @click="classifyKeyword = ''">清空筛选条件</a-button>
                  <a-button v-else type="primary" @click="goClassifyTables">
                    <template #icon><icon-list /></template>
                    查看数据分级表列表
                  </a-button>
                </a-empty>
              </template>
            </a-table>
          </a-tab-pane>
        </a-tabs>
      </a-card>
    </div>

    <!-- ==================== 审批意见弹窗（通过 / 驳回 · 管理员 / DBA 共用） ==================== -->
    <a-modal
      v-model:visible="opVisible"
      :title="opTitle"
      :width="620"
      :ok-text="opOkText"
      cancel-text="取消"
      :ok-loading="opBusy"
      :ok-button-props="{ status: opMode === 'reject' ? 'danger' : 'normal' }"
      @ok="doOperation"
      @cancel="opVisible = false"
    >
      <!-- 表权限单（原有口径） -->
      <a-descriptions v-if="permTarget" :column="1" size="small" bordered class="op-desc">
        <a-descriptions-item label="申请单">{{ permTarget.id }} · {{ permTarget.tableCnName }}（{{ permTarget.tableName }}）</a-descriptions-item>
        <a-descriptions-item label="分级 / 审批流">
          <a-space :size="4">
            <a-tag size="small" :color="levelColor(permTarget.sensitivity)">
              {{ levelLabel(permTarget.sensitivity) }}
            </a-tag>
            <a-tag size="small" :color="flowTagColor(permTarget.flow)">{{ flowLabel(permTarget.flow) }}</a-tag>
          </a-space>
        </a-descriptions-item>
        <a-descriptions-item label="申请人">
          {{ permTarget.applicant }}（{{ permTarget.applicantDept }}）
        </a-descriptions-item>
        <a-descriptions-item label="授权口径">
          {{ grantScopeText(permTarget) }}
          · {{ PERM_SCOPE_LABEL[permTarget.scope] }} · {{ permTarget.validMonths }} 个月
        </a-descriptions-item>
        <a-descriptions-item label="申请理由">{{ permTarget.reason || '-' }}</a-descriptions-item>
      </a-descriptions>

      <!-- 分级变更单（共用同一个意见弹窗，只换描述区口径） -->
      <a-descriptions v-else-if="classifyTarget" :column="1" size="small" bordered class="op-desc">
        <a-descriptions-item label="变更单">{{ classifyTarget.id }} · {{ classifyTarget.tableCnName }}（{{ classifyTarget.schema }}.{{ classifyTarget.tableName }}）</a-descriptions-item>
        <a-descriptions-item label="变更后级别 / 审批流">
          <a-space :size="4">
            <a-tag size="small" :color="classifyLevelColor(classifyTarget.maxLevelAfter)">
              {{ classifyLevelLabel(classifyTarget.maxLevelAfter) }}
            </a-tag>
            <a-tag size="small" :color="flowTagColor(classifyTarget.flow)">{{ classifyFlowLabel(classifyTarget) }}</a-tag>
            <a-tag size="small" color="gray">{{ classifyTarget.kind === 'batch' ? '批量上传' : '单字段编辑' }}</a-tag>
          </a-space>
        </a-descriptions-item>
        <a-descriptions-item label="申请人">
          {{ classifyTarget.applicant }}（{{ classifyTarget.applicantDept }}）
        </a-descriptions-item>
        <a-descriptions-item label="变更范围">
          <div v-for="d in classifyTarget.diffs" :key="d.field_name" class="op-diff-row">
            <span class="field-name">{{ d.field_name }}</span>
            <span v-for="line in diffLines(d)" :key="line.dim" class="op-diff-line">
              {{ line.dim }}：<i class="diff-old">{{ line.from }}</i> → <b class="diff-new">{{ line.to }}</b>
            </span>
          </div>
        </a-descriptions-item>
        <a-descriptions-item v-if="classifyTarget.approvalComment" label="治理员意见">
          {{ classifyTarget.approver || '-' }}：{{ classifyTarget.approvalComment }}
        </a-descriptions-item>
        <a-descriptions-item label="变更原因">{{ classifyTarget.reason || '-' }}</a-descriptions-item>
      </a-descriptions>

      <a-form ref="opFormRef" :model="opForm" layout="vertical" class="op-form">
        <a-form-item
          field="comment"
          :label="opCommentLabel"
          :rules="opRules"
        >
          <a-textarea
            v-model="opForm.comment"
            :placeholder="opPlaceholder"
            :auto-size="{ minRows: 3, maxRows: 6 }"
            :max-length="200"
            show-word-limit
          />
        </a-form-item>
        <div class="quick-box">
          <span class="quick-label">常用意见：</span>
          <a-space wrap :size="6">
            <a-tag
              v-for="c in quickComments"
              :key="c"
              size="small"
              color="gray"
              class="quick-tag"
              @click="useQuickComment(c)"
            >
              {{ c }}
            </a-tag>
          </a-space>
        </div>
      </a-form>
    </a-modal>
  </PageContainer>
</template>

<script setup lang="ts">
/**
 * 表级权限审批台（数据权限 · 第 2 页）
 *
 * 双队列（对应四级审批流中需要人工介入的两档）：
 *   - 管理员待审 = PermissionStore.pendingForAdmin()：sensitive / restricted 的 pending 单
 *   - DBA 确认队列 = PermissionStore.pendingForDba()：高敏单管理员通过后的二级待办
 *
 * 动作映射（一律走 store，页面不自造状态机）：
 *   管理员通过 → approve(id, comment, actor)：高敏自动分流为 dba_confirming，其余直接 approved
 *   管理员驳回 → reject(id, comment, actor)
 *   DBA 确认   → dbaConfirm / dbaReject
 *   批量通过   → batchApprove(ids, actor) → { ok, failed }
 *
 * 第 3 个 Tab「分级变更审批」（2026-11 分级变更审批需求）：
 *   字段分级变更单复用同一张审批台（不新建页面）、同一个意见弹窗（只换描述区口径）、
 *   同一套状态文案/配色（PERM_STATUS_LABEL/COLOR）与审批流枚举（PermFlow）；
 *   pending → 治理员通过/驳回，dba_confirming → 管理员复核通过/否决，
 *   落地（写入分级目录）一律由 ClassifyChangeStore 在 approved 分支完成。
 *
 * 状态/分级配色统一取 store 与 table-catalog-store 导出的常量。
 */
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import type { FormInstance } from '@arco-design/web-vue'
import PageContainer from '@/components-dca/common/PageContainer.vue'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import { useRoleStore } from '@/stores-dca/role'
import {
  TableCatalogStore,
  SENSITIVITY_LABELS,
  SENSITIVITY_COLORS,
  type CatalogField,
  type Sensitivity
} from '@/mock-dca/shared/table-catalog-store'
import {
  PermissionStore,
  PERM_STATUS_LABEL,
  PERM_STATUS_COLOR,
  PERM_SCOPE_LABEL,
  PERM_FLOW_LABEL,
  PERM_PURPOSE_LABEL,
  type PermFlow,
  type PermPurpose,
  type PermScope,
  type PermStatus,
  type PermissionApply
} from '@/mock-shared/permission-store'
import {
  ClassifyChangeStore,
  CLASSIFY_LEVEL_POLICY,
  CLASSIFY_STAGE_LABEL,
  type ClassifyChangeApply,
  type ClassifyFieldDiff
} from '@/mock-shared/classify-change-store'
// 分级域（L1–L4）与权限域（public/internal/…）是两套词汇，此处别名引入避免相互覆盖，不做映射
import {
  SENSITIVITY_COLORS as CLASSIFY_LEVEL_COLORS,
  SENSITIVITY_NAMES as CLASSIFY_LEVEL_NAMES,
  CLASSIFY_DIMS,
  dimLabel,
  dimValueText
} from '@/mock-shared/classify-constants'
import type { SensitivityLevel } from '@/mock-shared/classify-types'

const router = useRouter()
const roleStore = useRoleStore()

/** 模拟一次异步耗时（挡板：真实环境是调权限中心接口） */
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

// ---------------- 表格插槽取值助手 ----------------
// a-table 插槽里的 record 会被推断为 any，直接用它索引 store 导出的 Record<...> 常量
// 会命中 noImplicitAny（TS7053）；用具名形参收窄类型后取值，文案与配色仍全部来自 store 常量。
const levelColor = (s: Sensitivity) => SENSITIVITY_COLORS[s]
const levelLabel = (s: Sensitivity) => SENSITIVITY_LABELS[s]
const scopeLabel = (s: PermScope) => PERM_SCOPE_LABEL[s]
const purposeLabel = (p: PermPurpose) => PERM_PURPOSE_LABEL[p]
const flowLabel = (f: PermFlow) => PERM_FLOW_LABEL[f]
const statusColor = (s: PermStatus) => PERM_STATUS_COLOR[s]
const statusLabel = (s: PermStatus) => PERM_STATUS_LABEL[s]
/** 分级域（L1–L4）的显示名与配色，同样只取 store 常量 */
const classifyLevelColor = (lv: SensitivityLevel) => CLASSIFY_LEVEL_COLORS[lv]
const classifyLevelLabel = (lv: SensitivityLevel) => `${lv} ${CLASSIFY_LEVEL_NAMES[lv]}`

/** 单字段 diff → 「维度：旧值 → 新值」行（展开行与意见弹窗共用一套口径） */
function diffLines(d: ClassifyFieldDiff): Array<{ dim: string; from: string; to: string }> {
  return CLASSIFY_DIMS
    .filter(dim => dim.key in d.to)
    .map(dim => ({
      dim: dimLabel(dim.key as string),
      from: dimValueText(dim.key as string, d.from[dim.key] as string | undefined),
      to: dimValueText(dim.key as string, d.to[dim.key] as string | undefined)
    }))
}

/** 变更字段清单（tooltip 用，插槽里的 record 是 any，收进具名函数保证类型） */
function diffFieldNames(row: ClassifyChangeApply): string {
  return row.diffs.map(d => d.field_name).join('、')
}

function classifyFieldsTip(row: ClassifyChangeApply): string {
  return `变更字段：${diffFieldNames(row)}（共 ${row.diffs.length} 个）`
}

function classifyDoneText(row: ClassifyChangeApply): string {
  return `单据已处于「${CLASSIFY_STAGE_LABEL[row.status]}」，不可重复处理`
}

/** 分级变更队列空态文案：区分「筛没了」与「队列真的清空了」 */
const classifyEmptyDesc = computed(() =>
  classifyQueue.value.length ? '没有符合筛选条件的分级变更单' : '分级变更队列已清空，没有待治理员审批或待管理员复核的变更单'
)

/**
 * 分级变更单的「审批流 / 当前环节」措辞：枚举与配色仍复用权限域，
 * 但文案要说分级域的人话（权限域的「管理员审批 / DBA确认中」会被误读成 DBA 环节）。
 */
const classifyStage = (s: PermStatus) => CLASSIFY_STAGE_LABEL[s]
const classifyStageLabel = (row: ClassifyChangeApply) => classifyStage(row.status)
const classifyFlowLabel = (row: ClassifyChangeApply) => CLASSIFY_LEVEL_POLICY[row.maxLevelAfter].label

function grantScopeText(row: PermissionApply): string {
  return row.fieldNames.length ? `指定 ${row.fieldNames.length} 个字段：${row.fieldNames.join('、')}` : '全表'
}

/** 审批流标签色：仅复用 store 里的状态色，不自造色值 */
function flowTagColor(flow: PermFlow): string {
  if (flow === 'auto') return PERM_STATUS_COLOR.approved
  if (flow === 'domain_auto') return PERM_STATUS_COLOR.pending
  if (flow === 'approval') return PERM_STATUS_COLOR.dba_confirming
  return PERM_STATUS_COLOR.rejected
}

// ---------------- 演示身份 ----------------
const isAdminRole = computed(() => ['data_admin', 'admin'].includes(roleStore.currentRole))
const roleLabel = computed(() => roleStore.currentRoleDef?.label || '数据工程师')
const roleColor = computed(() => roleStore.currentRoleDef?.color || '#722ed1')
/** 管理员队列留痕人 */
const adminActor = computed(() => (isAdminRole.value ? '数据管理员' : roleLabel.value))
/** DBA 队列留痕人（演示环境无 DBA 角色，由当前身份兼任） */
const dbaActor = computed(() => `DBA·${adminActor.value}`)
/** 分级变更：治理员环节留痕人 */
const classifyAdminActor = computed(() => (isAdminRole.value ? '数据治理者' : roleLabel.value))
/** 分级变更：L3/L4 二级复核留痕人 */
const classifyDbaActor = computed(() => `复核管理员·${roleLabel.value}`)

const activeTab = ref<'admin' | 'dba' | 'classify'>('admin')

// ---------------- 队列数据 ----------------
const adminQueue = computed(() => PermissionStore.pendingForAdmin())
const dbaQueue = computed(() => PermissionStore.pendingForDba())
/** 分级变更待办：治理员环节 + 管理员复核环节（一张表内用「当前环节」区分） */
const classifyQueue = computed<ClassifyChangeApply[]>(() =>
  [...ClassifyChangeStore.pendingForAdmin(), ...ClassifyChangeStore.pendingForDba()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
)

const keyword = ref('')
const filterLevel = ref<string>('')

const levelOptions = computed(() => {
  const set = new Set(adminQueue.value.map(a => a.sensitivity))
  return (['public', 'internal', 'sensitive', 'restricted'] as Sensitivity[])
    .filter(s => set.has(s))
    .map(s => ({ label: SENSITIVITY_LABELS[s], value: s }))
})

const filteredAdmin = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return adminQueue.value.filter(a => {
    if (filterLevel.value && a.sensitivity !== filterLevel.value) return false
    if (!kw) return true
    return [a.id, a.tableName, a.tableCnName, a.applicant, a.applicantDept].some(x => x.toLowerCase().includes(kw))
  })
})

function clearFilters() {
  keyword.value = ''
  filterLevel.value = ''
}

/** 分级变更单只按关键字筛（级别/环节已经在列里直读，不再叠筛选器） */
const classifyKeyword = ref('')
const filteredClassify = computed(() => {
  const kw = classifyKeyword.value.trim().toLowerCase()
  if (!kw) return classifyQueue.value
  return classifyQueue.value.filter(c =>
    [c.id, c.tableName, c.tableCnName, c.schema, c.applicant, c.applicantDept].some(x => x.toLowerCase().includes(kw))
  )
})

// ---------------- 表格列定义 ----------------
const adminColumns = [
  { title: '单号', dataIndex: 'id', width: 92 },
  { title: '目标表', slotName: 'table', width: 200 },
  { title: '分级', slotName: 'level', width: 110 },
  { title: '申请人', slotName: 'applicant', width: 130 },
  { title: '授权口径', slotName: 'grantScope', width: 150 },
  { title: '审批流', slotName: 'flow', width: 130 },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 100 },
  { title: '提交时间', dataIndex: 'createdAt', width: 156 },
  { title: '操作', slotName: 'actions', width: 128, fixed: 'right' as const }
]

const dbaColumns = [
  { title: '单号', dataIndex: 'id', width: 92 },
  { title: '目标表', slotName: 'table', width: 200 },
  { title: '分级', slotName: 'level', width: 88 },
  { title: '申请人', slotName: 'applicant', width: 130 },
  { title: '管理员意见', slotName: 'adminComment', width: 240, ellipsis: true, tooltip: true },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 118 },
  { title: '转 DBA 时间', dataIndex: 'updatedAt', width: 156 },
  { title: '操作', slotName: 'actions', width: 168, fixed: 'right' as const }
]

/** 分级变更队列：目标表/变更字段/变更后最高级别/审批流/当前环节，审批人需要的判断信息一屏内 */
const classifyColumns = [
  { title: '单号', dataIndex: 'id', width: 92 },
  { title: '目标表', slotName: 'cTable', width: 210 },
  { title: '变更字段', slotName: 'cFields', width: 120 },
  { title: '变更后级别', slotName: 'cLevel', width: 118 },
  { title: '审批流', slotName: 'cFlow', width: 150 },
  { title: '申请人', slotName: 'cApplicant', width: 130 },
  { title: '当前环节', dataIndex: 'status', slotName: 'cStatus', width: 106 },
  { title: '提交时间', dataIndex: 'createdAt', width: 156 },
  { title: '操作', slotName: 'cActions', width: 150, fixed: 'right' as const }
]

/** 本次申请指定的字段明细（全表申请时返回空数组） */
function fieldsOf(row: PermissionApply): CatalogField[] {
  if (!row.fieldNames.length) return []
  const t = TableCatalogStore.byName(row.tableName)
  if (!t) return row.fieldNames.map(n => ({ name: n, type: '-', description: '（表目录中未找到该表）', sensitivity: row.sensitivity } as CatalogField))
  return row.fieldNames
    .map(n => t.fields.find(fd => fd.name === n))
    .filter((fd): fd is CatalogField => !!fd)
}

/** DBA 需重点核对的高敏字段清单 */
function restrictedFieldsOf(row: PermissionApply): CatalogField[] {
  const t = TableCatalogStore.byName(row.tableName)
  if (!t) return []
  const picked = row.fieldNames.length ? fieldsOf(row) : t.fields
  return picked.filter(fd => fd.sensitivity === 'restricted')
}

// ---------------- 多选与批量通过 ----------------
const selectedKeys = ref<string[]>([])
const batchLoading = ref(false)

const rowSelection = computed(() => ({
  type: 'checkbox' as const,
  showCheckedAll: true,
  selectedRowKeys: selectedKeys.value
}))

function handleSelectionChange(keys: (string | number)[]) {
  selectedKeys.value = keys.map(k => String(k))
}

/** 队列变化（通过后行消失）时剔除已不存在的选中项 */
watch(adminQueue, list => {
  const alive = new Set(list.map(a => a.id))
  selectedKeys.value = selectedKeys.value.filter(id => alive.has(id))
})

function selectAllFiltered() {
  if (!filteredAdmin.value.length) {
    Message.info('当前筛选结果为空')
    return
  }
  selectedKeys.value = filteredAdmin.value.map(a => a.id)
  Message.success(`已选中当前筛选结果的 ${selectedKeys.value.length} 条申请`)
}

function handleBatchApprove() {
  const ids = [...selectedKeys.value]
  if (!ids.length) {
    Message.info('请先勾选要通过的申请')
    return
  }
  const dbaCount = filteredAdmin.value.filter(a => ids.includes(a.id) && a.flow === 'approval_dba').length
  Modal.confirm({
    title: '批量审批通过',
    content:
      `将对 ${ids.length} 条申请以「${adminActor.value}」身份审批通过，意见统一记为「批量审批通过」。` +
      (dbaCount ? `其中 ${dbaCount} 条高敏申请将转入「DBA 确认队列」等待二次确认，不会立即生效。` : '确认继续？'),
    okText: `确认通过 ${ids.length} 条`,
    cancelText: '取消',
    onOk: async () => {
      batchLoading.value = true
      await sleep(600) // 挡板：模拟批量写权限策略耗时
      const res = PermissionStore.batchApprove(ids, adminActor.value)
      batchLoading.value = false
      selectedKeys.value = []
      const text = `批量审批完成：成功 ${res.ok} 条${res.failed ? `、失败 ${res.failed} 条（状态已变化，请刷新队列后重试）` : ''}`
      res.failed ? Message.warning(text) : Message.success(text)
    }
  })
}

// ---------------- 分级变更：多选与批量通过 ----------------
const classifySelected = ref<string[]>([])

const classifyRowSelection = computed(() => ({
  type: 'checkbox' as const,
  showCheckedAll: true,
  selectedRowKeys: classifySelected.value
}))

function handleClassifySelectionChange(keys: (string | number)[]) {
  classifySelected.value = keys.map(k => String(k))
}

/** 通过/驳回后队列会变化，剔除已不在队列里的选中项 */
watch(classifyQueue, list => {
  const alive = new Set(list.map(c => c.id))
  classifySelected.value = classifySelected.value.filter(id => alive.has(id))
})

function selectAllClassify() {
  if (!filteredClassify.value.length) {
    Message.info('当前筛选结果为空')
    return
  }
  classifySelected.value = filteredClassify.value.map(c => c.id)
  Message.success(`已选中当前筛选结果的 ${classifySelected.value.length} 条变更单`)
}

function handleClassifyBatchApprove() {
  const ids = [...classifySelected.value]
  if (!ids.length) {
    Message.info('请先勾选要通过的分级变更单')
    return
  }
  const dualCount = filteredClassify.value.filter(c => ids.includes(c.id) && c.flow === 'approval_dba').length
  Modal.confirm({
    title: '批量审批通过（分级变更）',
    content:
      `将对 ${ids.length} 条分级变更单以「${classifyAdminActor.value}」身份审批通过，意见统一记为「批量审批通过」。` +
      (dualCount
        ? `其中 ${dualCount} 条 L3/L4 高敏感定级会转入复核环节，复核通过前不会写入分级目录。`
        : '通过后分级结果立即生效。确认继续？'),
    okText: `确认通过 ${ids.length} 条`,
    cancelText: '取消',
    onOk: async () => {
      batchLoading.value = true
      await sleep(600) // 挡板：模拟分级目录批量写入
      const res = ClassifyChangeStore.batchApprove(ids, classifyAdminActor.value)
      batchLoading.value = false
      classifySelected.value = []
      const text = `批量审批完成：成功 ${res.ok} 条${res.failed ? `、失败 ${res.failed} 条（状态已变化，请刷新队列后重试）` : ''}`
      res.failed ? Message.warning(text) : Message.success(text)
    }
  })
}

// ---------------- 单条通过 / 驳回 ----------------
const opVisible = ref(false)
const opBusy = ref(false)
const opMode = ref<'approve' | 'reject'>('approve')
const opStage = ref<'admin' | 'dba'>('admin')
/** 当前处理的是哪一类单：权限申请单 / 分级变更单（决定弹窗口径与 store 分发） */
const opKind = ref<'perm' | 'classify'>('perm')
const opTarget = ref<PermissionApply | ClassifyChangeApply | null>(null)
const opFormRef = ref<FormInstance>()
const opForm = reactive({ comment: '' })
const busyId = ref('')

/** 窄化后的访问器：两套词汇（public/internal 与 L1–L4）不在模板里做联合类型索引 */
const permTarget = computed(() => (opKind.value === 'perm' ? (opTarget.value as PermissionApply | null) : null))
const classifyTarget = computed(() => (opKind.value === 'classify' ? (opTarget.value as ClassifyChangeApply | null) : null))

const opTitle = computed(() => {
  const act = opMode.value === 'approve' ? '通过' : '驳回'
  if (opKind.value === 'classify') {
    const who = opStage.value === 'dba' ? '管理员复核' : '治理员审批'
    return `分级变更 · ${who} · ${opTarget.value?.id || ''}`
  }
  const who = opStage.value === 'dba' ? 'DBA 二次确认' : '管理员审批'
  return `${who} · ${act} · ${opTarget.value?.id || ''}`
})
const opOkText = computed(() => {
  if (opKind.value === 'classify') {
    if (opMode.value === 'reject') return opStage.value === 'dba' ? '确认否决' : '确认驳回'
    return opStage.value === 'dba' ? '确认复核通过并上线' : '确认通过'
  }
  if (opMode.value === 'reject') return opStage.value === 'dba' ? '确认否决' : '确认驳回'
  return opStage.value === 'dba' ? '确认开通' : '确认通过'
})
const opCommentLabel = computed(() =>
  opMode.value === 'approve' ? '审批意见（可选，将留痕在申请单历史里）' : '驳回理由（必填，会同步给申请人）'
)
const opPlaceholder = computed(() => {
  if (opKind.value === 'classify') {
    if (opMode.value === 'reject') return '例如：敏感级别偏低，请对照数据安全分级矩阵修正后重提'
    return opStage.value === 'dba'
      ? '例如：已核对 L3 字段访问控制与审计日志，同意写入分级目录'
      : '例如：同意，定级口径与分级矩阵一致'
  }
  if (opMode.value === 'reject') return '例如：申请理由不足以覆盖该字段的使用场景，请改申请 dws 汇总层口径'
  return opStage.value === 'dba'
    ? '例如：已核对 id_card 落库加密 + 查询脱敏，允许按只读、3 个月有效期开通'
    : '例如：同意，仅限本次分析场景使用，导出结果不得外发'
})
const opRules = computed(() =>
  opMode.value === 'reject'
    ? [
        { required: true, message: '请填写驳回理由' },
        { minLength: 5, message: '驳回理由不少于 5 个字，便于申请人定位整改点' }
      ]
    : []
)

const quickComments = computed(() => {
  const isClassify = opKind.value === 'classify'
  if (opMode.value === 'reject') {
    return isClassify
      ? ['分级与矩阵表规范不一致，请修正后重提', '敏感级别偏低，请对照数据安全分级矩阵', '业务目录层级缺失，请补全四级目录']
      : ['理由不充分，请补充业务场景', '请改申请汇总层口径，避免直取明细', '授权范围过大，请限定字段', '有效期过长，请缩短后重提']
  }
  if (opStage.value === 'dba') {
    return isClassify
      ? ['已核对高敏感级别的访问控制，同意上线', '同意，请同步更新下游脱敏配置', '复核通过，请关注后续审计采样']
      : ['已核对加密与脱敏策略，同意开通', '仅限只读使用，禁止导出明细', '请配合水印与审计日志使用']
  }
  return isClassify
    ? ['同意，分级口径符合矩阵规范', '已通过，请按规范持续维护']
    : ['同意，仅限本次业务场景使用', '已通过，注意结果数据不得外发', '同意，请在有效期内使用']
})

function useQuickComment(text: string) {
  opForm.comment = opForm.comment ? `${opForm.comment}；${text}` : text
}

function openOp(
  mode: 'approve' | 'reject',
  stage: 'admin' | 'dba',
  row: PermissionApply | ClassifyChangeApply,
  kind: 'perm' | 'classify' = 'perm'
) {
  opMode.value = mode
  opStage.value = stage
  opKind.value = kind
  opTarget.value = row
  opForm.comment = ''
  opFormRef.value?.clearValidate()
  opVisible.value = true
}

async function doOperation() {
  const target = opTarget.value
  if (!target) return
  const errors = await opFormRef.value?.validate()
  if (errors) return
  const comment = opForm.comment.trim()
  opBusy.value = true
  busyId.value = target.id
  await sleep(450) // 挡板：模拟权限策略下发
  try {
    if (opKind.value === 'classify') {
      // 一律交给 store：状态不合法（已办结/已落地）会抛错，下面的 catch 统一提示
      if (opStage.value === 'dba') {
        if (opMode.value === 'approve') {
          const r = ClassifyChangeStore.dbaConfirm(target.id, comment || '已核对高敏感级别管控，同意上线', classifyDbaActor.value)
          Message.success(`分级变更 ${r.id} 已通过二级复核并写入分级目录（${r.diffs.length} 个字段已生效）`)
        } else {
          ClassifyChangeStore.dbaReject(target.id, comment, classifyDbaActor.value)
          Message.warning(`已否决分级变更 ${target.id}，驳回理由已同步给 ${target.applicant}`)
        }
      } else if (opMode.value === 'approve') {
        const r = ClassifyChangeStore.approve(target.id, comment || '同意', classifyAdminActor.value)
        if (r.status === 'dba_confirming') {
          Message.info(`${r.maxLevelAfter} 属高敏感定级，已通过治理员审批并转入「${PERM_STATUS_LABEL[r.status]}」环节，复核通过后才生效（单号 ${r.id}）`)
        } else {
          Message.success(`分级变更 ${r.id} 已通过并生效：「${r.tableCnName}」${r.diffs.length} 个字段的分级已上线`)
        }
      } else {
        ClassifyChangeStore.reject(target.id, comment, classifyAdminActor.value)
        Message.warning(`已驳回分级变更 ${target.id}，分级数据未发生变动`)
      }
      opVisible.value = false
      opTarget.value = null
      return
    }

    if (opStage.value === 'dba') {
      if (opMode.value === 'approve') {
        const r = PermissionStore.dbaConfirm(target.id, comment || '已核对高敏字段管控措施，同意开通', dbaActor.value)
        Message.success(`高敏权限已开通：「${r.tableCnName}」${PERM_SCOPE_LABEL[r.scope]}权限生效（单号 ${r.id}）`)
      } else {
        PermissionStore.dbaReject(target.id, comment, dbaActor.value)
        Message.warning(`已否决高敏申请 ${target.id}，驳回理由已同步给 ${target.applicant}`)
      }
    } else if (opMode.value === 'approve') {
      const r = PermissionStore.approve(target.id, comment || '同意', adminActor.value)
      if (r.status === 'dba_confirming') {
        Message.info(`「${r.tableCnName}」为高敏数据，已通过管理员审批并转入「${PERM_STATUS_LABEL[r.status]}」队列（单号 ${r.id}）`)
      } else {
        Message.success(`已通过：「${r.tableCnName}」${PERM_SCOPE_LABEL[r.scope]}权限即时生效（单号 ${r.id}）`)
      }
    } else {
      PermissionStore.reject(target.id, comment, adminActor.value)
      Message.warning(`已驳回申请 ${target.id}，驳回理由已同步给 ${target.applicant}`)
    }
    opVisible.value = false
    opTarget.value = null
  } catch (e) {
    Message.error((e as Error).message || '操作失败，请刷新队列后重试')
  } finally {
    opBusy.value = false
    busyId.value = ''
  }
}

onMounted(() => {
  // 恢复演示身份（角色持久化在 localStorage）
  roleStore.initFromStorage()
})

// ---------------- 跳转 ----------------
function goApply() {
  router.push('/management/permission/data-permission/apply')
}
function goManagement() {
  router.push('/management/permission/data-permission/management')
}
function goClassifyTables() {
  router.push('/management/metadata/classify/sources')
}
</script>

<style lang="scss" scoped>
/* 页面背景/高度/最大宽度由 PageContainer 提供 */
.content-wrapper {
  padding: 0 24px 24px;
}
.role-alert {
  margin-bottom: 12px;
}
.toolbar {
  margin-bottom: 12px;
}
.toolbar-hint {
  font-size: 12px;
  color: var(--dca-text-tertiary, #86909c);
}
.cell-cn {
  font-size: 13px;
  color: var(--dca-text-primary, #1d2129);
}
.cell-en {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 12px;
  color: var(--dca-text-tertiary, #86909c);
}
.cell-sub {
  font-size: 12px;
  color: var(--dca-text-secondary, #4e5969);
}
.cell-comment {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--dca-text-secondary, #4e5969);
}
.expand-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  padding: 4px 8px 8px 48px;
}
.expand-block {
  flex: 1 1 320px;
  min-width: 300px;
}
.expand-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--dca-text-secondary, #4e5969);
}
.expand-title.mt {
  margin-top: 10px;
}
.expand-text {
  margin-top: 4px;
  font-size: 13px;
  color: var(--dca-text-primary, #1d2129);
  line-height: 1.6;
}
.expand-text.muted {
  color: var(--dca-text-tertiary, #86909c);
}
.policy-note {
  font-size: 12px;
  color: var(--dca-text-secondary, #4e5969);
}
.field-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}
.field-name {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 12px;
  color: var(--dca-text-primary, #1d2129);
}
.field-type {
  font-size: 12px;
  color: var(--dca-text-tertiary, #86909c);
}
.field-desc {
  font-size: 12px;
  color: var(--dca-text-secondary, #4e5969);
}
.op-desc {
  margin-bottom: 16px;
}
.op-form {
  margin-bottom: 0;
}
.quick-box {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}
.quick-label {
  font-size: 12px;
  line-height: 22px;
  color: var(--dca-text-tertiary, #86909c);
}
.quick-tag {
  cursor: pointer;
}
/* 分级变更：字段级 diff 展示 */
.diff-item {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 4px;
  background: var(--dca-fill-1, #f7f8fa);
}
.diff-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.diff-line {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 12px;
}
.diff-dim {
  width: 88px;
  flex: none;
  color: var(--dca-text-tertiary, #86909c);
}
.diff-old {
  color: var(--dca-text-tertiary, #86909c);
  text-decoration: line-through;
}
.diff-arrow {
  color: var(--dca-border-2, #c9cdd4);
}
.diff-new {
  color: var(--dca-text-primary, #1d2129);
  font-weight: 500;
}
.op-diff-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  padding: 4px 0;
  font-size: 12px;
}
.op-diff-row + .op-diff-row {
  border-top: 1px dashed var(--dca-border-1, #e5e6eb);
}
.op-diff-line {
  color: var(--dca-text-secondary, #4e5969);
}
.op-diff-line i {
  font-style: normal;
}
.op-diff-line b {
  font-weight: 600;
}
/* 分级变更空态说明文案（写在 a-empty 插槽内，与下方按钮拉开一行） */
.empty-desc {
  margin-bottom: 8px;
  color: var(--dca-text-secondary, #4e5969);
}
</style>
