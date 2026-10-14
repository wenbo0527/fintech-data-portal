<template>
  <nav class="left-nav-menu">
    <div class="nav-header">
      <IconUser />
      <span>{{ userLabel }}</span>
    </div>

    <a-tree
      class="nav-tree"
      :data="treeData"
      :selected-keys="computedSelectedKeys"
      :expanded-keys="expandedKeys"
      :show-line="true"
      block-node
      @select="handleSelect"
      @expand="handleExpand"
    >
      <template #title="data">
        <div class="tree-row" :class="[`level-${data.level}`, { 'is-credit-id': data.isCreditId }]">
          <component
            :is="iconMap[data.iconKey]"
            v-if="data.iconKey"
            class="title-icon"
          />
          <span class="title-text">{{ data.title }}</span>
          <a-tag
            v-if="data.count !== undefined"
            size="small"
            color="gray"
            class="title-count"
          >
            {{ data.count }}
          </a-tag>
        </div>
      </template>
    </a-tree>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  IconUser,
  IconDashboard,
  IconBarChart,
  IconSafe,
  IconStorage,
  IconInteraction
} from '@arco-design/web-vue/es/icon'

interface Product {
  productKey: string
  productName: string
  productType: string
  status?: string
  creditProductId?: string
}

type TopKey = 'all-around' | 'postloan' | 'credit'

type NavSelection =
  | { type: 'top'; topKey: TopKey }
  | { type: 'product-name'; productName: string }
  | { type: 'credit-id'; productName: string; creditProductId: string; productKey: string }
  | { type: 'none' }

interface Props {
  userLabel?: string
  products: Product[]
  loanRecords?: any[]
  modelValue: NavSelection
}

const props = withDefaults(defineProps<Props>(), {
  userLabel: '客户360',
  products: () => [],
  loanRecords: () => []
})

const emit = defineEmits<{
  'update:modelValue': [value: NavSelection]
}>()

// 各产品名下的授信产品ID 分组
const groupedProducts = computed(() => {
  const map = new Map<string, { productName: string; creditProductIds: string[]; products: Product[] }>()
  props.products.forEach((product) => {
    if (!map.has(product.productName)) {
      map.set(product.productName, {
        productName: product.productName,
        creditProductIds: [],
        products: []
      })
    }
    const group = map.get(product.productName)!
    group.products.push(product)
    if (product.creditProductId && !group.creditProductIds.includes(product.creditProductId)) {
      group.creditProductIds.push(product.creditProductId)
    }
  })
  return Array.from(map.values())
})

const getLoanCountByCpid = (cpid: string): number => {
  return (props.loanRecords || []).filter((l: any) => l.creditProductId === cpid).length
}

// 构造树形数据（顶层 3 个 Tab + 产品节点）
const treeData = computed(() => {
  const topItems = [
    { key: 'top:all-around', title: '客户概览', iconKey: 'dashboard' },
    { key: 'top:postloan', title: '贷后管理', iconKey: 'barChart' },
    { key: 'top:credit', title: '征信', iconKey: 'safe' }
  ]

  const productGroup = {
    key: 'product:group',
    title: '产品',
    iconKey: 'storage',
    count: groupedProducts.value.length,
    children: groupedProducts.value.map((group) => ({
      key: `product-name:${group.productName}`,
      title: group.productName,
      iconKey: getProductIconKey(group.productName),
      count: group.creditProductIds.length,
      children: group.creditProductIds.map((cpid) => ({
        key: `credit-id:${cpid}`,
        title: `${cpid} (${getLoanCountByCpid(cpid)} 笔)`,
        isCreditId: true,
        isLeaf: true
      }))
    }))
  }

  return [...topItems, productGroup]
})

// 图标 key → 组件 映射
const iconMap: Record<string, any> = {
  dashboard: IconDashboard,
  barChart: IconBarChart,
  safe: IconSafe,
  storage: IconStorage,
  interaction: IconInteraction
}

const getProductIconKey = (name: string): string => {
  if (name.includes('贷')) {return 'safe'}
  if (name.includes('理财')) {return 'interaction'}
  if (name.includes('存款')) {return 'storage'}
  return 'safe'
}

// 展开受控（默认展开产品组 + 第一个产品名）
const expandedKeys = ref<string[]>([])

watch(
  () => groupedProducts.value,
  (groups) => {
    if (groups.length > 0 && expandedKeys.value.length === 0) {
      expandedKeys.value = ['product:group', `product-name:${groups[0].productName}`]
    }
  },
  { immediate: true }
)

const isExpanded = (key: string) => expandedKeys.value.includes(key)

// 选中受控
const computedSelectedKeys = computed(() => {
  if (props.modelValue.type === 'top') {return [`top:${props.modelValue.topKey}`]}
  if (props.modelValue.type === 'product-name') {return [`product-name:${props.modelValue.productName}`]}
  if (props.modelValue.type === 'credit-id') {return [`credit-id:${props.modelValue.creditProductId}`]}
  return []
})

const handleSelect = (selectedKeys: string[]) => {
  if (!selectedKeys || selectedKeys.length === 0) {return}
  const key = selectedKeys[0]
  if (key.startsWith('top:')) {
    emit('update:modelValue', { type: 'top', topKey: key.slice(4) as TopKey })
  } else if (key.startsWith('product-name:')) {
    emit('update:modelValue', { type: 'product-name', productName: key.slice('product-name:'.length) })
  } else if (key.startsWith('credit-id:')) {
    const cpid = key.slice('credit-id:'.length)
    const found = props.products.find(p => p.creditProductId === cpid)
    if (found) {
      emit('update:modelValue', {
        type: 'credit-id',
        productName: found.productName,
        creditProductId: cpid,
        productKey: found.productKey
      })
    }
  }
}

const handleExpand = (keys: string[]) => {
  expandedKeys.value = keys
}
</script>

<style scoped>
.left-nav-menu {
  width: 240px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  overflow-y: auto;
  padding: 12px 0;
}

.nav-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--subapp-text-primary);
  padding: 8px 16px 12px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 8px;
}

.nav-tree {
  background: transparent;
  padding: 4px 8px;
}

.nav-tree :deep(.arco-tree-node) {
  padding: 0;
}

.nav-tree :deep(.arco-tree-node-title) {
  padding: 6px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.nav-tree :deep(.arco-tree-node-title:hover) {
  background: rgba(24, 144, 255, 0.06);
}

.nav-tree :deep(.arco-tree-node-selected .arco-tree-node-title) {
  background: rgba(24, 144, 255, 0.12) !important;
  color: var(--subapp-info);
  font-weight: 600;
}

.nav-tree :deep(.arco-tree-node-selected.is-credit-id .arco-tree-node-title),
.nav-tree :deep(.arco-tree-node-title:has(.is-credit-id)) {
  /* credit-id 节点高亮 */
}

.tree-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.tree-title.is-top {
  font-size: 14px;
  font-weight: 500;
}

.tree-title.is-credit-id {
  font-size: 12px;
}

.title-icon {
  font-size: 13px;
  color: var(--subapp-info);
}

.tree-title.is-credit-id .title-icon {
  font-size: 12px;
}

.title-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.title-count {
  margin-left: 4px;
}

.rotated {
  transform: rotate(180deg);
}
</style>