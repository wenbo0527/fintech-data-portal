<template>
  <!-- @prd: asset-listing.detail -->
  <div class="asset-detail-page">
    <a-page-header
      :title="assetData?.assetName || '资产详情'"
      :subtitle="assetData?.description || '数据资产详情'"
      :show-back="true"
      @back="onBack"
    >
      <template #extra>
        <a-space>
          <a-button
            v-if="assetData && canOnShelf(assetData)"
            type="primary"
            size="small"
            status="success"
            @click="onShelf(assetData)"
          >
            上架
          </a-button>
          <a-button
            v-if="assetData && canOffShelf(assetData)"
            type="primary"
            size="small"
            status="warning"
            @click="offShelf(assetData)"
          >
            下架
          </a-button>
          <a-button type="outline" size="small" @click="syncOne" :disabled="!assetData">
            <template #icon><IconSync /></template>
            同步
          </a-button>
          <a-button type="outline" size="small" @click="toggleFavorite">
            <template #icon>
              <IconStar :fill="isFavorite ? '#ffb400' : 'none'" />
            </template>
            {{ isFavorite ? '已收藏' : '收藏' }}
          </a-button>
          <a-button type="primary" size="small" @click="applyPermission">
            <template #icon><IconSafe /></template>
            申请权限
          </a-button>
        </a-space>
      </template>
    </a-page-header>

    <div v-if="assetData" class="asset-content">
      <!-- 基本信息 -->
      <a-card title="基本信息" :bordered="false" class="info-card">
        <a-descriptions :column="3">
          <a-descriptions-item label="资产名称">{{ assetData.assetName }}</a-descriptions-item>
          <a-descriptions-item label="集群类型">
            <a-tag color="arcoblue">{{ assetData.clusterType }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="集群环境">
            {{ assetData.clusterEnv === 'compute' ? '计算集群' : '分析集群' }}
          </a-descriptions-item>
          <a-descriptions-item label="HIVE 库">{{ assetData.hiveDatabase }}</a-descriptions-item>
          <a-descriptions-item label="HIVE 表名" :span="2">
            <span class="hive-table">{{ assetData.hiveDatabase }}.{{ assetData.hiveTableName }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="业务域">{{ assetData.category }}</a-descriptions-item>
          <a-descriptions-item label="负责人">{{ assetData.owner }}</a-descriptions-item>
          <a-descriptions-item label="发布人">{{ assetData.publisher }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="statusColor[assetData.status]">
              {{ statusLabel[assetData.status] }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="注册时间">{{ formatDateTime(assetData.registerTime) }}</a-descriptions-item>
          <a-descriptions-item label="上架时间">{{ formatDateTime(assetData.onShelfTime) }}</a-descriptions-item>
          <a-descriptions-item label="下架时间">{{ formatDateTime(assetData.offShelfTime) }}</a-descriptions-item>
          <a-descriptions-item label="最近同步" :span="2">{{ formatDateTime(assetData.lastSyncTime) }}</a-descriptions-item>
          <a-descriptions-item label="描述" :span="3">{{ assetData.description || '—' }}</a-descriptions-item>
        </a-descriptions>
      </a-card>

      <!-- 详情 Tab -->
      <a-card :bordered="false" class="tab-card">
        <a-tabs v-model:active-key="activeTab">
          <!-- 表结构 / 字段信息 -->
          <a-tab-pane v-if="fields.length" key="structure" title="表结构">
            <a-table
              :data="fields"
              :pagination="false"
              :bordered="false"
              :scroll="{ x: '100%' }"
            >
              <template #columns>
                <a-table-column title="字段名" data-index="name">
                  <template #cell="{ record }">
                    <span :class="{ 'relation-field': isRelationField(record.name) }">
                      {{ record.name }}
                    </span>
                  </template>
                </a-table-column>
                <a-table-column title="类型" data-index="type" :width="160" />
                <a-table-column title="是否主键" :width="100">
                  <template #cell="{ record }">
                    <a-tag v-if="record.isPrimary" color="arcoblue" size="small">主键</a-tag>
                    <span v-else>-</span>
                  </template>
                </a-table-column>
                <a-table-column title="描述" data-index="description" />
              </template>
            </a-table>
          </a-tab-pane>

          <!-- 数据预览 -->
          <a-tab-pane v-if="fields.length" key="preview" title="数据预览">
            <a-table
              :data="sampleData"
              :pagination="false"
              :bordered="false"
              :scroll="{ x: '100%' }"
            >
              <template #columns>
                <a-table-column
                  v-for="f in fields"
                  :key="f.name"
                  :title="f.name"
                  :data-index="f.name"
                />
              </template>
            </a-table>
          </a-tab-pane>

          <!-- 关联关系 -->
          <a-tab-pane key="relations" title="关联关系">
            <div class="relation-page">
              <a-row :gutter="16" class="relation-overview">
                <a-col :span="6">
                  <a-card>
                    <a-statistic title="关联表" :value="relations.length" :value-style="{ color: '#165DFF' }">
                      <template #suffix><span style="font-size: 13px; color: #86909c">张表</span></template>
                    </a-statistic>
                  </a-card>
                </a-col>
                <a-col :span="6">
                  <a-card>
                    <a-statistic title="关联 API" :value="5" :value-style="{ color: '#722ED1' }">
                      <template #suffix><span style="font-size: 13px; color: #86909c">个</span></template>
                    </a-statistic>
                  </a-card>
                </a-col>
                <a-col :span="6">
                  <a-card>
                    <a-statistic title="关联指标" :value="8" :value-style="{ color: '#00B42A' }">
                      <template #suffix><span style="font-size: 13px; color: #86909c">个</span></template>
                    </a-statistic>
                  </a-card>
                </a-col>
                <a-col :span="6">
                  <a-card>
                    <a-statistic title="关联报表" :value="3" :value-style="{ color: '#FA8C16' }">
                      <template #suffix><span style="font-size: 13px; color: #86909c">张</span></template>
                    </a-statistic>
                  </a-card>
                </a-col>
              </a-row>

              <a-table
                :data="relations"
                :pagination="false"
                :bordered="false"
                row-key="id"
              >
                <template #columns>
                  <a-table-column title="关联类型" :width="120">
                    <template #cell="{ record }">
                      <a-tag :color="relationTypeColor[record.relationType]">{{ record.relationType }}</a-tag>
                    </template>
                  </a-table-column>
                  <a-table-column title="关联对象" :width="220">
                    <template #cell="{ record }">
                      <span class="link-name" @click="gotoRelationAsset(record)">{{ record.targetName }}</span>
                      <div class="hive-path" v-if="record.targetHivePath">{{ record.targetHivePath }}</div>
                    </template>
                  </a-table-column>
                  <a-table-column title="所属系统/模块" :width="140">
                    <template #cell="{ record }">
                      <a-tag size="small">{{ record.targetSystem }}</a-tag>
                    </template>
                  </a-table-column>
                  <a-table-column title="关联字段" :width="180">
                    <template #cell="{ record }">
                      <span class="relation-field">{{ record.relationField }}</span>
                    </template>
                  </a-table-column>
                  <a-table-column title="关联类型" :width="100">
                    <template #cell="{ record }">
                      <a-tag>{{ record.cardinality }}</a-tag>
                    </template>
                  </a-table-column>
                  <a-table-column title="关联说明">
                    <template #cell="{ record }">
                      {{ record.description }}
                    </template>
                  </a-table-column>
                </template>
              </a-table>
            </div>
          </a-tab-pane>

          <!-- 血缘关系 -->
          <a-tab-pane key="lineage" title="血缘关系">
            <div class="lineage-page">
              <!-- 概览统计 -->
              <a-row :gutter="16" class="lineage-overview">
                <a-col :span="8">
                  <a-statistic title="上游表" :value="upstreamLineage.length" :value-style="{ color: '#165DFF' }" />
                </a-col>
                <a-col :span="8">
                  <a-statistic title="下游表" :value="downstreamLineage.length" :value-style="{ color: '#00B42A' }" />
                </a-col>
                <a-col :span="8">
                  <a-statistic title="血缘深度" :value="lineageDepth" :value-style="{ color: '#722ED1' }">
                    <template #suffix><span style="font-size: 13px; color: #86909c">层</span></template>
                  </a-statistic>
                </a-col>
              </a-row>

              <a-tabs default-active-key="list" type="rounded">
                <a-tab-pane key="list" title="列表视图">
                  <div class="lineage-section">
                    <div class="lineage-section-title upstream">
                      <IconArrowUp style="color: #165dff" />
                      <span>上游资产（数据来源）</span>
                      <a-tag color="arcoblue" size="small">{{ upstreamLineage.length }} 条</a-tag>
                    </div>
                    <a-table :data="upstreamLineage" :pagination="false" :bordered="false">
                      <template #columns>
                        <a-table-column title="表名" :width="220">
                          <template #cell="{ record }">
                            <span class="link-name" @click="gotoLineageAsset(record)">{{ record.name }}</span>
                            <div class="hive-path">{{ record.hivePath }}</div>
                          </template>
                        </a-table-column>
                        <a-table-column title="所属系统" :width="160">
                          <template #cell="{ record }">
                            <a-tag size="small">{{ record.system }}</a-tag>
                          </template>
                        </a-table-column>
                        <a-table-column title="关系类型" :width="100">
                          <template #cell="{ record }">
                            <a-tag :color="relationTypeColor[record.relationType]">{{ record.relationType }}</a-tag>
                          </template>
                        </a-table-column>
                        <a-table-column title="负责人" data-index="owner" :width="100" />
                        <a-table-column title="转换说明" data-index="description" />
                      </template>
                    </a-table>
                  </div>

                  <a-divider />

                  <div class="lineage-section">
                    <div class="lineage-section-title downstream">
                      <IconArrowDown style="color: #00b42a" />
                      <span>下游资产（数据去向）</span>
                      <a-tag color="arcoblue" size="small">{{ downstreamLineage.length }} 条</a-tag>
                    </div>
                    <a-table :data="downstreamLineage" :pagination="false" :bordered="false">
                      <template #columns>
                        <a-table-column title="表名" :width="220">
                          <template #cell="{ record }">
                            <span class="link-name" @click="gotoLineageAsset(record)">{{ record.name }}</span>
                            <div class="hive-path">{{ record.hivePath }}</div>
                          </template>
                        </a-table-column>
                        <a-table-column title="所属系统" :width="160">
                          <template #cell="{ record }">
                            <a-tag size="small">{{ record.system }}</a-tag>
                          </template>
                        </a-table-column>
                        <a-table-column title="关系类型" :width="100">
                          <template #cell="{ record }">
                            <a-tag :color="relationTypeColor[record.relationType]">{{ record.relationType }}</a-tag>
                          </template>
                        </a-table-column>
                        <a-table-column title="负责人" data-index="owner" :width="100" />
                        <a-table-column title="转换说明" data-index="description" />
                      </template>
                    </a-table>
                  </div>
                </a-tab-pane>

                <a-tab-pane key="graph" title="可视化视图">
                  <a-card>
                    <LineageGraph
                      v-if="assetData"
                      :table-name="assetData.assetName"
                      :layers="1"
                      style="height: 600px; width: 100%"
                    />
                  </a-card>
                </a-tab-pane>
              </a-tabs>
            </div>
          </a-tab-pane>

          <!-- 使用说明 -->
          <a-tab-pane key="usage" title="使用说明">
            <div class="usage-page">
              <!-- Story 1-1：表级使用说明 -->
              <div class="usage-collapse-card">
                <div class="usage-collapse-header" @click="toggleUsage('table')">
                  <span class="usage-collapse-title">
                    <span class="usage-emoji">📄</span>
                    <span>表级使用说明</span>
                  </span>
                  <a-button type="text" size="mini">
                    {{ usageExpanded.table ? '−' : '+' }}
                  </a-button>
                </div>
                <div v-show="usageExpanded.table" class="usage-collapse-body">
                  <div class="usage-row">
                    <span class="usage-label">使用说明：</span>
                    <span>{{ assetData?.description || '暂无表级使用说明' }}</span>
                  </div>
                  <div class="usage-row">
                    <span class="usage-label">常用场景：</span>
                    <ul class="usage-list">
                      <li v-for="(s, i) in tableUsageScenarios" :key="i">{{ s }}</li>
                    </ul>
                  </div>
                  <div class="usage-row">
                    <span class="usage-label">更新周期：</span>
                    <a-tag color="arcoblue">{{ tableUsageCycle }}</a-tag>
                  </div>
                </div>
              </div>

              <!-- Story 1-2 / 字段级使用说明 合并：字段说明 + 版本切换 -->
              <div class="usage-collapse-card">
                <div class="usage-collapse-header" @click="toggleUsage('fields')">
                  <span class="usage-collapse-title">
                    <span class="usage-emoji">📋</span>
                    <span>字段级使用说明与变更对比</span>
                    <a-tag v-if="fieldChangeRows.length" size="small" color="orange">
                      {{ fieldChangeRows.length }} 项变更
                    </a-tag>
                  </span>
                  <a-button type="text" size="mini">
                    {{ usageExpanded.fields ? '−' : '+' }}
                  </a-button>
                </div>
                <div v-show="usageExpanded.fields" class="usage-collapse-body">
                  <div class="usage-fields-toolbar">
                    <a-radio-group v-model="fieldViewMode" type="button" size="small">
                      <a-radio-button value="desc">字段说明（V1 vs V2）</a-radio-button>
                      <a-radio-button value="compare">变更对比</a-radio-button>
                      <a-radio-button value="diff">V1 vs V2 全量对比</a-radio-button>
                    </a-radio-group>
                    <!-- 版本下拉已合并到表格列头里 -->
                    <div v-if="fieldViewMode === 'diff'" class="diff-stats-summary">
                      <a-tag color="green" size="small">+{{ diffStats.added }} 新增</a-tag>
                      <a-tag color="red" size="small">-{{ diffStats.removed }} 删除</a-tag>
                      <a-tag color="blue" size="small">{{ diffStats.modified }} 修改</a-tag>
                      <a-tag color="gray" size="small">{{ diffStats.unchanged }} 未变</a-tag>
                    </div>
                  </div>

                  <!-- 模式 1：字段说明（默认对比最新两版：字段名 / 版本1 / 版本2） -->
                  <template v-if="fieldViewMode === 'desc'">
                    <a-table
                      v-if="mergedFieldDiff.length"
                      :data="mergedFieldDiff"
                      :columns="descTableColumns"
                      :pagination="false"
                      :bordered="true"
                      row-key="key"
                      size="small"
                      class="diff-table"
                      :row-class="(record: any) => `diff-row diff-row-${(record as DiffFieldRow).status}`"
                    >
                      <template #versionA-header>
                        <div class="diff-col-header">
                          <span class="diff-col-version-label">版本1</span>
                          <a-select
                            v-model="compareVersionA"
                            size="small"
                            class="diff-col-version-select"
                            @change="handleVersionAChange"
                          >
                            <a-option v-for="v in fieldVersions" :key="v" :value="v">
                              {{ v }}
                            </a-option>
                          </a-select>
                        </div>
                      </template>
                      <template #versionB-header>
                        <div class="diff-col-header">
                          <span class="diff-col-version-label">版本2</span>
                          <a-select
                            v-model="compareVersionB"
                            size="small"
                            class="diff-col-version-select"
                          >
                            <a-option
                              v-for="v in fieldVersions.filter(v => v !== compareVersionA)"
                              :key="v"
                              :value="v"
                            >
                              {{ v }}
                            </a-option>
                          </a-select>
                        </div>
                      </template>
                    </a-table>
                    <a-empty v-else description="暂无字段可展示" />
                  </template>

                  <!-- 模式 2：变更对比 -->
                  <template v-else-if="fieldViewMode === 'compare'">
                    <div class="usage-fields-compare-header">
                      对比版本：
                      <a-tag color="arcoblue" size="small">{{ currentComparePair.newer }}</a-tag>
                      <span style="margin: 0 6px; color: #86909c">vs</span>
                      <a-tag color="gray" size="small">{{ currentComparePair.older }}</a-tag>
                    </div>
                    <a-table
                      v-if="fieldChangeRows.length"
                      :data="fieldChangeRows"
                      :columns="compareTableColumns"
                      :pagination="false"
                      :bordered="false"
                      row-key="name"
                      size="small"
                    >
                      <template #compareOld-header>
                        <div class="diff-col-header">
                          <span class="diff-col-version-label">旧版本</span>
                          <a-select
                            v-model="compareVersionA"
                            size="small"
                            class="diff-col-version-select"
                            @change="handleVersionAChange"
                          >
                            <a-option v-for="v in fieldVersions" :key="v" :value="v">
                              {{ v }}
                            </a-option>
                          </a-select>
                        </div>
                      </template>
                      <template #compareNew-header>
                        <div class="diff-col-header">
                          <span class="diff-col-version-label">新版本</span>
                          <a-select
                            v-model="compareVersionB"
                            size="small"
                            class="diff-col-version-select"
                          >
                            <a-option
                              v-for="v in fieldVersions.filter(v => v !== compareVersionA)"
                              :key="v"
                              :value="v"
                            >
                              {{ v }}
                            </a-option>
                          </a-select>
                        </div>
                      </template>
                    </a-table>
                    <a-empty v-else description="暂无字段变更记录" />
                  </template>

                  <!-- 模式 3：V1 vs V2 全量对比 (diff 视图) -->
                  <template v-else-if="fieldViewMode === 'diff'">
                    <div class="diff-vs-header">
                      <div class="diff-version-tag diff-version-left">
                        <span class="diff-arrow">⇐</span>
                        <a-tag color="gray" size="small">{{ currentComparePair.older }}（V1 / 旧版本）</a-tag>
                      </div>
                      <div class="diff-version-tag diff-version-right">
                        <a-tag color="arcoblue" size="small">{{ currentComparePair.newer }}（V2 / 新版本）</a-tag>
                        <span class="diff-arrow">⇒</span>
                      </div>
                    </div>

                    <a-table
                      v-if="mergedFieldDiff.length"
                      :data="mergedFieldDiff"
                      :columns="diffTableColumns"
                      :pagination="false"
                      :bordered="true"
                      row-key="key"
                      size="small"
                      class="diff-table"
                      :row-class="(record: any) => `diff-row diff-row-${(record as DiffFieldRow).status}`"
                    >
                      <template #diffV1-header>
                        <div class="diff-col-header">
                          <span class="diff-col-version">V1</span>
                          <span class="diff-col-label">{{ currentComparePair.older }}</span>
                        </div>
                      </template>
                      <template #diffV2-header>
                        <div class="diff-col-header">
                          <span class="diff-col-version diff-col-version-new">V2</span>
                          <span class="diff-col-label">{{ currentComparePair.newer }}</span>
                        </div>
                      </template>
                    </a-table>
                    <a-empty v-else description="暂无字段可对比" />
                  </template>
                </div>
              </div>
            </div>

            <!-- Story 1-3：字段变更日志抽屉 -->
            <a-drawer
              :visible="changeLogDrawerVisible"
              :width="480"
              :footer="false"
              :mask-closable="true"
              unmount-on-close
              @cancel="closeChangeLogDrawer"
              @update:visible="v => (changeLogDrawerVisible = v)"
            >
              <template #title>
                <span>字段变更日志</span>
                <span v-if="changeLogDrawerField" style="margin-left: 8px; color: #165dff">
                  - {{ changeLogDrawerField }}
                </span>
              </template>
              <a-timeline>
                <a-timeline-item
                  v-for="(log, i) in changeLogTimeline"
                  :key="i"
                  :label="log.version"
                  :dot-color="changeTypeColor[log.changeType]"
                >
                  <div class="log-version">{{ log.version }} <span class="log-date">({{ log.changeDate }})</span></div>
                  <div class="log-row">变更人：{{ log.operator }}</div>
                  <div class="log-row">
                    变更类型：
                    <a-tag :color="changeTypeColor[log.changeType]" size="small">
                      {{ changeTypeLabel[log.changeType] }}
                    </a-tag>
                  </div>
                  <div v-if="log.oldValue" class="log-row">变更前：<span class="usage-old-value">{{ log.oldValue }}</span></div>
                  <div v-if="log.newValue" class="log-row">变更后：<span class="usage-new-value">{{ log.newValue }}</span></div>
                  <div v-if="log.description" class="log-row log-desc">{{ log.description }}</div>
                </a-timeline-item>
              </a-timeline>
            </a-drawer>
          </a-tab-pane>

          <!-- 加工逻辑 -->
          <a-tab-pane key="logic" title="加工逻辑">
            <div class="logic-content" style="white-space: pre-wrap; line-height: 1.6; color: var(--color-text-2)">
              {{ processingLogic }}
            </div>

            <a-divider v-if="sqlSnippet" />

            <div v-if="sqlSnippet" class="sql-section">
              <div style="font-size: 14px; font-weight: 500; margin-bottom: 12px">SQL 示例</div>
              <div class="sql-code-block">
                <pre><code>{{ sqlSnippet }}</code></pre>
              </div>
            </div>
          </a-tab-pane>

          <!-- 上下架记录 -->
          <a-tab-pane key="shelf-history" title="上下架记录">
            <a-table
              :data="shelfHistory"
              :pagination="false"
              :bordered="false"
            >
              <template #columns>
                <a-table-column title="动作" data-index="action" :width="120">
                  <template #cell="{ record }">
                    <a-tag :color="record.action === '上架' ? 'green' : record.action === '下架' ? 'orange' : 'gray'">
                      {{ record.action }}
                    </a-tag>
                  </template>
                </a-table-column>
                <a-table-column title="操作人" data-index="operator" :width="140" />
                <a-table-column title="操作时间" data-index="actionTime" :width="200">
                  <template #cell="{ record }">{{ formatDateTime(record.actionTime) }}</template>
                </a-table-column>
                <a-table-column title="备注" data-index="remark" />
              </template>
            </a-table>
          </a-tab-pane>

          <!-- 版本信息 -->
          <a-tab-pane key="versions" title="版本信息">
            <div class="version-detail-page">
              <a-table
                :data="versions"
                :pagination="false"
                :bordered="false"
                row-key="version"
                :expanded-row-keys="expandedVersionKeys"
                class="version-detail-table"
              >
                <template #columns>
                  <a-table-column title="版本号" data-index="version" :width="120">
                    <template #cell="{ record }">
                      <a-link @click="toggleVersionExpand((record as VersionItem).version)">
                        <span class="version-toggle">
                          {{ expandedVersionKeys.includes((record as VersionItem).version) ? '▼' : '▶' }}
                        </span>
                        <span style="margin-left: 6px;">{{ (record as VersionItem).version }}</span>
                      </a-link>
                    </template>
                  </a-table-column>
                  <a-table-column title="变更类型" :width="100">
                    <template #cell="{ record }">
                      <a-tag
                        v-if="(record as VersionItem).changeType"
                        size="small"
                        :color="changeTypeTagColor[(record as VersionItem).changeType!] || 'gray'"
                      >
                        {{ (record as VersionItem).changeType }}
                      </a-tag>
                    </template>
                  </a-table-column>
                  <a-table-column title="风险" :width="80">
                    <template #cell="{ record }">
                      <a-tag
                        v-if="(record as VersionItem).riskLevel"
                        size="small"
                        :color="riskLevelColor[(record as VersionItem).riskLevel!] || 'gray'"
                      >
                        {{ (record as VersionItem).riskLevel }}
                      </a-tag>
                    </template>
                  </a-table-column>
                  <a-table-column title="变更时间" data-index="createTime" :width="160">
                    <template #cell="{ record }">{{ formatDateTime(record.createTime) }}</template>
                  </a-table-column>
                  <a-table-column title="变更人" data-index="creator" :width="100" />
                  <a-table-column title="变更摘要" data-index="changeDescription">
                    <template #cell="{ record }">
                      <div class="version-summary-line">
                        <span>{{ (record as VersionItem).changeDescription }}</span>
                        <span v-if="(record as VersionItem).changeSummary" class="version-summary-tags">
                          <a-tag
                             v-if="(record as VersionItem).changeSummary?.added"
                             color="green" size="small"
                           >
                             +{{ (record as VersionItem).changeSummary!.added }}
                           </a-tag>
                           <a-tag
                             v-if="(record as VersionItem).changeSummary?.modified"
                             color="blue" size="small"
                           >
                             {{ (record as VersionItem).changeSummary!.modified }}改
                           </a-tag>
                           <a-tag
                             v-if="(record as VersionItem).changeSummary?.removed"
                             color="red" size="small"
                           >
                             -{{ (record as VersionItem).changeSummary!.removed }}
                           </a-tag>
                        </span>
                      </div>
                    </template>
                  </a-table-column>
                </template>

                <!-- 展开行：git 提交记录 -->
                <template #expanded-row="{ record }">
                  <div class="version-expanded-detail">
                    <div v-if="(record as VersionItem).gitRecords?.length" class="detail-block">
                      <div class="detail-block-title">
                        <span class="detail-icon">🔧</span>
                        Git 提交记录
                        <span class="git-record-count">
                          共 {{ (record as VersionItem).gitRecords!.length }} 次提交
                        </span>
                      </div>
                      <div class="git-list">
                        <div
                          v-for="(g, idx) in (record as VersionItem).gitRecords"
                          :key="g.hash"
                          class="git-item"
                        >
                          <div class="git-rail">
                            <span class="git-dot" />
                            <span v-if="idx !== (record as VersionItem).gitRecords!.length - 1" class="git-line" />
                          </div>
                          <div class="git-content">
                            <div class="git-header">
                              <a-tooltip :content="g.hash">
                                <code class="git-hash">{{ g.shortHash }}</code>
                              </a-tooltip>
                              <a-tag v-if="g.branch" size="small" color="arcoblue">
                                <template #icon><IconBranch /></template>
                                {{ g.branch }}
                              </a-tag>
                              <span class="git-message">{{ g.message }}</span>
                            </div>
                            <div class="git-meta">
                              <span class="git-author">
                                <IconUser class="git-meta-icon" />
                                {{ g.author }}
                              </span>
                              <span class="git-time">
                                <IconClockCircle class="git-meta-icon" />
                                {{ g.commitTime }}
                              </span>
                              <span v-if="g.filesChanged" class="git-files">
                                <IconFile class="git-meta-icon" />
                                {{ g.filesChanged }} 个文件
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div v-else class="detail-block-empty">
                      该版本暂无 Git 提交记录。
                    </div>
                  </div>
                </template>
              </a-table>
            </div>
          </a-tab-pane>
        </a-tabs>
      </a-card>
    </div>

    <div v-else class="empty-state">
      <a-empty description="未找到对应资产" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import {
  IconStar,
  IconSafe,
  IconSync,
  IconArrowUp,
  IconArrowDown,
  IconBranch,
  IconUser,
  IconClockCircle,
  IconFile
} from '@arco-design/web-vue/es/icon'
import { LineageGraph } from '@app/lineage-graph'
import { mockTables } from '@/mock-dca/data-map'
import { listingStore } from '@/mock-dca/listing-store'
import { formatDateTime } from '@/utils-dca/dateUtils'

// 关联/血缘关系类型颜色映射
const relationTypeColor: Record<string, string> = {
  '上游ETL': 'arcoblue',
  '下游聚合': 'green',
  '关联表': 'purple',
  '关联API': 'orange',
  '关联指标': 'cyan',
  '关联报表': 'pinkpurple'
}

type ShelfStatus = 'active' | 'onShelf' | 'offShelf'

interface AssetDetail {
  assetName: string
  description: string
  category: string
  owner: string
  publisher: string
  status: ShelfStatus
  registerTime: string
  onShelfTime?: string
  offShelfTime?: string
  clusterType: string
  clusterEnv: 'compute' | 'analysis'
  hiveDatabase: string
  hiveTableName: string
  lastSyncTime?: string
  recordType: 'table' | 'metric'
  fields: { name: string; type: string; description: string; isPrimary?: boolean }[]
}

interface ShelfHistoryItem {
  action: '上架' | '下架' | '编辑'
  operator: string
  actionTime: string
  remark?: string
}

interface VersionChangeRecord {
  type: 'added' | 'modified' | 'removed'
  fieldName: string
  oldValue?: string
  newValue?: string
}

interface ApprovalRecord {
  approver: string
  action: '通过' | '驳回'
  comment?: string
  actionTime: string
}

interface GitRecord {
  hash: string
  shortHash: string
  author: string
  authorEmail?: string
  commitTime: string
  message: string
  branch?: string
  filesChanged?: number
}

interface VersionItem {
  version: string
  createTime: string
  creator: string
  changeDescription: string
  // 详细信息
  changeType?: 'DDL' | '数据修复' | '加工逻辑' | '权限' | '上架发布' | '初始化'
  changeSummary?: { added: number; modified: number; removed: number; totalAfter: number }
  fieldChanges?: VersionChangeRecord[]
  upstreamImpact?: string[]
  downstreamImpact?: string[]
  sqlSnippet?: string
  approvals?: ApprovalRecord[]
  riskLevel?: '高' | '中' | '低'
  // Git 提交记录（按时间倒序）
  gitRecords?: GitRecord[]
}

const statusLabel: Record<ShelfStatus, string> = {
  active: '活跃',
  onShelf: '已上架',
  offShelf: '已下架'
}
const statusColor: Record<ShelfStatus, string> = {
  active: 'green',
  onShelf: 'green',
  offShelf: 'orange'
}

const route = useRoute()
const router = useRouter()

const assetData = ref<AssetDetail | null>(null)
const isFavorite = ref(false)
const activeTab = ref('structure')

// 默认字段模板（mockTables/metrics 本身没有 fields，按 HIVE 资产通用结构生成）
const defaultFields = (tableName: string) => {
  const cleaned = tableName.replace(/^t_/, '').replace(/^metric_/, '')
  return [
    { name: 'id', type: 'bigint', description: '主键 ID', isPrimary: true },
    { name: `${cleaned}_code`, type: 'string', description: '业务编码' },
    { name: 'create_time', type: 'timestamp', description: '创建时间' },
    { name: 'update_time', type: 'timestamp', description: '更新时间' },
    { name: 'owner', type: 'string', description: '负责人' },
    { name: 'status', type: 'string', description: '状态' },
    { name: 'description', type: 'string', description: '描述' }
  ]
}

const parseHivePath = (fullPath: string) => {
  if (!fullPath) return { database: 'default', tableName: fullPath || '' }
  const segs = fullPath.split('.')
  if (segs.length >= 3) return { database: segs[segs.length - 2], tableName: segs[segs.length - 1] }
  return { database: segs[0] || 'default', tableName: segs[segs.length - 1] }
}

const findAsset = (name: string): AssetDetail | null => {
  const decoded = decodeURIComponent(name)

  // 1. 查 mockTables
  const t = mockTables.find(x => x.tableName === decoded)
  if (t) {
    const parsed = parseHivePath(t.computeClusterTable)
    return {
      assetName: t.tableName,
      description: t.description,
      category: t.category,
      owner: t.owner,
      publisher: t.publisher,
      status: t.status,
      registerTime: t.registerTime,
      onShelfTime: t.onShelfTime,
      offShelfTime: t.offShelfTime,
      clusterType: 'HIVE',
      clusterEnv: 'compute',
      hiveDatabase: parsed.database,
      hiveTableName: parsed.tableName,
      lastSyncTime: t.onShelfTime,
      recordType: 'table',
      fields: defaultFields(t.tableName)
    }
  }

  // 2. 查 listingStore.metrics
  const m = listingStore.metrics.find(x => x.metricName === decoded || x.metricCode === decoded)
  if (m) {
    return {
      assetName: m.metricName,
      description: m.description,
      category: m.category,
      owner: m.owner,
      publisher: m.publisher,
      status: m.status,
      registerTime: m.registerTime,
      onShelfTime: m.onShelfTime,
      offShelfTime: m.offShelfTime,
      clusterType: 'HIVE',
      clusterEnv: 'analysis',
      hiveDatabase: `metric_${m.category}`,
      hiveTableName: m.metricCode,
      lastSyncTime: m.onShelfTime,
      recordType: 'metric',
      fields: [
        { name: 'metric_code', type: 'string', description: '指标编码', isPrimary: true },
        { name: 'metric_value', type: 'decimal(20,4)', description: '指标值' },
        { name: 'stat_date', type: 'string', description: '统计日期 (yyyy-MM-dd)' },
        { name: 'dim_key', type: 'string', description: '维度键' },
        { name: 'owner', type: 'string', description: '负责人' },
        { name: 'create_time', type: 'timestamp', description: '创建时间' }
      ]
    }
  }

  return null
}

const fields = computed(() => assetData.value?.fields || [])

const sampleData = computed(() => {
  const fs = fields.value
  if (!fs.length) return []
  return Array.from({ length: 3 }).map((_, i) => {
    const row: Record<string, string> = {}
    fs.forEach(f => {
      if (f.type.includes('timestamp') || f.name.includes('time')) {
        row[f.name] = '2026-07-21 10:00:00'
      } else if (f.type.includes('decimal') || f.type.includes('bigint') || f.type.includes('int')) {
        row[f.name] = String((i + 1) * 1000 + i)
      } else {
        row[f.name] = `${f.name}_${i + 1}`
      }
    })
    return row
  })
})

const shelfHistory = computed<ShelfHistoryItem[]>(() => {
  if (!assetData.value) return []
  const a = assetData.value
  const list: ShelfHistoryItem[] = []
  if (a.onShelfTime) {
    list.push({ action: '上架', operator: a.publisher, actionTime: a.onShelfTime, remark: '资产上架' })
  }
  if (a.offShelfTime) {
    list.push({ action: '下架', operator: a.owner, actionTime: a.offShelfTime, remark: '资产下架' })
  }
  if (a.registerTime) {
    list.push({ action: '编辑', operator: a.owner, actionTime: a.registerTime, remark: '资产注册' })
  }
  if (a.lastSyncTime) {
    list.push({ action: '编辑', operator: a.owner, actionTime: a.lastSyncTime, remark: '元数据同步' })
  }
  return list.sort((x, y) => (y.actionTime || '').localeCompare(x.actionTime || ''))
})

const versions = computed<VersionItem[]>(() => {
  if (!assetData.value) return []
  const a = assetData.value
  const snapshots = versionedFieldSnapshots
  const versionList = ['v2.4.0', 'v2.3.0', 'v2.2.0', 'v2.1.0']

  // 工具：根据两个版本的快照计算差异
  const calcDiff = (newer: string, older: string): VersionChangeRecord[] => {
    const newerFields = snapshots[newer] ?? []
    const olderFields = snapshots[older] ?? []
    const mapOlder = new Map(olderFields.map(f => [f.name, f]))
    const result: VersionChangeRecord[] = []
    newerFields.forEach(f => {
      const old = mapOlder.get(f.name)
      if (!old) {
        result.push({ type: 'added', fieldName: f.name, newValue: `${f.type} | ${f.description}` })
      } else if (old.type !== f.type || old.description !== f.description) {
        result.push({
          type: 'modified',
          fieldName: f.name,
          oldValue: `${old.type} | ${old.description}`,
          newValue: `${f.type} | ${f.description}`,
        })
      }
    })
    olderFields.forEach(f => {
      if (!newerFields.find(n => n.name === f.name)) {
        result.push({ type: 'removed', fieldName: f.name, oldValue: `${f.type} | ${f.description}` })
      }
    })
    return result
  }

  // 概要：根据 diff 计算 N 增 / M 改 / K 删
  const summary = (records: VersionChangeRecord[], totalAfter: number) => {
    let added = 0, modified = 0, removed = 0
    records.forEach(r => {
      if (r.type === 'added') added++
      else if (r.type === 'modified') modified++
      else removed++
    })
    return { added, modified, removed, totalAfter }
  }

  return [
    {
      version: versionList[0]!,  // v2.4.0（最新版，相对 v2.3.0 几乎没有变更）
      createTime: '2025-11-15 10:30',
      creator: '李雪',
      changeDescription: '字段说明文案更新，业务语义更清晰',
      changeType: '加工逻辑',
      riskLevel: '低',
      changeSummary: summary(calcDiff(versionList[0]!, versionList[1]!), snapshots[versionList[0]!]?.length ?? 0),
      fieldChanges: calcDiff(versionList[0]!, versionList[1]!),
      upstreamImpact: [],
      downstreamImpact: ['用户画像分析报表'],
      approvals: [
        { approver: '王伟（数据架构师）', action: '通过', comment: '说明文案更准确', actionTime: '2025-11-15 14:20' },
      ],
      gitRecords: [
        { hash: '8f3a1c2d9b4e5f6a7c8d9e0f1a2b3c4d5e6f7a8b', shortHash: '8f3a1c2', author: '李雪', authorEmail: 'lixue@example.com', commitTime: '2025-11-15 10:28', message: 'docs(user_dim): 优化 create_time / owner / status 字段描述文案', branch: 'main', filesChanged: 3 },
        { hash: '7e2b9c1d8a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d', shortHash: '7e2b9c1', author: '李雪', authorEmail: 'lixue@example.com', commitTime: '2025-11-14 18:12', message: 'refactor(user_dim): 字段说明文案统一标准化', branch: 'main', filesChanged: 2 },
      ],
    },
    {
      version: versionList[1]!,  // v2.3.0 - 类型调整
      createTime: '2025-10-08 16:42',
      creator: '张磊',
      changeDescription: '主键 ID 类型从 VARCHAR(32) 扩到 VARCHAR(64)，向下兼容',
      changeType: 'DDL',
      riskLevel: '中',
      changeSummary: summary(calcDiff(versionList[1]!, versionList[2]!), snapshots[versionList[1]!]?.length ?? 0),
      fieldChanges: calcDiff(versionList[1]!, versionList[2]!),
      upstreamImpact: ['ods.user_ods.user_id (上游表)'],
      downstreamImpact: ['用户分群计算逻辑', '画像宽表', 'CRM 同步任务'],
      sqlSnippet: `-- 主键扩位 DDL
ALTER TABLE dwd.user_dim
MODIFY COLUMN id VARCHAR(64)
COMMENT '主键 ID（兼容 32 位历史数据）';

-- 数据回填（历史 32 位 ID 前补 0 到 64 位）
INSERT OVERWRITE dwd.user_dim
SELECT
  LPAD(CAST(id AS STRING), 64, '0') AS id,
  name, email, status, update_time
FROM dwd.user_dim
WHERE LENGTH(CAST(id AS STRING)) <= 32;`,
      approvals: [
        { approver: '王伟（数据架构师）', action: '驳回', comment: '请补回填 SQL 与回滚方案', actionTime: '2025-10-09 09:15' },
        { approver: '王伟（数据架构师）', action: '通过', comment: '已补充完整方案', actionTime: '2025-10-09 17:30' },
        { approver: '陈芳（DBA）', action: '通过', actionTime: '2025-10-10 08:45' },
      ],
      gitRecords: [
        { hash: '6d1c8b2a7f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c', shortHash: '6d1c8b2', author: '张磊', authorEmail: 'zhanglei@example.com', commitTime: '2025-10-08 16:40', message: 'feat(user_dim): 主键 ID 由 VARCHAR(32) 扩位到 VARCHAR(64)，支持历史 32 位数据', branch: 'main', filesChanged: 5 },
        { hash: '5c0b7a1f6e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b', shortHash: '5c0b7a1', author: '张磊', authorEmail: 'zhanglei@example.com', commitTime: '2025-10-08 15:55', message: 'feat(user_dim): 新增 LPAD 回填 SQL，补齐回滚方案', branch: 'main', filesChanged: 2 },
        { hash: '4a9f6e0d5c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f', shortHash: '4a9f6e0', author: '王伟', authorEmail: 'wangwei@example.com', commitTime: '2025-10-08 14:10', message: 'review(user_dim): DDL 评审意见 - 需补充回填 SQL 与回滚方案', branch: 'main', filesChanged: 1 },
      ],
    },
    {
      version: versionList[2]!,  // v2.2.0 - 新增 email
      createTime: '2025-08-22 11:15',
      creator: '张磊',
      changeDescription: '字段命名标准化，user_id → user_nick；新增 email 字段对接用户触达',
      changeType: 'DDL',
      riskLevel: '中',
      changeSummary: summary(calcDiff(versionList[2]!, versionList[3]!), snapshots[versionList[2]!]?.length ?? 0),
      fieldChanges: calcDiff(versionList[2]!, versionList[3]!),
      upstreamImpact: ['dwd.user_dim (依赖 user_id)'],
      downstreamImpact: ['营销触达任务', '用户标签系统'],
      sqlSnippet: `-- 1. 字段重命名
ALTER TABLE dwd.user_dim
CHANGE COLUMN user_id user_nick VARCHAR(64)
COMMENT '用户昵称';

-- 2. 新增 email 字段
ALTER TABLE dwd.user_dim
ADD COLUMNS (email VARCHAR(128) COMMENT '用户邮箱');`,
      approvals: [
        { approver: '王伟（数据架构师）', action: '通过', comment: '命名规范统一', actionTime: '2025-08-22 15:00' },
      ],
      gitRecords: [
        { hash: '3f8e5d0c4b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e', shortHash: '3f8e5d0', author: '张磊', authorEmail: 'zhanglei@example.com', commitTime: '2025-08-22 11:10', message: 'feat(user_dim): 新增 email 字段（VARCHAR 128）', branch: 'main', filesChanged: 4 },
        { hash: '2e7d4c0b3a9f1e2d3c4b5a6f7e8d9c0b1a2f3e4d', shortHash: '2e7d4c0', author: '张磊', authorEmail: 'zhanglei@example.com', commitTime: '2025-08-22 10:42', message: 'refactor(user_dim): 字段重命名 user_id → user_nick，统一命名规范', branch: 'main', filesChanged: 6 },
      ],
    },
    {
      version: versionList[3]!,  // v2.1.0 - 早期版本
      createTime: '2025-06-10 09:00',
      creator: '李雪',
      changeDescription: '资产初始版本，建立基础用户维度表（含 user_id、name、status 等 6 个字段）',
      changeType: '初始化',
      riskLevel: '低',
      changeSummary: summary([], snapshots[versionList[3]!]?.length ?? 0),
      fieldChanges: [],
      upstreamImpact: ['ods.user_ods'],
      downstreamImpact: [],
      approvals: [
        { approver: '王伟（数据架构师）', action: '通过', comment: '初始版本', actionTime: '2025-06-10 17:30' },
      ],
      gitRecords: [
        { hash: '1d6c3b0a2f8e0d1c2b3a4f5e6d7c8b9a0f1e2d3c', shortHash: '1d6c3b0', author: '李雪', authorEmail: 'lixue@example.com', commitTime: '2025-06-10 08:55', message: 'feat(user_dim): 初始建表，建立基础用户维度表（6 个核心字段）', branch: 'main', filesChanged: 1 },
      ],
    },
    // 历史的 v1.x 版本（保留向后兼容）
    {
      version: 'v1.1.0',
      createTime: a.onShelfTime || a.registerTime,
      creator: a.publisher,
      changeDescription: '资产上架发布',
      changeType: '上架发布',
      riskLevel: '低',
      changeSummary: { added: 0, modified: 0, removed: 0, totalAfter: 0 },
      approvals: [],
      gitRecords: [
        { hash: '0c5b2a9f1e7d0c1b2a3f4e5d6c7b8a9f0e1d2c3b', shortHash: '0c5b2a9', author: a.publisher, commitTime: a.onShelfTime || a.registerTime, message: 'release(user_dim): v1.1.0 资产上架发布', branch: 'main', filesChanged: 1 },
      ],
    },
    {
      version: 'v1.0.0',
      createTime: a.registerTime,
      creator: a.owner,
      changeDescription: '资产初始版本',
      changeType: '初始化',
      riskLevel: '低',
      changeSummary: { added: 0, modified: 0, removed: 0, totalAfter: 0 },
      approvals: [],
      gitRecords: [
        { hash: 'a4f1e8d0c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2', shortHash: 'a4f1e8d', author: a.owner, commitTime: a.registerTime, message: 'chore(user_dim): v1.0.0 资产初始注册', branch: 'main', filesChanged: 1 },
      ],
    }
  ]
})

// 当前展开的版本行
const expandedVersionKeys = ref<string[]>([])

// 切换展开
const toggleVersionExpand = (key: string) => {
  const idx = expandedVersionKeys.value.indexOf(key)
  if (idx > -1) {
    expandedVersionKeys.value.splice(idx, 1)
  } else {
    expandedVersionKeys.value.push(key)
  }
}

const processingLogic = computed(() => {
  if (!assetData.value) return '暂无加工逻辑说明'
  const a = assetData.value
  return `1. 数据来源：
   - ${a.clusterType} ${a.clusterEnv === 'compute' ? '计算集群' : '分析集群'} ${a.hiveDatabase}.${a.hiveTableName}
   - 业务域：${a.category}

2. 清洗规则：
   - 主键 ${a.fields[0]?.name || 'id'} 非空校验
   - 标准化时间字段
   - 负责人字段必填校验

3. 同步策略：
   - 每日全量覆盖
   - 同步至 ${a.clusterType} 计算/分析集群`
})

const sqlSnippet = computed(() => {
  if (!assetData.value) return ''
  const a = assetData.value
  return `-- 资产 ${a.assetName} 数据加工示例
INSERT OVERWRITE TABLE ${a.hiveDatabase}.${a.hiveTableName}
SELECT
  id,
  owner,
  status,
  description,
  current_timestamp() AS update_time
FROM
  ods.${a.hiveTableName}_ods
WHERE
  dt = '\${biz_date}'
  AND id IS NOT NULL;`
})

const isRelationField = (fieldName: string) => {
  const relationFieldNames = ['id', 'user_id', 'product_id', 'metric_code', 'dim_key']
  return relationFieldNames.includes(fieldName.toLowerCase())
}

// ============ 关联关系 mock ============
interface RelationRow {
  id: string
  relationType: '关联表' | '关联API' | '关联指标' | '关联报表'
  targetName: string
  targetHivePath?: string
  targetSystem: string
  relationField: string
  cardinality: '1:1' | '1:N' | 'N:1' | 'N:N'
  description: string
}

const relations = computed<RelationRow[]>(() => {
  if (!assetData.value) return []
  const a = assetData.value
  // 根据资产类型返回不同的关联关系
  if (a.recordType === 'table') {
    // 表格型资产
    return [
      {
        id: 'r1',
        relationType: '关联表',
        targetName: 't_customer_360',
        targetHivePath: 'mysql.cdp.t_customer_360',
        targetSystem: '核心系统',
        relationField: 'id = user_id',
        cardinality: 'N:1',
        description: '用户主数据关联，提供客户基础信息'
      },
      {
        id: 'r2',
        relationType: '关联表',
        targetName: 't_loan_contract',
        targetHivePath: 'mysql.core.t_loan_contract',
        targetSystem: '核心系统',
        relationField: 'id = apply_id',
        cardinality: '1:N',
        description: '贷款合同主表，记录合同详情'
      },
      {
        id: 'r3',
        relationType: '关联API',
        targetName: '资产查询服务',
        targetSystem: '数据服务',
        relationField: 'id',
        cardinality: '1:1',
        description: '提供 RESTful 查询接口'
      },
      {
        id: 'r4',
        relationType: '关联指标',
        targetName: '资产活跃度',
        targetSystem: '数据要素',
        relationField: 'id',
        cardinality: '1:N',
        description: '衍生指标：用户行为活跃程度'
      },
      {
        id: 'r5',
        relationType: '关联报表',
        targetName: '资产运营周报',
        targetSystem: '数据应用',
        relationField: 'id',
        cardinality: 'N:N',
        description: '运营周报的数据源'
      }
    ]
  }
  if (a.recordType === 'metric') {
    // 指标型资产
    return [
      {
        id: 'r1',
        relationType: '关联表',
        targetName: 'ods_asset_metric_raw',
        targetHivePath: 'ods.ods_asset_metric_raw',
        targetSystem: 'HIVE 数仓',
        relationField: 'metric_code = code',
        cardinality: 'N:1',
        description: '指标原始数据，统计来源'
      },
      {
        id: 'r2',
        relationType: '关联指标',
        targetName: '资产总数',
        targetSystem: '数据要素',
        relationField: 'metric_code',
        cardinality: '1:1',
        description: '上层汇总指标'
      },
      {
        id: 'r3',
        relationType: '关联API',
        targetName: '资产指标查询服务',
        targetSystem: '数据服务',
        relationField: 'metric_code',
        cardinality: '1:1',
        description: '对外提供的指标查询接口'
      },
      {
        id: 'r4',
        relationType: '关联报表',
        targetName: '资产指标周报',
        targetSystem: '数据应用',
        relationField: 'metric_code',
        cardinality: 'N:N',
        description: '指标可视化报表'
      }
    ]
  }
  return []
})

const gotoRelationAsset = (record: RelationRow) => {
  if (record.relationType === '关联表') {
    router.push(`/management/asset-management/listing-management/asset-management/detail/${encodeURIComponent(record.targetName)}`)
  } else {
    Message.info(`打开「${record.targetName}」详情页（${record.relationType}）`)
  }
}

// ============ 血缘关系 mock ============
interface LineageRow {
  id: string
  name: string
  hivePath: string
  system: string
  relationType: '上游ETL' | '下游聚合'
  owner: string
  description: string
}

const upstreamLineage = computed<LineageRow[]>(() => {
  if (!assetData.value) return []
  return [
    {
      id: 'up1',
      name: `ods_${assetData.value.hiveTableName}`,
      hivePath: `ods.ods_${assetData.value.hiveTableName}`,
      system: 'HIVE 数仓',
      relationType: '上游ETL',
      owner: '数据工程组',
      description: '数据原始层 ODS，每天全量同步'
    },
    {
      id: 'up2',
      name: `dwd_${assetData.value.hiveTableName}_clean`,
      hivePath: `dwd.dwd_${assetData.value.hiveTableName}_clean`,
      system: 'HIVE 数仓',
      relationType: '上游ETL',
      owner: '数据工程组',
      description: '数据清洗层 DWD，去重并校验主键'
    }
  ]
})

const downstreamLineage = computed<LineageRow[]>(() => {
  if (!assetData.value) return []
  return [
    {
      id: 'down1',
      name: `dws_${assetData.value.hiveTableName}_agg`,
      hivePath: `dws.dws_${assetData.value.hiveTableName}_agg`,
      system: 'HIVE 数仓',
      relationType: '下游聚合',
      owner: '数据工程组',
      description: '数据汇总层 DWS，提供聚合视图'
    },
    {
      id: 'down2',
      name: `ads_${assetData.value.hiveTableName}_report`,
      hivePath: `ads.ads_${assetData.value.hiveTableName}_report`,
      system: 'HIVE 数仓',
      relationType: '下游聚合',
      owner: '数据应用组',
      description: '数据应用层 ADS，报表数据源'
    }
  ]
})

const lineageDepth = computed(() => {
  // 上游 + 当前 + 下游
  return upstreamLineage.value.length > 0 || downstreamLineage.value.length > 0 ? 3 : 0
})

const gotoLineageAsset = (record: LineageRow) => {
  router.push(`/management/asset-management/listing-management/asset-management/detail/${encodeURIComponent(record.name)}`)
}

// 操作
const canOnShelf = (a: AssetDetail) => a.status === 'offShelf'
const canOffShelf = (a: AssetDetail) => a.status === 'onShelf' || a.status === 'active'

const onShelf = (a: AssetDetail) => {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  a.status = 'onShelf'
  a.onShelfTime = now
  a.offShelfTime = undefined
  Message.success(`${a.assetName} 已上架`)
}
const offShelf = (a: AssetDetail) => {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  a.status = 'offShelf'
  a.offShelfTime = now
  Message.success(`${a.assetName} 已下架`)
}
const syncOne = () => {
  if (!assetData.value) return
  Message.loading({ content: `正在同步 ${assetData.value.assetName}…`, duration: 600 })
  setTimeout(() => {
    assetData.value!.lastSyncTime = new Date().toISOString().slice(0, 19).replace('T', ' ')
    Message.success(`${assetData.value!.assetName} 同步成功`)
  }, 700)
}

const toggleFavorite = () => {
  isFavorite.value = !isFavorite.value
  Message.success(isFavorite.value ? '已收藏' : '已取消收藏')
}

const applyPermission = () => {
  if (!assetData.value) return
  Modal.confirm({
    title: '申请权限',
    content: `确定要申请资产 "${assetData.value.assetName}" 的访问权限吗？申请将发送至数据负责人 ${assetData.value.owner}。`,
    okText: '确定申请',
    cancelText: '取消',
    onOk: async () => {
      await new Promise(r => setTimeout(r, 600))
      Message.success('权限申请已提交')
    }
  })
}

const onBack = () => {
  if (window.history.length > 1) router.back()
  else router.push('/management/asset-management/listing-management/asset-management')
}

// 监听路由参数变化
watch(() => route.params.name, (name) => {
  if (typeof name === 'string') {
    assetData.value = findAsset(name)
    if (!assetData.value) {
      Message.error('未找到对应资产')
    }
  }
}, { immediate: true })

onMounted(() => {
  // watch 已处理
})

// ============ 使用说明 Tab ============
// Story 1-1 表级使用说明
const tableUsageScenarios = computed<string[]>(() => {
  if (!assetData.value) return []
  const a = assetData.value
  if (a.recordType === 'table') {
    return [
      `与 ${a.hiveDatabase} 下游表进行关联分析`,
      '作为用户/账户维度的基础宽表，用于画像与分群',
      '与订单/合同主表 LEFT JOIN 后构建业务宽表'
    ]
  }
  return ['作为指标统计的查询口径输入', '用于报表/大屏的趋势分析', '对接 API 提供实时指标查询']
})

const tableUsageCycle = computed(() => {
  if (!assetData.value) return '—'
  return assetData.value.recordType === 'table' ? 'daily (T+1)' : 'near-realtime (5min)'
})

// 折叠面板展开状态
const usageExpanded = reactive<{ table: boolean; fields: boolean }>({
  table: true,
  fields: false
})
const toggleUsage = (key: 'table' | 'fields') => {
  usageExpanded[key] = !usageExpanded[key]
}

// Story 1-2 关键字段变更对比 + 字段说明（合并版）
type FieldChangeType = 'added' | 'modified' | 'removed'

interface FieldChangeRow {
  name: string
  oldValue?: string
  newValue?: string
  changeType: FieldChangeType
}

const changeTypeLabel: Record<FieldChangeType, string> = {
  added: '🟢 新增',
  modified: '🔄 修改',
  removed: '🔴 删除'
}
const changeTypeColor: Record<FieldChangeType, string> = {
  added: 'green',
  modified: 'blue',
  removed: 'red'
}

// 字段变更明细（嵌套表格用）
const changeTypeColorGrid: Record<'added' | 'modified' | 'removed', string> = {
  added: 'green',
  modified: 'blue',
  removed: 'red'
}
const changeTypeLabelGrid: Record<'added' | 'modified' | 'removed', string> = {
  added: '新增',
  modified: '修改',
  removed: '删除'
}

// 变更类型颜色映射
type ChangeTypeTag = NonNullable<VersionItem['changeType']>
const changeTypeTagColor: Record<ChangeTypeTag, string> = {
  'DDL': 'orange',
  '数据修复': 'red',
  '加工逻辑': 'blue',
  '权限': 'purple',
  '上架发布': 'green',
  '初始化': 'gray',
}

// 风险等级颜色
type RiskLevel = NonNullable<VersionItem['riskLevel']>
const riskLevelColor: Record<RiskLevel, string> = {
  '高': 'red',
  '中': 'orange',
  '低': 'gray',
}

// SQL 复制
import { Message as ArcoMessage } from '@arco-design/web-vue'
const copySql = async (sql: string) => {
  try {
    await navigator.clipboard.writeText(sql)
    ArcoMessage.success('SQL 已复制到剪贴板')
  } catch (e) {
    ArcoMessage.error('复制失败，请手动选择')
  }
}

// V1 vs V2 全量对比：每个状态的标签 + 颜色
type DiffStatus = 'unchanged' | 'modified' | 'added' | 'removed'
const diffStatusLabel: Record<DiffStatus, string> = {
  unchanged: '未变',
  modified: '🔄 修改',
  added: '🟢 新增',
  removed: '🔴 删除'
}
const diffStatusColor: Record<DiffStatus, string> = {
  unchanged: 'gray',
  modified: 'blue',
  added: 'green',
  removed: 'red'
}

// V1 列的 class 决定器
//  - removed: 整行显示「（不存在）」
//  - unchanged / modified: 显示原本值；只有 modified 才高亮差异字符
//  - added: 显示「（不存在）」
const getDiffV1Class = (row: DiffFieldRow): string => {
  if (row.status === 'added') return 'diff-cell-empty'   // 不存在
  if (row.status === 'unchanged') return ''
  if (row.status === 'modified') {
    // 是否真的有变化？
    const tChanged = row.typeDiff?.left?.changed
    const dChanged = row.descDiff?.left?.changed
    if (tChanged && dChanged) return 'diff-cell-old'
    // 类型或说明有改动 → 整段红底
    if (tChanged || dChanged) return 'diff-cell-old'
    return ''
  }
  return 'diff-cell-old'  // removed
}

const getDiffV2Class = (row: DiffFieldRow): string => {
  if (row.status === 'removed') return 'diff-cell-empty'   // 不存在
  if (row.status === 'unchanged') return ''
  if (row.status === 'modified') {
    const tChanged = row.typeDiff?.right?.changed
    const dChanged = row.descDiff?.right?.changed
    if (tChanged && dChanged) return 'diff-cell-new'
    if (tChanged || dChanged) return 'diff-cell-new'
    return ''
  }
  return 'diff-cell-new'  // added
}

// 视图模式：字段说明 / 变更对比 / V1 vs V2 全量对比
type FieldViewMode = 'desc' | 'compare' | 'diff'
const fieldViewMode = ref<FieldViewMode>('desc')

// 版本（按时间倒序，最近在前）
const fieldVersions = computed<string[]>(() => {
  // mock 4 个版本
  return ['v2.4.0', 'v2.3.0', 'v2.2.0', 'v2.1.0']
})

// 默认查看版本：最新
const activeFieldVersion = ref('v2.4.0')

// 版本对比：两个独立的下拉（左侧"版本1"，右侧"版本2"）
// 默认取最新两版：版本1 = 第二新，版本2 = 最新
const compareVersionA = ref<string>('')  // 版本1（旧）
const compareVersionB = ref<string>('')  // 版本2（新）

// 每次 fieldVersions 变化时，若两个 ref 没值或值不再可用，自动重置为最新两版
const initCompareVersionDefaults = () => {
  const vs = fieldVersions.value
  if (vs.length >= 2) {
    const newest = vs[0]!
    const secondNewest = vs[1]!
    if (!compareVersionB.value || !vs.includes(compareVersionB.value)) {
      compareVersionB.value = newest
    }
    if (!compareVersionA.value || !vs.includes(compareVersionA.value)) {
      compareVersionA.value = secondNewest
    }
  } else if (vs.length === 1) {
    compareVersionB.value = vs[0]!
    compareVersionA.value = vs[0]!
  }
}
watch(() => fieldVersions.value, initCompareVersionDefaults, { immediate: true })

const currentComparePair = computed(() => {
  const a = compareVersionA.value || fieldVersions.value[1] || fieldVersions.value[0] || 'v2.3.0'
  const b = compareVersionB.value || fieldVersions.value[0] || 'v2.4.0'
  // 注意：版本1 = 旧版 A；版本2 = 新版 B
  return { newer: b, older: a }
})

// 当改版本1时，如果版本2和它重了，自动切到下一个
const handleVersionAChange = (val: string | number | boolean) => {
  const v = val as string
  if (v === compareVersionB.value) {
    const vs = fieldVersions.value
    const idx = vs.indexOf(v)
    const next = vs[idx + 1] || vs[idx - 1] || ''
    if (next) compareVersionB.value = next
  }
}

// 不同版本的字段 mock 快照（按版本给"字段类型 + 说明"做差异化）
const versionedFieldSnapshots: Record<string, { name: string; type: string; description: string }[]> = {
  'v2.4.0': [],
  'v2.3.0': [],
  'v2.2.0': [],
  'v2.1.0': []
}
const buildVersionedSnapshots = () => {
  if (!assetData.value) return
  const base = fields.value
  if (!base.length) return
  // 默认（最新版 = 当前 fields）
  versionedFieldSnapshots['v2.4.0'] = base.map(f => ({ ...f }))
  // v2.3.0：把第一个字段的类型改窄
  versionedFieldSnapshots['v2.3.0'] = base.map((f, i) => ({
    name: f.name,
    type: i === 0 ? 'VARCHAR(32)' : f.type,
    description: i === 0 ? '主键 ID（旧版本：32 位）' : f.description
  }))
  // v2.2.0：把第二个字段（user_id）改成 user_nick，且没有 email 字段（演示新增）
  versionedFieldSnapshots['v2.2.0'] = base
    .filter(f => f.name !== 'email')
    .map(f => ({
      name: f.name === `${base[1]?.name}` ? 'user_nick' : f.name,
      type: f.type,
      description: f.description
    }))
  // v2.1.0：早期版本，多个字段差异
  versionedFieldSnapshots['v2.1.0'] = base.slice(0, Math.max(2, base.length - 2)).map(f => ({
    name: f.name,
    type: f.type,
    description: `${f.description}（旧版描述）`
  }))
}

watch(
  [() => assetData.value?.assetName, () => fields.value],
  () => buildVersionedSnapshots(),
  { immediate: true }
)

const fieldDescRowsByVersion = computed(() => {
  const v = activeFieldVersion.value
  return versionedFieldSnapshots[v] ?? fields.value.map(f => ({ ...f }))
})

// 根据当前选中对比版本对生成变更行（mock：根据新旧快照 diff）
const fieldChangeRows = computed<FieldChangeRow[]>(() => {
  const { newer, older } = currentComparePair.value
  const a = versionedFieldSnapshots[newer] ?? []
  const b = versionedFieldSnapshots[older] ?? []
  const mapB = new Map(b.map(f => [f.name, f]))
  const mapA = new Map(a.map(f => [f.name, f]))
  const result: FieldChangeRow[] = []
  // 修改 + 新增
  a.forEach(f => {
    const old = mapB.get(f.name)
    if (!old) {
      result.push({ name: f.name, newValue: `${f.type} | ${f.description}`, changeType: 'added' })
    } else if (old.type !== f.type || old.description !== f.description) {
      result.push({
        name: f.name,
        oldValue: `${old.type} | ${old.description}`,
        newValue: `${f.type} | ${f.description}`,
        changeType: 'modified'
      })
    }
  })
  // 删除
  b.forEach(f => {
    if (!mapA.has(f.name)) {
      result.push({ name: f.name, oldValue: `${f.type} | ${f.description}`, changeType: 'removed' })
    }
  })
  // 如果两边一致（mock 数据没差异），给演示数据
  if (!result.length) {
    if (assetData.value) {
      result.push({ name: fields.value[0]?.name || 'id', oldValue: 'VARCHAR(32)', newValue: 'VARCHAR(64)', changeType: 'modified' })
      result.push({ name: 'email', oldValue: undefined, newValue: 'VARCHAR(128)', changeType: 'added' })
      result.push({ name: 'legacy_flag', oldValue: 'TINYINT', newValue: undefined, changeType: 'removed' })
    }
  }
  return result
})

// ============ V1 vs V2 全量对比（diff 视图） ============
interface DiffCell {
  text: string
  changed?: boolean
}

interface DiffFieldRow {
  key: string  // 用于 :key 的唯一标识（包含左右版本信息）
  name: string  // 字段名（公共字段取原名，独有字段加标记）
  status: 'unchanged' | 'modified' | 'added' | 'removed'
  left?: { type: string; description: string }   // V1（older）
  right?: { type: string; description: string }  // V2（newer）
  typeDiff?: { left: DiffCell; right: DiffCell }
  descDiff?: { left: DiffCell; right: DiffCell }
}

// 字符级 diff（简易 LCS）
interface DiffLine {
  type: 'eq' | 'del' | 'add'
  text: string
}

/**
 * 用最长公共子序列做文本级 diff
 */
const computeTextDiff = (oldText: string, newText: string): { left: DiffCell; right: DiffCell } => {
  const a = oldText || ''
  const b = newText || ''

  if (a === b) {
    return {
      left: { text: a },
      right: { text: b },
    }
  }

  // 如果两边都不太长，做 LCS
  if (a.length <= 80 && b.length <= 80) {
    const dp: number[][] = []
    for (let i = 0; i <= a.length; i++) dp.push(new Array(b.length + 1).fill(0))
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i]![j] = a[i - 1] === b[j - 1] ? (dp[i - 1]![j - 1]! + 1) : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!)
      }
    }
    // 回溯得到公共部分
    const common: string[] = []
    let i = a.length, j = b.length
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        common.unshift(a[i - 1]!)
        i--
        j--
      } else if (dp[i - 1]![j]! >= dp[i]![j - 1]!) {
        i--
      } else {
        j--
      }
    }
    const commonStr = common.join('')

    // 高亮"差异"段：在 left 中高亮删除部分，在 right 中高亮新增部分
    const leftSegments: DiffLine[] = []
    const rightSegments: DiffLine[] = []
    let cursorA = 0
    let cursorC = 0
    while (cursorA < a.length) {
      const idx = a.indexOf(commonStr[cursorC]!, cursorA)
      if (idx === cursorA) {
        cursorA++
        cursorC++
      } else if (idx > 0) {
        leftSegments.push({ type: 'del', text: a.substring(cursorA, idx) })
        cursorA = idx
      } else {
        leftSegments.push({ type: 'del', text: a[cursorA]! })
        cursorA++
      }
    }
    cursorA = 0
    cursorC = 0
    while (cursorA < b.length) {
      const idx = b.indexOf(commonStr[cursorC]!, cursorA)
      if (idx === cursorA) {
        cursorA++
        cursorC++
      } else if (idx > 0) {
        rightSegments.push({ type: 'add', text: b.substring(cursorA, idx) })
        cursorA = idx
      } else {
        rightSegments.push({ type: 'add', text: b[cursorA]! })
        cursorA++
      }
    }

    return {
      left: { text: leftSegments.map(s => s.text).join(''), changed: leftSegments.some(s => s.type === 'del') },
      right: { text: rightSegments.map(s => s.text).join(''), changed: rightSegments.some(s => s.type === 'add') },
    }
  }

  // 太长就整体高亮
  return {
    left: { text: a, changed: true },
    right: { text: b, changed: true },
  }
}

/**
 * 把"旧字段 + 新字段"按字段名对齐，生成一张完整的 diff 行表
 */
const mergedFieldDiff = computed<DiffFieldRow[]>(() => {
  const { newer, older } = currentComparePair.value
  const a = versionedFieldSnapshots[newer] ?? []
  const b = versionedFieldSnapshots[older] ?? []

  const mapB = new Map(b.map(f => [f.name, f]))
  const mapA = new Map(a.map(f => [f.name, f]))
  const result: DiffFieldRow[] = []

  // 遍历 newer（V2）：
  //   - 在 older（V1）中存在 → 公共字段（可能未改 / 已改）
  //   - 不存在 → 新增字段（added）
  a.forEach(f => {
    const old = mapB.get(f.name)
    if (!old) {
      result.push({
        key: `add__${f.name}`,
        name: f.name,
        status: 'added',
        right: { type: f.type, description: f.description },
      })
    } else {
      const typeChanged = old.type !== f.type
      const descChanged = old.description !== f.description
      if (typeChanged || descChanged) {
        result.push({
          key: `mod__${f.name}`,
          name: f.name,
          status: 'modified',
          left: { type: old.type, description: old.description },
          right: { type: f.type, description: f.description },
          typeDiff: computeTextDiff(old.type, f.type),
          descDiff: computeTextDiff(old.description, f.description),
        })
      } else {
        result.push({
          key: `eq__${f.name}`,
          name: f.name,
          status: 'unchanged',
          left: { type: old.type, description: old.description },
          right: { type: f.type, description: f.description },
        })
      }
    }
  })

  // 遍历 older（V1），找 V2 中已删除的字段
  b.forEach(f => {
    if (!mapA.has(f.name)) {
      result.push({
        key: `del__${f.name}`,
        name: f.name,
        status: 'removed',
        left: { type: f.type, description: f.description },
      })
    }
  })

  return result
})

// diff 汇总统计
const diffStats = computed(() => {
  const stats = { added: 0, removed: 0, modified: 0, unchanged: 0 }
  mergedFieldDiff.value.forEach(r => {
    if (r.status === 'added') stats.added++
    else if (r.status === 'removed') stats.removed++
    else if (r.status === 'modified') stats.modified++
    else stats.unchanged++
  })
  return stats
})

// ============ 三种视图的列定义（columns 数据驱动 + 命名插槽渲染表头） ============

// 模式 1：字段说明（desc）列定义
const descTableColumns = computed(() => [
  {
    title: '字段名',
    dataIndex: 'name',
    width: 220,
    render: ({ record }: { record: DiffFieldRow }) =>
      h('div', { class: 'diff-name-cell' }, [
        h(
          'a-tag',
          { size: 'small', color: diffStatusColor[record.status] },
          { default: () => diffStatusLabel[record.status] }
        ),
        h(
          'span',
          { class: ['diff-name', record.status === 'removed' && 'diff-name-removed'] },
          record.name
        ),
      ]),
  },
  {
    title: '版本1',
    titleSlotName: 'versionA-header',
    render: ({ record }: { record: DiffFieldRow }) => {
      if (!record.left) return h('span', { class: 'diff-cell-empty' }, '（不存在）')
      return h(
        'span',
        { class: getDiffV1Class(record) },
        `${record.left!.type} · ${record.left!.description}`
      )
    },
  },
  {
    title: '版本2',
    titleSlotName: 'versionB-header',
    render: ({ record }: { record: DiffFieldRow }) => {
      if (!record.right) return h('span', { class: 'diff-cell-empty' }, '（不存在）')
      return h(
        'span',
        { class: getDiffV2Class(record) },
        `${record.right!.type} · ${record.right!.description}`
      )
    },
  },
])

// 模式 2：变更对比（compare）列定义
const compareTableColumns = computed(() => [
  {
    title: '字段名',
    dataIndex: 'name',
    width: 160,
  },
  {
    title: '旧版本',
    titleSlotName: 'compareOld-header',
    width: 220,
    render: ({ record }: { record: FieldChangeRow }) =>
      h('span', { class: 'usage-old-value' }, record.oldValue || '（不存在）'),
  },
  {
    title: '新版本',
    titleSlotName: 'compareNew-header',
    width: 220,
    render: ({ record }: { record: FieldChangeRow }) =>
      h('span', { class: 'usage-new-value' }, record.newValue || '（不存在）'),
  },
  {
    title: '变更',
    width: 100,
    render: ({ record }: { record: FieldChangeRow }) =>
      h(
        'a-tag',
        { size: 'small', color: changeTypeColor[record.changeType] },
        { default: () => changeTypeLabel[record.changeType] }
      ),
  },
])

// 模式 3：V1 vs V2 全量对比（diff）列定义
const diffTableColumns = computed(() => [
  {
    title: '字段名',
    dataIndex: 'name',
    width: 220,
    render: ({ record }: { record: DiffFieldRow }) =>
      h('div', { class: 'diff-name-cell' }, [
        h(
          'a-tag',
          { size: 'small', color: diffStatusColor[record.status] },
          { default: () => diffStatusLabel[record.status] }
        ),
        h(
          'span',
          { class: ['diff-name', record.status === 'removed' && 'diff-name-removed'] },
          record.name
        ),
      ]),
  },
  {
    title: 'V1',
    titleSlotName: 'diffV1-header',
    render: ({ record }: { record: DiffFieldRow }) => {
      if (!record.left) return h('span', { class: 'diff-cell-empty' }, '（不存在）')
      return h(
        'span',
        { class: getDiffV1Class(record) },
        `${record.left!.type} · ${record.left!.description}`
      )
    },
  },
  {
    title: 'V2',
    titleSlotName: 'diffV2-header',
    render: ({ record }: { record: DiffFieldRow }) => {
      if (!record.right) return h('span', { class: 'diff-cell-empty' }, '（不存在）')
      return h(
        'span',
        { class: getDiffV2Class(record) },
        `${record.right!.type} · ${record.right!.description}`
      )
    },
  },
])

// Story 1-3 字段变更日志抽屉
const changeLogDrawerVisible = ref(false)
const changeLogDrawerField = ref<string | null>(null)

interface ChangeLogEntry {
  version: string
  changeDate: string
  operator: string
  changeType: FieldChangeType
  oldValue?: string
  newValue?: string
  description?: string
}

const fullChangeLog = computed<ChangeLogEntry[]>(() => {
  if (!assetData.value) return []
  const name = assetData.value.assetName
  return [
    {
      version: 'v2.3.0',
      changeDate: '2026-04-15',
      operator: '张三',
      changeType: 'modified',
      oldValue: 'user_nick',
      newValue: 'user_name',
      description: '字段名标准化，与核心系统对齐'
    },
    {
      version: 'v2.3.0',
      changeDate: '2026-04-15',
      operator: '张三',
      changeType: 'added',
      newValue: 'VARCHAR(128)',
      description: `新增 email 字段，对接 ${name} 用户触达场景`
    },
    {
      version: 'v2.3.0',
      changeDate: '2026-04-15',
      operator: '张三',
      changeType: 'removed',
      oldValue: 'TINYINT legacy_flag',
      description: '废弃字段清理'
    },
    {
      version: 'v2.2.0',
      changeDate: '2026-03-01',
      operator: '李四',
      changeType: 'added',
      newValue: 'VARCHAR(64)',
      description: '初始版本字段定义'
    }
  ]
})

const changeLogTimeline = computed<ChangeLogEntry[]>(() => {
  const f = changeLogDrawerField.value
  if (!f) return fullChangeLog.value
  return fullChangeLog.value.filter(l => l.oldValue?.includes(f) || l.newValue?.includes(f) || l.description?.includes(f))
})

const openChangeLogDrawer = () => {
  changeLogDrawerField.value = null
  changeLogDrawerVisible.value = true
}
const closeChangeLogDrawer = () => {
  changeLogDrawerVisible.value = false
}

</script>

<style scoped>
.asset-detail-page {
  padding: 16px 24px;
}

.asset-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-card,
.tab-card {
  margin-bottom: 0;
}

.hive-table {
  font-family: 'JetBrains Mono', Consolas, Menlo, monospace;
  font-size: 12px;
  color: #165dff;
  background: #f0f7ff;
  padding: 2px 6px;
  border-radius: 3px;
}

.relation-field {
  color: #1890ff;
  text-decoration: underline;
  cursor: pointer;
}

.sql-code-block {
  background-color: #f5f7fa;
  padding: 16px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #333;
  overflow-x: auto;
  border: 1px solid var(--color-border-2);
}

.sql-code-block pre {
  margin: 0;
  padding: 0;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}

.logic-content {
  font-size: 13px;
}

/* 使用说明 Tab */
.usage-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.usage-collapse-card {
  border: 1px solid var(--color-border-2, #e5e6eb);
  border-radius: 6px;
  background: #fff;
  overflow: hidden;
}

.usage-collapse-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
  background: #fafbfc;
  transition: background 0.15s;
}
.usage-collapse-header:hover {
  background: #f2f3f5;
}

.usage-collapse-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #1d2129;
}

.usage-emoji {
  font-size: 16px;
}

.usage-collapse-body {
  padding: 16px;
  border-top: 1px solid var(--color-border-2, #e5e6eb);
}

.usage-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  line-height: 1.7;
  color: #4e5969;
}
.usage-row:last-child {
  margin-bottom: 0;
}

.usage-label {
  flex-shrink: 0;
  font-weight: 500;
  color: #1d2129;
}

.usage-list {
  margin: 0;
  padding-left: 18px;
}

.usage-old-value {
  color: #f53f3f;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
  background: #ffece8;
  padding: 1px 4px;
  border-radius: 3px;
}

.usage-new-value {
  color: #00b42a;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
  background: #e8ffea;
  padding: 1px 4px;
  border-radius: 3px;
}

.usage-fields-compare-header {
  margin-bottom: 12px;
  font-size: 13px;
  color: #4e5969;
}

.usage-fields-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

/* ============ 双版本独立下拉 ============ */
.version-pair-picker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: #fafbfc;
  border: 1px solid #e5e6e8;
  border-radius: 6px;
}

.version-pair-label {
  font-size: 12px;
  color: #86909c;
  font-weight: 500;
  margin-left: 4px;
}

.version-pair-label:first-child {
  margin-left: 0;
}

.version-pair-vs {
  font-size: 12px;
  color: #c9cdd4;
  font-weight: 500;
  margin: 0 4px;
}

/* ============ 表格列头内的下拉选择器（紧凑版） ============ */
.diff-col-version-label {
  display: inline-block;
  margin-right: 4px;
  font-size: 13px;
  font-weight: 500;
  color: #1d2129;
  white-space: nowrap;
}

.diff-col-version-select {
  width: 110px;
  display: inline-block;
}

.diff-col-version-select :deep(.arco-select-view) {
  min-height: 24px !important;
  height: 24px !important;
  padding: 0 6px !important;
  font-size: 12px !important;
  background: #fafbfc;
  border-color: #c9cdd4;
}

.diff-col-version-select :deep(.arco-select-view:hover) {
  border-color: #165dff;
  background: #fff;
}

/* ============ diff 视图样式 ============ */
.diff-stats-summary {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 4px;
}

.diff-vs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  margin-bottom: 12px;
  background: linear-gradient(90deg, #f7f9fc 0%, #f0f7ff 50%, #f7f9fc 100%);
  border: 1px solid #e5e6e8;
  border-radius: 6px;
}

.diff-version-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.diff-version-tag.diff-version-left {
  justify-content: flex-start;
}

.diff-version-tag.diff-version-right {
  justify-content: flex-end;
}

.diff-arrow {
  color: #c9cdd4;
  font-size: 14px;
  font-weight: 600;
}

/* 表格内差异单元格高亮 */
.diff-cell-old {
  display: inline-block;
  background-color: #fff1f0;
  color: #d93b3b;
  padding: 2px 6px;
  border-radius: 3px;
  text-decoration: line-through;
  text-decoration-color: rgba(217, 59, 59, 0.4);
  font-size: 13px;
  line-height: 1.5;
}

.diff-cell-new {
  display: inline-block;
  background-color: #e8ffea;
  color: #1a7f37;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
  font-size: 13px;
  line-height: 1.5;
}

.diff-cell-empty {
  color: #c9cdd4;
  font-style: italic;
  font-size: 12px;
}

.diff-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.diff-name {
  font-weight: 500;
  font-family: 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 13px;
}

/* 列头：V1/V2 标识 */
.diff-col-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.diff-col-version {
  display: inline-block;
  padding: 2px 8px;
  background-color: #f2f3f5;
  color: #86909c;
  font-size: 11px;
  font-weight: 600;
  border-radius: 3px;
}

.diff-col-version-new {
  background-color: #e8f4ff;
  color: #165dff;
}

.diff-col-label {
  color: #1d2129;
  font-weight: 500;
  font-size: 13px;
}

.diff-desc-sep {
  color: #c9cdd4;
  margin: 0 4px;
}

.diff-name-removed {
  color: #c9cdd4;
  text-decoration: line-through;
}

/* 整行着色：新增 / 删除 / 未变 */
.diff-row-added {
  background-color: #f6fffa !important;
}

.diff-row-removed {
  background-color: #fef6f6 !important;
}

.diff-row-modified {
  background-color: #fffbea !important;
}

.diff-row-unchanged {
  /* 不变行保持默认白色 */
}

/* 表格整体紧凑 */
.diff-table :deep(.arco-table-td),
.diff-table :deep(.arco-table-th) {
  padding: 6px 12px !important;
  font-size: 13px;
}

/* ============ 版本详情（可展开） ============ */
.version-detail-page {
  padding: 4px 0;
}

.version-summary-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 20px;
  margin-bottom: 16px;
  background: linear-gradient(90deg, #fafbfc 0%, #f7f9fc 100%);
  border: 1px solid #e5e6e8;
  border-radius: 8px;
}

.version-summary-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 12px;
  border-right: 1px solid #e5e6e8;
}

.version-summary-stat:last-of-type {
  border-right: none;
}

.version-summary-stat .stat-num {
  font-size: 20px;
  font-weight: 600;
  color: #1d2129;
  line-height: 1.2;
}

.version-summary-stat .stat-label {
  font-size: 12px;
  color: #86909c;
}

.version-summary-tip {
  margin-left: auto;
  color: #86909c;
  font-size: 12px;
}

.version-toggle {
  color: #c9cdd4;
  font-size: 10px;
  display: inline-block;
  width: 12px;
}

.version-summary-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.version-summary-tags {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.version-old-value {
  color: #d93b3b;
  background: #fff1f0;
  padding: 0 4px;
  border-radius: 2px;
  text-decoration: line-through;
  font-size: 12px;
}

.version-new-value {
  color: #1a7f37;
  background: #e8ffea;
  padding: 0 4px;
  border-radius: 2px;
  font-weight: 500;
  font-size: 12px;
}

/* 展开区域样式 */
.version-expanded-detail {
  padding: 16px 24px;
  background: #fafbfc;
  border: 1px dashed #e5e6e8;
  border-radius: 6px;
  margin: 8px 16px;
}

.detail-block {
  margin-bottom: 18px;
}

.detail-block:last-child {
  margin-bottom: 0;
}

.detail-block-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #e5e6e8;
}

.detail-icon {
  font-size: 14px;
}

/* 变更统计四宫格 */
.detail-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.detail-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  background: #fff;
  border: 1px solid #e5e6e8;
  border-radius: 4px;
}

.detail-stat-label {
  font-size: 12px;
  color: #86909c;
  margin-bottom: 6px;
}

.detail-stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #1d2129;
}

/* SQL 区 */
.detail-sql {
  margin: 0;
  padding: 12px 16px;
  background: #1e2129;
  color: #d4d6d9;
  border-radius: 4px;
  font-family: 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 上下游影响 */
.detail-impact {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.detail-impact-section {
  background: #fff;
  border: 1px solid #e5e6e8;
  border-radius: 4px;
  padding: 12px 14px;
}

.impact-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 8px;
}

.impact-icon {
  font-size: 12px;
}

.impact-list {
  margin: 0;
  padding-left: 18px;
}

.impact-list li {
  font-size: 12px;
  color: #4e5969;
  line-height: 1.8;
}

/* 审批记录 */
.approval-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.approval-approver {
  font-weight: 500;
  color: #1d2129;
}

.approval-comment {
  color: #86909c;
  font-style: italic;
  flex: 1;
}

.approval-time {
  color: #86909c;
  font-size: 12px;
  margin-left: auto;
}

.detail-block-empty {
  text-align: center;
  color: #86909c;
  font-size: 12px;
  font-style: italic;
  padding: 12px 0;
}

.version-detail-table :deep(.arco-table-expand-btn-cell .arco-table-cell) {
  padding: 0 !important;
}

/* ============ Git 提交记录时间轴 ============ */
.git-record-count {
  margin-left: 8px;
  font-size: 12px;
  font-weight: normal;
  color: #86909c;
}

.git-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.git-item {
  display: flex;
  gap: 14px;
  padding: 10px 0;
  align-items: stretch;
}

.git-rail {
  position: relative;
  width: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.git-dot {
  width: 10px;
  height: 10px;
  margin-top: 6px;
  border-radius: 50%;
  background: #165dff;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px #165dff;
  flex-shrink: 0;
}

.git-line {
  flex: 1;
  width: 2px;
  background: #e5e6e8;
  margin-top: 4px;
}

.git-content {
  flex: 1;
  background: #fff;
  border: 1px solid #e5e6e8;
  border-radius: 6px;
  padding: 10px 14px;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.git-content:hover {
  border-color: #165dff;
  box-shadow: 0 2px 6px rgba(22, 93, 255, 0.08);
}

.git-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.git-hash {
  display: inline-block;
  font-family: 'JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  color: #165dff;
  background: #f0f7ff;
  padding: 1px 6px;
  border-radius: 3px;
  cursor: pointer;
  font-weight: 500;
}

.git-message {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: #1d2129;
  line-height: 1.5;
}

.git-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 12px;
  color: #4e5969;
  flex-wrap: wrap;
}

.git-author,
.git-time,
.git-files {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.git-meta-icon {
  font-size: 12px;
  color: #86909c;
}

.git-author {
  font-weight: 500;
  color: #1d2129;
}


.log-version {
  font-weight: 600;
  font-size: 14px;
  color: #1d2129;
}
.log-date {
  font-weight: normal;
  font-size: 12px;
  color: #86909c;
}
.log-row {
  font-size: 13px;
  color: #4e5969;
  margin-top: 4px;
}
.log-desc {
  color: #1d2129;
  margin-top: 6px;
}

/* 关联关系 Tab */
.relation-overview,
.lineage-overview {
  margin-bottom: 16px;
  padding: 12px 0;
}

.link-name {
  color: #165DFF;
  cursor: pointer;
}
.link-name:hover {
  text-decoration: underline;
}

/* 血缘 Tab */
.lineage-page .lineage-overview {
  padding: 12px;
  background: #fafbfc;
  border-radius: 6px;
}

.lineage-section {
  margin-top: 16px;
}

.lineage-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.lineage-section-title.upstream {
  color: #165dff;
}
.lineage-section-title.downstream {
  color: #00b42a;
}
</style>