<template>
  <div class="tag-detail">
    <!-- 面包屑导航 -->
    <a-breadcrumb class="breadcrumb">
      <a-breadcrumb-item>
        <IconHome />
      </a-breadcrumb-item>
      <a-breadcrumb-item>可信数据</a-breadcrumb-item>
      <a-breadcrumb-item>标签管理</a-breadcrumb-item>
    </a-breadcrumb>

    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h2 class="page-title">页面标题</h2>
        <div class="tag-info">
          <span class="tag-id">标签ID：{{ tagDetail.id }}</span>
          <span class="tag-name">{{ tagDetail.name }}</span>
        </div>
      </div>
      <div class="header-actions">
        <a-button type="primary">立即计算</a-button>
      </div>
    </div>

    <!-- 标签基本信息 -->
    <div class="content-section">
      <a-card class="info-card">
        <template #title>
          <span class="card-title">标签基本信息</span>
        </template>
        
        <div class="info-grid">
          <div class="info-row">
            <div class="info-item">
              <span class="label">数据类型：</span>
              <a-tag :color="getDataTypeColor(tagDetail.dataType)">
                {{ getDataTypeText(tagDetail.dataType) }}
              </a-tag>
            </div>
            <div class="info-item">
              <span class="label">字符类型：</span>
              <span class="value">{{ tagDetail.category }}</span>
            </div>
          </div>
          
          <div class="info-row">
            <div class="info-item">
              <span class="label">标签分类：</span>
              <span class="value">{{ tagDetail.category }}</span>
            </div>
            <div class="info-item">
              <span class="label">维度类型：</span>
              <span class="value">{{ tagDetail.dimensionType }}</span>
            </div>
          </div>
          
          <div class="info-row">
            <div class="info-item">
              <span class="label">共享级别：</span>
              <a-tag :color="getShareLevelColor(tagDetail.shareLevel)">
                {{ getShareLevelText(tagDetail.shareLevel) }}
              </a-tag>
            </div>
            <div class="info-item">
              <span class="label">创建人：</span>
              <span class="value">{{ tagDetail.createUser }}</span>
            </div>
          </div>
          
          <div class="info-row full-width">
            <div class="info-item">
              <span class="label">标签主体：</span>
              <span class="value description">{{ tagDetail.description }}</span>
            </div>
          </div>
        </div>
      </a-card>
    </div>

    <!-- 标签主体 -->
    <div class="content-section">
      <a-card class="subject-card">
        <template #title>
          <div class="card-header">
            <span class="card-title">标签主体</span>
          </div>
        </template>
        
        <div class="subject-content">
          <div class="subject-stats">
            <div class="stat-item">
              <div class="stat-label">标签覆盖人数：</div>
              <div class="stat-value primary">{{ formatNumber(tagStats.coverageCount) }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">覆盖率：</div>
              <div class="stat-value">{{ tagStats.coverageRate }}%</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">标签不重复人数：</div>
              <div class="stat-value">{{ formatNumber(tagStats.uniqueCount) }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">标签可用数量：</div>
              <div class="stat-value">{{ tagStats.availableCount }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">计算更新时间：</div>
              <div class="stat-value">{{ tagStats.updateTime }}</div>
            </div>
          </div>
          
          <!-- 数据分布图表 -->
          <div class="chart-section">
            <div class="chart-tabs">
              <a-radio-group v-model="activeTab" type="button">
                <a-radio value="distribution">数据分布</a-radio>
                <a-radio value="trend">趋势分析</a-radio>
                <a-radio value="lineage">血缘查询</a-radio>
                <a-radio v-if="showQuantileTab" value="quantile">分位统计</a-radio>
              </a-radio-group>
            </div>
            
            <div class="chart-content">
              <div v-if="activeTab === 'distribution'" class="distribution-chart">
                <div class="total-count">
                  <span class="count-number">{{ formatNumber(tagStats.totalCount) }}</span>
                  <span class="count-label">人</span>
                  <span class="count-desc">当前标签覆盖用户数据于 {{ tagStats.dataDate }} 02:38:12</span>
                </div>
                
                <!-- 数据分布条形图 -->
                <div class="distribution-bars">
                  <div v-for="(item, index) in distributionData" :key="index" class="bar-item">
                    <div class="bar-label">{{ item.label }}</div>
                    <div class="bar-container">
                      <div 
                        class="bar-fill" 
                        :style="{ width: item.percentage + '%', backgroundColor: item.color }"
                      ></div>
                    </div>
                    <div class="bar-value">{{ item.percentage }}%</div>
                  </div>
                </div>
              </div>
              
              <div v-if="activeTab === 'trend'" class="trend-chart">
                 <div class="trend-placeholder">
                   趋势分析图表区域
                 </div>
               </div>
               <div v-if="activeTab === 'lineage'" class="lineage-chart">
                <div ref="lineageChartRef" style="height: 500px;"></div>
              </div>

              <!-- 连续型标签分位统计（模块 E） -->
              <div v-if="activeTab === 'quantile'" class="quantile-chart-wrap">
                <TagQuantilePanel :tag-id="tagDetail.id" />
              </div>
            </div>
          </div>
        </div>
      </a-card>
    </div>

    <!-- 规则配置区域 -->
    <div class="content-section">
      <a-card class="rule-config-card">
        <template #title>
          <span class="card-title">标签逻辑配置</span>
        </template>
        
        <div class="rule-config-content">
          <!-- 上下布局结构 -->
          <div class="tag-values-config-vertical">
            <!-- 标签值管理区域 -->
            <div class="tag-values-management">
              <div class="section-header">
                <h3>标签值管理</h3>
                <a-button type="primary" @click="addTagValue">
                  <template #icon><IconPlus /></template>
                  添加标签值
                </a-button>
              </div>
              
              <div class="tag-values-list">
                <div 
                  v-for="(tagValue, index) in tagValues" 
                  :key="tagValue.id" 
                  class="tag-value-item"
                  :class="{ active: activeConfigTab === tagValue.id }"
                >
                  <div class="tag-value-header" @click="activeConfigTab = tagValue.id">
                    <div class="tag-value-info">
                      <span class="tag-value-name">{{ tagValue.name || `标签值${index + 1}` }}</span>
                      <span class="tag-value-desc">{{ tagValue.description || '暂无描述' }}</span>
                    </div>
                    <div class="tag-value-actions" @click.stop>
                      <a-button 
                        v-if="tagValues.length > 1" 
                        type="text" 
                        size="small" 
                        status="danger" 
                        @click="deleteTagValue(tagValue.id)"
                      >
                        <template #icon><IconDelete /></template>
                      </a-button>
                    </div>
                  </div>
                </div>
                
                <div v-if="tagValues.length === 0" class="empty-state">
                  <IconPlus style="font-size: 48px; color: #c9cdd4;" />
                  <p>暂无标签值，请添加第一个标签值</p>
                </div>
              </div>
            </div>
            
            <!-- 标签值配置区域 -->
            <div v-if="getCurrentTagValue()" class="tag-value-config-section">
              <div class="config-header">
                <h4>{{ getCurrentTagValue().name || '标签值配置' }}</h4>
                <!-- 编辑控制区域 -->
                <div class="edit-actions">
                  <a-button 
                    v-if="!isEditMode" 
                    type="primary" 
                    class="edit-btn"
                    disabled
                  >
                    <template #icon><IconEdit /></template>
                    编辑配置
                  </a-button>
                  <div v-else class="edit-mode-actions">
                    <a-button type="primary" @click="saveConfiguration" class="save-btn">
                      <template #icon><IconCheck /></template>
                      保存
                    </a-button>
                    <a-button @click="cancelEdit" class="cancel-btn">
                      <template #icon><IconClose /></template>
                      取消
                    </a-button>
                  </div>
                </div>
              </div>
              
              <!-- 标签值基本信息 -->
              <div class="config-row">
                <div class="config-item">
                  <label class="config-label">标签值名称</label>
                  <a-input 
                    v-model="getCurrentTagValue().name" 
                    placeholder="请输入标签值名称" 
                    class="config-input" 
                    :disabled="!isEditMode"
                  />
                </div>
                <div class="config-item">
                  <label class="config-label">标签值描述</label>
                  <a-input 
                    v-model="getCurrentTagValue().description" 
                    placeholder="请输入标签值描述" 
                    class="config-input" 
                    :disabled="!isEditMode"
                  />
                </div>
              </div>
              
              <!-- 条件组配置 -->
              <div class="condition-groups-section">
                <div class="section-header">
                  <h4 class="section-title">条件配置</h4>
                  <div class="section-info">
                    <span class="condition-count">共 {{ getCurrentTagValueConditionGroups().length }} 个条件组</span>
                  </div>
                </div>
                
                <!-- 条件组配置区域 -->
                <div class="conditions-workspace">
                  <ConditionConfig
                     :condition-groups="getCurrentTagValueConditionGroups()"
                     :cross-group-logic="getCurrentTagValue().crossGroupLogic"
                     :editable="isEditMode"
                     :data-source-type-options="dataSourceTypeOptions"
                     :date-type-options="dateTypeOptions"
                     :dynamic-unit-options="dynamicUnitOptions"
                     :get-field-options="getFieldOptions"
                     :get-aggregation-options="getAggregationOptions"
                     :get-operator-options="getOperatorOptions"
                     :need-value-input="needValueInput"
                     :get-value-placeholder="getValuePlaceholder"
                     :on-data-source-type-change="onDataSourceTypeChange"
                     :on-date-type-change="onDateTypeChange"
                     @add-condition-group="addConditionGroup"
                     @delete-condition-group="deleteConditionGroup"
                     @toggle-cross-group-logic="toggleCrossGroupLogic"
                     @toggle-group-logic="toggleGroupLogic"
                     @add-condition-by-type="addConditionByType"
                     @remove-condition="removeCondition"
                   />
                </div>
              </div>
            </div>
          </div>
        </div>
      </a-card>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, reactive } from 'vue'
import * as echarts from 'echarts'
import { safeInitECharts, safeDisposeChart } from '@/utils/echartsUtils'
import { getTagLineage, getTag } from '@/api/tag'
import { useRoute, useRouter } from 'vue-router'
import {
  IconHome,
  IconSettings,
  IconTag,
  IconEye,
  IconDashboard,
  IconBarChart,
  IconMore,
  IconPlus,
  IconDown,
  IconDelete,
  IconCheckCircle,
  IconExclamationCircle,
  IconInfoCircle,
  IconCopy,
  IconMinus,
  IconEdit,
  IconCheck,
  IconClose
} from '@arco-design/web-vue/es/icon'
import ConditionConfig from '@/components/common/ConditionConfig.vue'
import TagQuantilePanel from './components/TagQuantilePanel.vue'
import { onMounted } from 'vue';

// 血缘数据处理函数
const processLineageData = (data) => {
  console.debug('[Lineage] 原始数据输入:', {
    nodes: data.data.nodes?.length || 0,
    links: data.data.links?.length || 0,
    types: [...new Set(data.data.nodes.map(n => n.type))]
  });
  console.log('[Lineage Debug] 原始数据:', JSON.parse(JSON.stringify(data)));
  // 构建标签为核心的三层树结构
  const root = {
  name: 'tag001',
  type: 'root',
  children: data.data.nodes
    .filter(node => node.type === 'tag')
    .map(tag => {
      const attributes = data.data.links
        .filter(l => l.source === tag.id && l.type === 'attribute')
        .map(l => ({
          ...data.data.nodes.find(n => n.id === l.target),
          children: data.data.links
            .filter(lt => lt.source === l.target && lt.type === 'table')
            .map(lt => ({
              ...data.data.nodes.find(n => n.id === lt.target),
              _depth: 2
            })),
          _depth: 1
        }));
      return {
        ...tag,
        children: attributes,
        _depth: 0
      };
    })
};


  // 建立类型映射
  const nodeMap = data.data.nodes.reduce((acc, node) => {
    acc[node.id] = {
      ...node,
      children: []
    };
    return acc;
  }, {});

  // 根据链接关系构建层级
  data.data.links.forEach(link => {
    if (link.type === 'attribute') {
      nodeMap[link.source].children.push(nodeMap[link.target]);
    } else if (link.type === 'table') {
      nodeMap[link.source].children.forEach(attr => {
        attr.children.push(nodeMap[link.target]);
      });
    }
  });

  // 提取标签节点作为根的子节点
  root.children = data.data.nodes
    .filter(node => node.type === 'tag')
    .map(node => nodeMap[node.id]);

  console.log('[Lineage Debug] 处理后的树结构:', JSON.parse(JSON.stringify(root)));
  console.debug('[Lineage] 树结构生成完成', {
  depth: getTreeDepth(root),
  totalNodes: countNodes(root),
  maxChildren: Math.max(...getChildrenCounts(root))
});
return root;
}

// 组件挂载时演示数据
onMounted(() => {
  // 使用静态演示数据替代API调用
  console.log('展示静态标签详情演示数据');
});

const route = useRoute()
const router = useRouter()

// 当前选中的标签页
const activeTab = ref('distribution')
const lineageChartRef = ref(null)
const lineageData = ref(null)

const countNodes = (node) => {
  let count = 0;
  const stack = [node];
  while (stack.length) {
    const current = stack.pop();
    count++;
    current.children?.forEach(c => stack.push(c));
  }
  return count;
};

const getChildrenCounts = (node) => {
  const counts = [];
  const traverse = (n) => {
    counts.push(n.children?.length || 0);
    n.children?.forEach(traverse);
  };
  traverse(node);
  return counts;
};

const initLineageChart = async () => {
  console.debug('[Lineage] 初始化图表', {
    containerSize: {
      width: lineageChartRef.value?.offsetWidth,
      height: lineageChartRef.value?.offsetHeight
    }
  });
  if (!lineageChartRef.value) return
  
  try {
    const chart = await safeInitECharts(lineageChartRef.value)
    
    console.log('[Lineage Debug] ECharts配置:', {
      seriesType: 'tree',
      nodeCount: lineageData.value.children.length,
      maxDepth: getTreeDepth(lineageData.value)
    });
    
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: ({ data }) => {
          return `<div style='padding:8px;'>
            <div style='font-weight:500;margin-bottom:4px;'>${data.name}</div>
            <div style='color:#666;'>类型：${data.category}</div>
            ${data.updatedAt ? `<div style='color:#666;margin-top:4px;'>更新时间：${new Date(data.updatedAt).toLocaleString()}</div>` : ''}
          </div>`
        }
      },
      series: [{
        type: 'tree',
        data: [lineageData.value],
        orient: 'LR',
        symbolSize: 24,
        itemStyle: {
          borderWidth: 2,
          borderColor: '#fff',
          color: ({ data }) => {
            const typeColors = {
              tag: '#52c41a',
              attribute: 'var(--subapp-info)',
              table: '#f5222d'
            };
            return typeColors[data.type] || '#666';
          }
        },
        lineStyle: {
          color: '#ccc',
          curveness: 0.3
        },
        label: {
          position: 'right',
          verticalAlign: 'middle',
          formatter: ({ data }) => {
            const typeIcons = {
              tag: '🏷',
              attribute: '📌',
              table: '🗂',
              root: '🌳'
            };
            return `${data._isRoot ? typeIcons.root : typeIcons[data.type]} ${data.name}`;
          },
          fontSize: 14
        },
        leaves: {
          label: { position: 'bottom', show: true }
        },
        expandAndCollapse: false
      }]
    }
    
    chart.setOption(option);
    console.debug('[Lineage] 图表配置应用完成', {
      seriesCount: option.series.length,
      nodeTypes: [...new Set(option.series[0].data.flatMap(s => s.children).map(n => n.type))]
    });
    window.addEventListener('resize', () => chart.resize())
  } catch (error) {
    console.error('❌ 血缘图表初始化失败:', error)
  }
}

watch(() => activeTab.value, (val) => {
  if (val === 'lineage' && !lineageData.value) {
    fetchTagLineage()
  }
})

const getTreeDepth = (node) => {
  let maxDepth = 0;
  function traverse(n, depth) {
    if (depth > maxDepth) maxDepth = depth;
    n.children?.forEach(child => traverse(child, depth + 1));
  }
  traverse(node, 0);
  return maxDepth;
};

const fetchTagLineage = async () => {
  console.info('[Lineage] 开始加载血缘数据', { tab: activeTab.value });
  console.log('[Lineage Debug] 开始加载血缘数据');
  try {
    const startTime = performance.now();
    // 本地mock数据
const mockLineageData = {
  nodes: [
    {
      id: 'TAG_001',
      name: '高净值客户',
      type: 'tag',
      updatedAt: Date.now(),
      description: '月均AUM大于50万的客户群体',
      owner: '王伟',
      version: 'v2.3',
    },
    {
      id: 'ATT_001',
      name: '资产属性',
      type: 'attribute',
      dataType: 'number',
      lastUpdateTime: Date.now() - 3600000,
    },
    {
      id: 'ATT_002',
      name: '交易属性',
      type: 'attribute',
      dataType: 'number',
      lastUpdateTime: Date.now() - 7200000,
    },
    {
      id: 'TBL_001',
      name: '客户资产明细表',
      type: 'table',
      database: 'wealth_db',
      lastSyncTime: Date.now() - 86400000,
    },
    {
      id: 'TBL_002',
      name: '交易流水表',
      type: 'table',
      database: 'transaction_db',
      lastSyncTime: Date.now() - 172800000,
    },
    {
      id: 1, 
      name: '用户基础属性', 
      type: 'tag', 
      updatedAt: Date.now(),
    },
    { 
      id: 2, 
      name: '活跃用户群体', 
      type: 'audience', 
      lastUpdateTime: Date.now() - 86400000, 
    },
    { 
      id: 3, 
      name: '用户行为日志表', 
      type: 'table', 
      lastSyncTime: Date.now() - 259200000, 
    },
  ],
  links: [
    { source: 'TAG_001', target: 'ATT_001', type: 'attribute' },
    { source: 'TAG_001', target: 'ATT_002', type: 'attribute' },
    { source: 'ATT_001', target: 'TBL_001', type: 'table' },
    { source: 'ATT_002', target: 'TBL_002', type: 'table' },
    { source: 1, target: 2 },
    { source: 2, target: 3 }
  ]
};
const data = { data: mockLineageData };
    lineageData.value = processLineageData(data);

    console.info('[Lineage] 数据加载完成', {
      duration: `${performance.now() - startTime}ms`,
      source: 'mock',
      dataVersion: data.data.version || '1.0'
    });
    console.log('[Lineage Debug] 数据加载完成', {
      nodes: data.data.nodes.length,
      links: data.data.links.length
    });
    nextTick(initLineageChart)
  } catch (error) {
    console.error('获取血缘数据失败:', error)
  }
}

// 编辑模式相关
const isEditMode = ref(false) // 始终为false，禁止编辑
const originalTagValues = ref(null) // 用于保存编辑前的数据

// 配置选项卡相关
const activeConfigTab = ref('tag_value_1')
const tagValues = ref([
  {
    id: 'tag_value_1',
    name: '',
    description: '',
    conditionGroups: [],
    crossGroupLogic: 'or' // 跨条件组逻辑
  }
])

// 标签详情数据
const tagDetail = reactive({
  id: 'BEHAV_NSLFCPK',
  name: '数字产品',
  dataType: 'string',
  category: '基础信息',
  dimensionType: '客户级',
  shareLevel: 'public',
  createUser: '张力',
  description: '这是一个产品、商品分类、商品中类、商品小类、商品品牌、商品规格、商品价格、商品促销、商品库存、商品销量、商品评价、商品推荐、商品搜索、商品收藏、商品分享、商品比较、商品咨询、商品投诉、商品退换货等信息的标签主体。',
  // 分位统计所需元数据（R47 连续型判定 / R57-1 派生标记 / R57-2 数值单位）
  unit: '',
  derived: false,
  continuousType: 'categorical'
})

// 是否展示「分位统计」页签（R47：仅连续型标签提供分位统计）
const showQuantileTab = ref(false)

// 标签统计数据
const tagStats = reactive({
  coverageCount: 9999773,
  coverageRate: 98.99,
  uniqueCount: 8891,
  availableCount: 23,
  updateTime: '2023-10-14 3:23:12',
  totalCount: 9999773,
  dataDate: '2023-10-19'
})

// 数据分布数据
const distributionData = ref([
  { label: '标签组1', percentage: 85, color: 'var(--subapp-warning)' },
  { label: '标签组2', percentage: 70, color: 'var(--subapp-info)' },
  { label: '标签组3', percentage: 45, color: '#fadb14' }
])

// 规则配置相关数据
const conditionGroups = ref([]) // 条件组数组
const estimatedCount = ref(12843) // 预估覆盖人数
const availabilityRate = ref(98.2) // 标签可用率
const crossGroupLogic = ref('or') // 跨条件组逻辑，默认为或
const configType = ref('tag') // 当前配置类型，默认为标签
const logicType = ref('and') // 标签逻辑关系，默认为且

// 数据源类型选项
const dataSourceTypeOptions = [
  { label: '明细数据', value: 'detail' },
  { label: '行为数据', value: 'behavior' },
  { label: '属性数据', value: 'attribute' }
]

// 日期类型选项
const dateTypeOptions = [
  { label: '动态日期', value: 'dynamic' },
  { label: '固定日期', value: 'fixed' },
  { label: '单个日期', value: 'single' }
]

// 动态日期单位选项
const dynamicUnitOptions = [
  { label: '天', value: 'days' },
  { label: '周', value: 'weeks' },
  { label: '月', value: 'months' },
  { label: '年', value: 'years' }
]



// 获取数据类型颜色
const getDataTypeColor = (dataType) => {
  const colorMap = {
    string: 'green',
    number: 'blue'
  }
  return colorMap[dataType] || 'gray'
}

// 获取数据类型文本
const getDataTypeText = (dataType) => {
  const textMap = {
    string: '字符型',
    number: '数值型'
  }
  return textMap[dataType] || dataType
}

// 获取共享级别颜色
const getShareLevelColor = (shareLevel) => {
  const colorMap = {
    public: 'green',
    private: 'orange'
  }
  return colorMap[shareLevel] || 'gray'
}

// 获取共享级别文本
const getShareLevelText = (shareLevel) => {
  const textMap = {
    public: '公开',
    private: '私有'
  }
  return textMap[shareLevel] || shareLevel
}

// 格式化数字
const formatNumber = (num) => {
  return num.toLocaleString()
}

// 规则配置相关方法

// 生成唯一ID
const generateId = () => {
  return 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

// 添加条件组
const addConditionGroup = () => {
  const currentTagValue = getCurrentTagValue()
  if (currentTagValue) {
    const newGroup = {
      id: generateId(),
      name: `条件组${currentTagValue.conditionGroups.length + 1}`,
      collapsed: false,
      logic: 'and', // 默认为且逻辑
      conditions: []
    }
    currentTagValue.conditionGroups.push(newGroup)
    return newGroup
  }
}

// 复制条件组
const duplicateGroup = (group) => {
  const newGroup = {
    ...group,
    id: generateId(),
    name: group.name + ' 副本',
    logic: group.logic || 'and',
    conditions: group.conditions.map(condition => ({
      ...condition,
      id: generateId()
    }))
  }
  conditionGroups.value.push(newGroup)
}


// 删除条件组
const removeGroup = (groupIndex) => {
  conditionGroups.value.splice(groupIndex, 1)
}

// 删除条件组
const deleteConditionGroup = (groupIndex) => {
  const currentTagValue = getCurrentTagValue()
  if (currentTagValue) {
    currentTagValue.conditionGroups.splice(groupIndex, 1)
  }
}

// 切换条件组内的逻辑关系
const toggleGroupLogic = (group) => {
  group.logic = group.logic === 'and' ? 'or' : 'and'
}

// 标签值管理方法
// 新增标签值
const addTagValue = () => {
  const newId = `tag_value_${Date.now()}`
  const newTagValue = {
    id: newId,
    name: '',
    description: '',
    conditionGroups: [],
    crossGroupLogic: 'or'
  }
  tagValues.value.push(newTagValue)
  activeConfigTab.value = newId
}

// 删除标签值
const deleteTagValue = (targetKey) => {
  const index = tagValues.value.findIndex(item => item.id === targetKey)
  if (index > -1 && tagValues.value.length > 1) {
    tagValues.value.splice(index, 1)
    // 如果删除的是当前激活的tab，切换到第一个tab
    if (activeConfigTab.value === targetKey) {
      activeConfigTab.value = tagValues.value[0].id
    }
  }
}

// 更新tab标题
const updateTabTitle = (tagValue) => {
  // 这个方法主要用于触发响应式更新，实际标题更新由模板中的计算属性处理
}

// 编辑模式相关方法
// 进入编辑模式
const enterEditMode = () => {
  // 保存当前数据作为备份
  originalTagValues.value = JSON.parse(JSON.stringify(tagValues.value))
  isEditMode.value = true
}

// 保存配置
const saveConfiguration = () => {
  // 这里可以添加保存到后端的逻辑
  console.log('保存标签配置:', tagValues.value)
  
  // 模拟保存成功
  isEditMode.value = false
  originalTagValues.value = null
  
  // 显示保存成功提示
  // Message.success('配置保存成功')
}

// 取消编辑
const cancelEdit = () => {
  if (originalTagValues.value) {
    // 恢复原始数据
    tagValues.value = JSON.parse(JSON.stringify(originalTagValues.value))
  }
  isEditMode.value = false
  originalTagValues.value = null
}

// 获取当前标签值
const getCurrentTagValue = () => {
  return tagValues.value.find(item => item.id === activeConfigTab.value) || tagValues.value[0]
}

// 获取当前标签值的条件组
const getCurrentTagValueConditionGroups = () => {
  const currentTagValue = getCurrentTagValue()
  return currentTagValue ? currentTagValue.conditionGroups : []
}

// 切换跨条件组逻辑（针对当前标签值）
const toggleCrossGroupLogic = () => {
  const currentTagValue = getCurrentTagValue()
  if (currentTagValue) {
    currentTagValue.crossGroupLogic = currentTagValue.crossGroupLogic === 'and' ? 'or' : 'and'
  }
}

// 添加条件
const addCondition = (group) => {
  const newCondition = {
    id: generateId(),
    dataSourceType: 'detail',
    fieldName: '',
    aggregationType: 'sum',
    operator: 'gt',
    value: '',
    dateType: 'dynamic',
    dynamicValue: 7,
    dynamicUnit: 'days',
    dateRange: null,
    singleDate: null,
    isExclude: false,
    enableSequence: false,
    sequenceSteps: []
  }
  group.conditions.push(newCondition)
}

// 根据类型添加条件
const addConditionByType = (group, type) => {
  const typeMapping = {
    'tag': 'attribute',
    'behavior': 'behavior',
    'detail': 'detail',
    'user': 'attribute'
  }
  
  const dataSourceType = typeMapping[type] || 'detail'
  
  const newCondition = {
    id: generateId(),
    dataSourceType: dataSourceType,
    fieldName: '',
    aggregationType: getDefaultAggregationType(dataSourceType),
    operator: getDefaultOperator(dataSourceType),
    value: '',
    dateType: dataSourceType === 'attribute' ? null : 'dynamic',
    dynamicValue: 7,
    dynamicUnit: 'days',
    dateRange: null,
    singleDate: null,
    isExclude: false,
    enableSequence: false,
    sequenceSteps: []
  }
  group.conditions.push(newCondition)
}

// 添加排除条件
const addExcludeCondition = (group) => {
  const newCondition = {
    id: generateId(),
    dataSourceType: 'detail',
    fieldName: '',
    aggregationType: 'sum',
    operator: 'gt',
    value: '',
    dateType: 'dynamic',
    dynamicValue: 7,
    dynamicUnit: 'days',
    dateRange: null,
    singleDate: null,
    isExclude: true,
    enableSequence: false,
    sequenceSteps: []
  }
  group.conditions.push(newCondition)
}

// 复制条件
const duplicateCondition = (group, condition) => {
  const newCondition = {
    ...condition,
    id: generateId()
  }
  group.conditions.push(newCondition)
}

// 切换排除条件
const toggleExcludeCondition = (condition) => {
  condition.isExclude = !condition.isExclude
}

// 清空画布
const clearCanvas = () => {
  conditionGroups.value = []
  estimatedCount.value = 0
}

// 导出规则
const exportRules = () => {
  const rules = {
    tagId: route.params.id,
    tagName: tagDetail.name,
    logic: 'or', // 条件组间固定为OR关系
    conditionGroups: conditionGroups.value.map(group => ({
      id: group.id,
      name: group.name,
      logic: group.logic,
      conditions: group.conditions.map(condition => ({
        id: condition.id,
        dataSourceType: condition.dataSourceType,
        fieldName: condition.fieldName,
        aggregationType: condition.aggregationType,
        operator: condition.operator,
        value: condition.value,
        dateType: condition.dateType,
        dateRange: condition.dateRange,
        dynamicValue: condition.dynamicValue,
        dynamicUnit: condition.dynamicUnit,
        isExclude: condition.isExclude
      }))
    })),
    estimatedCount: estimatedCount.value,
    exportTime: new Date().toISOString()
  }
  
  const blob = new Blob([JSON.stringify(rules, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tag-rules-${tagDetail.name || 'unnamed'}-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 编辑条件组名称
const editGroupName = (group) => {
  // 这里可以弹出编辑对话框
  const newName = prompt('请输入新的条件组名称:', group.name)
  if (newName && newName.trim()) {
    group.name = newName.trim()
  }
}

// 删除条件
const removeCondition = (group, conditionIndex) => {
  group.conditions.splice(conditionIndex, 1)
  
  // 如果条件组为空，可以选择删除条件组
  if (group.conditions.length === 0) {
    // 这里可以提示用户是否删除空的条件组
  }
}



// 数据源类型变化处理
const onDataSourceTypeChange = (condition) => {
  // 重置相关字段
  condition.aggregationType = getDefaultAggregationType(condition.dataSourceType)
  condition.operator = getDefaultOperator(condition.dataSourceType)
  condition.value = ''
  
  // 属性数据不需要日期范围
  if (condition.dataSourceType === 'attribute') {
    condition.dateType = null
  } else if (!condition.dateType) {
    condition.dateType = 'dynamic'
    condition.dynamicValue = 7
    condition.dynamicUnit = 'days'
  }
}

// 日期类型变化处理
const onDateTypeChange = (condition) => {
  // 重置日期相关字段
  condition.dateRange = null
  condition.singleDate = null
  condition.dynamicValue = 7
  condition.dynamicUnit = 'days'
}

// 配置行为路径
const configureSequence = (condition) => {
  // 这里可以打开行为路径配置对话框
  console.log('配置行为路径:', condition)
}

// 获取聚合类型选项
const getAggregationOptions = (dataSourceType) => {
  if (dataSourceType === 'detail') {
    return [
      { label: '求和', value: 'sum' },
      { label: '平均值', value: 'avg' },
      { label: '最大值', value: 'max' },
      { label: '最小值', value: 'min' },
      { label: '去重计数', value: 'distinct_count' },
      { label: '计数', value: 'count' }
    ]
  } else if (dataSourceType === 'behavior') {
    return [
      { label: '次数', value: 'count' },
      { label: '天数', value: 'days' },
      { label: '连续天数', value: 'consecutive_days' },
      { label: '去重计数', value: 'distinct_count' }
    ]
  }
  return []
}

// 获取默认聚合类型
const getDefaultAggregationType = (dataSourceType) => {
  if (dataSourceType === 'detail') {
    return 'sum'
  } else if (dataSourceType === 'behavior') {
    return 'count'
  }
  return null
}

// 获取默认操作符
const getDefaultOperator = (dataSourceType) => {
  if (dataSourceType === 'detail' || dataSourceType === 'behavior') {
    return 'gt'
  } else if (dataSourceType === 'attribute') {
    return 'eq'
  }
  return 'eq'
}

// 获取操作符选项
const getOperatorOptions = (condition) => {
  const commonOptions = [
    { label: '等于', value: 'eq' },
    { label: '不等于', value: 'ne' }
  ]
  
  const numericOptions = [
    { label: '大于', value: 'gt' },
    { label: '大于等于', value: 'gte' },
    { label: '小于', value: 'lt' },
    { label: '小于等于', value: 'lte' }
  ]
  
  const stringOptions = [
    { label: '包含', value: 'contains' },
    { label: '不包含', value: 'not_contains' },
    { label: '开始于', value: 'starts_with' },
    { label: '结束于', value: 'ends_with' }
  ]
  
  const existsOptions = [
    { label: '存在', value: 'exists' },
    { label: '不存在', value: 'not_exists' }
  ]
  
  if (condition.dataSourceType === 'detail' || condition.dataSourceType === 'behavior') {
    return [...commonOptions, ...numericOptions, ...existsOptions]
  } else if (condition.dataSourceType === 'attribute') {
    return [...commonOptions, ...stringOptions, ...existsOptions]
  }
  
  return commonOptions
}

// 是否需要值输入
const needValueInput = (condition) => {
  return condition.operator !== 'exists' && condition.operator !== 'not_exists'
}

// 获取值输入提示
const getValuePlaceholder = (condition) => {
  if (condition.dataSourceType === 'detail') {
    if (condition.aggregationType === 'sum' || condition.aggregationType === 'avg') {
      return '请输入金额'
    } else if (condition.aggregationType === 'count' || condition.aggregationType === 'distinct_count') {
      return '请输入数量'
    }
    return '请输入数值'
  } else if (condition.dataSourceType === 'behavior') {
    if (condition.aggregationType === 'count') {
      return '请输入次数'
    } else if (condition.aggregationType === 'days' || condition.aggregationType === 'consecutive_days') {
      return '请输入天数'
    }
    return '请输入数值'
  } else if (condition.dataSourceType === 'attribute') {
    return '请输入属性值'
  }
  return '请输入值'
}

// 获取字段选项
const getFieldOptions = (dataSourceType) => {
  if (dataSourceType === 'detail') {
    return [
      { label: '交易金额', value: 'transaction_amount' },
      { label: '交易笔数', value: 'transaction_count' },
      { label: '商品数量', value: 'product_quantity' },
      { label: '优惠金额', value: 'discount_amount' }
    ]
  } else if (dataSourceType === 'behavior') {
    return [
      { label: '页面访问', value: 'page_view' },
      { label: '商品点击', value: 'product_click' },
      { label: '加购行为', value: 'add_to_cart' },
      { label: '下单行为', value: 'place_order' },
      { label: '支付行为', value: 'payment' }
    ]
  } else if (dataSourceType === 'attribute') {
    return [
      { label: '性别', value: 'gender' },
      { label: '年龄', value: 'age' },
      { label: '城市', value: 'city' },
      { label: '职业', value: 'occupation' },
      { label: '会员等级', value: 'member_level' }
    ]
  }
  return []
}



/**
 * 按路由参数加载标签详情（含分位统计所需的连续型/派生/单位元数据）
 * @param {string} tagId 标签 ID
 * @returns {Promise<void>} 加载完成
 */
const loadTagDetail = async (tagId) => {
  if (!tagId) return
  try {
    const tag = await getTag(tagId)
    if (!tag) return
    tagDetail.id = tag.id
    tagDetail.name = tag.name
    tagDetail.dataType = tag.dataType
    tagDetail.category = tag.category
    tagDetail.dimensionType = tag.dimensionKey
    tagDetail.shareLevel = tag.shareLevel
    tagDetail.createUser = tag.createUser
    if (tag.description) tagDetail.description = tag.description
    tagDetail.unit = tag.unit || ''
    tagDetail.derived = !!tag.derived
    tagDetail.continuousType = tag.continuousType || 'categorical'
    // R47：仅连续型标签提供分位统计入口
    showQuantileTab.value = tagDetail.continuousType === 'continuous'
    if (!showQuantileTab.value && activeTab.value === 'quantile') {
      activeTab.value = 'distribution'
    }
  } catch (error) {
    console.warn('标签详情加载失败，保留演示数据:', error)
  }
}

// 组件挂载时获取标签详情
onMounted(() => {
  loadTagDetail(route.params.id || 'tag_003')
})


</script>

<style scoped>
.tag-detail {
  padding: 16px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.breadcrumb {
  margin-bottom: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  padding: 16px;
  background: white;
  border-radius: 6px;
}

.header-content {
  flex: 1;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 500;
  color: var(--subapp-text-primary);
}

.tag-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.tag-id {
  color: var(--subapp-text-tertiary);
  font-size: 14px;
}

.tag-name {
  color: var(--subapp-text-primary);
  font-size: 16px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.content-section {
  margin-bottom: 16px;
}

.info-card,
.subject-card {
  border-radius: 6px;
}

.card-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--subapp-text-primary);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-row {
  display: flex;
  gap: 32px;
}

.info-row.full-width {
  flex-direction: column;
}

.info-item {
  display: flex;
  align-items: center;
  flex: 1;
}

.info-item .label {
  color: var(--subapp-text-tertiary);
  margin-right: 8px;
  min-width: 80px;
}

.info-item .value {
  color: var(--subapp-text-primary);
}

.info-item .description {
  line-height: 1.6;
  text-align: justify;
}

.subject-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.subject-stats {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  color: var(--subapp-text-tertiary);
  font-size: 14px;
}

.stat-value {
  color: var(--subapp-text-primary);
  font-size: 16px;
  font-weight: 500;
}

.stat-value.primary {
  color: var(--subapp-info);
  font-size: 18px;
}

.chart-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chart-tabs {
  display: flex;
  justify-content: flex-start;
}

.chart-content {
  min-height: 300px;
}

.distribution-chart {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.total-count {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.count-number {
  font-size: 32px;
  font-weight: bold;
  color: var(--subapp-info);
}

.count-label {
  font-size: 16px;
  color: var(--subapp-text-primary);
}

.count-desc {
  font-size: 14px;
  color: var(--subapp-text-tertiary);
  margin-left: 16px;
}

.distribution-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 600px;
}

.bar-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bar-label {
  min-width: 80px;
  font-size: 14px;
  color: var(--subapp-text-primary);
}

.bar-container {
  flex: 1;
  height: 20px;
  background-color: var(--subapp-bg-secondary);
  border-radius: 10px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 10px;
  transition: width 0.3s ease;
}

.bar-value {
  min-width: 50px;
  text-align: right;
  font-size: 14px;
  color: var(--subapp-text-primary);
}

.trend-chart {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.trend-placeholder {
  color: var(--subapp-text-tertiary);
  font-size: 16px;
}

/* 连续型标签分位统计区（模块 E） */
.quantile-chart-wrap {
  padding: 16px 0 8px;
}

/* 规则配置区域样式 */
.rule-config-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  border: 1px solid var(--subapp-border);
}

.logic-switch {
  padding: 16px 24px;
  background: linear-gradient(135deg, #f8f9fa 0%, var(--subapp-bg-secondary) 100%);
  border-bottom: 1px solid var(--subapp-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logic-label {
  font-size: 14px;
  color: var(--subapp-text-tertiary);
}

.rule-config-content {
  padding: 24px;
}

/* 上下布局样式 */
.tag-values-config-vertical {
  display: flex;
  flex-direction: column;
  gap: 24px;
  height: 100%;
}

/* 标签值管理区域 */
.tag-values-management {
  background: #ffffff;
  border: 1px solid var(--subapp-border);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.tag-values-management .section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--subapp-border);
}

.tag-values-management .section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.tag-values-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tag-value-item {
  border: 1px solid var(--subapp-border);
  border-radius: 6px;
  background: #8f909c;
  transition: all 0.2s ease;
  cursor: pointer;
}

.tag-value-item:hover {
  border-color: var(--subapp-primary);
  background: #f2f7ff;
}

.tag-value-item.active {
  border-color: var(--subapp-primary);
  background: #e8f4ff;
  box-shadow: 0 0 0 2px rgba(22, 93, 255, 0.1);
}

.tag-value-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
}

.tag-value-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tag-value-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--subapp-text-primary);
}

.tag-value-desc {
  font-size: 12px;
  color: var(--subapp-text-tertiary);
}

.tag-value-actions {
  display: flex;
  gap: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--subapp-text-tertiary);
  text-align: center;
}

.empty-state p {
  margin: 12px 0 0;
  font-size: 14px;
}

/* 标签值配置区域 */
.tag-value-config-section {
  flex: 1;
  background: #ffffff;
  border: 1px solid var(--subapp-border);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--subapp-border);
}

.config-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.condition-groups-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.condition-groups-section .section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--subapp-border);
}

.condition-groups-section .section-header .section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--subapp-text-primary);
  margin: 0;
}

.condition-groups-section .section-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.condition-groups-section .condition-count {
  font-size: 12px;
  color: var(--subapp-text-tertiary);
  background: var(--subapp-bg-secondary);
  padding: 4px 8px;
  border-radius: 4px;
}

/* 配置选项卡样式 */
.config-tabs {
  margin-bottom: 20px;
  border-bottom: 1px solid var(--subapp-border);
}

/* 标签值配置样式 */
.tag-value-config {
  padding: 16px 0;
}

.config-row {
  display: flex;
  gap: 20px;
  align-items: flex-end;
}

.config-item {
  flex: 1;
}

.config-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.config-input {
  width: 100%;
}

/* 规则配置头部 */
.rule-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, var(--subapp-bg-secondary) 100%);
  border-radius: 12px;
  border: 1px solid var(--subapp-border);
}

.rule-summary {
  display: flex;
  align-items: center;
  gap: 32px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-label {
  font-size: 12px;
  color: var(--subapp-text-tertiary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.logic-flow {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logic-text {
  font-size: 14px;
  color: var(--subapp-text-primary);
  font-weight: 500;
}

.logic-badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.logic-badge.or {
  background: #fff3e0;
  color: #f57c00;
  border: 1px solid #ffcc80;
}

.estimated-result {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.result-count {
  font-size: 18px;
  font-weight: 600;
  color: var(--subapp-success);
}

.result-unit {
  font-size: 12px;
  color: var(--subapp-text-tertiary);
}

.rule-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 条件组工作区 */
.conditions-workspace {
  min-height: 300px;
}

/* 空状态样式 */
.empty-workspace {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
  padding: 40px 20px;
}

.empty-illustration {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--subapp-bg-secondary) 0%, var(--subapp-border) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.empty-illustration .arco-icon {
  font-size: 32px;
  color: var(--subapp-text-tertiary);
}

.empty-content {
  max-width: 400px;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--subapp-text-primary);
  margin: 0 0 12px 0;
}

.empty-description {
  font-size: 14px;
  color: var(--subapp-text-tertiary);
  line-height: 1.6;
  margin: 0 0 32px 0;
}

/* 条件组工作区 */
.condition-groups-workspace {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.workspace-container {
  position: relative;
  display: flex;
  gap: 20px;
  align-items: flex-start;
  padding-left: 60px;
}

/* 垂直逻辑连接线 */
.vertical-logic-line {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.logic-line-vertical {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 3px;
  background: linear-gradient(to bottom, transparent 0%, #e8f4ff 20%, var(--subapp-info) 50%, #e8f4ff 80%, transparent 100%);
  border-radius: 2px;
  transform: translateX(-50%);
}

.vertical-logic-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border: 2px solid var(--subapp-info);
  border-radius: 20px;
  padding: 12px 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 2;
  transition: all 0.2s ease;
  cursor: pointer;
}

.vertical-logic-indicator:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.vertical-logic-indicator.and {
  border-color: #52c41a;
  background: #f6ffed;
}

.vertical-logic-indicator.and .vertical-logic-text {
  color: #52c41a;
}

.vertical-logic-indicator.or {
  border-color: #fa8c16;
  background: #fff7e6;
}

.vertical-logic-indicator.or .vertical-logic-text {
  color: #fa8c16;
}

.vertical-logic-text {
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
}

/* 条件配置区域 */
.conditions-config-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 配置类型选择器 */
.config-type-selector {
  background: white;
  border: 1px solid var(--subapp-border);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.config-type-tabs {
  display: flex;
  gap: 8px;
}

.config-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--subapp-border);
  border-radius: 6px;
  background: white;
  color: var(--subapp-text-tertiary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.config-tab:hover {
  border-color: var(--subapp-info);
  color: var(--subapp-info);
  background: #f8faff;
}

.config-tab.active {
  border-color: var(--subapp-info);
  background: var(--subapp-info);
  color: white;
}

.config-tab.active:hover {
  background: var(--subapp-info);
}

/* 条件组列表 */
.condition-groups-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.condition-group-card {
  border: 1px solid var(--subapp-border);
  border-radius: 12px;
  background: white;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.condition-group-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border-color: #d4edda;
}






/* 条件列表样式 */
.conditions-list {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
}

/* 组逻辑连接线 */
.group-logic-line {
  position: absolute;
  left: 44px;
  top: 40px;
  bottom: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1;
}

.logic-line {
  width: 3px;
  flex: 1;
  background: linear-gradient(to bottom, #e8f4ff 0%, #fff7e6 50%, #e8f4ff 100%);
  border-radius: 2px;
  position: relative;
}

.logic-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border: 2px solid var(--subapp-border);
  border-radius: 20px;
  padding: 8px 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 2;
  transition: all 0.2s ease;
}

.logic-indicator.clickable {
  cursor: pointer;
}

.logic-indicator.clickable:hover {
  transform: translate(-50%, -50%) scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.logic-indicator.and {
  border-color: var(--subapp-info);
  background: #e8f4ff;
}

.logic-indicator.and .logic-text {
  color: var(--subapp-info);
  font-weight: 600;
}

.logic-indicator.or {
  border-color: var(--subapp-warning);
  background: #fff7e6;
}

.logic-indicator.or .logic-text {
  color: var(--subapp-warning);
  font-weight: 600;
}



.logic-text {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}

.condition-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  position: relative;
  z-index: 3;
}

.condition-item.excluded {
  opacity: 0.7;
}

.condition-item.excluded .condition-config {
  background: #fff2f0;
  border-left: 3px solid var(--subapp-danger);
}

/* 简化的条件连接器 */
.condition-connector {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  padding-top: 8px;
}

.condition-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  border: 3px solid var(--subapp-primary);
  box-shadow: 0 2px 6px rgba(22, 93, 255, 0.3);
  position: relative;
  z-index: 4;
}

/* 条件配置区域 */
.condition-config {
  flex: 1;
  background: white;
  border: 1px solid var(--subapp-border);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.condition-config:hover {
  border-color: #d4edda;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.exclude-indicator {
  margin-bottom: 12px;
}

.exclude-label {
  display: inline-block;
  padding: 4px 8px;
  background: #fff2f0;
  color: var(--subapp-danger);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 条件配置表单 */
.condition-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.form-row.primary {
  border-bottom: 1px solid var(--subapp-bg-secondary);
  padding-bottom: 12px;
}

.form-row.secondary {
  padding-top: 8px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 120px;
}

.form-group.wide {
  min-width: 200px;
}

.form-group.dynamic-time {
  min-width: 240px;
}

.form-label {
  font-size: 12px;
  color: var(--subapp-text-tertiary);
  font-weight: 500;
  white-space: nowrap;
}

.form-control {
  min-width: 120px;
}

.form-control.wide {
  min-width: 180px;
}

.dynamic-time-inputs {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dynamic-prefix {
  font-size: 12px;
  color: var(--subapp-text-tertiary);
  white-space: nowrap;
}

.dynamic-value {
  width: 60px;
}

.dynamic-unit {
  width: 60px;
}

/* 条件操作按钮 */
.condition-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
  flex-shrink: 0;
}

.action-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--subapp-border);
  background: white;
  color: var(--subapp-text-tertiary);
  transition: all 0.2s ease;
  cursor: pointer;
}

.action-btn:hover {
  border-color: var(--subapp-primary);
  color: var(--subapp-primary);
  background: #f2f3ff;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(22, 93, 255, 0.2);
}

.action-btn.exclude-active {
  background: #fff7e6;
  border-color: var(--subapp-warning);
  color: var(--subapp-warning);
}

.action-btn.exclude-active:hover {
  background: #fff3e0;
  border-color: #f57c00;
  color: #f57c00;
}

.action-btn.danger {
  border-color: #ffccc7;
  color: var(--subapp-danger);
}

.action-btn.danger:hover {
  background: #fff2f0;
  border-color: var(--subapp-danger);
  color: #cb272d;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(255, 77, 79, 0.2);
}

/* 添加条件区域 */
.add-condition-area {
  display: flex;
  justify-content: center;
  padding: 16px 0;
  border-top: 1px dashed var(--subapp-border);
  margin-top: 8px;
}

.add-condition-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: center;
}

.add-condition-btn {
  border: 1px dashed #d4edda;
  background: #f6ffed;
  color: #52c41a;
  transition: all 0.3s ease;
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 6px;
  min-width: 90px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.add-condition-btn:hover {
  border-color: #52c41a;
  background: #f6ffed;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(82, 196, 26, 0.2);
  color: #389e0d;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(82, 196, 26, 0.2);
}

/* 条件组间分隔器 */
.group-separator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 16px 0;
  position: relative;
}

.separator-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, var(--subapp-border), transparent);
}

/* 添加条件组区域 */
.add-condition-group-area {
  display: flex;
  justify-content: flex-start;
  padding: 20px 0;
  margin-top: 16px;
  border-top: 1px dashed var(--subapp-border);
}

.add-condition-group-area .add-condition-group-btn {
  border: 1px dashed #d4edda;
  background: #f6ffed;
  color: #52c41a;
  transition: all 0.3s ease;
  padding: 8px 16px;
  font-weight: 500;
}

.add-condition-group-area .add-condition-group-btn:hover {
  border-color: #52c41a;
  background: #f6ffed;
  color: #389e0d;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(82, 196, 26, 0.2);
}

/* 危险操作样式 */
.danger {
  color: var(--subapp-danger) !important;
}

.danger:hover {
  background: #fff2f0 !important;
}

/* 可点击逻辑连接器样式 */
.logic-connector {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: #fff;
  border: 2px solid #e8e8e8;
  border-radius: 12px;
  padding: 4px 12px;
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  z-index: 2;
}

.logic-connector.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}

.logic-connector.clickable:hover {
  border-color: var(--subapp-info);
  color: var(--subapp-info);
  background: #f6ffed;
}

/* 条件组标题样式 */
.condition-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fafafa;
  border-bottom: 1px solid var(--subapp-border);
  border-radius: 6px 6px 0 0;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-name {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.group-count {
  color: #666;
  font-size: 12px;
}

.group-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 删除条件组按钮样式 */
.delete-group-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  color: var(--subapp-text-tertiary);
  transition: all 0.2s ease;
}

.delete-group-btn:hover {
  color: var(--subapp-danger);
  background: #fff2f0;
}

/* 折叠按钮样式 */
.rotate-180 {
  transform: rotate(180deg);
  transition: transform 0.2s ease;
/* 标签值条件配置样式 */
.tag-value-conditions {
  margin-top: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.condition-count {
  font-size: 12px;
  color: var(--subapp-text-tertiary);
}

/* 编辑控制区域样式 */
.edit-control-area {
  margin: 16px 0;
  padding: 16px;
  background: #f7f8fa;
  border-radius: 6px;
  border: 1px solid var(--subapp-border);
}

.edit-actions {
  display: flex;
  justify-content: center;
}

.edit-btn {
  min-width: 120px;
}

.edit-mode-actions {
  display: flex;
  gap: 12px;
}

.save-btn {
  min-width: 100px;
}

.cancel-btn {
  min-width: 100px;
}

/* 禁用状态样式 */
.vertical-logic-indicator:not(.clickable) {
  cursor: default;
  opacity: 0.6;
}

.logic-indicator:not(.clickable) {
    cursor: default;
    opacity: 0.6;
  }
}

.section-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 500;
  color: #333;
}


</style>

const processLineageData = (data) => {
  return {
    nodes: data.data.nodes.map(node => ({
      ...node,
      label: node.name,
      tooltip: `最后更新: ${new Date(node.updatedAt || node.lastUpdateTime).toLocaleString()}`
    })),
    links: data.data.links
  };
}