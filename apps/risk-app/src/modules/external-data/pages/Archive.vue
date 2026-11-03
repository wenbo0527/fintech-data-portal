<template>
  <div class="external-data-archive">
    <div class="page-header">
      <div class="header-content">
        <div class="header-info">
          <h2>外数档案管理</h2>
          <p class="page-description">外部数据的生命周期档案管理，统一管理数据产品、接口信息和供应商信息</p>
        </div>
      <div class="header-actions">
        <a-space>
          <a-button type="primary" @click="openCreate">新建外数</a-button>
        </a-space>
      </div>
      </div>
    </div>

    <a-card class="toolbar" :bordered="true" style="margin-top: 12px">
      <a-form :model="filters" layout="inline">
        <a-form-item label="快速状态">
          <a-radio-group v-model="filters.statusQuick">
            <a-radio value="">全部</a-radio>
            <a-radio v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item field="suppliers" label="供应商">
          <a-select v-model="filters.suppliers" multiple allow-clear placeholder="选择供应商" style="width: 260px">
            <a-option v-for="s in supplierOptions" :key="s" :value="s">{{ s }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="status" label="状态">
          <!-- R04：状态下拉与快速状态共用同一份六状态枚举，改造前缺「待完善技术档案」 -->
          <a-select v-model="filters.status" allow-clear placeholder="选择状态" style="width: 180px">
            <a-option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="usageScene" label="使用场景">
          <a-input v-model="filters.usageScene" allow-clear placeholder="文本匹配" style="width: 200px" />
        </a-form-item>
        <a-form-item field="keyword" label="关键词">
          <a-input v-model="filters.keyword" allow-clear placeholder="名称/编码" style="width: 200px" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="applyFilter">查询</a-button>
          <a-button style="margin-left: 8px" @click="resetFilter">重置</a-button>
        </a-form-item>
        <a-form-item style="margin-left: auto">
          <a-space>
            <a-button @click="refreshProducts">刷新</a-button>
            <a-button type="outline" @click="exportList">导出列表</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card title="档案列表" :bordered="true" :loading="loading">
      <a-table :data="displayedList" row-key="id" :pagination="pagination" @page-change="onPageChange">
        <template #columns>
          <a-table-column title="产品名称" :width="220">
            <template #cell="{ record }">
              <a-button type="text" @click="goDetailPage(record)">{{ record.name }}</a-button>
            </template>
          </a-table-column>
          <a-table-column title="合作机构" :width="120">
            <!-- 2026-11-03 两轴口径：合作机构是闭集四档（百行 / 朴道 / 钱塘 / 其他），不再是十二家工商全称 -->
            <template #cell="{ record }">{{ record.cooperationOrg || '—' }}</template>
          </a-table-column>
          <a-table-column title="供应商" data-index="supplier" :width="160" />
          <a-table-column title="接口号" :width="140">
            <!-- R10：先签协议后引入的档案接口号为空，按文档口径显示「待补充」而非「—」 -->
            <template #cell="{ record }">{{ record.interfaceNo || '待补充' }}</template>
          </a-table-column>
          <a-table-column title="状态" :width="120">
            <template #cell="{ record }"><a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag></template>
          </a-table-column>
          <a-table-column title="接入时间" :width="180">
            <template #cell="{ record }">{{ formatDate(record.createdAt) }}</template>
          </a-table-column>
          <a-table-column title="使用场景" :width="240">
            <template #cell="{ record }">{{ record.usageScene || '—' }}</template>
          </a-table-column>
          <a-table-column title="标签" :width="200">
            <template #cell="{ record }">
              <a-space wrap>
                <a-tag v-for="t in (record.tags||[])" :key="t">{{ t }}</a-tag>
              </a-space>
            </template>
          </a-table-column>
          <a-table-column title="评估得分" :width="120">
            <template #cell="{ record }">{{ record.evaluationScore ?? '—' }}</template>
          </a-table-column>
          <a-table-column title="监控状态" :width="120">
            <template #cell="{ record }">{{ record.monitorStatus ?? '—' }}</template>
          </a-table-column>
          <a-table-column title="操作" :width="160" fixed="right">
            <template #cell="{ record }">
              <a-space>
                <!-- R06：列表操作列只保留「查看档案」跳转详情，编辑在详情页完成 -->
                <a-button size="small" type="text" @click="goDetailPage(record)">查看档案</a-button>
              </a-space>
            </template>
          </a-table-column>
        </template>
        <template #empty><a-empty description="没有符合条件的外数档案" /></template>
      </a-table>
  </a-card>

    <!-- 档案编辑弹窗 (分步表单) -->
    <!-- R06/R20：列表只提供「新建外数档案」，编辑入口在详情页 -->
    <a-modal v-model:visible="editVisible" title="新建外数档案" :width="800" :footer="false" :mask-closable="false">
      <a-steps :current="currentStep" style="margin-bottom: 24px" small>
        <a-step title="基础信息" />
        <a-step title="接口信息" />
        <a-step title="数据存储与血缘" />
      </a-steps>

      <a-form :model="editForm" layout="vertical">
        <!-- 步骤1：基础信息 -->
        <div v-show="currentStep === 1">
          <a-row :gutter="16">
            <a-col :span="8">
              <a-form-item field="name" label="外数名称" required>
                <a-input v-model="editForm.name" placeholder="请输入外数名称" />
              </a-form-item>
            </a-col>
            <!-- 两轴口径：合作机构＝持牌征信机构四档，供应商＝实际供数/接入厂商，口径见 mock/orgDictionaries.ts -->
            <a-col :span="8">
              <a-form-item field="cooperationOrg" label="合作机构" required>
                <a-select v-model="editForm.cooperationOrg" allow-clear allow-search placeholder="选择合作机构" :options="cooperationOrgOptions" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <!-- 原「渠道」轴已并入供应商（2026-11-03），候选取字典枚举且允许输入新厂商 -->
              <a-form-item field="supplier" label="供应商">
                <a-select v-model="editForm.supplier" allow-clear allow-create allow-search placeholder="选择或输入供应商名称">
                  <a-option v-for="s in supplierDictOptions" :key="s" :value="s">{{ s }}</a-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <!-- R22：外数类型决定是否存落库环节，为必填 -->
              <a-form-item field="externalDataType" label="外数类型" required>
                <a-select v-model="editForm.externalDataType" placeholder="选择外数类型">
                  <a-option v-for="t in EXTERNAL_DATA_TYPES" :key="t" :value="t">{{ t }}</a-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <!-- R129：新建档案一律进入「引入中」，状态由业务事件流转，不开放人工任选 -->
              <a-form-item field="status" label="当前状态">
                <a-input :model-value="ARCHIVE_STATUS_META.importing.label" disabled />
              </a-form-item>
            </a-col>
            <a-col :span="24">
              <a-form-item field="usageScene" label="使用场景" required>
                <a-textarea v-model="editForm.usageScene" placeholder="请详细描述该数据的使用场景" />
              </a-form-item>
            </a-col>
            <a-col :span="24">
              <a-form-item field="tags" label="标签">
                <a-input-tag v-model="editForm.tags" placeholder="输入后回车添加标签" allow-clear />
              </a-form-item>
            </a-col>
          </a-row>
        </div>

        <!-- 步骤2：接口信息 -->
        <div v-show="currentStep === 2">
          <a-row :gutter="16">
            <!-- PRD R03: 新增接口号字段，非必填，后期可更改 -->
            <a-col :span="8">
              <a-form-item field="interfaceNo" label="接口号">
                <a-input v-model="editForm.interfaceNo" placeholder="接口号（非必填，后期可补充）" />
              </a-form-item>
            </a-col>
            <a-col :span="16">
              <a-form-item field="apiUrl" label="接口地址" required>
                <a-select v-model="editForm.apiUrl" placeholder="请选择或输入 API 接口地址" allow-create allow-search>
                  <a-option value="https://api.provider.com/v1/query">https://api.provider.com/v1/query (默认查询)</a-option>
                  <a-option value="https://api.provider.com/v2/auth">https://api.provider.com/v2/auth (身份核验)</a-option>
                  <a-option value="https://api.provider.com/v1/batch">https://api.provider.com/v1/batch (批量接口)</a-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item field="requestMethod" label="请求方式" required>
                <a-select v-model="editForm.requestMethod" placeholder="选择请求方式">
                  <a-option value="GET">GET</a-option>
                  <a-option value="POST">POST</a-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>

          <a-divider orientation="left" style="margin-top: 0">数据要素模型</a-divider>
          <div style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span><strong>入参定义</strong></span>
              <a-button type="outline" size="small" @click="addInputParam">添加参数</a-button>
            </div>
            <a-table :data="editForm.inputParams" :pagination="false" size="small">
              <template #columns>
                <a-table-column title="参数名">
                  <template #cell="{ record }"><a-input v-model="record.name" size="small" /></template>
                </a-table-column>
                <a-table-column title="类型">
                  <template #cell="{ record }">
                    <a-select v-model="record.type" size="small">
                      <a-option value="string">String</a-option>
                      <a-option value="number">Number</a-option>
                    </a-select>
                  </template>
                </a-table-column>
                <a-table-column title="必填">
                  <template #cell="{ record }"><a-switch v-model="record.required" size="small" /></template>
                </a-table-column>
                <a-table-column title="是否为要素">
                  <template #cell="{ record }"><a-switch v-model="record.isElement" size="small" /></template>
                </a-table-column>
                <a-table-column title="操作" :width="80">
                  <template #cell="{ rowIndex }"><a-button type="text" status="danger" size="small" @click="removeInputParam(rowIndex)">删除</a-button></template>
                </a-table-column>
              </template>
            </a-table>
          </div>

          <div style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span><strong>出参定义</strong></span>
              <a-button type="outline" size="small" @click="addOutputParam">添加参数</a-button>
            </div>
            <a-table :data="editForm.outputParams" :pagination="false" size="small">
              <template #columns>
                <a-table-column title="参数名">
                  <template #cell="{ record }"><a-input v-model="record.name" size="small" /></template>
                </a-table-column>
                <a-table-column title="类型">
                  <template #cell="{ record }">
                    <a-select v-model="record.type" size="small">
                      <a-option value="string">String</a-option>
                      <a-option value="number">Number</a-option>
                      <a-option value="boolean">Boolean</a-option>
                    </a-select>
                  </template>
                </a-table-column>
                <a-table-column title="描述">
                  <template #cell="{ record }"><a-input v-model="record.description" size="small" /></template>
                </a-table-column>
                <a-table-column title="操作" :width="80">
                  <template #cell="{ rowIndex }"><a-button type="text" status="danger" size="small" @click="removeOutputParam(rowIndex)">删除</a-button></template>
                </a-table-column>
              </template>
            </a-table>
          </div>
        </div>

        <!-- 步骤3：数据存储与血缘 -->
        <div v-show="currentStep === 3">
          <a-alert type="info" style="margin-bottom: 16px;">
            新建阶段这些信息可先留空（需求文档 R07「先签协议后引入」），后续在详情页补齐。
          </a-alert>
          <a-form-item field="targetTable" label="落库目标表">
            <a-input v-model="editForm.targetTable" placeholder="如 dw_ods.ods_ext_retro_std，在线实时调用可留空" allow-clear />
            <template #extra>
              <div style="font-size: 12px; color: var(--color-text-3); margin-top: 4px;">
                一张权威落库目标表，字段具体落位在详情页「落库字段映射」页签维护
              </div>
            </template>
          </a-form-item>
          <a-space v-if="editForm.targetTable">
            <a-button type="outline" size="small" @click="viewTableFields(editForm.targetTable)">查看字段</a-button>
            <a-button type="outline" size="small" @click="viewDataLineage(editForm.targetTable)">查看血缘</a-button>
          </a-space>
        </div>

        <!-- 底部导航按钮 -->
        <div style="text-align: right; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--color-neutral-3);">
          <a-space>
            <a-button @click="editVisible = false">取消</a-button>
            <a-button v-if="currentStep > 1" @click="currentStep--">上一步</a-button>
            <a-button v-if="currentStep < 3" type="primary" @click="nextStep">下一步</a-button>
            <a-button v-if="currentStep === 3" type="primary" :loading="saving" @click="saveEdit">保存并完成</a-button>
          </a-space>
        </div>

      </a-form>
    </a-modal>

    <!-- 查看表字段抽屉 -->
    <a-drawer v-model:visible="tableFieldsVisible" :width="500" :title="tableFieldsTitle">
      <a-table :data="tableFields" :pagination="false">
        <template #columns>
          <a-table-column title="字段名" data-index="name" />
          <a-table-column title="类型" data-index="type" />
          <a-table-column title="注释" data-index="comment" />
        </template>
      </a-table>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted, computed, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useRouter } from 'vue-router'
import { useExternalDataStore } from '@/modules/external-data/stores'
import { IconDownload } from '@arco-design/web-vue/es/icon'
import DateUtils from '@/utils/dateUtils'
import { COOPERATION_ORG_OPTIONS, SUPPLIER_OPTIONS } from '../mock/orgDictionaries'
import {
  ARCHIVE_STATUS_META, ARCHIVE_STATUS_OPTIONS, EXTERNAL_DATA_TYPES,
  type ArchiveStatus, type ExternalDataType, type InterfaceParam,
} from '../mock/archiveProducts'
import { getStdTableColumns } from '../mock/stdTableSchema'

const router = useRouter()
const store = useExternalDataStore()
const archiveId = ref(sessionStorage.getItem('archiveId') || 'ARCH-001')
const loading = ref(false)
const saving = ref(false)
/** 列表直接读 Store 的产品主数据（唯一事实源 mock/archiveProducts），不再在本页二次加工造值 */
const productsView = computed(() => store.products as any[])
/** 合作机构候选 = 闭集四档（百行 / 朴道 / 钱塘 / 其他）；供应商候选池见 mock/orgDictionaries.ts */
const cooperationOrgOptions = computed(() => COOPERATION_ORG_OPTIONS.map((n) => ({ label: n, value: n })))
/** 新建表单的供应商候选：走字典全集，不按存量数据反推（否则刚下线的厂商就选不到了） */
const supplierDictOptions = SUPPLIER_OPTIONS
/** 列表筛选用供应商：只取存量里真出现过的值，避免选了空结果 */
const supplierOptions = computed(() => Array.from(new Set(productsView.value.map((p: any) => p.supplier).filter(Boolean))))
/** 六状态选项：快速过滤条、状态下拉、详情页徽标共用同一份枚举 */
const statusOptions = ARCHIVE_STATUS_OPTIONS.filter(o => o.value !== 'all').map(o => ({ value: o.value as string, label: o.label }))
const filters = reactive<{ suppliers: string[]; status?: string; statusQuick?: string; usageScene?: string; keyword?: string }>({ suppliers: [], statusQuick: '' })
/** R07：默认每页 20 条 */
const pagination = reactive({ total: 0, pageSize: 20, current: 1, showTotal: true })

/**
 * 过滤逻辑
 * 改造前在 computed 内部改写 filters.status（副作用），且 pagination.total 取未过滤总数，
 * 造成「点快速状态会把下拉一起改掉、分页条数与列表不一致」。
 * 现 computed 只做纯读取，快速状态与下拉状态作为两个独立条件参与过滤。
 */
const displayedList = computed(() => productsView.value.filter((p: any) => {
  if (filters.statusQuick && p.status !== filters.statusQuick) return false
  if (filters.status && p.status !== filters.status) return false
  if (filters.suppliers.length && !filters.suppliers.includes(p.supplier)) return false
  if (filters.usageScene && !String(p.usageScene || '').includes(filters.usageScene)) return false
  if (filters.keyword) {
    const k = filters.keyword.toLowerCase()
    const hit = [p.name, p.code, p.interfaceNo].some((v) => String(v || '').toLowerCase().includes(k))
    if (!hit) return false
  }
  return true
}))
/** 分页总数与过滤后的列表保持同一口径（R03/R07） */
watch(displayedList, (list) => { pagination.total = list.length }, { immediate: true })
const applyFilter = () => { pagination.current = 1 }
/** 重置需同时清掉快速状态，否则“已重置”但列表仍被过滤 */
const resetFilter = () => { filters.suppliers = []; filters.status = undefined; filters.statusQuick = ''; filters.usageScene = undefined; filters.keyword = undefined; pagination.current = 1 }
const onPageChange = (page: number) => { pagination.current = page }
const refreshProducts = async () => { loading.value = true; try { await store.fetchProducts() } catch { Message.error('刷新失败') } finally { loading.value = false } }

/**
 * R25 导出列表：导出当前过滤结果（而非全量），避开“导出的东西和看到的不一样”
 */
const exportList = () => {
  const rows = displayedList.value
  if (!rows.length) { Message.warning('当前没有可导出的档案'); return }
  const header = ['产品名称', '档案编号', '接口编号', '合作机构', '供应商', '状态', '接入时间', '使用场景', '评估得分']
  const cell = (v: unknown) => { const s = v === undefined || v === null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const csv = [header.join(','), ...rows.map((p: any) => [p.name, p.code, p.interfaceNo || '待补充', p.cooperationOrg, p.supplier, statusLabel(p.status), formatDate(p.createdAt), p.usageScene, p.evaluationScore ?? ''].map(cell).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `外数档案_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  Message.success(`已导出 ${rows.length} 条档案`)
}
onMounted(async () => { await store.fetchProducts(); sessionStorage.setItem('archiveId', archiveId.value); const q = router.currentRoute.value.query as any; const status = q?.status; const supplier = q?.supplier; if (status) { filters.status = String(status); filters.statusQuick = String(status) } if (supplier) { filters.suppliers = [String(supplier)] } if (status || supplier) applyFilter() })
const editVisible = ref(false)
const currentStep = ref(1)

const nextStep = () => {
  if (currentStep.value === 1) {
    if (!editForm.name || !editForm.usageScene) {
      Message.warning('请填写必填的基础信息')
      return
    }
    // R21：产品名称、合作机构、供应商、外数类型四项建案必填，缺任何一项不得进步骤2
    if (!editForm.cooperationOrg) {
      Message.warning('请选择合作机构（需求文档 R21 建案必填）')
      return
    }
    if (!editForm.supplier) {
      Message.warning('请选择供应商（需求文档 R21 建案必填）')
      return
    }
    // R22：外数类型决后方能判定是否需走落库环节，步骤1 就拦住
    if (!editForm.externalDataType) {
      Message.warning('请选择外数类型')
      return
    }
  } else if (currentStep.value === 2) {
    if (!editForm.apiUrl) {
      Message.warning('请填写接口地址')
      return
    }
  }
  currentStep.value++
}

const editForm = reactive({ 
  name: '', cooperationOrg: '', supplier: '', status: 'importing' as ArchiveStatus, apiUrl: '', requestMethod: 'POST', interfaceNo: '', externalDataType: '' as ExternalDataType | '',
  inputParams: [{ name: '', type: 'string', required: true, isElement: false }] as InterfaceParam[],
  outputParams: [{ name: '', type: 'string', description: '' }] as InterfaceParam[],
  targetTable: '',
  businessGoal: '', expectedBenefit: '', usageScene: '', billingMode: 'per_call', unitPrice: 0, billingCycle: 'month', currency: 'CNY', effectiveDate: '', expireDate: '', tags: [] as string[], businessImpact: '', alternativeSolution: '', businessRisk: '', remark: '' 
})

const tableFieldsVisible = ref(false)
const tableFieldsTitle = ref('表字段详情')
/** 表结构取自落库标准底表列级元数据（与详情页抽屉、映射面板右列同一事实源） */
const tableFields = ref<{ name: string; type: string; comment: string }[]>([])

const viewTableFields = (tableName?: string) => {
  if (!tableName) { Message.warning('请先填写落库表名'); return }
  tableFields.value = getStdTableColumns().map((c) => ({ name: c.column, type: c.type, comment: c.comment }))
  tableFieldsTitle.value = `表字段详情 · ${tableName}`
  tableFieldsVisible.value = true
}

const viewDataLineage = (tableName?: string) => {
  if (!tableName) { Message.warning('请先填写落库表名'); return }
  router.push({ path: '/discovery/lineage', query: { tableName } })
}

const openCreate = () => { 
  currentStep.value = 1;
  editForm.name = ''; editForm.cooperationOrg = ''; editForm.supplier = ''; editForm.status = 'importing'; editForm.apiUrl = ''; editForm.requestMethod = 'POST'; editForm.interfaceNo = '';
  editForm.inputParams = [{ name: '', type: 'string', required: true, isElement: false }];
  editForm.outputParams = [{ name: '', type: 'string', description: '' }];
  editForm.targetTable = '';
  editForm.businessGoal = ''; editForm.expectedBenefit = ''; editForm.usageScene = ''; editForm.billingMode = 'per_call'; editForm.unitPrice = 0; editForm.billingCycle = 'month'; editForm.currency = 'CNY'; editForm.effectiveDate = ''; editForm.expireDate = ''; editForm.tags = []; editForm.businessImpact = ''; editForm.alternativeSolution = ''; editForm.businessRisk = ''; editForm.remark = ''; editVisible.value = true 
}

// 添加/删除入参
const addInputParam = () => {
  editForm.inputParams.push({ name: '', type: 'string', required: true, isElement: false })
}
const removeInputParam = (index: number) => {
  editForm.inputParams.splice(index, 1)
}

// 添加/删除出参
const addOutputParam = () => {
  editForm.outputParams.push({ name: '', type: 'string', description: '' })
}
const removeOutputParam = (index: number) => {
  editForm.outputParams.splice(index, 1)
}

const goDetailPage = (record: any) => { router.push({ path: `/variable-hub/external-data/archive/${String(record.id)}`, query: { from: 'archive', archiveId: archiveId.value } }) }
const saveEdit = async () => {
  if (!editForm.usageScene) { Message.error('请填写使用场景'); return }
  saving.value = true
  try {
    const pick = (arr: InterfaceParam[]) => arr
      .map((x) => ({ name: String(x.name || '').trim(), type: x.type, required: x.required, description: x.description, isElement: x.isElement }))
      .filter((x) => x.name)
    // 业务主键：优先用接口编号，否则按时间戳生成，保证与 productCode 同一命名空间
    const id = (editForm.interfaceNo || '').trim() || `CUSTOM-${Date.now()}`
    await store.saveProduct({
      id,
      productCode: id,
      name: editForm.name,
      cooperationOrg: editForm.cooperationOrg,
      supplier: editForm.supplier,
      status: 'importing' as ArchiveStatus,
      interfaceNo: editForm.interfaceNo,
      usageScene: editForm.usageScene,
      billingMode: editForm.billingMode,
      unitPrice: editForm.unitPrice,
      billingCycle: editForm.billingCycle,
      currency: editForm.currency,
      effectiveDate: editForm.effectiveDate,
      expireDate: editForm.expireDate,
      tags: Array.isArray(editForm.tags) && editForm.tags.length ? [...editForm.tags] : ['外数', '风控'],
      externalDataType: editForm.externalDataType || undefined,
      targetTable: editForm.targetTable.trim(),
      inputParams: pick(editForm.inputParams),
      outputParams: pick(editForm.outputParams),
    }, '列表页新建档案')
    Message.success('档案新建成功')
    editVisible.value = false
  } catch (e: any) {
    Message.error(e?.message || '档案新建失败')
  } finally {
    saving.value = false
  }
}
const formatDate = (d?: string | Date) => { try { return DateUtils.formatDateTime(d || '') } catch { return '—' } }
const formatCurrency = (n?: number) => { try { if (n === undefined || n === null) return '—'; return Number(n).toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' }) } catch { return '—' } }
const billingModeLabel = (m?: string) => m === 'per_call' ? '按次' : m === 'monthly' ? '按月' : m === 'tier' ? '阶梯' : '—'
/** 展示名与标签色统一取自 ARCHIVE_STATUS_META，避免列表/详情各写一份漏分支 */
const statusMeta = (s?: string) => ARCHIVE_STATUS_META[s as ArchiveStatus]
const statusLabel = (s?: string) => statusMeta(s)?.label || s || '—'
const statusColor = (s?: string) => statusMeta(s)?.color || 'gray'


</script>

<style scoped>
.page-header { margin-bottom: 16px; }
.header-content { display: flex; align-items: center; justify-content: space-between; }
.header-info h2 { margin: 0 0 8px; }
.page-description { color: var(--color-text-2); }
.toolbar { margin-top: 12px; }
</style>
