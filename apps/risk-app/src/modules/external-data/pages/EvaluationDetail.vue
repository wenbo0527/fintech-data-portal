<template>
  <div class="external-data-evaluation-detail">
    <!-- 报告头部信息 -->
    <ACard class="report-header" :bordered="false">
      <div class="header-content">
        <div class="title-section">
          <h1>{{ reportData.reportName }}</h1>
          <div class="meta-info">
            <ATag :color="getStatusColor(reportData.status)">{{ reportData.status }}</ATag>
            <span class="product-info">产品：{{ reportData.productName }}</span>
            <span class="date-info">分析周期：{{ reportData.analysisPeriod }}</span>
          </div>
        </div>
        <div class="action-section">
          
          <AButton @click="toggleEditMode" v-if="reportData.editable && !isEditMode">
            <template #icon><IconEdit /></template>
            编辑报告
          </AButton>
          <AButton type="primary" @click="saveReport" :loading="saving" v-if="isEditMode">
            <template #icon><IconSave /></template>
            保存报告
          </AButton>
          <AButton @click="publishReport" :loading="publishing" v-if="isEditMode && reportData.status === '草稿'">
            <template #icon><IconSend /></template>
            发布报告
          </AButton>
          <AButton type="primary" status="danger" @click="deleteReport" v-if="!isEditMode && reportData.status === '草稿'">
            <template #icon><IconDelete /></template>
            删除报告
          </AButton>
          <AButton @click="cancelEdit" v-if="isEditMode">
            <template #icon><IconClose /></template>
            取消编辑
          </AButton>
          <AButton @click="handleBack" v-if="!isEditMode">
            <template #icon><IconLeft /></template>
            返回列表
          </AButton>
          <AButton type="primary" status="warning" @click="archiveReport" v-if="!isEditMode && reportData.status === '已发布'">
            <template #icon><IconArchive /></template>
            归档报告
          </AButton>
        </div>
      </div>
    </ACard>

    <ARow :gutter="24">
      <ACol :span="24">
        <ACard>
          <!-- 基础信息栏 -->
          <ADescriptions
            :data="basicInfo"
            :column="2"
            bordered
            size="medium"
            style="margin-bottom: 24px"
          />

          <!-- 分析进度（仅在分析中状态显示） -->
          <ACard v-if="reportData.status === '分析中'" class="progress-card" title="分析进度" style="margin-bottom: 24px;">
            <AProgress 
              :percent="reportData.progress" 
              :status="reportData.progress === 100 ? 'success' : 'normal'"
              animated
            />
            <div class="progress-text">
              <p>当前步骤：{{ getCurrentStepName() }}</p>
              <p v-if="reportData.estimatedCompletion">预计完成：{{ reportData.estimatedCompletion }}</p>
            </div>
          </ACard>
        </ACard>
      </ACol>
    </ARow>

    <ARow :gutter="24">
      <ACol :span="24">
        <ACard>
          <!-- 动态渲染模块内容 -->
          <div v-for="module in reportData.modules" :key="module.id" class="content-section">
            <div class="module-header">
              <h3>{{ module.name }}</h3>
              <div v-if="isEditMode" class="edit-status">
                <ATag :color="getEditPermissionColor(module.id)">
                  {{ getEditTypeLabel(module.id) }}
                </ATag>
                <span class="edit-hint">{{ getEditPermissionText(module.id) }}</span>
              </div>
            </div>
              
              <!-- 文字内容 -->
              <div class="text-content">
                <div v-if="!isEditMode || !canEditText(module.id)">
                  <p>{{ module.content || module.textContent }}</p>
                </div>
                <div v-else-if="isEditMode && canEditText(module.id)" class="edit-text">
                  <ATextarea
                    v-model="editData[module.id].textContent"
                    :placeholder="`请输入${module.name}内容`"
                    :auto-size="{ minRows: 4, maxRows: 10 }"
                    :max-length="getWordLimit(module.id)"
                    show-word-limit
                    @change="markAsModified(module.id)"
                  />
                </div>
              </div>

              <!-- 表格内容（样本组成、总样本概况） -->
              <div v-if="module.table || module.tableData" class="table-content">
                <h4>{{ module.table?.title || module.tableData?.title }}</h4>
                <div v-if="isEditMode && !canEditTable(module.id)" class="edit-notice">
                  <AAlert type="info" message="此表格为系统自动生成，不支持编辑" show-icon />
                </div>
                <ATable
                  :columns="getTableColumns(module.table || module.tableData)"
                  :data="(module.table || module.tableData)?.data || getTableRows(module.table || module.tableData)"
                  :pagination="false"
                  size="small"
                />
              </div>

              <!-- 多表格内容（总样本概况） -->
              <div v-if="module.tables || module.tableData?.saturationTable" class="tables-content">
                <div v-if="module.tables">
                  <div v-for="table in module.tables" :key="table.title" class="table-section">
                    <h4>{{ table.title }}</h4>
                    <div v-if="isEditMode && !canEditTable(module.id)" class="edit-notice">
                      <AAlert type="info" message="此表格为系统自动生成，不支持编辑" show-icon />
                    </div>
                    <ATable
                      :columns="getTableColumns(table)"
                      :data="table.data || getTableRows(table)"
                      :pagination="false"
                      size="small"
                    />
                  </div>
                </div>
                <div v-else-if="module.tableData?.saturationTable">
                  <div class="table-section">
                    <h4>{{ module.tableData.saturationTable.title }}</h4>
                    <div v-if="isEditMode && !canEditTable(module.id)" class="edit-notice">
                      <AAlert type="info" message="此表格为系统自动生成，不支持编辑" show-icon />
                    </div>
                    <ATable
                      :columns="getTableColumns(module.tableData.saturationTable)"
                      :data="getTableRows(module.tableData.saturationTable)"
                      :pagination="false"
                      size="small"
                    />
                  </div>
                  <div v-if="module.tableData?.correlationTable" class="table-section">
                    <h4>{{ module.tableData?.correlationTable.title }}</h4>
                    <div v-if="isEditMode && !canEditTable(module.id)" class="edit-notice">
                      <AAlert type="info" message="此表格为系统自动生成，不支持编辑" show-icon />
                    </div>
                    <ATable
                      :columns="getTableColumns(module.tableData?.correlationTable)"
                      :data="getTableRows(module.tableData?.correlationTable)"
                      :pagination="false"
                      size="small"
                    />
                  </div>
                </div>
              </div>

              <!-- 图表内容（效果分析） -->
              <div v-if="module.charts || module.chartData" class="charts-content">
                <div v-if="isEditMode && canSelectChart(module.id)" class="chart-selection">
                  <h4>图表选择</h4>
                  <ASpace wrap>
                    <ACheckbox
                      v-for="(chart, index) in getAvailableCharts(module)"
                      :key="index"
                      v-model="editData[module.id].selectedCharts[index]"
                      @change="markAsModified(module.id)"
                    >
                      {{ chart.title }}
                    </ACheckbox>
                  </ASpace>
                </div>
                <div v-if="module.charts">
                  <div v-for="chart in module.charts" :key="chart.title" class="chart-section">
                    <h4>{{ chart.title }}</h4>
                    <div class="chart-container">
                      <div v-if="chart.type === 'image'" class="chart-image-container">
                        <img 
                          :src="chart.imagePath || '/charts/placeholder.svg'" 
                          :alt="chart.title"
                          class="chart-image"
                          @error="handleImageError"
                        />
                        <p v-if="chart.description" class="chart-description">{{ chart.description }}</p>
                      </div>
                      <div v-else
                        :id="`chart-${module.id}-${chart.type}`"
                        class="chart"
                        style="width: 100%; height: 400px;"
                      ></div>
                    </div>
                  </div>
                </div>
                <div v-else-if="module.chartData">
                  <div v-for="(chart, key) in module.chartData" :key="key" class="chart-section">
                    <h4>{{ chart.title }}</h4>
                    <div class="chart-container">
                      <div v-if="chart.type === 'image'" class="chart-image-container">
                        <img 
                          :src="chart.imagePath || '/charts/placeholder.svg'" 
                          :alt="chart.title"
                          class="chart-image"
                          @error="handleImageError"
                        />
                        <p v-if="chart.description" class="chart-description">{{ chart.description }}</p>
                      </div>
                      <div v-else
                        :id="`chart-${module.id}-${key}`"
                        class="chart"
                        style="width: 100%; height: 400px;"
                      ></div>
                    </div>
                  </div>
                </div>

              <!-- 改进建议（数据结论） -->
              <div v-if="module.suggestions" class="suggestions-content">
                <h4>改进建议</h4>
                <ul class="suggestions-list">
                  <li v-for="suggestion in module.suggestions" :key="suggestion">
                    {{ suggestion }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </ACard>
      </ACol>
    </ARow>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Message } from '@arco-design/web-vue';
import * as echarts from 'echarts';
import { safeInitECharts, safeDisposeChart } from '@/utils/echartsUtils';
import {
  getEvaluationReportDetail as apiGetReportDetail,
  updateEvaluationReport as apiUpdateReport,
  publishReport as apiPublishReport,
  archiveReport as apiArchiveReport,
  deleteReport as apiDeleteReport,
} from '@/modules/external-data/api/evaluation';
import {
  Row as ARow,
  Col as ACol,
  Card as ACard,
  Descriptions as ADescriptions,
  Table as ATable,
  Button as AButton,
  Tag as ATag,
  Progress as AProgress,
  Textarea as ATextarea,
  Alert as AAlert,
  Space as ASpace,
  Checkbox as ACheckbox,
  Modal as AModal
} from '@arco-design/web-vue';
import {
  IconDownload,
  IconEdit,
  IconLeft,
  IconSave,
  IconSend,
  IconClose,
  IconArchive,
  IconDelete
} from '@arco-design/web-vue/es/icon';

// 定义报告数据类型
interface ReportModule {
  id: number;
  name: string;
  content?: string;
  textContent?: string;
  type?: string;
  editType?: string;
  status?: string;
  editable?: boolean;
  wordLimit?: number;
  table?: any;
  tables?: any[];
  tableData?: any;
  charts?: any[];
  chartData?: Record<string, any>;
  suggestions?: string[];
  [key: string]: any;
}

interface ReportData {
  id?: string | number;
  reportName: string;
  title?: string;
  productName: string;
  supplier?: string;
  analysisPeriod: string;
  sampleCount?: number;
  creator?: string;
  generateDate?: string;
  status: string;
  score?: number | null;
  progress: number;
  estimatedCompletion?: string;
  editable: boolean;
  modules: ReportModule[];
  analysisWorkflow?: {
    currentStep: number;
    steps: Array<{
      id: number;
      name: string;
      status?: string;
    }>;
  };
  [key: string]: any;
}

const router = useRouter();
const route = useRoute();

// 响应式数据
const exporting = ref(false);
const isEditMode = ref(false);
const saving = ref(false);
const publishing = ref(false);
const editData = ref<Record<number, { textContent?: string; selectedCharts: boolean[]; }>>({});
const modifiedModules = ref<Set<number>>(new Set());

const reportData = reactive<ReportData>({
  reportName: '',
  productName: '',
  analysisPeriod: '',
  status: '',
  progress: 0,
  editable: false,
  modules: []
});

// 获取报告详情
const fetchReportDetail = async () => {
  try {
    const result: any = await apiGetReportDetail(route.params.id as string);
    console.log('报告详情数据:', result);

    if (result) {
      Object.assign(reportData, result);
      console.log('报告数据已更新:', reportData);

      // 渲染图表
      nextTick(() => {
        renderCharts();
      });
    } else {
      Message.error('获取报告详情失败');
    }
  } catch (error) {
    console.error('获取报告详情失败:', error);
    Message.error((error as Error)?.message || '获取报告详情失败');
  }
};

// 获取状态颜色
const getStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    '已完成': 'green',
    '分析中': 'blue',
    '失败': 'red',
    '待处理': 'orange',
    '草稿': 'gray'
  };
  return colorMap[status] || 'gray';
};

// 获取当前步骤名称
const getCurrentStepName = () => {
  if (!reportData.analysisWorkflow) return '';
  const currentStep = reportData.analysisWorkflow.currentStep;
  const step = reportData.analysisWorkflow.steps.find((s: { id: number; }) => s.id === currentStep);
  return step ? step.name : '';
};

// 获取表格列配置
const getTableColumns = (table: { headers?: string[]; data?: Array<{ field?: string; description?: string; correlation?: string; significance?: string; }> }) => {
  if (!table) return [];
  
  // 如果有headers字段，直接使用
  if (table.headers) {
    return table.headers.map((header: string, index: number) => ({
      title: header,
      dataIndex: `col${index}`,
      key: `col${index}`
    }));
  }
  
  // 兼容旧格式
  if (table.data && table.data.length > 0) {
    const firstRow = table.data[0];
    const columns = [];
    
    if (firstRow.field) {
      columns.push({ title: '指标', dataIndex: 'field', key: 'field' });
      columns.push({ title: '数值', dataIndex: 'value', key: 'value' });
      if (firstRow.description) {
        columns.push({ title: '说明', dataIndex: 'description', key: 'description' });
      }
      if (firstRow.correlation) {
        columns.push({ title: '相关系数', dataIndex: 'correlation', key: 'correlation' });
        columns.push({ title: '显著性', dataIndex: 'significance', key: 'significance' });
      }
    }
    
    return columns;
  }
  
  return [];
};

// 获取表格行数据
const getTableRows = (table: { rows?: string[][]; data?: any[] }) => {
  if (!table) return [];
  
  // 如果有rows字段，转换为对象格式
  if (table.rows) {
    return table.rows.map((row: string[], index: number) => {
      const rowData: Record<string, string> = { key: index.toString() };
      row.forEach((cell, cellIndex) => {
        rowData[`col${cellIndex}`] = cell;
      });
      return rowData;
    });
  }
  
  // 兼容旧格式
  if (table.data) {
    return table.data;
  }
  
  return [];
};

// 渲染图表
const renderCharts = async () => {
  for (const module of reportData.modules) {
    if (module.charts) {
      for (const chart of module.charts) {
        const chartDom = document.getElementById(`chart-${module.id}-${chart.type}`);
        if (chartDom) {
          try {
            const myChart = await safeInitECharts(chartDom);
            if (myChart) {
              const option = getChartOption(chart);
              myChart.setOption(option);
            } else {
              // 30ADACC6 修复 (2026-06-24): safeInitECharts 返回 null 时静默跳过（容器问题已由工具函数 console.warn）
              console.debug(`[EvaluationDetail] 跳过 chart ${module.id}-${chart.type} 渲染（容器不可用）`);
            }
          } catch (error) {
            // 30ADACC6 修复 (2026-06-24): console.error 改为 console.warn
            console.warn('图表初始化失败:', error);
          }
        }
      }
    }
  }
};

// 获取图表配置
const getChartOption = (chart: { type: string; title?: string; data?: any }) => {
  switch (chart.type) {
    case 'funnel':
      return {
        title: { text: chart.title },
        tooltip: { trigger: 'item', formatter: '{a} <br/>{b} : {c}' },
        series: [{
          name: '转化漏斗',
          type: 'funnel',
          left: '10%',
          top: 60,
          width: '80%',
          height: '80%',
          data: chart.data
        }]
      };
    
    case 'line':
      return {
        title: { text: chart.title },
        tooltip: { trigger: 'axis' },
        legend: { data: chart.data.series.map((s: { name: string; }) => s.name) },
        xAxis: { type: 'category', data: chart.data.dates },
        yAxis: { type: 'value' },
        series: chart.data.series.map((s: { name: string; data: any[]; }) => ({
          name: s.name,
          type: 'line',
          data: s.data
        }))
      };
    
    case 'bar':
      return {
        title: { text: chart.title },
        tooltip: { trigger: 'axis' },
        legend: { data: chart.data.metrics.map((m: { name: string; }) => m.name) },
        xAxis: { type: 'category', data: chart.data.platforms },
        yAxis: { type: 'value' },
        series: chart.data.metrics.map((m: { name: string; data: any[]; }) => ({
          name: m.name,
          type: 'bar',
          data: m.data
        }))
      };
    
    case 'radar':
      return {
        title: { text: chart.title },
        tooltip: {},
        legend: { data: chart.data.series.map((s: { name: string; }) => s.name) },
        radar: {
          indicator: chart.data.indicators.map((name: string) => ({ name, max: 100 }))
        },
        series: [{
          type: 'radar',
          data: chart.data.series
        }]
      };
    
    default:
      return {};
  }
};

// 图片加载错误处理
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  console.error('图片加载失败:', img.src);
  img.src = '/charts/placeholder.svg'; // 使用占位符图片
  Message.warning('图片加载失败，显示占位符');
};

 

// 编辑模式切换
const toggleEditMode = () => {
  // 详情页即编辑载体，统一进入页内编辑模式
  isEditMode.value = true;
  initEditData();
};

// 取消编辑
const cancelEdit = () => {
  isEditMode.value = false;
  modifiedModules.value.clear();
  editData.value = {};
};
// 初始化编辑数据
const initEditData = () => {
  reportData.modules.forEach((module: { id: number; content?: string; textContent?: string; charts?: any[]; chartData?: Record<string, any>; }) => {
    editData.value[module.id] = {
      textContent: module.content || module.textContent || '',
      selectedCharts: getAvailableCharts(module).map(() => true)
    };
  });
};

// 标记为已修改
const markAsModified = (moduleId: number) => {
  modifiedModules.value.add(moduleId);
};

// 获取编辑类型标签
const getEditTypeLabel = (moduleId: number) => {
  const typeMap: Record<number, string> = {
    1: '文字编辑',
    2: '文字编辑', 
    3: '表格自动生成',
    4: '表格自动生成',
    5: '文字+图片选择',
    6: '文字+图片选择',
    7: '完全编辑'
  };
  return typeMap[moduleId] || '只读';
};

// 获取编辑权限颜色
const getEditPermissionColor = (moduleId: number) => {
  const colorMap: Record<number, string> = {
    1: 'blue',
    2: 'blue',
    3: 'orange', 
    4: 'orange',
    5: 'green',
    6: 'green',
    7: 'purple'
  };
  return colorMap[moduleId] || 'gray';
};

// 获取编辑权限文本
const getEditPermissionText = (moduleId: number) => {
  const textMap: Record<number, string> = {
    1: '可编辑文字内容',
    2: '可编辑文字内容',
    3: '表格由系统自动生成',
    4: '表格由系统自动生成', 
    5: '可编辑文字和选择图表',
    6: '可编辑文字和选择图表',
    7: '可完全编辑所有内容'
  };
  return textMap[moduleId] || '只读模式';
};

// 检查是否可以编辑文字
const canEditText = (moduleId: number) => {
  return [1, 2, 5, 6, 7].includes(moduleId);
};

// 检查是否可以编辑表格
const canEditTable = (moduleId: number) => {
  return [7].includes(moduleId);
};

// 检查是否可以选择图表
const canSelectChart = (moduleId: number) => {
  return [5, 6, 7].includes(moduleId);
};

// 获取字数限制
const getWordLimit = (moduleId: number) => {
  const limitMap: Record<number, number> = {
    1: 1000,
    2: 1000,
    5: 2000,
    6: 2000,
    7: 5000
  };
  return limitMap[moduleId] || 1000;
};

// 获取可用图表
function getAvailableCharts(module: { charts?: any[]; chartData?: Record<string, any>; }) {
  if (module.charts) return module.charts;
  if (module.chartData) {
    return Object.values(module.chartData);
  }
  return [];
}

// 保存报告
const saveReport = async () => {
  saving.value = true;
  try {
    await apiUpdateReport(route.params.id as string, {
      reportName: reportData.reportName,
      status: reportData.status,
      modules: editData.value
    });

    Message.success('报告保存成功');
    modifiedModules.value.clear();
    // 更新原始数据
    reportData.modules.forEach((module: { id: number; content?: string; textContent?: string; }) => {
      if (editData.value[module.id]) {
        if (module.content !== undefined) {
          module.content = editData.value[module.id].textContent;
        }
        if (module.textContent !== undefined) {
          module.textContent = editData.value[module.id].textContent;
        }
      }
    });
  } catch (error) {
    console.error('保存报告失败:', error);
    Message.error((error as Error)?.message || '保存报告失败');
  } finally {
    saving.value = false;
  }
};

// 发布报告
const publishReport = async () => {
  publishing.value = true;
  try {
    await apiPublishReport(route.params.id as string, {
      reportName: reportData.reportName
    });

    Message.success('报告发布成功');
    reportData.status = '已发布';
    reportData.progress = 100;
    isEditMode.value = false;
    modifiedModules.value.clear();
  } catch (error) {
    console.error('发布报告失败:', error);
    Message.error((error as Error)?.message || '发布报告失败');
  } finally {
    publishing.value = false;
  }
};

// 基础信息
const basicInfo = computed<Array<{ label: string; value: string }>>(() => [
  {
    label: '外数产品',
    value: reportData.productName || '-'
  },
  {
    label: '分析时间段',
    value: reportData.analysisPeriod || '-'
  },
  {
    label: '样本量',
    value: reportData.sampleCount != null ? String(reportData.sampleCount) : '-'
  },
  {
    label: '报告生成时间',
    value: reportData.generateDate || '-'
  }
]);

// 移除导航点击处理函数

// 返回上一页
const handleBack = () => {
  router.push('/variable-hub/external-data/evaluation');
};

// 归档报告
/**
 * 归档报告功能
 * @description 点击归档按钮后，显示确认提示框，提示归档后所有用户将不可见
 */
const archiveReport = () => {
  AModal.confirm({
    title: '确认归档',
    content: '归档后所有用户将不可见，确定要归档该报告吗？',
    okText: '确认归档',
    cancelText: '取消',
    onOk: async () => {
      try {
        await apiArchiveReport(route.params.id as string);
        Message.success('报告归档成功');
        // 归档后返回列表页
        router.push('/variable-hub/external-data/evaluation');
      } catch (error) {
        console.error('归档报告失败:', error);
        Message.error((error as Error)?.message || '归档报告失败');
      }
    }
  });
};

// 删除报告
/**
 * 删除报告功能
 * @description 点击删除按钮后，显示确认提示框，提示删除后无法恢复
 */
const deleteReport = () => {
  AModal.confirm({
    title: '确认删除',
    content: '删除后无法恢复，确定要删除该报告吗？',
    okText: '确认删除',
    cancelText: '取消',
    onOk: async () => {
      try {
        await apiDeleteReport(route.params.id as string);
        Message.success('报告删除成功');
        // 跳转到报告列表页
        router.push('/variable-hub/external-data/evaluation');
      } catch (error) {
        console.error('删除报告失败:', error);
        Message.error((error as Error)?.message || '删除报告失败');
      }
    }
  });
};

onMounted(() => {
  fetchReportDetail();
});
</script>

<style scoped>
.external-data-evaluation-detail {
  padding: 16px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.report-header {
  margin-bottom: 16px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.title-section h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.meta-info {
  display: flex;
  gap: 16px;
  align-items: center;
  color: var(--subapp-text-tertiary);
  font-size: 14px;
}

.action-section {
  display: flex;
  gap: 8px;
}

.nav-card {
  height: fit-content;
  margin-bottom: 16px;
}

.nav-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--subapp-text-primary);
}

.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.nav-item:hover {
  background-color: var(--subapp-bg-secondary);
}

.nav-item.active {
  background-color: var(--subapp-info);
  border-color: var(--subapp-info);
}

.nav-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: var(--subapp-info);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  margin-right: 12px;
}

.nav-item.active .nav-number {
  background-color: var(--subapp-info);
}

.nav-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-text {
  font-weight: 500;
  color: var(--subapp-text-primary);
}

.edit-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.edit-permission {
  font-size: 11px;
  color: var(--subapp-text-tertiary);
  line-height: 1.2;
}

.progress-card {
  margin-top: 16px;
}

.progress-text {
  margin-top: 12px;
  font-size: 12px;
  color: var(--subapp-text-tertiary);
}

.progress-text p {
  margin: 4px 0;
}

.content-section {
  padding: 0;
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.module-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.edit-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-hint {
  font-size: 12px;
  color: var(--subapp-text-tertiary);
}

.text-content {
  margin-bottom: 16px;
}

.text-content p {
  line-height: 1.6;
  color: var(--subapp-text-secondary);
  margin: 0;
}

.table-content,
.table-section {
  margin-top: 16px;
}

.table-content h4,
.table-section h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.tables-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.charts-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.chart-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.chart-container {
  border: 1px solid var(--subapp-border);
  border-radius: 6px;
  padding: 16px;
  background-color: white;
}

.chart {
  width: 100%;
  height: 400px;
}

.suggestions-content h4 {
  margin: 16px 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.suggestions-list {
  margin: 0;
  padding-left: 20px;
}

.suggestions-list li {
  margin-bottom: 8px;
  line-height: 1.5;
  color: var(--subapp-text-secondary);
}

.table-container {
  margin: 16px 0;
}

.table-edit-container {
  position: relative;
}

.table-edit-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.chart-edit-container {
  margin: 16px 0;
}

.chart-selector {
  margin-bottom: 16px;
  padding: 12px;
  background: #f7f8fa;
  border-radius: 6px;
}

@media (max-width: 768px) {
  .external-data-evaluation-detail {
    padding: 8px;
  }
  
  .header-content {
    flex-direction: column;
    gap: 16px;
  }
  
  .action-section {
    width: 100%;
    justify-content: flex-start;
  }
  
  .title-section h1 {
    font-size: 20px;
  }
  
  .meta-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
