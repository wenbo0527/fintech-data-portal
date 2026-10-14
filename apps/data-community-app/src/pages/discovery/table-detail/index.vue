<template>
  <div class="td-page">
    <!-- ================= 未找到表兜底 ================= -->
    <a-result
      v-if="!table"
      status="404"
      title="未找到该表"
      :subtitle="tableName ? `表「${tableName}」不在表目录中（可能已被删除或表名有误）` : '缺少表名参数，请从统一搜索进入表详情'"
    >
      <template #extra>
        <a-space>
          <a-button type="primary" @click="goSearch">
            <template #icon><icon-search /></template>
            返回统一搜索
          </a-button>
          <a-button @click="goBack">
            <template #icon><icon-left /></template>
            返回上一页
          </a-button>
        </a-space>
      </template>
    </a-result>

    <!-- ================= 主体 ================= -->
    <div v-else class="td-body">
      <!-- ---------- 面包屑（与其他表详情页统一） ---------- -->
      <a-breadcrumb class="td-breadcrumb">
        <a-breadcrumb-item><a @click="router.push('/discovery/overview')">数据发现</a></a-breadcrumb-item>
        <a-breadcrumb-item><a @click="goSearch">统一搜索</a></a-breadcrumb-item>
        <a-breadcrumb-item>{{ table?.name }}</a-breadcrumb-item>
      </a-breadcrumb>

      <!-- ---------- 页头信息区 ---------- -->
      <div class="td-header">
        <div class="td-header-left">
          <div class="td-title-row">
            <a-button size="mini" type="text" class="td-back" @click="goSearch">
              <template #icon><icon-left /></template>
            </a-button>
            <h2 class="td-cn">{{ table?.cnName || '未命名表' }}</h2>
            <code class="td-en">{{ table?.name }}</code>
            <!-- 状态/资产类型/分层/分级标签：色值与文案全部取自 store 同源常量 -->
            <a-tag size="small" :color="statusColor">{{ statusLabel }}</a-tag>
            <a-tag size="small" color="arcoblue">{{ table?.assetType === 'asset' ? '数据资产' : '数据资源' }}</a-tag>
            <a-tag size="small" color="purple">{{ table?.layer }}</a-tag>
            <a-tag size="small" :color="sensitivityColor">{{ sensitivityLabel }}</a-tag>
          </div>
          <!-- 公共信息区：资产名称/集群类型/资产库/Doris表名/状态/业务域/负责人/发布人/描述 -->
          <a-descriptions
            class="td-public-desc"
            :column="4"
            size="small"
            bordered
            :label-style="descLabelStyle"
          >
            <a-descriptions-item label="资产名称">{{ table?.cnName || '—' }}</a-descriptions-item>
            <a-descriptions-item label="集群类型">{{ publicInfo.clusterType }}</a-descriptions-item>
            <a-descriptions-item label="资产库">
              <code>{{ publicInfo.assetDatabase }}</code>
            </a-descriptions-item>
            <a-descriptions-item label="Doris表名">
              <code>{{ publicInfo.dorisTable }}</code>
            </a-descriptions-item>
            <a-descriptions-item label="状态">
              <a-tag size="small" :color="statusColor">{{ statusLabel }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="业务域">{{ table?.domain || '—' }}</a-descriptions-item>
            <a-descriptions-item label="负责人">{{ table?.owner || '—' }}</a-descriptions-item>
            <a-descriptions-item label="发布人">{{ publicInfo.publisher }}</a-descriptions-item>
            <a-descriptions-item label="描述" :span="4">
              <template v-if="table?.description">{{ table?.description }}</template>
              <span v-else class="td-missing">未填写（上线检查①「元数据完整性」会拦截）</span>
            </a-descriptions-item>
          </a-descriptions>
        </div>

        <!-- ---------- 生命周期操作区（按角色 + 状态显隐） ---------- -->
        <div class="td-header-right">
          <a-space wrap>
            <!-- 未上线：数据工程师 / 数据管理员可完善元数据并提交上线 -->
            <template v-if="canOperateMeta">
              <a-button :loading="busy === 'meta'" @click="openMetaDrawer">
                <template #icon><icon-edit /></template>
                编辑元数据
              </a-button>
              <a-button type="primary" :loading="busy === 'submit'" @click="onSubmitReview">
                <template #icon><icon-send /></template>
                提交上线申请
              </a-button>
            </template>
            <!-- 审核中：仅数据管理员可通过 / 驳回 -->
            <template v-if="canAudit">
              <a-button type="primary" status="success" :loading="busy === 'approve'" @click="onApprove">
                <template #icon><icon-check-circle /></template>
                审核通过
              </a-button>
              <a-button status="danger" :loading="busy === 'reject'" @click="openRejectModal">
                <template #icon><icon-close-circle /></template>
                驳回
              </a-button>
            </template>
            <!-- 已上线：仅数据管理员可下线（先做引用检查） -->
            <a-popconfirm
              v-if="canOfflineWithoutRefs"
              content="本表无下游依赖与在线服务，确认下线？下线后将退出统一搜索。"
              type="warning"
              @ok="doOffline(false)"
            >
              <a-button status="danger" :loading="busy === 'offline'">
                <template #icon><icon-stop /></template>
                下线
              </a-button>
            </a-popconfirm>
            <a-button v-else-if="canOfflineWithRefs" status="danger" :loading="busy === 'offline'" @click="openOfflineModal">
              <template #icon><icon-stop /></template>
              下线
            </a-button>
            <!-- 已下线：补一个恢复动作，闭环生命周期（仅数据管理员） -->
            <a-button
              v-if="canRestore"
              :loading="busy === 'restore'"
              @click="onRestore"
            >
              <template #icon><icon-undo /></template>
              恢复上线
            </a-button>
            <a-button v-if="!canLifecycleAny" disabled>
              <template #icon><icon-lock /></template>
              无可执行操作
            </a-button>
          </a-space>
          <div class="td-role-hint">当前角色：{{ roleStore.currentRoleDef.label }}（{{ lifecycleHint }}）</div>
          <a-button size="small" @click="openTicket" class="td-ticket-btn">
            <template #icon><icon-edit /></template>
            提交工单
          </a-button>
        </div>
      </div>

      <!-- ---------- 状态提示条 ---------- -->
      <div class="td-alert">
        <!-- 未上线 -->
        <a-alert v-if="table?.status === 'offline'" type="info" banner>
          <template #content>
            <span class="td-alert-text">
              未上线：仅负责人与管理员可见，暂不出现在统一搜索结果中。补齐元数据并提交上线审核后方可对消费侧开放。
            </span>
            <!-- 驳回后回到未上线，这里把上次驳回原因一并带出 -->
            <a-tooltip v-if="rejectReason" :content="rejectReason" position="bottom">
              <span class="td-reject">上次驳回原因（点击查看）</span>
            </a-tooltip>
          </template>
        </a-alert>
        <!-- 审核中 -->
        <a-alert v-else-if="table?.status === 'reviewing'" type="warning" banner>
          <template #content>
            <span class="td-alert-text">
              上线审核中：由 {{ table?.reviewInfo?.submittedBy || table?.owner }} 于
              {{ table?.reviewInfo?.submittedAt || '—' }} 提交，等待数据管理员处理。
            </span>
            <a-tooltip v-if="rejectReason" :content="rejectReason" position="bottom">
              <span class="td-reject">存在历史驳回记录（点击查看）</span>
            </a-tooltip>
          </template>
        </a-alert>
        <!-- 已下线 -->
        <a-alert v-else-if="table?.status === 'retired'" type="error" banner>
          <template #content>
            <span class="td-alert-text">
              已于 {{ table?.offTime || '—' }} 下线，消费侧不可达：样例数据与服务调用已停用，仅保留元数据与审计记录。
            </span>
          </template>
        </a-alert>
        <!-- 已上线 -->
        <a-alert v-else type="normal" banner>
          <template #content>
            <span class="td-alert-text">
              已上线{{ table?.onTime ? `（${table?.onTime}）` : '' }}，对全员可发现；分级为「{{ sensitivityLabel }}」，
              授权策略见「权限」页签。
            </span>
          </template>
        </a-alert>
      </div>

      <!-- ---------- 六个页签（键名固定，与 URL query ?tab= 双向同步；2026-09 改版：移除「概览」，公共信息上移至页头） ---------- -->
      <div class="td-tabs-card">
        <a-tabs v-model:active-key="activeTab" type="rounded" :auto-switch="true" size="medium">
          <!-- ================= 1. 明细信息（原「字段」页签） ================= -->
          <a-tab-pane key="fields" title="明细信息">
            <div class="td-section-title">
              <span>明细信息（{{ fieldCount }} 个字段）</span>
              <a-space>
                <a-input-search
                  v-model="fieldSearchKw"
                  placeholder="搜索字段名/中文名/业务术语"
                  allow-clear
                  style="width: 260px"
                />
                <span class="td-section-tip">点击列头排序，表头可拖动换序/拖动调宽</span>
              </a-space>
            </div>
            <a-table
              :data="filteredFields"
              :columns="fieldColumns"
              :pagination="{ showTotal: true, pageSize: 20 }"
              row-key="name"
              size="medium"
              :bordered="false"
              :column-resizable="true"
              :scroll="{ x: '100%' }"
              :row-class="fieldRowClass"
              :class="{ 'td-flash-host': !!highlightedField }"
            >
              <template #cell-name="{ record }">
                <a-tag color="gray">{{ record.name }}</a-tag>
              </template>
              <template #cell-cn="{ record }">
                <span v-if="record.cnName">{{ record.cnName }}</span>
                <span v-else class="td-missing">—</span>
              </template>
              <template #cell-term="{ record }">
                <span v-if="record.businessTerm">{{ record.businessTerm }}</span>
                <span v-else class="td-missing">—</span>
              </template>
              <template #cell-sens="{ record }">
                <a-tag size="small" :color="SENSITIVITY_COLORS[record.sensitivity as Sensitivity]">
                  {{ SENSITIVITY_LABELS[record.sensitivity as Sensitivity] || record.sensitivity }}
                </a-tag>
              </template>
              <template #cell-pii="{ record }">
                <a-tag v-if="record.isPersonalSensitive" size="small" color="red">是</a-tag>
                <span v-else class="td-missing">否</span>
              </template>
              <template #cell-cat1="{ record }">{{ record.catL1 }}</template>
              <template #cell-cat2="{ record }">{{ record.catL2 }}</template>
              <template #cell-cat3="{ record }">{{ record.catL3 }}</template>
              <template #cell-cat4="{ record }">{{ record.catL4 }}</template>
              <template #empty>
                <a-empty description="未登记字段，请在「编辑元数据」中补全" />
              </template>
            </a-table>
          </a-tab-pane>

          <!-- ================= 3. 血缘 ================= -->
          <a-tab-pane key="lineage" title="血缘">
            <div class="td-section-title">
              <span>表级血缘图</span>
              <span class="td-section-tip">复用「血缘分析」页同款血缘图组件（以本表为中心，支持展开层级 / 全屏）；点击节点可查看资产详情并跳转对应表</span>
              <a class="td-lineage-jump" @click="goLineagePage">血缘分析页打开</a>
            </div>
            <LineageGraph
              v-if="tableName"
              :key="tableName"
              :table-name="tableName"
              :layers="1"
              class="td-lineage-graph"
            />
            <a-alert type="info" class="td-impact">
              <template #content>
                <span class="td-alert-text">
                  影响面：本表变更将波及下游 {{ downstreamNodes.length }} 张表（其中已上线
                  {{ downstreamOnlineCount }} 张），另有
                  {{ table?.layer === 'ODS' ? '贴源直连' : '加工链路' }}
                  依赖；上游 {{ upstreamNodes.length }} 张表为本表供数；对外服务
                  {{ onlineServiceCount }} 个在线形态。下线前请先确认上述引用完成迁移。
                </span>
              </template>
            </a-alert>
          </a-tab-pane>

          <!-- ================= 4. 质量 ================= -->
          <a-tab-pane key="quality" title="质量">
            <div class="td-quality">
              <div class="td-score-card" :class="qualityScoreClass2">
                <div class="td-score-num">{{ table?.qualityScore }}</div>
                <div class="td-score-label">综合质量评分</div>
                <div class="td-score-line">达标线 ≥ 60 分（上线检查③硬性项）</div>
              </div>
              <div class="td-dims">
                <div
                  v-for="row in qualityRows"
                  :key="row.key"
                  class="td-dim"
                  :class="{ 'td-dim-flash': highlightDim === row.key }"
                >
                  <div class="td-dim-head">
                    <span class="td-dim-name">{{ row.label }}</span>
                    <span class="td-dim-weight">权重 {{ Math.round(row.weight * 100) }}%</span>
                    <span class="td-dim-score">{{ row.score }} 分</span>
                  </div>
                  <div class="td-qbar">
                    <div class="td-qbar-fill" :style="{ width: row.score + '%', background: dimColor(row.score) }" />
                    <div class="td-qbar-mark" title="达标线 60" />
                  </div>
                </div>
                <div class="td-quality-tip">
                  评分由五维加权求和得出（完整性 {{ Math.round(QUALITY_WEIGHTS.completeness * 100) }}% + 准确性
                  {{ Math.round(QUALITY_WEIGHTS.accuracy * 100) }}% + 一致性 {{ Math.round(QUALITY_WEIGHTS.consistency * 100) }}% +
                  及时性 {{ Math.round(QUALITY_WEIGHTS.timeliness * 100) }}% + 唯一性 {{ Math.round(QUALITY_WEIGHTS.uniqueness * 100) }}%），
                  当前为演示挡板实现，不接入真实质量扫描。支持 <code>?dim=维度key</code> 直达高亮。
                </div>
              </div>
            </div>
          </a-tab-pane>

          <!-- ================= 5. 权限 ================= -->
          <a-tab-pane key="permission" title="权限">
            <div class="td-section-title">
              <span>分级 → 授权策略映射</span>
              <span class="td-section-tip">策略口径与「表级数据分级」联动（挡板说明，不落权限系统真实配置）</span>
            </div>
            <div class="td-policy-list">
              <div
                v-for="p in PERMISSION_POLICIES"
                :key="p.level"
                class="td-policy"
                :class="{ 'td-policy-active': table?.sensitivity === p.level }"
              >
                <div class="td-policy-left">
                  <a-tag size="small" :color="SENSITIVITY_COLORS[p.level]">{{ SENSITIVITY_LABELS[p.level] }}</a-tag>
                  <span class="td-policy-name">{{ p.policy }}</span>
                </div>
                <div class="td-policy-note">{{ p.note }}</div>
                <div class="td-policy-cur">{{ table?.sensitivity === p.level ? '本表适用' : '' }}</div>
              </div>
            </div>
            <div class="td-section-title">
              <span>本表权限配置</span>
            </div>
            <a-descriptions :column="2" bordered :label-style="descLabelStyle">
              <a-descriptions-item label="权限策略">
                <a-tag v-if="table?.permissionConfigured" size="small" color="green">已配置</a-tag>
                <a-tag v-else size="small" color="orange">未配置</a-tag>
                <span class="td-desc-sub">
                  {{ table?.permissionConfigured ? '已设置默认可见范围与授权策略' : '未配置策略，上线后默认仅负责人可见（上线检查④软性提示）' }}
                </span>
              </a-descriptions-item>
              <a-descriptions-item label="当前角色可见性">
                <a-tag size="small" :color="accessible ? 'green' : 'orange'">
                  {{ accessible ? '可查看数据' : '仅元数据可见（未授权）' }}
                </a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="适用策略" :span="2">
                {{ currentPolicyText }}
              </a-descriptions-item>
            </a-descriptions>
            <div class="td-actions-row">
              <a-button type="primary" :disabled="accessible" @click="openPermissionModal">申请权限</a-button>
              <span class="td-section-tip">提交后生成权限审批工单，可在权限中心跟踪进度</span>
            </div>
            <div v-if="permissionRecords.length" class="td-section-title">
              <span>授权记录</span>
            </div>
            <a-empty v-if="!permissionRecords.length" class="td-empty" description="暂无授权记录" />
            <a-table v-else :data="permissionRecords" :pagination="false" row-key="id" size="medium">
              <template #columns>
                <a-table-column title="申请人" data-index="applicant" :width="120" />
                <a-table-column title="申请理由" data-index="reason" />
                <a-table-column title="申请期限" data-index="duration" :width="140" />
                <a-table-column title="状态" :width="100">
                  <template #cell="{ record }">
                    <a-tag size="small" :color="record.status === 'approved' ? 'green' : record.status === 'pending' ? 'orange' : 'red'">
                      {{ record.status === 'approved' ? '已批准' : record.status === 'pending' ? '审批中' : '已驳回' }}
                    </a-tag>
                  </template>
                </a-table-column>
                <a-table-column title="申请时间" data-index="appliedAt" :width="180" />
              </template>
            </a-table>
          </a-tab-pane>

          <!-- ================= 6. 服务 ================= -->
          <a-tab-pane key="service" :title="`服务（${serviceCount}）`">
            <a-alert v-if="table?.status !== 'online'" type="info" banner class="td-svc-alert">
              <template #content>
                <span class="td-alert-text">仅「已上线」的表可配置服务暴露形态；当前状态为「{{ statusLabel }}」，服务配置能力已锁定。</span>
              </template>
            </a-alert>
            <div class="td-section-title">
              <span>服务暴露形态（{{ serviceCount }}）</span>
              <a-button
                v-if="isManagerRole && table?.status === 'online'"
                type="primary"
                size="small"
                @click="openServiceModal"
              >
                <template #icon><icon-plus /></template>
                注册服务形态
              </a-button>
            </div>
            <a-empty
              v-if="!services.length"
              class="td-empty"
              :description="table?.status === 'online' ? '尚无服务形态，注册第一个服务形态' : '尚无服务形态'"
            >
              <a-button
                v-if="isManagerRole && table?.status === 'online'"
                type="primary"
                @click="openServiceModal"
              >
                注册第一个服务形态
              </a-button>
            </a-empty>
            <a-table v-else :data="services" :pagination="false" row-key="id" size="medium">
              <template #columns>
                <a-table-column title="形态" :width="140">
                  <template #cell="{ record }">
                    <a-tag size="small" color="arcoblue">{{ SERVICE_KIND_LABELS[record.kind as ServiceKind] || record.kind }}</a-tag>
                  </template>
                </a-table-column>
                <a-table-column title="服务名称" data-index="name" :width="240" />
                <a-table-column title="Endpoint / 地址" data-index="endpoint">
                  <template #cell="{ record }"><code class="td-endpoint">{{ record.endpoint }}</code></template>
                </a-table-column>
                <a-table-column title="状态" :width="110">
                  <template #cell="{ record }">
                    <a-tag size="small" :color="record.status === 'online' ? 'green' : 'gray'">
                      {{ record.status === 'online' ? '在线' : '已下线' }}
                    </a-tag>
                  </template>
                </a-table-column>
                <a-table-column title="更新时间" data-index="updatedAt" :width="180" />
                <a-table-column v-if="isManagerRole" title="操作" :width="200" fixed="right">
                  <template #cell="{ record }">
                    <a-space>
                      <a-button
                        type="text"
                        size="small"
                        :loading="busy === 'svc-' + record.id"
                        @click="onToggleService(record)"
                      >
                        {{ record.status === 'online' ? '下线' : '上线' }}
                      </a-button>
                      <a-popconfirm content="确认删除该服务形态？" type="warning" @ok="onRemoveService(record)">
                        <a-button type="text" size="small" status="danger">删除</a-button>
                      </a-popconfirm>
                    </a-space>
                  </template>
                </a-table-column>
              </template>
            </a-table>
          </a-tab-pane>

          <!-- ================= 7. 变更记录 ================= -->
          <a-tab-pane key="changelog" title="变更记录">
            <div class="td-section-title">
              <span>变更时间线</span>
              <span class="td-section-tip">按变更类型着色；与下方操作审计同源（表目录 store）</span>
            </div>
            <a-empty v-if="!changeLog.length" class="td-empty" description="暂无变更记录" />
            <a-timeline v-else class="td-timeline" :reverse="false">
              <a-timeline-item
                v-for="(item, idx) in changeLog"
                :key="idx"
                :dot-color="CHANGELOG_DOT_COLORS[item.type as ChangeLogType] || 'gray'"
                :label="item.ts"
              >
                <div class="td-tl-line">
                  <a-tag size="small" :color="CHANGELOG_DOT_COLORS[item.type as ChangeLogType] || 'gray'">
                    {{ item.type }}
                  </a-tag>
                  <span class="td-tl-desc">{{ item.desc }}</span>
                  <span class="td-tl-actor">{{ item.actor }}</span>
                </div>
              </a-timeline-item>
            </a-timeline>

            <div class="td-section-title">
              <span>操作审计（history）</span>
            </div>
            <a-table :data="history" :pagination="false" row-key="ts" size="medium">
              <template #columns>
                <a-table-column title="时间" data-index="ts" :width="200" />
                <a-table-column title="动作" data-index="action" :width="150">
                  <template #cell="{ record }"><a-tag size="small" bordered>{{ record.action }}</a-tag></template>
                </a-table-column>
                <a-table-column title="操作人" data-index="actor" :width="160" />
                <a-table-column title="备注" data-index="comment">
                  <template #cell="{ record }">
                    <span v-if="record.comment">{{ record.comment }}</span>
                    <span v-else class="td-missing">—</span>
                  </template>
                </a-table-column>
              </template>
              <template #empty>
                <a-empty description="暂无操作审计记录" />
              </template>
            </a-table>
          </a-tab-pane>

          <!-- ================= 8. 讨论 ================= -->
          <a-tab-pane key="discussion" title="讨论">
            <div class="td-discussion">
              <!-- 统计栏 -->
              <div class="td-disc-stats">
                共 {{ discussionThreads.length }} 条 · {{ discussionEssentialCount }} 条精华 · {{ discussionPendingTicketCount }} 个待处理工单
              </div>

              <!-- 筛选与排序 -->
              <div class="td-disc-toolbar">
                <a-radio-group v-model="discussionFilter" type="button" size="small">
                  <a-radio value="all">全部</a-radio>
                  <a-radio value="essential">精华</a-radio>
                  <a-radio value="mine">我的讨论</a-radio>
                  <a-radio value="pending">待处理工单</a-radio>
                  <a-radio value="resolved">已解决</a-radio>
                </a-radio-group>
                <a-select v-model="discussionSort" size="small" style="width: 120px">
                  <a-option value="latest">最新</a-option>
                  <a-option value="useful">最多有用</a-option>
                </a-select>
              </div>

              <!-- 发起讨论 -->
              <div class="td-disc-compose">
                <a-radio-group v-model="newThreadType" size="small">
                  <a-radio value="discussion">💬 讨论</a-radio>
                  <a-radio value="question">❓ 提问</a-radio>
                  <a-radio value="notice">📢 通报</a-radio>
                </a-radio-group>
                <a-textarea
                  v-model="newThreadContent"
                  :auto-size="{ minRows: 2, maxRows: 5 }"
                  placeholder="输入讨论内容（支持 @ 触发工单：提问+@→内容缺失工单，通报+@→内容错误工单）"
                  allow-clear
                  class="td-disc-input"
                />
                <div class="td-disc-compose-actions">
                  <span class="td-disc-hint">不支持图片和 HTML</span>
                  <a-button type="primary" size="small" :loading="busy === 'disc-post'" @click="onPostThread">发送</a-button>
                </div>
              </div>

              <!-- 讨论列表 -->
              <a-empty v-if="!filteredThreads.length" description="暂无讨论，发起第一条讨论吧" class="td-empty" />
              <div v-else class="td-disc-list">
                <div
                  v-for="thread in filteredThreads"
                  :key="thread.id"
                  class="td-disc-item"
                  :class="{ 'td-disc-essential': thread.isEssential }"
                >
                  <div class="td-disc-item-head">
                    <span class="td-disc-type">{{ thread.type === 'discussion' ? '💬' : thread.type === 'question' ? '❓' : '📢' }}</span>
                    <span class="td-disc-author">{{ thread.author }}</span>
                    <span class="td-disc-time">{{ thread.createdAt }}</span>
                    <a-tag v-if="thread.isEssential" size="small" color="gold">精华</a-tag>
                    <a-tag v-if="thread.ticketStatus" size="small" :color="thread.ticketStatus === 'pending' ? 'orange' : thread.ticketStatus === 'resolved' ? 'green' : 'red'">
                      {{ thread.ticketStatus === 'pending' ? '⏳待处理' : thread.ticketStatus === 'resolved' ? '✅已解决' : '❌已驳回' }}
                    </a-tag>
                  </div>
                  <div class="td-disc-content">{{ thread.content }}</div>
                  <!-- 处理结果展示 -->
                  <div v-if="thread.resolution" class="td-disc-resolution">
                    <span class="td-disc-res-pin">📌</span>
                    {{ thread.resolution }}
                  </div>
                  <div class="td-disc-item-actions">
                    <a-button type="text" size="mini" @click="onToggleUseful(thread)">
                      👍 有用 ({{ thread.usefulCount }})
                    </a-button>
                    <a-button type="text" size="mini" @click="onToggleReplyBox(thread)">
                      💬 回复 ({{ thread.replies.length }})
                    </a-button>
                    <a-button v-if="isManagerRole && !thread.isEssential" type="text" size="mini" @click="onMarkEssential(thread)">
                      标记精华
                    </a-button>
                    <a-button v-if="isManagerRole && thread.isEssential" type="text" size="mini" @click="onUnmarkEssential(thread)">
                      取消精华
                    </a-button>
                  </div>
                  <!-- 回复列表 -->
                  <div v-if="thread.replies.length" class="td-disc-replies">
                    <div v-for="reply in thread.replies" :key="reply.id" class="td-disc-reply">
                      <span class="td-disc-reply-author">{{ reply.author }}</span>
                      <span class="td-disc-reply-content">{{ reply.content }}</span>
                      <span class="td-disc-reply-time">{{ reply.createdAt }}</span>
                    </div>
                  </div>
                  <!-- 回复输入框 -->
                  <div v-if="thread.showReply" class="td-disc-reply-box">
                    <a-input
                      v-model="thread.replyInput"
                      placeholder="回复..."
                      allow-clear
                      @press-enter="onPostReply(thread)"
                    />
                    <a-button type="primary" size="small" @click="onPostReply(thread)">回复</a-button>
                  </div>
                </div>
              </div>
            </div>
          </a-tab-pane>
        </a-tabs>
      </div>
    </div>

    <!-- ================= 编辑元数据抽屉 ================= -->
    <a-drawer
      v-model:visible="metaDrawerVisible"
      title="编辑元数据（表级 + 字段级）"
      placement="right"
      :width="760"
      ok-text="保存元数据"
      cancel-text="取消"
      :ok-loading="busy === 'meta-save'"
      :mask-closable="false"
      unmount-on-close
      @ok="onSaveMeta"
      @cancel="metaDrawerVisible = false"
    >
      <a-form :model="metaForm" layout="vertical" class="td-meta-form">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="中文名" required>
              <a-input v-model="metaForm.cnName" placeholder="如：用户维度表" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="业务域">
              <a-input v-model="metaForm.domain" placeholder="如：用户域" allow-clear />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="更新频次">
          <a-select v-model="metaForm.updateFrequency" :options="FREQ_OPTIONS" placeholder="请选择更新频次" />
        </a-form-item>
        <a-form-item label="表描述" required>
          <a-textarea
            ref="tableDescRef"
            v-model="metaForm.description"
            :auto-size="{ minRows: 3, maxRows: 6 }"
            placeholder="说明这张表记录什么、口径边界、典型消费场景（上线检查①要求必填）"
            allow-clear
          />
        </a-form-item>

        <div class="td-field-editor-head">
          <span class="td-fe-title">字段清单（{{ draftFields.length }} 个）</span>
          <a-space>
            <a-button size="mini" @click="addDraftField">
              <template #icon><icon-plus /></template>
              新增字段
            </a-button>
          </a-space>
        </div>
        <div class="td-fe">
          <div class="td-fe-row td-fe-head">
            <span class="td-fe-idx">#</span>
            <span>字段名</span>
            <span>类型</span>
            <span>描述</span>
            <span>分级</span>
            <span class="td-fe-op" />
          </div>
          <div v-for="(fd, i) in draftFields" :key="i" class="td-fe-row">
            <span class="td-fe-idx">{{ i + 1 }}</span>
            <a-input v-model="fd.name" size="small" placeholder="字段名" />
            <a-select v-model="fd.type" size="small" :options="FIELD_TYPE_OPTIONS" placeholder="类型" allow-create />
            <a-input
              size="small"
              v-model="fd.description"
              :ref="(el: any) => setDescRef(i, el)"
              :status="fd.description ? 'normal' : 'error'"
              placeholder="字段注释（上线检查①要求必填）"
            />
            <a-select v-model="fd.sensitivity" size="small" :options="SENSITIVITY_OPTIONS" placeholder="分级" />
            <span class="td-fe-op">
              <a-button type="text" size="mini" status="danger" @click="removeDraftField(i)">
                <template #icon><icon-delete /></template>
              </a-button>
            </span>
          </div>
          <div v-if="!draftFields.length" class="td-fe-empty">暂无字段，请点击「新增字段」补全</div>
        </div>

        <div class="td-check-preview">
          <div class="td-cp-title">上线检查实时预览（仅本地计算，不提交）</div>
          <div v-for="c in checkPreview" :key="c.key" class="td-cp-row">
            <span :class="c.passed ? 'td-cp-pass' : (c.hard ? 'td-cp-fail' : 'td-cp-warn')">
              {{ c.passed ? '✓' : '✗' }}
            </span>
            <span class="td-cp-name">{{ c.name }}</span>
            <a-tag size="small" :color="c.hard ? 'red' : 'gray'" bordered>{{ c.hard ? '硬性' : '软性' }}</a-tag>
            <span class="td-cp-msg">{{ c.message }}</span>
          </div>
        </div>
      </a-form>
    </a-drawer>

    <!-- ================= 上线检查报告弹层 ================= -->
    <a-modal
      v-model:visible="reviewModalVisible"
      :title="reviewPassed ? '上线检查通过 · 已提交审核' : '上线检查报告'"
      :width="620"
      :ok-loading="busy === 'submit'"
      :hide-cancel="true"
      ok-text="知道了"
      @ok="reviewModalVisible = false"
    >
      <a-alert :type="reviewPassed ? 'success' : 'error'" banner class="td-modal-alert">
        <template #content>
          <span class="td-alert-text">{{ reviewMessage }}</span>
        </template>
      </a-alert>
      <div class="td-check-list">
        <div v-for="c in reviewChecks" :key="c.key" class="td-check-row" :class="{ 'td-check-row-fail': !c.passed }">
          <span class="td-check-icon" :class="c.passed ? 'td-cico-pass' : (c.hard ? 'td-cico-fail' : 'td-cico-warn')">
            {{ c.passed ? '✓' : '✗' }}
          </span>
          <div class="td-check-main">
            <div class="td-check-name">
              {{ c.name }}
              <a-tag size="small" :color="c.hard ? 'red' : 'gray'" bordered>{{ c.hard ? '硬性' : '软性' }}</a-tag>
            </div>
            <div class="td-check-msg">{{ c.message }}</div>
          </div>
          <a-button v-if="!c.passed" type="text" size="small" @click="goFix(c.key)">去完善</a-button>
        </div>
      </div>
    </a-modal>

    <!-- ================= 驳回原因弹层 ================= -->
    <a-modal
      v-model:visible="rejectModalVisible"
      title="驳回上线申请"
      :width="520"
      :ok-loading="busy === 'reject'"
      ok-text="确认驳回"
      @before-ok="onRejectConfirm"
      @cancel="rejectModalVisible = false"
    >
      <a-form ref="rejectFormRef" :model="rejectForm" :rules="rejectRules" layout="vertical">
        <a-form-item field="reason" label="驳回原因（必填，将同步负责人）">
          <a-textarea
            v-model="rejectForm.reason"
            :auto-size="{ minRows: 3, maxRows: 6 }"
            placeholder="如：字段 tag_code 缺少业务注释，血缘未登记上游"
            allow-clear
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- ================= 下线引用检查弹层 ================= -->
    <a-modal
      v-model:visible="offlineModalVisible"
      title="下线前引用检查"
      :width="640"
      :ok-loading="busy === 'offline'"
      :ok-text="offlineForce ? '仍要下线' : '确认下线'"
      :ok-button-props="{ status: 'danger', disabled: hasOfflineRefs && !offlineForce }"
      cancel-text="取消"
      @before-ok="onOfflineConfirm"
      @cancel="offlineModalVisible = false"
    >
      <div v-if="hasOfflineRefs">
        <a-alert type="error" banner class="td-modal-alert">
          <template #content>
            <span class="td-alert-text">
              本表存在 {{ offlineRefs?.downstreamTables.length || 0 }} 个下游引用与
              {{ offlineRefs?.onlineServices.length || 0 }} 个在线服务，下线会造成断链，请确认已完成迁移。
            </span>
          </template>
        </a-alert>
        <div class="td-ref-title">下游表</div>
        <div v-for="d in offlineRefs?.downstreamTables || []" :key="d.name" class="td-ref-row">
          <code>{{ d.name }}</code>
          <span class="td-ref-cn">{{ d.cnName }}</span>
          <a-tag size="small" :color="STATUS_COLORS[d.status]">{{ STATUS_LABELS[d.status] }}</a-tag>
        </div>
        <div class="td-ref-title">在线服务</div>
        <div v-for="s in offlineRefs?.onlineServices || []" :key="s.id" class="td-ref-row">
          <a-tag size="small" color="arcoblue">{{ SERVICE_KIND_LABELS[s.kind] }}</a-tag>
          <span class="td-ref-cn">{{ s.name }}</span>
          <code class="td-endpoint">{{ s.endpoint }}</code>
        </div>
        <div v-if="!offlineRefs?.onlineServices.length" class="td-ref-none">无在线服务</div>
        <a-checkbox v-model="offlineForce" class="td-force-check">
          我已确认影响面，仍要下线（force=true，二次确认）
        </a-checkbox>
      </div>
      <a-alert v-else type="info">
        <template #content>
          <span class="td-alert-text">本表无下游引用与在线服务，确认后即可下线（下线动作会写入变更记录与站内通知）。</span>
        </template>
      </a-alert>
    </a-modal>

    <!-- ================= 注册服务弹层 ================= -->
    <a-modal
      v-model:visible="serviceModalVisible"
      title="注册服务形态"
      :width="520"
      :ok-loading="busy === 'svc-add'"
      ok-text="确认注册"
      @before-ok="onServiceConfirm"
      @cancel="serviceModalVisible = false"
    >
      <a-form :model="serviceForm" layout="vertical">
        <a-form-item label="服务形态" required>
          <a-select v-model="serviceForm.kind" :options="SERVICE_KIND_OPTIONS" placeholder="请选择形态" />
        </a-form-item>
        <a-form-item label="服务名称" required>
          <a-input v-model="serviceForm.name" placeholder="如：客户全景档案API" allow-clear />
        </a-form-item>
        <a-form-item label="Endpoint / 地址" required>
          <a-input v-model="serviceForm.endpoint" placeholder="如：/api/v1/customer/overview" allow-clear />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- ================= 权限申请弹层 ================= -->
    <a-modal
      v-model:visible="permissionModalVisible"
      title="申请数据权限"
      :width="520"
      :ok-loading="busy === 'perm-apply'"
      ok-text="提交申请"
      @before-ok="onPermissionConfirm"
      @cancel="permissionModalVisible = false"
    >
      <a-form :model="permissionForm" layout="vertical">
        <a-form-item label="申请表" disabled>
          <a-input :model-value="table?.cnName ? `${table.cnName}（${table.name}）` : table?.name" disabled />
        </a-form-item>
        <a-form-item label="数据分级">
          <a-tag :color="sensitivityColor">{{ sensitivityLabel }}</a-tag>
        </a-form-item>
        <a-form-item label="申请理由" required>
          <a-textarea
            v-model="permissionForm.reason"
            :auto-size="{ minRows: 3, maxRows: 6 }"
            placeholder="请说明申请权限的业务场景和用途"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="申请期限" required>
          <a-select v-model="permissionForm.duration" :options="DURATION_OPTIONS" placeholder="请选择权限期限" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- ================= 工单弹窗 ================= -->
    <MissingTicketModal
      v-model:visible="showMissingTicketModal"
      :context="ticketContext"
      @confirm="handleMissingTicketConfirm"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * dca 版「表详情页」（重构方案 P1 · 表详情 7 Tab + 生命周期操作）
 *
 * 设计要点：
 *  1. 唯一事实源：`@/mock-dca/shared/table-catalog-store`（即 src/mock/shared/table-catalog-store.ts，
 *     经由 vite/tsconfig 别名 `@/mock-dca` → `src/mock` 解析）。本页只读消费 + 调用其动作，不复制任何 mock 数据。
 *  2. 即时刷新：store 内部为模块级 `ref<LogicalTable[]>`，返回的对象是响应式代理；
 *     本页所有派生数据走 computed，写操作（updateMeta/submitForReview/approve/reject/offline/服务增删改）后视图自动更新。
 *  3. 角色控制：复用 dca 全局 pinia 角色 store（`@/stores-dca/role`），
 *     演示角色持久化在 localStorage 键 `data-mid-platform:current-role`（MainLayout 角色切换弹窗写入）。
 *     由于 `initFromStorage()` 只在 RoleSwitcher 组件挂载时调用，而 MainLayout 使用自带弹窗，
 *     故本页 onMounted 主动补一次 initFromStorage()（幂等）以恢复演示角色。
 *     权限口径：数据工程师（data_engineer）= 提交上线申请 / 完善元数据；
 *               数据管理员（data_admin 数据治理者、admin 系统管理员）= 审核通过 / 驳回 / 下线 / 服务配置。
 *  4. URL 直达参数：`:tableName`（decodeURIComponent 后 byName 定位）+ query `tab` / `highlight` / `dim`。
 *  5. 异步节奏：所有写操作用 delay(300~800ms) 模拟后端往返，按钮 loading 期间禁止重复提交。
 */
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import type { FieldRule, FormInstance, TableColumnData } from '@arco-design/web-vue'
import { useDraggableColumns } from '@/composables/useDraggableColumns'
// 血缘图组件：与「血缘分析」页（dfd-pages/lineage）复用同一 X6 图实现
import LineageGraph from '@/dfd-pages/lineage/components/LineageGraph.vue'
import {
  TableCatalogStore,
  STATUS_LABELS,
  STATUS_COLORS,
  SENSITIVITY_LABELS,
  SENSITIVITY_COLORS,
  SERVICE_KIND_LABELS,
  QUALITY_DIM_LABELS,
  QUALITY_WEIGHTS,
  REVIEW_CHECK_DEFS,
  runChecks,
  derivePublicInfo,
  deriveFieldDetail,
  type CatalogField,
  type FieldDetailInfo,
  type ChangeLogItem,
  type LogicalTable,
  type OfflineRefs,
  type QualityDims,
  type ReviewCheck,
  type Sensitivity,
  type ServiceExposure,
  type ServiceKind,
  type TableStatus
} from '@/mock-dca/shared/table-catalog-store'
import { useRoleStore } from '@/stores-dca/role'
import MissingTicketModal from '@/pages/search/MissingTicketModal.vue'
import { useMissingTicket } from '@/composables/useMissingTicket'

type ChangeLogType = ChangeLogItem['type']

// ---------------- 常量 ----------------

/** 页签键名（同时作为 ?tab= 合法值白名单；2026-09 改版：概览移除，公共信息上移页头） */
const TAB_KEYS = ['fields', 'lineage', 'quality', 'permission', 'service', 'changelog', 'discussion'] as const
type TabKey = (typeof TAB_KEYS)[number]

/** 质量维度键（与 ?dim= 对齐） */
const DIM_KEYS = Object.keys(QUALITY_DIM_LABELS) as Array<keyof QualityDims>

/** 分级 → 授权策略映射说明（纯文案，与 store 分级枚举同源） */
const PERMISSION_POLICIES: Array<{ level: Sensitivity; policy: string; note: string }> = [
  { level: 'public', policy: '直接放行', note: '公开数据：登录用户即可发现并调用，无需申请' },
  { level: 'internal', policy: '域成员自动授权', note: '内部数据：按业务域成员关系自动赋权，跨域消费需申请' },
  { level: 'sensitive', policy: '管理者审批', note: '敏感数据：需数据管理员审批后开通，默认脱敏展示' },
  { level: 'restricted', policy: '审批 + DBA 二次确认', note: '高敏数据：管理者审批后仍需 DBA 确认，全链路操作留痕' }
]

/** 变更记录类型 → 时间线圆点/标签色（与状态色板同一系） */
const CHANGELOG_DOT_COLORS: Record<ChangeLogType, string> = {
  上线: 'green',
  下线: 'red',
  审核驳回: 'orange',
  服务变更: 'blue',
  结构变更: 'purple',
  质量变更: 'cyan',
  元数据变更: 'gray'
}

const FREQ_OPTIONS = ['实时', '每小时', '每日', '每周', '每月'].map(v => ({ label: v, value: v }))
const FIELD_TYPE_OPTIONS = ['string', 'int', 'bigint', 'decimal', 'double', 'timestamp', 'date', 'boolean']
  .map(v => ({ label: v, value: v }))
const SENSITIVITY_OPTIONS = (Object.keys(SENSITIVITY_LABELS) as Sensitivity[])
  .map(k => ({ label: SENSITIVITY_LABELS[k], value: k }))
const SERVICE_KIND_OPTIONS = (Object.keys(SERVICE_KIND_LABELS) as ServiceKind[])
  .map(k => ({ label: SERVICE_KIND_LABELS[k], value: k }))

const descLabelStyle = { color: 'var(--dca-text-tertiary)', width: '120px' }

// ---------------- 路由 / 角色 ----------------

const route = useRoute()
const router = useRouter()
const roleStore = useRoleStore()

/** 表名：路由参数 decodeURIComponent 后作为定位键 */
const tableName = computed(() => {
  const raw = String(route.params.tableName ?? '')
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
})

/** 当前表（store 唯一定位入口；deleted 不在 byName 返回范围内） */
const table = computed<LogicalTable | undefined>(() =>
  tableName.value ? TableCatalogStore.byName(tableName.value) : undefined
)

/** 角色判定 */
const isEngineerRole = computed(() => roleStore.currentRole === 'data_engineer')
const isManagerRole = computed(() => ['admin', 'data_admin'].includes(roleStore.currentRole))
/** 写操作发起人（落到 store 的 actor 字段，审计可见） */
const actor = computed(() => roleStore.currentRoleDef.label)

/** 生命周期按钮可见性：状态 × 角色 */
const canOperateMeta = computed(() => table.value?.status === 'offline' && (isEngineerRole.value || isManagerRole.value))
const canAudit = computed(() => table.value?.status === 'reviewing' && isManagerRole.value)
const canOffline = computed(() => table.value?.status === 'online' && isManagerRole.value)
const canRestore = computed(() => table.value?.status === 'retired' && isManagerRole.value)
const canLifecycleAny = computed(() => canOperateMeta.value || canAudit.value || canOffline.value || canRestore.value)
const lifecycleHint = computed(() => {
  if (canOperateMeta.value) return '可完善元数据并提交上线'
  if (canAudit.value) return '可执行上线审核'
  if (canOffline.value) return '可执行下线'
  if (canRestore.value) return '可恢复上线'
  if (table.value?.status === 'reviewing') return '审核动作需数据管理员执行'
  if (table.value?.status === 'online') return '已上线表请走变更流程，不支持直接编辑'
  return '当前角色无生命周期操作权限'
})

// ---------------- 页头展示派生 ----------------

const statusLabel = computed(() => (table.value ? STATUS_LABELS[table.value.status] : ''))
const statusColor = computed(() => (table.value ? STATUS_COLORS[table.value.status] : 'gray'))
const sensitivityLabel = computed(() => (table.value ? SENSITIVITY_LABELS[table.value.sensitivity] : ''))
const sensitivityColor = computed(() => (table.value ? SENSITIVITY_COLORS[table.value.sensitivity] : 'gray'))
const rejectReason = computed(() => table.value?.reviewInfo?.rejectReason || '')
/** 顶部公共信息：集群类型/资产库/Doris表名/发布人（store 派生纯函数，确定性计算） */
const publicInfo = computed(() =>
  table.value
    ? derivePublicInfo(table.value)
    : { clusterType: '—', assetDatabase: '—', dorisTable: '—', publisher: '—' }
)
const qualityScoreClass2 = computed(() => {
  const s = table.value?.qualityScore ?? 0
  if (s >= 90) return 'is-good'
  if (s >= 60) return 'is-mid'
  return 'is-bad'
})

// ---------------- 字段 / 血缘 / 服务 / 记录 派生 ----------------

const fields = computed<CatalogField[]>(() => table.value?.fields ?? [])
const fieldCount = computed(() => fields.value.length)

// 明细信息行：基础字段 + store 确定性派生（业务术语 / 是否个人敏感信息 / 一~四级业务目录）
type FieldDetailRow = CatalogField & FieldDetailInfo
const detailFields = computed<FieldDetailRow[]>(() => {
  const t = table.value
  if (!t) return []
  return fields.value.map(f => ({ ...f, ...deriveFieldDetail(t, f) }))
})

// 字段搜索 + 可拖动列（表头拖动换序 / column-resizable 拖宽，与其余详情页字段表统一）
const fieldSearchKw = ref('')
const filteredFields = computed(() => {
  const k = fieldSearchKw.value.trim().toLowerCase()
  if (!k) return detailFields.value
  return detailFields.value.filter(
    f =>
      f.name.toLowerCase().includes(k) ||
      (f.cnName || '').toLowerCase().includes(k) ||
      f.businessTerm.toLowerCase().includes(k)
  )
})
const sortable = (key: string) => ({ sortDirections: ['descend', 'ascend'] as ('descend' | 'ascend')[], render: (r: any) => r[key] ?? '' })
const fieldColumns = useDraggableColumns((): TableColumnData[] => [
  { title: '字段名', dataIndex: 'name', slotName: 'cell-name', width: 180, fixed: 'left', sortable: sortable('name') },
  { title: '中文名', dataIndex: 'cnName', slotName: 'cell-cn', width: 140, sortable: sortable('cnName') },
  { title: '业务术语', dataIndex: 'businessTerm', slotName: 'cell-term', width: 150, sortable: sortable('businessTerm') },
  { title: '安全等级', dataIndex: 'sensitivity', slotName: 'cell-sens', width: 110, sortable: sortable('sensitivity') },
  { title: '是否个人敏感信息', dataIndex: 'isPersonalSensitive', slotName: 'cell-pii', width: 150, align: 'center', sortable: sortable('isPersonalSensitive') },
  { title: '一级业务目录', dataIndex: 'catL1', slotName: 'cell-cat1', width: 130, sortable: sortable('catL1') },
  { title: '二级业务目录', dataIndex: 'catL2', slotName: 'cell-cat2', width: 130, sortable: sortable('catL2') },
  { title: '三级业务目录', dataIndex: 'catL3', slotName: 'cell-cat3', width: 130, sortable: sortable('catL3') },
  { title: '四级业务目录', dataIndex: 'catL4', slotName: 'cell-cat4', width: 140, sortable: sortable('catL4') }
])
const services = computed<ServiceExposure[]>(() => table.value?.services ?? [])
const serviceCount = computed(() => services.value.length)
const onlineServiceCount = computed(() => services.value.filter(s => s.status === 'online').length)
const changeLog = computed<ChangeLogItem[]>(() => table.value?.changeLog ?? [])
const history = computed(() => table.value?.history ?? [])

/** 血缘节点（表名解析到目录；解析不到时降级展示） */
interface LineageNode {
  name: string
  cnName: string
  status: TableStatus | ''
  resolved: boolean
}
function toLineageNodes(names: string[]): LineageNode[] {
  return names.map(n => {
    const t = TableCatalogStore.byName(n)
    return {
      name: n,
      cnName: t ? t.cnName : '未在表目录中登记',
      status: t ? t.status : '',
      resolved: !!t
    }
  })
}
const upstreamNodes = computed(() => toLineageNodes(table.value?.upstream ?? []))
const downstreamNodes = computed(() => toLineageNodes(table.value?.downstream ?? []))
const downstreamOnlineCount = computed(
  () => downstreamNodes.value.filter(n => n.resolved && n.status === 'online').length
)

/** 数据可见性：沿用 store 的角色可见性挡板（高敏未授权 → 权限 Tab 提示） */
const accessible = computed(() => {
  const t = table.value
  if (!t) return false
  return TableCatalogStore.accessibleFor(t, roleStore.currentRole)
})

// ---------------- 权限申请（表单 + 授权记录） ----------------

const DURATION_OPTIONS = [
  { label: '7 天', value: '7d' },
  { label: '30 天', value: '30d' },
  { label: '90 天', value: '90d' },
  { label: '永久', value: 'permanent' }
]

interface PermissionRecord {
  id: string
  applicant: string
  reason: string
  duration: string
  status: 'pending' | 'approved' | 'rejected'
  appliedAt: string
}

const permissionModalVisible = ref(false)
const permissionForm = reactive({ reason: '', duration: '30d' })
const permissionRecords = ref<PermissionRecord[]>([])

function openPermissionModal() {
  permissionForm.reason = ''
  permissionForm.duration = '30d'
  permissionModalVisible.value = true
}

async function onPermissionConfirm(): Promise<boolean> {
  if (!permissionForm.reason.trim()) {
    Message.warning('请填写申请理由')
    return false
  }
  busy.value = 'perm-apply'
  await delay()
  const now = new Date()
  const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const durLabel = DURATION_OPTIONS.find(o => o.value === permissionForm.duration)?.label || permissionForm.duration
  permissionRecords.value.unshift({
    id: `perm-${Date.now()}`,
    applicant: actor.value,
    reason: permissionForm.reason.trim(),
    duration: durLabel,
    status: 'pending',
    appliedAt: ts
  })
  busy.value = ''
  Message.success('权限申请已提交，请在权限中心跟踪审批进度')
  permissionModalVisible.value = false
  return true
}

// ---------------- 讨论 Tab ----------------

interface DiscussionReply {
  id: string
  author: string
  content: string
  createdAt: string
}

interface DiscussionThread {
  id: string
  type: 'discussion' | 'question' | 'notice'
  author: string
  content: string
  createdAt: string
  isEssential: boolean
  usefulCount: number
  usefulClicked: boolean
  ticketStatus: 'pending' | 'resolved' | 'rejected' | null
  resolution: string | null
  replies: DiscussionReply[]
  showReply: boolean
  replyInput: string
}

const discussionThreads = ref<DiscussionThread[]>([])
const discussionFilter = ref<'all' | 'essential' | 'mine' | 'pending' | 'resolved'>('all')
const discussionSort = ref<'latest' | 'useful'>('latest')
const newThreadType = ref<'discussion' | 'question' | 'notice'>('discussion')
const newThreadContent = ref('')

const discussionEssentialCount = computed(() => discussionThreads.value.filter(t => t.isEssential).length)
const discussionPendingTicketCount = computed(() => discussionThreads.value.filter(t => t.ticketStatus === 'pending').length)

const filteredThreads = computed(() => {
  let list = [...discussionThreads.value]
  switch (discussionFilter.value) {
    case 'essential':
      list = list.filter(t => t.isEssential)
      break
    case 'mine':
      list = list.filter(t => t.author === actor.value)
      break
    case 'pending':
      list = list.filter(t => t.ticketStatus === 'pending')
      break
    case 'resolved':
      list = list.filter(t => t.ticketStatus === 'resolved')
      break
  }
  if (discussionSort.value === 'useful') {
    list.sort((a, b) => b.usefulCount - a.usefulCount)
  } else {
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  return list
})

function nowTs(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

async function onPostThread() {
  const content = newThreadContent.value.trim()
  if (!content) {
    Message.warning('请输入讨论内容')
    return
  }
  busy.value = 'disc-post'
  await delay()
  // 检测是否包含 @ 来生成工单
  const hasAtMention = content.includes('@')
  let ticketStatus: DiscussionThread['ticketStatus'] = null
  if (hasAtMention) {
    // 提问 → 内容缺失工单，通报 → 内容错误工单
    ticketStatus = 'pending'
  }
  discussionThreads.value.unshift({
    id: `disc-${Date.now()}`,
    type: newThreadType.value,
    author: actor.value,
    content,
    createdAt: nowTs(),
    isEssential: false,
    usefulCount: 0,
    usefulClicked: false,
    ticketStatus,
    resolution: null,
    replies: [],
    showReply: false,
    replyInput: ''
  })
  busy.value = ''
  newThreadContent.value = ''
  if (ticketStatus) {
    Message.success('讨论已发送，已自动创建待处理工单')
  } else {
    Message.success('讨论已发送')
  }
}

function onToggleUseful(thread: DiscussionThread) {
  if (thread.usefulClicked) {
    thread.usefulCount--
    thread.usefulClicked = false
  } else {
    thread.usefulCount++
    thread.usefulClicked = true
  }
}

function onToggleReplyBox(thread: DiscussionThread) {
  thread.showReply = !thread.showReply
  if (!thread.showReply) thread.replyInput = ''
}

async function onPostReply(thread: DiscussionThread) {
  const content = thread.replyInput.trim()
  if (!content) {
    Message.warning('请输入回复内容')
    return
  }
  thread.replies.push({
    id: `reply-${Date.now()}`,
    author: actor.value,
    content,
    createdAt: nowTs()
  })
  thread.replyInput = ''
  thread.showReply = false
}

function onMarkEssential(thread: DiscussionThread) {
  thread.isEssential = true
  Message.success('已标记为精华')
}

function onUnmarkEssential(thread: DiscussionThread) {
  thread.isEssential = false
  Message.success('已取消精华标记')
}

// ---------------- 质量派生 ----------------

interface QualityRow {
  key: string
  dim: keyof QualityDims
  label: string
  score: number
  weight: number
}
const qualityRows = computed<QualityRow[]>(() => {
  const q = table.value?.quality
  if (!q) return []
  return DIM_KEYS.map(k => ({
    key: k,
    dim: k,
    label: QUALITY_DIM_LABELS[k],
    score: q[k],
    weight: QUALITY_WEIGHTS[k]
  }))
})
function dimColor(score: number): string {
  if (score >= 90) return 'var(--dca-success)'
  if (score >= 60) return 'var(--dca-brand-primary)'
  return 'var(--dca-danger)'
}

// ---------------- 权限派生 ----------------

const currentPolicyText = computed(() => {
  const s = table.value?.sensitivity
  const hit = PERMISSION_POLICIES.find(p => p.level === s)
  return hit ? `${SENSITIVITY_LABELS[hit.level]} → ${hit.policy}：${hit.note}` : '—'
})

// ---------------- 页签与 URL query 同步 ----------------

const activeTab = ref<TabKey>('fields')
/** 字段高亮（来自 ?highlight=）与维度高亮（来自 ?dim=） */
const highlightedField = ref('')
const highlightDim = ref('')
let flashTimer = 0

function isTabKey(v: unknown): v is TabKey {
  return typeof v === 'string' && (TAB_KEYS as readonly string[]).includes(v)
}
function isDimKey(v: unknown): v is string {
  return typeof v === 'string' && (DIM_KEYS as readonly string[]).includes(v)
}

/** 字段行 class：命中高亮行时打标记，配合 CSS 过渡实现 2s 渐隐 */
function fieldRowClass(record: Record<string, unknown>): string {
  return record && record.name === highlightedField.value ? 'td-row-flash' : ''
}

function clearFlashTimer() {
  if (flashTimer) {
    window.clearTimeout(flashTimer)
    flashTimer = 0
  }
}

function scrollToFlash() {
  nextTick(() => {
    const el = document.querySelector('.td-row-flash, .td-dim-flash')
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  })
}

function setFieldHighlight(name: string) {
  highlightedField.value = name
  clearFlashTimer()
  scrollToFlash()
  flashTimer = window.setTimeout(() => {
    highlightedField.value = ''
  }, 2000)
}

function setDimHighlight(key: string) {
  highlightDim.value = key
  clearFlashTimer()
  scrollToFlash()
  flashTimer = window.setTimeout(() => {
    highlightDim.value = ''
  }, 2000)
}

/** 消费 URL query：tab 直达 + highlight/dim 高亮（highlight/dim 为一次性参数，消费后清掉避免反复触发） */
function applyQueryState() {
  const qTab = route.query.tab
  const qHighlight = route.query.highlight
  const qDim = route.query.dim

  if (isTabKey(qTab)) activeTab.value = qTab
  const rest: Record<string, unknown> = { ...route.query }
  let consumed = false
  if (typeof qHighlight === 'string' && qHighlight) {
    if (!isTabKey(qTab)) activeTab.value = 'fields'
    setFieldHighlight(qHighlight)
    delete rest.highlight
    consumed = true
  }
  if (isDimKey(qDim)) {
    if (!isTabKey(qTab) && !consumed) activeTab.value = 'quality'
    setDimHighlight(qDim)
    delete rest.dim
    consumed = true
  }
  if (consumed) router.replace({ query: rest as Record<string, string> })
}

/** 页签切换 → 回写 query（便于分享链接直达） */
watch(activeTab, val => {
  if (String(route.query.tab ?? '') === val) return
  if (!table.value) return
  router.replace({ query: { ...route.query, tab: val } })
})

/** 路由变化（同页切表 / 外部带参跳转）→ 重置临时态并重新消费 query */
watch(
  () => route.fullPath,
  () => {
    if (route.name !== 'dca-table-detail' && !String(route.path).includes('/table/')) return
    applyQueryState()
  }
)
watch(tableName, () => {
  // 切换到另一张表时，抽屉/弹层与高亮态全部重置，避免串表
  closeAllOverlays()
  clearFlashTimer()
  highlightedField.value = ''
  highlightDim.value = ''
})

onMounted(() => {
  // 见文件头「设计要点 3」：补一次角色恢复，确保演示角色生效
  roleStore.initFromStorage()
  applyQueryState()
})

// ---------------- 异步节奏（300~800ms 模拟后端往返） ----------------

const busy = ref('')
function delay(ms?: number): Promise<void> {
  const wait = ms ?? 300 + Math.round(Math.random() * 500)
  return new Promise(resolve => setTimeout(resolve, wait))
}

function closeAllOverlays() {
  metaDrawerVisible.value = false
  reviewModalVisible.value = false
  rejectModalVisible.value = false
  offlineModalVisible.value = false
  serviceModalVisible.value = false
  permissionModalVisible.value = false
}

// ---------------- 编辑元数据（抽屉） ----------------

const metaDrawerVisible = ref(false)
const metaForm = reactive({ cnName: '', description: '', domain: '', updateFrequency: '' })
const draftFields = ref<CatalogField[]>([])
const tableDescRef = ref<any>(null)
const descRefs: Array<any> = []
function setDescRef(index: number, el: any) {
  descRefs[index] = el
}

function openMetaDrawer() {
  const t = table.value
  if (!t) return
  metaForm.cnName = t.cnName
  metaForm.description = t.description
  metaForm.domain = t.domain
  metaForm.updateFrequency = t.updateFrequency
  // 深拷贝字段，避免未保存就直接改动 store
  draftFields.value = t.fields.map(fd => ({ ...fd }))
  descRefs.length = 0
  metaDrawerVisible.value = true
}

function addDraftField() {
  draftFields.value.push({ name: '', type: 'string', description: '', sensitivity: 'internal' })
}
function removeDraftField(index: number) {
  draftFields.value.splice(index, 1)
}

/** 抽屉内实时预览 5 项上线检查（runChecks 为纯函数，不外发） */
const checkPreview = computed<Array<{ key: string; name: string; hard: boolean; passed: boolean; message: string }>>(() => {
  const t = table.value
  if (!t) return []
  const draft: LogicalTable = {
    ...t,
    cnName: metaForm.cnName || t.cnName,
    description: metaForm.description,
    domain: metaForm.domain,
    updateFrequency: metaForm.updateFrequency,
    fields: draftFields.value
  }
  const results = runChecks(draft)
  return REVIEW_CHECK_DEFS.map(def => {
    const hit = results.find(r => r.key === def.key)
    return {
      key: def.key,
      name: def.name,
      hard: def.hard,
      passed: hit ? hit.passed : false,
      message: hit ? hit.message : ''
    }
  })
})

async function onSaveMeta() {
  const t = table.value
  if (!t) return
  if (!metaForm.cnName.trim()) {
    Message.warning('请填写中文名')
    return
  }
  if (draftFields.value.some(fd => !fd.name.trim())) {
    Message.warning('存在未填写字段名的行，请补全后再保存')
    return
  }
  busy.value = 'meta-save'
  await delay()
  const res = TableCatalogStore.updateMeta(
    t.tableId,
    {
      cnName: metaForm.cnName.trim(),
      description: metaForm.description.trim(),
      domain: metaForm.domain.trim(),
      updateFrequency: metaForm.updateFrequency,
      fields: draftFields.value.map(fd => ({
        name: fd.name.trim(),
        type: fd.type,
        description: fd.description.trim(),
        sensitivity: fd.sensitivity
      }))
    },
    actor.value
  )
  busy.value = ''
  if (res.ok) {
    Message.success(res.message)
    metaDrawerVisible.value = false
  } else {
    Message.error(res.message)
  }
}

// ---------------- 提交上线申请（检查报告弹层） ----------------

const reviewModalVisible = ref(false)
const reviewPassed = ref(false)
const reviewMessage = ref('')
const reviewChecks = ref<ReviewCheck[]>([])

async function onSubmitReview() {
  const t = table.value
  if (!t) return
  busy.value = 'submit'
  await delay()
  const res = TableCatalogStore.submitForReview(t.tableId, actor.value)
  busy.value = ''
  reviewPassed.value = res.ok
  reviewMessage.value = res.message
  reviewChecks.value = REVIEW_CHECK_DEFS.map(def => {
    const hit = res.checks.find(c => c.key === def.key)
    return (
      hit || {
        key: def.key,
        name: def.name,
        hard: def.hard,
        passed: false,
        message: '未执行'
      }
    )
  })
  reviewModalVisible.value = true
  if (res.ok) Message.success(res.message)
  else Message.warning(res.message)
}

/** 「去完善」：关闭报告弹层并把用户带到能修的地方 */
function goFix(key: string) {
  reviewModalVisible.value = false
  if (key === 'meta_complete') {
    openMetaDrawer()
    nextTick(() => tableDescRef.value?.focus?.())
    return
  }
  if (key === 'sensitivity_tagged') {
    openMetaDrawer()
    nextTick(() => {
      const idx = draftFields.value.findIndex(fd => !fd.description)
      if (idx >= 0) descRefs[idx]?.focus?.()
    })
    return
  }
  if (key === 'lineage_traceable') {
    switchTab('lineage')
    Message.info('血缘需在血缘构建中登记，本页仅展示当前登记结果')
    return
  }
  if (key === 'quality_baseline') {
    switchTab('quality')
    Message.info('质量基线未达标，请先到质量规则/治理中提升五维分值')
    return
  }
  if (key === 'permission_configured') {
    switchTab('permission')
    Message.info('请在权限中心为该表配置授权策略')
  }
}

function switchTab(key: TabKey) {
  activeTab.value = key
}

// ---------------- 审核通过 / 驳回 ----------------

async function onApprove() {
  const t = table.value
  if (!t) return
  busy.value = 'approve'
  await delay()
  const res = TableCatalogStore.approve(t.tableId, actor.value)
  busy.value = ''
  if (res.ok) Message.success(res.message)
  else Message.error(res.message)
}

const rejectModalVisible = ref(false)
const rejectFormRef = ref<FormInstance>()
const rejectForm = reactive({ reason: '' })
const rejectRules: Record<string, FieldRule[]> = {
  reason: [{ required: true, message: '请填写驳回原因' }]
}

function openRejectModal() {
  rejectForm.reason = ''
  rejectModalVisible.value = true
}

/** a-modal before-ok：返回 false 阻止关闭（原因必填） */
async function onRejectConfirm(): Promise<boolean> {
  const t = table.value
  if (!t) return false
  const errors = await rejectFormRef.value?.validate()
  if (errors) return false
  busy.value = 'reject'
  await delay()
  const res = TableCatalogStore.reject(t.tableId, rejectForm.reason.trim(), actor.value)
  busy.value = ''
  if (res.ok) {
    Message.success(res.message)
    rejectModalVisible.value = false
  } else {
    Message.error(res.message)
  }
  return res.ok
}

// ---------------- 下线（引用检查 → 强制下线二次确认） ----------------

const offlineModalVisible = ref(false)
const offlineRefs = ref<OfflineRefs | null>(null)
const offlineForce = ref(false)

/** 弹层内：本次检查是否发现引用 */
const hasOfflineRefs = computed(() => {
  const r = offlineRefs.value
  return !!r && (r.downstreamTables.length > 0 || r.onlineServices.length > 0)
})

/** 页头：当前表是否存在下游/在线服务引用（读取 store 响应式数据，写操作后自动重算） */
const hasRefsNow = computed(() => {
  const t = table.value
  if (!t) return false
  const r = TableCatalogStore.checkOfflineRefs(t.tableId)
  return !!r && (r.downstreamTables.length > 0 || r.onlineServices.length > 0)
})
/** 无引用：气泡一步确认即可下线 */
const canOfflineWithoutRefs = computed(() => canOffline.value && !hasRefsNow.value)
/** 有引用：需要弹出引用清单 + 强制下线勾选 */
const canOfflineWithRefs = computed(() => canOffline.value && hasRefsNow.value)

async function openOfflineModal() {
  const t = table.value
  if (!t) return
  busy.value = 'offline'
  await delay(350)
  busy.value = ''
  offlineRefs.value = TableCatalogStore.checkOfflineRefs(t.tableId)
  offlineForce.value = false
  offlineModalVisible.value = true
}

/** 执行下线；force=true 表示用户已勾选二次确认 */
async function doOffline(force: boolean) {
  const t = table.value
  if (!t) return
  busy.value = 'offline'
  await delay()
  const res = TableCatalogStore.offline(t.tableId, force, actor.value)
  busy.value = ''
  if (res.ok) {
    Message.success(res.message)
    offlineModalVisible.value = false
  } else {
    Message.error(res.message)
    // 被拦截时回填最新引用清单，直接展示弹层
    offlineRefs.value = res.refs
    if (res.refs) offlineModalVisible.value = true
  }
}

/** a-modal before-ok：有引用但未勾选二次确认时不允许关闭 */
async function onOfflineConfirm(): Promise<boolean> {
  if (hasOfflineRefs.value && !offlineForce.value) {
    Message.warning('请先勾选「我已确认影响面」，再执行强制下线')
    return false
  }
  // 关闭时机由 doOffline 控制（失败需保留弹层展示引用清单）
  await doOffline(hasOfflineRefs.value)
  return false
}

// ---------------- 恢复上线（已下线 → 已上线，闭环生命周期） ----------------

async function onRestore() {
  const t = table.value
  if (!t) return
  busy.value = 'restore'
  await delay()
  const res = TableCatalogStore.restore(t.tableId, actor.value)
  busy.value = ''
  if (res.ok) Message.success(res.message)
  else Message.error(res.message)
}

// ---------------- 服务暴露形态（仅已上线表可配） ----------------

const serviceModalVisible = ref(false)
const serviceForm = reactive({ kind: 'API' as ServiceKind, name: '', endpoint: '' })

function openServiceModal() {
  serviceForm.kind = 'API'
  serviceForm.name = ''
  serviceForm.endpoint = ''
  serviceModalVisible.value = true
}

async function onServiceConfirm(): Promise<boolean> {
  const t = table.value
  if (!t) return false
  if (!serviceForm.name.trim() || !serviceForm.endpoint.trim()) {
    Message.warning('请填写服务名称与 Endpoint')
    return false
  }
  busy.value = 'svc-add'
  await delay()
  const res = TableCatalogStore.addService(
    t.tableId,
    {
      kind: serviceForm.kind,
      name: serviceForm.name.trim(),
      endpoint: serviceForm.endpoint.trim(),
      status: 'online'
    },
    actor.value
  )
  busy.value = ''
  if (res.ok) {
    Message.success(`${res.message}，服务清单已即时刷新`)
    serviceModalVisible.value = false
    return true
  }
  Message.error(res.message)
  return false
}

/** 上线 / 下线切换（不改动其他字段） */
async function onToggleService(record: Record<string, any>) {
  const t = table.value
  if (!t || !record) return
  const next = record.status === 'online' ? 'offline' : 'online'
  busy.value = `svc-${record.id}`
  await delay()
  const res = TableCatalogStore.updateService(t.tableId, String(record.id), { status: next }, actor.value)
  busy.value = ''
  if (res.ok) Message.success(next === 'online' ? '服务已上线' : '服务已下线')
  else Message.error(res.message)
}

async function onRemoveService(record: Record<string, any>) {
  const t = table.value
  if (!t || !record) return
  busy.value = `svc-${record.id}`
  await delay()
  const res = TableCatalogStore.removeService(t.tableId, String(record.id), actor.value)
  busy.value = ''
  if (res.ok) Message.success(res.message)
  else Message.error(res.message)
}

// ---------------- 页面导航 ----------------

/** 跳转血缘分析页（携带当前表名，供其预置查询条件） */
function goLineagePage() {
  router.push({ name: 'lineage', query: { table: tableName.value } })
}

function goSearch() {
  router.push('/discovery/search')
}

// ---------------- 工单接入 ----------------

const { showMissingTicketModal, ticketContext, showMissingTicket, handleMissingTicketConfirm } = useMissingTicket()

function openTicket() {
  showMissingTicket({
    assetType: 'table',
    assetName: table.value?.cnName ? `${table.value.cnName}（${table.value.name}）` : table.value?.name,
    pageSource: '数据表详情'
  })
}

function goBack() {
  router.back()
}
</script>

<style lang="scss" scoped>
/* 颜色/圆角/间距全部走 dca 设计令牌（src/styles-dca/tokens.css） */
.td-page {
  /* 与 classify/hbase 表详情页统一的内边距 */
  padding: 16px 24px 24px;
  color: var(--dca-text-primary);
  font-size: var(--dca-font-base);
}
.td-breadcrumb {
  margin-bottom: 8px;
}

/* ---------------- 页头 ---------------- */
.td-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dca-spacing-lg);
  padding: var(--dca-spacing-lg);
  background: var(--dca-bg-card);
  border: 1px solid var(--dca-border-default);
  border-radius: var(--dca-radius-lg);
  box-shadow: var(--dca-shadow-sm);
}
.td-header-left {
  flex: 1;
  min-width: 0;
}
.td-header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--dca-spacing-sm);
  flex-shrink: 0;
}
.td-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dca-spacing-sm);
}
.td-back {
  margin-right: var(--dca-spacing-xs);
}
.td-cn {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
}
.td-en {
  padding: 1px 6px;
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: var(--dca-font-md);
  color: var(--dca-text-secondary);
  background: var(--dca-bg-page-alt);
  border: 1px solid var(--dca-border-light);
  border-radius: var(--dca-radius-md);
}
/* 顶部公共信息描述表 */
.td-public-desc {
  margin-top: var(--dca-spacing-md);
}
.td-role-hint {
  font-size: var(--dca-font-sm);
  color: var(--dca-text-tertiary);
}

/* ---------------- 状态提示条 ---------------- */
.td-alert {
  margin: var(--dca-spacing-md) 0;
}
.td-alert-text {
  font-size: var(--dca-font-md);
  line-height: 22px;
}
.td-reject {
  margin-left: var(--dca-spacing-sm);
  color: var(--dca-danger);
  text-decoration: underline dashed;
  cursor: help;
}

/* ---------------- 页签卡片 ---------------- */
.td-tabs-card {
  padding: var(--dca-spacing-md) var(--dca-spacing-lg) var(--dca-spacing-lg);
  background: var(--dca-bg-card);
  border: 1px solid var(--dca-border-default);
  border-radius: var(--dca-radius-lg);
  box-shadow: var(--dca-shadow-sm);
}
.td-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dca-spacing-md);
  margin: var(--dca-spacing-lg) 0 var(--dca-spacing-sm);
  font-size: var(--dca-font-xl);
  font-weight: 600;
  &:first-child {
    margin-top: var(--dca-spacing-xs);
  }
}
.td-section-tip {
  font-size: var(--dca-font-sm);
  font-weight: 400;
  color: var(--dca-text-tertiary);
}
.td-desc {
  margin-top: var(--dca-spacing-sm);
}
.td-desc-sub {
  margin-left: var(--dca-spacing-sm);
  font-size: var(--dca-font-sm);
  color: var(--dca-text-tertiary);
}
.td-missing {
  color: var(--dca-warning);
}
.td-empty {
  padding: var(--dca-spacing-lg) 0;
}
.td-actions-row {
  display: flex;
  align-items: center;
  gap: var(--dca-spacing-md);
  margin-top: var(--dca-spacing-lg);
}



/* ---------------- 字段表：高亮定位（2s 渐隐） ---------------- */
:deep(.arco-table-td) {
  transition: background-color 2s ease-out;
}
:deep(.arco-table-tr.td-row-flash > .arco-table-td) {
  background-color: #fff7e6;
  transition: background-color 0s;
}
.td-fname {
  font-family: 'Menlo', 'Consolas', monospace;
  color: var(--dca-brand-primary);
}
.td-ftype {
  font-size: var(--dca-font-md);
  color: var(--dca-text-secondary);
}
.td-mini-tag {
  margin-left: 6px;
}

/* ---------------- 血缘图（复用血缘分析页 LineageGraph） ---------------- */
.td-lineage-jump {
  margin-left: auto;
  flex-shrink: 0;
  font-size: var(--dca-font-md);
}
.td-lineage-graph {
  height: 560px;
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--dca-border-default);
  border-radius: var(--dca-radius-lg);
}
.td-impact {
  margin-top: var(--dca-spacing-md);
}

/* ---------------- 质量 ---------------- */
.td-quality {
  display: flex;
  gap: var(--dca-spacing-lg);
  align-items: flex-start;
}
.td-score-card {
  flex-shrink: 0;
  width: 200px;
  padding: var(--dca-spacing-lg);
  text-align: center;
  color: #fff;
  border-radius: var(--dca-radius-lg);
  &.is-good {
    background: linear-gradient(160deg, #00b42a, #23c343);
  }
  &.is-mid {
    background: linear-gradient(160deg, #165dff, #4080ff);
  }
  &.is-bad {
    background: linear-gradient(160deg, #f53f3f, #f76965);
  }
}
.td-score-num {
  font-size: 44px;
  font-weight: 700;
  line-height: 1.1;
}
.td-score-label {
  margin-top: 6px;
  font-size: var(--dca-font-md);
  opacity: 0.9;
}
.td-score-line {
  margin-top: var(--dca-spacing-sm);
  font-size: var(--dca-font-xs);
  opacity: 0.85;
}
.td-dims {
  flex: 1;
  min-width: 0;
}
.td-dim {
  padding: var(--dca-spacing-sm) var(--dca-spacing-md);
  margin-bottom: 6px;
  border: 1px solid transparent;
  border-radius: var(--dca-radius-md);
  transition: background-color 2s ease-out, border-color 2s ease-out;
  &.td-dim-flash {
    background-color: #fff7e6;
    border-color: var(--dca-warning);
    transition: none;
  }
}
.td-dim-head {
  display: flex;
  align-items: center;
  gap: var(--dca-spacing-md);
  font-size: var(--dca-font-md);
}
.td-dim-name {
  min-width: 60px;
  font-weight: 600;
}
.td-dim-weight {
  color: var(--dca-text-tertiary);
  font-size: var(--dca-font-sm);
}
.td-dim-score {
  margin-left: auto;
}
.td-qbar {
  position: relative;
  height: 8px;
  margin-top: 6px;
  background: var(--dca-border-light);
  border-radius: var(--dca-radius-sm);
  overflow: hidden;
}
.td-qbar-fill {
  height: 100%;
  border-radius: var(--dca-radius-sm);
  transition: width 0.4s ease;
}
.td-qbar-mark {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 60%;
  width: 2px;
  background: var(--dca-text-secondary);
  opacity: 0.6;
}
.td-quality-tip {
  margin-top: var(--dca-spacing-md);
  font-size: var(--dca-font-sm);
  line-height: 22px;
  color: var(--dca-text-tertiary);
}

/* ---------------- 权限策略 ---------------- */
.td-policy-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--dca-spacing-md);
}
.td-policy {
  position: relative;
  padding: var(--dca-spacing-md);
  background: var(--dca-bg-page-alt);
  border: 1px solid var(--dca-border-default);
  border-radius: var(--dca-radius-lg);
  &.td-policy-active {
    background: var(--dca-bg-emphasis);
    border-color: var(--dca-brand-primary);
    box-shadow: var(--dca-shadow-sm);
  }
}
.td-policy-left {
  display: flex;
  align-items: center;
  gap: var(--dca-spacing-sm);
}
.td-policy-name {
  font-weight: 600;
}
.td-policy-note {
  margin-top: 6px;
  font-size: var(--dca-font-md);
  color: var(--dca-text-secondary);
  line-height: 22px;
}
.td-policy-cur {
  position: absolute;
  top: var(--dca-spacing-sm);
  right: var(--dca-spacing-md);
  font-size: var(--dca-font-sm);
  color: var(--dca-brand-primary);
}

/* ---------------- 服务 ---------------- */
.td-svc-alert {
  margin-bottom: var(--dca-spacing-sm);
}
.td-endpoint {
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: var(--dca-font-md);
  color: var(--dca-text-secondary);
  word-break: break-all;
}

/* ---------------- 变更记录 ---------------- */
.td-timeline {
  padding: var(--dca-spacing-sm) 0 0 var(--dca-spacing-xs);
}
.td-tl-line {
  display: flex;
  align-items: center;
  gap: var(--dca-spacing-sm);
  flex-wrap: wrap;
}
.td-tl-desc {
  color: var(--dca-text-primary);
}
.td-tl-actor {
  font-size: var(--dca-font-sm);
  color: var(--dca-text-tertiary);
}

/* ---------------- 元数据抽屉 ---------------- */
.td-meta-form {
  padding-bottom: var(--dca-spacing-md);
}
.td-field-editor-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: var(--dca-spacing-md) 0 var(--dca-spacing-sm);
}
.td-fe-title {
  font-weight: 600;
}
.td-fe {
  border: 1px solid var(--dca-border-default);
  border-radius: var(--dca-radius-md);
  overflow: hidden;
}
.td-fe-row {
  display: grid;
  grid-template-columns: 36px 1.1fr 110px 1.6fr 110px 44px;
  align-items: center;
  gap: 6px;
  padding: 6px var(--dca-spacing-sm);
  border-bottom: 1px solid var(--dca-border-light);
  &:last-child {
    border-bottom: none;
  }
}
.td-fe-head {
  background: var(--dca-bg-page-alt);
  font-size: var(--dca-font-sm);
  color: var(--dca-text-tertiary);
}
.td-fe-idx,
.td-fe-op {
  text-align: center;
  font-size: var(--dca-font-sm);
  color: var(--dca-text-tertiary);
}
.td-fe-empty {
  padding: var(--dca-spacing-md);
  font-size: var(--dca-font-sm);
  color: var(--dca-text-tertiary);
  text-align: center;
}
.td-check-preview {
  margin-top: var(--dca-spacing-lg);
  padding: var(--dca-spacing-md);
  background: var(--dca-bg-page-alt);
  border-radius: var(--dca-radius-md);
}
.td-cp-title {
  margin-bottom: var(--dca-spacing-sm);
  font-size: var(--dca-font-md);
  font-weight: 600;
  color: var(--dca-text-secondary);
}
.td-cp-row {
  display: flex;
  align-items: center;
  gap: var(--dca-spacing-sm);
  font-size: var(--dca-font-sm);
  line-height: 24px;
}
.td-cp-name {
  min-width: 130px;
}
.td-cp-msg {
  color: var(--dca-text-tertiary);
}
.td-cp-pass,
.td-cico-pass {
  color: var(--dca-success);
  font-weight: 700;
}
.td-cp-fail,
.td-cico-fail {
  color: var(--dca-danger);
  font-weight: 700;
}
.td-cp-warn,
.td-cico-warn {
  color: var(--dca-warning);
  font-weight: 700;
}

/* ---------------- 上线检查报告弹层 ---------------- */
.td-modal-alert {
  margin-bottom: var(--dca-spacing-md);
}
.td-check-list {
  display: flex;
  flex-direction: column;
  gap: var(--dca-spacing-sm);
}
.td-check-row {
  display: flex;
  align-items: flex-start;
  gap: var(--dca-spacing-sm);
  padding: var(--dca-spacing-sm) var(--dca-spacing-md);
  background: var(--dca-bg-page-alt);
  border: 1px solid var(--dca-border-light);
  border-radius: var(--dca-radius-md);
  &.td-check-row-fail {
    background: #fff1f0;
    border-color: #ffcdc7;
  }
}
.td-check-icon {
  width: 18px;
  line-height: 22px;
  text-align: center;
}
.td-check-main {
  flex: 1;
  min-width: 0;
}
.td-check-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}
.td-check-msg {
  margin-top: 2px;
  font-size: var(--dca-font-sm);
  color: var(--dca-text-secondary);
  line-height: 20px;
}

/* ---------------- 下线引用清单 ---------------- */
.td-ref-title {
  margin: var(--dca-spacing-md) 0 6px;
  font-size: var(--dca-font-md);
  font-weight: 600;
  color: var(--dca-text-secondary);
}
.td-ref-row {
  display: flex;
  align-items: center;
  gap: var(--dca-spacing-sm);
  padding: 6px var(--dca-spacing-sm);
  background: var(--dca-bg-page-alt);
  border-radius: var(--dca-radius-md);
  margin-bottom: 6px;
}
.td-ref-cn {
  color: var(--dca-text-secondary);
}
.td-ref-none {
  font-size: var(--dca-font-sm);
  color: var(--dca-text-tertiary);
}
.td-force-check {
  margin-top: var(--dca-spacing-md);
}

/* ---------------- 窄屏适配 ---------------- */
@media (max-width: 1280px) {
  .td-header {
    flex-direction: column;
    align-items: stretch;
  }
  .td-header-right {
    align-items: flex-start;
  }
  .td-quality {
    flex-direction: column;
  }
  .td-policy-list {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* ===================== 讨论 Tab ===================== */
.td-discussion {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.td-disc-stats {
  font-size: 13px;
  color: var(--dca-text-2);
  padding: 8px 0;
}
.td-disc-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.td-disc-compose {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  background: var(--dca-bg-1, #f7f8fa);
  border-radius: 8px;
  border: 1px solid var(--dca-border-2, #e5e6eb);
}
.td-disc-input {
  margin-top: 4px;
}
.td-disc-compose-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.td-disc-hint {
  font-size: 12px;
  color: var(--dca-text-3, #86909c);
}
.td-disc-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.td-disc-item {
  padding: 12px 16px;
  border: 1px solid var(--dca-border-2, #e5e6eb);
  border-radius: 8px;
  background: var(--dca-bg-1, #fff);
}
.td-disc-essential {
  border-color: #ffd21e;
  background: #fffbf0;
}
.td-disc-item-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
}
.td-disc-type {
  font-size: 16px;
}
.td-disc-author {
  font-weight: 500;
  color: var(--dca-text-1, #1d2129);
}
.td-disc-time {
  color: var(--dca-text-3, #86909c);
  font-size: 12px;
}
.td-disc-content {
  font-size: 14px;
  line-height: 1.6;
  color: var(--dca-text-1, #1d2129);
  white-space: pre-wrap;
  word-break: break-word;
}
.td-disc-resolution {
  margin-top: 8px;
  padding: 8px 12px;
  background: #e8ffea;
  border-radius: 6px;
  font-size: 13px;
  color: #00b42a;
}
.td-disc-item-actions {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}
.td-disc-replies {
  margin-top: 8px;
  padding-left: 16px;
  border-left: 2px solid var(--dca-border-2, #e5e6eb);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.td-disc-reply {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 13px;
}
.td-disc-reply-author {
  font-weight: 500;
  color: var(--dca-brand-primary, #165dff);
  white-space: nowrap;
}
.td-disc-reply-content {
  flex: 1;
  color: var(--dca-text-1, #1d2129);
}
.td-disc-reply-time {
  color: var(--dca-text-3, #86909c);
  font-size: 12px;
  white-space: nowrap;
}
.td-disc-reply-box {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.td-ticket-btn {
  margin-top: 8px;
}
</style>
