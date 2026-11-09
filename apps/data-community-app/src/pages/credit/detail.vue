<template>
  <div class="credit-detail-page">
      <!-- 主要信息区 -->
      <a-card :bordered="false" class="main-info">
        <a-row :gutter="24">
          <a-col :span="18">
            <a-space direction="vertical" fill>
              <div class="title-section">
                <a-space align="center">
                  <a-button type="text" @click="handleGoBack">
                    <template #icon><IconLeft /></template>
                  </a-button>
                  <h2 class="data-title">{{ variableDetail.name }}</h2>
                  <div class="tag-group">
                    <a-tag :color="getStatusColor(variableDetail.status)">{{ variableDetail.status }}</a-tag>
                  </div>
                </a-space>
              </div>
              
              <a-descriptions :column="2" size="large" class="basic-info">
                <a-descriptions-item label="特征编号">{{ variableDetail.code }}</a-descriptions-item>
                <a-descriptions-item label="特征类型">{{ variableDetail.type }}</a-descriptions-item>
                <a-descriptions-item label="供应商">{{ variableDetail.supplier }}</a-descriptions-item>
                <a-descriptions-item label="更新时间">{{ variableDetail.updateTime }}</a-descriptions-item>
                <a-descriptions-item label="特征描述" :span="2">{{ variableDetail.description }}</a-descriptions-item>
              </a-descriptions>
            </a-space>
          </a-col>
          
          <a-col :span="6" class="action-panel">
            <a-space>
              <a-button type="primary" @click="handleEdit">
                <template #icon><IconEdit /></template>
                编辑信息
              </a-button>
            </a-space>
          </a-col>
        </a-row>
      </a-card>

      <!-- 标签页区域 -->
      <a-card :bordered="false" class="main-card">
        <a-tabs>
          <a-tab-pane key="1" title="基本信息">
            <a-card :bordered="false" class="info-card">
              <a-descriptions :column="2" :data="basicInfo" />
            </a-card>
          </a-tab-pane>

          <a-tab-pane key="2" title="数据规则">
            <a-card :bordered="false" class="info-card">
              <a-descriptions :column="2" :data="ruleInfo" />
              <a-divider style="margin: 16px 0" />
              <h3>字段信息</h3>
              <a-table :columns="fieldColumns" :data="fieldData" :pagination="false" />
            </a-card>
          </a-tab-pane>

          <a-tab-pane key="3" title="使用情况">
            <a-card :bordered="false" class="info-card">
              <a-descriptions :column="2" :data="usageInfo" />
            </a-card>
          </a-tab-pane>

          <a-tab-pane key="4" title="评估报告">
            <a-card :bordered="false" class="info-card">
              <a-descriptions :column="2" :data="evaluationInfo" />
            </a-card>
          </a-tab-pane>
        </a-tabs>
      </a-card>
    <!-- 编辑抽屉 -->
    <a-drawer
      :visible="editDrawerVisible"
      @cancel="handleEditCancel"
      @ok="handleEditSubmit"
      title="编辑信息"
      width="600px"
    >
      <a-form :model="editForm" ref="editFormRef" :rules="editFormRules">
        <a-form-item field="type" label="特征类型" required>
          <a-select v-model="editForm.type">
            <a-option value="基础信息">基础信息</a-option>
            <a-option value="信贷记录">信贷记录</a-option>
            <a-option value="还款记录">还款记录</a-option>
            <a-option value="征信评分">征信评分</a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="supplier" label="供应商" required>
          <a-input v-model="editForm.supplier" placeholder="请输入供应商" />
        </a-form-item>
        <a-form-item field="description" label="特征描述">
          <a-textarea v-model="editForm.description" placeholder="请输入特征描述" />
        </a-form-item>
      </a-form>
    </a-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconLeft, IconEdit } from '@arco-design/web-vue/es/icon'

const route = useRoute()
const router = useRouter()

// 原取自 dfd:router/utils（340 行）＋ router/constants（423 行），此处内联 5 行等价实现，
// 避免为单个 goBack 调用把 763 行引入 dca 的跨 app 依赖面
const goBack = (r, fallback = '/') => {
  if (window.history.length > 1) {
    r.go(-1)
  } else {
    r.push(fallback)
  }
}

// 特征详情数据
const variableDetail = ref({
  name: '个人基本信息',
  code: 'BASIC_001',
  type: '基础信息',
  supplier: '征信服务商A',
  status: '正常',
  updateTime: '2024-01-08',
  description: '包含个人身份信息、职业信息、居住信息等基础数据项'
})

// 状态标签颜色
const getStatusColor = (status) => {
  const colorMap = {
    '正常': 'green',
    '异常': 'red',
    '维护中': 'orange'
  }
  return colorMap[status] || 'gray'
}

// 基本信息
const basicInfo = computed(() => [
  {
    label: '数据来源',
    value: '人行征信'
  },
  {
    label: '更新频率',
    value: '每日更新'
  },
  {
    label: '数据格式',
    value: 'JSON'
  },
  {
    label: '接入方式',
    value: 'API接口'
  }
])

// 数据规则信息
const ruleInfo = ref([
  {
    label: '数据长度',
    value: '不限'
  },
  {
    label: '数据类型',
    value: 'String'
  },
  {
    label: '是否必填',
    value: '是'
  },
  {
    label: '验证规则',
    value: '身份证号码格式'
  }
])

// 字段信息表格配置
const fieldColumns = [
  {
    title: '字段名称',
    dataIndex: 'name'
  },
  {
    title: '字段类型',
    dataIndex: 'type'
  },
  {
    title: '是否必填',
    dataIndex: 'required'
  },
  {
    title: '描述',
    dataIndex: 'description'
  }
]

// 字段数据
const fieldData = [
  {
    name: 'name',
    type: 'String',
    required: '是',
    description: '姓名'
  },
  {
    name: 'idCard',
    type: 'String',
    required: '是',
    description: '身份证号'
  },
  {
    name: 'occupation',
    type: 'String',
    required: '否',
    description: '职业'
  }
]

// 使用情况
const usageInfo = ref([
  {
    label: '调用次数',
    value: '12,345'
  },
  {
    label: '成功率',
    value: '99.9%'
  },
  {
    label: '平均耗时',
    value: '200ms'
  },
  {
    label: '最近调用',
    value: '2024-01-08 12:00:00'
  }
])

// 评估报告
const evaluationInfo = ref([
  {
    label: '数据质量',
    value: '优'
  },
  {
    label: '覆盖率',
    value: '95%'
  },
  {
    label: '准确率',
    value: '99%'
  },
  {
    label: '时效性',
    value: '实时'
  }
])

// 编辑表单
const editDrawerVisible = ref(false)
const editFormRef = ref(null)
const editForm = ref({
  type: '',
  supplier: '',
  description: ''
})

// 表单校验规则
const editFormRules = {
  type: [{ required: true, message: '请选择特征类型' }],
  supplier: [{ required: true, message: '请输入供应商' }]
}

// 编辑相关方法
const handleEdit = () => {
  editForm.value = {
    type: variableDetail.value.type,
    supplier: variableDetail.value.supplier,
    description: variableDetail.value.description
  }
  editDrawerVisible.value = true
}

const handleEditCancel = () => {
  editDrawerVisible.value = false
  editFormRef.value?.resetFields()
}

const handleEditSubmit = async () => {
  try {
    await editFormRef.value?.validate()
    // TODO: 调用接口保存数据

    // 模拟保存成功
    variableDetail.value = {
      ...variableDetail.value,
      type: editForm.value.type,
      supplier: editForm.value.supplier,
      description: editForm.value.description
    }
    Message.success('保存成功')
    editDrawerVisible.value = false
  } catch (error) {

  }
}

// 获取路由参数
const variableId = computed(() => route.params.id)

// 在组件挂载时获取数据
onMounted(async () => {
  try {
    // TODO: 根据variableId获取数据详情

    // 模拟异步获取数据
    await new Promise(resolve => setTimeout(resolve, 1000))
  } catch (error) {
    Message.error('获取数据详情失败')
  }
})

const handleGoBack = () => goBack(router, '/discovery/credit')
</script>

<style scoped>
.credit-detail-page {
  padding: 20px;
}

.main-info {
  margin-bottom: 20px;
}

.title-section {
  margin-bottom: 16px;
}

.data-title {
  margin: 0;
  font-size: 20px;
}

.tag-group {
  margin-left: 8px;
}

.action-panel {
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
}

.main-card {
  margin-top: 16px;
}

.info-card {
  margin-top: 16px;
}
</style>
