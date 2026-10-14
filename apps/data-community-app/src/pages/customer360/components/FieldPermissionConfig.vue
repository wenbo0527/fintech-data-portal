<template>
  <div class="field-permission-config">
    <!-- 头部说明 -->
    <div class="fpc-header">
      <div class="fpc-header-row">
        <IconSettings class="fpc-icon" />
        <span class="fpc-title">字段级权限三元组</span>
        <a-tag color="purple" size="small">PRD §F-004 · R01</a-tag>
      </div>
      <div class="fpc-desc">
        字段权限生效延迟：<strong class="text-orange">≤ 5 分钟</strong> ·
        设置 <code>visible=false</code> 后强一致链生效：<code>copyable=false</code> + <code>searchable=false</code>
      </div>
    </div>

    <!-- 字段矩阵表 -->
    <a-table
      :data="fields"
      :columns="columns"
      :pagination="false"
      :bordered="false"
      size="small"
      row-key="fieldKey"
      class="fpc-table"
    >
      <template #visible="{ record }">
        <a-switch
          :model-value="record.visible"
          @change="(val: any) => handleUpdate(record.dimension, record.fieldKey, 'visible', val)"
        />
      </template>
      <template #copyable="{ record }">
        <a-switch
          :model-value="record.copyable"
          :disabled="!record.visible"
          @change="(val: any) => handleUpdate(record.dimension, record.fieldKey, 'copyable', val)"
        />
      </template>
      <template #searchable="{ record }">
        <a-switch
          :model-value="record.searchable"
          :disabled="!record.visible"
          @change="(val: any) => handleUpdate(record.dimension, record.fieldKey, 'searchable', val)"
        />
      </template>
      <template #dimensionLabel="{ record }">
        <a-tag size="small" :color="dimensionTagColor(record.dimension)">
          {{ record.dimensionLabel }}
        </a-tag>
      </template>
      <template #status="{ record }">
        <a-tag
          :color="record.visible ? 'green' : 'gray'"
          size="small"
        >
          {{ record.visible ? (record.copyable ? '正常' : '只读') : '不可见' }}
        </a-tag>
      </template>
    </a-table>

    <!-- 底部操作 -->
    <div class="fpc-footer">
      <span class="fpc-footer-info">
        <IconInfoCircle />
        共 {{ fields.length }} 字段 ·
        已生效 <strong>{{ activeCount }}</strong> ·
        已禁用 <strong class="text-red">{{ disabledCount }}</strong>
      </span>
      <div class="fpc-footer-actions">
        <a-button size="small" @click="handleReset">
          <template #icon><IconRefresh /></template>
          重置
        </a-button>
        <a-button type="primary" size="small" @click="handleSave">
          <template #icon><IconSave /></template>
          保存配置
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  IconSettings,
  IconInfoCircle,
  IconRefresh,
  IconSave
} from '@arco-design/web-vue/es/icon'
import { useFieldPermissionStore } from '../stores/fieldPermission'

const fieldStore = useFieldPermissionStore()

// 维度标签映射
const dimensionLabels: Record<string, string> = {
  customer: '客户维度',
  'customer-product': '客户-产品维度',
  'credit-application': '授信维度',
  'loan-product': '借据维度'
}

// 拼接四维度字段（带 dimension 标识）
const fields = computed(() => {
  const out: any[] = []
  ;(Object.keys(fieldStore.fieldsByDimension) as string[]).forEach(dim => {
    fieldStore.fieldsByDimension[dim as keyof typeof fieldStore.fieldsByDimension].forEach(f => {
      out.push({
        ...f,
        dimension: dim,
        dimensionLabel: dimensionLabels[dim] || dim
      })
    })
  })
  return out
})

const columns = [
  {
    title: '维度',
    dataIndex: 'dimensionLabel',
    key: 'dimensionLabel',
    slotName: 'dimensionLabel',
    width: 140
  },
  {
    title: '字段路径',
    dataIndex: 'fieldKey',
    key: 'fieldKey',
    width: 200,
    render: ({ record }: any) => (
      `<code style="font-size:12px;color:#165dff">${record.fieldKey}</code>`
    )
  },
  {
    title: '字段名',
    dataIndex: 'fieldLabel',
    key: 'fieldLabel',
    width: 120
  },
  {
    title: '可见',
    dataIndex: 'visible',
    key: 'visible',
    slotName: 'visible',
    width: 80,
    align: 'center'
  },
  {
    title: '可复制',
    dataIndex: 'copyable',
    key: 'copyable',
    slotName: 'copyable',
    width: 80,
    align: 'center'
  },
  {
    title: '可搜索',
    dataIndex: 'searchable',
    key: 'searchable',
    slotName: 'searchable',
    width: 80,
    align: 'center'
  },
  {
    title: '状态',
    key: 'status',
    slotName: 'status',
    width: 80,
    align: 'center'
  }
]

const handleUpdate = (dimension: string, fieldKey: string, key: 'visible' | 'copyable' | 'searchable', val: boolean) => {
  fieldStore.updateField(dimension as any, fieldKey, { [key]: val } as any)
  Message.success(`已更新 ${fieldKey} · ${key}=${val}`)
}

const dimensionTagColor = (dim: string) => {
  const map: Record<string, string> = {
    customer: 'gray',
    'customer-product': 'arcoblue',
    'credit-application': 'purple',
    'loan-product': 'green'
  }
  return map[dim] || 'gray'
}

const activeCount = computed(() => fields.value.filter(f => f.visible).length)
const disabledCount = computed(() => fields.value.filter(f => !f.visible).length)

const handleReset = () => {
  // 重置到默认（mock：全部可见+可复制+可搜索）
  fields.value.forEach(f => {
    f.visible = true
    f.copyable = true
    f.searchable = true
  })
  // 重新设置身份证号为 R01 演示
  const idCard = fields.value.find(f => f.fieldKey === 'customer.idCard')
  if (idCard) {
    idCard.visible = true
    idCard.copyable = false
    idCard.searchable = false
  }
  Message.success('已重置字段权限')
}

const handleSave = () => {
  // 真实场景：调用 /api/dex/customer360/field-config（PRD §5.1）
  // 后端 5 分钟内全网生效（R02）
  Message.success('配置已提交 · 5 分钟内全网生效')
}
</script>

<style scoped>
.field-permission-config {
  padding: 0 4px;
}

.fpc-header {
  margin-bottom: 16px;
}

.fpc-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.fpc-icon {
  font-size: 18px;
  color: var(--subapp-info);
}

.fpc-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.fpc-desc {
  font-size: 12px;
  color: var(--subapp-text-secondary);
  line-height: 1.6;
}

.fpc-desc code {
  background: #f0f5ff;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11px;
  color: #165dff;
}

.fpc-table {
  margin-bottom: 16px;
}

.fpc-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.fpc-footer-info {
  font-size: 12px;
  color: var(--subapp-text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.fpc-footer-actions {
  display: flex;
  gap: 8px;
}

.text-red {
  color: #f53f3f;
}

.text-orange {
  color: #ff7d00;
}
</style>