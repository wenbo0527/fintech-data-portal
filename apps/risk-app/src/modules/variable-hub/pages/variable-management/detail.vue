<template>
  <div class="variable-detail-page">
    <!-- 404 处理（文档 B2 E1 · 特征ID不存在） -->
    <NotFound
      v-if="notFound"
      :feature-id="variableId"
      :on-retry="() => fetchVariableDetail()"
    />
    <template v-else>
    <div class="page-header">
      <a-breadcrumb class="breadcrumb">
        <a-breadcrumb-item @click="handleBackToList">特征中心</a-breadcrumb-item>
        <a-breadcrumb-item>特征详情</a-breadcrumb-item>
      </a-breadcrumb>

      <div class="header-content">
        <div class="title-section">
          <div class="title-wrapper">
            <h1 class="title">{{ variableData.name || '特征详情' }}</h1>
            <!-- 文档 v2.1 K1 R08：详情页展示「阶段 · 状态」格式 -->
            <template v-if="variableData.category === 'midloan_behavior' && variableData.midloanStatus">
              <a-tag v-if="getPhaseByStatus(variableData.midloanStatus)" color="gray" size="small">
                {{ getPhaseByStatus(variableData.midloanStatus)?.label }}
              </a-tag>
              <span style="color: #86909c; margin: 0 2px;">·</span>
              <a-tag :color="midloanStatusColor(variableData.midloanStatus)" class="status-tag" size="medium">{{ midloanStatusLabel(variableData.midloanStatus) }}</a-tag>
              <!-- 文档 v2.1 §四：数据形态标签（离线分析/在线接口） -->
              <a-tag
                :color="midloanStatusDataForm(variableData.midloanStatus) === 'offline_analysis' ? 'arcoblue' : 'green'"
                size="small"
              >
                {{ midloanStatusDataForm(variableData.midloanStatus) === 'offline_analysis' ? '离线分析' : '在线接口' }}
              </a-tag>
            </template>
            <a-tag v-else :color="getStatusColor(variableData.status)" class="status-tag" size="medium">{{ getStatusLabel(variableData.status) }}</a-tag>
            <a-tag color="purple" size="small" class="role-tag">当前角色：{{ currentUserName }}（{{ currentRole === 'risk_data_member' ? '成员' : currentRole === 'risk_data_admin' ? '管理员' : '社区' }}）</a-tag>
          </div>

          <!-- 顶部公共信息（永久可见：全品类公共·注册即确定） -->
          <div class="header-public-grid">
            <div class="public-row">
              <div class="public-item"><span class="label">特征编码</span><span class="value mono">{{ headerPublic.code }}</span></div>
              <div class="public-item"><span class="label">特征类型</span><span class="value">{{ headerPublic.variableType }}</span></div>
              <div class="public-item"><span class="label">字段类型</span><span class="value">{{ headerPublic.fieldType }}</span></div>
              <div class="public-item"><span class="label">默认值</span><span class="value mono">{{ headerPublic.defaultValue }}</span></div>
            </div>
            <div class="public-row">
              <div class="public-item"><span class="label">来源类型</span><span class="value">{{ headerPublic.sourceType }}</span></div>
              <div class="public-item"><span class="label">特征粒度</span><span class="value">{{ headerPublic.featureGranularity }}</span></div>
              <div class="public-item"><span class="label">一级分类</span><span class="value">{{ headerPublic.categoryLevel1 }}</span></div>
              <div class="public-item"><span class="label">二级分类</span><span class="value">{{ headerPublic.categoryLevel2 }}</span></div>
            </div>
            <div class="public-row">
              <div class="public-item"><span class="label">需求提出人</span><span class="value">{{ headerPublic.proposer }}</span></div>
              <div class="public-item"><span class="label">创建人</span><span class="value">{{ headerPublic.creator }}</span></div>
              <div class="public-item public-full"><span class="label">标签 / 维度</span>
                <span class="value tag-row">
                  <a-tag v-for="t in headerPublic.tagList" :key="'t'+t" color="arcoblue" size="mini">{{ t }}</a-tag>
                  <a-tag v-for="d in headerPublic.dimensionList" :key="'d'+d" color="green" size="mini">{{ d }}</a-tag>
                  <span v-if="headerPublic.tagList.length === 0 && headerPublic.dimensionList.length === 0" class="empty">无</span>
                </span>
              </div>
            </div>
          </div>

          <!-- 简短描述摘要（顶部只给截前 80 字，长文本统一进 tab 的业务含义卡） -->
          <div class="header-description-summary">
            <span class="label">描述摘要</span>
            <span class="value">{{ headerPublic.descriptionSummary }}</span>
          </div>
        </div>

        <div class="actions">
          <a-button @click="handleBackToList">
            <template #icon><IconArrowLeft /></template>
            返回列表
          </a-button>
          <a-button
            v-if="['draft', 'pending'].includes(String(variableData.status || ''))"
            type="primary"
            @click="openEnableApproval"
          >
            <template #icon><IconExperiment /></template>
            提交上线申请
          </a-button>
          <a-button type="primary" @click="handleEdit">
            <template #icon><IconEdit /></template>
            编辑
          </a-button>
          <a-dropdown trigger="click" @select="handleMoreSelect">
            <a-button>更多</a-button>
            <template #content>
              <a-doption value="toggle">{{ variableData.status === 'active' ? '停用' : '启用' }}</a-doption>
              <a-doption value="delete">删除</a-doption>
            </template>
          </a-dropdown>
        </div>
      </div>
    </div>

    <div class="detail-content">
      <!-- ========== 编辑保护提示（用户反馈）============ -->
      <a-alert
        v-if="showEditLockNotice"
        :type="editLockNoticeType"
        :show-icon="true"
        style="margin-bottom: 16px"
      >
        <template #title>
          <icon-lock /> 编辑保护 · {{ editLockNoticeTitle }}
        </template>
        <div>{{ getEditLockReason(currentMidloanStatus) }}</div>
        <div v-if="lockedFields.length > 0" style="margin-top: 8px; font-size: 12px;">
          <strong>已锁定的字段（{{ lockedFields.length }}）：</strong>
          <a-tag v-for="f in lockedFields" :key="f.field" color="gray" size="mini" style="margin-left: 4px">
            {{ f.label }}
          </a-tag>
        </div>
      </a-alert>

      <a-tabs v-model:active-key="activeTab" class="detail-tabs">
        <a-tab-pane key="basic" title="特征基础信息">

          <!-- ========= 基础人员信息（注册即有 + 后期部分回填） ========= -->
          <a-card title="基础与人员信息" class="detail-card">
            <a-descriptions :column="3" bordered size="small">
              <a-descriptions-item label="创建时间">{{ basePersonInfo.createdAt }}</a-descriptions-item>
              <a-descriptions-item label="更新时间">{{ basePersonInfo.updatedAt }}</a-descriptions-item>
              <a-descriptions-item label="需求提出人">{{ basePersonInfo.proposer }}</a-descriptions-item>
              <a-descriptions-item label="管理人">{{ basePersonInfo.adminManager }}</a-descriptions-item>
              <a-descriptions-item label="数仓开发人员">{{ basePersonInfo.developer }}</a-descriptions-item>
              <a-descriptions-item label="验收人">{{ basePersonInfo.acceptor }}</a-descriptions-item>
            </a-descriptions>
          </a-card>

          <!-- ========= 长文本区（业务含义 + 技术口径 + 备注） ========= -->
          <a-card title="业务含义与技术口径" class="detail-card">
            <div class="longtext-block">
              <div class="longtext-label"><icon-file-document /> 业务含义 / 使用场景</div>
              <a-typography-paragraph
                :ellipsis="{ rows: 6, expandable: true, showTooltip: true }"
                class="longtext-value"
              >{{ longtextMeaning }}</a-typography-paragraph>
            </div>
            <a-divider style="margin: 16px 0" />
            <div class="longtext-block">
              <div class="longtext-label"><icon-code /> 技术口径 / 加工逻辑（SQL / 公式 / 伪代码）</div>
              <pre class="longtext-code">{{ longtextProcessingLogic || '暂无口径说明' }}</pre>
            </div>
            <a-divider style="margin: 16px 0" />
            <div class="longtext-block">
              <div class="longtext-label"><icon-edit-2 /> 备注</div>
              <a-typography-paragraph
                :ellipsis="{ rows: 4, expandable: true }"
                class="longtext-value"
              >{{ longtextRemark || '—' }}</a-typography-paragraph>
            </div>
          </a-card>

          <!-- ========= HIVE 表与字段（标准化前表/字段 + 标准化后 HIVE 表（= 数据底表）+ 分区 + 更新频率） ========= -->
          <a-card title="HIVE 表与字段" class="detail-card">
            <a-alert v-if="!hiveInfo.registered" type="warning" :show-icon="true" style="margin-bottom: 12px">
              <template #title>
                数据底表（标准化后 HIVE 表）未登记
                <a-button size="mini" type="primary" style="margin-left: 8px" @click="openSupplementTable">
                  补充数据底表
                </a-button>
              </template>
              <div>数据开发完成后，需由数仓同学补充「数据底表 + HIVE 表与字段」，补齐后才能进入业务验收。</div>
            </a-alert>
            <a-alert v-else type="info" :show-icon="true" style="margin-bottom: 12px">
              <template #title>HBase 数据由 HIVE 提供，下方为底层 HIVE 表注册信息</template>
              <div>
                标准化前表名/字段 = 原始上游表（数据源）→ 标准化后 HIVE 表 = 「技术关联信息」中的数据底表（同一份值，不重复登记）
              </div>
            </a-alert>
            <a-descriptions :column="2" bordered size="small">
              <a-descriptions-item label="标准化前表名（原始上游）">
                <a-space>
                  <code class="mono">{{ hiveInfo.sourceTableLabel }}</code>
                  <a-button size="mini" type="text" @click="copyText(hiveInfo.sourceTableLabel, '标准化前表名')">复制</a-button>
                </a-space>
              </a-descriptions-item>
              <a-descriptions-item label="标准化前字段名（原始上游）">
                <a-space>
                  <code class="mono">{{ hiveInfo.sourceFieldName }}</code>
                  <a-button size="mini" type="text" @click="copyText(hiveInfo.sourceFieldName, '标准化前字段名')">复制</a-button>
                </a-space>
              </a-descriptions-item>
              <a-descriptions-item label="标准化后 HIVE 表（即数据底表）" :span="2">
                <a-space>
                  <code class="mono strong">{{ hiveInfo.tableName }}</code>
                  <a-tag color="green" size="small">与「技术关联信息 · 数据底表」同一份值</a-tag>
                  <a-button size="mini" type="text" @click="copyText(hiveInfo.tableName, '数据底表（HIVE 表）')">复制</a-button>
                </a-space>
              </a-descriptions-item>
              <a-descriptions-item label="是否分区表">{{ hiveInfo.isPartitioned ? '是' : '否' }}</a-descriptions-item>
              <a-descriptions-item label="分区字段">
                <a-tag v-for="p in hiveInfo.partitionFields" :key="p" color="purple" size="mini" style="margin-right: 4px;">
                  {{ p }}
                </a-tag>
                <span v-if="hiveInfo.partitionFields.length === 0">—</span>
              </a-descriptions-item>
              <a-descriptions-item label="更新频率">{{ hiveInfo.updateFrequency }}</a-descriptions-item>
            </a-descriptions>
          </a-card>

          <!-- ========= 技术关联信息（精简） ========= -->
          <a-card title="技术关联信息" class="detail-card">
            <a-descriptions :column="2" bordered size="small">
              <a-descriptions-item label="数据源名称">{{ techLink.dataSourceName }}</a-descriptions-item>
              <a-descriptions-item label="数据底表名称（= 标准化后 HIVE 表）">
                <a-space>
                  <code v-if="techLink.dataTableName" class="mono strong">{{ techLink.dataTableName }}</code>
                  <span v-else class="missing-table">未补充（必填）</span>
                  <a-button size="mini" type="primary" v-if="!techLink.dataTableName" @click="openSupplementTable">补充</a-button>
                  <a-button size="mini" v-else @click="openSupplementTable">修改</a-button>
                </a-space>
              </a-descriptions-item>
              <a-descriptions-item label="接口号（生产）">
                <code v-if="techLink.apiNo" class="mono">{{ techLink.apiNo }}</code>
                <span v-else>—（阶段4上线后回填）</span>
              </a-descriptions-item>
              <a-descriptions-item label="响应字段（外数）">
                <span>{{ techLink.responseField || '—（仅外数品类）' }}</span>
              </a-descriptions-item>
            </a-descriptions>
          </a-card>

          <!-- 关键时间戳 & 运维信息已内嵌到离线分析/API调用两个 tab 的 StatusStepFlow 中，无需重复展示 -->

          <!-- ========= 非贷中行为：通用生命周期阶段 ========= -->
          <template v-if="!isMidloanBehavior">
            <a-card title="生命周期阶段（通用）" class="detail-card">
              <a-alert type="info" :show-icon="false" style="margin-bottom: 12px">
                本品类（{{ nonMidloanCategoryLabel }}）采用通用生命周期阶段，不接入贷中行为 11 状态机。
                如需使用精细化状态机，请联系数据团队评估迁移到「贷中行为」品类。
              </a-alert>
              <a-descriptions :column="2" :data="lifecycleHeader" bordered />
              <a-divider style="margin: 12px 0" />
              <a-table :data="lifecycleStages" :pagination="false">
                <template #columns>
                  <a-table-column title="阶段" data-index="stage" :width="160" />
                  <a-table-column title="状态" :width="120">
                    <template #cell="{ record }">
                      <a-tag :status="record.status==='completed'?'success':(record.status==='in_progress'?'warning':'default')">{{ record.statusLabel }}</a-tag>
                    </template>
                  </a-table-column>
                  <a-table-column title="开始时间" data-index="startDate" :width="160" />
                  <a-table-column title="结束时间" data-index="endDate" :width="160" />
                  <a-table-column title="说明" data-index="description" />
                </template>
                <template #empty><a-empty description="暂无阶段数据" /></template>
              </a-table>
            </a-card>
          </template>
        </a-tab-pane>

        <!-- ========== 离线分析状态（阶段 1-3：注册/开发/验证）============ -->
        <a-tab-pane key="offline_lifecycle" title="离线分析状态（阶段1-3）">
          <template v-if="isMidloanBehavior">
            <a-card title="离线分析状态链路（阶段1·注册 / 阶段2·开发 / 阶段3·验证）" class="detail-card">
              <StatusStepFlow
                :status="currentMidloanStatus"
                scope="offline_analysis"
                :status-change-list="statusChangeList"
                :sync-logs="syncLogList"
                :offline-batches="offlineBatchSummary?.list || []"
                :feature-archive="featureArchiveSummary"
                :retry-count="variableData.syncRetryCount || 0"
                :failed-reason="variableData.syncFailedReason"
                :failed-at="variableData.syncFailedAt"
                :show-retry="canRetryInOfflineScope && hasPerm(PERMISSIONS.RETRY_SYNC)"
                :show-manual-retry="false"
                :retry-label="retryLabel"
                @retry="onRetry"
                @manual-retry="onManualBatchRetry"
                @action="onAction"
                @supplement-table="openSupplementTable"
              />
            </a-card>
          </template>
          <template v-else>
            <a-alert type="info" :show-icon="true" class="detail-card">
              <template #title>非贷中行为品类</template>
              <div>本品类（{{ nonMidloanCategoryLabel }}）采用通用阶段，不接入贷中行为 11 状态机。</div>
            </a-alert>
          </template>
        </a-tab-pane>

        <!-- ========== API 调用状态（阶段 4-5：上线/汰换）============ -->
        <a-tab-pane key="api_lifecycle" title="API调用状态（阶段4-5）">
          <template v-if="isMidloanBehavior">
            <a-card title="API 调用状态链路（阶段4·上线 / 阶段5·汰换）" class="detail-card">
              <StatusStepFlow
                :status="currentMidloanStatus"
                scope="online_interface"
                :status-change-list="statusChangeList"
                :sync-logs="syncLogList"
                :offline-batches="offlineBatchSummary?.list || []"
                :feature-archive="featureArchiveSummary"
                :retry-count="variableData.syncRetryCount || 0"
                :failed-reason="variableData.syncFailedReason"
                :failed-at="variableData.syncFailedAt"
                :show-retry="canRetryInApiScope && hasPerm(PERMISSIONS.RETRY_SYNC)"
                :show-manual-retry="currentMidloanStatus === 'offline_failed' && hasPerm(PERMISSIONS.RETRY_SYNC)"
                :retry-label="retryLabel"
                @retry="onRetry"
                @manual-retry="onManualBatchRetry"
                @action="onAction"
                @supplement-table="openSupplementTable"
              />
            </a-card>
            <!-- 下线批次汇总卡（K2 R03） -->
            <OfflineBatchCard :summary="offlineBatchSummary" />
          </template>
          <template v-else>
            <a-alert type="info" :show-icon="true" class="detail-card">
              <template #title>非贷中行为品类</template>
              <div>本品类（{{ nonMidloanCategoryLabel }}）采用通用阶段，不接入贷中行为 11 状态机。</div>
            </a-alert>
          </template>
        </a-tab-pane>

        <a-tab-pane key="evaluation" title="特征评估">
          <EvaluationCard
            :analysis-reports="analysisReports"
            :analysis-report-columns="analysisReportColumns"
            :is-external="variableData.sourceType === 'external'"
            :is-external-linked="!!variableData.sourceRefs?.externalEvaluationId"
            :external-eval-id="variableData.sourceRefs?.externalEvaluationId || ''"
            :branch-storage-key="`branch-reports:${variableData.id}`"
            :on-open-external-evaluation="handleOpenExternalEvaluation"
            :on-unlink-external-evaluation="handleUnlinkExternalEvaluation"
            :on-link-external-evaluation="handleLinkExternalEvaluation"
            @view-report="handleViewAnalysisReport"
            @copy-link="handleCopyReportLink"
          />
        </a-tab-pane>

        <a-tab-pane key="lineage-usage" title="血缘与使用">
          <LineageUsageCard
            :upstream-lineage="upstreamLineage"
            :downstream-lineage="downstreamLineage"
            :variable-code="variableData.code"
            :variable-name="variableData.name"
          />
        </a-tab-pane>

        <a-tab-pane key="versions" title="变更记录">
          <ChangeRecordCard
            :version-list="versionList"
            :version-columns="versionColumns"
            :version-pagination="versionPagination"
            @version-page-change="handleVersionPageChange"
            @compare-version="handleCompareVersion"
            @rollback-version="handleRollbackVersion"
          />
        </a-tab-pane>
      </a-tabs>
    </div>

    <a-drawer v-model:visible="enableApprovalVisible" title="启用审批（提交上线申请）" :width="640">
      <a-form :model="enableApprovalForm" layout="vertical">
        <a-form-item label="特征名称">
          <a-input :model-value="variableData.name" disabled />
        </a-form-item>
        <a-form-item label="特征编码">
          <a-input :model-value="variableData.code" disabled />
        </a-form-item>
        <a-form-item field="reason" label="启用原因" required>
          <a-textarea v-model="enableApprovalForm.reason" placeholder="请输入启用原因" :max-length="200" show-word-limit />
        </a-form-item>
        <a-form-item field="expectedOnlineTime" label="期望生效时间">
          <a-input v-model="enableApprovalForm.expectedOnlineTime" placeholder="例如：2026-06-25 18:00:00" />
        </a-form-item>
        <a-form-item field="approver" label="审批人" required>
          <a-select v-model="enableApprovalForm.approver" placeholder="请选择审批人">
            <a-option value="risk_data_lead">风险数据负责人</a-option>
            <a-option value="data_app_lead">数据应用负责人</a-option>
            <a-option value="dmt_admin">数据管理管理员</a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="remark" label="备注">
          <a-textarea v-model="enableApprovalForm.remark" placeholder="可选：补充说明" :max-length="200" show-word-limit />
        </a-form-item>
      </a-form>

      <a-alert type="info" :show-icon="false" style="margin-top: 8px">
        提交后 Demo 流程：自动通过审批 → 状态置为「已发布」→ 特征进入运营监控阶段。真实生产需走 OA 审批。
      </a-alert>

      <a-divider style="margin: 12px 0" />
      <a-space>
        <a-button @click="enableApprovalVisible = false">取消</a-button>
        <a-button type="primary" :loading="enableApprovalSubmitting" @click="submitEnableApproval">发起审批</a-button>
      </a-space>
    </a-drawer>

    <!-- ========== 补充数据底表（B1 R10 · 卡片级局部补录，用弹窗承载：技术关联信息 + HIVE 表与字段）========== -->
    <a-modal
      v-model:visible="supplementTableVisible"
      :title="supplementTableForm.tableName ? '修改数据底表与 HIVE 登记信息' : '补充数据底表与 HIVE 登记信息'"
      :width="800"
      :ok-loading="supplementTableSubmitting"
      ok-text="保存并回填"
      cancel-text="取消"
      @cancel="supplementTableVisible = false"
      @ok="onSupplementTable"
    >
      <a-alert type="warning" :show-icon="false" style="margin-bottom: 16px">
        数据底表名称是内数 API 注册（INT-01）的必填参数，填「HIVE 库名.表名」（如 risk_dw.ads_xxx）即可，
        它同时就是标准化后的 HIVE 表，无需重复填写。保存后同步回填详情页「技术关联信息」与「HIVE 表与字段」两张卡片。
      </a-alert>
      <div class="supp-scroll">
      <a-form :model="supplementTableForm" layout="vertical" :disabled="supplementTableSubmitting">
        <a-card title="技术关联信息" size="small" class="supp-block">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="数据底表名称（HIVE 库.表）" required>
                <a-input
                  v-model="supplementTableForm.tableName"
                  placeholder="例如：risk_dw.ads_midloan_collect_resp_hrs"
                  allow-clear
                />
                <template #extra>即标准化后的 HIVE 表名，库名与表名合并为一份填写</template>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="数据源名称">
                <a-input v-model="supplementTableForm.dataSourceName" placeholder="例如：数仓（内数）" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="接口号">
                <a-input v-model="supplementTableForm.apiNo" placeholder="阶段4 上线后回填，可留空" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="响应字段（外数）">
                <a-input v-model="supplementTableForm.responseField" placeholder="仅外数品类需要填写，与 HIVE 字段无关，可留空" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :span="24">
              <a-form-item label="补充说明">
                <a-textarea v-model="supplementTableForm.remark" placeholder="可说明补全原因、口径变更等" :rows="2" />
              </a-form-item>
            </a-col>
          </a-row>
        </a-card>

        <a-card title="HIVE 表与字段" size="small" class="supp-block">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="标准化前表名（原始上游，库.表）">
                <a-input v-model="supplementTableForm.hive.sourceTableName" placeholder="例如：ods_nis_login.ods_login_log_di" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="标准化前字段（原始上游）">
                <a-input v-model="supplementTableForm.hive.sourceFieldName" placeholder="例如：ip_change_cnt_7d" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="更新频率">
                <a-select v-model="supplementTableForm.hive.updateFrequency" placeholder="请选择更新频率" allow-clear>
                  <a-option v-for="f in UPDATE_FREQUENCY_OPTIONS" :key="f" :value="f" :label="f" />
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="标准化后 HIVE 表">
                <a-input :model-value="supplementTableForm.tableName || '—'" disabled />
                <template #extra>自动取上方「数据底表名称」，不可单独填写</template>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="是否分区表">
                <a-switch v-model="supplementTableForm.hive.isPartitioned" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="分区字段">
                <a-input-tag
                  v-model="supplementTableForm.hive.partitionFields"
                  :disabled="!supplementTableForm.hive.isPartitioned"
                  placeholder="输入后回车添加，例如 ds"
                  allow-clear
                />
              </a-form-item>
            </a-col>
          </a-row>
        </a-card>
      </a-form>
      </div>
    </a-modal>

    <a-modal v-model:visible="reportPreviewVisible" :title="reportPreviewTitle" :footer="false" width="720px">
      <a-descriptions :data="reportPreviewMeta" :column="2" bordered />
      <a-divider />
      <a-table :data="reportPreviewFindings" :pagination="false" row-key="id">
        <template #columns>
          <a-table-column title="结论项" data-index="item" />
          <a-table-column title="结果" data-index="result" :width="160" />
          <a-table-column title="说明" data-index="desc" />
        </template>
        <template #empty><a-empty description="暂无内容" /></template>
      </a-table>
    </a-modal>

    <a-modal v-model:visible="deriveVisible" title="衍生特征（Demo）" ok-text="继续" cancel-text="取消" @ok="confirmDerive">
      <a-space direction="vertical" fill>
        <a-alert type="info" :show-icon="false">
          衍生特征可选择“发起探索课题”沉淀过程证据链，或“直接上线”进入上线与治理流程。
        </a-alert>
        <a-form :model="deriveForm" layout="vertical">
          <a-form-item label="新特征名称">
            <a-input v-model="deriveForm.name" allow-clear placeholder="例如：xxx_衍生" />
          </a-form-item>
          <a-form-item label="路径选择">
            <a-radio-group v-model="deriveForm.mode">
              <a-radio value="topic">发起探索课题</a-radio>
              <a-radio value="online">直接上线</a-radio>
            </a-radio-group>
          </a-form-item>
        </a-form>
      </a-space>
    </a-modal>

    <GovernanceActionDrawer
      v-model="governanceVisible"
      context-type="variable"
      :context-id="String(variableId)"
      :context-name="variableData.name"
      :default-tab="governanceDefaultTab"
    />

    <!-- ========== 演示控制台 + 角色切换器（P1-1） ========== -->
    <DemoConsole @reset-feature="onResetFeature" @quick="onDemoQuick" />

    <!-- ========== OA 单/验收/上线/下线抽屉（文档 C1 R02 / E1 R04 / F1 R02）============ -->
    <MidloanActionDrawer
      v-model:visible="actionDrawerVisible"
      :action-key="currentActionKey"
      :variable-data="variableData"
      @submit="onActionSubmit"
    />
    <!-- ========== 注册 / 编辑特征（与台账同一抽屉：审核模式 submit_requirement + 编辑模式）============ -->
    <VariableRegisterDrawer
      v-model:visible="registerDrawerVisible"
      :requirement-data="registerDrawerRequirementData"
      :mode="registerDrawerMode"
      :edit-data="registerDrawerEditData"
      :existing-names="existingFeatureNames"
      :existing-cn-names="existingFeatureCnNames"
      @submit="handleRegisterSubmit"
    />
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, shallowRef } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import { useVariableStore } from '@/modules/variable-hub/store/variable'
import { buildRiskAppUrl } from '@/utils/appLinks'
import { LineageGraph } from '@app/lineage-graph'
import { IconArrowLeft, IconEdit, IconCopy, IconDriveFile, IconExperiment } from '@arco-design/web-vue/es/icon'
import { PROFILE_FIELD_SCHEMAS, LIFECYCLE_SUPPLEMENT_GUIDE } from '@/modules/variable-hub/mock/variable-management/profile-schemas'
import { VariableDraftStore } from '@/modules/variable-hub/mock/variable-management/variable-draft-store'
import { variableAssets } from '@/modules/variable-hub/mock/variable-management/variables'
import { VariableStatusStore } from '@/modules/variable-hub/mock/variable-management/variable-status-store'
import { ExploreStore } from '@/modules/variable-hub/mock/explore/explore-store'
import GovernanceActionDrawer from '@/modules/variable-hub/components/GovernanceActionDrawer.vue'
import ParamGroup from '@/modules/variable-hub/components/ParamGroup.vue'
import NotFound from '@/modules/variable-hub/components/common/NotFound.vue'
import MidloanActionDrawer from '@/modules/variable-hub/components/risk-feature/MidloanActionDrawer.vue'
import VariableRegisterDrawer from '@/modules/variable-hub/components/risk-feature/VariableRegisterDrawer.vue'
import OfflineBatchCard from '@/modules/variable-hub/components/risk-feature/OfflineBatchCard.vue'
import StatusChangeTable from '@/modules/variable-hub/components/risk-feature/StatusChangeTable.vue'
import LineageUsageCard from '@/modules/variable-hub/components/risk-feature/LineageUsageCard.vue'
import ChangeRecordCard from '@/modules/variable-hub/components/risk-feature/ChangeRecordCard.vue'
import EvaluationCard from '@/modules/variable-hub/components/risk-feature/EvaluationCard.vue'
import StatusStepFlow from '@/modules/variable-hub/components/risk-feature/StatusStepFlow.vue'
import StatusTimeline11 from '@/modules/variable-hub/components/risk-feature/StatusTimeline11.vue'
import { allowedActionsByStatus, isRetryableFailedStatus, midloanStatusLabel, midloanStatusColor, getEditLockReason, getLockedFields, getPhaseByStatus, midloanStatusDataForm, getStatusCategory, canEdit } from '@/modules/variable-hub/constants/midloanStatusMap'
import MidloanStateEngine, { SyncLogStore, OfflineRecordStore, StatusChangeStore } from '@/modules/variable-hub/mock/risk-feature/stateEngine'
import DemoConsole from '@/modules/variable-hub/components/risk-feature/DemoConsole.vue'
import UserContext, { PERMISSIONS } from '@/modules/variable-hub/mock/risk-feature/permissions'

const router = useRouter()
const route = useRoute()
const variableStore = useVariableStore()
const variableId = computed(() => String(route.params.id || ''))
// 404 标识（文档 B2 E1 · 特征ID不存在）
const notFound = ref(false)

// 当前激活的标签页
const activeTab = ref('basic')

// 头部辅助信息（创建人/更新时间）默认折叠，避免首屏过密
const headerInfoExpanded = ref([])

// 特征数据：使用 shallowRef 持有本地副本，mutation 后通过 reset/refresh 同步 store 变更
// 注意：必须用 ref 而非 computed，否则后续给 .value 赋值会触发"Maximum recursive updates"
const EMPTY_VARIABLE = {
  id: '',
  name: '',
  code: '',
  type: '',
  status: '',
  description: '',
  dataSource: '',
  dataSourceName: '',
  sourceField: '',
  updateFrequency: '',
  dataQuality: 0,
  missingRate: 0,
  uniqueValueCount: 0,
  definition: '',
  creator: '',
  createdAt: '',
  updatedAt: '',
  sourceType: '',
  sourceRefs: {},
  category: '',
  profile: {}
}

const variableData = shallowRef(structuredCloneSafe(variableStore.currentVariable) || EMPTY_VARIABLE)

/** 把 store 中的当前特征复制到本地 ref（mutation 后调用）*/
function syncVariableFromStore() {
  const cur = variableStore.currentVariable
  if (!cur) return
  try {
    variableData.value = structuredClone(cur)
  } catch {
    try {
      variableData.value = JSON.parse(JSON.stringify(cur))
    } catch {
      variableData.value = { ...cur }
    }
  }
}

/** structuredClone 的安全降级包装 */
function structuredCloneSafe(obj) {
  if (obj == null) return obj
  try {
    return structuredClone(obj)
  } catch {
    try {
      return JSON.parse(JSON.stringify(obj))
    } catch {
      return { ...obj }
    }
  }
}

const variableCategory = computed(() => {
  const v = variableStore.currentVariable || {}
  if (v.category) return v.category
  if (v.sourceType === 'credit') return 'credit'
  if (v.sourceType === 'external') return 'external'
  if (v.sourceType === 'internal') return 'behavior'
  return 'behavior'
})

const typedProfileTitle = computed(() => {
  if (variableCategory.value === 'external') return '外数字段基础信息'
  if (variableCategory.value === 'credit') return '征信特征基础信息'
  return '行为特征基础信息'
})

/** 当前品类的 profile 原始对象（方便各分层卡直接取字段） */
const profile = computed(() => (variableStore.currentVariable || {}).profile || {})

// 顶部公共信息（永久可见 · 注册即确定 · 全品类公共）
const headerPublic = computed(() => {
  const v = variableData.value
  const p = profile.value
  const categoryLabel = sourceTypeLabel.value || '—'
  const granularity = v.featureGranularity === 'identity_plus_product'
    ? '身份证号 + 产品号'
    : (v.featureGranularity === 'identity_only' ? '身份证号' : '—')
  const catL1 = p.categoryLevel1 || '—'
  const catL2 = p.categoryLevel2 || '—'
  const tagList = Array.isArray(p.tags) ? p.tags.filter(Boolean) : (p.tags ? String(p.tags).split(/[,，、\s]+/).filter(Boolean) : [])
  const dimensionList = Array.isArray(p.dimensions) ? p.dimensions.filter(Boolean) : (p.dimensions ? String(p.dimensions).split(/[,，、\s]+/).filter(Boolean) : [])
  const rawDesc = v.description || ''
  const summary = rawDesc.length > 80 ? rawDesc.slice(0, 80) + '…' : (rawDesc || '—')
  return {
    code: v.code || '—',
    variableType: getTypeLabel(v.type) || '—',
    fieldType: p.fieldType || v.fieldType || '—',
    defaultValue: (p.defaultValue ?? v.defaultValue ?? '') === '' ? '无' : (String(p.defaultValue ?? v.defaultValue)),
    sourceType: categoryLabel,
    featureGranularity: granularity,
    categoryLevel1: catL1,
    categoryLevel2: catL2,
    proposer: v.requirementProposer || v.creator || '—',
    creator: v.creator || '—',
    tagList,
    dimensionList,
    descriptionSummary: summary
  }
})

/** 长文本：业务含义（合并 description + definition + profile.meaning） */
const longtextMeaning = computed(() => {
  const v = variableData.value
  const p = profile.value
  const parts = []
  if (v.description) parts.push(v.description)
  if (v.definition) parts.push(`【特征定义】\n${v.definition}`)
  if (p.meaning && !parts.some(x => x.includes(p.meaning))) parts.push(`【业务解释】\n${p.meaning}`)
  return parts.join('\n\n') || '暂无业务含义说明'
})

/** 长文本：技术口径 / 加工逻辑（SQL/公式/伪代码） */
const longtextProcessingLogic = computed(() => {
  const v = variableData.value
  const p = profile.value
  const logic = p.processingLogic || v.processingLogic || ''
  const parts = []
  if (logic) parts.push(logic)
  if (p.formula && !parts.some(x => x.includes(p.formula))) parts.push(`公式：${p.formula}`)
  return parts.join('\n\n')
})

/** 长文本：备注 */
const longtextRemark = computed(() => profile.value.remark || variableData.value.remark || '')

/**
 * HIVE 表与字段（标准化前/后表名与字段、是否分区、分区字段、更新频率）
 * 数据源：「补充数据底表」表单登记的 v.hiveInfo；未登记时只从 B1 源表字段推断，
 * 不再用 risk_dw / ods_raw / ['ds'] 等假数据兜底，避免看不出"是否真的补充过"。
 * 注意：标准化后 HIVE 表 = 技术关联信息里的「数据底表名称」（同一份值，库名与表名合并为一个串）。
 */
const hiveInfo = computed(() => {
  const v = variableData.value
  const h = v.hiveInfo || {}
  // 标准化前：原始上游「库.表」，登记值优先，其次 B1「标准化前源表」
  const sourceTableLabel = joinQualified(h.sourceDbName, h.sourceTableName) || v.sourceTableBefore || '—'
  // 标准化后：单一事实源 = v.dataTableName；老数据只有拆分值时按 hiveInfo 拼回
  const stdTable = v.dataTableName || joinQualified(h.databaseName, h.tableName) || v.sourceTableAfter || '—'

  const partitionFields = (h.partitionFields || []).filter(Boolean)

  return {
    /** 是否已完成 HIVE 登记（决定卡片是否展示"未补充"引导）*/
    registered: stdTable !== '—',
    sourceTableLabel,
    sourceFieldName: h.sourceFieldName || v.sourceField || '—',
    tableName: stdTable,
    isPartitioned: h.isPartitioned === true,
    partitionFields: h.isPartitioned === true ? partitionFields : [],
    updateFrequency: h.updateFrequency || v.updateFrequency || '—'
  }
})

/** 技术关联信息（精简：数据源名 + 数据底表 + 接口号 + 响应字段） */
const techLink = computed(() => {
  const v = variableData.value
  const p = profile.value
  return {
    dataSourceName: v.dataSourceName || '—',
    dataTableName: v.dataTableName || '',
    apiNo: v.apiNo || p.interfaceName || p.apiNo || '',
    responseField: v.responseField || p.responseField || ''
  }
})

/** 基础与人员信息（注册即确定 + 后期部分回填） */
const basePersonInfo = computed(() => {
  const v = variableData.value
  return {
    createdAt: v.createdAt || '—',
    updatedAt: v.updatedAt || '—',
    proposer: v.requirementProposer || v.creator || '—',
    adminManager: v.adminManager || '—',
    developer: v.developer || '—',
    acceptor: v.acceptor || '—'
  }
})

/** 复制文本的通用方法（加 toast 提示） */
async function copyText(text, label = '内容') {
  if (!text || text === '—') {
    Message.info(`${label}为空，暂无可复制内容`)
    return
  }
  try {
    await navigator.clipboard.writeText(String(text))
    Message.success(`${label}已复制`)
  } catch {
    Message.warning(`${label}复制失败，请手动选中复制`)
  }
}

/** typedProfile 的 InfoCard 结构（不再单独渲染，保留给其他潜在引用）*/
const typedProfileInfo = computed(() => {
  const v = variableStore.currentVariable || {}
  const pf = v.profile || {}
  const schema = PROFILE_FIELD_SCHEMAS[variableCategory.value] || []
  const skipped = new Set([
    'meaning','processingLogic','fieldType','defaultValue','tags','dimensions','remark',
    'categoryLevel1','categoryLevel2','processingFormula','processingExpression'
  ])
  return schema
    .filter(f => !skipped.has(f.key))
    .map((f) => ({
      label: f.label,
      value: pf[f.key] != null && pf[f.key] !== '' ? String(pf[f.key]) : '无'
    }))
})

const analysisReports = ref([])
const analysisReportColumns = [
  { title: '报告名称', dataIndex: 'name' },
  { title: '报告类型', dataIndex: 'type', width: 140 },
  { title: '来源', dataIndex: 'source', slotName: 'source', width: 100 },
  { title: '更新时间', dataIndex: 'updatedAt', width: 180 },
  { title: '操作', dataIndex: 'actions', slotName: 'actions', width: 160 }
]

const reportPreviewVisible = ref(false)
const reportPreviewTitle = ref('报告预览')
const reportPreviewMeta = ref([])
const reportPreviewFindings = ref([])

const governanceVisible = ref(false)
const governanceDefaultTab = ref('online')

const openGovernanceDrawer = (tab) => {
  governanceDefaultTab.value = tab
  governanceVisible.value = true
}

watch(
  () => route.query.action,
  (val) => {
    if (val === 'online') {
      // 草稿/课题生成的草稿：直接打开"提交上线申请"抽屉
      if (['draft', 'pending'].includes(String(variableData.value.status || ''))) {
        openEnableApproval()
      } else {
        openGovernanceDrawer('online')
      }
    }
  },
  { immediate: true }
)

const deriveVisible = ref(false)
const deriveForm = reactive({
  name: '',
  mode: 'topic'
})

const enableApprovalVisible = ref(false)
const enableApprovalSubmitting = ref(false)
const enableApprovalForm = reactive({
  reason: '',
  expectedOnlineTime: '',
  approver: 'dmt_admin',
  remark: ''
})

const openEnableApproval = () => {
  enableApprovalForm.reason = ''
  enableApprovalForm.expectedOnlineTime = ''
  enableApprovalForm.approver = 'dmt_admin'
  enableApprovalForm.remark = ''
  enableApprovalVisible.value = true
}

const submitEnableApproval = async () => {
  if (!enableApprovalForm.reason.trim()) {
    Message.warning('请输入启用原因')
    return
  }
  if (!enableApprovalForm.approver) {
    Message.warning('请选择审批人')
    return
  }
  enableApprovalSubmitting.value = true
  // Demo 流程：模拟审批耗时 600ms
  await new Promise((r) => setTimeout(r, 600))
  const record = VariableStatusStore.submitForOnline({
    variableId: variableId.value,
    reason: enableApprovalForm.reason.trim(),
    expectedOnlineTime: enableApprovalForm.expectedOnlineTime.trim(),
    approver: enableApprovalForm.approver
  })
  // 记录审计事件
  if (variableData.value.draftSource?.topicId) {
    ExploreStore.addAuditEvent({
      topicId: variableData.value.draftSource.topicId,
      operator: 'Demo 用户',
      action: '上线',
      field: 'variable',
      beforeValue: variableData.value.draftSource.topicId,
      afterValue: String(variableId.value),
      reason: enableApprovalForm.reason.trim()
    })
  }
  // 刷新当前特征数据
  await variableStore.fetchVariableDetail(variableId.value)
  enableApprovalSubmitting.value = false
  enableApprovalVisible.value = false
  Message.success(`已上线：审批单 ${record.id}（审批人：${record.approver}）`)
}

const handleDerive = () => {
  deriveForm.name = `${variableData.value.name || '特征'}_衍生`
  deriveForm.mode = 'topic'
  deriveVisible.value = true
}

const confirmDerive = () => {
  const name = deriveForm.name?.trim() || `${variableData.value.name || '特征'}_衍生`
  if (deriveForm.mode === 'topic') {
    Message.info('已进入探索课题列表，可在课题详情内决策采纳后生成草稿回到台账')
    router.push('/explore/topics')
    return
  }
  const draft = VariableDraftStore.addDraft({
    name,
    code: `DERIVE_${Date.now()}`,
    category: variableCategory.value,
    sourceType: variableData.value.sourceType,
    dataSourceName: '特征中心（Demo）',
    description: `由 ${variableData.value.id} 衍生生成的特征草稿（Demo）`,
    draftSource: { derivedFromId: variableData.value.id }
  })
  router.push({ name: 'VariableAssetDetail', params: { id: draft.id, mode: 'edit' }, query: { action: 'online' } })
}

const handleViewAnalysisReport = (record) => {
  if (record?.url) {
    window.open(record.url, '_blank')
    return
  }
  if (record?.preview) {
    reportPreviewTitle.value = record.name || '报告预览'
    reportPreviewMeta.value = [
      { label: '报告类型', value: record.type || '—' },
      { label: '来源', value: record.source || '—' },
      { label: '更新时间', value: record.updatedAt || '—' },
      { label: '关联特征', value: variableData.value.name || '—' }
    ]
    reportPreviewFindings.value = Array.isArray(record.preview.findings) ? record.preview.findings : []
    reportPreviewVisible.value = true
    return
  }
  Message.info('暂无可预览内容')
}

const handleCopyReportLink = async (record) => {
  const url = record?.url
  if (!url) return
  try {
    await navigator.clipboard.writeText(url)
    Message.success('链接已复制')
  } catch {
    Message.info(url)
  }
}

const buildAnalysisReports = () => {
  const v = variableStore.currentVariable
  const list = []

  if (v?.sourceType === 'external' && v?.sourceRefs?.externalEvaluationId) {
    const id = v.sourceRefs.externalEvaluationId
    list.push({
      id: `risk-eval-${id}`,
      name: '外数评估报告',
      type: '外数评估',
      source: 'risk-app',
      updatedAt: v.updatedAt || '—',
      url: buildRiskAppUrl(`/risk/external-data/evaluation/${id}`)
    })
  }

  list.push({
    id: 'var-eval-001',
    name: '特征质量评估报告',
    type: '特征评估',
    source: 'dmt-app',
    updatedAt: v?.updatedAt || '—',
    preview: {
      findings: [
        { id: 'f1', item: '数据质量', result: v?.dataQuality != null ? `${v.dataQuality}%` : '—', desc: '基于缺失率、唯一值数量等规则的综合评分' },
        { id: 'f2', item: '缺失率', result: v?.missingRate != null ? `${v.missingRate}%` : '—', desc: '缺失值比例越低越好' },
        { id: 'f3', item: '唯一值数量', result: v?.uniqueValueCount ?? '—', desc: '用于评估特征区分度与稳定性' }
      ]
    }
  })

  analysisReports.value = list
}

const sourceTypeLabel = computed(() => {
  if (variableData.value.sourceType === 'external') return '外数'
  if (variableData.value.sourceType === 'credit') return '征信'
  if (variableData.value.sourceType === 'internal') return '内数'
  return variableData.value.sourceType || '—'
})

const isExternalSource = computed(() => variableData.value.sourceType === 'external')
const externalRefs = computed(() => (variableData.value.sourceRefs || {}))
const hasExternalArchive = computed(() => !!externalRefs.value.externalArchiveId)
const hasExternalEvaluation = computed(() => !!externalRefs.value.externalEvaluationId)
const hasExternalService = computed(() => !!externalRefs.value.externalServiceId)
const hasExternalLifecycle = computed(() => !!externalRefs.value.externalLifecycleId)
const hasAnyExternalRef = computed(() => hasExternalArchive.value || hasExternalEvaluation.value || hasExternalService.value || hasExternalLifecycle.value)

const openRiskExternalArchive = () => {
  const id = externalRefs.value.externalArchiveId
  if (!id) return
  window.open(buildRiskAppUrl(`/risk/external-data/archive/${id}`), '_blank')
}

const openRiskExternalEvaluation = () => {
  const id = externalRefs.value.externalEvaluationId
  if (!id) return
  window.open(buildRiskAppUrl(`/risk/external-data/evaluation/${id}`), '_blank')
}

// ============ 评估 Tab：外数评估中心操作回调 ============
const handleOpenExternalEvaluation = () => {
  openRiskExternalEvaluation()
}

const handleUnlinkExternalEvaluation = () => {
  if (!variableStore.currentVariable) return
  const refs = variableStore.currentVariable.sourceRefs || {}
  if (!refs.externalEvaluationId) return
  // mock：删除关联字段
  delete refs.externalEvaluationId
  // 同步到本地副本（shallowRef + structuredClone）
  syncVariableFromStore()
  Message.success('已解除与外数评估中心的关联')
}

const handleLinkExternalEvaluation = () => {
  if (!variableStore.currentVariable) return Promise.resolve('')
  const refs = variableStore.currentVariable.sourceRefs || (variableStore.currentVariable.sourceRefs = {})
  // mock：生成评估单号并回填
  const newId = `EXT-EVAL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`
  refs.externalEvaluationId = newId
  syncVariableFromStore()
  // 模拟异步跳转外数评估中心
  setTimeout(() => {
    window.open(buildRiskAppUrl(`/risk/external-data/evaluation/${newId}`), '_blank')
  }, 100)
  return Promise.resolve(newId)
}

const openRiskExternalService = () => {
  const id = externalRefs.value.externalServiceId
  if (id) {
    window.open(buildRiskAppUrl(`/risk/external-data/service?id=${encodeURIComponent(String(id))}`), '_blank')
    return
  }
  window.open(buildRiskAppUrl('/risk/external-data/service'), '_blank')
}

const openRiskExternalLifecycle = () => {
  const id = externalRefs.value.externalLifecycleId
  if (!id) return
  window.open(buildRiskAppUrl(`/risk/external-data/lifecycle/${id}`), '_blank')
}

// 使用统计
const usageStats = ref({
  total: 0,
  metrics: 0,
  models: 0,
  reports: 0
})

// 使用场景分页
const usagePagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})

// 版本分页
const versionPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})

// 使用场景列表
const usageScenarios = ref([])

// 版本列表
const versionList = ref([])

// 字段映射数据
const fieldMappingData = ref([])

// 上游血缘数据
const upstreamLineage = ref([])

// 下游血缘数据
const downstreamLineage = ref([])

// 状态映射
const statusMap = {
  draft: { label: '草稿', color: 'gray' },
  pending: { label: '待审核', color: 'orange' },
  active: { label: '已发布', color: 'green' },
  inactive: { label: '已停用', color: 'red' },
  expired: { label: '已过期', color: 'lightgray' }
}

// 使用类型映射
const usageTypeMap = {
  metric: { label: '指标', color: 'blue' },
  model: { label: '模型', color: 'green' },
  report: { label: '报表', color: 'orange' },
  dashboard: { label: '仪表板', color: 'purple' }
}

// 基本信息已统一到 ① 顶部 headerPublic / ② 基础人员信息卡（基础与人员信息）/
// ③ 业务含义与技术口径 / ④ HIVE 表与字段 / ⑤ 技术关联信息 / ⑥ 后期补充卡
// 此处删除重复 computed（basicInfo/technicalInfo/longTextInfo/sourceInfo/effectSummary）。

// 获取状态标签
const getStatusLabel = (status) => statusMap[status]?.label || status
const getStatusColor = (status) => statusMap[status]?.color || 'gray'

// 获取类型标签
const getTypeLabel = (type) => {
  const typeMap = {
    numerical: '数值型',
    categorical: '分类型',
    text: '文本型',
    datetime: '时间型',
    boolean: '布尔型'
  }
  return typeMap[type] || type
}

const lifecycleHeader = computed(() => ([
  { label: '当前阶段', value: lifecycleCurrent.value.stageLabel },
  { label: '当前状态', value: lifecycleCurrent.value.statusLabel },
  { label: '负责人', value: variableData.value.creator || '—' },
  { label: '最近更新时间', value: variableData.value.updatedAt || '—' }
]))

const lifecycleCurrent = computed(() => {
  const status = variableData.value.status
  if (status === 'draft') return { stage: 'registration', stageLabel: '注册建档', status: 'in_progress', statusLabel: '进行中' }
  if (status === 'pending') return { stage: 'evaluation', stageLabel: '评估', status: 'in_progress', statusLabel: '进行中' }
  if (status === 'active') return { stage: 'operation', stageLabel: '运营监控', status: 'in_progress', statusLabel: '运行中' }
  if (status === 'inactive') return { stage: 'archived', stageLabel: '下线归档', status: 'completed', statusLabel: '已完成' }
  return { stage: 'registration', stageLabel: '注册建档', status: 'pending', statusLabel: '待开始' }
})

const lifecycleStages = computed(() => {
  const current = lifecycleCurrent.value.stage
  const order = ['registration', 'evaluation', 'accompany', 'publish', 'operation', 'archived']
  const labels = {
    registration: '注册建档',
    evaluation: '评估',
    accompany: '陪跑',
    publish: '发布上线',
    operation: '运营监控',
    archived: '下线归档'
  }
  const idx = order.indexOf(current)
  const now = new Date()
  const fmt = (d) => d.toISOString().slice(0, 10)
  return order.map((k, i) => {
    const status = i < idx ? 'completed' : (i === idx ? lifecycleCurrent.value.status : 'pending')
    const statusLabel = status === 'completed' ? '已完成' : (status === 'in_progress' ? '进行中' : '待开始')
    const startDate = i <= idx ? fmt(new Date(now.getTime() - (idx - i + 2) * 86400000)) : ''
    const endDate = (i < idx) ? fmt(new Date(now.getTime() - (idx - i + 1) * 86400000)) : ''
    const description = LIFECYCLE_SUPPLEMENT_GUIDE[k] || '—'
    return { stage: labels[k] || k, status, statusLabel, startDate, endDate, description }
  })
})

// 获取质量颜色
const getQualityColor = (quality) => {
  if (quality >= 95) return 'var(--subapp-success)'
  if (quality >= 80) return 'var(--subapp-warning)'
  return 'var(--subapp-danger)'
}

// 获取使用类型标签和颜色
const getUsageTypeLabel = (type) => usageTypeMap[type]?.label || type
const getUsageTypeColor = (type) => usageTypeMap[type]?.color || 'gray'

// 使用场景表格列
const usageColumns = [
  { title: '场景名称', dataIndex: 'name', width: 200 },
  { title: '类型', dataIndex: 'type', slotName: 'type', width: 100 },
  { title: '创建人', dataIndex: 'creator', width: 120 },
  { title: '创建时间', dataIndex: 'createdAt', width: 180 },
  { title: '描述', dataIndex: 'description' },
  { title: '操作', dataIndex: 'actions', slotName: 'actions', width: 120, fixed: 'right' }
]

// 版本表格列
const versionColumns = [
  { title: '版本', dataIndex: 'version', slotName: 'version', width: 120 },
  { title: '变更描述', dataIndex: 'description', width: 200 },
  { title: '变更内容', dataIndex: 'changes', slotName: 'changes' },
  { title: '创建人', dataIndex: 'creator', width: 120 },
  { title: '创建时间', dataIndex: 'createdAt', width: 180 },
  { title: '操作', dataIndex: 'actions', slotName: 'actions', width: 120, fixed: 'right' }
]

// 字段映射表格列
const fieldMappingColumns = [
  { title: '字段名', dataIndex: 'fieldName', width: 150 },
  { title: '数据类型', dataIndex: 'dataType', width: 100 },
  { title: '是否主键', dataIndex: 'isPrimaryKey', width: 80, render: ({ record }) => record.isPrimaryKey ? '是' : '否' },
  { title: '是否可空', dataIndex: 'isNullable', width: 80, render: ({ record }) => record.isNullable ? '是' : '否' },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 80 },
  { title: '描述', dataIndex: 'description' }
]

// 获取特征详情
const fetchVariableDetail = async () => {
  try {
    const variableId = route.params.id
    
    if (!variableId) {
      Message.error('特征ID不能为空')
      return
    }
    
    await variableStore.fetchVariableDetail(variableId)
    // 404 处理：特征ID不存在（文档 B2 E1）
    if (!variableStore.currentVariable) {
      notFound.value = true
      return
    }
    notFound.value = false
    // 拉取后同步到本地 shallowRef（避免 computed 递归循环）
    syncVariableFromStore()
    buildAnalysisReports()
    
    // Mock字段映射数据
    fieldMappingData.value = [
      {
        id: '1',
        fieldName: 'age',
        dataType: 'INTEGER',
        isPrimaryKey: false,
        isNullable: true,
        status: 'active',
        description: '用户年龄'
      },
      {
        id: '2',
        fieldName: 'user_id',
        dataType: 'BIGINT',
        isPrimaryKey: true,
        isNullable: false,
        status: 'active',
        description: '用户ID'
      }
    ]

    // Mock血缘数据
    upstreamLineage.value = [
      { id: 'table_001', name: '用户注册表', type: 'table' },
      { id: 'table_002', name: '用户认证表', type: 'table' }
    ]

    downstreamLineage.value = [
      { id: 'metric_001', name: '用户平均年龄', type: 'metric' },
      { id: 'model_001', name: '信用评分模型', type: 'model' },
      { id: 'report_001', name: '用户画像报告', type: 'report' }
    ]

  } catch (error) {
    console.error('获取特征详情失败:', error)
    Message.error('获取特征详情失败')
  }
}

// 获取使用场景
const fetchUsageScenarios = async () => {
  try {
    // Mock数据
    usageScenarios.value = [
      {
        id: 'usage_001',
        name: '用户平均年龄指标',
        type: 'metric',
        creator: '李四',
        createdAt: '2024-01-10 09:30:00',
        description: '计算所有用户的平均年龄，用于用户画像分析'
      },
      {
        id: 'usage_002',
        name: '信用评分模型',
        type: 'model',
        creator: '王五',
        createdAt: '2024-01-12 14:20:00',
        description: '使用用户年龄作为特征之一，构建信用评分模型'
      },
      {
        id: 'usage_003',
        name: '用户画像报告',
        type: 'report',
        creator: '赵六',
        createdAt: '2024-01-15 11:15:00',
        description: '在用户画像报告中展示年龄分布情况'
      }
    ]
    usagePagination.total = 3
    
    // Mock使用统计
    usageStats.value = {
      total: 15,
      metrics: 8,
      models: 4,
      reports: 3
    }
  } catch (error) {
    console.error('获取使用场景失败:', error)
    Message.error('获取使用场景失败')
  }
}

// 获取版本历史
const fetchVersionHistory = async () => {
  try {
    // Mock数据
    versionList.value = [
      {
        id: 'ver_003',
        version: 'v1.2.0',
        isCurrent: true,
        description: '优化数据质量监控',
        changes: ['新增数据质量监控规则', '优化缺失值处理逻辑'],
        creator: '张三',
        createdAt: '2024-01-15 14:30:00'
      },
      {
        id: 'ver_002',
        version: 'v1.1.0',
        isCurrent: false,
        description: '扩展数据源',
        changes: ['新增用户认证表作为数据源', '优化数据更新频率'],
        creator: '李四',
        createdAt: '2024-01-10 10:20:00'
      },
      {
        id: 'ver_001',
        version: 'v1.0.0',
        isCurrent: false,
        description: '初始版本',
        changes: ['创建用户年龄特征', '配置基础数据质量规则'],
        creator: '张三',
        createdAt: '2024-01-01 10:00:00'
      }
    ]
    versionPagination.total = 3
  } catch (error) {
    console.error('获取版本历史失败:', error)
    Message.error('获取版本历史失败')
  }
}

// 返回列表
const handleBackToList = () => {
  router.push('/variable-management')
}

const handleMoreSelect = (val) => {
  if (val === 'toggle') handleToggleStatus()
  if (val === 'delete') handleDelete()
}

/**
 * 编辑特征：与台账「注册特征」完全同一个抽屉（B1 表单 + 同口径校验），
 * 状态机锁定的字段在抽屉内灰显，保存后就地回写、流程状态不变
 */
const handleEdit = () => {
  const d = variableData.value
  if (!d || !d.id) return
  const status = d.midloanStatus || d.status || ''
  if (!canEdit(status)) {
    Message.warning(getEditLockReason(status) || '当前状态不可编辑')
    return
  }
  registerDrawerMode.value = 'edit'
  registerDrawerEditData.value = { ...d }
  registerDrawerRequirementData.value = null
  registerDrawerVisible.value = true
}

// 切换状态
const handleToggleStatus = async () => {
  try {
    const action = variableData.value.status === 'active' ? '停用' : '启用'

    if (action === '启用') {
      openEnableApproval()
      return
    }

    Modal.confirm({
      title: '确认操作',
      content: `确定要${action}特征"${variableData.value.name}"吗？`,
      onOk: async () => {
        try {
          VariableStatusStore.setStatus(variableId.value, 'inactive', 'Demo 用户', '台账直接停用')
          if (variableStore.currentVariable) {
            variableStore.currentVariable = { ...variableStore.currentVariable, status: 'inactive' }
          }
          Message.success(`特征已${action}`)
        } catch (error) {
          Message.error('状态更新失败')
        }
      }
    })
  } catch (error) {
    Message.error('状态更新失败')
  }
}

// 删除特征
const handleDelete = async () => {
  try {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除特征"${variableData.value.name}"吗？此操作不可恢复。`,
      okText: '删除',
      okButtonProps: { status: 'danger' },
      onOk: async () => {
        try {
          Message.success('特征已删除')
          router.push('/variable-management')
        } catch (error) {
          Message.error('删除失败')
        }
      }
    })
  } catch (error) {
    Message.error('删除失败')
  }
}

// 查看使用场景
const handleViewUsage = (record) => {
  Message.info(`查看${record.name}详情`)
}

// 跳转到使用场景
const handleGotoUsage = (record) => {
  // 根据类型跳转到不同的页面
  const routes = {
    metric: '/metrics',
    model: '/models',
    report: '/reports',
    dashboard: '/dashboards'
  }
  const route = routes[record.type] || '/'
  router.push(`${route}/${record.id}`)
}

// 版本对比
const handleCompareVersion = (record) => {
  Message.info(`对比版本: ${record.version}`)
}

// 版本回滚
const handleRollbackVersion = (record) => {
  Modal.confirm({
    title: '确认回滚',
    content: `确定要回滚到版本"${record.version}"吗？`,
    onOk: async () => {
      Message.success('版本回滚成功')
      fetchVersionHistory()
    }
  })
}

// 使用场景分页
const handleUsagePageChange = (page) => {
  usagePagination.current = page
  fetchUsageScenarios()
}

// 版本分页
const handleVersionPageChange = (page) => {
  versionPagination.current = page
  fetchVersionHistory()
}

// 初始化
onMounted(() => {
  fetchVariableDetail().then(() => {
    // 加载完整状态历史（用户反馈）
    if (variableId.value && isMidloanBehavior.value) {
      MidloanStateEngine.initMockStatusHistory(variableId.value)
      refreshStatusChangeList()
      refreshSyncLogs()
    }
    // 台账「补充数据底表」跳转过来时自动打开补充抽屉
    if (route.query.focusField === 'dataTableName') {
      openSupplementTable()
    }
  })
  fetchUsageScenarios()
  fetchVersionHistory()
})

// ============ 11 状态机相关（midloan_behavior）============

// 是否贷中行为品类
const isMidloanBehavior = computed(() => {
  const v = variableData.value
  if (!v) return false
  return v.category === 'midloan_behavior' || v.midloanStatus != null
})

// 当前 midloan 状态
const currentMidloanStatus = computed(() => {
  return variableData.value?.midloanStatus || ''
})

// 权限控制
const hasPerm = (p) => UserContext.has(p)

// 可重试状态
const canRetry = computed(() => isRetryableFailedStatus(currentMidloanStatus.value))
const retryLabel = computed(() => {
  if (currentMidloanStatus.value === 'offline_failed') return '手动触发批次重试'
  return '重新同步'
})

/** 异常重试是否在离线分析 scope 内（仅 dw_online_failed） */
const canRetryInOfflineScope = computed(() => {
  if (!canRetry.value) return false
  return getStatusCategory(currentMidloanStatus.value) === 'offline_analysis'
})

/** 异常重试是否在 API 调用 scope 内（internal_sync_failed/variable_sync_failed/offline_failed） */
const canRetryInApiScope = computed(() => {
  if (!canRetry.value) return false
  return getStatusCategory(currentMidloanStatus.value) === 'online_interface'
})

/** 特征档案摘要（传给 StatusStepFlow 顶部摘要卡） */
const featureArchiveSummary = computed(() => {
  const v = variableData.value || {}
  return {
    featureId: v.id || v.featureId || '',
    name: v.name || v.featureCnName || '',
    devOaOrderId: v.devOaOrderId || '',
    acceptor: v.acceptor || '',
    dataTableName: v.dataTableName || ''
  }
})

/** 非 midloan 品类的中文标签（用于提示卡，防御性兜底） */
const nonMidloanCategoryLabel = computed(() => {
  const v = variableData.value || {}
  const cat = v.category || v.sourceType || ''
  const map = {
    external: '外数',
    credit: '征信',
    internal: '内数',
    behavior: '行为（非贷中）'
  }
  return map[cat] || cat || '当前'
})

// 动态操作按钮
const allowedActions = computed(() => {
  return allowedActionsByStatus(currentMidloanStatus.value, variableData.value, roleForActions.value)
})

// ============ 编辑保护（用户反馈）============
/** 是否需要展示编辑保护提示（任何有锁定字段的状态都展示）*/
const showEditLockNotice = computed(() => {
  const s = currentMidloanStatus.value
  // 完全可编辑的状态：registered 不展示（pending_register 是 derivation 状态，不出现在 midloanStatus）
  if (s === 'registered') return false
  return true
})
/** 提示级别 */
const editLockNoticeType = computed(() => {
  const s = currentMidloanStatus.value
  if (s === 'online' || s === 'offline') return 'error'  // 已投产，强烈警告
  if (s.endsWith('_failed')) return 'warning'              // 异常态
  if (['developing_oa', 'dw_online', 'dw_online_failed'].includes(s)) return 'info'  // 部分可补充
  return 'warning'  // 流程中
})
const editLockNoticeTitle = computed(() => {
  const s = currentMidloanStatus.value
  if (s === 'online') return '已上线投产'
  if (s === 'offline') return '已下线归档'
  if (s.endsWith('_failed')) return '异常状态'
  if (['developing_oa', 'dw_online', 'dw_online_failed'].includes(s)) return '部分字段已锁定'
  return '编辑受限'
})
/** 锁定字段列表 */
const lockedFields = computed(() => {
  return getLockedFields(currentMidloanStatus.value)
})

// 状态变更记录（P1-3）— 使用 shallowRef 避免响应式引起循环
const statusChangeList = shallowRef([])
const refreshStatusChangeList = () => {
  const list = StatusChangeStore.list({ featureId: variableId.value })
  // 显式克隆避免响应式代理
  statusChangeList.value = list.map(item => ({
    id: item.id,
    fromStatus: item.fromStatus,
    toStatus: item.toStatus,
    trigger: item.trigger,
    operator: item.operator,
    operatorRole: item.operatorRole,
    operatedAt: item.operatedAt,
    reason: item.reason || ''
  }))
}
// 状态变更表已抽到 StatusChangeTable 子组件
// statusChangeColumns 不再需要在 detail.vue 定义

// 下线批次结果（K2 R03）— 一次性读取
const offlineBatchSummary = computed(() => {
  // 避免 reactive tracking：每次主动读取
  return OfflineRecordStore.batchSummary()
})

// 同步日志
const featureSyncLogs = shallowRef([])
const refreshSyncLogs = () => {
  const list = SyncLogStore.list({ featureId: variableId.value })
  featureSyncLogs.value = list.map(item => ({ ...item }))
}

/**
 * 同步日志列表（用于状态步骤条内嵌展示）
 * 不响应式追踪，每次主动从 store 读取
 */
const syncLogList = computed(() => {
  return SyncLogStore.list({ featureId: variableId.value })
})

// ============ OA 单/验收/上线流程/下线抽屉（文档 C1 R01 / E1 R02 / F1 R02）============
const actionDrawerVisible = ref(false)
const currentActionKey = ref('submit_dev_oa')
// VariableRegisterDrawer（审核模式：submit_requirement；编辑模式：详情页「编辑」，与台账同一抽屉）
const registerDrawerVisible = ref(false)
const registerDrawerRequirementData = ref(null)
const registerDrawerMode = ref('create')
const registerDrawerEditData = ref(null)

/** 去重校验名单：与台账同一口径（内置 mock 资产 + localStorage 草稿）*/
const allFeatureUniverse = computed(() => [...VariableDraftStore.list(), ...variableAssets])
const existingFeatureNames = computed(() => {
  const selfId = registerDrawerEditData.value?.id
  return allFeatureUniverse.value
    .filter((v) => v.id !== selfId)
    .map((v) => v.code || v.name || '')
    .filter(Boolean)
})
const existingFeatureCnNames = computed(() => {
  const selfId = registerDrawerEditData.value?.id
  return allFeatureUniverse.value
    .filter((v) => v.id !== selfId)
    .map((v) => v.featureCnName || v.name || '')
    .filter(Boolean)
})

// ============ 状态切换操作 ============
const onRetry = () => {
  const fid = variableId.value
  if (!fid) return
  if (!UserContext.has(PERMISSIONS.RETRY_SYNC)) {
    Message.warning('当前角色无「重新同步」权限，请切换为风险数据管理员')
    return
  }
  // 内数同步失败：先引导用户补充数据底表，再重试
  if (variableData.value?.midloanStatus === 'internal_sync_failed' && !variableData.value?.dataTableName) {
    currentActionKey.value = 'retry_sync_supplement_table'
    actionDrawerVisible.value = true
    return
  }
  const r = MidloanStateEngine.retrySync(fid)
  if (r.ok) Message.success('已重新同步，等待内数/特征中心回调')
  else Message.error(r.reason || '重试失败')
  refreshAfterMutation()
}

const onManualBatchRetry = () => {
  const fid = variableId.value
  if (!fid) return
  if (!UserContext.has(PERMISSIONS.RETRY_OFFLINE_BATCH)) {
    Message.warning('当前角色无「手动触发下线批次重试」权限，请切换为风险数据管理员')
    return
  }
  const r = MidloanStateEngine.retrySync(fid)
  if (r.ok) Message.success('已手动触发特征中心下线批次重试')
  refreshAfterMutation()
}

const onAction = (action) => {
  // submit_requirement：打开 VariableRegisterDrawer 审核模式（B1 完整注册表单）
  if (action.key === 'submit_requirement') {
    registerDrawerMode.value = 'create'
    registerDrawerEditData.value = null
    registerDrawerRequirementData.value = variableData.value
    registerDrawerVisible.value = true
    return
  }
  // 补充数据底表：走详情页的「补充数据底表」表单（含 HIVE 表与字段 / 技术关联信息）
  if (action.key === 'supplement_table') {
    openSupplementTable()
    return
  }
  // 走抽屉的动作（文档 A0 / C1 / E0 / E1 / F0 / 管理员状态修正 / 内数失败补表 / 特征归档）
  if ([
    'submit_dev_oa',
    'business_verify_pass',
    'admin_confirm_pass',
    'submit_production_order',
    'oa_production_approve',
    'oa_production_reject',
    'correct_status',
    'retry_sync_supplement_table',
    'archive_variable'
  ].includes(action.key)) {
    currentActionKey.value = action.key
    actionDrawerVisible.value = true
    return
  }
  // 其他动作直接调用 stateEngine
  const fid = variableId.value
  if (!fid) return
  // 当前状态不是可执行状态：友好提示"展示已发起的内容"
  const curStatus = variableData.value?.midloanStatus || variableData.value?.status
  if (curStatus === 'online' || curStatus === 'offline' || curStatus === 'syncing_internal' || curStatus === 'syncing_variable') {
    // 已是终态/同步中：直接弹窗展示已发起的 OA 单据（已有"已发起的 OA 单据"卡片，无需重复弹窗）
    Message.info('当前已是线上运行实例，请查看上方「已发起的 OA 单据」卡片')
    return
  }
  const r = MidloanStateEngine.handleAction(fid, action.key)
  if (r.ok) Message.success(`${action.label} 已完成`)
  else if (r.reason) Message.error(r.reason)
  refreshAfterMutation()
}

// 抽屉提交后回调
const onActionSubmit = (payload) => {
  const fid = variableId.value
  if (!fid) return
  const r = MidloanStateEngine.handleAction(fid, currentActionKey.value, payload)
  if (r.ok) Message.success('操作已完成')
  else if (r.reason) Message.error(r.reason)
  actionDrawerVisible.value = false
  refreshAfterMutation()
}

// VariableRegisterDrawer 提交回调（审核模式 submit_requirement / 编辑模式 isEdit）
const handleRegisterSubmit = (payload) => {
  // 编辑模式：与台账同一套写回逻辑（草稿走 localStorage，内置资产走 stateEngine 就地回写）
  if (payload.isEdit) {
    const id = payload.variableId || variableId.value
    if (!id) return
    const draftUpdated = VariableDraftStore.updateDraft(id, payload)
    const r = draftUpdated ? { ok: true } : MidloanStateEngine.updateFeatureBasicInfo(id, payload)
    if (r.ok) Message.success('特征信息已更新')
    else Message.error(r.reason || '保存失败')
    registerDrawerVisible.value = false
    registerDrawerEditData.value = null
    refreshAfterMutation()
    return
  }
  const fid = payload.requirementId || variableId.value
  if (!fid) return
  const r = MidloanStateEngine.handleAction(fid, 'submit_requirement', payload)
  if (r.ok) Message.success('已审核通过并完成 B1 标准化注册')
  else if (r.reason) Message.error(r.reason)
  registerDrawerVisible.value = false
  registerDrawerRequirementData.value = null
  refreshAfterMutation()
}

// ============ 补充数据底表（卡片级局部补录 · 弹窗一次登记 技术关联信息 + HIVE 表与字段）============
const supplementTableVisible = ref(false)
const supplementTableSubmitting = ref(false)
const UPDATE_FREQUENCY_OPTIONS = ['实时（秒级）', '准实时（分钟级）', 'T+1 日更新', 'T+2 日更新', '周更新', '月更新']

const supplementTableForm = reactive({
  tableName: '',
  dataSourceName: '',
  apiNo: '',
  responseField: '',
  remark: '',
  hive: {
    sourceTableName: '',
    sourceFieldName: '',
    isPartitioned: true,
    partitionFields: [],
    updateFrequency: ''
  }
})

/** 「库.表」串：库名缺省时只用表名，避免出现 ".tbl" 这种半截值 */
function joinQualified(db, tb) {
  const d = (db || '').trim()
  const t = (tb || '').trim()
  if (!d) return t
  if (!t) return d
  return `${d}.${t}`
}

function openSupplementTable() {
  const v = variableData.value || {}
  const h = v.hiveInfo || {}
  // 技术关联信息：回填已登记内容，便于"修改"而非从零填写
  // 数据底表名称 = 标准化后 HIVE 表（单一事实源），优先取已登记值
  supplementTableForm.tableName = v.dataTableName || joinQualified(h.databaseName, h.tableName)
  supplementTableForm.dataSourceName = v.dataSourceName === '—' ? '' : v.dataSourceName || ''
  supplementTableForm.apiNo = v.apiNo || ''
  supplementTableForm.responseField = v.responseField || ''
  supplementTableForm.remark = v.dataTableRemark || ''
  // HIVE 表与字段：优先取已登记的 hiveInfo，其次从 B1 源表字段推断（不再用假数据兜底）
  supplementTableForm.hive.sourceTableName = joinQualified(h.sourceDbName, h.sourceTableName) || v.sourceTableBefore || ''
  supplementTableForm.hive.sourceFieldName = h.sourceFieldName || v.sourceField || ''
  supplementTableForm.hive.isPartitioned = h.isPartitioned !== false
  supplementTableForm.hive.partitionFields = [...(h.partitionFields || [])]
  const freq = h.updateFrequency || v.updateFrequency || ''
  supplementTableForm.hive.updateFrequency = UPDATE_FREQUENCY_OPTIONS.includes(freq) ? freq : ''
  supplementTableVisible.value = true
}

function onSupplementTable() {
  const fid = variableId.value
  const tableName = (supplementTableForm.tableName || '').trim()
  if (!fid) return
  if (!tableName) {
    Message.warning('请填写数据底表名称（内数 API 注册必填）')
    return
  }
  const h = supplementTableForm.hive
  if (h.isPartitioned && !(h.partitionFields || []).length) {
    Message.warning('已勾选分区表，请至少填写一个分区字段（例如 ds）')
    return
  }
  supplementTableSubmitting.value = true
  try {
    const r = MidloanStateEngine.supplementDataTable(fid, {
      tableName,
      remark: supplementTableForm.remark,
      dataSourceName: supplementTableForm.dataSourceName,
      apiNo: supplementTableForm.apiNo,
      responseField: supplementTableForm.responseField,
      hive: {
        sourceTableName: h.sourceTableName,
        sourceFieldName: h.sourceFieldName,
        isPartitioned: h.isPartitioned,
        partitionFields: h.partitionFields,
        updateFrequency: h.updateFrequency
      }
    })
    if (r.ok) {
      Message.success('数据底表与 HIVE 登记信息已保存')
      supplementTableVisible.value = false
      refreshAfterMutation()
    } else {
      Message.error(r.reason || '保存失败')
    }
  } finally {
    supplementTableSubmitting.value = false
  }
}

// 重置 / 演示快捷
function onResetFeature() {
  const fid = variableId.value
  if (!fid) return
  const r = MidloanStateEngine.resetFeature(fid)
  if (r.ok) Message.success('已重置到初始状态')
  refreshAfterMutation()
}

function onDemoQuick(action) {
  onAction({ key: action, label: action })
}

// 刷新（mock store 已经就地修改，强制 refetch）
function refreshAfterMutation() {
  setTimeout(() => {
    syncVariableFromStore()
    refreshSyncLogs()
    refreshStatusChangeList()
  }, 0)
}

// 暴露 demo 全局
window.__midloanCurrentFeatureId = computed(() => variableData.value?.id)
window.__midloanVariableList = variableStore.variableList
window.__refreshMidloanDetail = () => {
  refreshSyncLogs()
  refreshStatusChangeList()
  syncVariableFromStore()
}

// 角色 tag（响应式同步 UserContext 变化）
const currentRole = ref(UserContext.get().role)
const currentUserName = ref(UserContext.get().name)
window.addEventListener('user-context-changed', () => {
  setTimeout(() => {
    currentRole.value = UserContext.get().role
    currentUserName.value = UserContext.get().name
  }, 0)
})

// 切换角色后触发 allowedActions 重新计算（computed 不依赖 currentRole，但允许 admin 看到重试按钮）
// 通过 currentRole 改变自身依赖，触发 allowedActionsByStatus 重算
const roleForActions = computed(() => currentRole.value)

// 初次加载
setTimeout(() => {
  refreshSyncLogs()
  refreshStatusChangeList()
}, 100)
</script>

<style scoped>
.variable-detail-page {
  padding: 24px;
  min-height: calc(100vh - 64px);
  background-color: var(--color-fill-2);
}

.page-header {
  background: #fff;
  padding: 20px 24px;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.02);
}

/* 补充数据底表弹窗：内容区自管滚动，避免与页面滚动条打架 */
.supp-scroll {
  max-height: calc(100vh - 300px);
  min-height: 240px;
  overflow-y: auto;
  padding-right: 4px;
}

/* 补充数据底表弹窗：分组卡片 */
.supp-block {
  margin-bottom: 12px;
}

.breadcrumb {
  margin-bottom: 16px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
}

.title-section {
  flex: 1 1 400px;
  min-width: 0;
  margin-right: 24px;
}

.title-wrapper {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-1);
  line-height: 1.4;
}

.status-tag {
  margin-left: 12px;
}

.header-info {
  margin-top: 8px;
}

/* header 字段带：4 列下每列宽度足够容纳长字符串 */
.header-info :deep(.param-value) {
  word-break: break-all;
  line-height: 1.6;
}

/* 横向字段带：已迁移到 ParamGroup 组件（columns=6，瀑布流布局，无表格） */
.header-description-group {
  margin-top: 8px;
}

.header-description-group :deep(.param-group-item) {
  break-inside: avoid;
}

.description-text {
  color: var(--color-text-2);
  display: inline-block;
  max-width: 100%;
  white-space: normal;
  line-height: 1.5;
}

.actions {
  flex-shrink: 0;
}

.actions :deep(.arco-btn) {
  margin-left: 12px;
}

.tab-content {
  padding: 0;
}

.detail-content {
  background: #fff;
  border-radius: 8px;
  padding: 20px 24px;
  min-height: 500px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.02);
}

.detail-tabs :deep(.arco-tabs-nav-tab) {
  justify-content: flex-start;
}

.detail-card {
  margin-bottom: 20px;
  border-radius: 8px;
  border: 1px solid var(--color-border-2);
}

.detail-card :deep(.arco-card-header) {
  border-bottom: 1px solid var(--color-border-1);
  padding: 12px 16px;
  background-color: var(--color-fill-1);
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

.detail-card :deep(.arco-card-header-title) {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-1);
}

.detail-card :deep(.arco-card-body) {
  padding: 20px 16px;
}

:deep(.arco-descriptions-item-label-inline) {
  color: var(--color-text-3);
  font-weight: 400;
}
.batch-stat {
  text-align: center;
  padding: 16px;
  background: var(--color-fill-2, #f7f8fa);
  border-radius: 6px;
}
.batch-stat .batch-num {
  font-size: 28px;
  font-weight: 600;
  color: var(--color-text-1, #1d2129);
}
.batch-stat .batch-label {
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-text-2, #4e5969);
}
.batch-stat.success .batch-num { color: #00b42a; }
.batch-stat.failed .batch-num { color: #f53f3f; }
.missing-table { color: var(--color-text-3, #86909c); font-style: italic; }
.role-tag { margin-left: 8px; }
.demo-buttons-tip { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

:deep(.arco-descriptions-item-value-inline) {
  color: var(--color-text-1);
}

/* ====== 顶部公共信息（注册即确定）====== */
.header-public-grid {
  margin-top: 12px;
  background: var(--color-fill-1, #f7f8fa);
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.header-public-grid .public-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}
.header-public-grid .public-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.header-public-grid .public-item.public-full {
  grid-column: span 2;
}
.header-public-grid .label {
  color: var(--color-text-3, #86909c);
  font-size: 13px;
  white-space: nowrap;
  flex-shrink: 0;
}
.header-public-grid .value {
  color: var(--color-text-1, #1d2129);
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.header-public-grid .value.tag-row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.header-public-grid .value .empty { color: var(--color-text-4); }

.header-description-summary {
  margin-top: 12px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-2, #4e5969);
  background: #fafbfc;
  border-left: 3px solid var(--color-primary-light-3, #94caff);
  padding: 8px 12px;
  border-radius: 0 6px 6px 0;
}
.header-description-summary .label {
  color: var(--color-text-3, #86909c);
  margin-right: 6px;
}

/* ====== 长文本区（业务含义 / 技术口径 / 备注）====== */
.longtext-block { line-height: 1.7; }
.longtext-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-1);
  margin-bottom: 8px;
}
.longtext-value {
  margin: 0 !important;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--color-text-2, #4e5969);
  font-size: 13px;
}
.longtext-code {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px 14px;
  border-radius: 6px;
  font-family: 'JetBrains Mono', 'Menlo', 'Consolas', monospace;
  font-size: 12.5px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 320px;
  overflow: auto;
}

.mono {
  font-family: 'JetBrains Mono', 'Menlo', 'Consolas', monospace;
  background: var(--color-fill-2, #f2f3f5);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 12.5px;
}
.mono.strong {
  color: var(--color-primary, #165dff);
  font-weight: 600;
}

.quality-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background-color: var(--color-fill-2);
  border-radius: 6px;
}

.quality-label {
  font-size: 14px;
  color: var(--color-text-3);
  min-width: 80px;
}

.quality-value {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.quality-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-1);
  min-width: 60px;
}

.quality-number {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-1);
}

.definition-content {
  padding: 16px;
  background-color: var(--color-fill-2);
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text-1);
  min-height: 100px;
}

.lineage-graph {
  height: 520px;
}

.usage-stat {
  text-align: center;
  padding: 16px;
  background-color: var(--color-fill-2);
  border-radius: 6px;
}

.stat-number {
  font-size: 32px;
  font-weight: 600;
  color: var(--color-success-6);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: var(--color-text-3);
}

.version-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.version-number {
  font-weight: 600;
  color: var(--color-text-1);
}

.changes-content {
  max-height: 100px;
  overflow-y: auto;
}

.change-item {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}
</style>
