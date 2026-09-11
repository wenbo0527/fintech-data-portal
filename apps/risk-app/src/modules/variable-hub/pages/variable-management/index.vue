<template>
  <div class="variable-management-page">
    <DmtPageHeader title="风险特征列表" subtitle="贷中行为/外数/征信多品类特征统一管理，全生命周期闭环" :show-back="false">
      <template #extra>
        <a-input
          v-model="globalKeyword"
          class="header-search"
          size="large"
          allow-clear
          placeholder="全局搜索：名称 / 编码 / 描述 / 责任人"
          @input="handleGlobalSearch"
          @clear="handleGlobalSearch"
        >
          <template #prefix><icon-search /></template>
        </a-input>
      </template>
    </DmtPageHeader>

  <div class="page-content">
      <!-- Tab 切换：特征台账 / 需求列表 -->
      <a-tabs v-model:active-key="activeTab" size="large" class="risk-feature-tabs">
        <a-tab-pane key="features">
          <template #title><a-space :size="6"><icon-apps />特征台账</a-space></template>
        </a-tab-pane>
        <a-tab-pane key="derivations">
          <template #title><a-space :size="6"><icon-file />需求列表</a-space></template>
        </a-tab-pane>
      </a-tabs>

      <!-- 贷中行为 11 状态机分布概览（仅选中品类时显示） -->
      <a-card v-if="filterForm.riskCategory === 'midloan_behavior' && activeTab === 'features'" class="midloan-overview-card">
        <template #title>
          <a-space>
            <span>贷中行为特征 · 11 状态机分布（11 正常 + 4 异常 = 15 态，严格对齐文档 D.4）</span>
            <a-tag color="arcoblue" size="small">MIDLOAN-FEAT-*</a-tag>
          </a-space>
        </template>
        <a-row :gutter="12">
          <a-col :span="4"><div class="mo-cell mo-total"><div class="mo-num">{{ midloanStats.total }}</div><div class="mo-label">贷中行为特征总数</div></div></a-col>
          <a-col :span="4"><div class="mo-cell mo-online"><div class="mo-num">{{ midloanStats.online }}</div><div class="mo-label">已上线（含灰度）</div></div></a-col>
          <a-col :span="4"><div class="mo-cell mo-syncing"><div class="mo-num">{{ midloanStats.syncing }}</div><div class="mo-label">同步中（内数+特征中心）</div></div></a-col>
          <a-col :span="4"><div class="mo-cell mo-developing"><div class="mo-num">{{ midloanStats.developing }}</div><div class="mo-label">开发/验收/上线流程</div></div></a-col>
          <a-col :span="4"><div class="mo-cell mo-failed"><div class="mo-num">{{ midloanStats.failed }}</div><div class="mo-label">同步失败（需重试）</div></div></a-col>
        </a-row>
      </a-card>

      <DmtStatGroup v-if="activeTab === 'features'" :items="statItems" />

      <div v-if="activeTab === 'features'" class="view-mode-bar">
        <a-radio-group
          v-model="viewMode"
          type="button"
          size="large"
          @change="handleViewModeChange"
        >
          <a-radio value="all">全部视图</a-radio>
          <a-radio value="effect">效果视角</a-radio>
          <a-radio value="cost">成本视角</a-radio>
        </a-radio-group>
        <div class="view-mode-hint">
          <template v-if="viewMode === 'effect'">
            按 IV（信息价值）降序排列，关注特征区分度
          </template>
          <template v-else-if="viewMode === 'cost'">
            按月均成本降序排列，关注高成本特征
          </template>
          <template v-else>
            完整列表视图，按更新时间倒序
          </template>
        </div>
      </div>

      <!-- 状态过滤已合并到筛选区 <a-form-item label="状态">下拉，无需重复实现 -->

      <a-card v-if="activeTab === 'features'" class="filter-card">
        <a-form :model="filterForm" layout="inline">
          <a-form-item label="品类">
            <a-select
              v-model="filterForm.riskCategory"
              placeholder="全部品类"
              allow-clear
              @change="handleSearch"
            >
              <a-option v-for="opt in RISK_CATEGORY_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </a-option>
            </a-select>
          </a-form-item>
          <a-form-item label="数据类型">
            <a-select
              v-model="filterForm.type"
              placeholder="全部数据类型"
              allow-clear
              @change="handleSearch"
            >
              <a-option value="numerical">数值型</a-option>
              <a-option value="categorical">分类型</a-option>
              <a-option value="text">文本型</a-option>
              <a-option value="datetime">时间型</a-option>
              <a-option value="boolean">布尔型</a-option>
            </a-select>
          </a-form-item>
          <a-form-item label="离线分析状态">
            <a-select
              v-model="filterForm.offlineAnalysisStatus"
              placeholder="全部离线分析状态"
              allow-clear
              @change="handleSearch"
            >
              <a-option v-for="opt in OFFLINE_ANALYSIS_FILTER_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </a-option>
            </a-select>
          </a-form-item>
          <a-form-item label="API调用状态">
            <a-select
              v-model="filterForm.apiCallStatus"
              placeholder="全部API调用状态"
              allow-clear
              @change="handleSearch"
            >
              <a-option v-for="opt in API_CALL_FILTER_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </a-option>
            </a-select>
          </a-form-item>
          <a-form-item label="一级分类">
            <a-select
              v-model="filterForm.l1Category"
              placeholder="全部一级分类"
              allow-clear
              @change="onL1CategoryChange"
            >
              <a-option v-for="opt in MIDLOAN_L1_CATEGORIES" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </a-option>
            </a-select>
          </a-form-item>
          <a-form-item label="二级分类">
            <a-select
              v-model="filterForm.l2Category"
              placeholder="全部二级分类"
              allow-clear
              :disabled="!filterForm.l1Category"
              @change="handleSearch"
            >
              <a-option v-for="opt in l2CategoryOptionsForFilter" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </a-option>
            </a-select>
          </a-form-item>
          <a-form-item>
            <a-button @click="handleReset">重置</a-button>
            <a-button style="margin-left: 8px" @click="openSaveViewModal">保存视图</a-button>
            <a-dropdown trigger="click" @select="handleSelectSavedView">
              <a-link style="margin-left: 12px">已保存视图（{{ savedViews.length }}）</a-link>
              <template #content>
                <a-doption v-if="!savedViews.length" value="__empty" disabled>暂无保存的视图</a-doption>
                <a-doption v-for="item in savedViews" :key="item.id" :value="item.id">
                  {{ item.name }} ({{ item.filters.type || '全部' }} / {{ item.filters.offlineAnalysisStatus || item.filters.apiCallStatus || '全部状态' }})
                </a-doption>
              </template>
            </a-dropdown>
            <a-link style="margin-left: 12px" @click="router.push('/explore/taxonomy')">管理特征类型/分类</a-link>
          </a-form-item>
        </a-form>
        <div class="filter-actions">
          <a-dropdown trigger="click" @select="handleCreateMenuSelect">
            <a-button type="primary">
              <template #icon><icon-plus /></template>
              新建特征
            </a-button>
            <template #content>
              <a-doption value="add">注册为特征</a-doption>
              <a-doption value="incremental">导入更新</a-doption>
            </template>
          </a-dropdown>
          <a-button @click="handleExport">
            <template #icon><icon-download /></template>
            导出
          </a-button>
        </div>
      </a-card>

      <a-card v-if="activeTab === 'features'" class="table-card">
        <a-space class="batch-toolbar" align="center" wrap>
          <a-space wrap>
            <a-tag :color="overSelectionLimit ? 'red' : 'arcoblue'">
              已选 {{ selectedRowKeys.length }} / {{ SELECTION_LIMIT }} 个特征{{ overSelectionLimit ? '（超过上限）' : '' }}
            </a-tag>
            <a-alert v-if="overSelectionLimit" type="warning" :show-icon="false">
              建议分批（单次 ≤ 200），可在「保存视图」后分次执行批量动作
            </a-alert>
            <span class="batch-hint" v-else>可勾选特征发起探索课题或评估任务。</span>
          </a-space>
          <a-space>
            <!-- ========== 批量入口已合并到下方「批量操作」dropdown（用户反馈）============ -->
          </a-space>
        </a-space>

        <a-modal
          v-model:visible="incrementalModalVisible"
          title="导入更新特征"
          width="960px"
          :ok-text="incrementalRecords.length ? `确认导入（${incrementalRecords.length}条）` : '确认导入'"
          :ok-button-props="{ disabled: incrementalRecords.length === 0 }"
          @ok="confirmIncrementalUpload"
          @cancel="incrementalModalVisible = false"
        >
          <a-space>
            <a-upload
              :auto-upload="false"
              :limit="1"
              :accept="'.xlsx,.xls'"
              @change="handleIncrementalFileChange"
            >
              <template #upload-button>
                <a-button type="primary">
                  <template #icon><icon-upload /></template>
                  选择 Excel 文件
                </a-button>
              </template>
            </a-upload>
            <a-button @click="loadMockIncrementalData">
              <template #icon><icon-experiment /></template>
              使用示例文件
            </a-button>
          </a-space>
          <div v-if="incrementalFileCount > 0" style="margin-top: 16px">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px">
              <span style="font-weight: 600; font-size: 14px">
                解析预览（共 {{ incrementalFileCount }} 条）
              </span>
              <a-button type="text" size="small" @click="clearIncrementalPreview">重新选择</a-button>
            </div>
            <a-table
              :data="incrementalRecords"
              :columns="incrementalPreviewColumns"
              :pagination="{ pageSize: 8, total: incrementalRecords.length, showTotal: true }"
              :scroll="{ x: 1200 }"
              size="small"
              :bordered="{ cell: true }"
              row-key="code"
            >
              <template #status="{ record }">
                <a-tag
                  :color="record.status === 'online' ? 'green' : record.status === 'offline' ? 'gray' : 'blue'"
                  size="small"
                >{{ record.status }}</a-tag>
              </template>
            </a-table>
          </div>
          <a-empty v-else description="请选择 Excel 文件后查看预览" style="margin-top: 24px" />
        </a-modal>

    <!-- ============ 列表页通用 Action 抽屉（提交OA/发起验收/验收驳回）============ -->
    <MidloanActionDrawer
      :visible="actionDrawerVisible"
      :action-key="actionDrawerKey"
      :variable-data="actionDrawerRecord"
      :batch-records="actionDrawerBatchRecords"
      @update:visible="actionDrawerVisible = $event"
      @submit="handleActionDrawerSubmit"
    />

    <!-- ========== 提交上线抽屉（非 midloan 行为品类·草稿/pending） ========== -->
    <a-modal
      v-model:visible="onlineApprovalVisible"
      title="提交上线审批"
      :width="480"
      ok-text="提交审批"
      cancel-text="取消"
      :ok-loading="onlineApprovalSubmitting"
      @ok="handleOnlineApprovalSubmit"
      @cancel="onlineApprovalForm.reason = ''; onlineApprovalForm.approver = 'dmt_admin'"
    >
      <a-alert type="info" :show-icon="false" style="margin-bottom: 12px;">
        <p style="margin: 0; font-size: 13px;">特征 <strong>{{ onlineApprovalRecord?.name || '' }}</strong> 提交后将进入审批流程。</p>
      </a-alert>
      <a-form :model="onlineApprovalForm" layout="vertical">
        <a-form-item label="启用原因" required>
          <a-textarea v-model="onlineApprovalForm.reason" :rows="3" placeholder="请填写启用原因" />
        </a-form-item>
        <a-form-item label="预计上线时间" required>
          <a-input v-model="onlineApprovalForm.expectedOnlineTime" placeholder="例如：2026-09-01" />
        </a-form-item>
        <a-form-item label="审批人" required>
          <a-select v-model="onlineApprovalForm.approver">
            <a-option value="dmt_admin">DMT 管理员（小张）</a-option>
            <a-option value="data_admin">数据管理员（小王）</a-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 保存视图弹窗 -->
    <a-modal
      v-model:visible="saveViewVisible"
      title="保存当前筛选视图"
      ok-text="保存"
      cancel-text="取消"
      @ok="confirmSaveView"
    >
      <a-form :model="saveViewForm" layout="vertical">
        <a-form-item label="视图名称" required>
          <a-input v-model="saveViewForm.name" placeholder="例如：风控外数待评估" />
        </a-form-item>
        <a-form-item label="说明">
          <a-textarea v-model="saveViewForm.description" :max-length="100" show-word-limit placeholder="可选：用途说明" />
        </a-form-item>
        <a-alert type="info" :show-icon="false">
          保存当前筛选条件：关键词 / 类型 / 状态 / 数据源。后续可在「已保存视图」快速恢复。
        </a-alert>
      </a-form>
    </a-modal>

        <a-modal
          v-model:visible="batchTopicVisible"
          title="批量发起探索课题"
          ok-text="创建课题"
          cancel-text="取消"
          @ok="submitBatchTopic"
        >
          <a-form :model="batchTopicForm" layout="vertical">
            <a-alert class="batch-modal-alert" :show-icon="false">
              将基于已选 {{ selectedRows.length }} 个特征创建 1 个探索课题，并自动挂接数据源与关联特征。
            </a-alert>
            <a-form-item label="课题名称">
              <a-input v-model="batchTopicForm.name" placeholder="例如：行为特征批量探索_202606" />
            </a-form-item>
            <a-form-item label="业务问题">
              <a-textarea v-model="batchTopicForm.businessProblem" :max-length="120" show-word-limit />
            </a-form-item>
            <a-form-item label="特征假设">
              <a-textarea v-model="batchTopicForm.hypothesis" :max-length="120" show-word-limit />
            </a-form-item>
            <a-form-item label="业务域">
              <a-select v-model="batchTopicForm.domain" :options="domainOptions" />
            </a-form-item>
            <a-form-item label="目标特征类型">
              <a-select v-model="batchTopicForm.variableTypeId" allow-clear :options="variableTypeOptions" placeholder="可选，混合特征时可暂不指定" />
            </a-form-item>
            <a-form-item label="探索分类">
              <a-select v-model="batchTopicForm.exploreCategoryId" allow-clear :options="categoryOptions" placeholder="按特征类型选择探索分类" />
            </a-form-item>
            <a-form-item label="可见性">
              <a-select v-model="batchTopicForm.visibility" :options="visibilityOptions" />
            </a-form-item>
          </a-form>
        </a-modal>

        <a-modal
          v-model:visible="batchEvaluationVisible"
          title="批量发起评估"
          ok-text="创建任务"
          cancel-text="取消"
          @ok="submitBatchEvaluation"
        >
          <a-form :model="batchEvaluationForm" layout="vertical">
            <a-alert class="batch-modal-alert" :show-icon="false">
              任务将进入“评估任务中心”，可继续执行 mock 运行并查看覆盖率、IV、KS 等结果摘要。
            </a-alert>
            <a-form-item label="任务名称">
              <a-input v-model="batchEvaluationForm.name" placeholder="例如：外数特征批量准入评估" />
            </a-form-item>
            <a-form-item label="任务类型">
              <a-select v-model="batchEvaluationForm.taskType" :options="taskTypeOptions" />
            </a-form-item>
            <a-form-item label="任务说明">
              <a-textarea v-model="batchEvaluationForm.description" :max-length="120" show-word-limit />
            </a-form-item>
          </a-form>
        </a-modal>

        <!-- ========== 批量操作栏（移到表格上方 · 用户反馈）============ -->
        <div v-if="selectedRows.length > 0" class="batch-action-bar batch-action-bar-top">
          <a-space>
            <span class="batch-count">
              <icon-check-circle /> 已选 <strong>{{ selectedRows.length }}</strong> 项
            </span>
            <a-divider direction="vertical" />
            <span class="batch-status-summary">
              状态分布：
              <a-tag v-for="(count, status) in selectedStatusSummary" :key="status" :color="getMidloanStatusColor(status)" size="small">
                {{ getMidloanStatusLabel(status) }} × {{ count }}
              </a-tag>
            </span>
            <a-divider direction="vertical" />
            <a-dropdown trigger="click">
              <a-button type="primary" size="small" :disabled="!selectedRows.length">
                批量操作
                <icon-down />
              </a-button>
              <template #content>
                <!-- ========== 综合批量操作（合并探索课题/评估/状态机）============ -->
                <!-- 探索课题（≥2 项可发起）-->
                <a-doption
                  :disabled="selectedRows.length < 2"
                  @click="openBatchTopicModal"
                >
                  <icon-link /> 批量发起探索课题
                  <a-tag v-if="selectedRows.length < 2" color="gray" size="mini" style="margin-left: 8px">需 ≥2 项</a-tag>
                  <a-tag v-else size="mini" style="margin-left: 8px">（{{ selectedRows.length }} 项）</a-tag>
                </a-doption>
                <!-- 评估任务（≥2 项可发起）-->
                <a-doption
                  :disabled="selectedRows.length < 2"
                  @click="openBatchEvaluationModal"
                >
                  <icon-bar-chart /> 批量发起评估
                  <a-tag v-if="selectedRows.length < 2" color="gray" size="mini" style="margin-left: 8px">需 ≥2 项</a-tag>
                  <a-tag v-else size="mini" style="margin-left: 8px">（{{ selectedRows.length }} 项）</a-tag>
                </a-doption>
                <a-divider style="margin: 4px 0" />
                <!-- 状态机动态操作 -->
                <template v-for="batchAction in getBatchAvailableActions()" :key="batchAction.key">
                  <a-doption @click="handleBatchAction(batchAction)">
                    <icon-right /> {{ batchAction.label }}
                    <span style="margin-left: 8px; color: var(--color-text-3); font-size: 12px;">
                      ({{ batchAction.matchCount }} 条)
                    </span>
                  </a-doption>
                </template>
                <a-doption v-if="getBatchAvailableActions().length === 0" disabled>
                  当前选中的特征无状态机批量操作
                </a-doption>
              </template>
            </a-dropdown>
            <a-button size="small" @click="clearSelection">取消选择</a-button>
          </a-space>
        </div>

        <a-table
          :data="displayList"
          :columns="columns"
          :loading="loading"
          :pagination="pagination"
          :row-selection="rowSelection"
          row-key="id"
          @selection-change="handleSelectionChange"
          @page-change="handlePageChange"
        >
          <template #name="{ record }">
            <a-link @click="handleViewDetail(record)">{{ record.name }}</a-link>
          </template>
          <template #type="{ record }">
            <a-tag :color="getTypeColor(record.type)">
              {{ getTypeLabel(record.type) }}
            </a-tag>
          </template>
          <template #status="{ record }">
            <a-tag :color="getStatusColor(record.status)">
              {{ getStatusLabel(record.status) }}
            </a-tag>
          </template>
          <template #categoryCell="{ record }">
            <a-tag :color="getRiskCategoryColor(record.category)">
              {{ getRiskCategoryLabel(record.category) }}
            </a-tag>
          </template>
          <!-- 离线分析状态列（阶段1-3） -->
          <template #offlineAnalysisStatusCell="{ record }">
            <div class="status-cell-stack">
              <a-tooltip
                v-if="getStatusCategory(record.midloanStatus || record.status) === 'offline_analysis' && record.actionHintKey"
                :content="`点这里：${record.actionHint}`"
              >
                <a-tag
                  :color="getMidloanStatusColor(record.midloanStatus || record.status)"
                  size="small"
                  style="cursor: pointer"
                  @click="handleQuickAction(record)"
                >
                  <icon-right /> {{ getOfflineAnalysisDisplay(record.midloanStatus || record.status) }}
                </a-tag>
              </a-tooltip>
              <a-tag
                v-else-if="getStatusCategory(record.midloanStatus || record.status) === 'offline_analysis'"
                :color="getMidloanStatusColor(record.midloanStatus || record.status)"
                size="small"
              >
                {{ getOfflineAnalysisDisplay(record.midloanStatus || record.status) }}
              </a-tag>
              <span v-else-if="getStatusCategory(record.midloanStatus || record.status) === 'online_interface'" class="status-done">已完成</span>
              <span v-else>—</span>
              <!-- 操作提示（仅离线分析阶段显示） -->
              <a-tooltip
                v-if="getStatusCategory(record.midloanStatus || record.status) === 'offline_analysis' && record.actionHint"
                :content="`点这里唤起抽屉：${record.actionHint}`"
              >
                <a-tag color="gold" size="mini" style="cursor: pointer" @click="handleQuickAction(record)">
                  <icon-thunderbolt /> {{ record.actionHint }}
                </a-tag>
              </a-tooltip>
            </div>
          </template>
          <!-- API调用状态列（阶段4-5） -->
          <template #apiCallStatusCell="{ record }">
            <div class="status-cell-stack">
              <a-tooltip
                v-if="getStatusCategory(record.midloanStatus || record.status) === 'online_interface' && record.actionHintKey"
                :content="`点这里：${record.actionHint}`"
              >
                <a-tag
                  :color="getMidloanStatusColor(record.midloanStatus || record.status)"
                  size="small"
                  style="cursor: pointer"
                  @click="handleQuickAction(record)"
                >
                  <icon-right /> {{ getApiCallDisplay(record.midloanStatus || record.status) }}
                </a-tag>
              </a-tooltip>
              <a-tag
                v-else-if="getStatusCategory(record.midloanStatus || record.status) === 'online_interface'"
                :color="getMidloanStatusColor(record.midloanStatus || record.status)"
                size="small"
              >
                {{ getApiCallDisplay(record.midloanStatus || record.status) }}
              </a-tag>
              <span v-else-if="getStatusCategory(record.midloanStatus || record.status) === 'offline_analysis'" class="status-pending">未进入</span>
              <span v-else>—</span>
              <!-- 操作提示（仅API调用阶段显示） -->
              <a-tooltip
                v-if="getStatusCategory(record.midloanStatus || record.status) === 'online_interface' && record.actionHint"
                :content="`点这里唤起抽屉：${record.actionHint}`"
              >
                <a-tag color="gold" size="mini" style="cursor: pointer" @click="handleQuickAction(record)">
                  <icon-thunderbolt /> {{ record.actionHint }}
                </a-tag>
              </a-tooltip>
            </div>
          </template>
          <template #l1CategoryCell="{ record }">
            <a-tag color="arcoblue" size="small">{{ l1CategoryLabel(record.l1Category) }}</a-tag>
          </template>
          <template #l2CategoryCell="{ record }">
            <span>{{ record.l2Category || '—' }}</span>
          </template>

          <!-- 名单标签（黑/白/灰）：任何状态都可在编辑抽屉内调整 -->
          <template #listTypeCell="{ record }">
            <a-tag v-if="listTypeLabel(record.listType)" :color="listTypeColor(record.listType)" size="small">
              {{ listTypeLabel(record.listType) }}
            </a-tag>
            <span v-else>—</span>
          </template>

          <!-- 效果视角列渲染 -->
          <template #ivCell="{ record }">
            <span class="effect-number">{{ record.effectMetrics?.iv?.toFixed(2) ?? '—' }}</span>
            <span v-if="getEffectLevel(record.effectMetrics?.iv, 'iv')" class="effect-badge" :class="`effect-${getEffectLevel(record.effectMetrics?.iv, 'iv')}`">
              {{ getEffectLevelLabel(record.effectMetrics?.iv, 'iv') }}
            </span>
          </template>
          <template #ksCell="{ record }">
            <span class="effect-number">{{ record.effectMetrics?.ks?.toFixed(2) ?? '—' }}</span>
          </template>
          <template #aucCell="{ record }">
            <span class="effect-number">{{ record.effectMetrics?.auc?.toFixed(2) ?? '—' }}</span>
          </template>
          <template #coverageCell="{ record }">
            <span class="effect-number">{{ ((record.effectMetrics?.coverage || 0) * 100).toFixed(0) }}%</span>
          </template>
          <template #liftCell="{ record }">
            <span v-if="record.effectMetrics?.lift != null" :class="['lift', record.effectMetrics.lift >= 0 ? 'lift-up' : 'lift-down']">
              {{ record.effectMetrics.lift >= 0 ? '+' : '' }}{{ record.effectMetrics.lift }}%
            </span>
            <span v-else>—</span>
          </template>

          <!-- 成本视角列渲染 -->
          <template #priceCell="{ record }">
            <span v-if="record.costMetrics?.pricePerCall > 0">¥{{ record.costMetrics.pricePerCall.toFixed(2) }}</span>
            <a-tag v-else color="green" size="small">内部数据</a-tag>
          </template>
          <template #callsCell="{ record }">
            <span>{{ formatNumber(record.costMetrics?.monthlyCalls) }}</span>
          </template>
          <template #monthlyCostCell="{ record }">
            <span v-if="record.costMetrics?.monthlyCost > 0" class="cost-highlight">¥{{ formatNumber(record.costMetrics.monthlyCost) }}</span>
            <span v-else class="cost-zero">¥0</span>
          </template>
          <template #trendCell="{ record }">
            <a-tag v-if="record.costMetrics?.costTrend === 'up'" color="red" size="small">↑ 上升</a-tag>
            <a-tag v-else-if="record.costMetrics?.costTrend === 'down'" color="green" size="small">↓ 下降</a-tag>
            <a-tag v-else color="gray" size="small">— 平稳</a-tag>
          </template>

          <template #actions="{ record }">
            <a-space wrap>
              <!-- ========== 顶层快捷按钮（用户反馈：操作×状态映射） ========== -->
              <template v-for="action in getTableTopActions(record)" :key="action.key">
                <a-tooltip
                  v-if="action.key === 'edit'"
                  :content="`编辑 · ${getEditLockReason(record.midloanStatus || record.status)}`"
                >
                  <a-button
                    type="text"
                    size="small"
                    @click="handleTableAction(record, action)"
                  >
                    {{ action.label }}
                  </a-button>
                </a-tooltip>
                <a-button
                  v-else
                  type="text"
                  size="small"
                  :status="action.type === 'warning' ? 'warning' : (action.type === 'danger' ? 'danger' : 'normal')"
                  @click="handleTableAction(record, action)"
                >
                  {{ action.label }}
                </a-button>
              </template>

              <!-- ========== 主流程操作 dropdown（用户反馈：动态操作下沉到列表页） ========== -->
              <a-dropdown
                v-if="getTableMainActions(record).length > 0"
                trigger="click"
              >
                <a-button type="text" size="small">
                  更多操作
                  <icon-down />
                </a-button>
                <template #content>
                  <a-doption
                    v-for="mainAction in getTableMainActions(record)"
                    :key="mainAction.key"
                    @click="handleMainFlowAction(record, mainAction)"
                  >
                    {{ mainAction.label }}
                  </a-doption>
                </template>
              </a-dropdown>
            </a-space>
          </template>
        </a-table>
    </a-card>

      <!-- ========== 需求列表 Tab 内容 ========== -->
      <a-card v-if="activeTab === 'derivations'" class="derivation-card">
        <a-space class="derivation-toolbar" align="center" wrap>
          <a-space wrap>
            <span class="derivation-tip">
              <icon-info-circle /> 需求是特征台账的入口。一期聚焦「贷中行为」品类，需求流转：
              <a-tag color="blue" size="small">需求受理</a-tag>
              <icon-right />
              <a-tag color="green" size="small">特征台账：需求提出→已注册</a-tag>
              <span style="margin: 0 4px; color: var(--color-text-3)">|</span>
              <a-tag color="blue" size="small">需求受理</a-tag>
              <icon-right />
              <a-tag color="red" size="small">需求驳回（不创建特征）</a-tag>
            </span>
          </a-space>
          <a-space>
            <a-button v-if="selectedDerivationIds.length > 0" type="primary" @click="openBulkRegister">
              <template #icon><icon-check-square /></template>
              批量注册（{{ selectedDerivationIds.length }} 条）
            </a-button>
            <a-button @click="openBulkImport">
              <template #icon><icon-upload /></template>
              批量导入
            </a-button>
            <a-button type="primary" @click="openDerivationCreate">
              <template #icon><icon-plus /></template>
              新建需求
            </a-button>
          </a-space>
        </a-space>

        <a-form :model="derivationFilter" layout="inline" class="derivation-filter">
          <a-form-item label="关键词">
            <a-input v-model="derivationFilter.keyword" placeholder="需求ID / 名称 / 特征名" allow-clear @input="refreshDerivations" />
          </a-form-item>
          <a-form-item label="状态">
            <a-select v-model="derivationFilter.status" allow-clear placeholder="全部状态" @change="refreshDerivations">
              <a-option value="requirement_accepted">需求受理</a-option>
              <a-option value="registered">已注册</a-option>
              <a-option value="rejected">需求驳回</a-option>
            </a-select>
          </a-form-item>
          <a-form-item>
            <a-button @click="resetDerivationFilter">重置</a-button>
          </a-form-item>
        </a-form>

        <a-table
          :data="derivationList"
          :columns="derivationColumns"
          :pagination="derivationPagination"
          :row-selection="derivationRowSelection"
          row-key="id"
          @selection-change="onDerivationSelectionChange"
          @page-change="(p) => { derivationPagination.current = p }"
        >
          <template #idCell="{ record }">
            <a-link @click="goDerivationDetail(record)">{{ record.id }}</a-link>
          </template>
          <template #derivationCategoryCell="{ record }">
            <a-tag color="arcoblue" size="small">{{ getRiskCategoryLabel(record.category) }}</a-tag>
          </template>
          <template #statusCell="{ record }">
            <a-tag :color="getDerivationStatusColor(record)">
              {{ getDerivationStatusLabel(record) }}
            </a-tag>
          </template>
          <template #featureIdCell="{ record }">
            <a-link v-if="record.featureId" @click="goFeatureDetail(record.featureId)">{{ record.featureId }}</a-link>
            <span v-else class="placeholder">—</span>
          </template>
          <template #actions="{ record }">
            <a-space>
              <!-- 所有状态：详情 -->
              <a-button type="text" size="small" @click="goDerivationDetail(record)">详情</a-button>
              <!-- 已注册：查看特征 + 驳回 -->
              <a-button v-if="isRegistered(record)" type="text" size="small" @click="goFeatureDetail(record.featureId)">查看特征</a-button>
              <a-button v-if="isRegistered(record)" type="text" size="small" status="danger" @click="openRejectModal(record)">驳回</a-button>
              <!-- 需求受理（未注册）：去注册 + 驳回 -->
              <a-button v-if="isAccepted(record)" type="primary" size="small" @click="goRegister(record)">去注册</a-button>
              <a-button v-if="isAccepted(record)" type="text" size="small" status="danger" @click="openRejectModal(record)">驳回</a-button>
              <!-- 已驳回：重新受理 -->
              <a-button v-if="isRejected(record)" type="primary" size="small" @click="reopenDerivation(record)">重新受理</a-button>
            </a-space>
          </template>
        </a-table>
      </a-card>

      <!-- 新建需求弹窗 -->
      <DerivationCreateModal
        v-if="derivationCreateVisible"
        :visible="derivationCreateVisible"
        @ok="onDerivationCreated"
        @cancel="derivationCreateVisible = false"
      />

      <!-- 批量导入需求弹窗（A1 R19） -->
      <BulkImportDerivationModal
        v-if="bulkImportVisible"
        :visible="bulkImportVisible"
        :source="bulkImportSource"
        :demand-records="bulkRegisterRecords"
        @ok="onBulkImport"
        @cancel="bulkImportVisible = false"
      />

      <!-- 需求驳回弹窗 -->
      <a-modal
        v-model:visible="rejectModalVisible"
        title="需求驳回"
        :width="480"
        ok-text="确认驳回"
        cancel-text="取消"
        @ok="confirmReject"
        @cancel="rejectForm.reason = ''"
      >
        <a-alert type="warning" :show-icon="false" style="margin-bottom: 12px">
          <p style="margin: 0; font-size: 13px;">
            需求 <strong>{{ rejectTarget?.name || '' }}</strong>（{{ rejectTarget?.id || '' }}）驳回后不会创建特征，且不会出现在特征台账中。
          </p>
        </a-alert>
        <a-form :model="rejectForm" layout="vertical">
          <a-form-item label="驳回原因" required>
            <a-textarea
              v-model="rejectForm.reason"
              :rows="3"
              :max-length="200"
              show-word-limit
              placeholder="请填写驳回原因，例如：需求重复 / 业务方撤回 / 暂不实施等"
            />
          </a-form-item>
        </a-form>
      </a-modal>
    </div>

    <!-- ============ 注册 / 编辑特征（B1 完整注册表单）============
         四种入口共用：台账「注册特征」/ 状态机 submit_requirement / 需求列表「去注册」/ 台账「编辑」
         挂在 Tab v-if 块之外，两个 Tab 均可触发 -->
    <VariableRegisterDrawer
      v-model:visible="registerDrawerVisible"
      :existing-names="existingFeatureNames"
      :existing-cn-names="existingFeatureCnNames"
      :requirement-data="registerDrawerRequirementData"
      :source="registerDrawerSource"
      :mode="registerDrawerMode"
      :edit-data="registerDrawerEditData"
      @submit="handleRegisterSubmit"
      @save-draft="handleRegisterSaveDraft"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import { useVariableStore } from '@/modules/variable-hub/store/variable'
import UserContext from '@/modules/variable-hub/mock/risk-feature/permissions'
import MidloanStateEngine from '@/modules/variable-hub/mock/risk-feature/stateEngine'
import { incrementalImportVariables, getDataSources } from '@/modules/variable-hub/api/variable-management'
import * as XLSX from 'xlsx'
import { buildRiskAppUrl } from '@/utils/appLinks'
import { VariableDraftStore } from '@/modules/variable-hub/mock/variable-management/variable-draft-store'
import { VariableStatusStore } from '@/modules/variable-hub/mock/variable-management/variable-status-store'
import { variableStatus } from '@/modules/variable-hub/constants/statusMap'
import DmtPageHeader from '@/modules/variable-hub/components/PageHeader.vue'
import DmtStatGroup from '@/modules/variable-hub/components/StatGroup.vue'
import { ExploreStore } from '@/modules/variable-hub/mock/explore/explore-store'
import { RISK_CATEGORY_OPTIONS, MIDLOAN_L1_CATEGORIES } from '@/modules/variable-hub/constants/riskCategoryMap'
import { midloanStatusLabel, midloanStatusColor, allowedActionsByStatus, getEditLockReason, tableActionsByStatus, OFFLINE_ANALYSIS_FILTER_OPTIONS, API_CALL_FILTER_OPTIONS, getStatusCategory, getOfflineAnalysisDisplay, getApiCallDisplay } from '@/modules/variable-hub/constants/midloanStatusMap'
import { riskCategoryLabel, riskCategoryColor, listTypeLabel, listTypeColor } from '@/modules/variable-hub/constants/riskCategoryMap'
import DerivationStore from '@/modules/variable-hub/mock/risk-feature/derivations'
import DerivationCreateModal from '@/modules/variable-hub/components/risk-feature/DerivationCreateModal.vue'
import BulkImportDerivationModal from '@/modules/variable-hub/components/risk-feature/BulkImportDerivationModal.vue'
import VariableRegisterDrawer from '@/modules/variable-hub/components/risk-feature/VariableRegisterDrawer.vue'
import MidloanActionDrawer from '@/modules/variable-hub/components/risk-feature/MidloanActionDrawer.vue'
import { ExploreTaxonomyStore } from '@/modules/variable-hub/mock/explore/explore-taxonomy-store'
import EvaluationTaskStore from '@/modules/variable-hub/mock/evaluation/evaluation-task-store'

const router = useRouter()
const route = useRoute()

// ============ 处理从课题页跳转的 query.action=create_derivation ============
// 关键修复：mount 时同步处理 + nextTick 推后到 modal 渲染后再清理 query
let derivationActionHandled = false
const handleDerivationAction = () => {
  if (route.query.action === 'create_derivation' && !derivationActionHandled) {
    derivationActionHandled = true
    nextTick(() => {
      derivationCreateVisible.value = true
      nextTick(() => {
        router.replace({ path: route.path, query: {} })
      })
    })
  }
  // 从需求详情页「去注册」跳转：预填需求信息打开注册抽屉
  if (route.query.action === 'register' && route.query.id && !derivationActionHandled) {
    derivationActionHandled = true
    nextTick(() => {
      const rec = DerivationStore.get(String(route.query.id))
      if (rec) {
        openRegisterDrawer({ source: 'derivation', requirementData: rec })
        // 切换到需求列表 Tab
        activeTab.value = 'derivations'
      }
      nextTick(() => {
        router.replace({ path: route.path, query: {} })
      })
    })
  }
}
// 在 onMounted 中调用（不在 watch immediate 中）
// 同时保留 watch 响应后续导航（比如用户从其他页面再带这个 query 进来）
const variableStore = useVariableStore()

// 当前 Tab
const activeTab = ref('features')

const stats = computed(() => variableStore.variableStats)

const statItems = computed(() => [
  { title: '特征总数', value: stats.value.total, iconText: '#', iconBg: '#f0f7ff', iconColor: '#165dff', subtitle: '当前台账' },
  { title: '活跃特征', value: stats.value.active, tag: 'active', tagColor: 'green', iconText: '✓', iconBg: '#e8ffea', iconColor: '#00b42a', subtitle: '已发布可用' },
  { title: '待审核', value: stats.value.pending, tag: 'pending', tagColor: 'orange', iconText: '!', iconBg: '#fff7e8', iconColor: '#ff7d00', subtitle: '审批中' },
  { title: '已停用', value: stats.value.inactive, iconText: '×', iconBg: '#fff1f0', iconColor: '#f53f3f', subtitle: '已停用/归档' }
])

// 贷中行为品类 11 状态机统计（仅当选择"贷中行为"时显示）
const midloanStats = computed(() => {
  const list = (variableStore.variableList || []).filter((v) => v.category === 'midloan_behavior')
  const groups = {}
  list.forEach((v) => {
    const k = v.midloanStatus || 'unknown'
    groups[k] = (groups[k] || 0) + 1
  })
  return {
    total: list.length,
    // 已上线
    online: groups.online || 0,
    syncing: (groups.syncing_internal || 0) + (groups.syncing_variable || 0),
    failed: (groups.internal_sync_failed || 0) + (groups.variable_sync_failed || 0) + (groups.dw_online_failed || 0) + (groups.offline_failed || 0),
    developing: (groups.registered || 0) + (groups.developing_oa || 0) + (groups.dw_online || 0) + (groups.business_acceptance || 0) + (groups.business_verified || 0) + (groups.admin_confirmed || 0) + (groups.param_preparing || 0)
  }
})

const filterForm = reactive({
  keyword: '',
  riskCategory: '',
  type: '',
  offlineAnalysisStatus: '',
  apiCallStatus: '',
  l1Category: '',
  l2Category: ''
})

// 视图模式：all / effect / cost
const viewMode = ref('all')

const dataSources = ref([])
const variableList = computed(() => {
  let list = variableStore.filteredVariables || []
  // 品类过滤（在前端层面叠加，不动 store 以保持最小改动）
  if (filterForm.riskCategory) {
    list = list.filter((item) => {
      // 旧数据 category 与新 midloan_behavior 的映射
      if (filterForm.riskCategory === 'midloan_behavior') {
        return item.category === 'midloan_behavior' || item.category === 'behavior'
      }
      return item.category === filterForm.riskCategory
    })
  }
  // 一级分类过滤
  if (filterForm.l1Category) {
    list = list.filter((item) => item.l1Category === filterForm.l1Category)
  }
  // 二级分类过滤
  if (filterForm.l2Category) {
    list = list.filter((item) => item.l2Category === filterForm.l2Category)
  }
  if (viewMode.value === 'effect') {
    return [...list].sort((a, b) => (b.effectMetrics?.iv || 0) - (a.effectMetrics?.iv || 0))
  }
  if (viewMode.value === 'cost') {
    return [...list].sort((a, b) => (b.costMetrics?.monthlyCost || 0) - (a.costMetrics?.monthlyCost || 0))
  }
  return list
})
const loading = computed(() => variableStore.variableLoading)

const selectedRowKeys = ref([])
const selectedRows = ref([])

const handleViewModeChange = () => {
  // 切换视图时清空已选，避免跨视图选择混淆
  selectedRowKeys.value = []
  selectedRows.value = []
}

// 全局搜索（顶部常驻）
const globalKeyword = ref('')
const handleGlobalSearch = () => {
  filterForm.keyword = globalKeyword.value
  pagination.current = 1
  fetchVariableList()
}

// 多选上限：单次最多 200，超出提示并自动截断
const SELECTION_LIMIT = 200
const overSelectionLimit = computed(() => selectedRowKeys.value.length > SELECTION_LIMIT)

// 已保存视图
const savedViews = ref([])
const VIEW_STORAGE_KEY = 'variable.management.savedViews'
const loadSavedViews = () => {
  try {
    const raw = localStorage.getItem(VIEW_STORAGE_KEY)
    savedViews.value = raw ? JSON.parse(raw) : []
  } catch {
    savedViews.value = []
  }
}
loadSavedViews()

const saveViewVisible = ref(false)
const saveViewForm = reactive({ name: '', description: '' })

const openSaveViewModal = () => {
  saveViewForm.name = ''
  saveViewForm.description = ''
  saveViewVisible.value = true
}

const confirmSaveView = () => {
  if (!saveViewForm.name.trim()) {
    Message.warning('请输入视图名称')
    return false
  }
  const view = {
    id: `VIEW-${Date.now()}`,
    name: saveViewForm.name.trim(),
    description: saveViewForm.description.trim(),
    filters: { ...filterForm, keyword: globalKeyword.value }, // 不再保存 dataSource
    createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
  }
  savedViews.value = [view, ...savedViews.value]
  localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(savedViews.value))
  Message.success(`已保存视图：${view.name}`)
  return true
}

const handleSelectSavedView = (val) => {
  if (val === '__empty') return
  const view = savedViews.value.find((v) => v.id === val)
  if (!view) return
  globalKeyword.value = view.filters.keyword || ''
  filterForm.keyword = view.filters.keyword || ''
  filterForm.type = view.filters.type || ''
  filterForm.offlineAnalysisStatus = view.filters.offlineAnalysisStatus || ''
  filterForm.apiCallStatus = view.filters.apiCallStatus || ''
  filterForm.l1Category = view.filters.l1Category || ''
  filterForm.l2Category = view.filters.l2Category || ''
  pagination.current = 1
  fetchVariableList()
  Message.success(`已应用视图：${view.name}`)
}

const rowSelection = computed(() => ({
  type: 'checkbox',
  showCheckedAll: true,
  selectedRowKeys: selectedRowKeys.value
}))

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showTotal: true,
  showJumper: true,
  showPageSize: true
})

watch(
  () => variableStore.pagination,
  (p) => {
    pagination.current = p.page
    pagination.pageSize = p.pageSize
    pagination.total = p.total
  },
  { deep: true, immediate: true }
)

const columnsAll = [
  { title: '特征名称', dataIndex: 'name', slotName: 'name', width: 200 },
  { title: '特征编码', dataIndex: 'code', width: 180 },
  { title: '品类', dataIndex: 'category', slotName: 'categoryCell', width: 110 },
  { title: '类型', dataIndex: 'type', slotName: 'type', width: 100 },
  { title: '离线分析状态', dataIndex: 'offlineAnalysisStatus', slotName: 'offlineAnalysisStatusCell', width: 140 },
  { title: 'API调用状态', dataIndex: 'apiCallStatus', slotName: 'apiCallStatusCell', width: 140 },
  { title: '一级分类', dataIndex: 'l1Category', slotName: 'l1CategoryCell', width: 110 },
  { title: '二级分类', dataIndex: 'l2Category', slotName: 'l2CategoryCell', width: 130 },
  { title: '名单类型', dataIndex: 'listType', slotName: 'listTypeCell', width: 100 },
  { title: '创建人', dataIndex: 'creator', width: 120 },
  { title: '创建时间', dataIndex: 'createdAt', width: 180 },
  { title: '操作', dataIndex: 'actions', slotName: 'actions', width: 180, fixed: 'right' }
]

const columnsEffect = [
  { title: '特征名称', dataIndex: 'name', slotName: 'name', width: 200 },
  { title: '类型', dataIndex: 'type', slotName: 'type', width: 100 },
  { title: '离线分析状态', dataIndex: 'offlineAnalysisStatus', slotName: 'offlineAnalysisStatusCell', width: 140 },
  { title: 'API调用状态', dataIndex: 'apiCallStatus', slotName: 'apiCallStatusCell', width: 140 },
  { title: 'IV', dataIndex: 'effectMetrics', slotName: 'ivCell', width: 100, align: 'right' },
  { title: 'KS', dataIndex: 'effectMetrics', slotName: 'ksCell', width: 100, align: 'right' },
  { title: 'AUC', dataIndex: 'effectMetrics', slotName: 'aucCell', width: 100, align: 'right' },
  { title: '覆盖率', dataIndex: 'effectMetrics', slotName: 'coverageCell', width: 100, align: 'right' },
  { title: '提升度', dataIndex: 'effectMetrics', slotName: 'liftCell', width: 100, align: 'right' },
  { title: '操作', dataIndex: 'actions', slotName: 'actions', width: 180, fixed: 'right' }
]

const columnsCost = [
  { title: '特征名称', dataIndex: 'name', slotName: 'name', width: 200 },
  { title: '类型', dataIndex: 'type', slotName: 'type', width: 100 },
  { title: '离线分析状态', dataIndex: 'offlineAnalysisStatus', slotName: 'offlineAnalysisStatusCell', width: 140 },
  { title: 'API调用状态', dataIndex: 'apiCallStatus', slotName: 'apiCallStatusCell', width: 140 },
  { title: '单价(元/次)', dataIndex: 'costMetrics', slotName: 'priceCell', width: 120, align: 'right' },
  { title: '月均调用', dataIndex: 'costMetrics', slotName: 'callsCell', width: 130, align: 'right' },
  { title: '月均成本', dataIndex: 'costMetrics', slotName: 'monthlyCostCell', width: 140, align: 'right' },
  { title: '趋势', dataIndex: 'costMetrics', slotName: 'trendCell', width: 90 },
  { title: '操作', dataIndex: 'actions', slotName: 'actions', width: 180, fixed: 'right' }
]

const columns = computed(() => {
  if (viewMode.value === 'effect') return columnsEffect
  if (viewMode.value === 'cost') return columnsCost
  return columnsAll
})

const typeMap = {
  numerical: { label: '数值型', color: 'blue' },
  categorical: { label: '分类型', color: 'green' },
  text: { label: '文本型', color: 'orange' },
  datetime: { label: '时间型', color: 'purple' },
  boolean: { label: '布尔型', color: 'cyan' }
}

/**
 * IV 等级：
 *  - < 0.02 弱
 *  - 0.02~0.1 中
 *  - 0.1~0.3 强
 *  - >= 0.3 极强
 */
const getEffectLevel = (value, key) => {
  if (value == null) return ''
  if (key === 'iv') {
    if (value >= 0.3) return 'strong'
    if (value >= 0.1) return 'medium'
    if (value >= 0.02) return 'weak'
    return 'low'
  }
  return ''
}

const getEffectLevelLabel = (value, key) => {
  const level = getEffectLevel(value, key)
  if (key === 'iv') {
    return { strong: '强', medium: '中', weak: '弱', low: '低' }[level] || ''
  }
  return ''
}

/**
 * 数字千分位格式化
 */
const formatNumber = (value) => {
  if (value == null) return '—'
  return Number(value).toLocaleString('zh-CN')
}

// 当前角色（每次渲染读取，不做响应式追踪，避免 Layout 循环）
// 切换角色会触发 DemoConsole 的 user-context-changed 事件
// 我们直接读取 UserContext.get().role 而不订阅，避免循环
// ============ 最外层：状态 × 操作 映射逻辑（集中管理）============
/**
 * 状态与操作的对应关系集中定义在最外层，便于维护和审查。
 *
 * 数据形态分两大类：
 * - 离线分析状态（阶段1-3）：需求提出→已注册→开发中→数仓已上线→待业务验证→业务已验证→管理员已确认
 * - API调用状态（阶段4-5）：参数准备→内数注册中→特征中心注册中→已上线→已下线
 *
 * 每个状态对应：
 * - topActions：列表页顶层快捷按钮（详情/编辑/补充底表/外数档案/重试）
 * - mainActions：主流程操作（通过「更多操作」dropdown 触发）
 */
const buildStatusActionMap = (record, role) => {
  const status = record.midloanStatus || record.status
  const { topActions, mainActions } = tableActionsByStatus(status, record, role)
  const topKeys = new Set(topActions.map(a => a.key))
  const dedupedMain = mainActions.filter(a => !topKeys.has(a.key))
  /** 第一个主流程操作用于状态列「点这里」快捷入口 */
  const firstMainAction = dedupedMain.length > 0 ? dedupedMain[0] : null
  return {
    status,
    topActions,
    mainActions: dedupedMain,
    actionHint: firstMainAction ? firstMainAction.label : '',
    actionHintKey: firstMainAction ? firstMainAction.key : ''
  }
}

// 预计算所有行的状态×操作映射（最外层集中处理，模板只做展示）
const statusActionMap = computed(() => {
  const role = UserContext.get().role
  const map = {}
  const list = variableList.value || []
  list.forEach(record => {
    map[record.id] = buildStatusActionMap(record, role)
  })
  return map
})

const displayList = computed(() => {
  let list = variableList.value || []
  // 离线分析状态筛选（阶段1-3）
  if (filterForm.offlineAnalysisStatus) {
    list = list.filter(record => {
      const status = record.midloanStatus || record.status
      return getStatusCategory(status) === 'offline_analysis' && status === filterForm.offlineAnalysisStatus
    })
  }
  // API调用状态筛选（阶段4-5）
  if (filterForm.apiCallStatus) {
    list = list.filter(record => {
      const status = record.midloanStatus || record.status
      return getStatusCategory(status) === 'online_interface' && status === filterForm.apiCallStatus
    })
  }
  return list.map(record => {
    const actionInfo = statusActionMap.value[record.id] || { actionHint: '', actionHintKey: '' }
    return {
      ...record,
      actionHint: actionInfo.actionHint,
      actionHintKey: actionInfo.actionHintKey
    }
  })
})

/**
 * 表格内的状态列快捷操作处理
 * 点击状态列的「点这里：xxx」tag → 直接唤起对应抽屉，不再跳转详情页
 * 1. 主流程5个动作（submit_requirement / submit_dev_oa / business_verify_pass / admin_confirm_pass / submit_production_order）
 *    → MidloanActionDrawer
 * 2. OA 投产审批（oa_production_approve / oa_production_reject）
 *    → MidloanActionDrawer（Drawer 内部需要 actionKey 兼容）
 * 3. submit_online（草稿/pending）→ onlineApproval 抽屉
 * 4. retry_* → 直接执行（不需抽屉）
 */
const handleQuickAction = (record, actionKey) => {
  // 优先取函数传入的 actionKey（主状态tag点击时用）；未传入则从 record 取
  const key = actionKey || record.actionHintKey
  if (!key) {
    Message.warning('当前状态下无可执行操作')
    return
  }

  // 主流程5个 + OA审批2个 + 管理员状态修正 + 内数失败补表 + 特征归档 → 唤起 MidloanActionDrawer
  const drawerActions = [
    'submit_requirement',
    'submit_dev_oa',
    'business_verify_pass',
    'admin_confirm_pass',
    'submit_production_order',
    'oa_production_approve',
    'oa_production_reject',
    'correct_status',
    'retry_sync_supplement_table',
    'archive_variable'
  ]
  if (drawerActions.includes(key)) {
    actionDrawerRecord.value = record
    actionDrawerKey.value = key
    actionDrawerBatchRecords.value = []
    actionDrawerVisible.value = true
    return
  }

  // 提交上线（非 midloan 行为品类·草稿/pending）
  if (key === 'submit_online') {
    onlineApprovalRecord.value = record
    onlineApprovalVisible.value = true
    return
  }

  // 重试类（直接执行）
  if (key.startsWith('retry') || key === 'manual_batch_retry') {
    // 内数同步失败 + 无数据底表：先引导补充数据底表
    if (key === 'retry_sync' && record?.midloanStatus === 'internal_sync_failed' && !record?.dataTableName) {
      actionDrawerRecord.value = record
      actionDrawerKey.value = 'retry_sync_supplement_table'
      actionDrawerBatchRecords.value = []
      actionDrawerVisible.value = true
      return
    }
    triggerTableAction(record, { key })
    return
  }

  // 兜底：跳详情页
  handleViewDetail(record)
}

/**
 * 获取某行特征在当前状态+角色下的顶层快捷操作
 * 从最外层 statusActionMap 读取，保证映射逻辑集中管理
 */
const getTableTopActions = (record) => {
  const actionInfo = statusActionMap.value[record.id]
  if (!actionInfo) {
    const status = record.midloanStatus || record.status
    const role = UserContext.get().role
    const { topActions } = tableActionsByStatus(status, record, role)
    return topActions
  }
  return actionInfo.topActions
}

/**
 * 获取某行特征在当前状态+角色下的主流程操作（dropdown）
 * 从最外层 statusActionMap 读取
 */
const getTableMainActions = (record) => {
  const actionInfo = statusActionMap.value[record.id]
  if (!actionInfo) {
    const status = record.midloanStatus || record.status
    const role = UserContext.get().role
    const { mainActions } = tableActionsByStatus(status, record, role)
    return mainActions
  }
  return actionInfo.mainActions
}

/**
 * 主流程操作点击处理（在列表页直接弹出抽屉/直接执行）
 */
const handleMainFlowAction = (record, action) => {
  // 主流程操作（submit_requirement/submit_dev_oa/business_verify_pass/admin_confirm_pass/
  // submit_production_order/retry_sync/retry_dw/manual_batch_retry）直接在列表页触发
  triggerTableAction(record, action)
}

/**
 * 操作按钮点击处理
 */
const handleTableAction = (record, action) => {
  triggerTableAction(record, action)
}

/**
 * 统一的表格 action 触发入口
 * 1. 需要抽屉的 action（submit_requirement / submit_dev_oa / business_verify_pass / admin_confirm_pass / submit_production_order / submit_online / correct_status）→ 弹对应抽屉
 * 2. 直接执行的 action（retry_sync / retry_dw / manual_batch_retry / simulate_*）→ 直接调用 stateEngine
 * 3. 详情 / 编辑 / 补充数据底表 / 外数档案 / 评估 / 血缘 / 变更记录 → 跳转到详情页对应 Tab
 */
const triggerTableAction = (record, action) => {
  const status = record.midloanStatus || record.status
  const drawerActions = ['submit_dev_oa', 'business_verify_pass', 'admin_confirm_pass', 'submit_production_order']

  // submit_requirement：打开 VariableRegisterDrawer 审核模式（B1 完整注册表单）
  if (action.key === 'submit_requirement') {
    openRegisterDrawer({ source: 'ledger', requirementData: record })
    return
  }

  // submit_online：非 midloan 行为品类的草稿/pending → 弹简化的上线审批抽屉
  if (action.key === 'submit_online') {
    onlineApprovalRecord.value = record
    onlineApprovalVisible.value = true
    return
  }

  // correct_status：管理员专属，弹状态修正抽屉
  if (action.key === 'correct_status') {
    actionDrawerRecord.value = record
    actionDrawerKey.value = 'correct_status'
    actionDrawerBatchRecords.value = []
    actionDrawerVisible.value = true
    return
  }

  if (drawerActions.includes(action.key)) {
    // 在列表页直接弹抽屉
    actionDrawerRecord.value = record
    actionDrawerKey.value = action.key
    actionDrawerBatchRecords.value = []
    actionDrawerVisible.value = true
    return
  }

  // 直接执行类操作
  const directActions = {
    retry_sync: () => Message.success('已触发重新同步'),
    retry_dw: () => Message.success('已触发重新触发数仓任务'),
    manual_batch_retry: () => Message.success('已触发手动批次重试'),
    simulate_dw_success: () => Message.success('已模拟数仓成功'),
    simulate_dw_success_dw: () => Message.success('已模拟数仓成功（DW回调）'),
    simulate_dw_failed: () => Message.success('已模拟数仓失败')
  }

  if (directActions[action.key]) {
    const result = MidloanStateEngine.handleAction(record.id, action.key, {
      operator: UserContext.get().name || '小李'
    })
    if (result?.ok) {
      directActions[action.key]()
      fetchVariableList()
    } else {
      Message.error(result?.reason || '执行失败')
    }
    return
  }

  // 跳转类操作
  switch (action.key) {
    case 'view_detail':
      handleViewDetail(record)
      break
    case 'edit':
      handleEdit(record)
      break
    case 'supplement_table':
      // 跳详情页并自动打开「补充数据底表」抽屉（含 HIVE 表与字段 + 技术关联信息）
      handleViewDetail(record, { tab: 'basic', focusField: 'dataTableName' })
      break
    case 'external_archive':
      openExternalArchive(record)
      break
    case 'line_usage':
      handleViewDetail(record, { tab: 'lineage' })
      Message.info('查看血缘与使用场景')
      break
    case 'evaluation':
      handleViewDetail(record, { tab: 'evaluation' })
      Message.info('查看特征评估报告')
      break
    case 'view_change_record':
      handleViewDetail(record, { tab: 'versions' })
      Message.info('查看变更记录')
      break
    default:
      handleViewDetail(record)
  }
}

/**
 * 从表格触发重试（异常态，保留兼容）
 */
const handleRetryFromTable = (record) => {
  const status = record.midloanStatus || record.status
  const map = {
    internal_sync_failed: 'retry_sync',
    variable_sync_failed: 'retry_sync',
    dw_online_failed: 'retry_dw',
    offline_failed: 'manual_batch_retry'
  }
  const actionKey = map[status]
  if (!actionKey) return
  triggerTableAction(record, { key: actionKey })
}

// ============ 列表页通用 Action 抽屉 ============
const actionDrawerVisible = ref(false)
const actionDrawerRecord = ref(null)
const actionDrawerKey = ref('')
const actionDrawerSubmitting = ref(false)
const actionDrawerBatchRecords = ref([])

const handleActionDrawerSubmit = (payload) => {
  actionDrawerSubmitting.value = true
  try {
    // 批量模式：submit_dev_oa 批量提交
    if (actionDrawerKey.value === 'submit_dev_oa' && actionDrawerBatchRecords.value.length > 0) {
      const ids = actionDrawerBatchRecords.value.map(r => r.id)
      const result = MidloanStateEngine.batchExecute(ids, 'submit_dev_oa', payload)
      if (result.failed === 0) {
        Message.success(`批量提开发OA单完成：成功 ${result.succeeded} 条`)
      } else {
        Message.warning(`批量提开发OA单完成：成功 ${result.succeeded} 条，失败 ${result.failed} 条`)
      }
      actionDrawerVisible.value = false
      actionDrawerBatchRecords.value = []
      fetchVariableList()
      clearSelection()
      return
    }
    // 单条模式
    if (!actionDrawerRecord.value) return
    // correct_status：payload 含 targetStatus / reason / remark
    // 其他主流程：payload 透传到 stateEngine
    const result = MidloanStateEngine.handleAction(
      actionDrawerRecord.value.id,
      actionDrawerKey.value,
      { operator: UserContext.get().name || '小李', ...payload }
    )
    if (result?.ok) {
      Message.success(actionDrawerKey.value === 'correct_status' ? '状态已修正' : '操作成功，状态已更新')
      actionDrawerVisible.value = false
      actionDrawerBatchRecords.value = []
      fetchVariableList()
    } else {
      Message.error(result?.reason || '操作失败')
    }
  } finally {
    actionDrawerSubmitting.value = false
  }
}

// ============ 提交上线（非 midloan 行为品类·草稿/pending） ============
const onlineApprovalVisible = ref(false)
const onlineApprovalRecord = ref(null)
const onlineApprovalSubmitting = ref(false)
const onlineApprovalForm = reactive({
  reason: '',
  expectedOnlineTime: '',
  approver: 'dmt_admin'
})

const handleOnlineApprovalSubmit = async () => {
  if (!onlineApprovalRecord.value) return
  if (!onlineApprovalForm.reason.trim()) {
    Message.warning('请填写启用原因')
    return
  }
  if (!onlineApprovalForm.expectedOnlineTime.trim()) {
    Message.warning('请填写预计上线时间')
    return
  }
  onlineApprovalSubmitting.value = true
  try {
    const record = VariableStatusStore.submitForOnline({
      variableId: onlineApprovalRecord.value.id,
      reason: onlineApprovalForm.reason.trim(),
      expectedOnlineTime: onlineApprovalForm.expectedOnlineTime.trim(),
      approver: onlineApprovalForm.approver
    })
    Message.success(`已发起审批：审批单 ${record.id}（审批人：${onlineApprovalForm.approver}）`)
    onlineApprovalVisible.value = false
    onlineApprovalForm.reason = ''
    onlineApprovalForm.expectedOnlineTime = ''
    onlineApprovalForm.approver = 'dmt_admin'
    fetchVariableList()
  } finally {
    onlineApprovalSubmitting.value = false
  }
}

const statusMap = {
  draft: { label: '草稿', color: 'gray' },
  pending: { label: '待审核', color: 'orange' },
  active: { label: '已发布', color: 'green' },
  inactive: { label: '已停用', color: 'red' },
  expired: { label: '已过期', color: 'lightgray' }
}

const sourceTypeMap = {
  external: { label: '外数', color: 'arcoblue' },
  internal: { label: '内数', color: 'blue' },
  credit: { label: '征信', color: 'purple' }
}

const domainOptions = [
  { label: '风控', value: '风控' },
  { label: '营销', value: '营销' },
  { label: '反欺诈', value: '反欺诈' },
  { label: '客户画像', value: '客户画像' }
]

const visibilityOptions = [
  { label: '团队内', value: 'team' },
  { label: '全公司可见', value: 'company' },
  { label: '仅审计可见', value: 'audit' }
]

const taskTypeOptions = [
  { label: '准入评估', value: 'access' },
  { label: '复评任务', value: 'recheck' },
  { label: '对比评估', value: 'comparison' }
]

const variableTypeOptions = computed(() =>
  ExploreTaxonomyStore.listTypes().map((item) => ({ label: item.title, value: item.id }))
)

const incrementalModalVisible = ref(false)
const incrementalFileCount = ref(0)
const incrementalRecords = ref([])

const incrementalPreviewColumns = [
  { title: '特征名称', dataIndex: 'name', width: 140, ellipsis: true, tooltip: true },
  { title: '特征编码', dataIndex: 'code', width: 140, ellipsis: true, tooltip: true },
  { title: '类型', dataIndex: 'type', width: 100 },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 90 },
  { title: '数据源', dataIndex: 'dataSource', width: 120, ellipsis: true, tooltip: true },
  { title: '来源字段', dataIndex: 'sourceField', width: 120, ellipsis: true, tooltip: true },
  { title: '更新频率', dataIndex: 'updateFrequency', width: 100 },
  { title: '定义说明', dataIndex: 'definition', width: 200, ellipsis: true, tooltip: true },
  { title: '描述', dataIndex: 'description', width: 200, ellipsis: true, tooltip: true }
]

const batchTopicVisible = ref(false)
const batchTopicForm = reactive({
  name: '',
  businessProblem: '',
  hypothesis: '',
  domain: '风控',
  visibility: 'team',
  variableTypeId: '',
  exploreCategoryId: ''
})

watch(
  () => batchTopicForm.variableTypeId,
  () => {
    batchTopicForm.exploreCategoryId = ''
  }
)

const categoryOptions = computed(() => {
  if (!batchTopicForm.variableTypeId) return []
  return ExploreTaxonomyStore.listLeafCategories(batchTopicForm.variableTypeId).map((item) => ({
    label: item.title,
    value: item.id
  }))
})

const batchEvaluationVisible = ref(false)
const batchEvaluationForm = reactive({
  name: '',
  taskType: 'access',
  description: ''
})

const getTypeLabel = (type) => typeMap[type]?.label || type
const getTypeColor = (type) => typeMap[type]?.color || 'gray'
const getStatusLabel = (status) => statusMap[status]?.label || status
const getStatusColor = (status) => statusMap[status]?.color || 'gray'
const getSourceTypeLabel = (sourceType) => sourceTypeMap[sourceType]?.label || (sourceType || '—')
const getSourceTypeColor = (sourceType) => sourceTypeMap[sourceType]?.color || 'gray'
// 11 状态机 + 品类辅助函数
const getRiskCategoryLabel = (cat) => riskCategoryLabel(cat)
const getRiskCategoryColor = (cat) => riskCategoryColor(cat)
const getMidloanStatusLabel = (s) => midloanStatusLabel(s)
const getMidloanStatusColor = (s) => midloanStatusColor(s)

// 一级分类标签
const l1CategoryLabel = (key) => {
  const found = MIDLOAN_L1_CATEGORIES.find((c) => c.value === key)
  return found ? found.label : (key || '—')
}

// 二级分类动态选项（从现有特征 l2Category 去重）
const l2CategoryOptionsForFilter = computed(() => {
  const set = new Set()
  const all = variableStore.variableList || []
  all.forEach((v) => {
    if (filterForm.l1Category && v.l1Category !== filterForm.l1Category) return
    if (v.l2Category) set.add(v.l2Category)
  })
  return Array.from(set).sort().map((v) => ({ value: v, label: v }))
})

// 切换一级分类时清空二级分类
function onL1CategoryChange() {
  filterForm.l2Category = ''
  handleSearch()
}

function clearSelection() {
  selectedRowKeys.value = []
  selectedRows.value = []
}

function inferVariableTypeId(rows) {
  const mapped = rows
    .map((item) => item.category || (item.sourceType === 'credit' ? 'credit' : item.sourceType === 'external' ? 'external' : 'behavior'))
    .filter(Boolean)
  const unique = [...new Set(mapped)]
  return unique.length === 1 ? unique[0] : ''
}

function buildBatchTopicPrefill() {
  const inferredTypeId = inferVariableTypeId(selectedRows.value)
  const dsLabel = selectedDataSourceLabel.value || '特征'
  batchTopicForm.name = `${dsLabel}_批量探索_${new Date().toISOString().slice(0, 10)}`
  batchTopicForm.businessProblem = `当前从特征台账中选中了 ${selectedRows.value.length} 个特征，需统一评估特征口径、可复用性与补充空间。`
  batchTopicForm.hypothesis = '已选特征可进一步形成组合方案或衍生规则，需在课题内沉淀实验与决策证据链。'
  batchTopicForm.domain = '风控'
  batchTopicForm.visibility = 'team'
  batchTopicForm.variableTypeId = inferredTypeId
  batchTopicForm.exploreCategoryId = ''
}

function buildBatchEvaluationPrefill() {
  batchEvaluationForm.name = `特征批量评估_${new Date().toISOString().slice(0, 10)}`
  batchEvaluationForm.taskType = 'access'
  batchEvaluationForm.description = `基于特征台账已选 ${selectedRows.value.length} 个特征创建 mock 评估任务，后续在任务中心执行并沉淀评估结果。`
}

// 数据源过滤已移除：保留 dataSources 仅用于关联特征来源信息展示
const fetchDataSources = async () => {
  // 兼容性保留：未来如需保留数据源概念，可重新启用
  // try {
  //   const res = await getDataSources()
  //   if (res.code === 200) dataSources.value = res.data || []
  // } catch (e) {}
}

const fetchVariableList = async () => {
  try {
    await variableStore.fetchVariableList({
      page: pagination.current,
      pageSize: pagination.pageSize,
      keyword: filterForm.keyword,
      type: filterForm.type
    })
  } catch (error) {
    console.error('获取特征列表失败:', error)
    Message.error('获取特征列表失败')
  }
}

const handleSearch = () => {
  variableStore.updateFilters({
    keyword: filterForm.keyword,
    type: filterForm.type
  })
  pagination.current = 1
  clearSelection()
  fetchVariableList()
}

const handleReset = () => {
  filterForm.keyword = ''
  filterForm.type = ''
  filterForm.offlineAnalysisStatus = ''
  filterForm.apiCallStatus = ''
  filterForm.l1Category = ''
  filterForm.l2Category = ''
  variableStore.resetFilters()
  clearSelection()
  handleSearch()
}

const handlePageChange = (page) => {
  pagination.current = page
  clearSelection()
  fetchVariableList()
}

const handleSelectionChange = (keys) => {
  if (keys.length > SELECTION_LIMIT) {
    // 截断：仅保留前 SELECTION_LIMIT 条，提示用户
    const limited = keys.slice(0, SELECTION_LIMIT)
    Message.warning(`单次最多批量操作 ${SELECTION_LIMIT} 个特征，已自动截断超出部分。请保存视图后分批执行。`)
    selectedRowKeys.value = limited
    selectedRows.value = variableList.value.filter((item) => limited.includes(item.id))
    return
  }
  selectedRowKeys.value = keys
  selectedRows.value = variableList.value.filter((item) => keys.includes(item.id))
}

// ============ 批量操作（用户反馈：动态操作是否可以批量提交）============

/**
 * 当前选中记录的状态分布（用于批量操作栏展示）
 */
const selectedStatusSummary = computed(() => {
  const map = {}
  selectedRows.value.forEach(r => {
    const s = r.midloanStatus || r.status
    if (!map[s]) map[s] = 0
    map[s]++
  })
  return map
})

/**
 * 获取当前选中记录可执行的批量操作列表
 * - 遍历 allowedActionsByStatus 找出所有匹配项
 * - 同一个 action key 在不同状态下可能都支持
 * - 过滤白名单（仅主流程+重试类）
 */
const getBatchAvailableActions = () => {
  if (selectedRows.value.length === 0) return []

  const role = UserContext.get().role
  // 文档 K1 明确下线是被动接收（特征中心发起），台账无主动申请下线，故移除 request_offline
  const allowedKeys = [
    'submit_requirement',
    'submit_dev_oa',
    'business_verify_pass',
    'admin_confirm_pass',
    'submit_production_order',
    'retry_sync',
    'retry_dw',
    'manual_batch_retry'
  ]

  // 统计每个 action 在选中数据中匹配的状态
  const actionMap = {}
  selectedRows.value.forEach(record => {
    const status = record.midloanStatus || record.status
    const actions = allowedActionsByStatus(status, record, role)
    actions.forEach(a => {
      if (!allowedKeys.includes(a.key)) return
      if (a.category === 'demo') return  // 演示按钮不批量
      if (!actionMap[a.key]) {
        actionMap[a.key] = { key: a.key, label: a.label, category: a.category, matchCount: 0, records: [] }
      }
      actionMap[a.key].matchCount++
      actionMap[a.key].records.push(record.id)
    })
  })

  return Object.values(actionMap).sort((a, b) => b.matchCount - a.matchCount)
}

/**
 * 批量操作点击处理
 *
 * 注意：批量场景下用户不会逐条填写抽屉表单（如 OA 单号/验收人/下线原因等），
 * 引擎会自动生成 OA 单号/使用默认验收人/使用默认下线原因。
 * 因此需要在确认弹窗中明确告知用户。
 */
const NEED_DRAWER_PAYLOAD_ACTIONS = new Set([
  'submit_dev_oa',           // 需要 OA 开发单号
  'submit_production_order'  // 需要 OA 投产单号
])

const handleBatchAction = (batchAction) => {
  const ids = batchAction.records
  if (!ids || ids.length === 0) {
    Message.warning('无可执行记录')
    return
  }

  // submit_dev_oa 批量操作：打开 MidloanActionDrawer（与单个共用同一表单）
  if (batchAction.key === 'submit_dev_oa') {
    actionDrawerRecord.value = null
    actionDrawerKey.value = 'submit_dev_oa'
    actionDrawerBatchRecords.value = batchAction.records.map(id =>
      selectedRows.value.find(r => r.id === id)
    ).filter(Boolean)
    actionDrawerVisible.value = true
    return
  }

  // 提示信息：若该 action 原本需要抽屉填参，明确告知自动生成
  const needDrawer = NEED_DRAWER_PAYLOAD_ACTIONS.has(batchAction.key)
  const drawerHint = needDrawer
    ? `<br/><br/><span style="color: var(--color-text-3); font-size: 12px;">该操作在详情页需填写表单（OA单号/验收人/下线原因等），批量场景下将自动生成 OA 单号或使用默认值。详细参数可在「状态变更记录」中追溯。</span>`
    : ''

  Modal.confirm({
    title: `确认批量操作`,
    content: `<div>将对 <strong>${ids.length}</strong> 个特征执行「<strong>${batchAction.label}</strong>」操作，是否继续？${drawerHint}</div>`,
    okText: '确认提交',
    cancelText: '取消',
    onOk: () => {
      try {
        const result = MidloanStateEngine.batchExecute(ids, batchAction.key)
        if (result.failed === 0) {
          Message.success(`批量操作完成：成功 ${result.succeeded} 条`)
        } else {
          Message.warning(`批量操作完成：成功 ${result.succeeded} 条，失败 ${result.failed} 条`)
        }
        // 刷新列表
        fetchVariableList()
        clearSelection()
      } catch (e) {
        Message.error(`批量操作失败：${e?.message || '未知错误'}`)
      }
    }
  })
}

const handleViewDetail = (record, opts = {}) => {
  router.push({
    name: 'VariableAssetDetail',
    params: { id: record.id, mode: 'view' },
    query: opts.focusField ? { focusField: opts.focusField } : {}
  })
}

const openExternalArchive = (record) => {
  const id = record?.sourceRefs?.externalArchiveId
  if (!id) return
  window.open(buildRiskAppUrl(`/risk/external-data/archive/${id}`), '_blank')
}

/**
 * 编辑特征：复用「注册特征」抽屉（同一套 B1 表单 + 同一套校验），
 * 状态机锁定字段在抽屉内灰显，提交后就地回写、不改变流程状态
 */
const handleEdit = (record) => {
  openRegisterDrawer({ mode: 'edit', editData: { ...record } })
}

const handleToggleStatus = async (record) => {
  try {
    const isActive = record.status === 'active'
    if (!isActive) {
      // 启用：跳转到详情页"提交上线申请"
      Message.info('请到特征详情页提交上线申请')
      router.push({ name: 'VariableAssetDetail', params: { id: record.id, mode: 'view' } })
      return
    }
    Modal.confirm({
      title: '确认停用',
      content: `确定要停用特征"${record.name}"吗？停用后特征将不再对外提供，可重新启用。`,
      onOk: async () => {
        VariableStatusStore.setStatus(String(record.id), 'inactive', 'Demo 用户', '台账直接停用')
        Message.success('特征已停用')
        fetchVariableList()
      }
    })
  } catch (error) {
    Message.error('状态更新失败')
  }
}

const handleExport = () => {
  Message.info('导出功能开发中...')
}

const showIncrementalModal = () => {
  incrementalModalVisible.value = true
  incrementalFileCount.value = 0
  incrementalRecords.value = []
}

const handleCreateMenuSelect = (val) => {
  if (val === 'add' || val === 'create') {
    // 「注册为特征」=「新增」= 打开完整注册表单抽屉（B1 文档）
    openRegisterDrawer({ mode: 'create', source: 'ledger' })
    return
  }
  if (val === 'incremental') {
    showIncrementalModal()
  }
}

// ============ 新增：完整注册表单（B1 文档）============
const registerDrawerVisible = ref(false)
// 审核模式：传入 A1 需求数据，预填 B1 注册表单（submit_requirement 触发）
const registerDrawerRequirementData = ref(null)
// 抽屉入口：ledger=特征台账注册特征；derivation=需求列表「去注册」（同一个组件，不同预填与提交口径）
const registerDrawerSource = ref('ledger')
// 抽屉模式：create=注册新特征；edit=编辑既有特征（与新建完全同构的表单 + 校验）
const registerDrawerMode = ref('create')
// 编辑模式下被修改的特征记录
const registerDrawerEditData = ref(null)

/**
 * 统一打开注册/编辑抽屉
 * 四种入口共用同一个 VariableRegisterDrawer，避免"新建一套表单、编辑另一套表单"
 */
function openRegisterDrawer(opts = {}) {
  registerDrawerMode.value = opts.mode || 'create'
  registerDrawerEditData.value = opts.editData || null
  registerDrawerRequirementData.value = opts.requirementData ?? null
  registerDrawerSource.value = opts.source || 'ledger'
  registerDrawerVisible.value = true
}

// 去重校验时需要排除「自己」：需求本身 + 该需求已生成的台账资产 + 正在编辑的特征本身
// 否则「去注册」/「编辑」会因台账里已存在同名特征而误报重名
const registerSelfIds = computed(() => {
  const ids = new Set()
  const target = registerDrawerRequirementData.value
  if (target) {
    ids.add(target.id)
    ;(variableStore.variableList || []).forEach((v) => {
      if (v.derivationId && v.derivationId === target.id) ids.add(v.id)
      if (v.midloanFeatureId && v.midloanFeatureId === target.id) ids.add(v.id)
    })
  }
  if (registerDrawerMode.value === 'edit' && registerDrawerEditData.value) {
    const editId = registerDrawerEditData.value.id || registerDrawerEditData.value.midloanFeatureId
    ids.add(editId)
    ;(variableStore.variableList || []).forEach((v) => {
      if (v.id === editId || (v.midloanFeatureId && v.midloanFeatureId === editId)) ids.add(v.id)
    })
  }
  return ids
})

// 已存在的英文名/中文名（用于去重校验）
const existingFeatureNames = computed(() =>
  (variableStore.variableList || [])
    .filter((v) => !registerSelfIds.value.has(v.id))
    .map((v) => v.code || v.name || '')
    .filter(Boolean)
)
const existingFeatureCnNames = computed(() =>
  (variableStore.variableList || [])
    .filter((v) => !registerSelfIds.value.has(v.id))
    .map((v) => v.featureCnName || v.name || '')
    .filter(Boolean)
)

const handleRegisterSubmit = (payload) => {
  // 编辑模式：与新建完全同构的表单 → 就地回写，流程状态不变
  if (payload.isEdit) {
    const id = payload.variableId
    // 先尝试 localStorage 草稿（用户新建的特征），未命中则回写内置 mock 资产
    const draftUpdated = VariableDraftStore.updateDraft(id, payload)
    const result = draftUpdated ? { ok: true } : MidloanStateEngine.updateFeatureBasicInfo(id, payload)
    if (!result?.ok) {
      Message.error(result?.reason || '保存失败')
      return
    }
    Message.success('特征信息已更新')
    registerDrawerVisible.value = false
    registerDrawerEditData.value = null
    fetchVariableList()
    return
  }
  // 需求列表「去注册」：B1 表单 → 回写 A1 需求 + 台账资产
  if (payload.source === 'derivation') {
    completeDerivationRegister(payload)
    return
  }
  // 审核模式（submit_requirement）：走 stateEngine 推进流程，而非新增草稿
  if (payload.isReview) {
    const result = MidloanStateEngine.handleAction(payload.requirementId, 'submit_requirement', payload)
    if (result?.ok) {
      Message.success('已审核通过并完成 B1 标准化注册')
      registerDrawerVisible.value = false
      registerDrawerRequirementData.value = null
      fetchVariableList()
    } else {
      Message.error(result?.reason || '提交失败')
    }
    return
  }
  const draft = VariableDraftStore.addDraft({
    ...payload,
    midloanStatus: 'requirement_proposal',
    requirementProposalAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    requirementProposer: UserContext.get().name || '业务方'
  })
  Message.success(`已创建特征：${draft.name}（${draft.id}），状态：需求提案`)
  registerDrawerVisible.value = false
  // 刷新台账数据 + 跳转到详情页（B1 R21）
  fetchVariableList()
  router.push({ name: 'VariableAssetDetail', params: { id: draft.id } })
}

const handleRegisterSaveDraft = (payload) => {
  // 保存草稿：status=draft，midloanStatus 留空以避免污染 midloan 统计
  VariableDraftStore.addDraft({
    ...payload,
    name: payload.name || `DRAFT_${Date.now()}`,
    featureCnName: payload.featureCnName || '（未命名草稿）'
  })
  Message.success('草稿已保存到「特征台账」底部，可在台账列表中查看')
}

const openBatchTopicModal = () => {
  if (!selectedRows.value.length) {
    Message.warning('请先勾选特征')
    return
  }
  if (selectedRows.value.length > 50) {
    Modal.confirm({
      title: '批量发起确认',
      content: `已选 ${selectedRows.value.length} 个特征，过程信息将汇总在 1 个探索课题中。是否继续？`,
      okText: '继续',
      onOk: () => {
        buildBatchTopicPrefill()
        batchTopicVisible.value = true
      }
    })
    return
  }
  buildBatchTopicPrefill()
  batchTopicVisible.value = true
}

const openBatchEvaluationModal = () => {
  if (!selectedRows.value.length) {
    Message.warning('请先勾选特征')
    return
  }
  if (selectedRows.value.length > 50) {
    Modal.confirm({
      title: '批量评估确认',
      content: `已选 ${selectedRows.value.length} 个特征，评估执行可能需要较长时间。是否继续？`,
      okText: '继续',
      onOk: () => {
        buildBatchEvaluationPrefill()
        batchEvaluationVisible.value = true
      }
    })
    return
  }
  buildBatchEvaluationPrefill()
  batchEvaluationVisible.value = true
}

const submitBatchTopic = () => {
  if (!batchTopicForm.name.trim()) {
    Message.warning('请填写课题名称')
    return
  }
  const type = batchTopicForm.variableTypeId ? ExploreTaxonomyStore.getTypeById(batchTopicForm.variableTypeId) : undefined
  const category = batchTopicForm.variableTypeId
    ? ExploreTaxonomyStore.listLeafCategories(batchTopicForm.variableTypeId).find((item) => item.id === batchTopicForm.exploreCategoryId)
    : undefined
  const relatedResources = []
  selectedRows.value.forEach((item) => {
    relatedResources.push({ type: 'variable', name: item.id, displayName: `特征：${item.name}` })
  })
  const topic = ExploreStore.addTopic({
    name: batchTopicForm.name.trim(),
    businessProblem: batchTopicForm.businessProblem.trim(),
    hypothesis: batchTopicForm.hypothesis.trim(),
    domain: batchTopicForm.domain,
    visibility: batchTopicForm.visibility,
    variableTypeId: batchTopicForm.variableTypeId || undefined,
    variableTypeTags: type ? [type.title] : [],
    exploreCategoryId: batchTopicForm.exploreCategoryId || undefined,
    exploreCategoryTitle: category?.title,
    relatedVariableIds: selectedRows.value.map((item) => item.id),
    relatedResources
  })
  Message.success(`已基于 ${selectedRows.value.length} 个特征发起探索课题`)
  batchTopicVisible.value = false
  clearSelection()
  router.push(`/explore/topics/${topic.id}`)
}

const submitBatchEvaluation = () => {
  if (!batchEvaluationForm.name.trim()) {
    Message.warning('请填写任务名称')
    return
  }
  const ds = selectedDataSourceMeta.value
  const variableTypeId = inferVariableTypeId(selectedRows.value)
  const type = variableTypeId ? ExploreTaxonomyStore.getTypeById(variableTypeId) : null
  const task = EvaluationTaskStore.addTask({
    name: batchEvaluationForm.name.trim(),
    taskType: batchEvaluationForm.taskType,
    sourceType: 'variable_batch',
    sourceIds: selectedRows.value.map((item) => item.id),
    sourceNames: selectedRows.value.map((item) => item.name),
    description: batchEvaluationForm.description.trim(),
    variableTypeId: variableTypeId || undefined,
    variableTypeName: type?.title,
    targets: selectedRows.value.map((item) => ({
      id: item.id,
      name: item.name,
      code: item.code,
      sourceType: item.sourceType,
      dataSourceName: item.dataSourceName
    }))
  })
  Message.success(`已创建评估任务 ${task.id}`)
  batchEvaluationVisible.value = false
  clearSelection()
  router.push('/evaluation/tasks')
}

const parseExcelFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) return resolve([])
        const sheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(sheet)
        const records = json.map((r) => ({
          name: r.name || r.特征名称 || '',
          code: r.code || r.特征编码 || '',
          type: r.type || r.类型 || '',
          status: r.status || r.状态 || 'draft',
          dataSource: r.dataSource || r.数据源 || '',
          usageCount: Number(r.usageCount ?? r.使用次数 ?? 0),
          sourceField: r.sourceField ?? r.来源字段 ?? '',
          updateFrequency: r.updateFrequency ?? r.更新频率 ?? '',
          definition: r.definition ?? r.定义说明 ?? '',
          description: r.description ?? r.描述 ?? ''
        }))
        resolve(records)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

const handleIncrementalFileChange = async (info) => {
  const file = info.file?.file
  if (!file) return
  try {
    const records = await parseExcelFile(file)
    incrementalRecords.value = records
    incrementalFileCount.value = records.length
  } catch (e) {
    Message.error('解析文件失败')
  }
}

const clearIncrementalPreview = () => {
  incrementalRecords.value = []
  incrementalFileCount.value = 0
}

const loadMockIncrementalData = () => {
  const mockData = [
    {
      name: '近30天消费金额',
      code: 'consume_amt_30d',
      type: '数值型',
      status: 'online',
      dataSource: '交易流水表',
      usageCount: 12,
      sourceField: 'txn_amount',
      updateFrequency: '日',
      definition: '近30天客户的累计消费金额，含线上线下渠道',
      description: '用于贷中风险评分模型，反映客户近期消费能力'
    },
    {
      name: '近7天登录次数',
      code: 'login_cnt_7d',
      type: '数值型',
      status: 'online',
      dataSource: 'APP行为日志',
      usageCount: 8,
      sourceField: 'login_count',
      updateFrequency: '日',
      definition: '近7天客户通过APP的累计登录次数',
      description: '活跃度指标，用于客户流失预警'
    },
    {
      name: '最大逾期天数',
      code: 'max_overdue_days',
      type: '数值型',
      status: 'offline',
      dataSource: '还款记录表',
      usageCount: 5,
      sourceField: 'overdue_days',
      updateFrequency: '月',
      definition: '客户历史最大逾期天数',
      description: '核心信用风险特征，逾期天数越长风险越高'
    },
    {
      name: '夜间交易占比',
      code: 'night_txn_ratio',
      type: '比率型',
      status: 'draft',
      dataSource: '交易流水表',
      usageCount: 3,
      sourceField: 'txn_hour',
      updateFrequency: '日',
      definition: '22:00-06:00时段交易笔数占总交易笔数的比例',
      description: '夜间交易占比异常可能存在欺诈风险'
    },
    {
      name: '近90天授信使用率',
      code: 'credit_usage_90d',
      type: '比率型',
      status: 'online',
      dataSource: '授信额度表',
      usageCount: 7,
      sourceField: 'used_amount',
      updateFrequency: '月',
      definition: '近90天平均已用额度占总授信额度的比例',
      description: '额度使用率过高提示客户资金紧张'
    },
    {
      name: '还款行为稳定性指数',
      code: 'repay_stability_idx',
      type: '数值型',
      status: 'draft',
      dataSource: '还款记录表',
      usageCount: 2,
      sourceField: 'repay_amount',
      updateFrequency: '月',
      definition: '基于近6个月还款金额变异系数计算，值越低还款越稳定',
      description: '还款稳定性低预示收入波动较大'
    },
    {
      name: '跨平台交易笔数',
      code: 'cross_platform_cnt',
      type: '数值型',
      status: 'online',
      dataSource: '交易流水表',
      usageCount: 4,
      sourceField: 'platform_id',
      updateFrequency: '日',
      definition: '近30天涉及不同交易平台的交易笔数',
      description: '跨平台交易频繁可能存在多头借贷'
    },
    {
      name: '账户活跃天数',
      code: 'active_days_30d',
      type: '数值型',
      status: 'online',
      dataSource: 'APP行为日志',
      usageCount: 6,
      sourceField: 'active_flag',
      updateFrequency: '日',
      definition: '近30天内有交易或登录行为的天数',
      description: '账户活跃度综合指标'
    }
  ]
  incrementalRecords.value = mockData
  incrementalFileCount.value = mockData.length
  Message.success('已加载示例数据，请确认后导入')
}

const confirmIncrementalUpload = async () => {
  try {
    const res = await incrementalImportVariables(incrementalRecords.value)
    if (res.code === 200) {
      Message.success(`导入更新成功 ${res.data?.count || 0} 条`)
      incrementalModalVisible.value = false
      await fetchVariableList()
    }
  } catch (e) {
    Message.error('导入更新失败')
  }
}

onMounted(() => {
  fetchDataSources()
  fetchVariableList()
  // 处理从课题页「新建需求」跳转的 query
  handleDerivationAction()
})

// ============ 需求列表 Tab 数据 ============
const derivationStatusMap = {
  requirement_accepted: { label: '需求受理', color: 'blue' },
  registered:           { label: '已注册', color: 'green' },
  rejected:             { label: '需求驳回', color: 'red' }
}
// 计算展示状态：requirement_accepted + featureId → registered
function getDerivationDisplayStatus(record) {
  if (record.status === 'requirement_accepted' && record.featureId) return 'registered'
  return record.status
}
const getDerivationStatusLabel = (record) => {
  const s = typeof record === 'string' ? record : getDerivationDisplayStatus(record)
  return derivationStatusMap[s]?.label || s
}
const getDerivationStatusColor = (record) => {
  const s = typeof record === 'string' ? record : getDerivationDisplayStatus(record)
  return derivationStatusMap[s]?.color || 'gray'
}
// 辅助判断函数
const isRegistered = (record) => getDerivationDisplayStatus(record) === 'registered'
const isAccepted = (record) => record.status === 'requirement_accepted' && !record.featureId
const isRejected = (record) => record.status === 'rejected'

const derivationFilter = reactive({ keyword: '', status: '' })
const derivationList = ref([])
const derivationPagination = reactive({ current: 1, pageSize: 10, total: 0, showTotal: true, showJumper: true })

const derivationColumns = [
  { title: '需求ID', dataIndex: 'id', slotName: 'idCell', width: 170 },
  { title: '需求名称', dataIndex: 'name', width: 220, ellipsis: true, tooltip: true },
  { title: '特征类型', dataIndex: 'category', slotName: 'derivationCategoryCell', width: 110 },
  { title: '特征名称', dataIndex: 'featureCnName', width: 200, ellipsis: true, tooltip: true },
  { title: '状态', dataIndex: 'status', slotName: 'statusCell', width: 100 },
  { title: '关联特征ID', dataIndex: 'featureId', slotName: 'featureIdCell', width: 180 },
  { title: '处理人', dataIndex: 'handler', width: 120 },
  { title: '操作', dataIndex: 'actions', slotName: 'actions', width: 240, fixed: 'right' }
]

function refreshDerivations() {
  // registered 是派生态：requirement_accepted + featureId，store 中无此 status
  const filterCopy = { ...derivationFilter }
  if (filterCopy.status === 'registered') {
    filterCopy.status = 'requirement_accepted'
  }
  let list = DerivationStore.list(filterCopy)
  if (derivationFilter.status === 'registered') {
    list = list.filter((d) => d.featureId)
  }
  derivationList.value = list
  derivationPagination.total = list.length
}

// ============ 多选与批量注册 ============
const selectedDerivationIds = ref([])
const derivationRowSelection = computed(() => ({
  type: 'checkbox',
  showCheckedAll: true,
  selectedRowKeys: selectedDerivationIds.value
}))
function onDerivationSelectionChange(keys) {
  selectedDerivationIds.value = keys || []
}

// 批量注册：打开 BulkImportDerivationModal source=demand 模式
const bulkImportSource = ref('standalone')
const bulkRegisterRecords = ref([])
function openBulkRegister() {
  const records = (derivationList.value || []).filter((d) =>
    selectedDerivationIds.value.includes(d.id)
  )
  if (records.length === 0) {
    Message.warning('请先选择需求')
    return
  }
  bulkRegisterRecords.value = records
  bulkImportSource.value = 'demand'
  bulkImportVisible.value = true
}

// 重新受理：仅驳回状态可重新受理
function reopenDerivation(record) {
  const rec = DerivationStore.reopen(record.id)
  if (rec) {
    Message.success(`需求 ${rec.id} 已重新受理`)
    refreshDerivations()
  } else {
    Message.error('重新受理失败，仅已驳回状态的需求可重新受理')
  }
}

function resetDerivationFilter() {
  derivationFilter.keyword = ''
  derivationFilter.status = ''
  refreshDerivations()
}

// 流转动作
// 「去注册」与特征台账「注册特征」共用 VariableRegisterDrawer（B1 完整表单），
// 区别只在 source='derivation'：打开时把 A1 需求已填信息预填到表单，提交后回写需求 + 台账
function goRegister(record) {
  openRegisterDrawer({ source: 'derivation', requirementData: DerivationStore.get(record.id) || record })
}

// B1 表单字段 → A1 需求（DerivationRecord）字段口径
function derivationRegisterPatch(payload) {
  const patch = {
    featureEnName: payload.name,
    featureCnName: payload.featureCnName,
    fieldType: payload.fieldType,
    businessLogic: payload.businessLogic || payload.processingLogic || '',
    codeLogic: payload.codeLogic || '',
    defaultValue: payload.defaultValue || '',
    requirementDescription: payload.description || '',
    l1Category: payload.l1Category,
    l2Category: payload.l2Category,
    sourceTableAfter: payload.sourceTableAfter || '',
    sourceTableBefore: payload.sourceTableBefore || '',
    originFeatureEnName: payload.sourceField || '',
    dataFreshness: payload.dataFreshness,
    developer: payload.developer,
    dataTableName: payload.dataTableName || '',
    dwTaskId: payload.dwTaskId || '',
    productScope: payload.productScope || '',
    listType: payload.listType || 'none',
    batch: payload.batch || '',
    acceptor: payload.acceptor || '',
    remark: payload.remark || ''
  }
  // 附件为空时不写入，避免 Object.assign 清掉需求原有的 Excel 评估报告
  if (payload.excelAttachment) patch.attachment = { ...payload.excelAttachment }
  return patch
}

function completeDerivationRegister(payload) {
  const target = registerDrawerRequirementData.value
  if (!target) return
  const list = variableStore.variableList || []
  // 该需求是否已有台账资产（种子数据里部分需求已带资产）：有则复用，避免重复建档
  let asset = list.find(
    (v) => v.derivationId === target.id || v.midloanFeatureId === target.id || v.id === target.id
  )
  if (!asset) {
    asset = VariableDraftStore.addDraft({ ...payload, derivationId: target.id })
  }
  const rec = DerivationStore.register(target.id, {
    ...derivationRegisterPatch(payload),
    featureId: asset.id
  })
  if (!rec) {
    Message.error('注册失败：未找到需求记录')
    return
  }
  Message.success(`已注册特征 ${rec.featureId}，状态：已注册`)
  registerDrawerVisible.value = false
  registerDrawerRequirementData.value = null
  registerDrawerSource.value = 'ledger'
  refreshDerivations()
  fetchVariableList()
}

function goFeatureDetail(featureId) {
  router.push({ name: 'VariableAssetDetail', params: { id: featureId, mode: 'view' } })
}

// 新建需求
const derivationCreateVisible = ref(false)
function openDerivationCreate() {
  derivationCreateVisible.value = true
}

// 批量导入（A1 R19）
const bulkImportVisible = ref(false)
function openBulkImport() {
  bulkImportSource.value = 'standalone'
  bulkRegisterRecords.value = []
  bulkImportVisible.value = true
}
function onBulkImport(rows) {
  if (!rows || rows.length === 0) {
    Message.warning('没有可导入的数据')
    return
  }

  // demand 模式：批量注册特征
  if (bulkImportSource.value === 'demand') {
    let successCount = 0
    let failedCount = 0
    rows.forEach((row) => {
      try {
        const target = DerivationStore.get(row.derivationId)
        if (!target) { failedCount++; return }
        // 复用已有台账资产或新建草稿
        const list = variableStore.variableList || []
        let asset = list.find((v) => v.derivationId === target.id || v.midloanFeatureId === target.id)
        if (!asset) {
          asset = VariableDraftStore.addDraft({ ...row, derivationId: target.id })
        }
        const rec = DerivationStore.register(target.id, {
          ...derivationRegisterPatch(row),
          featureId: asset.id
        })
        if (rec) {
          successCount++
        } else {
          failedCount++
        }
      } catch (err) {
        failedCount++
      }
    })
    bulkImportVisible.value = false
    selectedDerivationIds.value = []
    if (successCount > 0) {
      Message.success(`批量注册成功 ${successCount} 条${failedCount > 0 ? `，失败 ${failedCount} 条` : ''}`)
    } else {
      Message.error('批量注册失败')
    }
    refreshDerivations()
    fetchVariableList()
    return
  }

  // standalone 模式：批量导入需求
  let successCount = 0
  let failedCount = 0
  rows.forEach((row) => {
    try {
      DerivationStore.create(row, '批量导入')
      successCount++
    } catch (err) {
      failedCount++
    }
  })
  bulkImportVisible.value = false
  if (successCount > 0) {
    Message.success(`成功导入 ${successCount} 条${failedCount > 0 ? `，失败 ${failedCount} 条` : ''}`)
  } else {
    Message.error('导入失败')
  }
  // 刷新列表（如有）
  fetchVariableList()
}
function onDerivationCreated(payloads) {
  if (!payloads || !payloads.length) {
    Message.warning('没有可提交的数据')
    return
  }
  let successCount = 0
  let failedCount = 0
  payloads.forEach((payload) => {
    try {
      DerivationStore.create(payload, '小李')
      successCount++
    } catch (err) {
      failedCount++
    }
  })
  derivationCreateVisible.value = false
  if (successCount > 0) {
    Message.success(`成功创建 ${successCount} 条需求${failedCount > 0 ? `，失败 ${failedCount} 条` : ''}`)
  } else {
    Message.error('创建失败')
  }
  refreshDerivations()
}

// 跳转需求详情页（路由 /variable-management/requirement/:id）
function goDerivationDetail(record) {
  router.push({ name: 'DerivationDetail', params: { id: record.id } })
}

// ============ 需求驳回 ============
const rejectModalVisible = ref(false)
const rejectTarget = ref(null)
const rejectForm = reactive({ reason: '' })

function openRejectModal(record) {
  rejectTarget.value = record
  rejectForm.reason = ''
  rejectModalVisible.value = true
}

function confirmReject() {
  if (!rejectTarget.value) return
  if (!rejectForm.reason.trim()) {
    Message.warning('请填写驳回原因')
    return
  }
  const rec = DerivationStore.reject(rejectTarget.value.id, rejectForm.reason.trim())
  if (rec) {
    Message.success(`需求 ${rec.id} 已驳回`)
    rejectModalVisible.value = false
    refreshDerivations()
  } else {
    Message.error('驳回失败，仅需求受理状态的需求可驳回')
  }
}

// 进入页面时初始化需求列表
refreshDerivations()
</script>

<style scoped>
.variable-management-page {
  padding: 16px;
  background-color: var(--subapp-bg-secondary);
  min-height: 100vh;
}

.page-header {
  margin-bottom: 16px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.global-search {
  flex: 1;
  min-width: 280px;
  max-width: 480px;
  margin: 0 16px;
}

.page-content {
  max-width: 1400px;
  margin: 0 auto;
}

.stats-row {
  margin-bottom: 16px;
}

.stat-card {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.stat-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-number {
  font-size: 32px;
  font-weight: 600;
  color: var(--subapp-text-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: var(--subapp-text-tertiary);
}

.filter-card {
  margin-bottom: 16px;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--color-border-2, #e5e6eb);
}

.table-card {
  margin-bottom: 16px;
}

.batch-toolbar {
  width: 100%;
  justify-content: space-between;
  margin-bottom: 16px;
}

.batch-hint {
  color: var(--color-text-3);
}

.batch-modal-alert {
  margin-bottom: 12px;
}

/* ========== 批量操作栏（用户反馈：移到表格上方）============ */
.batch-action-bar {
  margin-bottom: 12px;
  padding: 12px 16px;
  background: var(--color-primary-light-1, #e8f3ff);
  border: 1px solid var(--color-primary-light-3, #bedaff);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(22, 93, 255, 0.08);
}
/* 上方栏的特殊样式（无 sticky）*/
.batch-action-bar-top {
  position: relative;
}
.batch-count {
  font-size: 14px;
  color: var(--color-text-1, #1d2129);
}
.batch-count strong {
  color: var(--color-primary, #165dff);
  font-size: 16px;
  margin: 0 4px;
}
.batch-status-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

/* 视图模式 Segmented 控件 */
.view-mode-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 20px 0 16px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid var(--color-border-2);
}

.view-mode-hint {
  font-size: 12px;
  color: #86909c;
}

/* 效果列样式 */
.effect-number {
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  color: #1d2129;
  margin-right: 6px;
}

.effect-badge {
  display: inline-block;
  padding: 1px 6px;
  font-size: 11px;
  border-radius: 3px;
  font-weight: 500;
}

.effect-strong {
  background: #fff1f0;
  color: #f53f3f;
}

.effect-medium {
  background: #fff7e8;
  color: #ff7d00;
}

.effect-weak {
  background: #e6fffb;
  color: #0fc6c2;
}

.effect-low {
  background: #f2f3f5;
  color: #86909c;
}

/* 提升度 */
.lift {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.lift-up {
  color: #00b42a;
}

.lift-down {
  color: #f53f3f;
}

/* 成本列样式 */
.cost-highlight {
  font-weight: 600;
  color: #f53f3f;
  font-variant-numeric: tabular-nums;
}

.cost-zero {
  color: #c9cdd4;
}

/* 贷中行为 11 状态机分布概览 */
.midloan-overview-card {
  margin-bottom: 16px;
}
.mo-cell {
  padding: 12px 16px;
  border-radius: 6px;
  text-align: center;
  background: var(--color-fill-2, #f7f8fa);
}
.mo-num {
  font-size: 22px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  margin-bottom: 4px;
}
.mo-label {
  font-size: 12px;
  color: var(--color-text-3, #86909c);
}
.mo-total    .mo-num { color: #165dff; }
.mo-online   .mo-num { color: #00b42a; }
.mo-syncing  .mo-num { color: #0fc6c2; }
.mo-developing .mo-num { color: #722ed1; }
.mo-failed   .mo-num { color: #f53f3f; }

/* 风险特征 Tab */
.risk-feature-tabs {
  margin-bottom: 16px;
}
.derivation-card {
  margin-top: 0;
}
.derivation-toolbar {
  width: 100%;
  justify-content: space-between;
  margin-bottom: 12px;
}
.derivation-tip {
  color: var(--color-text-2, #4e5969);
  font-size: 13px;
}
.derivation-filter {
  margin-bottom: 12px;
}
.placeholder {
  color: var(--color-text-4, #c9cdd4);
}

/* 离线分析/API调用状态列辅助样式 */
.status-cell-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.status-done {
  color: var(--color-green-6, #00b42a);
  font-size: 12px;
}
.status-pending {
  color: var(--color-text-4, #c9cdd4);
  font-size: 12px;
}

.detail-status-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 12px;
  background: var(--color-fill-1, #f7f8fa);
  border-radius: 6px;
}
.detail-status-name {
  font-weight: 600;
  font-size: 15px;
  color: var(--color-text-1);
}
.detail-status-id {
  color: var(--color-text-4);
  font-size: 13px;
  margin-left: auto;
  font-family: monospace;
}
.detail-card {
  margin-bottom: 12px;
}
.detail-card :deep(.arco-card-body) {
  padding: 12px 16px;
}
.attachment-meta {
  color: var(--color-text-4);
  font-size: 12px;
  margin-left: 4px;
}
</style>
