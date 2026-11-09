<template>
  <div class="indicator-detail-drawer">
    <a-drawer
      :visible="visible"
      :width="800"
      :footer="false"
      @cancel="handleClose"
      unmount-on-close
    >
      <template #title>
        <div class="drawer-header">
          <div class="header-main">
            <span class="title">{{ indicator?.name }}</span>
            <a-tag color="blue" size="small" class="code-tag">{{ indicator?.code }}</a-tag>
          </div>
          <div class="header-sub">
            <a-space>
              <a-tag :color="getStatusColor(indicator?.status)">{{ getStatusText(indicator?.status) }}</a-tag>
              <span class="update-time">更新于: {{ indicator?.date }}</span>
            </a-space>
          </div>
        </div>
      </template>

      <div class="drawer-content">
        <!-- 核心指标卡片 -->
        <div class="metric-summary">
          <a-row :gutter="16">
            <a-col :span="8">
              <div class="summary-item">
                <div class="label">当前数值</div>
                <div class="value-group">
                  <span class="value">{{ indicator?.value }}</span>
                  <span class="unit">{{ indicator?.unit }}</span>
                </div>
              </div>
            </a-col>
            <a-col :span="8">
              <div class="summary-item">
                <div class="label">环比波动</div>
                <div class="value-group">
                  <span :class="['trend-value', getTrendClass(indicator?.trend)]">
                    {{ Math.abs(indicator?.trend || 0) }}%
                    <component :is="getTrendIcon(indicator?.trend)" />
                  </span>
                </div>
              </div>
            </a-col>
            <a-col :span="8">
              <div class="summary-item">
                <div class="label">归属场景</div>
                <div class="value-group">
                  <span class="category">{{ indicator?.category || '-' }}</span>
                </div>
              </div>
            </a-col>
          </a-row>
        </div>

        <a-divider />

        <!-- 历史趋势图表 -->
        <div class="chart-section">
          <div class="section-title">
            <span class="text">历史趋势 (近30天)</span>
            <a-radio-group type="button" size="small" v-model="timeRange" @change="handleTimeRangeChange">
              <a-radio value="7">近7天</a-radio>
              <a-radio value="30">近30天</a-radio>
              <a-radio value="90">近90天</a-radio>
            </a-radio-group>
          </div>
          <div class="chart-container" ref="trendChartRef"></div>
        </div>

        <a-divider />

        <!-- 异动归因分析 -->
        <div class="analysis-section">
          <div class="section-title">
            <span class="text">异动归因分析</span>
            <a-tag color="orange" size="small" v-if="hasAnomaly">检测到异常波动</a-tag>
          </div>
          
          <a-spin :loading="analyzing">
            <div v-if="!hasAnomaly" class="empty-analysis">
              <icon-check-circle-fill class="success-icon" />
              <span>指标运行平稳，未检测到显著异动</span>
            </div>
            
            <div v-else class="attribution-content">
              <div class="anomaly-alert">
                <icon-exclamation-circle-fill class="warning-icon" />
                <span class="warning-text">检测到 {{ anomalyDate }} 数据出现异常{{ anomalyType }}，幅度 {{ anomalyValue }}%</span>
              </div>
              
              <div class="factors-list">
                <div class="factor-item" v-for="(factor, index) in attributionFactors" :key="index">
                  <div class="factor-header">
                    <span class="factor-name">{{ factor.name }}</span>
                    <span class="factor-contribution">贡献度: {{ factor.contribution }}%</span>
                  </div>
                  <a-progress 
                    :percent="factor.contribution / 100" 
                    :color="factor.impact > 0 ? '#F53F3F' : 'var(--subapp-success)'"
                    :track-color="'#F2F3F5'"
                    size="small"
                  />
                  <div class="factor-desc">{{ factor.desc }}</div>
                </div>
              </div>

              <div class="suggestion-box">
                <div class="suggestion-title">智能建议</div>
                <p>{{ suggestion }}</p>
              </div>
            </div>
          </a-spin>
        </div>
      </div>
    </a-drawer>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { 
  IconArrowUp, 
  IconArrowDown, 
  IconMinus,
  IconCheckCircleFill,
  IconExclamationCircleFill
} from '@arco-design/web-vue/es/icon'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  indicator: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:visible', 'cancel'])

const trendChartRef = ref(null)
let chartInstance = null
const timeRange = ref('30')
const analyzing = ref(false)
const hasAnomaly = ref(false)
const anomalyDate = ref('')
const anomalyType = ref('')
const anomalyValue = ref(0)
const attributionFactors = ref([])
const suggestion = ref('')

// 监听弹窗显示，初始化图表
watch(() => props.visible, (newVal) => {
  if (newVal) {
    nextTick(() => {
      initChart()
      analyzeAttribution()
    })
  } else {
    disposeChart()
  }
})

const handleClose = () => {
  emit('update:visible', false)
  emit('cancel')
}

// 状态辅助函数
const getStatusColor = (status) => {
  return status === 'active' ? 'green' : 'gray'
}

const getStatusText = (status) => {
  return status === 'active' ? '生效中' : '已停用'
}

const getTrendClass = (trend) => {
  if (!trend) {return 'neutral'}
  return trend > 0 ? 'up' : (trend < 0 ? 'down' : 'neutral')
}

const getTrendIcon = (trend) => {
  if (!trend) {return IconMinus}
  return trend > 0 ? IconArrowUp : IconArrowDown
}

// 图表初始化
const initChart = () => {
  if (!trendChartRef.value) {return}
  
  // 如果已存在实例，先销毁
  if (chartInstance) {
    chartInstance.dispose()
  }

  chartInstance = echarts.init(trendChartRef.value)
  updateChartData()
  
  window.addEventListener('resize', handleResize)
}

const disposeChart = () => {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
  window.removeEventListener('resize', handleResize)
}

const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

const handleTimeRangeChange = () => {
  updateChartData()
}

// 生成模拟数据并更新图表
const updateChartData = () => {
  if (!chartInstance) {return}

  const days = parseInt(timeRange.value, 10)
  const data = []
  const dateList = []
  
  // 生成日期和数据
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dateList.push(`${d.getMonth() + 1}/${d.getDate()}`)
    
    // 模拟数据波动
    const baseValue = props.indicator?.value || 1000
    // 添加一些随机波动
    const randomFactor = 0.8 + Math.random() * 0.4
    data.push(Math.round(baseValue * randomFactor))
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c}'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dateList,
      axisLine: {
        lineStyle: {
          color: '#E5E6EB'
        }
      },
      axisLabel: {
        color: '#86909C'
      }
    },
    yAxis: {
      type: 'value',
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: '#E5E6EB'
        }
      },
      axisLabel: {
        color: '#86909C'
      }
    },
    series: [
      {
        name: props.indicator?.name || '指标值',
        type: 'line',
        smooth: true,
        symbol: 'none',
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: 'rgba(22, 93, 255, 0.3)'
            },
            {
              offset: 1,
              color: 'rgba(22, 93, 255, 0)'
            }
          ])
        },
        itemStyle: {
          color: 'var(--subapp-primary)'
        },
        data: data
      }
    ]
  }

  chartInstance.setOption(option)
}

// 模拟异动归因分析
const analyzeAttribution = () => {
  analyzing.value = true
  
  // 模拟 API 请求延迟
  setTimeout(() => {
    // 随机决定是否有异动 (为了演示，如果 trend 绝对值大于 5% 则认为有异动)
    const trend = Math.abs(props.indicator?.trend || 0)
    hasAnomaly.value = trend > 5
    
    if (hasAnomaly.value) {
      const today = new Date()
      anomalyDate.value = `${today.getMonth() + 1}月${today.getDate()}日`
      anomalyType.value = props.indicator?.trend > 0 ? '上涨' : '下跌'
      anomalyValue.value = trend
      
      // 模拟归因因子
      if (props.indicator?.trend > 0) {
        attributionFactors.value = [
          { name: '营销活动拉动', contribution: 65, impact: 1, desc: '近期"春季大促"活动带来显著流量增长' },
          { name: '自然流量增长', contribution: 25, impact: 1, desc: 'SEO优化效果显现，搜索流量提升' },
          { name: '渠道投放增加', contribution: 10, impact: 1, desc: '增加了在社交媒体的广告投放预算' }
        ]
        suggestion.value = '当前指标增长势头良好，建议继续保持当前的营销策略，并重点关注转化率的变化，确保流量质量。'
      } else {
        attributionFactors.value = [
          { name: '服务器故障', contribution: 55, impact: -1, desc: '昨日晚间核心服务出现短暂不可用' },
          { name: '竞品活动冲击', contribution: 30, impact: -1, desc: '主要竞品上线了大力度促销活动' },
          { name: '季节性波动', contribution: 15, impact: -1, desc: '属于行业常规的周期性回调' }
        ]
        suggestion.value = '建议立即排查服务器稳定性问题，防止故障再次发生。同时关注竞品动态，考虑推出应对性的促销活动。'
      }
    }
    
    analyzing.value = false
  }, 800)
}

onUnmounted(() => {
  disposeChart()
})
</script>

<style scoped lang="less">
.drawer-header {
  .header-main {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    
    .title {
      font-size: 18px;
      font-weight: 600;
      color: var(--color-text-1);
      margin-right: 8px;
    }
    
    .code-tag {
      font-family: monospace;
    }
  }
  
  .header-sub {
    .update-time {
      font-size: 12px;
      color: var(--color-text-3);
    }
  }
}

.drawer-content {
  padding: 0 16px;
  
  .metric-summary {
    padding: 16px 0;
    
    .summary-item {
      .label {
        font-size: 12px;
        color: var(--color-text-3);
        margin-bottom: 4px;
      }
      
      .value-group {
        display: flex;
        align-items: baseline;
        
        .value {
          font-size: 24px;
          font-weight: 600;
          color: var(--color-text-1);
          margin-right: 4px;
        }
        
        .unit {
          font-size: 12px;
          color: var(--color-text-3);
        }
        
        .trend-value {
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 2px;
          
          &.up { color: rgb(var(--red-6)); }
          &.down { color: rgb(var(--green-6)); }
          &.neutral { color: var(--color-text-3); }
        }
        
        .category {
          font-size: 14px;
          color: var(--color-text-1);
        }
      }
    }
  }
  
  .section-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    
    .text {
      font-size: 16px;
      font-weight: 500;
      color: var(--color-text-1);
      border-left: 3px solid rgb(var(--primary-6));
      padding-left: 8px;
    }
  }
  
  .chart-section {
    margin-top: 24px;
    
    .chart-container {
      width: 100%;
      height: 300px;
    }
  }
  
  .analysis-section {
    margin-top: 24px;
    
    .empty-analysis {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 0;
      color: var(--color-text-3);
      background: var(--color-fill-1);
      border-radius: 4px;
      
      .success-icon {
        font-size: 32px;
        color: rgb(var(--green-6));
        margin-bottom: 12px;
      }
    }
    
    .attribution-content {
      .anomaly-alert {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background: rgba(var(--orange-6), 0.1);
        border: 1px solid rgba(var(--orange-6), 0.3);
        border-radius: 4px;
        margin-bottom: 16px;
        
        .warning-icon {
          color: rgb(var(--orange-6));
          margin-right: 8px;
          font-size: 16px;
        }
        
        .warning-text {
          color: rgb(var(--orange-6));
          font-size: 14px;
          font-weight: 500;
        }
      }
      
      .factors-list {
        margin-bottom: 20px;
        
        .factor-item {
          margin-bottom: 16px;
          
          .factor-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            
            .factor-name {
              font-weight: 500;
              color: var(--color-text-1);
            }
            
            .factor-contribution {
              font-size: 12px;
              color: var(--color-text-3);
            }
          }
          
          .factor-desc {
            margin-top: 4px;
            font-size: 12px;
            color: var(--color-text-3);
          }
        }
      }
      
      .suggestion-box {
        background: var(--color-fill-2);
        padding: 16px;
        border-radius: 4px;
        
        .suggestion-title {
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--color-text-1);
        }
        
        p {
          margin: 0;
          font-size: 13px;
          color: var(--color-text-2);
          line-height: 1.5;
        }
      }
    }
  }
}
</style>
