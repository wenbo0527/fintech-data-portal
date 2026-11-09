<template>
  <div class="unified-metrics">
    <DetailHeader title="指标中心" :back-enabled="false">
      <template #extra-actions>
        <a-space>
        <a-button type="primary" @click="showCreateModal = true">
          <template #icon>
            <IconPlus />
          </template>
          新建指标
        </a-button>
        <a-button @click="goToBatchRegistration">
          <template #icon>
            <IconUpload />
          </template>
          批量注册
        </a-button>
        <a-button @click="goToRegulatoryConfig" v-if="currentMetricType === MetricType.REGULATORY">
          <template #icon>
            <IconSettings />
          </template>
          监管配置
        </a-button>
        <a-button @click="exportMetrics">
          <template #icon>
            <IconDownload />
          </template>
          导出
        </a-button>
        <a-button @click="toggleFavoriteFilter" :type="searchForm.onlyFavorite ? 'primary' : 'secondary'">
          <template #icon>
            <IconStarFill v-if="searchForm.onlyFavorite" />
            <IconStar v-else />
          </template>
          {{ searchForm.onlyFavorite ? '显示全部' : '仅看收藏' }}
        </a-button>
      </a-space>
      </template>
    </DetailHeader>

    <!-- 指标类型切换Tab -->
    <a-tabs 
      v-model:active-key="currentMetricType" 
      @change="handleMetricTypeChange"
      class="metric-type-tabs"
    >
      <a-tab-pane :key="MetricType.BUSINESS_CORE" :title="METRIC_TYPE_LABELS[MetricType.BUSINESS_CORE]" />
      <a-tab-pane :key="MetricType.REGULATORY" :title="METRIC_TYPE_LABELS[MetricType.REGULATORY]" />
    </a-tabs>

    <!-- 搜索和筛选 -->
    <div class="search-section">
      <a-row :gutter="16">
          <a-col :span="6">
            <a-input
              v-model="searchKeyword"
              placeholder="搜索指标名称或编码"
              allow-clear
              @press-enter="handleSearch"
            />
          </a-col>
          <a-col :span="4">
            <a-select
              v-model="selectedCategory"
              placeholder="指标分类"
              allow-clear
              @change="handleSearch"
            >
              <a-option value="business">业务指标</a-option>
              <a-option value="technical">技术指标</a-option>
              <a-option value="financial">财务指标</a-option>
              <a-option value="risk">风险指标</a-option>
            </a-select>
          </a-col>
          <a-col :span="4" v-if="currentMetricType === MetricType.BUSINESS_CORE">
            <a-select
              v-model="selectedDomain"
              placeholder="业务域"
              allow-clear
              @change="handleSearch"
            >
              <a-option value="user">用户域</a-option>
              <a-option value="transaction">交易域</a-option>
              <a-option value="product">产品域</a-option>
              <a-option value="retention">留存域</a-option>
              <a-option value="conversion">转化域</a-option>
            </a-select>
          </a-col>
          <a-col :span="4" v-if="currentMetricType === MetricType.REGULATORY">
            <a-select
              v-model="searchForm.regulatoryCategory"
              placeholder="监管报表大类"
              allow-clear
              @change="handleSearch"
            >
              <a-option :value="RegulatoryCategory.CAPITAL_ADEQUACY">{{ REGULATORY_CATEGORY_LABELS[RegulatoryCategory.CAPITAL_ADEQUACY] }}</a-option>
              <a-option :value="RegulatoryCategory.LIQUIDITY_RISK">{{ REGULATORY_CATEGORY_LABELS[RegulatoryCategory.LIQUIDITY_RISK] }}</a-option>
              <a-option :value="RegulatoryCategory.CREDIT_RISK">{{ REGULATORY_CATEGORY_LABELS[RegulatoryCategory.CREDIT_RISK] }}</a-option>
              <a-option :value="RegulatoryCategory.MARKET_RISK">{{ REGULATORY_CATEGORY_LABELS[RegulatoryCategory.MARKET_RISK] }}</a-option>
              <a-option :value="RegulatoryCategory.OPERATIONAL_RISK">{{ REGULATORY_CATEGORY_LABELS[RegulatoryCategory.OPERATIONAL_RISK] }}</a-option>
            </a-select>
          </a-col>
          <a-col :span="4">
            <a-select
              v-model="selectedStatus"
              placeholder="状态"
              allow-clear
              @change="handleSearch"
            >
              <a-option value="active">启用</a-option>
              <a-option value="inactive">停用</a-option>
              <a-option value="draft">草稿</a-option>
            </a-select>
          </a-col>
          <a-col :span="6">
            <a-space>
              <a-button type="primary" @click="handleSearch">搜索</a-button>
              <a-button @click="resetSearch">重置</a-button>
            </a-space>
          </a-col>
        </a-row>
        <!-- 监管指标额外筛选行 -->
        <a-row :gutter="16" v-if="currentMetricType === MetricType.REGULATORY" style="margin-top: 16px;">
          <a-col :span="6">
            <a-select
              v-model="searchForm.reportName"
              placeholder="报表名称"
              allow-clear
              @change="handleSearch"
            >
              <a-option value="资本充足率报告">资本充足率报告</a-option>
              <a-option value="流动性风险监测报告">流动性风险监测报告</a-option>
              <a-option value="信用风险报告">信用风险报告</a-option>
              <a-option value="市场风险报告">市场风险报告</a-option>
              <a-option value="操作风险报告">操作风险报告</a-option>
            </a-select>
          </a-col>
        </a-row>
    </div>

    <a-row :gutter="24">
      <!-- 左侧导航树 -->
      <a-col :span="6">
        <a-card title="指标分类" :bordered="false" class="tree-card">
          <a-tree
            v-model:selected-keys="selectedKeys"
            :data="treeData"
            :show-line="true"
            @select="onTreeSelect"
          />
        </a-card>
      </a-col>
      
      <!-- 右侧内容区 -->
      <a-col :span="18">
        <a-card :bordered="false" class="metrics-table">
          <!-- 指标列表 -->
          <a-table 
            :data="tableData" 
            :pagination="pagination" 
            :loading="loading"
            @page-change="onPageChange"
            @page-size-change="handlePageSizeChange"
          >
            <template #columns>
              <a-table-column title="指标名称" data-index="name" :width="200">
                <template #cell="{ record }">
                  <div style="display: flex; align-items: center; gap: 8px">
                    <a-link @click="showDetail(record)">{{ record.name }}</a-link>
                    <a-tag 
                      v-if="record.type"
                      :color="record.type === MetricType.BUSINESS_CORE ? 'blue' : 'orange'"
                      size="small"
                    >
                      {{ METRIC_TYPE_LABELS[record.type] }}
                    </a-tag>
                    <a-button
                      type="text"
                      size="mini"
                      @click.stop="toggleFavorite(record)"
                    >
                      <template #icon>
                        <IconStarFill v-if="record.isFavorite" style="color: #f7ba1e" />
                        <IconStar v-else />
                      </template>
                    </a-button>
                  </div>
                </template>
              </a-table-column>
              <a-table-column title="指标分类" data-index="category" :width="120">
                <template #cell="{ record }">
                  <a-tag :color="getCategoryColor(record.category)">
                    {{ getCategoryText(record.category) }}
                  </a-tag>
                </template>
              </a-table-column>
              <a-table-column title="业务域" data-index="businessDomain" :width="120">
                <template #cell="{ record }">
                  <a-tag v-if="record.type === MetricType.BUSINESS_CORE" color="purple">{{ record.businessDomain }}</a-tag>
                  <a-tag v-else-if="record.regulatoryCategory" color="cyan">{{ REGULATORY_CATEGORY_LABELS[record.regulatoryCategory] }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column title="状态" data-index="status" :width="100">
                <template #cell="{ record }">
                  <StatusTag :status="record.status" dict-key="metricStatus" />
                </template>
              </a-table-column>
              <a-table-column title="负责人" data-index="owner" :width="120" />
              <a-table-column title="更新时间" data-index="updateTime" :width="150">
                <template #cell="{ record }">
                  {{ DateUtils.smartFormat(record.updateTime) }}
                </template>
              </a-table-column>
              <a-table-column title="操作" :width="200" fixed="right">
                <template #cell="{ record }">
                  <a-space>
                    <a-button type="text" size="mini" @click="editMetric(record)">
                      编辑
                    </a-button>
                    <a-button type="text" size="mini" @click="viewVersionHistory(record)">
                      版本
                    </a-button>
                    <a-button type="text" size="mini" @click="copyMetric(record)">
                      复制
                    </a-button>
                    <a-button type="text" size="mini" status="danger" @click="deleteMetric(record)">
                      删除
                    </a-button>
                  </a-space>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-card>
      </a-col>
    </a-row>

    <!-- 指标详情抽屉 -->
    <a-drawer
      v-model:visible="drawerVisible"
      :width="800"
      title="指标详情"
      @cancel="closeDrawer"
      placement="right"
      :mask="false"
      :wrap-style="{ top: '64px', height: 'calc(100% - 64px)' }"
    >
      <template v-if="currentMetric">
        <a-space direction="vertical" size="small" fill style="padding: 12px 16px">
          <!-- 分类导航 -->
          <a-tabs type="rounded" :default-active-key="0" @change="handleTabChange">
            <a-tab-pane key="0" title="基础信息"></a-tab-pane>
            <a-tab-pane key="1" title="业务口径"></a-tab-pane>
            <a-tab-pane key="2" title="技术逻辑"></a-tab-pane>
            <a-tab-pane key="3" title="报表位置"></a-tab-pane>
            <a-tab-pane key="4" title="结果表信息"></a-tab-pane>
            <a-tab-pane key="5" title="查询代码"></a-tab-pane>
            <a-tab-pane key="6" title="历史版本"></a-tab-pane>
          </a-tabs>
          
          <a-row :gutter="24">
            <a-col :span="24">
              <!-- 基础信息 -->
              <a-card class="detail-card">
                <template #title>
                  <span class="card-title">基础信息</span>
                </template>
                <a-descriptions :column="2" :label-style="{ 'font-weight': 600 }">
                  <a-descriptions-item label="指标名称">
                    <span class="highlight-text">{{ currentMetric.name }}</span>
                  </a-descriptions-item>
                  <a-descriptions-item label="指标编号">{{ currentMetric.code }}</a-descriptions-item>
                  <a-descriptions-item label="指标类型">
                    <a-tag :color="currentMetric.type === MetricType.BUSINESS_CORE ? 'blue' : 'orange'">
                      {{ METRIC_TYPE_LABELS[currentMetric.type] }}
                    </a-tag>
                  </a-descriptions-item>
                  <a-descriptions-item label="分类/业务域" v-if="currentMetric.type === MetricType.BUSINESS_CORE">
                    <a-tag>{{ currentMetric.category }}</a-tag>
                    <a-tag color="purple" style="margin-left: 8px">{{ currentMetric.businessDomain }}</a-tag>
                  </a-descriptions-item>
                  <a-descriptions-item label="分类/监管大类" v-else>
                    <a-tag>{{ currentMetric.category }}</a-tag>
                    <a-tag color="cyan" style="margin-left: 8px">{{ REGULATORY_CATEGORY_LABELS[currentMetric.regulatoryCategory] }}</a-tag>
                  </a-descriptions-item>
                  <a-descriptions-item label="负责人" v-if="currentMetric.type === MetricType.BUSINESS_CORE">
                    <span class="highlight-text">{{ currentMetric.owner }}</span>
                  </a-descriptions-item>
                  <a-descriptions-item label="业务负责人" v-else>
                    <span class="highlight-text">{{ currentMetric.businessOwner }}</span>
                  </a-descriptions-item>
                  <a-descriptions-item label="技术负责人" v-if="currentMetric.type === MetricType.REGULATORY">
                    <span class="highlight-text">{{ currentMetric.technicalOwner }}</span>
                  </a-descriptions-item>
                  <a-descriptions-item label="状态">
                    <a-tag :color="getStatusColor(currentMetric.status)">
                      {{ getStatusText(currentMetric.status) }}
                    </a-tag>
                  </a-descriptions-item>
                  <a-descriptions-item label="统计周期">
                    <a-tag color="blue">{{ currentMetric.statisticalPeriod }}</a-tag>
                  </a-descriptions-item>
                </a-descriptions>
              </a-card>

              <!-- 业务口径 -->
              <a-card class="detail-card">
                <template #title>
                  <span class="card-title">业务口径</span>
                </template>
                <a-descriptions :column="1" :label-style="{ 'font-weight': 600 }">
                  <a-descriptions-item label="业务定义">
                    <div class="description-content">{{ currentMetric.businessDefinition }}</div>
                  </a-descriptions-item>
                  <a-descriptions-item label="使用场景">
                    <div class="description-content">{{ currentMetric.useCase }}</div>
                  </a-descriptions-item>
                </a-descriptions>
              </a-card>

              <!-- 技术逻辑 -->
              <a-card class="detail-card">
                <template #title>
                  <span class="card-title">技术逻辑</span>
                </template>
                <a-descriptions :column="1" :label-style="{ 'font-weight': 600 }">
                  <a-descriptions-item label="数据来源表">
                    <div class="code-block">{{ currentMetric.sourceTable }}</div>
                  </a-descriptions-item>
                  <a-descriptions-item label="加工逻辑">
                    <a-typography-paragraph code class="code-block">
                      {{ currentMetric.processingLogic }}
                    </a-typography-paragraph>
                  </a-descriptions-item>
                  <a-descriptions-item label="关联字段说明">
                    <div class="description-content">{{ currentMetric.fieldDescription }}</div>
                  </a-descriptions-item>
                </a-descriptions>
              </a-card>

              <!-- 报表位置 -->
              <a-card class="detail-card">
                <template #title>
                  <span class="card-title">报表位置</span>
                </template>
                <a-descriptions :column="1" :label-style="{ 'font-weight': 600 }">
                  <a-descriptions-item label="报表信息" v-if="currentMetric.type === MetricType.BUSINESS_CORE">
                    <div class="description-content">{{ currentMetric.reportInfo }}</div>
                  </a-descriptions-item>
                  <a-descriptions-item label="报表名称" v-else>
                    <div class="description-content">{{ currentMetric.reportName }}</div>
                  </a-descriptions-item>
                </a-descriptions>
              </a-card>

              <!-- 结果表信息 -->
              <a-card class="detail-card">
                <template #title>
                  <span class="card-title">结果表信息</span>
                </template>
                <a-descriptions :column="1" :label-style="{ 'font-weight': 600 }">
                  <a-descriptions-item label="存储位置">
                    <div class="code-block">{{ currentMetric.storageLocation }}</div>
                  </a-descriptions-item>
                </a-descriptions>
              </a-card>

              <!-- 查询代码 -->
              <a-card class="detail-card">
                <template #title>
                  <span class="card-title">查询代码</span>
                </template>
                <a-typography-paragraph code class="code-block query-code">
                  {{ currentMetric.queryCode }}
                </a-typography-paragraph>
              </a-card>

              <!-- 历史版本 -->
              <a-card class="detail-card">
                <template #title>
                  <span class="card-title">历史版本</span>
                </template>
                <a-timeline class="version-timeline">
                  <a-timeline-item
                    v-for="(version, index) in currentMetric.versions"
                    :key="index"
                  >
                    <div class="version-item">
                      <span class="version-date">{{ version.date }}</span>
                      <span class="version-description">{{ version.description }}</span>
                    </div>
                  </a-timeline-item>
                </a-timeline>
              </a-card>
            </a-col>
          </a-row>
        </a-space>
      </template>
    </a-drawer>

    <!-- 创建/编辑指标模态框 -->
    <a-modal
      v-model:visible="showCreateModal"
      :title="editingMetric ? '编辑指标' : '新建指标'"
      width="1000px"
      @ok="handleSubmit"
      @cancel="resetForm"
    >
      <a-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        layout="vertical"
      >
        <!-- 基本信息 -->
        <a-divider orientation="left">基本信息</a-divider>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="指标类型" field="type">
              <a-select v-model="formData.type" placeholder="请选择指标类型" @change="handleFormTypeChange">
                <a-option :value="MetricType.BUSINESS_CORE">业务核心指标</a-option>
                <a-option :value="MetricType.REGULATORY">监管指标</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="指标名称" field="name">
              <a-input v-model="formData.name" placeholder="请输入指标名称" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="指标编码" field="code">
              <a-input v-model="formData.code" placeholder="请输入指标编码" />
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="指标分类" field="category">
              <a-select v-model="formData.category" placeholder="请选择指标分类">
                <a-option value="business">业务指标</a-option>
                <a-option value="technical">技术指标</a-option>
                <a-option value="financial">财务指标</a-option>
                <a-option value="risk">风险指标</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8" v-if="formData.type === MetricType.BUSINESS_CORE">
            <a-form-item label="业务域" field="businessDomain">
              <a-select v-model="formData.businessDomain" placeholder="请选择业务域">
                <a-option value="user">用户域</a-option>
                <a-option value="transaction">交易域</a-option>
                <a-option value="product">产品域</a-option>
                <a-option value="retention">留存域</a-option>
                <a-option value="conversion">转化域</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8" v-if="formData.type === MetricType.REGULATORY">
            <a-form-item label="监管报表大类" field="regulatoryCategory">
              <a-select v-model="formData.regulatoryCategory" placeholder="请选择监管报表大类">
                <a-option :value="RegulatoryCategory.CAPITAL_ADEQUACY">资本充足率</a-option>
                <a-option :value="RegulatoryCategory.LIQUIDITY">流动性</a-option>
                <a-option :value="RegulatoryCategory.ASSET_QUALITY">资产质量</a-option>
                <a-option :value="RegulatoryCategory.RISK_CONCENTRATION">风险集中度</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="统计周期" field="statisticalPeriod">
              <a-select v-model="formData.statisticalPeriod" placeholder="请选择统计周期">
                <a-option value="实时">实时</a-option>
                <a-option value="日更新">日更新</a-option>
                <a-option value="离线T+1">离线T+1</a-option>
                <a-option value="离线T+2">离线T+2</a-option>
                <a-option value="每周">每周</a-option>
                <a-option value="每月">每月</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-row :gutter="16" v-if="formData.type === MetricType.BUSINESS_CORE">
          <a-col :span="12">
            <a-form-item label="负责人" field="owner">
              <a-input v-model="formData.owner" placeholder="请输入负责人" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="版本号" field="version">
              <a-input v-model="formData.version" placeholder="请输入版本号（如：v1.0.0）" />
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-row :gutter="16" v-if="formData.type === MetricType.REGULATORY">
          <a-col :span="8">
            <a-form-item label="业务负责人" field="businessOwner">
              <a-input v-model="formData.businessOwner" placeholder="请输入业务负责人" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="技术负责人" field="technicalOwner">
              <a-input v-model="formData.technicalOwner" placeholder="请输入技术负责人" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="版本号" field="version">
              <a-input v-model="formData.version" placeholder="请输入版本号（如：v1.0.0）" />
            </a-form-item>
          </a-col>
        </a-row>
        
        <!-- 业务定义 -->
        <a-divider orientation="left">业务定义</a-divider>
        <a-form-item label="业务定义" field="businessDefinition">
          <a-textarea v-model="formData.businessDefinition" placeholder="请输入业务定义" :rows="3" />
        </a-form-item>
        <a-form-item label="使用场景">
          <a-textarea v-model="formData.useCase" placeholder="请输入使用场景" :rows="3" />
        </a-form-item>
        
        <!-- 技术逻辑 -->
        <a-divider orientation="left">技术逻辑</a-divider>
        <a-form-item label="来源表" field="sourceTable">
          <a-input v-model="formData.sourceTable" placeholder="请输入来源表" />
        </a-form-item>
        <a-form-item label="加工逻辑">
          <a-textarea v-model="formData.processingLogic" placeholder="请输入加工逻辑SQL" :rows="5" />
        </a-form-item>
        <a-form-item label="字段说明">
          <a-textarea v-model="formData.fieldDescription" placeholder="请输入字段说明" :rows="3" />
        </a-form-item>
        
        <!-- 结果表信息 -->
        <a-divider orientation="left">结果表信息</a-divider>
        <a-form-item label="存储位置">
          <a-input v-model="formData.storageLocation" placeholder="请输入存储位置" />
        </a-form-item>
        <a-form-item label="查询代码">
          <a-textarea v-model="formData.queryCode" placeholder="请输入查询代码" :rows="5" />
        </a-form-item>
        
        <!-- 监管指标专用字段 -->
        <template v-if="formData.type === MetricType.REGULATORY">
          <a-divider orientation="left">监管报表信息</a-divider>
          <a-form-item label="报表名称" field="reportName">
            <a-input v-model="formData.reportName" placeholder="请输入报表名称" />
          </a-form-item>
        </template>
      </a-form>
    </a-modal>

    <!-- 版本历史模态框 -->
    <a-modal
      v-model:visible="showVersionHistoryModal"
      title="版本历史"
      width="800px"
      :footer="false"
    >
      <a-table
        :columns="versionHistoryColumns"
        :data="versionHistoryData"
        :pagination="false"
      >
        <template #versionStatus="{ record }">
          <a-tag
            :color="record.versionStatus === 'active' ? 'green' : 'gray'"
          >
            {{ record.versionStatus === 'active' ? '当前版本' : '历史版本' }}
          </a-tag>
        </template>
        <template #actions="{ record }">
          <a-space>
            <a-button type="text" size="mini" @click="viewVersionDetail(record)">
              查看详情
            </a-button>
            <a-button 
              v-if="record.versionStatus !== 'active'" 
              type="text" 
              size="mini" 
              @click="activateVersion(record)"
            >
              激活版本
            </a-button>
          </a-space>
        </template>
      </a-table>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { IconPlus, IconDownload, IconStar, IconStarFill, IconUpload, IconSettings } from '@arco-design/web-vue/es/icon'
import { Message, type TreeNodeData } from '@arco-design/web-vue'
import { useRouter } from 'vue-router'
import metricsMock from '@/mock/metrics'
import { MetricType, RegulatoryCategory, METRIC_TYPE_LABELS, REGULATORY_CATEGORY_LABELS, type MetricItem } from '@/types/metrics'
import DetailHeader from '@/components-dca/common/DetailHeader.vue'
import StatusTag from '@/components-dca/common/StatusTag.vue'
import DateUtils from '@/utils-dca/dateUtils'
// 当前选中的指标类型
const currentMetricType = ref<MetricType>(MetricType.BUSINESS_CORE)

// 响应式数据
const router = useRouter()
const loading = ref(false)
const searchKeyword = ref('')
const selectedCategory = ref('')
const selectedDomain = ref('')
const selectedStatus = ref('')
const selectedKeys = ref<(string | number)[]>([])
const showCreateModal = ref(false)
const showVersionHistoryModal = ref(false)
const drawerVisible = ref(false)
const editingMetric = ref<MetricItem | null>(null)
const currentMetric = ref<MetricItem | null>(null)
const formRef = ref()
// 版本历史数据接口
interface VersionHistoryItem {
  version: string
  versionStatus: string
  updateTime: string
  updater: string
  description: string
}

const versionHistoryData = ref<VersionHistoryItem[]>([])

// 搜索表单
const searchForm = ref({
  name: '',
  category: '',
  businessDomain: '',
  status: '',
  onlyFavorite: false,
  isFavorite: false,
  type: MetricType.BUSINESS_CORE,
  regulatoryCategory: '',
  reportName: ''
})

// 分页
const pagination = ref({
  total: 0,
  current: 1,
  pageSize: 10
})

// 表格数据
const tableData = ref<MetricItem[]>([])

// 树形数据
const treeData = ref([
  {
    title: '业务指标',
    key: 'business',
    children: [
      { title: '用户域', key: 'business-user' },
      { title: '交易域', key: 'business-transaction' },
      { title: '产品域', key: 'business-product' }
    ]
  },
  {
    title: '技术指标',
    key: 'technical',
    children: [
      { title: '性能指标', key: 'technical-performance' },
      { title: '质量指标', key: 'technical-quality' }
    ]
  },
  {
    title: '财务指标',
    key: 'financial',
    children: [
      { title: '收入指标', key: 'financial-revenue' },
      { title: '成本指标', key: 'financial-cost' }
    ]
  },
  {
    title: '风险指标',
    key: 'risk',
    children: [
      { title: '信用风险', key: 'risk-credit' },
      { title: '操作风险', key: 'risk-operation' }
    ]
  }
])

// 表单数据
const formData = reactive({
  name: '',
  code: '',
  category: '',
  businessDomain: '',
  statisticalPeriod: '',
  owner: '',
  version: '',
  businessDefinition: '',
  useCase: '',
  sourceTable: '',
  processingLogic: '',
  fieldDescription: '',
  storageLocation: '',
  queryCode: '',
  status: 'active',
  type: MetricType.BUSINESS_CORE,
  regulatoryCategory: '',
  businessOwner: '',
  technicalOwner: '',
  reportName: ''
})

// 表单验证规则
const getFormRules = () => {
  const baseRules = {
    name: [{ required: true, message: '请输入指标名称' }],
    code: [{ required: true, message: '请输入指标编码' }],
    category: [{ required: true, message: '请选择指标分类' }],
    type: [{ required: true, message: '请选择指标类型' }],
    businessDefinition: [{ required: true, message: '请输入业务定义' }],
    sourceTable: [{ required: true, message: '请输入来源表' }]
  }
  
  if (formData.type === MetricType.BUSINESS_CORE) {
    return {
      ...baseRules,
      businessDomain: [{ required: true, message: '请选择业务域' }],
      owner: [{ required: true, message: '请输入负责人' }]
    }
  } else {
    return {
      ...baseRules,
      regulatoryCategory: [{ required: true, message: '请选择监管报表大类' }],
      businessOwner: [{ required: true, message: '请输入业务负责人' }],
      technicalOwner: [{ required: true, message: '请输入技术负责人' }],
      reportName: [{ required: true, message: '请输入报表名称' }]
    }
  }
}

const formRules = ref(getFormRules())

// 版本历史表格列
const versionHistoryColumns = [
  { title: '版本号', dataIndex: 'version' },
  { title: '状态', dataIndex: 'versionStatus', slotName: 'versionStatus' },
  { title: '更新时间', dataIndex: 'updateTime' },
  { title: '更新人', dataIndex: 'updater' },
  { title: '版本说明', dataIndex: 'description' },
  { title: '操作', slotName: 'actions', width: 150 }
]

// 获取指标列表
const fetchMetrics = async () => {
  try {
    loading.value = true

    // 使用 mock 数据
    const queryParams = { 
      ...searchForm.value, 
      page: pagination.value.current + '', 
      pageSize: pagination.value.pageSize + '' 
    }
    if (searchForm.value.onlyFavorite) {
      queryParams.isFavorite = true
    }
    
    const mockList = metricsMock[0].response({ query: queryParams })

    if (mockList && mockList.data) {
      tableData.value = mockList.data.list || []
      pagination.value.total = mockList.data.total || 0
    } else {
      tableData.value = []
      pagination.value.total = 0
    }
  } catch (error) {

    tableData.value = []
    pagination.value.total = 0
  } finally {
    loading.value = false
  }
}

// 搜索处理
const handleSearch = () => {
  // 同步搜索表单数据
  searchForm.value.name = searchKeyword.value
  searchForm.value.category = selectedCategory.value
  searchForm.value.businessDomain = selectedDomain.value
  searchForm.value.status = selectedStatus.value
  searchForm.value.type = currentMetricType.value
  
  pagination.value.current = 1
  fetchMetrics()
}

// 重置搜索
const resetSearch = () => {
  searchKeyword.value = ''
  selectedCategory.value = ''
  selectedDomain.value = ''
  selectedStatus.value = ''
  searchForm.value.regulatoryCategory = ''
  searchForm.value.reportName = ''
  searchForm.value.onlyFavorite = false
  handleSearch()
}

// 指标类型切换处理
const handleMetricTypeChange = (type: MetricType) => {
  currentMetricType.value = type
  searchForm.value.type = type
  // 切换类型时重置相关筛选条件
  selectedDomain.value = ''
  searchForm.value.regulatoryCategory = ''
  searchForm.value.reportName = ''
  handleSearch()
}

// 表单指标类型切换处理
const handleFormTypeChange = (type: MetricType) => {
  formData.type = type
  // 切换类型时重置相关字段
  if (type === MetricType.BUSINESS_CORE) {
    formData.regulatoryCategory = ''
    formData.businessOwner = ''
    formData.technicalOwner = ''
    formData.reportName = ''
  } else {
    formData.businessDomain = ''
    formData.owner = ''
  }
  // 更新验证规则
  formRules.value = getFormRules()
}

// 分页处理
const onPageChange = (current: number) => {
  pagination.value.current = current
  fetchMetrics()
}

const handlePageSizeChange = (pageSize: number) => {
  pagination.value.pageSize = pageSize
  pagination.value.current = 1
  fetchMetrics()
}

// 树形导航选择
const onTreeSelect = (selectedKeys: (string | number)[], data: { selected?: boolean, selectedNodes: TreeNodeData[], node?: TreeNodeData, e?: Event }) => {
  if (selectedKeys.length === 0) {
    selectedCategory.value = ''
    selectedDomain.value = ''
    handleSearch()
    return
  }
  
  const selectedKey = String(selectedKeys[0])
  if (selectedKey.includes('-')) {
    const [category, domain] = selectedKey.split('-')
    selectedCategory.value = category
    selectedDomain.value = domain
  } else {
    selectedCategory.value = selectedKey
    selectedDomain.value = ''
  }
  handleSearch()
}

// 显示详情
const showDetail = (record: MetricItem) => {
  currentMetric.value = record
  drawerVisible.value = true
}

// 关闭详情抽屉
const closeDrawer = () => {
  drawerVisible.value = false
  currentMetric.value = null
}

// 收藏切换
const toggleFavorite = (record: MetricItem) => {
  record.isFavorite = !record.isFavorite
  Message.success(record.isFavorite ? '已添加到收藏' : '已取消收藏')
}

const toggleFavoriteFilter = () => {
  searchForm.value.onlyFavorite = !searchForm.value.onlyFavorite
  handleSearch()
}

// 编辑指标
const editMetric = (record: MetricItem) => {
  editingMetric.value = record
  // 填充表单数据
  Object.assign(formData, record)
  showCreateModal.value = true
}

// 复制指标
const copyMetric = (record: MetricItem) => {
  editingMetric.value = null
  // 填充表单数据，但清空名称和编码
  Object.assign(formData, {
    ...record,
    name: record.name + '_副本',
    code: record.code + '_copy',
    version: 'v1.0.0'
  })
  showCreateModal.value = true
}

// 删除指标
const deleteMetric = (record: MetricItem) => {
  Message.success('指标删除成功')
  fetchMetrics()
}

// 查看版本历史
const viewVersionHistory = (record: MetricItem) => {
  // 模拟版本历史数据
  versionHistoryData.value = [
    {
      version: 'v1.2.0',
      versionStatus: 'active',
      updateTime: '2024-01-15 10:30:00',
      updater: '张三',
      description: '优化计算逻辑，提升性能'
    },
    {
      version: 'v1.1.0',
      versionStatus: 'inactive',
      updateTime: '2024-01-10 14:20:00',
      updater: '李四',
      description: '修复数据统计bug'
    },
    {
      version: 'v1.0.0',
      versionStatus: 'inactive',
      updateTime: '2024-01-01 09:00:00',
      updater: '王五',
      description: '初始版本'
    }
  ]
  showVersionHistoryModal.value = true
}

// 激活版本
const activateVersion = (record: any) => {
  Message.success(`版本 ${record.version} 已激活`)
  showVersionHistoryModal.value = false
  fetchMetrics()
}

// 查看版本详情
const viewVersionDetail = (record: any) => {
  Message.info('查看版本详情功能开发中')
}

// 提交表单
const handleSubmit = async () => {
  try {
    const valid = await formRef.value?.validate()
    if (valid) {
      if (editingMetric.value) {
        Message.success('指标编辑成功')
      } else {
        Message.success('指标创建成功')
      }
      showCreateModal.value = false
      resetForm()
      fetchMetrics()
    }
  } catch (error) {

  }
}

// 重置表单
const resetForm = () => {
  editingMetric.value = null
  Object.assign(formData, {
    name: '',
    code: '',
    category: '',
    businessDomain: '',
    statisticalPeriod: '',
    owner: '',
    version: '',
    businessDefinition: '',
    useCase: '',
    sourceTable: '',
    processingLogic: '',
    fieldDescription: '',
    storageLocation: '',
    queryCode: '',
    status: 'active',
    type: MetricType.BUSINESS_CORE,
    regulatoryCategory: '',
    businessOwner: '',
    technicalOwner: '',
    reportName: ''
  })
  // 重置验证规则
  formRules.value = getFormRules()
  formRef.value?.resetFields()
}

// 导出指标
const exportMetrics = () => {
  Message.success('指标数据导出成功')
}

// 跳转到批量注册页面
const goToBatchRegistration = () => {
  router.push('/discovery/batch-registration')
}

// 跳转到监管配置页面
const goToRegulatoryConfig = () => {
  router.push('/discovery/regulatory-config')
}

// 标签页切换
const handleTabChange = (key: string | number) => {

}

// 获取状态颜色
const getStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    active: 'green',
    inactive: 'red',
    draft: 'orange'
  }
  return colorMap[status] || 'gray'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    active: '启用',
    inactive: '停用',
    draft: '草稿'
  }
  return textMap[status] || status
}

// 获取分类颜色
const getCategoryColor = (category: string) => {
  const colorMap: Record<string, string> = {
    business: 'blue',
    technical: 'green',
    financial: 'orange',
    risk: 'red'
  }
  return colorMap[category] || 'gray'
}

// 获取分类文本
const getCategoryText = (category: string) => {
  const textMap: Record<string, string> = {
    business: '业务指标',
    technical: '技术指标',
    financial: '财务指标',
    risk: '风险指标'
  }
  return textMap[category] || category
}

// 组件挂载
onMounted(() => {

  fetchMetrics()
})
</script>

<style scoped>
.unified-metrics {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.metric-type-tabs {
  margin-bottom: 20px;
}

.metric-type-tabs :deep(.arco-tabs-nav) {
  margin-bottom: 0;
}

.metric-type-tabs :deep(.arco-tabs-tab) {
  font-weight: 500;
}

.search-section {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.tree-card {
  height: calc(100vh - 280px);
  overflow-y: auto;
}

.metrics-table {
  background: white;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.metric-name {
  font-weight: 500;
  color: var(--subapp-info);
  cursor: pointer;
}

.metric-name:hover {
  text-decoration: underline;
}

.detail-card {
  border-radius: 4px;
  margin-bottom: 16px;
  max-width: 100%;
  overflow: hidden;
  width: 100%;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
}

.highlight-text {
  color: var(--subapp-primary);
  font-weight: 600;
}

.description-content {
  white-space: pre-wrap;
  line-height: 1.5;
  font-size: 13px;
}

.code-block {
  background-color: #f5f5f5;
  padding: 8px 12px;
  border-radius: 4px;
  font-family: monospace;
  white-space: pre-wrap;
  font-size: 13px;
}

.query-code {
  margin: 0;
}

.version-timeline {
  padding: 8px 0;
}

.version-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.version-date {
  color: var(--subapp-text-tertiary);
  font-size: 12px;
}

.version-description {
  color: var(--subapp-text-primary);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .tree-card {
    height: auto;
    min-height: 300px;
  }
}

@media (max-width: 768px) {
  .unified-metrics {
    padding: 10px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .search-section {
    padding: 12px;
  }
}
</style>
