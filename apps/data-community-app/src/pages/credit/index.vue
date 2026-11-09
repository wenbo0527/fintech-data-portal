<template>
  <div class="credit-variables">
    <div class="page-header">
      <h2>征信特征</h2>
      <a-space>
        <a-button type="primary" @click="showBatchUpload = true">
          <template #icon>
            <IconUpload />
          </template>
          批量上传
        </a-button>
        <a-button @click="handleDownloadTemplate">
          <template #icon>
            <IconDownload />
          </template>
          下载模板
        </a-button>
      </a-space>
    </div>
    
    <a-card :bordered="false">
      <!-- 特征详情抽屉 -->
            <a-drawer
              v-model:visible="drawerVisible"
              :width="600"
              title="特征详情"
              @cancel="closeDrawer"
            >
              <template #title>
                <div class="drawer-title">
                  <span>{{ currentVariable.name }}</span>
                  <a-tag :color="getStatusColor(currentVariable.status)">{{ currentVariable.status }}</a-tag>
                </div>
              </template>
              
              <a-descriptions :column="1" :title="'基本信息'" :data="basicInfo" />
              
              <a-divider />
              
              <a-descriptions :column="1" :title="'加工逻辑'">
                <a-descriptions-item label="加工逻辑">
                  {{ currentVariable.logic || '暂无加工逻辑' }}
                </a-descriptions-item>
              </a-descriptions>
              
              <a-divider />
              
              <a-descriptions :column="1" :title="'默认值'">
                <a-descriptions-item label="默认值">
                  {{ currentVariable.defaultValue || '无' }}
                </a-descriptions-item>
              </a-descriptions>
              
              <a-divider />
              
              <a-descriptions :column="1" :title="'批次'">
                <a-descriptions-item label="批次">
                  {{ currentVariable.batch || '暂无批次信息' }}
                </a-descriptions-item>
              </a-descriptions>
              
              <a-divider />
              
              <a-descriptions :column="1" :title="'备注'">
                <a-descriptions-item label="备注">
                  {{ currentVariable.remark || '暂无备注' }}
                </a-descriptions-item>
              </a-descriptions>
            </a-drawer>
       <!-- 搜索和筛选 -->
       <div class="search-section">
         <a-row :gutter="16">
           <a-col :span="8">
             <a-input-search
               v-model="searchKeyword"
               placeholder="搜索特征名称、描述"
               @search="handleSearch"
             />
           </a-col>
           <a-col :span="4">
             <a-select
               v-model="selectedTag"
               placeholder="特征标签"
               allow-clear
               @change="handleSearch"
             >
               <a-option value="高风险">高风险</a-option>
               <a-option value="中风险">中风险</a-option>
               <a-option value="低风险">低风险</a-option>
             </a-select>
           </a-col>
           <a-col :span="4">
             <a-select
               v-model="selectedCategory"
               placeholder="特征分类"
               allow-clear
               @change="handleSearch"
             >
               <a-option value="基础信息">基础信息</a-option>
               <a-option value="信贷记录">信贷记录</a-option>
               <a-option value="行为特征">行为特征</a-option>
             </a-select>
           </a-col>
           <a-col :span="4">
             <a-select
               v-model="selectedSecondaryCategory"
               placeholder="二级分类"
               allow-clear
               @change="handleSearch"
             >
               <a-option value="身份信息">身份信息</a-option>
               <a-option value="逾期信息">逾期信息</a-option>
               <a-option value="交易行为">交易行为</a-option>
             </a-select>
           </a-col>
           <a-col :span="4">
             <a-select
               v-model="selectedType"
               placeholder="类型"
               allow-clear
               @change="handleSearch"
             >
               <a-option value="数值型">数值型</a-option>
               <a-option value="文本型">文本型</a-option>
             </a-select>
           </a-col>
           <a-col :span="4">
             <a-select
               v-model="selectedBatch"
               placeholder="批次"
               allow-clear
               @change="handleSearch"
             >
               <a-option value="B20231201">B20231201</a-option>
               <a-option value="B20240115">B20240115</a-option>
               <a-option value="B20240310">B20240310</a-option>
             </a-select>
           </a-col>
           <a-col :span="4">
             <a-select
               v-model="selectedSourceTable"
               placeholder="来源表"
               allow-clear
               @change="handleSearch"
             >
               <a-option value="t_identity_basic">t_identity_basic</a-option>
               <a-option value="t_credit_overdue">t_credit_overdue</a-option>
               <a-option value="t_behavior_txn">t_behavior_txn</a-option>
             </a-select>
           </a-col>
           <a-col :span="4">
             <a-select
               v-model="selectedRequester"
               placeholder="需求提出人"
               allow-clear
               @change="handleSearch"
             >
               <a-option value="张三">张三</a-option>
               <a-option value="产品部">产品部</a-option>
               <a-option value="运营">运营</a-option>
             </a-select>
           </a-col>
           <a-col :span="4">
             <a-select
               v-model="selectedDeveloper"
               placeholder="开发人"
               allow-clear
               @change="handleSearch"
             >
               <a-option value="李四">李四</a-option>
               <a-option value="数据平台">数据平台</a-option>
               <a-option value="数据工程">数据工程</a-option>
             </a-select>
           </a-col>
           <a-col :span="4">
             <a-select
               v-model="selectedAcceptor"
               placeholder="验收人"
               allow-clear
               @change="handleSearch"
             >
               <a-option value="王五">王五</a-option>
               <a-option value="风控部">风控部</a-option>
               <a-option value="业务方">业务方</a-option>
             </a-select>
           </a-col>
           <a-col :span="4">
             <a-select
               v-model="selectedListScope"
               placeholder="黑名单/白名单"
               allow-clear
               @change="handleSearch"
             >
               <a-option value="黑名单">黑名单</a-option>
               <a-option value="白名单">白名单</a-option>
               <a-option value="无">无</a-option>
             </a-select>
           </a-col>
           <a-col :span="4">
             <a-select
               v-model="selectedSupplier"
               placeholder="数据供应商"
               allow-clear
               @change="handleSearch"
             >
               <a-option value="人行征信">人行征信</a-option>
               <a-option value="百行征信">百行征信</a-option>
               <a-option value="芝麻信用">芝麻信用</a-option>
             </a-select>
           </a-col>
         </a-row>
       </div>

            <a-table :columns="columns" :data="filteredData" :pagination="{ pageSize: 10 }" :loading="loading" :scroll="{ x: 2000 }">
              <template #englishName="{ record }">
                <a-button type="text" size="small" @click="handleView(record)">{{ record.englishName }}</a-button>
              </template>
              <template #status="{ record }">
                <a-tag :color="getStatusColor(record.status)">
                  {{ record.status }}
                </a-tag>
              </template>
              <template #listScope="{ record }">
                <a-tag v-if="record.listScope === '黑名单'" color="red">黑名单</a-tag>
                <a-tag v-else-if="record.listScope === '白名单'" color="green">白名单</a-tag>
                <a-tag v-else>无</a-tag>
              </template>
              <template #operations="{ record }">
                <a-space>
                  <a-button type="text" size="small" @click="handleView(record)">查看</a-button>
                  <a-button type="text" size="small" @click="handleEdit(record)">编辑</a-button>
                  <a-popconfirm
                    content="确定要删除这条记录吗？"
                    @ok="handleDelete(record)"
                  >
                    <a-button type="text" size="small" status="danger">删除</a-button>
                  </a-popconfirm>
                </a-space>
              </template>
            </a-table>
         </a-card>
   </div>
 </template>

<script setup>
import { ref, computed } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconUpload, IconDownload } from '@arco-design/web-vue/es/icon'

const searchText = ref('')
const searchKeyword = ref('')
const selectedTag = ref('')
const selectedCategory = ref('')
const selectedSecondaryCategory = ref('')
const selectedType = ref('')
const selectedBatch = ref('')
const selectedSourceTable = ref('')
const selectedRequester = ref('')
const selectedDeveloper = ref('')
const selectedAcceptor = ref('')
const selectedListScope = ref('')
const selectedSupplier = ref('')
const loading = ref(false)
const drawerVisible = ref(false)
const currentVariable = ref({})
const showBatchUpload = ref(false)

const filterForm = ref({
  variableTag: '不限',
  category: '不限',
  supplier: ''
})

const basicInfo = computed(() => [
  {
    label: '特征英文名',
    value: currentVariable.value.englishName
  },
  {
    label: '特征中文名',
    value: currentVariable.value.chineseName
  },
  {
    label: '一级分类',
    value: currentVariable.value.primaryCategory
  },
  {
    label: '二级分类',
    value: currentVariable.value.secondaryCategory
  },
  {
    label: '标签',
    value: currentVariable.value.tag
  },
  {
    label: '供应商',
    value: currentVariable.value.supplier
  }
])

const handleSearch = (value) => {

}

const handleBatchUpload = () => {
  Message.info('批量上传功能模拟')
}

const handleDownloadTemplate = () => {
  Message.info('模板下载功能模拟')
}

const handleView = (record) => {
  currentVariable.value = record
  drawerVisible.value = true
}

const handleEdit = (record) => {

}

const handleDelete = (record) => {

}

const closeDrawer = () => {
  drawerVisible.value = false
  currentVariable.value = {}
}

const getStatusColor = (status) => {
  const colorMap = {
    '已上线': 'green',
    '待上线': 'orange',
    '已下线': 'red'
  }
  return colorMap[status] || 'blue'
}

const columns = [
  { title: '字段位', dataIndex: 'fieldPosition', width: 100, align: 'center' },
  { title: '分类', dataIndex: 'primaryCategory', width: 120, align: 'center' },
  { title: '二级分类', dataIndex: 'secondaryCategory', width: 120, align: 'center' },
  { title: '特征英文名', dataIndex: 'englishName', width: 160, align: 'left', slotName: 'englishName' },
  { title: '标准化特征英文名', dataIndex: 'normalizedEnglishName', width: 180, align: 'left' },
  { title: '标准化特征中文名', dataIndex: 'normalizedChineseName', width: 180, align: 'left' },
  { title: '特征中文名', dataIndex: 'chineseName', width: 160, align: 'left' },
  { title: '加工逻辑', dataIndex: 'logic', width: 220, align: 'left' },
  { title: '类型', dataIndex: 'type', width: 110, align: 'center' },
  { title: '默认值', dataIndex: 'defaultValue', width: 110, align: 'center' },
  { title: '批次', dataIndex: 'batch', width: 110, align: 'center' },
  { title: '来源表', dataIndex: 'sourceTable', width: 160, align: 'left' },
  { title: '标签', dataIndex: 'tag', width: 110, align: 'center' },
  { title: '需求提出人', dataIndex: 'requester', width: 120, align: 'center' },
  { title: '开发人', dataIndex: 'developer', width: 120, align: 'center' },
  { title: '上线时间', dataIndex: 'onlineTime', width: 140, align: 'center' },
  { title: '验收人', dataIndex: 'acceptor', width: 120, align: 'center' },
  { title: '备注', dataIndex: 'remark', width: 200, align: 'left' },
  { title: '黑名单和白名单', dataIndex: 'listScope', width: 160, align: 'center', slotName: 'listScope' },
  { title: '操作', slotName: 'operations', width: 150, align: 'center', fixed: 'right' }
]

const mockData = [
  {
    fieldPosition: 'A01',
    primaryCategory: '基础信息',
    secondaryCategory: '身份信息',
    englishName: 'basic_info',
    normalizedEnglishName: 'basic_info_std',
    normalizedChineseName: '个人基础信息（标准化）',
    chineseName: '个人基础信息',
    logic: '从身份信息源表提取身份证、姓名、手机号等字段',
    type: '文本型',
    defaultValue: '-',
    batch: 'B20231201',
    sourceTable: 't_identity_basic',
    tag: '个人信息',
    requester: '张三',
    developer: '李四',
    onlineTime: '2023-12-01',
    acceptor: '王五',
    remark: '用于客户身份识别与核验',
    listScope: '无',
    supplier: '人行征信'
  },
  {
    fieldPosition: 'B17',
    primaryCategory: '信贷记录',
    secondaryCategory: '逾期信息',
    englishName: 'overdue_count',
    normalizedEnglishName: 'overdue_count_std',
    normalizedChineseName: '逾期次数（标准化）',
    chineseName: '逾期次数',
    logic: '统计历史逾期记录条数，异常值按规则清洗',
    type: '数值型',
    defaultValue: '0',
    batch: 'B20240115',
    sourceTable: 't_credit_overdue',
    tag: '风险',
    requester: '产品部',
    developer: '数据平台',
    onlineTime: '2024-01-15',
    acceptor: '风控部',
    remark: '逾期次数越多风险越高',
    listScope: '黑名单',
    supplier: '百行征信'
  },
  {
    fieldPosition: 'C09',
    primaryCategory: '行为特征',
    secondaryCategory: '交易行为',
    englishName: 'avg_txn_amount_3m',
    normalizedEnglishName: 'avg_txn_amount_3m_std',
    normalizedChineseName: '近三月平均交易额（标准化）',
    chineseName: '近三月平均交易额',
    logic: '近三个月交易金额求平均，单位元',
    type: '数值型',
    defaultValue: '0',
    batch: 'B20240310',
    sourceTable: 't_behavior_txn',
    tag: '行为',
    requester: '运营',
    developer: '数据工程',
    onlineTime: '2024-03-10',
    acceptor: '业务方',
    remark: '用于评估活跃度与消费能力',
    listScope: '白名单',
    supplier: '内部数据'
  }
]

const filteredData = computed(() => {
  let rows = mockData
  const keyword = (searchKeyword.value || '').trim().toLowerCase()
  if (keyword) {
    rows = rows.filter(item => {
      const texts = [
        item.englishName,
        item.chineseName,
        item.normalizedEnglishName,
        item.normalizedChineseName,
        item.logic,
        item.tag,
        item.sourceTable,
        item.remark
      ].filter(Boolean).map(s => String(s).toLowerCase())
      return texts.some(t => t.includes(keyword))
    })
  }
  if (selectedCategory.value) {
    rows = rows.filter(item => item.primaryCategory === selectedCategory.value)
  }
  if (selectedSecondaryCategory.value) {
    rows = rows.filter(item => item.secondaryCategory === selectedSecondaryCategory.value)
  }
  if (selectedTag.value) {
    rows = rows.filter(item => item.tag === selectedTag.value)
  }
  if (selectedType.value) {
    rows = rows.filter(item => item.type === selectedType.value)
  }
  if (selectedBatch.value) {
    rows = rows.filter(item => item.batch === selectedBatch.value)
  }
  if (selectedSourceTable.value) {
    rows = rows.filter(item => item.sourceTable === selectedSourceTable.value)
  }
  if (selectedRequester.value) {
    rows = rows.filter(item => item.requester === selectedRequester.value)
  }
  if (selectedDeveloper.value) {
    rows = rows.filter(item => item.developer === selectedDeveloper.value)
  }
  if (selectedAcceptor.value) {
    rows = rows.filter(item => item.acceptor === selectedAcceptor.value)
  }
  if (selectedListScope.value) {
    rows = rows.filter(item => item.listScope === selectedListScope.value)
  }
  if (selectedSupplier.value) {
    rows = rows.filter(item => item.supplier === selectedSupplier.value)
  }
  return rows
})
</script>

<style scoped>
.credit-variables {
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

.search-section {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.variable-name {
  color: var(--subapp-info);
  cursor: pointer;
  font-weight: 500;
}

.variable-name:hover {
  text-decoration: underline;
}

.tag-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.drawer-content {
  padding: 0;
}

.detail-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--subapp-text-primary);
  border-bottom: 1px solid var(--subapp-border);
  padding-bottom: 8px;
}
</style>
