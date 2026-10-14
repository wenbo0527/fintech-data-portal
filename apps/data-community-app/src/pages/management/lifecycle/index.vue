<template>
  <PageContainer>
    <PageHeader
      title="表生命周期管理"
      sub-title="与未上线池/表详情共用同一数据源，操作即时互通"
    >
      <template #extra>
        <a-space wrap>
          <a-tag :color="roleColor">操作身份：{{ actor }}</a-tag>
          <a-button @click="goPool">
            <template #icon><icon-search /></template>
            去未上线池
          </a-button>
          <a-button @click="confirmReset">
            <template #icon><icon-refresh /></template>
            重置演示数据
          </a-button>
        </a-space>
      </template>
    </PageHeader>

    <div class="content-wrapper">
      <a-tabs v-model:active-key="activeTab" type="rounded" size="large" class="lifecycle-tabs">
        <!-- ============ Tab1 上线审核队列 ============ -->
        <a-tab-pane key="review" :title="`上线审核队列（${queue.length}）`">
          <a-alert type="info" class="tab-alert">
            链路：未上线池「提交上线申请」→ 本页审核 → 通过即进入已上线（统一搜索可见）；驳回则回退未上线并留痕驳回原因。检查项为提交时的快照，可展开行核对 5 项明细。
          </a-alert>

          <a-card :bordered="false" class="block-card">
            <a-space wrap :size="16">
              <a-statistic title="待审核" :value="queue.length" :value-style="{ color: '#ff7d00', fontSize: '20px' }" />
              <a-statistic title="硬性检查全通过" :value="readyCount" :value-style="{ color: '#00b42a', fontSize: '20px' }" />
              <a-statistic title="含软性提示" :value="softHintCount" :value-style="{ color: '#165dff', fontSize: '20px' }" />
              <span class="hint-text">审核动作以「{{ actor }}」身份留痕，并通过 store 给提交人推送站内通知</span>
            </a-space>
          </a-card>

          <a-card :bordered="false" class="block-card">
            <a-space wrap>
              <a-select
                v-model="reviewFilterDomain"
                :options="reviewDomainOptions"
                placeholder="业务域"
                allow-clear
                style="width: 180px"
              />
              <a-input v-model="reviewKeyword" placeholder="搜索表名 / 中文名 / 负责人" allow-clear style="width: 260px">
                <template #prefix><icon-search /></template>
              </a-input>
              <a-button @click="clearReviewFilters">清空条件</a-button>
              <a-button type="outline" :disabled="!reviewFiltered.length" @click="selectAllReview">
                选择当前筛选结果（{{ reviewFiltered.length }}）
              </a-button>
              <a-button
                type="primary"
                :disabled="!reviewSelected.length"
                :loading="batchApproving"
                @click="handleBatchApprove"
              >
                <template #icon><icon-check-circle /></template>
                批量通过（{{ reviewSelected.length }}）
              </a-button>
            </a-space>
          </a-card>

          <a-card :bordered="false" class="block-card">
            <a-table
              :columns="reviewColumns"
              :data="reviewFiltered"
              row-key="tableId"
              :row-selection="reviewRowSelection"
              :expandable="{ width: 44 }"
              :pagination="{ pageSize: 8, showTotal: true, sizeCanChange: false }"
              :scroll="{ x: 1160 }"
              size="medium"
              @selection-change="onReviewSelectionChange"
            >
              <template #expand-row="{ record }">
                <div class="expand-panel">
                  <div class="expand-col">
                    <div class="expand-title">上线检查项（REVIEW_CHECK_DEFS · 5 项，硬性不过即拦截）</div>
                    <div v-for="def in REVIEW_CHECK_DEFS" :key="def.key" class="check-item">
                      <div class="check-head">
                        <icon-check-circle v-if="checkResultOf(record, def.key)?.passed" class="ic-ok" />
                        <icon-close-circle v-else :class="def.hard ? 'ic-bad' : 'ic-warn'" />
                        <span class="check-name">{{ def.name }}</span>
                        <a-tag v-if="def.hard" size="small" color="red">硬性</a-tag>
                        <a-tag v-else size="small" color="orange">软性</a-tag>
                        <a-tag v-if="checkResultOf(record, def.key)?.passed" size="small" color="green">通过</a-tag>
                        <a-tag v-else size="small" color="gray">未通过</a-tag>
                      </div>
                      <div class="check-msg">{{ checkResultOf(record, def.key)?.message || '未执行该检查项' }}</div>
                    </div>
                  </div>
                  <div class="expand-col expand-col-right">
                    <div class="expand-title">申请信息</div>
                    <a-descriptions :column="1" size="small" bordered>
                      <a-descriptions-item label="业务域">{{ record.domain }}</a-descriptions-item>
                      <a-descriptions-item label="负责人">{{ record.owner }}</a-descriptions-item>
                      <a-descriptions-item label="更新频次">{{ record.updateFrequency }}</a-descriptions-item>
                      <a-descriptions-item label="字段数 / 行数">
                        {{ record.fields.length }} / {{ formatRows(record.recordCount) }}
                      </a-descriptions-item>
                      <a-descriptions-item label="综合质量分">{{ record.qualityScore }}</a-descriptions-item>
                      <a-descriptions-item label="表描述">{{ record.description || '（缺失，元数据完整性检查会拦截）' }}</a-descriptions-item>
                    </a-descriptions>
                    <div v-if="rejectReasonOf(record)" class="reject-box">
                      <icon-exclamation-circle class="ic-bad" />
                      上次驳回原因：{{ rejectReasonOf(record) }}
                    </div>
                  </div>
                </div>
              </template>
              <template #name="{ record }">
                <div class="tbl-name">{{ record.name }}</div>
                <a-space :size="4" class="tbl-sub">
                  <a-tag size="small" color="arcoblue">{{ record.layer }}</a-tag>
                  <a-tag size="small" :color="sensitivityColor(record.sensitivity)">{{ sensitivityLabel(record.sensitivity) }}</a-tag>
                </a-space>
              </template>
              <template #submitter="{ record }">
                <div class="submitter">{{ submittedBy(record) }}</div>
                <div class="submit-time">{{ record.reviewInfo ? record.reviewInfo.submittedAt : '-' }}</div>
              </template>
              <template #checks="{ record }">
                <a-space :size="4">
                  <a-tag :color="hardPassedCount(record) === hardTotal(record) ? 'green' : 'red'">
                    硬性 {{ hardPassedCount(record) }}/{{ hardTotal(record) }}
                  </a-tag>
                  <a-tooltip
                    v-if="softMissing(record)"
                    :content="`存在 ${softMissing(record)} 项软性提示，不拦截上线，建议在驳回/通过评语中知会负责人`"
                  >
                    <icon-exclamation-circle class="ic-warn" />
                  </a-tooltip>
                </a-space>
              </template>
              <template #actions="{ record }">
                <a-space :size="2">
                  <a-button
                    type="text"
                    size="small"
                    status="success"
                    :loading="busyRow === record.tableId"
                    @click="confirmApprove(record)"
                  >
                    通过
                  </a-button>
                  <a-button type="text" size="small" status="danger" @click="openReject(record)">驳回</a-button>
                </a-space>
              </template>
              <template #empty>
                <a-empty :description="queue.length ? '没有符合筛选条件的待审核表' : '审核队列已清空，暂无待处理的上线申请'">
                  <a-button v-if="queue.length" @click="clearReviewFilters">清空筛选条件</a-button>
                  <a-button v-else type="primary" @click="goPool">
                    <template #icon><icon-plus /></template>
                    去未上线池提交上线申请
                  </a-button>
                </a-empty>
              </template>
            </a-table>
          </a-card>
        </a-tab-pane>

        <!-- ============ Tab2 下线审批 ============ -->
        <a-tab-pane key="offline" :title="`下线审批（已下线 ${retiredList.length}）`">
          <a-alert type="info" class="tab-alert">
            下线前先做引用检查：扫描该表的下游表与在用服务。存在引用时需二次确认「知晓风险」才可强制下线；无引用则一步确认即可下线。下线后进入已下线池，可恢复上线或彻底删除。
          </a-alert>

          <!-- 上半区：发起下线 -->
          <a-card :bordered="false" class="block-card" title="发起下线">
            <a-space wrap>
              <a-select
                v-model="pickedTableId"
                :options="onlineOptions"
                placeholder="选择一张已上线的表"
                allow-search
                allow-clear
                :disabled="!canAdmin"
                style="width: 360px"
              />
              <a-button type="primary" :loading="checking" :disabled="!pickedTableId" @click="runOfflineCheck">
                <template #icon><icon-search /></template>
                下线检查
              </a-button>
              <a-button v-if="checkResult" @click="resetCheck">清空检查结果</a-button>
              <span class="hint-text">当前已上线 {{ onlineList.length }} 张，其中 {{ referencedCount }} 张存在下游依赖或在用服务</span>
            </a-space>

            <a-tooltip v-if="!canAdmin" content="需管理员角色" class="role-tip">
              <div class="role-banner">
                <icon-exclamation-circle />
                当前身份「{{ actor }}」无权执行下线 / 恢复 / 删除，请在右上角切换为「系统管理员」或「数据治理者」后重试。
              </div>
            </a-tooltip>

            <!-- 检查未执行 -->
            <a-empty v-else-if="!checkResult" :image="false" description="选择表后点击「下线检查」，查看下游依赖与在用服务" class="check-empty" />

            <!-- 有引用：警告 + 引用清单 -->
            <div v-else-if="hasRefs" class="refs-block">
              <a-alert type="warning" class="refs-alert">
                <template #content>
                  「{{ checkResult.name }}（{{ checkResult.cnName }}）」存在
                  <b>{{ checkResult.refs.downstreamTables.length }}</b> 个下游表引用、
                  <b>{{ checkResult.refs.onlineServices.length }}</b> 个在用服务，直接下线将影响下游任务与服务调用。
                </template>
              </a-alert>

              <div class="refs-title">下游表引用</div>
              <a-table
                v-if="checkResult.refs.downstreamTables.length"
                :columns="downstreamColumns"
                :data="checkResult.refs.downstreamTables"
                row-key="name"
                :pagination="false"
                size="small"
                class="refs-table"
              >
                <template #name="{ record }">
                  <span class="tbl-name">{{ record.name }}</span>
                </template>
                <template #status="{ record }">
                  <a-tag size="small" :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
                </template>
              </a-table>
              <div v-else class="none-tip">无下游表引用</div>

              <div class="refs-title">在用服务</div>
              <a-table
                v-if="checkResult.refs.onlineServices.length"
                :columns="serviceColumns"
                :data="checkResult.refs.onlineServices"
                row-key="id"
                :pagination="false"
                size="small"
                class="refs-table"
              >
                <template #kind="{ record }">
                  <a-tag size="small" color="arcoblue">{{ serviceKindLabel(record.kind) }}</a-tag>
                </template>
                <template #endpoint="{ record }">
                  <span class="endpoint">{{ record.endpoint }}</span>
                </template>
              </a-table>
              <div v-else class="none-tip">无在用服务</div>

              <a-space wrap class="refs-actions">
                <a-tooltip v-if="!canAdmin" content="需管理员角色">
                  <span><a-button type="primary" status="danger" disabled>仍要下线</a-button></span>
                </a-tooltip>
                <a-button v-else type="primary" status="danger" @click="openForceModal">
                  <template #icon><icon-exclamation-circle /></template>
                  仍要下线
                </a-button>
                <a-button @click="resetCheck">取消</a-button>
              </a-space>
            </div>

            <!-- 无引用：一步确认 -->
            <div v-else class="clean-block">
              <a-alert type="success" class="refs-alert">
                <template #content>
                  「{{ checkResult.name }}（{{ checkResult.cnName }}）」无下游依赖、无在用服务，可直接下线。
                </template>
              </a-alert>
              <a-space wrap class="refs-actions">
                <a-tooltip v-if="!canAdmin" content="需管理员角色">
                  <span><a-button type="primary" status="danger" disabled>确认下线</a-button></span>
                </a-tooltip>
                <a-button v-else type="primary" status="danger" :loading="offlining" @click="confirmCleanOffline">
                  确认下线
                </a-button>
                <a-button @click="resetCheck">取消</a-button>
              </a-space>
            </div>
          </a-card>

          <!-- 下半区：已下线表 -->
          <a-card :bordered="false" class="block-card" title="已下线表">
            <a-table
              :columns="retiredColumns"
              :data="retiredList"
              row-key="tableId"
              :pagination="{ pageSize: 8, showTotal: true, sizeCanChange: false }"
              :scroll="{ x: 1120 }"
              size="medium"
            >
              <template #name="{ record }">
                <div class="tbl-name">{{ record.name }}</div>
                <div class="tbl-cn">{{ record.cnName }}</div>
              </template>
              <template #offTime="{ record }">
                <span class="submit-time">{{ record.offTime || '-' }}</span>
              </template>
              <template #refs="{ record }">
                <a-space :size="4">
                  <a-tag size="small" :color="refCountOf(record) ? 'orange' : 'gray'">
                    下游 {{ refCountOf(record).down }}
                  </a-tag>
                  <a-tag size="small" :color="refCountOf(record).svc ? 'orange' : 'gray'">
                    服务 {{ refCountOf(record).svc }}
                  </a-tag>
                </a-space>
              </template>
              <template #actions="{ record }">
                <a-space :size="2">
                  <a-tooltip v-if="!canAdmin" content="需管理员角色">
                    <span><a-button type="text" size="small" disabled>恢复上线</a-button></span>
                  </a-tooltip>
                  <a-button v-else type="text" size="small" @click="confirmRestore(record)">恢复上线</a-button>

                  <a-tooltip v-if="!canAdmin" content="需管理员角色">
                    <span><a-button type="text" size="small" status="danger" disabled>彻底删除</a-button></span>
                  </a-tooltip>
                  <a-button v-else type="text" size="small" status="danger" @click="openDelete(record)">彻底删除</a-button>
                </a-space>
              </template>
              <template #empty>
                <a-empty description="暂无已下线的表，可在上方对已上线的表发起下线检查">
                  <a-button type="primary" @click="scrollToStartOffline">去发起下线</a-button>
                </a-empty>
              </template>
            </a-table>
          </a-card>
        </a-tab-pane>

        <!-- ============ Tab3 状态总览 ============ -->
        <a-tab-pane key="overview" title="状态总览">
          <a-alert type="info" class="tab-alert">
            状态机：未上线 → 审核中 → 已上线 → 已下线 → 已删除。点击任一状态卡片，下方清单即时切换；操作列可跳转表详情查看 7 Tab 全量元数据。
          </a-alert>

          <a-card :bordered="false" class="block-card">
            <a-row :gutter="12" class="state-row">
              <a-col v-for="item in funnel" :key="item.status" :xs="12" :sm="8" :md="4" class="state-col">
                <div
                  class="state-card"
                  :class="{ 'state-card--active': activeStatus === item.status }"
                  @click="activeStatus = item.status"
                >
                  <div class="state-label">{{ statusLabel(item.status) }}</div>
                  <div class="state-value" :style="{ color: statusHex(item.status) }">{{ item.count }}</div>
                  <div class="state-tip">{{ STATUS_TIPS[item.status] }}</div>
                </div>
              </a-col>
            </a-row>
            <div class="summary-line">
              目录总数 {{ stats.total }} 张 · 已上线平均质量分 {{ stats.avgQuality }} ·
              文档口径存量 {{ stats.declaredTotal }} 张默认已上线（Demo 精编其中一部分）
            </div>
          </a-card>

          <a-card :bordered="false" class="block-card">
            <div class="expand-title">生命周期漏斗（各状态表数量）</div>
            <div v-for="item in funnel" :key="item.status" class="funnel-row" @click="activeStatus = item.status">
              <span class="funnel-label">{{ statusLabel(item.status) }}</span>
              <div class="funnel-track">
                <div
                  class="funnel-bar"
                  :style="{ width: funnelWidth(item.count), background: statusHex(item.status) }"
                >
                  <span class="funnel-count">{{ item.count }}</span>
                </div>
              </div>
            </div>
          </a-card>

          <a-card :bordered="false" class="block-card">
            <template #title>
              <a-space :size="8">
                <a-tag :color="statusColor(activeStatus)">{{ statusLabel(activeStatus) }}</a-tag>
                <span>表清单（{{ overviewList.length }}）</span>
              </a-space>
            </template>
            <a-table
              :columns="overviewColumns"
              :data="overviewList"
              row-key="tableId"
              :pagination="{ pageSize: 10, showTotal: true, sizeCanChange: false }"
              :scroll="{ x: 980 }"
              size="medium"
            >
              <template #name="{ record }">
                <div class="tbl-name">{{ record.name }}</div>
                <div class="tbl-cn">{{ record.cnName }}</div>
              </template>
              <template #sensitivity="{ record }">
                <a-tag size="small" :color="sensitivityColor(record.sensitivity)">{{ sensitivityLabel(record.sensitivity) }}</a-tag>
              </template>
              <template #actions="{ record }">
                <a-button type="text" size="small" @click="goTableDetail(record)">查看</a-button>
              </template>
              <template #empty>
                <a-empty :description="`当前「${statusLabel(activeStatus)}」状态下暂无表`">
                  <a-button v-if="activeStatus === 'offline'" type="primary" @click="goPool">
                    <template #icon><icon-plus /></template>
                    去未上线池登记 / 提交
                  </a-button>
                  <a-button v-else @click="activeStatus = 'online'">回到已上线</a-button>
                </a-empty>
              </template>
            </a-table>
          </a-card>
        </a-tab-pane>
      </a-tabs>
    </div>

    <!-- 驳回原因弹窗 -->
    <a-modal
      v-model:visible="rejectVisible"
      :title="`驳回上线申请 · ${rejectTarget.name}`"
      :width="560"
      ok-text="确认驳回"
      cancel-text="取消"
      :ok-loading="rejecting"
      @ok="doReject"
      @cancel="rejectVisible = false"
    >
      <a-form ref="rejectFormRef" :model="rejectForm" layout="vertical">
        <a-form-item
          field="reason"
          label="驳回原因（必填，将同步给提交人与负责人）"
          :rules="[
            { required: true, message: '请填写驳回原因' },
            { minLength: 5, message: '驳回原因不少于 5 个字，便于对方定位整改点' }
          ]"
        >
          <a-textarea
            v-model="rejectForm.reason"
            placeholder="例如：字段 total_asset 分级为高敏但未配置权限策略，请补齐授权范围后重新提交"
            :auto-size="{ minRows: 3, maxRows: 6 }"
            :max-length="200"
            show-word-limit
          />
        </a-form-item>
      </a-form>
      <a-descriptions :column="1" size="small" bordered class="reject-desc">
        <a-descriptions-item label="表名">{{ rejectTarget.name }}</a-descriptions-item>
        <a-descriptions-item label="中文名">{{ rejectTarget.cnName }}</a-descriptions-item>
        <a-descriptions-item label="提交人">{{ rejectTarget.submittedBy || '-' }}</a-descriptions-item>
        <a-descriptions-item label="未通过项">{{ rejectTarget.failedText || '全部通过（驳回前建议再核对）' }}</a-descriptions-item>
      </a-descriptions>
      <div class="quick-reasons">
        <span class="quick-label">常用原因（点击追加）：</span>
        <a-space wrap :size="6">
          <a-tag v-for="r in QUICK_REASONS" :key="r" size="small" color="gray" class="quick-tag" @click="useQuickReason(r)">
            {{ r }}
          </a-tag>
        </a-space>
      </div>
    </a-modal>

    <!-- 强制下线二次确认 -->
    <a-modal
      v-model:visible="forceVisible"
      title="强制下线二次确认"
      :width="560"
      ok-text="确认强制下线"
      cancel-text="取消"
      :ok-loading="offlining"
      :ok-button-props="{ disabled: !forceAck, status: 'danger' }"
      @ok="doForceOffline"
      @cancel="forceVisible = false"
    >
      <a-alert type="error" class="force-alert">
        <template #content>
          该表存在 <b>{{ checkResult?.refs.downstreamTables.length || 0 }}</b> 个下游引用、
          <b>{{ checkResult?.refs.onlineServices.length || 0 }}</b> 个在用服务。强制下线后：表退出统一搜索、
          在用服务联动停止，下游任务需自行迁移，风险由操作人「{{ actor }}」承担。
        </template>
      </a-alert>
      <a-descriptions :column="1" size="small" bordered>
        <a-descriptions-item label="表名">{{ checkResult?.name }}</a-descriptions-item>
        <a-descriptions-item label="业务域 / 负责人">
          {{ pickedTable?.domain || '-' }} / {{ pickedTable?.owner || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="受影响下游">
          {{ (checkResult?.refs.downstreamTables || []).map(x => x.name).join('、') || '无' }}
        </a-descriptions-item>
        <a-descriptions-item label="受影响服务">
          {{ (checkResult?.refs.onlineServices || []).map(x => x.name).join('、') || '无' }}
        </a-descriptions-item>
      </a-descriptions>
      <a-checkbox v-model="forceAck" class="force-ack">我已知晓上述影响面，确认强制下线该表</a-checkbox>
    </a-modal>

    <!-- 彻底删除（输入表名确认） -->
    <a-modal
      v-model:visible="deleteVisible"
      title="彻底删除已下线表"
      :width="520"
      ok-text="确认删除"
      cancel-text="取消"
      :ok-loading="deleting"
      :ok-button-props="{ disabled: deleteInput.trim() !== deleteTarget.name, status: 'danger' }"
      @ok="doRemove"
      @cancel="deleteVisible = false"
    >
      <a-alert type="warning" class="force-alert">
        <template #content>
          删除为逻辑删除（状态置为「已删除」），该表将从目录、统一搜索、各状态列表中退出，仅保留审计记录，
          <b>不可恢复</b>。请输入表名以确认。
        </template>
      </a-alert>
      <div class="delete-target">表名：<code>{{ deleteTarget.name }}</code></div>
      <a-input
        v-model="deleteInput"
        :placeholder="`请输入 ${deleteTarget.name} 以确认删除`"
        allow-clear
        class="delete-input"
      />
    </a-modal>
  </PageContainer>
</template>

<script setup lang="ts">
/**
 * 表生命周期管理（数据管理 · management/lifecycle）
 *
 * 单页三 Tab：
 *   Tab1 上线审核队列：reviewing 表 → approve / reject / batchApprove
 *   Tab2 下线审批：online 表 → checkOfflineRefs →（引用清单 + 强制下线二次确认 / 无引用一步确认）offline
 *                  retired 表 → restore / remove
 *   Tab3 状态总览：stats() 五态漏斗 + 数字卡 + 按状态切换的表清单（跳表详情）
 *
 * 唯一数据源：@/mock-dca/shared/table-catalog-store（模块级 ref，操作后本页与其他页面即时互通）
 * 检查项渲染在本页独立实现（仅复用 store 的 REVIEW_CHECK_DEFS / runChecks / hardChecksPassed），
 * 不与 management/pending/review.vue 产生跨页耦合。
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
  REVIEW_CHECK_DEFS,
  STATUS_LABELS,
  STATUS_COLORS,
  SENSITIVITY_LABELS,
  SENSITIVITY_COLORS,
  SERVICE_KIND_LABELS,
  runChecks,
  hardChecksPassed,
  type LogicalTable,
  type OfflineRefs,
  type ReviewCheck,
  type Sensitivity,
  type ServiceKind,
  type TableStatus
} from '@/mock-dca/shared/table-catalog-store'

const router = useRouter()
const roleStore = useRoleStore()

const activeTab = ref<'review' | 'offline' | 'overview'>('review')

// ---------------- 角色与身份 ----------------

const actor = computed(() => roleStore.currentRoleDef.label)
const roleColor = computed(() => roleStore.currentRoleDef.color)
/** 下线 / 恢复 / 删除仅管理员角色可操作 */
const canAdmin = computed(() => ['admin', 'data_admin'].includes(roleStore.currentRole))

onMounted(() => {
  roleStore.initFromStorage()
})

// ---------------- 通用：标签 / 异步节奏 ----------------

const TAG_HEX: Record<string, string> = {
  gray: '#86909c',
  orange: '#ff7d00',
  green: '#00b42a',
  red: '#f53f3f',
  blue: '#4080ff',
  arcoblue: '#165dff'
}

function statusLabel(s: TableStatus | string): string {
  return STATUS_LABELS[s as TableStatus] || String(s)
}
function statusColor(s: TableStatus | string): string {
  return STATUS_COLORS[s as TableStatus] || 'gray'
}
function statusHex(s: TableStatus): string {
  return TAG_HEX[statusColor(s)] || '#86909c'
}
function sensitivityLabel(s: Sensitivity | string): string {
  return SENSITIVITY_LABELS[s as Sensitivity] || String(s)
}
function sensitivityColor(s: Sensitivity | string): string {
  return SENSITIVITY_COLORS[s as Sensitivity] || 'gray'
}
function formatRows(n: number): string {
  return n >= 10000 ? `${(n / 10000).toFixed(1)} 万` : String(n)
}

/** 模拟后端往返（300~800ms） */
function delay(ms?: number): Promise<void> {
  const wait = ms ?? 300 + Math.round(Math.random() * 500)
  return new Promise(resolve => setTimeout(resolve, wait))
}

const stats = computed(() => TableCatalogStore.stats())

// ---------------- Tab1 上线审核队列 ----------------

const queue = computed(() => TableCatalogStore.byStatus('reviewing'))

/** 检查项：优先用提交时的快照，缺失时按当前元数据实时计算 */
function checksOf(t: LogicalTable): ReviewCheck[] {
  const snapshot = t.reviewInfo ? t.reviewInfo.checks || [] : []
  return snapshot.length ? snapshot : runChecks(t)
}
function checkResultOf(t: LogicalTable, key: string): ReviewCheck | undefined {
  return checksOf(t).find(c => c.key === key)
}
function hardTotal(t: LogicalTable): number {
  return checksOf(t).filter(c => c.hard).length
}
function hardPassedCount(t: LogicalTable): number {
  return checksOf(t).filter(c => c.hard && c.passed).length
}
function softMissing(t: LogicalTable): number {
  return checksOf(t).filter(c => !c.hard && !c.passed).length
}
function rejectReasonOf(t: LogicalTable): string {
  return t.reviewInfo && t.reviewInfo.rejectReason ? t.reviewInfo.rejectReason : ''
}
function submittedBy(t: LogicalTable): string {
  return t.reviewInfo && t.reviewInfo.submittedBy ? t.reviewInfo.submittedBy : t.owner
}

const readyCount = computed(() => queue.value.filter(t => hardChecksPassed(checksOf(t))).length)
const softHintCount = computed(() => queue.value.filter(t => softMissing(t) > 0).length)

const reviewFilterDomain = ref<string>('')
const reviewKeyword = ref<string>('')

const reviewDomainOptions = computed(() =>
  Array.from(new Set(queue.value.map(t => t.domain))).map(v => ({ label: v, value: v }))
)
const reviewFiltered = computed(() => {
  const kw = reviewKeyword.value.trim().toLowerCase()
  return queue.value.filter(t => {
    if (reviewFilterDomain.value && t.domain !== reviewFilterDomain.value) return false
    if (!kw) return true
    return (
      t.name.toLowerCase().includes(kw) ||
      t.cnName.toLowerCase().includes(kw) ||
      t.owner.toLowerCase().includes(kw)
    )
  })
})
function clearReviewFilters() {
  reviewFilterDomain.value = ''
  reviewKeyword.value = ''
}

const reviewColumns = [
  { title: '表名', dataIndex: 'name', slotName: 'name', width: 240 },
  { title: '中文名', dataIndex: 'cnName', width: 150, ellipsis: true, tooltip: true },
  { title: '业务域', dataIndex: 'domain', width: 100 },
  { title: '负责人', dataIndex: 'owner', width: 90 },
  { title: '提交人 / 时间', dataIndex: 'submittedAt', slotName: 'submitter', width: 190 },
  { title: '上线检查', dataIndex: 'checks', slotName: 'checks', width: 150 },
  { title: '操作', slotName: 'actions', width: 150, fixed: 'right' as const }
]

const reviewSelected = ref<string[]>([])
const reviewRowSelection = computed(() => ({
  type: 'checkbox' as const,
  showCheckedAll: true,
  selectedRowKeys: reviewSelected.value
}))
function onReviewSelectionChange(keys: (string | number)[]) {
  reviewSelected.value = keys.map(k => String(k))
}
/** 通过 / 驳回后行会消失，同步剔除失效选中项 */
watch(queue, list => {
  const alive = new Set(list.map(t => t.tableId))
  reviewSelected.value = reviewSelected.value.filter(id => alive.has(id))
})

function selectAllReview() {
  if (!reviewFiltered.value.length) {
    Message.info('当前筛选结果为空')
    return
  }
  reviewSelected.value = reviewFiltered.value.map(t => t.tableId)
  Message.success(`已选中当前筛选结果的 ${reviewSelected.value.length} 张表`)
}

const batchApproving = ref(false)
function handleBatchApprove() {
  const ids = [...reviewSelected.value]
  if (!ids.length) {
    Message.info('请先勾选要通过的申请')
    return
  }
  Modal.confirm({
    title: '批量审核通过',
    content: `将批量通过 ${ids.length} 张表的上线申请，通过后即进入已上线状态并在统一搜索可见，同时给各提交人推送站内通知。确认继续？`,
    okText: `确认通过 ${ids.length} 张`,
    cancelText: '取消',
    onOk: async () => {
      batchApproving.value = true
      await delay()
      const res = TableCatalogStore.batchApprove(ids, actor.value)
      batchApproving.value = false
      reviewSelected.value = []
      const text = `批量审核完成：成功 ${res.success} 张${res.failed ? `、失败 ${res.failed} 张（已不在审核中）` : ''}`
      res.failed ? Message.warning(text) : Message.success(text)
    }
  })
}

const busyRow = ref('')
function confirmApprove(record: LogicalTable) {
  const soft = checksOf(record).filter(c => !c.hard && !c.passed)
  Modal.confirm({
    title: '确认审核通过？',
    content:
      `表「${record.name}（${record.cnName}）」通过后即进入已上线状态，统一搜索可检索，并给提交人 ${submittedBy(record)} 推送站内通知。` +
      (soft.length ? `注意：存在 ${soft.length} 项软性提示（${soft.map(c => c.name).join('、')}），不拦截上线。` : ''),
    okText: '确认通过',
    cancelText: '再想想',
    onOk: async () => {
      busyRow.value = record.tableId
      await delay()
      const res = TableCatalogStore.approve(record.tableId, actor.value)
      busyRow.value = ''
      res.ok ? Message.success(res.message) : Message.error(res.message)
    }
  })
}

const rejectVisible = ref(false)
const rejecting = ref(false)
const rejectFormRef = ref<FormInstance>()
const rejectForm = reactive({ reason: '' })
const rejectTarget = reactive({ tableId: '', name: '', cnName: '', submittedBy: '', failedText: '' })

const QUICK_REASONS = [
  '血缘未登记，影响面无法评估',
  '质量分未达 60 分基线',
  '高敏字段未配置权限策略',
  '字段注释缺失，口径不清',
  '与已上线表口径重复，需合并'
]

function openReject(record: LogicalTable) {
  rejectTarget.tableId = record.tableId
  rejectTarget.name = record.name
  rejectTarget.cnName = record.cnName
  rejectTarget.submittedBy = submittedBy(record)
  const failed = checksOf(record).filter(c => !c.passed)
  rejectTarget.failedText = failed.length ? failed.map(c => `${c.name}（${c.hard ? '硬性' : '软性'}）`).join('、') : ''
  rejectForm.reason = ''
  rejectVisible.value = true
}
function useQuickReason(reason: string) {
  rejectForm.reason = rejectForm.reason ? `${rejectForm.reason}；${reason}` : reason
}
async function doReject() {
  const errors = await rejectFormRef.value?.validate()
  if (errors) return
  rejecting.value = true
  await delay()
  const res = TableCatalogStore.reject(rejectTarget.tableId, rejectForm.reason.trim(), actor.value)
  rejecting.value = false
  if (res.ok) {
    Message.success(res.message)
    rejectVisible.value = false
  } else {
    Message.error(res.message)
  }
}

// ---------------- Tab2 下线审批 ----------------

const onlineList = computed(() => TableCatalogStore.byStatus('online'))
const retiredList = computed(() => TableCatalogStore.byStatus('retired'))
const onlineOptions = computed(() =>
  onlineList.value.map(t => ({ label: `${t.name}（${t.cnName}）`, value: t.tableId }))
)
const referencedCount = computed(
  () => onlineList.value.filter(t => refsNotEmpty(TableCatalogStore.checkOfflineRefs(t.tableId))).length
)

interface CheckResult {
  tableId: string
  name: string
  cnName: string
  refs: OfflineRefs
}
const pickedTableId = ref('')
const checking = ref(false)
const offlining = ref(false)
const checkResult = ref<CheckResult | null>(null)
const pickedTable = computed(() => onlineList.value.find(t => t.tableId === pickedTableId.value))
function refsNotEmpty(refs: OfflineRefs | null): boolean {
  return !!refs && (refs.downstreamTables.length > 0 || refs.onlineServices.length > 0)
}
const hasRefs = computed(() => refsNotEmpty(checkResult.value ? checkResult.value.refs : null))
function serviceKindLabel(kind: ServiceKind): string {
  return SERVICE_KIND_LABELS[kind] || kind
}

const downstreamColumns = [
  { title: '表名', dataIndex: 'name', slotName: 'name', width: 220 },
  { title: '中文名', dataIndex: 'cnName', width: 180, ellipsis: true, tooltip: true },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 110 }
]
const serviceColumns = [
  { title: '服务名称', dataIndex: 'name', width: 200, ellipsis: true, tooltip: true },
  { title: '类型', dataIndex: 'kind', slotName: 'kind', width: 120 },
  { title: 'Endpoint', dataIndex: 'endpoint', slotName: 'endpoint' }
]

async function runOfflineCheck() {
  const t = pickedTable.value
  if (!t) {
    Message.info('请先选择一张已上线的表')
    return
  }
  checking.value = true
  await delay()
  const refs = TableCatalogStore.checkOfflineRefs(t.tableId)
  checking.value = false
  if (!refs) {
    Message.error('引用检查失败：表不存在')
    checkResult.value = null
    return
  }
  checkResult.value = { tableId: t.tableId, name: t.name, cnName: t.cnName, refs }
  refsNotEmpty(refs) ? Message.warning('存在下游依赖或在用服务，需二次确认') : Message.success('引用检查通过，无下游依赖')
}
function resetCheck() {
  checkResult.value = null
  forceAck.value = false
}

const forceVisible = ref(false)
const forceAck = ref(false)
function openForceModal() {
  forceAck.value = false
  forceVisible.value = true
}
async function doForceOffline() {
  if (!forceAck.value || !checkResult.value) return
  offlining.value = true
  await delay()
  const res = TableCatalogStore.offline(checkResult.value.tableId, true, actor.value)
  offlining.value = false
  if (res.ok) {
    Message.success(`${res.message} · 已联动停止在用服务并通知下游负责人`)
    forceVisible.value = false
    pickedTableId.value = ''
    resetCheck()
  } else {
    Message.error(res.message)
    if (res.refs && checkResult.value) checkResult.value = { ...checkResult.value, refs: res.refs }
  }
}

function confirmCleanOffline() {
  const r = checkResult.value
  if (!r) return
  Modal.confirm({
    title: '确认下线？',
    content: `表「${r.name}（${r.cnName}）」无下游依赖与在用服务，下线后退出统一搜索，可在下方「已下线表」中恢复上线。`,
    okText: '确认下线',
    cancelText: '取消',
    onOk: async () => {
      offlining.value = true
      await delay()
      const res = TableCatalogStore.offline(r.tableId, false, actor.value)
      offlining.value = false
      if (res.ok) {
        Message.success(res.message)
        pickedTableId.value = ''
        resetCheck()
      } else {
        Message.error(res.message)
        if (res.refs) checkResult.value = { ...r, refs: res.refs }
      }
    }
  })
}

const retiredColumns = [
  { title: '表名', dataIndex: 'name', slotName: 'name', width: 240 },
  { title: '业务域', dataIndex: 'domain', width: 100 },
  { title: '负责人', dataIndex: 'owner', width: 90 },
  { title: '下线时间', dataIndex: 'offTime', slotName: 'offTime', width: 170 },
  { title: '残留引用', dataIndex: 'refs', slotName: 'refs', width: 170 },
  { title: '操作', slotName: 'actions', width: 200, fixed: 'right' as const }
]
function refCountOf(t: LogicalTable): { down: number; svc: number } {
  const refs = TableCatalogStore.checkOfflineRefs(t.tableId)
  return { down: refs ? refs.downstreamTables.length : 0, svc: refs ? refs.onlineServices.length : 0 }
}

function confirmRestore(record: LogicalTable) {
  Modal.confirm({
    title: '恢复上线？',
    content: `表「${record.name}（${record.cnName}）」恢复为已上线，重新进入统一搜索与发现可见范围。`,
    okText: '确认恢复',
    cancelText: '取消',
    onOk: async () => {
      await delay()
      const res = TableCatalogStore.restore(record.tableId, actor.value)
      res.ok ? Message.success(res.message) : Message.error(res.message)
    }
  })
}

const deleteVisible = ref(false)
const deleting = ref(false)
const deleteInput = ref('')
const deleteTarget = reactive({ tableId: '', name: '' })
function openDelete(record: LogicalTable) {
  deleteTarget.tableId = record.tableId
  deleteTarget.name = record.name
  deleteInput.value = ''
  deleteVisible.value = true
}
async function doRemove() {
  if (deleteInput.value.trim() !== deleteTarget.name) {
    Message.warning('请输入完整表名以确认删除')
    return
  }
  deleting.value = true
  await delay()
  const res = TableCatalogStore.remove(deleteTarget.tableId, actor.value)
  deleting.value = false
  if (res.ok) {
    Message.success(res.message)
    deleteVisible.value = false
  } else {
    Message.error(res.message)
  }
}

// ---------------- Tab3 状态总览 ----------------

const LIFECYCLE_STATES: TableStatus[] = ['offline', 'reviewing', 'online', 'retired', 'deleted']
const STATUS_TIPS: Record<TableStatus, string> = {
  offline: '待完善元数据后提交',
  reviewing: 'Tab1 上线审核队列',
  online: '统一搜索 / 发现可见',
  retired: '可恢复上线或彻底删除',
  deleted: '逻辑删除，仅留审计'
}
const funnel = computed(() =>
  LIFECYCLE_STATES.map(s => ({ status: s, count: TableCatalogStore.byStatus(s).length }))
)
const funnelMax = computed(() => Math.max(1, ...funnel.value.map(x => x.count)))
function funnelWidth(count: number): string {
  if (!count) return '3%'
  return `${Math.max(6, Math.round((count / funnelMax.value) * 100))}%`
}
const activeStatus = ref<TableStatus>('online')
const overviewList = computed(() => TableCatalogStore.byStatus(activeStatus.value))

const overviewColumns = [
  { title: '表名', dataIndex: 'name', slotName: 'name', width: 250 },
  { title: '业务域', dataIndex: 'domain', width: 110 },
  { title: '分级', dataIndex: 'sensitivity', slotName: 'sensitivity', width: 90 },
  { title: '负责人', dataIndex: 'owner', width: 100 },
  { title: '操作', slotName: 'actions', width: 110, fixed: 'right' as const }
]

// ---------------- 页面级动作 ----------------

function goTableDetail(record: LogicalTable) {
  if (record.status === 'deleted') {
    Message.info('已删除的表不再提供详情页，仅保留审计记录')
    return
  }
  router.push(`/discovery/data-map/table/${encodeURIComponent(record.name)}`)
}
function goPool() {
  router.push('/management/lifecycle/pending')
}
function scrollToStartOffline() {
  pickedTableId.value = ''
  resetCheck()
  Message.info('请在上方「发起下线」中选择一张已上线的表')
}
function confirmReset() {
  Modal.confirm({
    title: '重置演示数据',
    content: '将清空本地持久化并回到种子状态：本次演示中的通过、驳回、下线、恢复、删除结果全部丢失。确认继续？',
    okText: '确认重置',
    cancelText: '取消',
    onOk: () => {
      TableCatalogStore.resetTableCatalog()
      clearReviewFilters()
      reviewSelected.value = []
      pickedTableId.value = ''
      checkResult.value = null
      forceVisible.value = false
      deleteVisible.value = false
      rejectVisible.value = false
      Message.success('演示数据已重置为初始种子状态')
    }
  })
}
</script>

<style lang="scss" scoped>
.content-wrapper {
  padding: 0 24px 24px;
}
.lifecycle-tabs {
  :deep(.arco-tabs-content) {
    padding-top: 16px;
  }
}
.tab-alert {
  margin-bottom: 12px;
}
.block-card {
  margin-bottom: 12px;
  :deep(.arco-statistic) {
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
  }
  :deep(.arco-statistic-title) {
    font-size: 13px;
  }
}
.hint-text {
  font-size: 12px;
  color: #86909c;
}
.tbl-name {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 13px;
  color: #1d2129;
}
.tbl-cn,
.submit-time,
.submit-sub {
  font-size: 12px;
  color: #86909c;
}
.submitter {
  font-size: 13px;
  color: #1d2129;
}
.expand-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  padding: 12px 16px;
  background: #f7f8fa;
}
.expand-col {
  flex: 1 1 420px;
  min-width: 340px;
}
.expand-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #1d2129;
}
.check-item {
  padding: 6px 10px;
  margin-bottom: 6px;
  background: #fff;
  border-radius: 4px;
}
.check-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.check-name {
  font-size: 13px;
  font-weight: 600;
  color: #1d2129;
}
.check-msg {
  margin-top: 2px;
  padding-left: 22px;
  font-size: 12px;
  color: #4e5969;
}
.reject-box {
  margin-top: 8px;
  padding: 8px 10px;
  font-size: 12px;
  color: #f53f3f;
  background: #ffece8;
  border-radius: 4px;
}
.ic-ok {
  color: #00b42a;
}
.ic-bad {
  color: #f53f3f;
}
.ic-warn {
  color: #ff7d00;
}
.role-tip {
  display: block;
  margin-top: 12px;
}
.role-banner {
  padding: 8px 12px;
  font-size: 12px;
  color: #ff7d00;
  background: #fff7e8;
  border-radius: 4px;
}
.check-empty {
  margin-top: 20px;
}
.refs-block,
.clean-block {
  margin-top: 16px;
}
.refs-alert {
  margin-bottom: 12px;
}
.refs-title {
  margin: 10px 0 6px;
  font-size: 13px;
  font-weight: 600;
  color: #1d2129;
}
.refs-table {
  margin-bottom: 4px;
}
.refs-actions {
  margin-top: 14px;
}
.none-tip {
  font-size: 12px;
  color: #86909c;
}
.endpoint {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 12px;
  color: #4e5969;
}
.state-row {
  margin-bottom: 4px;
}
.state-col {
  margin-bottom: 12px;
}
.state-card {
  padding: 12px 14px;
  cursor: pointer;
  background: #fff;
  border: 1px solid var(--color-border-2, #e5e6eb);
  border-radius: 6px;
  transition: all 0.2s;
}
.state-card:hover {
  border-color: rgb(var(--arcoblue-6));
  box-shadow: 0 2px 8px rgb(0 0 0 / 8%);
}
.state-card--active {
  border-color: rgb(var(--arcoblue-6));
  box-shadow: 0 0 0 2px rgba(22, 93, 255, 0.12);
}
.state-label {
  font-size: 13px;
  color: #4e5969;
}
.state-value {
  margin: 2px 0;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
}
.state-tip {
  font-size: 12px;
  color: #86909c;
}
.summary-line {
  font-size: 12px;
  color: #86909c;
}
.funnel-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  cursor: pointer;
}
.funnel-label {
  width: 64px;
  font-size: 13px;
  color: #4e5969;
  text-align: right;
}
.funnel-track {
  flex: 1;
  background: #f2f3f5;
  border-radius: 4px;
}
.funnel-bar {
  display: flex;
  align-items: center;
  min-width: 28px;
  height: 22px;
  padding-left: 8px;
  border-radius: 4px;
  transition: width 0.3s ease;
}
.funnel-count {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}
.reject-desc {
  margin-top: 8px;
}
.quick-reasons {
  margin-top: 10px;
}
.quick-label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
}
.quick-tag {
  cursor: pointer;
}
.force-alert {
  margin-bottom: 12px;
}
.force-ack {
  display: block;
  margin-top: 12px;
}
.delete-target {
  margin-bottom: 8px;
  font-size: 13px;
  color: #1d2129;
}
.delete-input {
  margin-bottom: 4px;
}
</style>
