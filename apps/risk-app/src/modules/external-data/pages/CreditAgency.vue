<template>
  <div class="credit-agency-page">
    <a-page-header title="征信机构管理" subtitle="维护征信机构主数据与 SFTP 目录配置，供外数落库、外数档案、费用核算统一引用">
      <template #extra>
        <a-button type="primary" @click="openCreate">
          <template #icon><icon-plus /></template>
          新增机构
        </a-button>
      </template>
    </a-page-header>

    <a-card class="list-card">
      <template #title>
        <a-space>
          <span>机构列表</span>
          <a-tag size="small">共 {{ filteredAgencies.length }} 家</a-tag>
        </a-space>
      </template>

      <!-- 筛选区 -->
      <a-form :model="filters" layout="inline" class="filter-bar">
        <a-form-item label="机构名称 / 编码">
          <a-input v-model="filters.keyword" placeholder="搜索机构名称或编码" allow-clear style="width: 220px" />
        </a-form-item>
        <a-form-item label="机构类型">
          <a-select v-model="filters.agencyType" placeholder="全部类型" allow-clear style="width: 160px">
            <a-option value="个人征信">个人征信</a-option>
            <a-option value="企业征信">企业征信</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model="filters.status" placeholder="全部状态" allow-clear style="width: 140px">
            <a-option value="启用">启用</a-option>
            <a-option value="停用">停用</a-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="loadAgencies">
              <template #icon><icon-search /></template>
              查询
            </a-button>
            <a-button @click="resetFilters">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>

      <a-table :data="pagedAgencies" :loading="loading" :pagination="pagination" row-key="id" @page-change="onPageChange">
        <template #columns>
          <a-table-column title="机构编码" data-index="agencyCode" :width="110">
            <template #cell="{ record }">
              <span class="mono">{{ record.agencyCode }}</span>
            </template>
          </a-table-column>
          <a-table-column title="机构名称" data-index="agencyName" ellipsis tooltip />
          <a-table-column title="机构类型" data-index="agencyType" :width="100">
            <template #cell="{ record }">
              <a-tag size="small" :color="record.agencyType === '个人征信' ? 'arcoblue' : 'purple'">{{ record.agencyType }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="牌照 / 备案编号" data-index="licenseNo" :width="200" ellipsis tooltip />
          <a-table-column title="SFTP 连接" :width="230">
            <template #cell="{ record }">
              <div class="mono sftp-cell">{{ record.sftp.host }}:{{ record.sftp.port }}</div>
              <div class="mono sftp-cell dim">{{ record.sftp.directory }}</div>
            </template>
          </a-table-column>
          <a-table-column title="路径管理策略" :width="150">
            <template #cell="{ record }">
              <a-tag size="small" :color="record.pathStrategy === 'auto_clean' ? 'orange' : 'green'">
                {{ record.pathStrategy === 'auto_clean' ? '自动清理' : '固定保留' }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="状态" data-index="status" :width="90">
            <template #cell="{ record }">
              <a-tag size="small" :color="record.status === '启用' ? 'green' : 'gray'">{{ record.status }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="联系人" :width="140">
            <template #cell="{ record }">
              <div>{{ record.contactPerson || '—' }}</div>
              <div class="dim">{{ record.contactPhone || '—' }}</div>
            </template>
          </a-table-column>
          <a-table-column title="更新时间" data-index="updatedAt" :width="170" />
          <a-table-column title="操作" :width="170" fixed="right">
            <template #cell="{ record }">
              <a-space>
                <a-button type="text" size="small" @click="openEdit(record)">编辑</a-button>
                <a-button type="text" size="small" @click="openView(record)">查看</a-button>
                <a-button
                  type="text"
                  size="small"
                  :status="record.status === '启用' ? 'warning' : 'success'"
                  @click="toggleStatus(record)"
                >
                  {{ record.status === '启用' ? '停用' : '启用' }}
                </a-button>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- 新增 / 编辑抽屉 -->
    <a-drawer
      v-model:visible="drawerVisible"
      :width="720"
      :title="isEdit ? '编辑征信机构' : '新增征信机构'"
      :ok-loading="submitting"
      @ok="handleSubmit"
    >
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-divider orientation="left">基础信息</a-divider>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="机构编码" field="agencyCode" required :help="isEdit ? '机构编码创建后锁定，不可修改' : '同一机构编码不可重复'">
              <a-input v-model="form.agencyCode" :disabled="isEdit" placeholder="如 BH / PD / QT" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="机构名称" field="agencyName" required>
              <a-input v-model="form.agencyName" placeholder="请输入机构全称" allow-clear />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="机构类型" field="agencyType" required help="个人征信 / 企业征信，影响后续外数产品目录">
              <a-select v-model="form.agencyType" placeholder="请选择机构类型">
                <a-option value="个人征信">个人征信</a-option>
                <a-option value="企业征信">企业征信</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="牌照 / 备案编号" field="licenseNo" required help="作为准入校验字段">
              <a-input v-model="form.licenseNo" placeholder="请输入牌照或备案编号" allow-clear />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="联系人">
              <a-input v-model="form.contactPerson" placeholder="请输入联系人" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="联系电话">
              <a-input v-model="form.contactPhone" placeholder="请输入联系电话" allow-clear />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="路径管理策略" field="pathStrategy" help="钱塘等机构会定期自动清理历史路径文件，选中此类机构时落库页面会提示及时处理">
          <a-radio-group v-model="form.pathStrategy">
            <a-radio value="fixed">固定保留（download 目录，历史文件不自动清理）</a-radio>
            <a-radio value="auto_clean">自动清理（定期清理历史路径文件）</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model="form.remark" :auto-size="{ minRows: 2, maxRows: 4 }" placeholder="补充说明" />
        </a-form-item>

        <a-divider orientation="left">SFTP 连接配置</a-divider>
        <a-alert type="info" style="margin-bottom: 16px">
          保存前必须通过 SFTP 连接测试；修改任一 SFTP 参数后需重新测试（R05 / R09）。
        </a-alert>
        <a-row :gutter="16">
          <a-col :span="16">
            <a-form-item label="IP 地址" field="sftp.host" required>
              <a-input v-model="form.sftp.host" placeholder="如 10.21.8.31" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="端口" field="sftp.port" required>
              <a-input-number v-model="form.sftp.port" :min="1" :max="65535" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="用户名" field="sftp.username" required>
              <a-input v-model="form.sftp.username" placeholder="请输入 SFTP 用户名" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="密码 / 密钥" field="sftp.password" required>
              <a-input-password v-model="form.sftp.password" placeholder="请输入 SFTP 密码或私钥" allow-clear />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="目录路径" field="sftp.directory" required help="末尾可省略 /，系统自动补齐">
          <a-input v-model="form.sftp.directory" placeholder="如 /sftp/external_retro/baihang/download/" allow-clear />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button :loading="testing" @click="handleTestConnection">
              <template #icon><icon-link /></template>
              测试连接
            </a-button>
            <a-tag v-if="testPassed" color="green">
              <template #icon><icon-check-circle-fill /></template>
              连接测试已通过
            </a-tag>
            <a-tag v-else-if="testFailed" color="red">
              <template #icon><icon-close-circle-fill /></template>
              连接测试未通过
            </a-tag>
          </a-space>
        </a-form-item>
      </a-form>
    </a-drawer>

    <!-- 查看抽屉（只读） -->
    <a-drawer v-model:visible="viewVisible" :width="640" title="征信机构详情" :footer="false">
      <a-descriptions :column="1" bordered size="small">
        <a-descriptions-item label="机构编码">{{ current.agencyCode }}</a-descriptions-item>
        <a-descriptions-item label="机构名称">{{ current.agencyName }}</a-descriptions-item>
        <a-descriptions-item label="机构类型">{{ current.agencyType }}</a-descriptions-item>
        <a-descriptions-item label="牌照 / 备案编号">{{ current.licenseNo }}</a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-tag size="small" :color="current.status === '启用' ? 'green' : 'gray'">{{ current.status }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="路径管理策略">{{ pathStrategyText }}</a-descriptions-item>
        <a-descriptions-item label="SFTP 地址">
          <span class="mono">{{ current.sftp?.host }}:{{ current.sftp?.port }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="SFTP 用户名">
          <span class="mono">{{ current.sftp?.username }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="SFTP 目录">
          <span class="mono">{{ current.sftp?.directory }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="联系人">{{ current.contactPerson || '—' }} {{ current.contactPhone }}</a-descriptions-item>
        <a-descriptions-item label="备注">{{ current.remark || '—' }}</a-descriptions-item>
        <a-descriptions-item label="创建信息">{{ current.createdBy }} · {{ current.createdAt }}</a-descriptions-item>
        <a-descriptions-item label="更新信息">{{ current.updatedBy }} · {{ current.updatedAt }}</a-descriptions-item>
      </a-descriptions>
      <a-alert v-if="current.pathStrategy === 'auto_clean'" type="warning" style="margin-top: 16px">
        {{ current.pathStrategyDesc }}
      </a-alert>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import type { FormInstance } from '@arco-design/web-vue'
import { IconPlus, IconSearch, IconLink, IconCheckCircleFill, IconCloseCircleFill } from '@arco-design/web-vue/es/icon'
import {
  fetchCreditAgencies,
  addCreditAgency,
  editCreditAgency,
  checkAgencySftpConnection,
} from '../api/creditAgency'
import type { CreditAgency } from '../mock/creditAgencies'

/** 表单模型（新增 / 编辑共用） */
const emptyForm = (): Partial<CreditAgency> & { sftp: CreditAgency['sftp'] } => ({
  agencyCode: '',
  agencyName: '',
  agencyType: '个人征信',
  licenseNo: '',
  status: '启用',
  pathStrategy: 'fixed',
  sftp: { host: '', port: 22, username: '', password: '', directory: '' },
  contactPerson: '',
  contactPhone: '',
  remark: '',
})

const loading = ref(false)
const submitting = ref(false)
const testing = ref(false)
const agencies = ref<CreditAgency[]>([])

/** 筛选条件 */
const filters = reactive({ keyword: '', agencyType: '', status: '' })

/** 分页配置 */
const pagination = reactive({ current: 1, pageSize: 10, total: 0 })

/** 过滤后的机构列表 */
const filteredAgencies = computed(() => {
  const kw = filters.keyword.trim()
  return agencies.value.filter((a) => {
    if (kw && !a.agencyName.includes(kw) && !a.agencyCode.includes(kw)) return false
    if (filters.agencyType && a.agencyType !== filters.agencyType) return false
    if (filters.status && a.status !== filters.status) return false
    return true
  })
})

/** 前端分页数据 */
const pagedAgencies = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredAgencies.value.slice(start, start + pagination.pageSize)
})

/** 加载机构列表 */
const loadAgencies = async () => {
  loading.value = true
  try {
    agencies.value = await fetchCreditAgencies()
    pagination.total = agencies.value.length
  } catch (e: any) {
    Message.error(e?.message ?? '获取征信机构列表失败')
  } finally {
    loading.value = false
  }
}

/** 重置筛选条件 */
const resetFilters = () => {
  filters.keyword = ''
  filters.agencyType = ''
  filters.status = ''
  pagination.current = 1
}

/** 翻页 */
const onPageChange = (page: number) => {
  pagination.current = page
}

/* ---------- 新增 / 编辑抽屉 ---------- */
const drawerVisible = ref(false)
const isEdit = ref(false)
const formRef = ref<FormInstance>()
const form = reactive(emptyForm())

/** 校验规则（R01 编码唯一 / R03 资质必填 / R04 SFTP 参数完整性） */
const rules = {
  agencyCode: [{ required: true, message: '请输入机构编码' }],
  agencyName: [{ required: true, message: '请输入机构名称' }],
  agencyType: [{ required: true, message: '请选择机构类型' }],
  licenseNo: [{ required: true, message: '请输入牌照 / 备案编号' }],
  'sftp.host': [{ required: true, message: '请输入 SFTP IP 地址' }],
  'sftp.port': [{ required: true, message: '请输入 SFTP 端口' }],
  'sftp.username': [{ required: true, message: '请输入 SFTP 用户名' }],
  'sftp.password': [{ required: true, message: '请输入 SFTP 密码 / 密钥' }],
  'sftp.directory': [{ required: true, message: '请输入 SFTP 目录路径' }],
}

/** 连接测试结果标记 */
const testPassed = ref(false)
const testFailed = ref(false)

/** 打开新增抽屉 */
const openCreate = () => {
  isEdit.value = false
  Object.assign(form, emptyForm())
  testPassed.value = false
  testFailed.value = false
  drawerVisible.value = true
}

/** 打开编辑抽屉（R08 机构编码锁定） */
const openEdit = (record: CreditAgency) => {
  isEdit.value = true
  Object.assign(form, JSON.parse(JSON.stringify(record)))
  testPassed.value = false
  testFailed.value = false
  drawerVisible.value = true
}

/** 查看详情 */
const viewVisible = ref(false)
const current = ref<CreditAgency>(emptyForm() as CreditAgency)
const pathStrategyText = computed(() => (current.value.pathStrategy === 'auto_clean' ? '自动清理（定期清理历史路径文件）' : '固定保留（download 目录）'))

/** 打开查看抽屉 */
const openView = (record: CreditAgency) => {
  current.value = JSON.parse(JSON.stringify(record))
  viewVisible.value = true
}

/** SFTP 连接测试（R05 / R09） */
const handleTestConnection = async () => {
  testing.value = true
  testPassed.value = false
  testFailed.value = false
  try {
    const res = await checkAgencySftpConnection(form.sftp)
    testPassed.value = true
    Message.success(res?.message ?? 'SFTP 连接测试通过')
  } catch (e: any) {
    testFailed.value = true
    Message.error(e?.message ?? 'SFTP 连接测试失败')
  } finally {
    testing.value = false
  }
}

/** 提交保存（E2 编码重复 / E3 必填缺失由表单与 mock 层校验） */
const handleSubmit = async () => {
  const valid = await formRef.value?.validate()
  if (!valid) return
  submitting.value = true
  try {
    if (isEdit.value) {
      await editCreditAgency(form.id as string, form)
      Message.success('机构信息已保存')
    } else {
      await addCreditAgency(form)
      Message.success('机构新增成功，状态为「启用」')
    }
    drawerVisible.value = false
    await loadAgencies()
  } catch (e: any) {
    Message.error(e?.message ?? '保存失败')
  } finally {
    submitting.value = false
  }
}

/** 启用 / 停用机构（R06：停用后业务场景不可选，关联配置保留） */
const toggleStatus = (record: CreditAgency) => {
  const nextStatus = record.status === '启用' ? '停用' : '启用'
  Modal.warning({
    title: nextStatus === '停用' ? '确认停用该机构？' : '确认启用该机构？',
    content:
      nextStatus === '停用'
        ? '停用后外数落库等业务场景不可选择该机构；已有关联配置不删除，仅置灰不可选。'
        : '启用后该机构可在外数落库等业务场景中被选择。',
    okText: '确认',
    hideCancel: false,
    onOk: async () => {
      try {
        await editCreditAgency(record.id, { status: nextStatus })
        Message.success(`机构「${record.agencyName}」已${nextStatus}`)
        await loadAgencies()
      } catch (e: any) {
        Message.error(e?.message ?? '操作失败')
      }
    },
  })
}

onMounted(loadAgencies)
</script>

<style scoped>
.credit-agency-page {
  padding: 0 16px;
}

.list-card {
  margin-top: 16px;
}

.filter-bar {
  margin-bottom: 16px;
}

.mono {
  font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 12px;
}

.sftp-cell {
  line-height: 18px;
}

.dim {
  color: var(--color-text-3);
}
</style>
