<template>
  <div class="app-permission-page">
    <a-card class="general-card" title="应用权限管理">
      <a-row style="margin-bottom: 16px">
        <a-col :span="12">
          <a-space>
            <a-button type="primary" @click="handleGrant">
              <template #icon><icon-plus /></template>
              新增
            </a-button>
          </a-space>
        </a-col>
        <a-col :span="12" style="text-align: right">
          <a-input-search
            v-model="searchKey"
            placeholder="搜索权限名称/用户"
            style="width: 300px"
            allow-clear
            @search="handleSearch"
          />
        </a-col>
      </a-row>

      <a-table :data="tableData" :pagination="pagination" @page-change="handlePageChange">
        <template #columns>
          <a-table-column title="权限名称" data-index="name" />
          <a-table-column title="类型" data-index="type">
            <template #cell="{ record }">
              <a-tag :color="getTypeColor(record.type)">{{ record.type }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="描述" data-index="description" />
          <a-table-column title="授予角色" data-index="roles">
            <template #cell="{ record }">
              <a-space wrap>
                <a-tag v-for="role in record.roles" :key="role" size="small" color="blue">{{ role }}</a-tag>
              </a-space>
            </template>
          </a-table-column>
          <a-table-column title="已授予用户" data-index="users">
            <template #cell="{ record }">
              <a-space wrap>
                <a-tag v-for="user in record.users" :key="user" size="small" color="green">{{ user }}</a-tag>
              </a-space>
            </template>
          </a-table-column>
          <a-table-column title="用户部门" data-index="userDepartments">
            <template #cell="{ record }">
              <a-space wrap>
                <a-tag v-for="dept in record.userDepartments" :key="dept" size="small" color="orange">{{ dept }}</a-tag>
              </a-space>
            </template>
          </a-table-column>
          <a-table-column title="操作" width="150" align="center">
            <template #cell="{ record }">
              <a-space>
                <a-button type="text" size="small" @click="handleEdit(record)">编辑</a-button>
                <a-button type="text" status="danger" size="small" @click="handleRevoke(record)">回收</a-button>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- 应用权限配置抽屉 -->
    <a-drawer
      v-model:visible="drawerVisible"
      :title="isNew ? '新增应用权限' : '编辑应用权限'"
      width="1000px"
      @cancel="drawerVisible = false"
      unmount-on-close
    >
      <a-tabs v-model:active-key="activeTab">
        <a-tab-pane key="app" title="应用配置">
          <div class="drawer-content">
            <a-form :model="currentConfig" layout="vertical">
              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="所属应用" required>
                    <a-select v-model="currentConfig.appName" placeholder="请选择应用">
                      <a-option>统一查询</a-option>
                      <a-option>报表中心</a-option>
                      <a-option>数据地图</a-option>
                      <a-option>系统管理</a-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="权限名称" required>
                    <a-input v-model="currentConfig.permissionName" placeholder="请输入权限名称" />
                  </a-form-item>
                </a-col>
              </a-row>
              
              <a-form-item label="角色描述">
                <a-textarea v-model="currentConfig.description" placeholder="请输入角色描述" :rows="2" />
              </a-form-item>

              <a-row :gutter="16">
                <a-col :span="8">
                  <a-form-item label="赋予全员">
                    <a-switch v-model="currentConfig.isAllUser" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="是否可申请">
                    <a-switch v-model="currentConfig.canApply" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="角色状态">
                    <a-radio-group v-model="currentConfig.status" type="button">
                      <a-radio value="active">启用</a-radio>
                      <a-radio value="inactive">停用</a-radio>
                    </a-radio-group>
                  </a-form-item>
                </a-col>
              </a-row>
              
              <a-divider orientation="left">资源权限配置</a-divider>
              <div class="resource-table-wrapper">
                <a-table
                  :data="resourceData"
                  :pagination="false"
                  :show-header="true"
                  row-key="id"
                  :indent-size="20"
                  default-expand-all-rows
                >
                  <template #columns>
                    <a-table-column title="页面路由" data-index="name">
                      <template #cell="{ record }">
                        <a-checkbox v-model="record.selected">{{ record.name }}</a-checkbox>
                      </template>
                    </a-table-column>
                    <a-table-column title="页面操作">
                      <template #cell="{ record }">
                        <a-space v-if="record.actions && record.actions.length">
                          <a-checkbox 
                            v-for="action in record.actions" 
                            :key="action.id"
                            v-model="action.selected"
                          >
                            {{ action.name }}
                          </a-checkbox>
                        </a-space>
                      </template>
                    </a-table-column>
                  </template>
                </a-table>
              </div>
            </a-form>
          </div>
        </a-tab-pane>
        
        <a-tab-pane key="grant" title="授予对象">
          <div class="drawer-content">
            <a-form layout="vertical">
              <a-row :gutter="16">
                <a-col :span="8">
                  <a-form-item label="对象类型">
                    <a-radio-group v-model="grantSubject.type" type="button">
                      <a-radio value="role">角色</a-radio>
                      <a-radio value="user">用户</a-radio>
                    </a-radio-group>
                  </a-form-item>
                </a-col>
                <a-col :span="16">
                  <a-form-item :label="grantSubjectLabel">
                    <a-select v-model="grantSubject.value" :options="grantSubjectOptions" allow-search placeholder="请选择" />
                  </a-form-item>
                </a-col>
              </a-row>
              <a-row :gutter="16">
                <a-col :span="24" style="text-align: right;">
                  <a-button type="primary" @click="addGrantToList">添加到列表</a-button>
                </a-col>
              </a-row>
            </a-form>
            
            <!-- 已选择的授予对象 -->
            <a-divider orientation="left">已选择的授予对象</a-divider>
            <div class="selected-grants">
              <a-table
                :data="selectedGrants"
                :pagination="false"
                :show-header="true"
              >
                <template #columns>
                  <a-table-column title="对象类型" data-index="type" />
                  <a-table-column title="对象名称" data-index="name" />
                  <a-table-column title="所属部门" data-index="department" />
                  <a-table-column title="操作" :width="80">
                    <template #cell="{ record }">
                      <a-button type="text" status="danger" size="small" @click="removeGrant(record)">移除</a-button>
                    </template>
                  </a-table-column>
                </template>
              </a-table>
            </div>
          </div>
        </a-tab-pane>
      </a-tabs>
      
      <template #footer>
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <a-button @click="drawerVisible = false">取消</a-button>
          <a-button type="primary" @click="handleSave">保存</a-button>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useUserStore } from '@/stores/user'
const userStore = useUserStore()

const searchKey = ref('')
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 30
})

const grantSubject = reactive({
  type: 'role',
  value: ''
})
const grantSubjectLabel = computed(() => {
  if (grantSubject.type === 'role') return '选择角色'
  if (grantSubject.type === 'user') return '选择用户'
  return '选择对象'
})
const grantSubjectOptions = computed(() => {
  if (grantSubject.type === 'role') return [
    { label: '业务人员', value: '业务人员' },
    { label: '数据分析师', value: '数据分析师' },
    { label: '系统管理员', value: '系统管理员' }
  ]
  if (grantSubject.type === 'user') return [
    { label: '张三', value: 'zhangsan' },
    { label: '李四', value: 'lisi' },
    { label: '王五', value: 'wangwu' }
  ]
  return []
})

const tableData = ref([
  {
    id: 1,
    name: '统一查询',
    type: '核心功能',
    description: '提供统一的数据查询和导出功能',
    roles: ['业务人员', '数据分析师'],
    users: ['张三', '李四'],
    userDepartments: ['技术部', '数据分析部']
  },
  {
    id: 2,
    name: '报表中心',
    type: '核心功能',
    description: '企业级报表展示与管理',
    roles: ['管理层', '运营人员'],
    users: ['王五'],
    userDepartments: ['运营部']
  },
  {
    id: 3,
    name: '系统管理',
    type: '系统管理',
    description: '系统基础配置与权限控制',
    roles: ['系统管理员'],
    users: ['Admin'],
    userDepartments: ['IT部']
  },
  {
    id: 4,
    name: '操作手册',
    type: '辅助功能',
    description: '提供平台使用指南和操作说明',
    roles: ['所有角色'],
    users: ['全体用户'],
    userDepartments: ['全公司']
  }
])

// 抽屉相关
const drawerVisible = ref(false)
const activeTab = ref('app')
const isNew = ref(false)
const currentConfig = reactive({
  appName: '',
  roleName: '',
  description: '',
  isAllUser: false,
  canApply: true,
  status: 'active'
})

// 已选择的授予对象数据
const selectedGrants = ref([
  { type: '角色', name: '数据分析师', department: '数据分析部' },
  { type: '用户', name: '张三', department: '技术部' }
])

const resourceData = ref([
  {
    id: '1',
    name: '业务查询',
    selected: true,
    children: [
      {
        id: '1-1',
        name: 'SQL查询',
        selected: true,
        actions: [
          { id: '1-1-1', name: 'SQL查询', selected: true },
          { id: '1-1-2', name: '自助取数', selected: true }
        ]
      },
      {
        id: '1-2',
        name: '自助取数',
        selected: false,
        actions: []
      }
    ]
  },
  {
    id: '2',
    name: '数据分析',
    selected: true,
    children: [
      {
        id: '2-1',
        name: '电子表格',
        selected: true,
        actions: [
          { id: '2-1-1', name: '电子表格', selected: true }
        ]
      }
    ]
  },
  {
    id: '3',
    name: '数据安全',
    selected: false,
    children: []
  },
  {
    id: '4',
    name: '平台管理',
    selected: false,
    children: []
  }
])

const handleSearch = () => {
  // Implement search
}

const handlePageChange = (page) => {
  pagination.current = page
}

const handleGrant = () => {
  isNew.value = true
  currentConfig.appName = ''
  currentConfig.roleName = ''
  currentConfig.description = ''
  currentConfig.isAllUser = false
  currentConfig.canApply = true
  currentConfig.status = 'active'
  
  // 清空已选择的授予对象列表
  selectedGrants.value = []
  
  drawerVisible.value = true
}

const handleEdit = (record) => {
  isNew.value = false
  currentConfig.appName = record.name
  currentConfig.roleName = record.roles[0] || '默认角色'
  currentConfig.description = record.description || ''
  currentConfig.isAllUser = record.isAllUser || false
  currentConfig.canApply = record.canApply !== undefined ? record.canApply : true
  currentConfig.status = record.status || 'active'
  
  // 如果记录中有已保存的授予对象列表，则加载它们
  if (record.grants && Array.isArray(record.grants)) {
    selectedGrants.value = [...record.grants]
  } else {
    // 默认加载一些示例数据
    selectedGrants.value = [
      { type: '角色', name: '数据分析师', department: '数据分析部' },
      { type: '用户', name: '张三', department: '技术部' }
    ]
  }
  
  drawerVisible.value = true
}

const handleRevoke = (record) => {
  Message.success(`已回收权限: ${record.name}`)
}

const getTypeColor = (type) => {
  switch (type) {
    case '核心功能':
      return 'blue'
    case '辅助功能':
      return 'green'
    case '系统管理':
      return 'orange'
    default:
      return 'gray'
  }
}

// 添加授予对象到列表
const addGrantToList = () => {
  if (!grantSubject.value) {
    Message.warning('请先选择授予对象')
    return
  }
  
  // 获取用户或角色的部门信息（这里使用模拟数据，实际项目中需要从用户/角色数据中获取）
  let department = '未知部门'
  if (grantSubject.type === 'user') {
    // 假设从用户数据中获取部门信息
    const userDepartments = {
      'zhangsan': '技术部',
      'lisi': '数据分析部',
      'wangwu': '运营部'
    }
    department = userDepartments[grantSubject.value] || '未知部门'
  } else if (grantSubject.type === 'role') {
    // 假设从角色数据中获取部门信息
    const roleDepartments = {
      '业务人员': '业务部',
      '数据分析师': '数据分析部',
      '系统管理员': 'IT部'
    }
    department = roleDepartments[grantSubject.value] || '未知部门'
  }
  
  // 检查是否已存在相同的授予对象
  const exists = selectedGrants.value.some(item => 
    item.type === grantSubject.type && item.name === grantSubject.value
  )
  
  if (!exists) {
    selectedGrants.value.push({
      type: grantSubject.type === 'role' ? '角色' : '用户',
      name: grantSubject.value,
      department: department
    })
  } else {
    Message.warning('该对象已被添加')
  }
}

// 从列表中移除授予对象
const removeGrant = (record) => {
  const index = selectedGrants.value.findIndex(item => 
    item.type === record.type && item.name === record.name
  )
  if (index !== -1) {
    selectedGrants.value.splice(index, 1)
  }
}

const handleSave = () => {
  Message.success('保存成功')
  try {
    const existing = JSON.parse(localStorage.getItem('grants:app') || '[]')
    const record = {
      subjectType: grantSubject.type,
      subject: grantSubject.value,
      appName: currentConfig.appName,
      roleName: currentConfig.roleName,
      resources: resourceData.value,
      grants: selectedGrants.value // 保存所有选择的授予对象
    }
    localStorage.setItem('grants:app', JSON.stringify([record, ...existing]))
  } catch (e) {}
  userStore.computeEffectivePermissions()
  drawerVisible.value = false
}
</script>

<style scoped>
.app-permission-page {
  padding: 20px;
}
.drawer-content {
  padding: 0;
}
.config-header {
  display: flex;
  gap: 100px;
  padding: 16px 20px;
  background-color: #f7f8fa;
  margin-bottom: 20px;
  border-radius: 4px;
}
.header-item {
  color: var(--subapp-text-secondary);
  font-size: 14px;
}
.header-item span {
  color: var(--subapp-text-primary);
  font-weight: 500;
  margin-left: 8px;
}
.resource-table-wrapper {
  border: 1px solid var(--subapp-bg-secondary);
  border-radius: 4px;
}
:deep(.arco-table-th) {
  background-color: #f7f8fa;
  font-weight: 600;
}
:deep(.arco-table-td) {
  padding-top: 12px;
  padding-bottom: 12px;
}
.selected-grants {
  margin-top: 20px;
}
</style>
