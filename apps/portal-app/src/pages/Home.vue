<template>
  <a-layout class="layout-container">
    <!-- 头部导航区 -->
    <a-layout-header class="header">
      <div class="logo">
        <img src="/logo.svg" alt="logo" />
      </div>
      <div class="nav-menu">
        <a-menu mode="horizontal" :selected-keys="[activeMenu]">
          <a-menu-item 
            v-for="key in (topMenuOrder || [])" 
            :key="key" 
            @click="handleMenuClick(key)"
          >
            {{ menuConfig?.[key]?.title || key }}
          </a-menu-item>
        </a-menu>
      </div>
      <div class="header-right">
        <a-space>
          <a-button-group>
            <a-button type="outline" size="small" @click="toggleUserRole">切换角色</a-button>
            <a-button type="outline" size="small" @click="toggleDepartment">切换部门</a-button>
            <a-button type="outline" size="small" @click="showWelcomeModal = true">显示弹窗</a-button>
          </a-button-group>
          <a-avatar>
            <IconUser />
          </a-avatar>
          <a-dropdown>
            <a-button type="text">{{ currentUser.name }}<IconDown /></a-button>
            <template #content>
              <a-doption>个人设置</a-doption>
              <a-doption>退出登录</a-doption>
            </template>
          </a-dropdown>
        </a-space>
      </div>
    </a-layout-header>

    <a-layout>
      <a-layout-content class="content">
        <!-- 欢迎横幅 -->
        <div class="welcome-banner">
          <div class="banner-content">
            <div class="welcome-text">
              <h1>欢迎回来，{{ currentUser.name }}！</h1>
            </div>
          </div>
        </div>
        
        <a-row :gutter="20" class="main-content-row">
          <!-- 左侧区域 -->
          <a-col :xs="24" :sm="24" :md="24" :lg="6" class="left-column">
            <!-- 身份卡区 -->
            <a-card class="card-container compact-card">
              <template #title>身份信息</template>
              <template #extra>
                 <a-badge :count="3" :offset="[10, 0]">
                   <IconNotification style="font-size: 16px; color: #165dff;" />
                 </a-badge>
               </template>
              <div class="identity-info compact">
                <div class="user-profile compact">
                  <div class="avatar-container compact">
                    <img src="/squirrel-avatar.svg" alt="avatar" class="avatar-image" />
                    <div class="online-indicator compact"></div>
                  </div>
                  <div class="user-details compact">
                    <h3 class="user-name">{{ currentUser.name }}</h3>
                    <p class="department">{{ currentUser.department }} · {{ currentUser.role }}</p>
                  </div>
                </div>
                <div class="quick-actions compact">
                  <div class="action-item compact">
                    <IconUser class="action-icon" />
                    <span>角色</span>
                  </div>
                  <div class="action-item compact">
                    <IconStorage class="action-icon" />
                    <span>资源</span>
                  </div>
                  <div class="action-item compact">
                    <IconFile class="action-icon" />
                    <span>待办</span>
                  </div>
                </div>
              </div>
            </a-card>

            <!-- 快速通道 -->
            <a-card class="card-container compact-card">
              <template #title>快速通道</template>
              <template #extra>
                <a-space>
                  <a-button type="text" size="small" @click="openConfigModal">
                    <template #icon><IconSettings /></template>
                    配置
                  </a-button>
                  <a-button type="text" size="small" @click="toggleEditMode">
                    <template #icon><IconEdit /></template>
                    {{ editMode ? '完成' : '编辑' }}
                  </a-button>
                </a-space>
              </template>
              
              <!-- 3x3网格布局 -->
              <div class="quick-channel-grid compact" :class="{ 'edit-mode': editMode }">
                    <div class="channel-grid-row compact" v-for="row in 3" :key="row">
                      <div 
                        v-for="col in 3" 
                        :key="`${row}-${col}`"
                        class="channel-grid-item compact"
                        :class="{ 
                          'fixed-item': isFixedPosition(row, col),
                          'draggable': editMode && !isFixedPosition(row, col),
                          'drag-over': dragOverPosition === `${row}-${col}`
                        }"
                        :draggable="editMode && !isFixedPosition(row, col)"
                        @dragstart="handleDragStart(row, col, $event)"
                        @dragover.prevent="handleDragOver(row, col, $event)"
                        @drop="handleDrop(row, col, $event)"
                        @dragend="handleDragEnd"
                        @click="!editMode && handleChannelClick(getChannelAtPosition(row, col), row, col)"
                        :tabindex="0"
                        @keydown.enter="!editMode && handleChannelClick(getChannelAtPosition(row, col), row, col)"
                        @keydown.space.prevent="!editMode && handleChannelClick(getChannelAtPosition(row, col), row, col)"
                      >
                        <div class="channel-item-content compact">
                          <component 
                            :is="getChannelAtPosition(row, col)?.icon" 
                            class="channel-icon compact"
                      />
                      <span class="channel-name compact">{{ getChannelAtPosition(row, col)?.name || '未配置' }}</span>
                      <div v-if="editMode && !isFixedPosition(row, col) && !getChannelAtPosition(row, col)" class="add-channel-placeholder compact">
                        <IconPlus class="add-icon compact" />
                        <span>配置</span>
                      </div>
                      <div v-if="!editMode && !isFixedPosition(row, col) && !getChannelAtPosition(row, col)" class="click-hint compact">
                        <IconPlus class="hint-icon compact" />
                      </div>
                      <div v-if="editMode && !isFixedPosition(row, col) && getChannelAtPosition(row, col)" class="remove-btn compact" @click.stop="removeChannel(row, col)">
                        <IconClose class="remove-icon compact" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 应用配置弹窗 -->
    <a-modal v-model:visible="configModalVisible" title="配置应用" @ok="handleConfigConfirm" @cancel="handleConfigModalCancel" :ok-button-props="{ disabled: !configForm.position || !configForm.application }">
                <a-form :model="configForm" :rules="configRules">
                  <a-form-item field="position" label="选择位置">
                    <a-select v-model="configForm.position" placeholder="请选择要配置的位置">
                      <a-option v-for="pos in availablePositions" :key="pos.value" :value="pos.value">{{ pos.label }}</a-option>
                    </a-select>
                  </a-form-item>
                  <a-form-item field="application" label="选择应用">
                    <a-select v-model="configForm.application" placeholder="请选择应用">
                      <a-option v-for="app in availableApplications" :key="app.value" :value="app.value">{{ app.label }}</a-option>
                    </a-select>
                  </a-form-item>
                </a-form>
              </a-modal>
            </a-card>

            <!-- 社区加油站 -->
            <a-card class="card-container compact-card">
              <template #title>
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span>社区加油站</span>
                  <a-button 
                    type="text" 
                    size="small" 
                    @click="refreshHomeData"
                  >
                    <template #icon><IconRefresh /></template>
                  </a-button>
                </div>
              </template>
              <div class="community-gas-station-horizontal">
                <div class="gas-station-buttons">
                  <div 
                    v-for="item in communityItems" 
                    :key="item.id"
                    class="gas-station-btn"
                    @click="handleCommunityClick(item)"
                  >
                    <div class="btn-icon">
                      <component :is="item.icon" />
                    </div>
                    <div class="btn-text">{{ item.title }}</div>
                  </div>
                </div>
              </div>
            </a-card>
          </a-col>

          <!-- 右侧区域 -->
          <a-col :xs="24" :sm="24" :md="24" :lg="18" class="right-column">
            <!-- 指标卡片区 -->
            <a-card class="card-container compact-card">
              <template #title>
                <span>社区数据站（{{ metrics.length }} 条）</span>
              </template>
              <a-skeleton v-if="loadingMetrics" :animation="true" :rows="3" />
              <template v-else>
                <a-row v-if="metrics.length > 0" :gutter="8" class="metric-cards compact">
                  <a-col :span="6" v-for="metric in metrics" :key="metric.id">
                    <a-popover trigger="hover" content="点击查看近 7 日趋势">
                      <a-card class="metric-card compact" @click="openMetricTrend(metric)">
                        <div class="metric-content compact">
                          <a-statistic
                            :title="metric.title"
                            :value="metric.value"
                            :precision="2"
                            show-group-separator
                            suffix="亿元"
                            :value-style="{ color: metric.color }"
                          >
                            <template #prefix>
                              <IconArrowRise v-if="metric.trend === 'up'" style="color: #0fbf60" />
                              <IconArrowFall v-else style="color: #f53f3f" />
                            </template>
                          </a-statistic>
                          <div class="comparison-data compact">
                            <span class="comparison-item">
                              较前一日：
                              <span :style="{ color: metric.dayOverDay >= 0 ? '#0fbf60' : '#f53f3f' }">
                                {{ metric.dayOverDay >= 0 ? '+' : '' }}{{ metric.dayOverDay }}%
                              </span>
                            </span>
                          </div>
                        </div>
                      </a-card>
                    </a-popover>
                  </a-col>
                </a-row>
                <a-empty v-else description="暂无数据指标" style="padding: 20px 0" />
              </template>
            </a-card>

            <!-- 数据架构图和通知栏 -->
            <a-row :gutter="8" class="bottom-row compact">
              <a-col :xs="24" :sm="24" :md="24" :lg="16" class="architecture-column">
                <a-card class="card-container compact-card">
                  <template #title>社区架构图</template>
                  <template #extra>
                    <a-space>
                      <a-button type="text" size="small" @click="toggleCoord">
                        坐标拾取：{{ coordEnabled ? '开' : '关' }}
                      </a-button>
                      <a-button type="text" size="small" @click="toggleNodes">
                        {{ hideNodes ? '显示节点' : '隐藏节点' }}
                      </a-button>
                      <a-button type="text" size="small" @click="toggleHideBg">
                        {{ hideBg ? '显示底图' : '屏蔽底图' }}
                      </a-button>
                      <a-button type="text" size="small" @click="enterFullscreen">
                        全屏
                      </a-button>
                    </a-space>
                  </template>
                  <div :ref="setArchRef" :key="archKey" class="arch-wrapper">
                    <ArchitectureChart :opts="{ hideNodes, coord: coordEnabled, hideBg }" />
                  </div>
                </a-card>
              </a-col>
              <a-col :xs="24" :sm="24" :md="24" :lg="8" class="notice-column">
                <a-card class="card-container compact-card">
                  <template #title>
                    <span>通知公告（{{ notices.length }} 条）</span>
                  </template>
                  <template #extra>
                    <a-button 
                      type="text" 
                      size="small" 
                      @click="handlePlaceholderAction('通知管理')"
                    >
                      <template #icon><IconSettings /></template>
                      管理
                    </a-button>
                  </template>
                  <a-tabs class="compact-tabs">
                    <a-tab-pane key="notice" title="通知">
                      <a-skeleton v-if="loadingNotices" :animation="true" :rows="5" />
                      <template v-else>
                        <a-list v-if="notices.length > 0" :max-height="500" class="compact-list notice-list-custom">
                          <a-list-item 
                            v-for="notice in notices" 
                            :key="notice.id"
                            class="notice-list-item"
                          >
                            <div 
                              class="notice-item-inner"
                              @click="viewNotification(notice)"
                              :tabindex="0"
                              role="button"
                              @keydown.enter="viewNotification(notice)"
                              @keydown.space.prevent="viewNotification(notice)"
                              aria-label="查看通知详情"
                            >
                              <div class="notice-left-bar"></div>
                              <div class="notice-content-wrapper">
                                <div class="notice-header-row">
                                  <a-typography-text copyable class="notice-title-text">{{ notice.title }}</a-typography-text>
                                </div>
                                <div class="notice-info-row">
                                  <a-tag size="small" :color="getNoticeTypeColor(notice.type)" bordered class="notice-tag">
                                    {{ getNoticeTypeLabel(notice.type) }}
                                  </a-tag>
                                  <a-tag size="small" :color="getNoticeStatusMeta(notice.status).color" bordered class="notice-tag">
                                    {{ getNoticeStatusMeta(notice.status).label }}
                                  </a-tag>
                                  <span class="notice-time">{{ DateUtils.smartFormat(notice.publishedAt || notice.createdAt) }}</span>
                                </div>
                              </div>
                            </div>
                          </a-list-item>
                        </a-list>
                        <a-empty v-else description="暂无通知公告" style="padding: 40px 0" />
                      </template>
                      <div class="view-more-container compact">
                        <a-button 
                          type="text" 
                          size="small" 
                          @click="handlePlaceholderAction('通知列表')"
                          class="view-more-btn compact"
                        >
                          查看更多
                          <template #icon><IconArrowRise /></template>
                        </a-button>
                      </div>
                    </a-tab-pane>
                    <a-tab-pane key="todo" title="待办">
                      <a-list :max-height="240" class="compact-list">
                        <a-list-item v-for="todo in todos.slice(0, 3)" :key="todo.id" class="compact-item">
                          <a-space direction="vertical" style="width: 100%">
                            <div class="notice-title compact">
                              <a-typography-text class="compact-text">{{ todo.title }}</a-typography-text>
                            </div>
                            <a-typography-text type="secondary" class="notice-time compact">截止时间：{{ DateUtils.formatDateTime(todo.deadline) }}</a-typography-text>
                          </a-space>
                        </a-list-item>
                      </a-list>
                      <div class="view-more-container compact">
                        <a-button 
                          type="text" 
                          size="small" 
                          @click="handlePlaceholderAction('待办列表')"
                          class="view-more-btn compact"
                        >
                          查看更多
                          <template #icon><IconArrowRise /></template>
                        </a-button>
                      </div>
                    </a-tab-pane>
                  </a-tabs>
                </a-card>
              </a-col>
            </a-row>
          </a-col>
        </a-row>
      </a-layout-content>
    </a-layout>
    
    <a-drawer v-model:visible="trendDrawerVisible" width="640px" :mask-closable="true" :closable="true" :style="{ maxWidth: '90vw' }">
      <template #title>{{ currentMetric?.title }} - 近7日趋势</template>
      <div class="sparkline-container">
        <svg :width="sparkWidth" :height="sparkHeight">
          <polyline :points="sparkPoints" fill="none" stroke="#165DFF" stroke-width="2" />
        </svg>
      </div>
    </a-drawer>

    <!-- 欢迎弹窗 -->
    <HomeWelcomeModal
      v-model:visible="showWelcomeModal"
      :is-new-user="isNewUser"
    />
    
    <!-- 通知详情弹窗 -->
    <a-modal
      v-model:visible="notificationModalVisible"
      :footer="false"
      :title="null"
      :closable="false"
      :mask-closable="true"
      width="800px"
      @cancel="handleCloseNotificationModal"
      class="notification-detail-modal"
    >
      <div v-if="selectedNotification" class="home-notification-detail">
        <!-- 自定义关闭按钮 -->
        <div class="modal-close-btn" @click="handleCloseNotificationModal">
          <IconClose />
        </div>

        <!-- 首页内置通知详情（不依赖跨模块组件） -->
        <div class="home-notification-body">
          <h3 class="home-notification-title">{{ selectedNotification.title }}</h3>
          <div class="home-notification-meta">
            <a-tag size="small" :color="getNoticeTypeColor(selectedNotification.type)" bordered>
              {{ getNoticeTypeLabel(selectedNotification.type) }}
            </a-tag>
            <span class="home-notification-time">{{ DateUtils.smartFormat(selectedNotification.time) }}</span>
          </div>
          <div class="notification-article" v-html="selectedNotification.content"></div>
        </div>
      </div>
    </a-modal>
    
    <!-- 应用选择弹窗 -->
    <a-modal
      v-model:visible="showAppSelectModal"
      title="选择应用"
      width="600px"
      @cancel="showAppSelectModal = false"
      :footer="false"
    >
      <div class="app-select-content">
        <div class="app-select-header">
          <p style="margin: 0 0 16px 0; color: #86909c; font-size: 14px;">
            为位置 [第{{ selectedPosition.row }}行，第{{ selectedPosition.col }}列] 选择应用
          </p>
        </div>
        <div class="app-grid">
          <div 
            v-for="app in availableApplications" 
            :key="app.value"
            class="app-item"
            @click="handleAppSelect(app)"
          >
            <div class="app-icon">
              <component :is="getIconComponent(app.icon)" />
            </div>
            <div class="app-name">{{ app.label }}</div>
          </div>
        </div>
      </div>
    </a-modal>
  </a-layout>
</template>

<script setup>
import { ref, reactive, onMounted, markRaw, computed, watch, onErrorCaptured } from 'vue'
import ArchitectureChart from '@/components/ArchitectureChart.vue'
import HomeWelcomeModal from '@/components/HomeWelcomeModal.vue'
import DateUtils from '@/utils/date'
import {
  TOP_MENUS,
  METRICS,
  NOTICES,
  TODOS,
  APPLICATIONS,
  DEFAULT_CHANNELS,
  COMMUNITY_ITEMS,
  getNoticeTypeLabel,
  getNoticeTypeColor,
  getNoticeStatusMeta
} from '@/mock/home'
import {
  IconUser,
  IconDown,
  IconNotification,
  IconStorage,
  IconFile,
  IconCompass,
  IconApps,
  IconBook,
  IconBulb,
  IconArrowRise,
  IconArrowFall,
  IconSettings,
  IconSafe,
  IconRefresh,
  IconEdit,
  IconPlus,
  IconClose,
  IconDashboard,
  IconBarChart,
  IconCloud,
  IconUserGroup,
  IconGift,
  IconCustomerService,
  IconRobot,
  IconExperiment,
  IconLocation,
  IconHeart,
  IconFire,
  IconBug,
  IconCalendar,
  IconStar
} from '@arco-design/web-vue/es/icon'
import { Message } from '@arco-design/web-vue'

const menuConfig = Object.fromEntries(TOP_MENUS.map(item => [item.key, item]))
const topMenuOrder = TOP_MENUS.map(item => item.key)

// 当前用户信息（本地状态，不接用户中心）
const currentUser = reactive({ name: '张珊', department: '数学部', role: '数据分析师' })
const isNewUser = ref(false)

const handleMenuClick = (key) => {
  if (key !== 'home') {
    // 未接入的模块不改变选中态，避免误以为已切换页面
    Message.info(`「${menuConfig[key]?.title || key}」模块未接入本门户`)
    return
  }
  activeMenu.value = key
}

const archRef = ref(null)
const hideNodes = ref(false)
const coordEnabled = ref(false)
const hideBg = ref(false)
const setArchRef = (el) => { archRef.value = el }
const archKey = computed(() => `${hideNodes.value}-${coordEnabled.value}-${hideBg.value}`)

const enterFullscreen = () => {
  const el = archRef.value
  if (el && el.requestFullscreen) el.requestFullscreen()
}
const toggleNodes = () => { hideNodes.value = !hideNodes.value }
const toggleCoord = () => { coordEnabled.value = !coordEnabled.value }
const toggleHideBg = () => { hideBg.value = !hideBg.value }

const roleOptions = ['数据分析师', '数据管理员', '业务用户']
const departmentOptions = ['数学部', '风险管理部', '营销运营部']

const toggleUserRole = () => {
  const index = roleOptions.indexOf(currentUser.role)
  currentUser.role = roleOptions[(index + 1) % roleOptions.length]
  Message.success(`已切换角色：${currentUser.role}`)
}

const toggleDepartment = () => {
  const index = departmentOptions.indexOf(currentUser.department)
  currentUser.department = departmentOptions[(index + 1) % departmentOptions.length]
  Message.success(`已切换部门：${currentUser.department}`)
}

watch([hideNodes, coordEnabled, hideBg], ([hn, ce, hb]) => {
  console.log('[Home] toggles changed', { hideNodes: hn, coord: ce, hideBg: hb })
})

onErrorCaptured((err, instance, info) => {
  console.error('[Home] Component Error Captured:', err)
  console.error('[Home] Error Info:', info)
  // 返回 false 阻止错误继续向上传播（如果需要的话），或者让它传播到全局处理器
  return false 
})

// --- 状态定义 ---
const activeMenu = ref('home')
const showWelcomeModal = ref(false)
const notices = ref([])
const metrics = ref([])
const loadingNotices = ref(true)
const loadingMetrics = ref(true)
const notificationModalVisible = ref(false)
const selectedNotification = ref(null)
const trendDrawerVisible = ref(false)
const currentMetric = ref(null)
const quickChannels = ref([])
const editMode = ref(false)
const configModalVisible = ref(false)
const dragOverPosition = ref('')
const draggedChannel = ref(null)
const showAppSelectModal = ref(false)
const selectedPosition = ref({ row: 0, col: 0 })
const configForm = ref({ position: '', application: '' })
const configRules = {
  position: [{ required: true, message: '请选择位置', trigger: 'blur' }],
  application: [{ required: true, message: '请选择应用', trigger: 'blur' }]
}

// --- 方法定义 ---

watch(metrics, (newVal, oldVal) => {
  console.log('[home] metrics 变更', {
    oldLength: Array.isArray(oldVal) ? oldVal.length : 0,
    newLength: Array.isArray(newVal) ? newVal.length : 0
  })
})

watch(notices, (newVal, oldVal) => {
  console.log('[home] notices 变更', {
    oldLength: Array.isArray(oldVal) ? oldVal.length : 0,
    newLength: Array.isArray(newVal) ? newVal.length : 0
  })
})

watch([loadingMetrics, loadingNotices], ([lm, ln]) => {
  console.log('[home] loading 状态变更', {
    loadingMetrics: lm,
    loadingNotices: ln
  })
})

// 初始化数据
const initData = async (source = 'mounted') => {
  const ts = new Date().toISOString()
  console.log('[home] 开始初始化首页数据', {
    source,
    ts,
    metricsLengthBefore: metrics.value.length,
    noticesLengthBefore: notices.value.length
  })
  
  // 1. 首次进入展示欢迎弹窗（本地会话标记）
  try {
    isNewUser.value = sessionStorage.getItem('portal-visited') !== '1'
    showWelcomeModal.value = isNewUser.value
    sessionStorage.setItem('portal-visited', '1')
  } catch (error) {
    showWelcomeModal.value = false
  }

  // 2. 加载指标和通知
  loadingMetrics.value = true
  loadingNotices.value = true
  
  console.log('[home] 开始并行加载指标和通知', {
    source,
    ts
  })

  Promise.allSettled([
    fetchMetrics(),
    fetchNotices()
  ]).then((results) => {
    loadingMetrics.value = false
    loadingNotices.value = false
    console.log('[home] 数据加载任务结束', {
      source,
      ts,
      results: results.map(r => r.status),
      metricsLengthAfter: metrics.value.length,
      noticesLengthAfter: notices.value.length
    })
    
    results.forEach((result, index) => {
      const taskName = index === 0 ? '指标数据' : '通知数据'
      if (result.status === 'rejected') {
        console.error(`[home] ${taskName}加载失败`, result.reason)
      }
    })
  })

  // 3. 初始化快速通道
  try {
    initQuickChannelConfig()
  } catch (error) {
    console.error('初始化快速通道失败:', error)
  }
}

// 获取指标数据
const fetchMetrics = async () => {
  console.log('[home] 开始加载指标数据', {
    metricsLengthBefore: metrics.value.length
  })
  try {
    // 本地 mock 指标（保留短暂 loading 以展示骨架屏）
    await new Promise(resolve => setTimeout(resolve, 300))
    metrics.value = METRICS
    console.log('[home] 指标数据加载成功', {
      metricsLengthAfter: metrics.value.length,
      titles: metrics.value.map(m => m.title)
    })
  } catch (error) {
    console.error('[home] 获取指标失败', error)
    metrics.value = []
  }
}

// 获取通知数据
const fetchNotices = async () => {
  console.log('[home] 开始加载通知数据', {
    noticesLengthBefore: notices.value.length
  })
  try {
    // 本地 mock 通知（不调用通知中心接口）
    await new Promise(resolve => setTimeout(resolve, 300))
    notices.value = NOTICES.map(notice => ({
      ...notice,
      time: DateUtils.formatDateTime(notice.publishedAt || notice.createdAt),
      isNew: isNewNotice(notice.publishedAt || notice.createdAt)
    }))
    console.log('[home] 通知数据加载成功', {
      noticesLengthAfter: notices.value.length,
      ids: notices.value.map(n => n.id)
    })
  } catch (error) {
    console.error('[home] 获取通知失败', error)
    notices.value = []
  }
}

const isNewNotice = (publishTime) => {
  if (!publishTime) return false
  const publishDate = new Date(publishTime)
  const now = new Date()
  // 7天内算新
  return (now.getTime() - publishDate.getTime()) < 7 * 24 * 60 * 60 * 1000
}

onMounted(() => {
  initData('mounted')
})

// 刷新首页数据
const refreshHomeData = () => {
  console.log('[home] 用户手动刷新首页数据')
  initData('manual-refresh')
  Message.success({ content: '数据已刷新', duration: 3000 })
}

// 查看通知详情
const viewNotification = (notice) => {
  console.log('点击查看通知详情:', notice)
  
  // 如果通知对象中已有完整信息（来自API或Mock数据），直接使用
  if (notice.content) {
    selectedNotification.value = {
      ...notice,
      time: notice.publishTime || notice.time // 确保时间字段存在
    }
    notificationModalVisible.value = true
    return
  }
  
  // 模拟丰富的详情内容 (用于演示列表中的静态数据)
  const detailContent = `
    <div class="notification-article">
      <div class="article-section">
        <p><strong>尊敬的用户：</strong></p>
        <p>您好！这是一条关于 <strong>${notice.title}</strong> 的详细通知。</p>
        <p>为了给您提供更优质的服务体验，我们对平台进行了重要的更新和优化。本次更新主要包含以下内容：</p>
      </div>
      
      <div class="article-section">
        <h4>一、核心更新点</h4>
        <ul>
          <li><strong>功能升级：</strong> 全面提升了数据处理能力，支持更大规模的数据集分析。</li>
          <li><strong>体验优化：</strong> 优化了用户界面交互，操作更加流畅便捷。</li>
          <li><strong>安全增强：</strong> 升级了安全防护机制，为您的数据安全保驾护航。</li>
        </ul>
      </div>

      <div class="article-section">
        <h4>二、注意事项</h4>
        <p>请您注意以下事项，以免影响正常使用：</p>
        <ol>
          <li>建议您在使用新功能前，仔细阅读相关的操作指南。</li>
          <li>如遇到任何问题，请及时联系我们的技术支持团队。</li>
          <li>部分旧版本功能可能会有所调整，请留意相关公告。</li>
        </ol>
      </div>

      <div class="article-section">
        <p>我们将持续为您提供优质的产品和服务，感谢您的支持与信任！</p>
        <p style="text-align: right; margin-top: 20px;">数据社区运营团队</p>
        <p style="text-align: right;">${notice.time.split(' ')[0]}</p>
      </div>
    </div>
  `

  selectedNotification.value = {
    id: notice.id,
    title: notice.title,
    content: detailContent, // 使用 HTML 内容
    type: notice.type,
    publishTime: notice.publishTime,
    time: notice.time,
    author: '数据社区运营团队',
    isSticky: false,
    attachments: [
      {
        id: 1,
        fileName: '更新说明文档_v2.0.pdf',
        fileSize: '2.3MB',
        downloadUrl: '/files/attachment1.pdf'
      },
      {
        id: 2,
        fileName: '操作手册.docx',
        fileSize: '1.8MB',
        downloadUrl: '/files/attachment2.docx'
      }
    ]
  }
  notificationModalVisible.value = true
}

// 关闭通知弹窗
const handleCloseNotificationModal = () => {
  notificationModalVisible.value = false
  selectedNotification.value = null
}

// 待办数据（本地 mock）
const todos = ref(TODOS)

// 可用应用列表（本地 mock）
const availableApplications = APPLICATIONS

// 可用位置列表
const availablePositions = computed(() => {
  const positions = []
  for (let row = 1; row <= 3; row++) {
    for (let col = 1; col <= 3; col++) {
      if (!isFixedPosition(row, col)) {
        const channel = getChannelAtPosition(row, col)
        positions.push({
          label: `第${row}行第${col}列${channel ? ` (${channel.name})` : ''}`,
          value: `${row}-${col}`
        })
      }
    }
  }
  return positions
})

// 初始化快速通道配置
const initQuickChannelConfig = () => {
  const savedConfig = localStorage.getItem('quickChannelConfig')
  if (savedConfig) {
    try {
      quickChannels.value = JSON.parse(savedConfig).map(channel => ({
        ...channel,
        icon: typeof channel.icon === 'string' ? getIconComponent(channel.icon) : channel.icon
      }))
      return
    } catch (error) {
      console.warn('快速通道本地缓存解析失败，使用默认配置:', error)
    }
  }
  // 默认配置：首行固定3个核心服务
  quickChannels.value = DEFAULT_CHANNELS.map(channel => ({
    ...channel,
    icon: getIconComponent(channel.icon)
  }))
}

// 判断是否为固定位置（首行）
const isFixedPosition = (row, _col) => {
  return row === 1
}

// 获取指定位置的应用
const getChannelAtPosition = (row, col) => {
  return quickChannels.value.find(channel => channel.row === row && channel.col === col)
}

// 切换编辑模式
const toggleEditMode = () => {
  editMode.value = !editMode.value
}

// 打开配置弹窗
const openConfigModal = () => {
  configModalVisible.value = true
}

// 处理配置确认
const handleConfigConfirm = () => {
  const { position, application } = configForm.value
  if (position && application) {
    const [row, col] = position.split('-').map(Number)
    const app = availableApplications.find(app => app.value === application)
    if (app) {
      // 移除该位置已有的应用
      quickChannels.value = quickChannels.value.filter(channel => !(channel.row === row && channel.col === col))
      
      // 添加新应用
      quickChannels.value.push({
        id: Date.now(),
        row,
        col,
        icon: getIconComponent(app.icon),
        name: app.label
      })
      
      // 保存到本地存储
      saveQuickChannelConfig()
      
      // 重置表单
      configForm.value = { position: '', application: '' }
      configModalVisible.value = false
    }
  }
}

// 处理配置弹窗取消 - 修复取消按钮无法关闭弹窗的问题
const handleConfigModalCancel = () => {
  configForm.value = { position: '', application: '' }
  configModalVisible.value = false
}

// 获取图标组件
const getIconComponent = (iconName) => {
  const iconMap = {
    'IconDashboard': markRaw(IconDashboard),
    'IconUserGroup': markRaw(IconUserGroup),
    'IconCompass': markRaw(IconCompass),
    'IconGift': markRaw(IconGift),
    'IconBarChart': markRaw(IconBarChart),
    'IconCloud': markRaw(IconCloud),
    'IconCustomerService': markRaw(IconCustomerService),
    'IconBulb': markRaw(IconBulb),
    'IconRobot': markRaw(IconRobot),
    'IconExperiment': markRaw(IconExperiment),
    'IconLocation': markRaw(IconLocation),
    'IconHeart': markRaw(IconHeart),
    'IconFire': markRaw(IconFire),
    'IconDatabase': markRaw(IconStorage),
    'IconBook': markRaw(IconBook),
    'IconNotification': markRaw(IconNotification),
    'IconSafe': markRaw(IconSafe),
    'IconApps': markRaw(IconApps),
    'IconBug': markRaw(IconBug),
    'IconCalendar': markRaw(IconCalendar),
    'IconStar': markRaw(IconStar)
  }
  return iconMap[iconName] || markRaw(IconApps)
}

// 拖拽开始
const handleDragStart = (row, col, event) => {
  const channel = getChannelAtPosition(row, col)
  if (channel && !isFixedPosition(row, col)) {
    draggedChannel.value = { ...channel, sourceRow: row, sourceCol: col }
    event.dataTransfer.effectAllowed = 'move'
  }
}

// 拖拽经过
const handleDragOver = (row, col, event) => {
  if (editMode.value && !isFixedPosition(row, col)) {
    event.preventDefault()
    dragOverPosition.value = `${row}-${col}`
  }
}

// 拖拽放下
const handleDrop = (row, col, event) => {
  event.preventDefault()
  if (draggedChannel.value && !isFixedPosition(row, col)) {
    // 移除源位置的应用
    quickChannels.value = quickChannels.value.filter(channel => 
      !(channel.row === draggedChannel.value.sourceRow && channel.col === draggedChannel.value.sourceCol)
    )
    
    // 移动目标位置的应用到源位置（如果有的话）
    const targetChannel = getChannelAtPosition(row, col)
    if (targetChannel) {
      targetChannel.row = draggedChannel.value.sourceRow
      targetChannel.col = draggedChannel.value.sourceCol
    }
    
    // 更新拖拽应用的位置
    const draggedItem = quickChannels.value.find(channel => channel.id === draggedChannel.value.id)
    if (draggedItem) {
      draggedItem.row = row
      draggedItem.col = col
    }
    
    // 保存配置
    saveQuickChannelConfig()
  }
  dragOverPosition.value = ''
  draggedChannel.value = null
}

// 拖拽结束
const handleDragEnd = () => {
  dragOverPosition.value = ''
  draggedChannel.value = null
}

// 移除应用
const removeChannel = (row, col) => {
  quickChannels.value = quickChannels.value.filter(channel => !(channel.row === row && channel.col === col))
  saveQuickChannelConfig()
}

// 处理应用点击
const handleChannelClick = (channel, row, col) => {
  if (!channel) {
    // 点击未配置按钮，触发应用选择弹窗
    handleEmptyChannelClick(row, col)
    return
  }
  
  if (channel) {
    Message.info(`「${channel.name}」未接入本门户`)
  }
}

// 保存配置到本地存储
const saveQuickChannelConfig = () => {
  localStorage.setItem('quickChannelConfig', JSON.stringify(quickChannels.value))
}

// 处理未配置按钮点击
const handleEmptyChannelClick = (row, col) => {
  if (editMode.value) return // 编辑模式下不触发弹窗
  selectedPosition.value = { row, col }
  showAppSelectModal.value = true
}

// 处理应用选择
const handleAppSelect = (application) => {
  const { row, col } = selectedPosition.value

  // 同一位置只保留一个应用
  quickChannels.value = quickChannels.value.filter(
    channel => !(channel.row === row && channel.col === col)
  )
  quickChannels.value.push({
    id: Date.now(),
    row,
    col,
    icon: getIconComponent(application.icon),
    name: application.label
  })

  saveQuickChannelConfig()
  showAppSelectModal.value = false
  Message.success(`已添加 ${application.label} 到快速通道`)
}

// 社区加油站按钮点击处理
const handleCommunityClick = (item) => {
  if (!item) return
  Message.info(`「${item.title}」未接入本门户`)
}

// 未接入模块的统一占位提示
const handlePlaceholderAction = (name) => {
  Message.info(`「${name}」未接入本门户`)
}

// 社区加油站数据（本地 mock，无跳转）
const communityItems = ref(
  COMMUNITY_ITEMS.map(item => ({ ...item, icon: getIconComponent(item.icon) }))
)

const sparkWidth = 600
const sparkHeight = 120
const sparkPoints = computed(() => {
  const data = (currentMetric.value?.trendSeries || [1,2,3,2,4,3,5])
  const step = sparkWidth / (data.length - 1)
  const max = Math.max(...data)
  const min = Math.min(...data)
  const scaleY = (v) => sparkHeight - ((v - min) / (max - min + 1e-6)) * (sparkHeight - 10)
  return data.map((v, i) => `${i * step},${scaleY(v)}`).join(' ')
})

const openMetricTrend = (metric) => {
  currentMetric.value = metric
  trendDrawerVisible.value = true
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
  min-width: 320px;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

/* 优化内容区域布局 */
.content {
  padding: 16px;
  background: transparent;
  height: calc(100vh - 72px);
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 优化欢迎横幅 */
.welcome-banner {
  margin-bottom: 20px;
  padding: 16px 24px;
  background: linear-gradient(135deg, rgba(22, 93, 255, 0.08) 0%, rgba(114, 46, 209, 0.08) 100%);
  border-radius: 12px;
  border: 1px solid var(--color-border-1);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.banner-content {
  display: flex;
  align-items: center;
  z-index: 2;
}

.welcome-text h1 {
  font-size: 22px;
  font-weight: 600;
  margin: 0;
  background: linear-gradient(135deg, #165dff 0%, #722ed1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 主内容布局优化 */
.main-content-row {
  flex: 1;
  min-height: 0;
  display: flex;
}

.left-column,
.right-column {
  display: flex;
  flex-direction: column;
}

.left-column .card-container:last-child {
  margin-bottom: 0;
  flex: 1;
}

.right-column > .card-container {
  margin-bottom: 20px;
}

.right-column > .card-container:last-child {
  margin-bottom: 0;
}

.bottom-row {
  flex: 1;
  min-height: 0;
  display: flex;
  margin-top: 0;
}

.architecture-column,
.notice-column {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* 统一卡片样式 */
.card-container {
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--color-border-2);
  background: var(--color-bg-2);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.04);
  margin-bottom: 20px;
  overflow: hidden;
}

.card-container:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.card-container :deep(.arco-card-header) {
  min-height: 48px;
  padding: 0 20px;
  border-bottom: 1px solid var(--color-border-1);
  background: var(--color-bg-2);
}

.card-container :deep(.arco-card-header-title) {
  font-size: 15px;
  font-weight: 600;
  color: #1D2129;
}

.card-container :deep(.arco-card-body) {
  padding: 20px;
}

.architecture-column .card-container,
.notice-column .card-container {
  height: 100%;
  margin-bottom: 0;
}

.architecture-column :deep(.arco-card-body),
.notice-column :deep(.arco-card-body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.architecture-chart {
  flex: 1;
  min-height: 0;
}
.arch-wrapper {
  position: relative;
  overflow: visible;
}

.compact-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.compact-tabs :deep(.arco-tabs-content) {
  flex: 1;
  min-height: 0;
}

.compact-list {
  flex: 1;
  min-height: 0;
}

/* 在线状态指示器 */
.online-indicator {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 16px;
  height: 16px;
  background: #00d084;
  border-radius: 50%;
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(0, 208, 132, 0.3);
}

/* 用户统计数据 */
.user-stats {
  display: flex;
  justify-content: space-around;
  margin: 20px 0;
  padding: 16px;
  background: linear-gradient(135deg, rgba(22, 93, 255, 0.05) 0%, rgba(114, 46, 209, 0.05) 100%);
  border-radius: 12px;
  border: 1px solid rgba(22, 93, 255, 0.1);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #165dff;
}

.stat-label {
  font-size: 12px;
  color: #86909c;
  font-weight: 500;
}

.quick-actions {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(229, 230, 235, 0.4);
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 6px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  background: rgba(255, 255, 255, 0.5);
  flex: 1;
}

.action-item:hover {
  background: rgba(22, 93, 255, 0.08);
  transform: translateY(-2px);
}

.action-icon {
  font-size: 20px;
  color: #165dff;
  transition: all 0.3s;
}

.action-item:hover .action-icon {
  transform: scale(1.1);
  color: #722ed1;
}

.action-item span {
  font-size: 10px;
  color: #4e5969;
  font-weight: 500;
}

.metric-cards {
  margin-bottom: 24px;
}

.metric-card {
  height: 140px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 8px;
  border: 1px solid var(--color-border-1);
  background: var(--color-fill-1);
  cursor: pointer;
}

.metric-card:hover {
  background: var(--color-fill-2);
  border-color: var(--color-primary-light-3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.metric-card :deep(.arco-statistic-title) {
  font-size: 13px;
  color: #4E5969;
  margin-bottom: 8px;
}

.metric-card :deep(.arco-statistic-value) {
  font-weight: 700;
  color: #1D2129;
}

.header {
  height: 72px;
  padding: 0 40px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.nav-menu {
  flex: 1;
  margin: 0 64px;
}

.nav-menu :deep(.arco-menu) {
  background: transparent;
  border-bottom: none;
}

.nav-menu :deep(.arco-menu-item) {
  font-size: 15px;
  padding: 0 28px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 12px;
  margin: 0 4px;
}

.nav-menu :deep(.arco-menu-item:hover) {
  background: rgba(22, 93, 255, 0.1);
  color: #165dff;
}


.identity-info {
  padding: 20px;
  background: linear-gradient(135deg, rgba(22, 93, 255, 0.05) 0%, rgba(114, 46, 209, 0.05) 100%);
  border-radius: 16px;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.user-details {
  flex: 1;
  text-align: left;
}

.avatar-container {
  width: 60px;
  height: 60px;
  position: relative;
  border-radius: 50%;
  box-shadow: 0 6px 20px rgba(22, 93, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.8);
  flex-shrink: 0;
}

.user-name {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
  background: linear-gradient(135deg, #165dff 0%, #722ed1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.department {
  margin: 0;
  font-size: 13px;
  color: #86909c;
  font-weight: 500;
}

.user-stats {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  flex: 1;
  transition: all 0.3s;
}

.stat-item:hover {
  background: rgba(22, 93, 255, 0.08);
  transform: translateY(-2px);
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #165dff;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #86909c;
  font-weight: 500;
}



/* 快速通道网格布局 */
.quick-channel-grid {
  padding: 16px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(10px);
}

.channel-grid-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}

.channel-grid-row:last-child {
  margin-bottom: 0;
}

.channel-grid-item {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
}

.channel-grid-item:hover {
  background: linear-gradient(135deg, rgba(22, 93, 255, 0.08) 0%, rgba(114, 46, 209, 0.08) 100%);
  transform: translateY(-1px) scale(1.02);
  box-shadow: 0 4px 15px rgba(22, 93, 255, 0.12);
  border-color: rgba(22, 93, 255, 0.3);
}

.channel-grid-item.fixed-item {
  background: linear-gradient(135deg, rgba(22, 93, 255, 0.1) 0%, rgba(22, 93, 255, 0.05) 100%);
  border-color: rgba(22, 93, 255, 0.4);
}

.channel-grid-item.fixed-item:hover {
  background: linear-gradient(135deg, rgba(22, 93, 255, 0.15) 0%, rgba(22, 93, 255, 0.1) 100%);
}

.channel-grid-item.draggable {
  cursor: move;
}

.channel-grid-item.drag-over {
  background: linear-gradient(135deg, rgba(22, 93, 255, 0.2) 0%, rgba(114, 46, 209, 0.2) 100%);
  border-color: rgba(22, 93, 255, 0.6);
  transform: scale(1.05);
}

.channel-item-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
  width: 100%;
}

.channel-icon {
  font-size: 32px;
  color: #165dff;
  filter: drop-shadow(0 2px 4px rgba(22, 93, 255, 0.2));
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.channel-grid-item:hover .channel-icon {
  transform: scale(1.1);
  color: #722ed1;
}

.channel-name {
  font-size: 13px;
  color: #4e5969;
  font-weight: 500;
  line-height: 1.1;
  transition: all 0.3s;
}

.channel-grid-item:hover .channel-name {
  color: #165dff;
}

.add-channel-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #86909c;
  font-size: 12px;
}

.add-icon {
  font-size: 24px;
  color: #c9cdd4;
  transition: all 0.3s;
}

.channel-grid-item:hover .add-icon {
  color: #165dff;
  transform: scale(1.1);
}

.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(245, 63, 63, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: all 0.3s;
}

.channel-grid-item:hover .remove-btn {
  opacity: 1;
}

.remove-icon {
  font-size: 12px;
  color: white;
}

.remove-btn:hover {
  background: rgba(245, 63, 63, 1);
  transform: scale(1.1);
}

/* 编辑模式样式 */
.quick-channel-grid.edit-mode .channel-grid-item:not(.fixed-item) {
  border-style: dashed;
  border-color: rgba(22, 93, 255, 0.4);
}

.quick-channel-grid.edit-mode .channel-grid-item:not(.fixed-item):hover {
  border-color: rgba(22, 93, 255, 0.8);
}

/* 紧凑布局样式 */
.compact-card {
  margin-bottom: 12px;
}

.compact-card :deep(.arco-card-header) {
  min-height: 40px;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 500;
}

.compact-card :deep(.arco-card-body) {
  padding: 12px;
}

/* 紧凑身份卡片 */
.identity-info.compact {
  padding: 8px;
}

.user-profile.compact {
  margin-bottom: 8px;
  gap: 8px;
}

.avatar-container.compact {
  width: 40px;
  height: 40px;
}

.user-details.compact .user-name {
  font-size: 14px;
  margin-bottom: 2px;
}

.user-details.compact .department {
  font-size: 10px;
}

.quick-actions.compact {
  margin-top: 8px;
  padding-top: 8px;
  gap: 4px;
}

.action-item.compact {
  padding: 4px 2px;
  gap: 2px;
}

.action-item.compact .action-icon {
  font-size: 14px;
}

.action-item.compact span {
  font-size: 8px;
}

/* 紧凑快速通道 */
.quick-channel-grid.compact {
  padding: 8px;
  gap: 4px;
}

.channel-grid-row.compact {
  gap: 4px;
  margin-bottom: 4px;
}

.channel-grid-item.compact {
  padding: 8px 4px;
  border-radius: 6px;
  aspect-ratio: 1.6; /* 更扁平的矩形比例，减少高度 */
  min-height: 50px; /* 进一步降低最小高度 */
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%);
  border: 1px solid rgba(255, 255, 255, 0.5);
  position: relative; /* 为点击提示提供定位基础 */
}

.channel-icon.compact {
  font-size: 18px;
  margin-bottom: 3px;
}

.channel-name.compact {
  font-size: 9px;
  line-height: 1.1;
  font-weight: 500;
}

.add-channel-placeholder.compact {
  gap: 6px;
}

.add-icon.compact {
  font-size: 20px;
}

.remove-btn.compact {
  width: 16px;
  height: 16px;
  top: 2px;
  right: 2px;
}

.remove-icon.compact {
  font-size: 10px;
}

/* 紧凑社区加油站 */
.community-gas-station {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gas-station-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: linear-gradient(135deg, rgba(22, 93, 255, 0.05) 0%, rgba(114, 46, 209, 0.05) 100%);
  border-radius: 8px;
}

.station-info h4 {
  margin: 0;
  font-size: 14px;
  color: #1d2129;
  font-weight: 600;
}

.station-info p {
  margin: 0;
  font-size: 12px;
  color: #86909c;
}

.gas-station-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.station-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.station-item:hover {
  background: rgba(22, 93, 255, 0.08);
  transform: translateX(4px);
}

.item-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #165dff 0%, #722ed1 100%);
  border-radius: 6px;
  color: white;
  font-size: 16px;
}

.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-title {
  font-size: 13px;
  font-weight: 500;
  color: #1d2129;
}

/* 通知详情优化样式 */
.notification-detail-modal :deep(.arco-modal-body) {
  padding: 0;
  background: #f7f8fa;
}

.home-notification-detail {
  padding: 0;
  position: relative;
}

.home-notification-body {
  padding: 8px 4px 0;
}

.home-notification-title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-1);
}

.home-notification-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.home-notification-time {
  color: var(--color-text-3);
  font-size: 12px;
}

.modal-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #86909c;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s;
  z-index: 10;
}

.modal-close-btn:hover {
  background-color: #f2f3f5;
  color: #1d2129;
}

.detail-header {
  text-align: center;
  margin-bottom: 8px;
}

.detail-title {
  font-size: 24px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 16px;
  line-height: 1.4;
}

.detail-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #86909c;
  font-size: 13px;
}

.meta-item {
  display: flex;
  align-items: center;
}

.detail-content {
  font-size: 14px;
  color: #1d2129;
  line-height: 1.8;
  min-height: 200px;
}

.attachment-title {
  font-weight: 500;
  color: #1d2129;
  margin-bottom: 12px;
  font-size: 14px;
}

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachment-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background-color: #f7f8fa;
  border-radius: 4px;
  transition: all 0.2s;
}

.attachment-item:hover {
  background-color: #f2f3f5;
}

.attachment-icon {
  font-size: 24px;
  color: #165dff;
  margin-right: 12px;
}

.attachment-info {
  flex: 1;
}

.attachment-name {
  font-size: 14px;
  color: #1d2129;
  margin-bottom: 2px;
}

.attachment-size {
  font-size: 12px;
  color: #86909c;
}

.download-btn {
  color: #165dff;
}

.download-btn:hover {
  background-color: transparent;
  color: #0e42d2;
}


.item-desc {
  font-size: 11px;
  color: #86909c;
}

/* 紧凑指标卡片 */
.metric-cards.compact {
  margin-bottom: 12px;
}

.metric-card.compact {
  height: 85px; /* 进一步降低卡片高度 */
  border-radius: 6px;
}

.metric-card.compact :deep(.arco-card-body) {
  padding: 10px;
}

.metric-content.compact {
  gap: 4px;
}

.metric-content.compact :deep(.arco-statistic-title) {
  font-size: 11px;
  margin-bottom: 2px;
}

.metric-content.compact :deep(.arco-statistic-value) {
  font-size: 16px;
}

.comparison-data.compact {
  padding: 3px 6px;
  font-size: 9px;
  margin-top: 2px;
}

/* 应用选择弹窗样式 */
.app-select-content {
  padding: 16px 0;
}

.app-select-header {
  margin-bottom: 20px;
  text-align: center;
}

.app-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.app-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%);
  border: 1px solid rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
  min-height: 100px;
  gap: 12px;
}

.app-item:hover {
  background: linear-gradient(135deg, rgba(22, 93, 255, 0.08) 0%, rgba(114, 46, 209, 0.08) 100%);
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 25px rgba(22, 93, 255, 0.15);
  border-color: rgba(22, 93, 255, 0.3);
}

.app-item:active {
  transform: translateY(0) scale(0.98);
}

.app-icon {
  font-size: 32px;
  color: #165dff;
  filter: drop-shadow(0 2px 4px rgba(22, 93, 255, 0.2));
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, rgba(22, 93, 255, 0.1) 0%, rgba(114, 46, 209, 0.1) 100%);
  border-radius: 50%;
}

.app-item:hover .app-icon {
  transform: scale(1.1);
  color: #722ed1;
  background: linear-gradient(135deg, rgba(22, 93, 255, 0.15) 0%, rgba(114, 46, 209, 0.15) 100%);
}

.app-name {
  font-size: 14px;
  color: #4e5969;
  font-weight: 500;
  text-align: center;
  line-height: 1.3;
  transition: all 0.3s;
}

.app-item:hover .app-name {
  color: #165dff;
}

/* 未配置按钮可点击状态优化 */
.channel-grid-item:not(.fixed-item) .channel-item-content.compact {
  cursor: pointer;
}

.channel-grid-item:not(.fixed-item):hover .add-channel-placeholder {
  transform: scale(1.1);
  opacity: 0.8;
}

.channel-grid-item:not(.fixed-item) .channel-name {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.channel-grid-item:not(.fixed-item):hover .channel-name {
  color: #165dff;
  transform: translateY(-1px);
}

/* 点击提示样式 */
.click-hint {
  position: absolute;
  top: 4px;
  right: 4px;
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.channel-grid-item:not(.fixed-item):hover .click-hint {
  opacity: 0.6;
}

.hint-icon {
  font-size: 12px;
  color: #165dff;
}

/* 社区加油站横向按钮布局 */
.community-gas-station-horizontal {
  padding: 4px 0;
}

.gas-station-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  align-items: stretch;
}

.gas-station-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 5px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%);
  border: 1px solid rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
  min-height: 55px; /* 降低高度以匹配快速通道 */
  gap: 5px;
}

.gas-station-btn:hover {
  background: linear-gradient(135deg, rgba(22, 93, 255, 0.08) 0%, rgba(114, 46, 209, 0.08) 100%);
  transform: translateY(-1px) scale(1.02);
  box-shadow: 0 4px 15px rgba(22, 93, 255, 0.12);
  border-color: rgba(22, 93, 255, 0.3);
}

.gas-station-btn:active {
  transform: translateY(0) scale(0.98);
}

.btn-icon {
  font-size: 20px;
  color: #165dff;
  filter: drop-shadow(0 2px 4px rgba(22, 93, 255, 0.2));
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, rgba(22, 93, 255, 0.1) 0%, rgba(114, 46, 209, 0.1) 100%);
  border-radius: 50%;
  margin-bottom: 3px;
}

.gas-station-btn:hover .btn-icon {
  transform: scale(1.05);
  color: #722ed1;
  background: linear-gradient(135deg, rgba(22, 93, 255, 0.12) 0%, rgba(114, 46, 209, 0.12) 100%);
}

.btn-text {
  font-size: 10px;
  color: #4e5969;
  font-weight: 500;
  line-height: 1.1;
  transition: all 0.3s;
  text-align: center;
}

.gas-station-btn:hover .btn-text {
  color: #165dff;
}

/* 通知详情弹窗样式 */
.notification-detail-modal :deep(.arco-modal-body) {
  padding: 0;
  background: #f7f8fa;
}

.home-notification-detail {
  padding: 0;
  position: relative;
}

.detail-summary {
  margin: 16px 0;
  padding: 12px 16px;
  background-color: #f7f8fa;
  border-left: 4px solid #165dff;
  border-radius: 4px;
  color: #4e5969;
  font-size: 14px;
  line-height: 1.6;
}

.detail-assets {
  margin: 16px 0;
  padding: 16px;
  background-color: #e8f3ff;
  border-radius: 8px;
  border: 1px dashed #165dff;
}

.assets-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #165dff;
  font-weight: 600;
  margin-bottom: 12px;
  font-size: 14px;
}

.assets-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-tags {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f2f3f5;
}

.notification-article {
  font-size: 15px;
  line-height: 1.8;
  color: #1d2129;
}

.notification-article p {
  margin-bottom: 16px;
}

.notification-article img {
  max-width: 100%;
  border-radius: 4px;
  margin: 12px 0;
}

.detail-attachments {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #f2f3f5;
}

.btn-text {
  font-size: 11px;
  color: #4e5969;
  font-weight: 500;
  text-align: center;
  line-height: 1.2;
  transition: all 0.3s;
}

.gas-station-btn:hover .btn-text {
  color: #165dff;
}

/* 紧凑通知公告 */
.bottom-row.compact {
  margin-top: 0;
}

.compact-tabs :deep(.arco-tabs-header) {
  margin-bottom: 12px;
}

.compact-tabs :deep(.arco-tabs-tab) {
  padding: 6px 12px;
  font-size: 13px;
}

.compact-list {
  margin-bottom: 8px;
}

.compact-list :deep(.arco-list-item) {
  padding: 8px 0;
  min-height: auto;
}

.compact-item {
  padding: 6px 0 !important;
}

.compact-text {
  font-size: 13px;
  line-height: 1.4;
}

.compact-tag {
  font-size: 10px;
  height: 20px;
  line-height: 20px;
  padding: 0 6px;
}

.notice-time.compact {
  font-size: 11px;
}

.notice-title.compact {
  margin-bottom: 4px;
}

.view-more-container.compact {
  margin-top: 8px;
  padding-top: 8px;
}

.view-more-btn.compact {
  font-size: 11px;
  padding: 2px 6px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .channel-grid-row.compact {
    gap: 3px;
  }
  
  .channel-grid-item.compact {
    padding: 6px;
    min-height: 45px;
    border-radius: 5px;
  }
  
  .channel-icon.compact {
    font-size: 16px;
    margin-bottom: 2px;
  }
  
  .channel-name.compact {
    font-size: 8px;
  }
  
  .gas-station-buttons {
    gap: 6px;
  }
  
  .gas-station-btn {
    padding: 8px 4px;
    min-height: 50px;
    border-radius: 6px;
  }
  
  .btn-icon {
    width: 24px;
    height: 24px;
    font-size: 16px;
  }
  
  .btn-text {
    font-size: 9px;
  }
  
  .compact-card :deep(.arco-card-header) {
    min-height: 36px;
    padding: 6px 10px;
  }
  
  .compact-card :deep(.arco-card-body) {
    padding: 10px;
  }
  
  .metric-card.compact {
    height: 75px;
  }
  
  .metric-content.compact :deep(.arco-statistic-title) {
    font-size: 10px;
  }
  
  .metric-content.compact :deep(.arco-statistic-value) {
    font-size: 14px;
  }
}

@media (max-width: 768px) {
  .main-content-row {
    flex-direction: column;
  }
  
  .left-column,
  .right-column {
    width: 100%;
  }
  
  .channel-grid-row.compact {
    gap: 2px;
  }
  
  .channel-grid-item.compact {
    padding: 4px;
    border-radius: 4px;
    min-height: 40px;
  }
  
  .channel-icon.compact {
    font-size: 14px;
    margin-bottom: 1px;
  }
  
  .channel-name.compact {
    font-size: 7px;
  }
  
  .quick-channel-grid.compact {
    padding: 4px;
  }
  
  .gas-station-buttons {
    gap: 4px;
  }
  
  .gas-station-btn {
    padding: 6px 3px;
    min-height: 45px;
    border-radius: 5px;
  }
  
  .btn-icon {
    width: 20px;
    height: 20px;
    font-size: 14px;
    margin-bottom: 1px;
  }
  
  .btn-text {
    font-size: 8px;
  }
  
  .metric-card.compact {
    height: 65px;
  }
  
  .metric-content.compact :deep(.arco-statistic-title) {
    font-size: 9px;
  }
  
  .metric-content.compact :deep(.arco-statistic-value) {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .channel-grid-row.compact {
    gap: 2px;
  }
  
  .channel-grid-item.compact {
    padding: 3px;
    border-radius: 3px;
    min-height: 35px;
  }
  
  .channel-icon.compact {
    font-size: 12px;
  }
  
  .channel-name.compact {
    font-size: 7px;
  }
  
  .compact-card :deep(.arco-card-header) {
    padding: 6px 8px;
    min-height: 32px;
  }
  
  .compact-card :deep(.arco-card-body) {
    padding: 8px;
  }
  
  .gas-station-buttons {
    gap: 3px;
  }
  
  .gas-station-btn {
    padding: 4px 2px;
    min-height: 40px;
    border-radius: 4px;
  }
  
  .btn-icon {
    width: 16px;
    height: 16px;
    font-size: 12px;
  }
  
  .btn-text {
    font-size: 7px;
  }
  
  .identity-info.compact {
    padding: 6px;
  }
  
  .user-profile.compact {
    margin-bottom: 6px;
    gap: 6px;
  }
  
  .avatar-container.compact {
    width: 32px;
    height: 32px;
  }
  
  .user-details.compact .user-name {
    font-size: 12px;
  }
  
  .user-details.compact .department {
    font-size: 9px;
  }
  
  .quick-actions.compact {
    margin-top: 6px;
    padding-top: 6px;
    gap: 3px;
  }
  
  .action-item.compact {
    padding: 3px 1px;
    gap: 1px;
  }
  
  .action-item.compact .action-icon {
    font-size: 10px;
  }
  
  .action-item.compact span {
    font-size: 7px;
  }
}



.community-links-compact {
  padding: 8px 0;
}

.community-row {
  display: flex;
  gap: 8px;
  justify-content: space-between;
}

.community-item-compact {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 6px;
  border-radius: 6px;
  background: #f8f9fa;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  flex: 1;
  min-width: 0;
}

.community-item-compact:hover {
  background: #e9ecef;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.community-item-compact span {
  font-size: 12px;
  color: #333;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.community-icon-compact {
  font-size: 16px;
  color: #1890ff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}

.community-icon-compact:hover {
  transform: scale(1.1);
}

/* 查看更多按钮样式 */
.view-more-container {
  margin-top: 12px;
  text-align: center;
  border-top: 1px solid #f0f0f0;
  padding-top: 12px;
}

.view-more-btn {
  color: #165dff;
  font-size: 12px;
  padding: 4px 8px;
  height: auto;
  transition: all 0.2s ease;
}

.view-more-btn:hover {
  color: #0e42d2;
  background-color: rgba(22, 93, 255, 0.05);
}

.metric-card :deep(.arco-card-body) {
  padding: 24px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%);
}

.metric-card :deep(.arco-statistic-title) {
  font-size: 14px;
  margin-bottom: 12px;
  color: #86909c;
  font-weight: 500;
}

.metric-card :deep(.arco-statistic-value) {
  font-size: 28px;
  font-weight: 600;
  background: linear-gradient(135deg, #165dff 0%, #722ed1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.metric-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comparison-data {
  display: flex;
  justify-content: center;
  font-size: 12px;
  color: #86909c;
  padding: 8px 16px;
  background: rgba(22, 93, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(22, 93, 255, 0.1);
}

.comparison-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.architecture-chart {
  height: 320px;
  background-image: url('/architecture.svg');
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  width: 100%;
  border-radius: 16px;
  background-color: rgba(22, 93, 255, 0.02);
  border: 1px solid rgba(22, 93, 255, 0.1);
  transition: all 0.3s;
}

.architecture-chart:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 24px rgba(22, 93, 255, 0.1);
}

.notice-title {
  font-size: 14px;
  color: #1d2129;
  font-weight: 500;
  line-height: 1.5;
  transition: color 0.3s;
}

.notice-title:hover {
  color: #165dff;
}

/* 自定义通知列表样式 */
.notice-list-custom .notice-list-item {
  padding: 12px 0 !important;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 1px solid var(--color-neutral-3);
}

.notice-list-custom .notice-list-item:hover {
  background-color: var(--color-fill-2);
}

.notice-item-inner {
  display: flex;
  align-items: stretch;
  width: 100%;
}

.notice-left-bar {
  width: 3px;
  background-color: #165dff;
  margin-right: 12px;
  border-radius: 2px;
  flex-shrink: 0;
}

.notice-content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
}

.notice-header-row {
  display: flex;
  align-items: center;
}

.notice-title-text {
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
  line-height: 1.4;
}

.notice-info-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.notice-tag {
  border-radius: 2px;
  font-size: 12px;
}

.notice-time {
  font-size: 12px;
  color: #86909c;
}

.detail-summary {
  margin: 16px 0;
  padding: 12px 16px;
  background-color: #f7f8fa;
  border-left: 4px solid #165dff;
  border-radius: 4px;
  color: #4e5969;
  font-size: 14px;
  line-height: 1.6;
}

.detail-assets {
  margin: 16px 0;
  padding: 16px;
  background-color: #e8f3ff;
  border-radius: 8px;
  border: 1px dashed #165dff;
}

.assets-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: #1d2129;
  display: flex;
  align-items: center;
  gap: 8px;
}

.assets-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-tags {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f2f3f5;
}

/* 详情弹窗样式 */
:deep(.notification-article) {
  font-size: 14px;
  line-height: 1.8;
  color: #1d2129;
}
:deep(.notification-article p) {
  margin-bottom: 12px;
}
:deep(.notification-article ul), :deep(.notification-article ol) {
  margin-bottom: 12px;
  padding-left: 20px;
}
:deep(.notification-article li) {
  margin-bottom: 4px;
}
:deep(.article-section) {
  margin-bottom: 24px;
}
:deep(.article-section h4) {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #1d2129;
}

</style>
