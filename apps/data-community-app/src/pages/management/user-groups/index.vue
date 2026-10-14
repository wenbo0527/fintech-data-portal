<template>
  <div class="user-groups-page">
    <a-page-header title="用户组管理" sub-title="权限组、成员管理、组权限分配">
      <template #extra>
        <a-button @click="goBack">返回</a-button>
        <a-button type="primary" @click="openCreate">
          <template #icon><icon-plus /></template>新建用户组
        </a-button>
      </template>
    </a-page-header>

    <a-table
      :columns="columns"
      :data="groups"
      :pagination="{ pageSize: 10 }"
      row-key="id"
      stripe
      size="medium"
    >
      <template #name="{ record }">
        <a-link @click="openDetail(record)">{{ record.name }}</a-link>
      </template>
      <template #type="{ record }">
        <a-tag :color="typeColor(record.type)">{{ typeLabel(record.type) }}</a-tag>
      </template>
      <template #memberCount="{ record }">{{ record.memberCount }} 人</template>
      <template #actions="{ record }">
        <a-link @click="openEdit(record)">编辑</a-link>
        <a-divider direction="vertical" />
        <a-link @click="viewMembers(record)">成员</a-link>
        <a-divider direction="vertical" />
        <a-link @click="viewPermissions(record)">权限</a-link>
      </template>
    </a-table>

    <a-drawer
      v-model:visible="formDrawerVisible"
      :title="formMode === 'create' ? '新建用户组' : '编辑用户组'"
      :width="600"
      :footer="false"
    >
      <a-form :model="formData" layout="vertical">
        <a-form-item label="组名" required>
          <a-input v-model="formData.name" />
        </a-form-item>
        <a-form-item label="类型" required>
          <a-select v-model="formData.type">
            <a-option value="role">角色组</a-option>
            <a-option value="department">部门组</a-option>
            <a-option value="project">项目组</a-option>
            <a-option value="custom">自定义</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-model="formData.description" :auto-size="{ minRows: 3 }" />
        </a-form-item>
        <div style="text-align: right">
          <a-button @click="formDrawerVisible = false">取消</a-button>
          <a-button type="primary" style="margin-left: 8px" @click="saveGroup">保存</a-button>
        </div>
      </a-form>
    </a-drawer>

    <a-drawer
      v-model:visible="membersDrawerVisible"
      :title="`${currentGroup?.name} - 成员`"
      :width="600"
      :footer="false"
    >
      <a-table :columns="memberColumns" :data="mockMembers" :pagination="false" row-key="userId" size="small">
        <template #role="{ record }">
          <a-tag>{{ record.role }}</a-tag>
        </template>
      </a-table>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'

const router = useRouter()

const groups = ref<any[]>([])
const formDrawerVisible = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const formData = ref({ id: '', name: '', type: 'role', description: '' })

const membersDrawerVisible = ref(false)
const currentGroup = ref<any>(null)

onMounted(() => {
  groups.value = [
    { id: 'G001', name: '数据分析师', type: 'role', memberCount: 25, description: '负责日常数据分析、报表产出', owner: '王运营' },
    { id: 'G002', name: '数据开发', type: 'role', memberCount: 12, description: '负责数据建模、ETL 开发', owner: '李技术' },
    { id: 'G003', name: '风控团队', type: 'department', memberCount: 18, description: '风险评估、欺诈识别团队', owner: '张风控' },
    { id: 'G004', name: '营销团队', type: 'department', memberCount: 22, description: '营销活动、客群运营', owner: '陈营销' },
    { id: 'G005', name: '产品团队', type: 'department', memberCount: 15, description: '产品设计、需求管理', owner: '李产品' },
    { id: 'G006', name: '审计组', type: 'custom', memberCount: 5, description: '数据合规审计', owner: '合规团队' },
    { id: 'G007', name: 'AI 项目组', type: 'project', memberCount: 8, description: 'AI 创新项目,临时组', owner: '张AI' }
  ]
})

const columns = [
  { title: 'ID', dataIndex: 'id', width: 80 },
  { title: '组名', dataIndex: 'name', slotName: 'name' },
  { title: '类型', dataIndex: 'type', slotName: 'type', width: 100 },
  { title: '成员', dataIndex: 'memberCount', slotName: 'memberCount', width: 100 },
  { title: 'Owner', dataIndex: 'owner', width: 100 },
  { title: '描述', dataIndex: 'description' },
  { title: '操作', dataIndex: 'actions', slotName: 'actions', width: 200 }
]

const memberColumns = [
  { title: '用户 ID', dataIndex: 'userId', width: 100 },
  { title: '姓名', dataIndex: 'name', width: 100 },
  { title: '邮箱', dataIndex: 'email' },
  { title: '角色', dataIndex: 'role', slotName: 'role', width: 110 }
]

const mockMembers = [
  { userId: 'U001', name: '王运营', email: 'wangyy@company.com', role: '组管理员' },
  { userId: 'U002', name: '张分析', email: 'zhangfx@company.com', role: '成员' },
  { userId: 'U003', name: '李数据', email: 'lidata@company.com', role: '成员' },
  { userId: 'U004', name: '陈业务', email: 'chenyw@company.com', role: '成员' }
]

function openCreate() {
  formMode.value = 'create'
  formData.value = { id: '', name: '', type: 'role', description: '' }
  formDrawerVisible.value = true
}

function openEdit(g: any) {
  formMode.value = 'edit'
  formData.value = { ...g }
  formDrawerVisible.value = true
}

function saveGroup() {
  if (!formData.value.name) {
    Message.warning('请填写组名')
    return
  }
  if (formMode.value === 'create') {
    const id = 'G' + (groups.value.length + 1).toString().padStart(3, '0')
    groups.value.push({ ...formData.value, id, memberCount: 0, owner: '当前用户' })
    Message.success('用户组已创建')
  } else {
    const idx = groups.value.findIndex(g => g.id === formData.value.id)
    if (idx >= 0) groups.value[idx] = { ...groups.value[idx], ...formData.value }
    Message.success('用户组已更新')
  }
  formDrawerVisible.value = false
}

function openDetail(g: any) {
  Message.info(`用户组详情: ${g.name}`)
}

function viewMembers(g: any) {
  currentGroup.value = g
  membersDrawerVisible.value = true
}

function viewPermissions(g: any) {
  Message.info(`权限分配: ${g.name}`)
}

function typeColor(t: string) {
  return { role: 'arcoblue', department: 'green', project: 'orange', custom: 'purple' }[t] || 'gray'
}
function typeLabel(t: string) {
  return { role: '角色组', department: '部门组', project: '项目组', custom: '自定义' }[t] || t
}

const goBack = () => router.push('management')
</script>

<style lang="scss" scoped>
.user-groups-page {
  padding: 24px;
  max-width: 1500px;
  margin: 0 auto;
}
</style>