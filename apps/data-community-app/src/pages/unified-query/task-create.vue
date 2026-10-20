<template>
  <PageContainer size="wide" :with-bg="false" class="uq-task-create">
    <PageHeader
      :title="isEdit ? '编辑定时任务' : '创建定时任务'"
      :sub-title="isEdit
        ? `正在编辑「${editingTaskName}」· 脚本目录 · SQL 校验 · 依赖解析 · 调度配置 · DQC 质量校验`
        : '脚本目录 · SQL 编辑校验 · 依赖解析 · 调度配置 · DQC 质量校验'"
      show-back
      @back="router.back()"
    />

    <div class="uq-body">
      <!-- ═══ 左侧:脚本目录 / 数据库导航(与脚本页打通) ═══ -->
      <div class="uq-sidebar">
        <a-tabs v-model:active-key="sidebarTab" size="mini" type="rounded" class="uq-sidebar__tabs">
          <!-- 脚本目录树 -->
          <a-tab-pane key="scripts" title="脚本目录">
            <div class="uq-sidebar__header">
              <a-input-search
                v-model="keyword"
                size="small"
                placeholder="搜索脚本名称 / SQL"
                allow-clear
              />
            </div>
            <a-tree
              v-if="treeData.length"
              class="uq-tree"
              block-node
              default-expand-all
              :data="treeData"
              @select="onTreeSelect"
            >
              <template #title="node">
                <span class="uq-tree-node">
                  <icon-folder v-if="!node.raw" class="uq-tree-node__icon" />
                  <icon-file v-else class="uq-tree-node__icon" />
                  <span class="uq-tree-node__text">{{ node.title }}</span>
                  <DataSourceBadge v-if="node.raw" :datasource="node.raw.datasource" />
                </span>
              </template>
            </a-tree>
            <a-empty v-else description="没有匹配的脚本" />
          </a-tab-pane>

          <!-- 数据库导航树 -->
          <a-tab-pane key="database" title="数据库导航">
            <a-tree
              class="uq-tree"
              block-node
              default-expand-all
              :data="dbTreeData"
              @select="onDbTreeSelect"
            >
              <template #title="node">
                <span class="uq-tree-node">
                  <icon-storage v-if="node.kind === 'datasource'" class="uq-tree-node__icon" />
                  <icon-folder v-else-if="node.kind === 'cluster' || node.kind === 'database'" class="uq-tree-node__icon" />
                  <icon-file v-else class="uq-tree-node__icon" />
                  <span class="uq-tree-node__text">{{ node.title }}</span>
                  <a-tag v-if="node.comment" size="small" color="gray">{{ node.comment }}</a-tag>
                </span>
              </template>
            </a-tree>
          </a-tab-pane>
        </a-tabs>

        <!-- 选中表后展示字段元数据 -->
        <div v-if="selectedTable" class="uq-sidebar__meta">
          <div class="uq-sidebar__meta-title">
            <span>{{ selectedTable.tableName }}</span>
            <a-tag size="small">{{ selectedTable.comment }}</a-tag>
          </div>
          <a-table
            :columns="metaColumns"
            :data="metaRows"
            :pagination="false"
            size="mini"
            :scroll="{ y: 180 }"
          />
          <a-button size="mini" type="text" long @click="insertTableSql">插入 INSERT 模板</a-button>
        </div>
      </div>

      <!-- ═══ 右侧:SQL 编辑 + 任务配置(折叠面板式,参考 DataLeap) ═══ -->
      <div class="uq-main">
        <!-- 基本信息(始终展开) -->
        <div class="uq-cfg-row">
          <a-form :model="form" layout="inline">
            <a-form-item label="任务名称" field="name" required>
              <a-input v-model="form.name" placeholder="请输入任务名称" style="width: 180px" />
            </a-form-item>
            <a-form-item label="数据源" field="datasource" required>
              <a-select v-model="form.datasource" style="width: 130px" @change="onDatasourceChange">
                <a-option value="doris" label="Doris (OLAP)" />
                <a-option value="hive" label="Hive (离线)" />
              </a-select>
            </a-form-item>
            <a-form-item label="关联脚本">
              <a-input v-model="form.scriptName" placeholder="选填" style="width: 140px" />
            </a-form-item>
            <a-form-item label="资源组">
              <a-select v-model="form.resourceGroup" style="width: 150px" placeholder="选择资源组">
                <a-option
                  v-for="rg in RESOURCE_GROUPS"
                  :key="rg.id"
                  :value="rg.id"
                  :label="`${rg.name} (${rg.maxConcurrency}并发)`"
                />
              </a-select>
            </a-form-item>
            <a-form-item label="优先级">
              <a-radio-group v-model="form.priority" type="button" size="small">
                <a-radio value="high">高</a-radio>
                <a-radio value="medium">中</a-radio>
                <a-radio value="low">低</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-form>
        </div>

        <!-- 折叠面板:参考 DataLeap/DataWorks 分步配置 -->
        <a-collapse v-model:active-key="activeSteps" expand-icon-position="right" :bordered="false" class="uq-steps">
          <!-- 步骤1: SQL 语句 -->
          <a-collapse-panel key="sql" class="uq-step-panel">
            <template #header>
              <div class="uq-step-header">
                <span class="uq-step-num" :class="{ 'is-done': stepCompletion.sql }">1</span>
                <span class="uq-step-title">SQL 语句</span>
                <a-tag v-if="stepCompletion.sql" size="small" color="green">已完成</a-tag>
                <a-tag v-else size="small" color="gray">待填写</a-tag>
              </div>
            </template>

            <div class="uq-step-body">
              <a-alert type="info" style="margin-bottom: 8px">
                定时调度语句必须是 <b>INSERT</b> 或 <b>CREATE TABLE</b> 语句,不支持纯 SELECT 查询。
              </a-alert>
              <SqlEditor
                ref="sqlEditorRef"
                v-model="form.sql"
                :datasource="form.datasource"
                height="220px"
              />
              <!-- 预检查按钮(参考 DataWorks 合并校验) -->
              <div class="uq-precheck-bar">
                <a-button size="small" type="primary" :loading="preChecking" @click="handlePreCheck">
                  <template #icon><icon-check /></template>
                  预检查(类型 + 语法 + 依赖)
                </a-button>
                <a-button size="small" @click="handleSqlTypeCheck">仅校验类型</a-button>
                <a-button size="small" @click="handleSyntaxCheck">仅语法检查</a-button>
                <!-- 预检查汇总结果 -->
                <div v-if="preCheckSummary" class="uq-precheck-summary" :class="preCheckSummary.allPassed ? 'is-ok' : 'is-err'">
                  <icon-check-circle v-if="preCheckSummary.allPassed" />
                  <icon-close-circle v-else />
                  <span>类型:{{ preCheckSummary.typeCheck ? '✓' : '✗' }}</span>
                  <span>语法:{{ preCheckSummary.syntaxCheck ? '✓' : '✗' }}</span>
                  <span>依赖:{{ preCheckSummary.depCount }} 项</span>
                </div>
              </div>
              <!-- 校验结果 -->
              <div v-if="sqlTypeResult" class="uq-check-result" :class="sqlTypeResult.valid ? 'is-ok' : 'is-err'">
                <icon-check-circle v-if="sqlTypeResult.valid" />
                <icon-close-circle v-else />
                <span>{{ sqlTypeResult.message }}</span>
                <a-tag v-if="sqlTypeResult.type !== 'UNKNOWN'" size="small" :color="sqlTypeResult.valid ? 'green' : 'red'">
                  {{ sqlTypeResult.type }}
                </a-tag>
              </div>
              <div v-if="syntaxResult" class="uq-check-result" :class="syntaxResult.passed ? 'is-ok' : 'is-err'">
                <icon-check-circle v-if="syntaxResult.passed" />
                <icon-close-circle v-else />
                <span>{{ syntaxResult.passed ? '语法检查通过' : '语法检查未通过' }}</span>
              </div>
              <div v-if="syntaxResult && syntaxResult.errors.length" class="uq-syntax-list">
                <div v-for="e in syntaxResult.errors" :key="e" class="uq-syntax-line is-error">
                  <icon-close-circle /> {{ e }}
                </div>
              </div>
              <div v-if="syntaxResult && syntaxResult.warnings.length" class="uq-syntax-list">
                <div v-for="w in syntaxResult.warnings" :key="w" class="uq-syntax-line is-warn">
                  <icon-exclamation-circle /> {{ w }}
                </div>
              </div>
            </div>
          </a-collapse-panel>

          <!-- 步骤2: 依赖解析 -->
          <a-collapse-panel key="deps" class="uq-step-panel">
            <template #header>
              <div class="uq-step-header">
                <span class="uq-step-num" :class="{ 'is-done': stepCompletion.deps }">2</span>
                <span class="uq-step-title">依赖解析</span>
                <a-tag v-if="dependencies.length > 0" size="small" color="green">{{ dependencies.length }} 项依赖</a-tag>
                <a-tag v-if="autoParsed" size="small" color="arcoblue">自动解析</a-tag>
                <a-tag v-else size="small" color="gray">待解析</a-tag>
              </div>
            </template>

            <div class="uq-step-body">
              <div class="uq-step-toolbar">
                <a-button size="mini" @click="handleParseDeps">
                  <template #icon><icon-refresh /></template>
                  重新解析
                </a-button>
                <a-tooltip content="SQL 变更后自动解析依赖(防抖 500ms)">
                  <a-switch v-model="autoParseEnabled" size="small" />
                </a-tooltip>
                <span class="uq-auto-hint">自动解析</span>
              </div>
              <a-alert v-if="dependencies.length === 0" type="warning" style="margin-bottom: 8px">
                尚未解析依赖,请编辑 SQL 后点击「重新解析」或开启自动解析
              </a-alert>
              <template v-else>
                <!-- 表级依赖 -->
                <div v-if="tableDeps.length" class="uq-dep-group">
                  <span class="uq-dep-group__label">
                    <a-tag color="arcoblue" size="small">表级依赖</a-tag>
                    <span class="uq-dep-group__count">{{ tableDeps.length }}</span>
                  </span>
                </div>
                <a-table
                  v-if="tableDeps.length"
                  :columns="depColumns"
                  :data="tableDeps"
                  :pagination="false"
                  row-key="id"
                  size="small"
                  style="margin-bottom: 12px"
                >
                  <template #source="{ record }">
                    <a-tag :color="depSourceColor[record.source as DependencySource]">{{ depSourceLabel[record.source as DependencySource] }}</a-tag>
                  </template>
                  <template #type="{ record }">{{ depTypeLabel[record.type] }}</template>
                </a-table>
                <!-- 任务级依赖 -->
                <div v-if="taskDeps.length" class="uq-dep-group">
                  <span class="uq-dep-group__label">
                    <a-tag color="orangered" size="small">任务级依赖</a-tag>
                    <span class="uq-dep-group__count">{{ taskDeps.length }}</span>
                  </span>
                </div>
                <a-table
                  v-if="taskDeps.length"
                  :columns="depColumns"
                  :data="taskDeps"
                  :pagination="false"
                  row-key="id"
                  size="small"
                >
                  <template #source="{ record }">
                    <a-tag :color="depSourceColor[record.source as DependencySource]">{{ depSourceLabel[record.source as DependencySource] }}</a-tag>
                  </template>
                  <template #type="{ record }">{{ depTypeLabel[record.type] }}</template>
                </a-table>
              </template>
              <div class="uq-dep-add">
                <a-input v-model="newDepName" placeholder="依赖名称(如:上游任务 T1001)" size="small" style="width: 200px" />
                <a-select v-model="newDepCategory" size="small" style="width: 110px">
                  <a-option value="table" label="表级依赖" />
                  <a-option value="task" label="任务级依赖" />
                </a-select>
                <a-select v-model="newDepSource" size="small" style="width: 100px">
                  <a-option value="upstream" label="上游" />
                  <a-option value="schedule" label="定时" />
                </a-select>
                <a-button size="small" type="outline" @click="addManualDep">添加</a-button>
              </div>
            </div>
          </a-collapse-panel>

          <!-- 步骤3: 调度配置 -->
          <a-collapse-panel key="schedule" class="uq-step-panel">
            <template #header>
              <div class="uq-step-header">
                <span class="uq-step-num is-done">3</span>
                <span class="uq-step-title">调度配置</span>
                <span class="uq-schedule-display">{{ scheduleDisplay }}</span>
                <span class="uq-cron-tag">Cron: {{ cronExpression }}</span>
              </div>
            </template>

            <div class="uq-step-body">
              <a-form :model="form.scheduleConfig" layout="inline">
                <a-form-item label="频率" field="type" required>
                  <a-radio-group v-model="form.scheduleConfig.type" type="button" size="small">
                    <a-radio value="daily">每日</a-radio>
                    <a-radio value="weekly">每周</a-radio>
                    <a-radio value="monthly">每月</a-radio>
                  </a-radio-group>
                </a-form-item>

                <!-- 每日 -->
                <a-form-item v-if="form.scheduleConfig.type === 'daily'" label="时间">
                  <a-time-picker v-model="dailyTimeModel" format="HH:mm" size="small" style="width: 120px" />
                </a-form-item>

                <!-- 每周 -->
                <a-form-item v-if="form.scheduleConfig.type === 'weekly'" label="星期">
                  <a-select v-model="form.scheduleConfig.weeklyDay" size="small" style="width: 90px">
                    <a-option :value="1" label="周一" />
                    <a-option :value="2" label="周二" />
                    <a-option :value="3" label="周三" />
                    <a-option :value="4" label="周四" />
                    <a-option :value="5" label="周五" />
                    <a-option :value="6" label="周六" />
                    <a-option :value="7" label="周日" />
                  </a-select>
                </a-form-item>
                <a-form-item v-if="form.scheduleConfig.type === 'weekly'" label="时间">
                  <a-time-picker v-model="weeklyTimeModel" format="HH:mm" size="small" style="width: 120px" />
                </a-form-item>

                <!-- 每月 -->
                <a-form-item v-if="form.scheduleConfig.type === 'monthly'" label="日期">
                  <a-input-number v-model="form.scheduleConfig.monthlyDay" :min="1" :max="31" size="small" style="width: 80px" />
                </a-form-item>
                <a-form-item v-if="form.scheduleConfig.type === 'monthly'" label="时间">
                  <a-time-picker v-model="monthlyTimeModel" format="HH:mm" size="small" style="width: 120px" />
                </a-form-item>
              </a-form>

              <!-- 调度下次运行预览(参考 DataWorks 调度预览) -->
              <div class="uq-schedule-preview">
                <span class="uq-schedule-preview__title">未来运行时间预览</span>
                <div class="uq-schedule-preview__list">
                  <div v-for="(t, i) in nextRuns" :key="i" class="uq-schedule-preview__item">
                    <icon-clock-circle />
                    <span>{{ t }}</span>
                  </div>
                </div>
              </div>
            </div>
          </a-collapse-panel>

          <!-- 步骤4: DQC 数据质量校验 -->
          <a-collapse-panel key="dqc" class="uq-step-panel">
            <template #header>
              <div class="uq-step-header">
                <span class="uq-step-num" :class="{ 'is-done': stepCompletion.dqc }">4</span>
                <span class="uq-step-title">DQC 数据质量校验</span>
                <a-switch v-model="form.dqc.enabled" size="small" @click.stop />
                <a-tag v-if="form.dqc.enabled && form.dqc.rules.length > 0" size="small" color="green">{{ form.dqc.rules.length }} 条规则</a-tag>
              </div>
            </template>

            <div class="uq-step-body">
              <template v-if="form.dqc.enabled">
                <div style="margin-bottom: 8px">
                  <a-button size="mini" type="primary" @click="addDqcRule">
                    <template #icon><icon-plus /></template>
                    添加规则
                  </a-button>
                </div>
                <a-table
                  :columns="dqcColumns"
                  :data="form.dqc.rules"
                  :pagination="false"
                  row-key="id"
                  size="small"
                >
                  <template #name="{ record }">
                    <a-input v-model="record.name" placeholder="规则名称" size="small" />
                  </template>
                  <template #type="{ record }">
                    <a-select
                      v-model="record.type"
                      size="small"
                      style="width: 110px"
                      @change="(v: string) => onDqcTypeChange(record, v)"
                    >
                      <a-option
                        v-for="(label, key) in DQC_RULE_TYPE_LABELS"
                        :key="key"
                        :value="key"
                        :label="label"
                      />
                    </a-select>
                  </template>
                  <template #sql="{ record }">
                    <a-textarea
                      v-model="record.sql"
                      :auto-size="{ minRows: 1, maxRows: 3 }"
                      placeholder="DQC 校验 SQL"
                      size="small"
                    />
                  </template>
                  <template #threshold="{ record }">
                    <a-input v-model="record.threshold" placeholder=">= 0.95" size="small" style="width: 90px" />
                  </template>
                  <template #action="{ record }">
                    <a-select v-model="record.action" size="small" style="width: 80px">
                      <a-option value="block" label="阻断" />
                      <a-option value="warn" label="告警" />
                    </a-select>
                  </template>
                  <template #operations="{ rowIndex }">
                    <a-link status="danger" @click="removeDqcRule(rowIndex)">删除</a-link>
                  </template>
                </a-table>
              </template>
              <a-empty v-else description="未启用 DQC 质量校验" />
            </div>
          </a-collapse-panel>

          <!-- 步骤5: 通知告警与高级设置 -->
          <a-collapse-panel key="notify" class="uq-step-panel">
            <template #header>
              <div class="uq-step-header">
                <span class="uq-step-num is-done">5</span>
                <span class="uq-step-title">通知告警与高级设置</span>
              </div>
            </template>

            <div class="uq-step-body">
              <a-row :gutter="24">
                <a-col :span="12">
                  <div class="uq-sub-title">通知告警</div>
                  <a-form :model="form.notify" layout="inline" size="small">
                    <a-form-item label="成功通知">
                      <a-switch v-model="form.notify.notifyOnSuccess" size="small" />
                      <a-select
                        v-if="form.notify.notifyOnSuccess"
                        v-model="form.notify.successChannel"
                        size="small"
                        style="width: 100px; margin-left: 4px"
                        placeholder="选择渠道"
                      >
                        <a-option value="dingtalk" label="钉钉" />
                        <a-option value="feishu" label="飞书" />
                        <a-option value="email" label="邮件" />
                        <a-option value="webhook" label="Webhook" />
                        <a-option value="sms" label="短信" />
                        <a-option value="wechat" label="企业微信" />
                      </a-select>
                    </a-form-item>
                    <a-form-item label="失败通知">
                      <a-switch v-model="form.notify.notifyOnFailed" size="small" />
                      <a-select v-if="form.notify.notifyOnFailed" v-model="form.notify.failedChannel" size="small" style="width: 100px; margin-left: 4px">
                        <a-option value="dingtalk" label="钉钉" />
                        <a-option value="feishu" label="飞书" />
                        <a-option value="email" label="邮件" />
                        <a-option value="webhook" label="Webhook" />
                        <a-option value="sms" label="短信" />
                        <a-option value="wechat" label="企业微信" />
                      </a-select>
                    </a-form-item>
                  </a-form>
                  <!-- 超时设置 -->
                  <div class="uq-timeout-config">
                    <a-form :model="form.notify" layout="inline" size="small">
                      <a-form-item label="超时阈值(分)">
                        <a-input-number
                          v-model="form.notify.timeoutMinutes"
                          :min="0"
                          :max="1440"
                          size="small"
                          style="width: 80px"
                          placeholder="0=不启用"
                        />
                      </a-form-item>
                      <a-form-item label="连续失败升级(次)">
                        <a-input-number
                          v-model="form.notify.maxConsecutiveFailures"
                          :min="0"
                          :max="20"
                          size="small"
                          style="width: 70px"
                        />
                      </a-form-item>
                    </a-form>
                    <a-alert v-if="form.notify.timeoutMinutes > 0" type="info" style="margin-top: 4px">
                      任务执行超过 {{ form.notify.timeoutMinutes }} 分钟将触发超时告警通知
                    </a-alert>
                  </div>
                </a-col>
                <a-col :span="12">
                  <div class="uq-sub-title">高级设置</div>
                  <a-form :model="form.advanced" layout="inline" size="small">
                    <a-form-item label="重试">
                      <a-input-number v-model="form.advanced.retryCount" :min="0" :max="10" size="small" style="width: 60px" />
                    </a-form-item>
                    <a-form-item label="间隔(分)">
                      <a-input-number v-model="form.advanced.retryInterval" :min="1" :max="60" size="small" style="width: 60px" />
                    </a-form-item>
                    <a-form-item label="跳过堆积">
                      <a-switch v-model="form.advanced.skipBacklog" size="small" />
                    </a-form-item>
                  </a-form>
                </a-col>
              </a-row>
            </div>
          </a-collapse-panel>
        </a-collapse>

        <!-- 提交按钮 -->
        <div class="uq-submit-bar">
          <a-space size="medium">
            <a-button @click="router.back()">取消</a-button>
            <a-button type="primary" status="success" :loading="submitting" @click="handleSubmit">
              <template #icon><icon-check /></template>
              {{ isEdit ? '保存修改' : '创建定时任务' }}
            </a-button>
          </a-space>
        </div>
      </div>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
/**
 * 创建定时任务 - 独立页面(与脚本页打通)
 *
 * 参考 DataLeap / DataWorks 交互模式:
 * 1. 折叠面板分步配置,步骤完成状态实时指示
 * 2. SQL 变更后自动解析依赖(防抖 500ms)
 * 3. 预检查合并:类型 + 语法 + 依赖一次完成
 * 4. 调度下次运行时间预览
 * 5. 资源组 + 优先级分配
 */
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import PageContainer from '@/components-dca/common/PageContainer.vue'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import SqlEditor from '@/components-dca/unified-query/SqlEditor.vue'
import DataSourceBadge from '@/components-dca/unified-query/DataSourceBadge.vue'
import { useUqTaskStore } from '@/stores-dca/unified-query/task'
import { useUqScriptStore } from '@/stores-dca/unified-query/script'
import { DATABASE_TREE, getTableColumns } from '@/mock/unified-query/database'
import {
  validateTaskSqlType,
  checkTaskSyntax,
  buildDependencies,
  buildCron,
  buildScheduleDisplay,
  buildNextRuns,
  DQC_RULE_TYPE_LABELS,
  DQC_RULE_TEMPLATES,
  RESOURCE_GROUPS
} from '@/mock/unified-query/sql-parser'
import type {
  DataSourceKey,
  DbTreeNode,
  Dependency,
  DependencySource,
  DependencyCategory,
  DqcConfig,
  DqcRule,
  NotifyConfig,
  AdvancedConfig,
  ScheduleConfig,
  TableColumn,
  TaskPriority
} from '@/mock/unified-query/types'
import type { SqlTypeValidation, SyntaxCheckResult } from '@/mock/unified-query/sql-parser'

const router = useRouter()
const route = useRoute()
const taskStore = useUqTaskStore()
const scriptStore = useUqScriptStore()

/**
 * 编辑模式判定:route.query.taskId 有值则进入编辑模式
 * 编辑模式与创建模式共用同一份 form + 折叠面板,只是初始值来源不同
 */
const editingTaskId = computed<string | null>(() => {
  const v = route.query.taskId
  return typeof v === 'string' && v ? v : null
})
const isEdit = computed(() => editingTaskId.value !== null)
const editingTaskName = ref('')

/** 把 scheduleConfig 各分支的 time 字段同步给 time-picker 桥接 ref */
function bindScheduleConfigToForm(sc: typeof form.scheduleConfig) {
  dailyTimeModel.value = sc.dailyTime || '02:00'
  weeklyTimeModel.value = sc.weeklyTime || '07:00'
  monthlyTimeModel.value = sc.monthlyTime || '08:00'
}

/** 编辑模式:从 store 反向回填 form */
function loadEditingTask() {
  if (!editingTaskId.value) return
  const t = taskStore.getById(editingTaskId.value)
  if (!t) {
    Message.error('未找到对应任务,可能已被删除')
    router.replace({ name: 'unified-query-tasks' })
    return
  }
  editingTaskName.value = t.name
  form.name = t.name
  form.datasource = t.datasource
  form.scriptName = t.scriptName
  form.sql = t.sql ?? ''
  form.resourceGroup = t.resourceGroup ?? 'rg-default'
  form.priority = t.priority ?? 'medium'
  // 通知 / 高级(深拷贝)
  form.notify = {
    notifyOnSuccess: t.notify.notifyOnSuccess,
    notifyOnFailed: t.notify.notifyOnFailed,
    successChannel: t.notify.successChannel,
    failedChannel: t.notify.failedChannel,
    timeoutMinutes: t.notify.timeoutMinutes,
    maxConsecutiveFailures: t.notify.maxConsecutiveFailures
  }
  form.advanced = { ...t.advanced }
  // 调度详细(可能为空:旧数据没有 scheduleConfig 字段)
  if (t.scheduleConfig) {
    form.scheduleConfig = { ...t.scheduleConfig }
    bindScheduleConfigToForm(t.scheduleConfig)
  }
  // 依赖
  dependencies.value = t.dependencies ? [...t.dependencies] : []
  autoParsed.value = dependencies.value.length > 0
  // DQC
  form.dqc = t.dqc ? { ...t.dqc, rules: [...t.dqc.rules] } : { enabled: false, rules: [] }
}

/** 创建模式:form 用默认初始值即可 */
function resetToCreateDefaults() {
  editingTaskName.value = ''
  form.name = ''
  form.scriptName = ''
  form.sql = ''
  form.resourceGroup = 'rg-default'
  form.priority = 'medium'
  form.datasource = 'doris'
  form.scheduleConfig = {
    type: 'daily',
    dailyTime: '02:00',
    weeklyDay: 1,
    weeklyTime: '07:00',
    monthlyDay: 1,
    monthlyTime: '08:00'
  } as typeof form.scheduleConfig
  form.notify = {
    notifyOnSuccess: false,
    notifyOnFailed: true,
    successChannel: 'dingtalk',
    failedChannel: 'dingtalk',
    timeoutMinutes: 0,
    maxConsecutiveFailures: 3
  }
  form.advanced = { retryCount: 3, retryInterval: 5, skipBacklog: false }
  form.dqc = { enabled: false, rules: [] }
  dependencies.value = []
  autoParsed.value = false
  bindScheduleConfigToForm(form.scheduleConfig)
}

onMounted(() => {
  if (isEdit.value) loadEditingTask()
  else resetToCreateDefaults()
})
// query 变化时重新判定(在同路由内点别的「配置」)
watch(() => route.query.taskId, () => {
  if (isEdit.value) loadEditingTask()
  else resetToCreateDefaults()
})

/* ── 左侧侧边栏(与脚本页打通) ── */
const sidebarTab = ref<'scripts' | 'database'>('scripts')
const keyword = ref('')

/** 脚本目录树(复用 scriptStore) */
const treeData = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return scriptStore.tree
  const hit = (s: { name: string; sql: string }) =>
    s.name.toLowerCase().includes(kw) || s.sql.toLowerCase().includes(kw)
  return scriptStore.tree
    .map(root => ({
      ...root,
      children: root.children
        .map(node => {
          if ('raw' in node) return hit(node.raw) ? node : null
          const kept = (node.children ?? []).filter(c => 'raw' in c && hit(c.raw))
          return kept.length ? { ...node, children: kept } : null
        })
        .filter(Boolean)
    }))
    .filter(root => root.children.length)
})

/** 点击脚本树节点 → 加载 SQL 到编辑器 */
function onTreeSelect(keys: (string | number)[]) {
  if (!keys.length) return
  const key = String(keys[0])
  if (!key.startsWith('script:')) return
  const script = scriptStore.getById(key.slice(7))
  if (script) {
    form.sql = script.sql
    form.datasource = script.datasource
    form.scriptName = script.name
    Message.info(`已加载脚本「${script.name}」`)
  }
}

/* ── 数据库导航树 ── */
const dbTreeData = computed(() => DATABASE_TREE as unknown as any[])
const selectedTable = ref<{ tableName: string; comment: string } | null>(null)
const metaColumns = [
  { title: '字段名', dataIndex: 'name', width: 120 },
  { title: '类型', dataIndex: 'type', width: 100 },
  { title: '注释', dataIndex: 'comment' }
]
const metaRows = computed<TableColumn[]>(() =>
  selectedTable.value ? getTableColumns(selectedTable.value.tableName) : []
)

function onDbTreeSelect(keys: (string | number)[]) {
  if (!keys.length) return
  const key = String(keys[0])
  const node = findDbNode(DATABASE_TREE, key)
  if (node?.kind === 'table' && node.tableName) {
    selectedTable.value = { tableName: node.tableName, comment: node.comment ?? '' }
  } else {
    selectedTable.value = null
  }
}

function findDbNode(nodes: DbTreeNode[], key: string): DbTreeNode | null {
  for (const n of nodes) {
    if (n.key === key) return n
    if (n.children) {
      const hit = findDbNode(n.children, key)
      if (hit) return hit
    }
  }
  return null
}

/** 点击表后插入 INSERT 模板(适合定时任务场景) */
function insertTableSql() {
  if (!selectedTable.value) return
  const tn = selectedTable.value.tableName
  const tpl = `INSERT OVERWRITE TABLE ${tn}\nSELECT *\nFROM   ods_source_${tn}\nWHERE  dt = '2026-09-01';`
  form.sql = tpl
  Message.success(`已插入 ${tn} INSERT 模板`)
}

/* ── 表单数据 ── */
const submitting = ref(false)

const form = reactive({
  name: '',
  datasource: 'doris' as DataSourceKey,
  scriptName: '',
  sql: '',
  resourceGroup: 'rg-default',
  priority: 'medium' as TaskPriority,
  scheduleConfig: {
    type: 'daily' as ScheduleConfig['type'],
    dailyTime: '02:00',
    weeklyDay: 1,
    weeklyTime: '07:00',
    monthlyDay: 1,
    monthlyTime: '08:00'
  } as ScheduleConfig,
  notify: {
    notifyOnSuccess: false,
    notifyOnFailed: true,
    successChannel: 'dingtalk' as const,
    failedChannel: 'dingtalk' as const,
    timeoutMinutes: 0,
    maxConsecutiveFailures: 3
  } as NotifyConfig,
  advanced: {
    retryCount: 3,
    retryInterval: 5,
    skipBacklog: false
  } as AdvancedConfig,
  dqc: {
    enabled: false,
    rules: [] as DqcRule[]
  } as DqcConfig
})

/* ── 折叠面板控制 ── */
const activeSteps = ref<string[]>(['sql', 'schedule'])

/* ── 校验结果 ── */
const sqlTypeResult = ref<SqlTypeValidation | null>(null)
const syntaxResult = ref<SyntaxCheckResult | null>(null)
const dependencies = ref<Dependency[]>([])

/* ── 自动解析依赖 ── */
const autoParseEnabled = ref(true)
const autoParsed = ref(false)
let parseTimer: ReturnType<typeof setTimeout> | null = null

/* ── 手动添加依赖 ── */
const newDepName = ref('')
const newDepSource = ref<DependencySource>('upstream')
const newDepCategory = ref<DependencyCategory>('task')

/* ── 依赖按类别分组 ── */
const tableDeps = computed(() => dependencies.value.filter(d => d.category === 'table'))
const taskDeps = computed(() => dependencies.value.filter(d => d.category === 'task'))

/* ── TimePicker 桥接 ── */
const dailyTimeModel = ref('02:00')
const weeklyTimeModel = ref('07:00')
const monthlyTimeModel = ref('08:00')

watch(dailyTimeModel, (v) => { if (v) form.scheduleConfig.dailyTime = v })
watch(weeklyTimeModel, (v) => { if (v) form.scheduleConfig.weeklyTime = v })
watch(monthlyTimeModel, (v) => { if (v) form.scheduleConfig.monthlyTime = v })

/* ── 调度预览 ── */
const cronExpression = computed(() => buildCron(form.scheduleConfig))
const scheduleDisplay = computed(() => buildScheduleDisplay(form.scheduleConfig))
const nextRuns = computed(() => buildNextRuns(form.scheduleConfig, 5))

/* ── 步骤完成状态 ── */
const stepCompletion = computed(() => ({
  sql: form.sql.trim() !== '' && (sqlTypeResult.value?.valid ?? false),
  deps: dependencies.value.length > 0,
  schedule: true,
  dqc: !form.dqc.enabled || form.dqc.rules.length > 0
}))

/* ── 自动解析依赖:SQL 变更后防抖解析 ── */
watch(() => form.sql, (sql) => {
  if (!autoParseEnabled.value || !sql.trim()) return
  if (parseTimer) clearTimeout(parseTimer)
  parseTimer = setTimeout(() => {
    const typeCheck = validateTaskSqlType(sql)
    if (typeCheck.valid) {
      dependencies.value = buildDependencies(sql)
      autoParsed.value = true
    }
  }, 500)
}, { immediate: false })

/* ── 依赖表列 ── */
const depColumns = [
  { title: '依赖名称', dataIndex: 'name', width: 180 },
  { title: '来源', dataIndex: 'source', slotName: 'source', width: 90 },
  { title: '类型', dataIndex: 'type', slotName: 'type', width: 70 },
  { title: '说明', dataIndex: 'detail' }
]
const depSourceLabel: Record<DependencySource, string> = {
  upstream: '上游',
  self: '任务本身',
  schedule: '定时'
}
const depSourceColor: Record<DependencySource, string> = {
  upstream: 'blue',
  self: 'green',
  schedule: 'orange'
}
const depTypeLabel: Record<string, string> = {
  table: '数据表',
  script: '脚本',
  task: '任务'
}

/* ── DQC 表列 ── */
const dqcColumns = [
  { title: '规则名称', dataIndex: 'name', slotName: 'name', width: 120 },
  { title: '类型', dataIndex: 'type', slotName: 'type', width: 110 },
  { title: '校验 SQL', dataIndex: 'sql', slotName: 'sql' },
  { title: '阈值', dataIndex: 'threshold', slotName: 'threshold', width: 90 },
  { title: '动作', dataIndex: 'action', slotName: 'action', width: 80 },
  { title: '操作', dataIndex: 'operations', slotName: 'operations', width: 50 }
]

let dqcSeq = 0

function addDqcRule() {
  dqcSeq += 1
  form.dqc.rules.push({
    id: `dqc-${Date.now()}-${dqcSeq}`,
    name: `DQC规则${dqcSeq}`,
    type: 'not_null',
    sql: DQC_RULE_TEMPLATES.not_null,
    action: 'block'
  })
}

function onDqcTypeChange(record: DqcRule, type: string) {
  record.sql = DQC_RULE_TEMPLATES[type] ?? ''
}

function removeDqcRule(index: number) {
  form.dqc.rules.splice(index, 1)
}

/* ── SQL 校验 ── */

function handleSqlTypeCheck() {
  if (!form.sql.trim()) return Message.warning('请先输入 SQL 语句')
  sqlTypeResult.value = validateTaskSqlType(form.sql)
  if (sqlTypeResult.value.valid) Message.success(sqlTypeResult.value.message)
  else Message.warning(sqlTypeResult.value.message)
}

function handleSyntaxCheck() {
  if (!form.sql.trim()) return Message.warning('请先输入 SQL 语句')
  syntaxResult.value = checkTaskSyntax(form.sql)
  if (syntaxResult.value.passed) Message.success('语法检查通过')
  else Message.error(`语法检查发现 ${syntaxResult.value.errors.length} 个错误`)
}

/* ── 预检查:合并类型 + 语法 + 依赖(参考 DataWorks) ── */
const preChecking = ref(false)
const preCheckSummary = ref<{ typeCheck: boolean; syntaxCheck: boolean; depCount: number; allPassed: boolean } | null>(null)

function handlePreCheck() {
  if (!form.sql.trim()) return Message.warning('请先输入 SQL 语句')
  preChecking.value = true

  // 模拟异步预检查
  setTimeout(() => {
    const typeResult = validateTaskSqlType(form.sql)
    sqlTypeResult.value = typeResult

    const syntax = checkTaskSyntax(form.sql)
    syntaxResult.value = syntax

    let depCount = dependencies.value.length
    if (typeResult.valid) {
      dependencies.value = buildDependencies(form.sql)
      autoParsed.value = true
      depCount = dependencies.value.length
    }

    preCheckSummary.value = {
      typeCheck: typeResult.valid,
      syntaxCheck: syntax.passed,
      depCount,
      allPassed: typeResult.valid && syntax.passed
    }

    preChecking.value = false

    if (preCheckSummary.value.allPassed) {
      Message.success(`预检查通过:类型✓ 语法✓ 依赖 ${depCount} 项`)
    } else {
      Message.error('预检查未通过,请修正 SQL 后重试')
    }
  }, 600)
}

function handleParseDeps() {
  if (!form.sql.trim()) return Message.warning('请先输入 SQL 语句')
  const typeCheck = validateTaskSqlType(form.sql)
  if (!typeCheck.valid) return Message.warning('请先确保 SQL 为 INSERT 或 CREATE TABLE 语句')
  dependencies.value = buildDependencies(form.sql)
  autoParsed.value = false
  if (dependencies.value.length > 0) Message.success(`解析到 ${dependencies.value.length} 个依赖`)
  else Message.info('未解析到依赖')
}

function addManualDep() {
  if (!newDepName.value.trim()) return Message.warning('请输入依赖名称')
  dependencies.value.push({
    id: `dep-manual-${Date.now()}`,
    name: newDepName.value.trim(),
    source: newDepSource.value,
    type: newDepCategory.value === 'table' ? 'table' : 'task',
    category: newDepCategory.value,
    detail: newDepCategory.value === 'table' ? '手动添加的表级依赖' : '手动添加的任务级依赖'
  })
  newDepName.value = ''
  Message.success('依赖已添加')
}

/* ── 数据源切换 ── */
function onDatasourceChange(v: string | number | Record<string, any> | (string | number | Record<string, any>)[]) {
  form.datasource = v as DataSourceKey
}

/* ── 提交 ── */

function handleSubmit() {
  if (!form.name.trim()) return Message.warning('请填写任务名称')
  if (!form.sql.trim()) return Message.warning('请输入 SQL 语句')

  const typeCheck = validateTaskSqlType(form.sql)
  if (!typeCheck.valid) return Message.error(typeCheck.message)

  submitting.value = true

  if (dependencies.value.length === 0) {
    dependencies.value = buildDependencies(form.sql)
  }

  const scheduleStr = buildScheduleDisplay(form.scheduleConfig)
  const cron = buildCron(form.scheduleConfig)

  if (isEdit.value && editingTaskId.value) {
    taskStore.updateConfig(editingTaskId.value, {
      name: form.name,
      schedule: scheduleStr,
      cronExpression: cron,
      notify: { ...form.notify },
      advanced: { ...form.advanced },
      scheduleConfig: { ...form.scheduleConfig },
      dependencies: [...dependencies.value],
      dqc: form.dqc.enabled ? { ...form.dqc } : undefined,
      sql: form.sql,
      resourceGroup: form.resourceGroup,
      priority: form.priority
    })
    submitting.value = false
    Message.success('任务配置已更新')
    router.push({ name: 'unified-query-tasks' })
    return
  }

  taskStore.createTask({
    name: form.name,
    datasource: form.datasource,
    scriptName: form.scriptName || form.name,
    schedule: scheduleStr,
    cronExpression: cron,
    notify: { ...form.notify },
    advanced: { ...form.advanced },
    scheduleConfig: { ...form.scheduleConfig },
    dependencies: [...dependencies.value],
    dqc: form.dqc.enabled ? { ...form.dqc } : undefined,
    sql: form.sql,
    resourceGroup: form.resourceGroup,
    priority: form.priority
  })

  submitting.value = false
  Message.success('定时任务创建成功')
  router.push({ name: 'unified-query-tasks' })
}
</script>

<style lang="scss" scoped>
.uq-task-create {
  padding-bottom: 24px;
}

.uq-body {
  display: flex;
  gap: 12px;
  margin: 0 24px;
}

/* ── 左侧侧边栏 ── */
.uq-sidebar {
  flex: none;
  width: 260px;
  padding: 8px 12px 12px;
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  background: var(--color-bg-2);
  max-height: calc(100vh - 120px);
  overflow: auto;

  &__tabs {
    margin-bottom: 8px;
  }

  &__header {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  &__meta {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--color-border-2);
  }

  &__meta-title {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
    font-weight: 600;
    font-size: 13px;
  }
}

.uq-tree-node {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 100%;

  &__icon {
    color: var(--color-text-3);
  }

  &__text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

/* ── 右侧主区域 ── */
.uq-main {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  background: var(--color-bg-2);
  overflow: auto;
  max-height: calc(100vh - 120px);
  padding-bottom: 16px;
}

.uq-cfg-row {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-2);
}

/* ── 折叠面板步骤 ── */
.uq-steps {
  border: none !important;

  :deep(.arco-collapse-item) {
    border-bottom: 1px solid var(--color-border-2);

    &:last-child {
      border-bottom: none;
    }
  }

  :deep(.arco-collapse-item-header) {
    padding: 10px 16px;
    height: auto;
    min-height: 40px;
  }

  :deep(.arco-collapse-item-content) {
    padding: 0 16px 12px;
    background: var(--color-bg-2);
  }
}

.uq-step-header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.uq-step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-fill-3);
  color: var(--color-text-3);
  font-size: 12px;
  font-weight: 600;
  flex: none;

  &.is-done {
    background: rgb(var(--success-6));
    color: #fff;
  }
}

.uq-step-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1);
}

.uq-step-body {
  padding-top: 4px;
}

.uq-step-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.uq-auto-hint {
  font-size: 12px;
  color: var(--color-text-3);
}

/* ── 预检查栏 ── */
.uq-precheck-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.uq-precheck-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;

  &.is-ok {
    background: rgb(var(--success-1));
    color: rgb(var(--success-6));
  }

  &.is-err {
    background: rgb(var(--danger-1));
    color: rgb(var(--danger-6));
  }
}

.uq-sub-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-1);
  margin-bottom: 8px;
}

.uq-check-result {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  margin-top: 8px;
  border-radius: 4px;
  font-size: 12px;

  &.is-ok {
    background: rgb(var(--success-1));
    color: rgb(var(--success-6));
  }

  &.is-err {
    background: rgb(var(--danger-1));
    color: rgb(var(--danger-6));
  }
}

.uq-syntax-list {
  margin-top: 4px;
}

.uq-syntax-line {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 12px;
  font-size: 12px;

  &.is-error {
    color: rgb(var(--danger-6));
  }

  &.is-warn {
    color: rgb(var(--warning-6));
  }
}

.uq-schedule-display {
  font-size: 13px;
  font-weight: 600;
  color: rgb(var(--success-6));
}

.uq-cron-tag {
  font-size: 12px;
  color: var(--color-text-3);
  font-family: monospace;
}

/* ── 调度预览 ── */
.uq-schedule-preview {
  margin-top: 12px;
  padding: 10px 12px;
  background: var(--color-fill-1);
  border-radius: 4px;

  &__title {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-2);
    margin-bottom: 6px;
    display: block;
  }

  &__list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: var(--color-bg-2);
    border: 1px solid var(--color-border-2);
    border-radius: 4px;
    font-size: 12px;
    color: var(--color-text-2);
    font-family: monospace;

    .arco-icon {
      color: rgb(var(--success-6));
      font-size: 14px;
    }
  }
}

.uq-dep-add {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.uq-dep-group {
  margin-bottom: 6px;

  &__label {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__count {
    font-size: 12px;
    color: var(--color-text-3);
  }
}

.uq-timeout-config {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--color-border-2);
}

.uq-submit-bar {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px 0;
}
</style>
