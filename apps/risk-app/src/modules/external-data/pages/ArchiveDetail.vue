<template>
  <div class="archive-detail">
    <div class="page-header">
      <a-breadcrumb class="breadcrumb">
        <a-breadcrumb-item>外数档案</a-breadcrumb-item>
        <a-breadcrumb-item>产品详情</a-breadcrumb-item>
      </a-breadcrumb>
      <div class="header-content">
        <div class="title-section">
          <div class="title-wrapper">
            <h1 class="title">{{ header.name }}</h1>
            <a-tag :color="statusColor(header.status)" class="status-tag" size="medium">{{ statusLabel(header.status) }}</a-tag>
          </div>
          <a-descriptions :column="{ xs: 1, sm: 2, md: 3, lg: 4 }" class="header-info" :label-style="{ 'color': 'var(--color-text-3)' }" :value-style="{ 'font-weight': 500 }">
            <a-descriptions-item label="产品编码">{{ header.code || '—' }}</a-descriptions-item>
            <a-descriptions-item label="合作机构">{{ header.cooperationOrg || '—' }}</a-descriptions-item>
            <a-descriptions-item label="供应商"><a-tag size="small" bordered>{{ header.supplier || '—' }}</a-tag></a-descriptions-item>
            <a-descriptions-item label="外数类型"><a-tag color="arcoblue" size="small">{{ header.externalDataType || '—' }}</a-tag></a-descriptions-item>
            <a-descriptions-item label="产品分类">{{ header.productCategory || '—' }}</a-descriptions-item>
            <!-- R30：档案负责人（业务）与数据管理人（技术）是两个独立角位，不得用一个字符串顶替 -->
            <a-descriptions-item label="档案负责人">{{ header.archiveOwner || '待补充' }}</a-descriptions-item>
            <a-descriptions-item label="数据管理人">{{ header.dataManager || '待补充' }}</a-descriptions-item>
            <!-- R31：接口编号为档案核心字段，全类型都展示；为空按 R10 显示「待补充」 -->
            <a-descriptions-item label="接口编号">{{ header.interfaceNo || '待补充' }}</a-descriptions-item>
            <!-- R37/R131：接口状态与档案业务状态是两个独立字段，这里只读接口状态 -->
            <a-descriptions-item label="接口状态">
              <a-tag size="small" :color="header.interfaceStatus === 'online' ? 'green' : header.interfaceStatus === 'offline' ? 'gray' : 'orangered'">{{ interfaceStatusLabel }}</a-tag>
            </a-descriptions-item>

            <!-- 批量/回溯型才有落库环节（口径与 isPersistedType 一致） -->
            <template v-if="hasPersist">
              <a-descriptions-item label="样本表名">{{ header.sampleTableName || '—' }}</a-descriptions-item>
              <a-descriptions-item label="落库目标表">{{ header.targetTable || '待补充' }}</a-descriptions-item>
            </template>
            <template v-else>
              <a-descriptions-item label="接口名">{{ header.interfaceName || '—' }}</a-descriptions-item>
            </template>

            <a-descriptions-item label="描述" :span="2"><span class="description-text">{{ header.description || '—' }}</span></a-descriptions-item>
          </a-descriptions>
        </div>
        <div class="actions">
          <a-button @click="goBackList"><template #icon><IconArrowLeft /></template>返回档案</a-button>
          <!-- 档案发布后要把数据用起来，下一站是台账与任务：补两个跳去风险要素侧的出口 -->
          <a-button @click="goLedgerRegister">登记为特征</a-button>
          <a-button @click="goTaskCenter">发起周期评估</a-button>
          <a-button type="primary" @click="openEdit"><template #icon><IconEdit /></template>编辑档案</a-button>
        </div>
      </div>
    </div>
    <div class="detail-content">
      <a-tabs v-model:active-key="activeTab" class="detail-tabs">
        <!-- 1. 产品基础信息 -->
        <a-tab-pane key="basic" title="产品基础信息">
          <a-card class="detail-card" title="基本属性" :bordered="false"><a-descriptions :column="2" :data="productBasic" /></a-card>
          
          <!-- 在线实时调用无落库环节，仅展示接口基本信息 -->
          <template v-if="isRealtime">
            <a-card class="detail-card" title="接口基本信息" :bordered="false" style="margin-top: 16px;"><a-descriptions :column="2" :data="onlineApiInfo" /></a-card>
          </template>
          
          <!-- 批量/回溯型展示离线调用信息 -->
          <template v-if="hasPersist">
            <a-card class="detail-card" title="离线调用信息" :bordered="false" style="margin-top: 16px;"><a-descriptions :column="2" :data="offlineCallInfo" /></a-card>
          </template>

          <a-card class="detail-card" title="附加信息" :bordered="false" style="margin-top: 16px;"><a-descriptions :column="2" :data="productExtra" /></a-card>
        </a-tab-pane>

        <!-- 2. 管理信息 -->
        <a-tab-pane key="management" title="管理信息">
          <a-card class="detail-card" title="生命周期阶段" :bordered="false">
            <a-descriptions :column="2" :data="lifecycleHeader" />
            <a-divider style="margin: 12px 0" />
            <a-table :data="lifecycleStages" :pagination="false">
              <template #columns>
                <a-table-column title="阶段" data-index="stage" :width="160" />
                <a-table-column title="状态" :width="120">
                  <template #cell="{ record }"><a-tag :color="progressColor(record.status)">{{ progressLabel(record.status) }}</a-tag></template>
                </a-table-column>
                <a-table-column title="开始时间" data-index="startDate" :width="160" />
                <a-table-column title="结束时间" data-index="endDate" :width="160" />
                <a-table-column title="描述" data-index="description" />
              </template>
              <template #empty><a-empty description="暂无阶段数据" /></template>
            </a-table>
          </a-card>

          <a-card class="detail-card" title="效果监控" :bordered="false" style="margin-top: 16px;">
            <a-descriptions :column="2" :data="effectSummary" />
            <a-divider style="margin: 12px 0" />
            <a-table :data="monitorRows" :pagination="false">
              <template #columns>
                <a-table-column title="月份" data-index="month" :width="120" />
                <a-table-column title="预算剩余(%)" data-index="budgetPct" :width="140" />
                <a-table-column title="实际剩余(%)" data-index="actualPct" :width="140" />
              </template>
              <template #empty><a-empty description="暂无监控数据" /></template>
            </a-table>
          </a-card>

          <a-card class="detail-card" title="商务合同" :bordered="false" style="margin-top: 16px;">
            <div style="margin-bottom: 16px; font-weight: 600; font-size: 14px;">合同概览</div>
            <a-descriptions :column="2">
              <a-descriptions-item label="累计补充金额">{{ formatCurrency(contractInfo.totalSupplementAmount) }}</a-descriptions-item>
              <a-descriptions-item label="关联框架协议数">{{ contractInfo.frameworkAgreements.length }}</a-descriptions-item>
            </a-descriptions>
            <a-divider style="margin: 16px 0" />
            <div style="margin-bottom: 16px; font-weight: 600; font-size: 14px;">框架协议列表</div>
            <a-table :data="contractInfo.frameworkAgreements" :pagination="false">
              <template #columns>
                <a-table-column title="协议编号" data-index="id" />
                <a-table-column title="协议名称" data-index="name" />
                <a-table-column title="签署日期" data-index="signDate" />
                <a-table-column title="合同金额">
                  <template #cell="{ record }">{{ formatCurrency(record.amount) }}</template>
                </a-table-column>
                <a-table-column title="免费量" data-index="freeQuota" />
                <a-table-column title="免费量有效期" data-index="validPeriod" />
                <a-table-column title="已减免量" data-index="deductedAmount" />
                <a-table-column title="备注" data-index="remark" />
              </template>
              <template #empty><a-empty description="暂无关联框架协议" /></template>
            </a-table>
            <a-divider style="margin: 16px 0" />
            <div style="margin-bottom: 16px; font-weight: 600; font-size: 14px;">补充合同列表</div>
            <a-table :data="contractInfo.supplementaryAgreements" :pagination="false">
              <template #columns>
                <a-table-column title="合同编号" data-index="id" />
                <a-table-column title="合同名称" data-index="name" />
                <a-table-column title="签署日期" data-index="signDate" />
                <a-table-column title="免费量" data-index="freeQuota" />
                <a-table-column title="免费量有效期" data-index="validPeriod" />
                <a-table-column title="已减免量" data-index="deductedAmount" />
                <a-table-column title="备注" data-index="remark" />
              </template>
              <template #empty><a-empty description="暂无关联补充合同" /></template>
            </a-table>
            <a-divider style="margin: 16px 0" />
            <div style="margin-bottom: 16px; font-weight: 600; font-size: 14px;">核销列表</div>
            <a-table :data="contractInfo.writeoffs" :pagination="false">
              <template #columns>
                <a-table-column title="账单月" data-index="month" />
                <a-table-column title="核销金额">
                  <template #cell="{ record }">{{ formatCurrency(record.amount) }}</template>
                </a-table-column>
                <a-table-column title="核销减免量" data-index="discountAmount" />
                <a-table-column title="关联合同" data-index="contractName" />
                <a-table-column title="备注信息" data-index="remark" />
              </template>
              <template #empty><a-empty description="暂无核销记录" /></template>
            </a-table>
          </a-card>
        </a-tab-pane>

        <!-- 3. 产品入参 -->
        <a-tab-pane key="inputs" title="产品入参">
          <a-card class="detail-card" :bordered="false">
            <a-table :columns="inputColumns" :data="inputParams" :pagination="false" />
          </a-card>
        </a-tab-pane>

        <!-- 4. 产品出参 -->
        <a-tab-pane key="outputs" title="产品出参">
          <a-card class="detail-card" :bordered="false">
            <a-table :columns="outputColumns" :data="outputParams" :pagination="false" />
          </a-card>
        </a-tab-pane>

        <!-- 5. 落库字段映射 -->
        <a-tab-pane key="fieldMapping" title="落库字段映射">
          <InterfaceFieldMappingPanel
            :product-code="dataId"
            :product-name="header.name || ''"
            :supplier="header.supplier || ''"
            :target-table="header.targetTable || ''"
          />
        </a-tab-pane>

        <!-- 6. 离线落库信息 -->
        <a-tab-pane key="storage" title="离线落库信息">
          <template v-if="storageTables.length">
            <a-alert style="margin-bottom: 16px;">
              此外部数据由于接口出参的复杂性或业务要求，返回数据被分别落入以下 {{ storageTables.length }} 张物理表中。
            </a-alert>
            <a-row :gutter="16">
              <a-col :span="12" v-for="(table, index) in storageTables" :key="index">
                <a-card class="detail-card" :title="table.name" :bordered="true" style="margin-bottom: 16px; background-color: var(--color-fill-1);">
                  <template #extra>
                    <a-space>
                      <a-button type="text" size="small" @click="viewTableFields(table.name)">查看表结构</a-button>
                      <a-button type="text" size="small" @click="viewDataLineage(table.name)">分析血缘</a-button>
                    </a-space>
                  </template>
                  <a-descriptions :column="1" :label-style="{ 'color': 'var(--color-text-3)' }">
                    <a-descriptions-item label="表描述">{{ table.description || '—' }}</a-descriptions-item>
                    <a-descriptions-item label="存储出参范围">{{ table.fieldsRange || '—' }}</a-descriptions-item>
                    <a-descriptions-item label="更新策略">{{ table.updateStrategy || '—' }}</a-descriptions-item>
                  </a-descriptions>
                </a-card>
              </a-col>
            </a-row>
          </template>
          <!-- 未配置落库表时给空态，不再凭空造出 main / detail 两张表（R75） -->
          <a-card v-else class="detail-card">
            <a-empty :description="hasPersist ? '尚未配置落库目标表，请在「编辑档案 - 数据存储与血缘」中补充' : '该产品为在线实时调用，无落库环节'" />
          </a-card>
        </a-tab-pane>

        <!-- 7. 调用样本准备相关信息 -->
        <a-tab-pane key="sample" title="调用样本准备信息">
          <template v-if="sampleTemplates.length > 0">
            <a-card class="detail-card" v-for="template in sampleTemplates" :key="template.id" style="margin-bottom: 16px;">
              <div style="margin-bottom: 16px; font-weight: 600; font-size: 16px; display: flex; justify-content: space-between;">
                <span>{{ template.name }} <a-tag color="blue" style="margin-left: 8px;">{{ template.serviceType }}</a-tag></span>
                <span style="font-size: 12px; font-weight: 400; color: var(--color-text-3);">更新时间: {{ template.updateTime }}</span>
              </div>
              <a-tabs default-active-key="field" type="rounded" size="small">
                <a-tab-pane key="field" title="字段命名校验">
                  <a-table :data="template.fieldRules" :pagination="false" size="small" :bordered="false">
                    <template #columns>
                      <a-table-column title="字段名" data-index="name" />
                      <a-table-column title="类型" data-index="type" />
                      <a-table-column title="是否必填">
                        <template #cell="{ record }">
                          <a-tag :color="record.required ? 'red' : 'gray'" size="small">{{ record.required ? '是' : '否' }}</a-tag>
                        </template>
                      </a-table-column>
                    </template>
                  </a-table>
                </a-tab-pane>
                <a-tab-pane key="data" title="数据结果校验">
                  <a-table :data="template.dataRules" :pagination="false" size="small" :bordered="false">
                    <template #columns>
                      <a-table-column title="目标字段" data-index="targetField" />
                      <a-table-column title="规则类型" data-index="ruleType">
                        <template #cell="{ record }">
                          {{ getRuleTypeName(record.ruleType) }}
                        </template>
                      </a-table-column>
                      <a-table-column title="规则参数" data-index="ruleValue">
                        <template #cell="{ record }">
                          {{ record.ruleValue || '—' }}
                        </template>
                      </a-table-column>
                    </template>
                  </a-table>
                </a-tab-pane>
              </a-tabs>
            </a-card>
          </template>
          <a-card class="detail-card" v-else>
            <a-empty description="暂无关联的服务校验模板" />
          </a-card>
        </a-tab-pane>

        <!-- 8. 效果评估 -->
        <a-tab-pane key="evaluation" title="效果评估">
          <div class="eval-filter-bar" style="margin-bottom: 16px;">
            <a-space wrap>
              <a-select v-model="evalSelectedSuppliers" multiple style="min-width: 260px" placeholder="选择供应商（可多选）" allow-clear>
                <a-option v-for="sp in evalSuppliers" :key="sp" :value="sp">{{ sp }}</a-option>
              </a-select>
              <a-checkbox v-model="evalAllSuppliers">全选</a-checkbox>
              <a-select v-model="evalMonthStart" style="width: 150px" placeholder="起始月份">
                <a-option v-for="m in evalMonths" :key="m" :value="m">{{ m }}</a-option>
              </a-select>
              <span style="color: var(--color-text-3);">~</span>
              <a-select v-model="evalMonthEnd" style="width: 150px" placeholder="结束月份">
                <a-option v-for="m in evalMonths" :key="m" :value="m">{{ m }}</a-option>
              </a-select>
            </a-space>
            <a-alert type="info" style="margin-top: 8px;">
              支持单月多供应商对比 或 单供应商多月趋势，不可同时多选供应商和多选月份。
            </a-alert>
          </div>

          <a-card class="detail-card" title="外数调用样本情况分析" :bordered="false">
            <a-table :columns="evalSampleColumns" :data="evalSampleTableData" :pagination="false" :scroll="{ x: 'max-content' }">
              <template #empty><a-empty description="暂无样本数据" /></template>
            </a-table>
          </a-card>

          <a-card class="detail-card" title="外数效果分析" :bordered="false" style="margin-top: 16px;">
            <a-table :columns="evalEffectColumns" :data="evalEffectTableData" :pagination="false" :scroll="{ x: 'max-content' }">
              <template #empty><a-empty description="暂无效果数据" /></template>
            </a-table>
          </a-card>
        </a-tab-pane>
      </a-tabs>
    </div>
    <a-modal v-model:visible="editVisible" title="编辑档案" :width="800" :footer="false" :mask-closable="false">
      <a-steps :current="currentStep" style="margin-bottom: 24px" small>
        <a-step title="基础信息" />
        <a-step title="接口配置" />
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
            <a-col :span="8">
              <a-form-item field="cooperationOrg" label="合作机构" required>
                <a-select v-model="editForm.cooperationOrg" allow-clear allow-search placeholder="选择合作机构" :options="cooperationOrgOptions" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <!-- 原「渠道」轴已并入供应商（2026-11-03）；候选取字典全集且 allow-create 兼容新厂商 -->
              <a-form-item field="supplier" label="供应商" required>
                <a-select v-model="editForm.supplier" allow-clear allow-create allow-search placeholder="选择或输入供应商名称" :options="supplierOptions" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <!-- R129：档案状态由业务事件写入，普通编辑不得改状态，这里只读展示当前值 -->
              <a-form-item field="status" label="当前状态">
                <a-tag :color="statusColor(editForm.status)" size="large">{{ statusLabel(editForm.status) }}</a-tag>
                <div style="margin-top: 4px; font-size: 12px; color: var(--color-text-3);">状态由业务事件驱动，不可人工修改</div>
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item field="archiveOwner" label="档案负责人">
                <a-input v-model="editForm.archiveOwner" placeholder="业务负责人姓名" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item field="dataManager" label="数据管理人">
                <a-input v-model="editForm.dataManager" placeholder="技术负责人姓名" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item field="interfaceNo" label="接口编号">
                <a-input v-model="editForm.interfaceNo" placeholder="如 IF-2026-001，先签协议后引入可暂不填" />
              </a-form-item>
            </a-col>
            <a-col :span="24">
              <a-form-item field="usageScene" label="使用场景" required>
                <a-textarea v-model="editForm.usageScene" placeholder="请详细描述该数据的使用场景" />
              </a-form-item>
            </a-col>
            <a-col :span="24">
              <a-form-item field="description" label="描述" required>
                <a-textarea v-model="editForm.description" placeholder="请详细描述该数据" />
              </a-form-item>
            </a-col>
            <a-col :span="24">
              <a-form-item field="tags" label="标签">
                <a-input-tag v-model="editForm.tags" placeholder="输入后回车添加标签" allow-clear />
              </a-form-item>
            </a-col>
          </a-row>
        </div>

        <!-- 步骤2：接口配置 -->
        <div v-show="currentStep === 2">
          <a-row :gutter="16">
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
          <a-alert v-if="!hasPersist" type="info" style="margin-bottom: 16px;">
            该产品为在线实时调用，无落库环节，落库目标表可留空。
          </a-alert>
          <a-form-item field="targetTable" label="落库目标表" :required="hasPersist">
            <a-input v-model="editForm.targetTable" :placeholder="hasPersist ? '如 dw_ods.ods_ext_retro_std' : '在线实时调用无需填写'" allow-clear />
            <template #extra>
              <div style="font-size: 12px; color: var(--color-text-3); margin-top: 4px;">
                档案只登记一张权威落库目标表，字段具体落位在「落库字段映射」页签维护
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
            <a-button v-if="currentStep === 3" type="primary" :loading="savingEdit" @click="saveEdit">保存并完成</a-button>
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
import { ref, computed, onMounted, h, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useExternalDataStore } from '@/modules/external-data/stores'
import { useContractStore } from '../../budget/stores/contract'
import { useSettlementFlowStore } from '../../budget/stores/settlementFlow'
import { IconArrowLeft, IconEdit, IconStorage } from '@arco-design/web-vue/es/icon'
import { Message } from '@arco-design/web-vue'
import DateUtils from '@/utils/dateUtils'
import InterfaceFieldMappingPanel from '../components/InterfaceFieldMappingPanel.vue'
import { getStdTableColumns } from '../mock/stdTableSchema'
import { COOPERATION_ORG_OPTIONS, SUPPLIER_OPTIONS, cooperationOrgOfProduct } from '../mock/orgDictionaries'
import { hashUnit } from '../mock/stableHash'
import {
  ARCHIVE_STATUS_META,
  INTERFACE_STATUS_LABEL,
  PRODUCT_CATEGORY_LABEL,
  isPersistedType,
  techProfileOf,
  progressStatusMeta,
  resolveInputParams,
  resolveOutputParams,
  type ArchiveProduct,
  type ArchiveStatus,
  type InterfaceStatus,
  type InterfaceParam,
} from '../mock/archiveProducts'

const route = useRoute()
const router = useRouter()
const store = useExternalDataStore()
const contractStore = useContractStore()
const settlementFlowStore = useSettlementFlowStore()

const activeTab = ref('basic')
const dataId = computed(() => String(route.params.id || ''))
/** 合作机构（闭集四档）与供应商（开放枚举）两轴候选，与档案列表共用 mock/orgDictionaries.ts 同一字典 */
const cooperationOrgOptions = COOPERATION_ORG_OPTIONS.map((n) => ({ label: n, value: n }))
/** 供应商候选：走字典全集，不按存量数据反推（否则刚下线的厂商在编辑时就选不到了） */
const supplierOptions = SUPPLIER_OPTIONS.map((n) => ({ label: n, value: n }))
const header = ref<any>({})
const editVisible = ref(false)
const savingEdit = ref(false)
const currentStep = ref(1)

const editForm = ref({
  name: '', cooperationOrg: '', supplier: '',
  /** R129：只读展示，不随普通编辑提交 */
  status: 'importing' as ArchiveStatus,
  archiveOwner: '', dataManager: '', interfaceNo: '',
  description: '', usageScene: '', tags: [] as string[],
  apiUrl: '', requestMethod: 'POST',
  inputParams: [{ name: '', type: 'string', required: true, isElement: false }] as InterfaceParam[],
  outputParams: [{ name: '', type: 'string', description: '' }] as InterfaceParam[],
  /** 与档案主数据 targetTable 同名同义，一张权威表 */
  targetTable: ''
})

const tableFieldsVisible = ref(false)
const tableFieldsTitle = ref('表字段详情')
/** 表结构取自落库标准底表列级元数据（mock/stdTableSchema.ts），改造前是写死的 5 个字段 */
const tableFields = ref<{ name: string; type: string; comment: string }[]>([])

const viewTableFields = (tableName?: string) => {
  if (!tableName) { Message.warning('落库表名为空，无法查看表结构'); return }
  tableFields.value = getStdTableColumns().map((c) => ({ name: c.column, type: c.type, comment: c.comment }))
  tableFieldsTitle.value = `表字段详情 · ${tableName}`
  tableFieldsVisible.value = true
}

const viewDataLineage = (tableName?: string) => {
  if (tableName) {
    Message.info(`正在前往主应用查看表 ${tableName} 的血缘分析...`)
    // Route to the main application's lineage page
    router.push({
      path: '/discovery/lineage',
      query: { tableName: tableName }
    })
  } else {
    Message.warning('落库表名为空，无法查看血缘')
  }
}

const nextStep = () => {
  if (currentStep.value === 1) {
    if (!editForm.value.name) {
      Message.warning('请填写外数名称')
      return
    }
  } else if (currentStep.value === 2) {
    if (!editForm.value.apiUrl) {
      Message.warning('请填写接口地址')
      return
    }
  }
  currentStep.value++
}

const openEdit = () => {
  const base = store.productById(dataId.value)
  if (!base) { Message.error('档案主数据未就绪，请返回列表重新进入'); return }
  const tech = techProfileOf(base)
  currentStep.value = 1
  editForm.value.name = base.name || ''
  editForm.value.cooperationOrg = base.cooperationOrg || ''
  editForm.value.supplier = base.supplier || ''
  // R129：状态只读回填，不作为可改字段
  editForm.value.status = base.status
  editForm.value.archiveOwner = base.archiveOwner || ''
  editForm.value.dataManager = base.dataManager || ''
  editForm.value.interfaceNo = base.interfaceNo || ''
  editForm.value.usageScene = base.usageScene || ''
  editForm.value.description = base.description || tech.description
  editForm.value.tags = [...(base.tags || [])]
  editForm.value.apiUrl = tech.apiUrl
  editForm.value.requestMethod = tech.requestMethod
  editForm.value.inputParams = resolveInputParams(base).map((x) => ({ ...x }))
  editForm.value.outputParams = resolveOutputParams(base).map((x) => ({ ...x }))
  editForm.value.targetTable = base.targetTable || ''
  editVisible.value = true
}

// 添加/删除入参
const addInputParam = () => {
  editForm.value.inputParams.push({ name: '', type: 'string', required: true, isElement: false })
}
const removeInputParam = (index: number) => {
  editForm.value.inputParams.splice(index, 1)
}

// 添加/删除出参
const addOutputParam = () => {
  editForm.value.outputParams.push({ name: '', type: 'string', description: '' })
}
const removeOutputParam = (index: number) => {
  editForm.value.outputParams.splice(index, 1)
}

const contractInfo = ref<{
  totalSupplementAmount: number;
  frameworkAgreements: Array<{ id: string; name: string; signDate: string; amount: number; freeQuota: number; validPeriod: string; remark: string; deductedAmount: number }>;
  supplementaryAgreements: Array<{ id: string; name: string; signDate: string; freeQuota: number; validPeriod: string; remark: string; deductedAmount: number }>;
  writeoffs: Array<{ month: string; amount: number; discountAmount: number; remark: string; contractName: string }>;
}>({
  totalSupplementAmount: 0,
  frameworkAgreements: [],
  supplementaryAgreements: [],
  writeoffs: []
})
const effectSummary = computed(() => [
  { label: '覆盖率', value: `${coverage.value}%` },
  { label: '命中率', value: `${hitRate.value}%` },
  { label: '提升度', value: `${lift.value}%` },
  { label: '平均延迟(ms)', value: avgLatency.value }
])
const lifecycleHeader = computed(() => [
  { label: '当前阶段', value: store.lifecycle?.currentStage || '—' },
  { label: '当前状态', value: store.lifecycle?.currentStatus || '—' }
])
const lifecycleStages = computed(() => store.lifecycleStages || [])
const monitorRows = computed(() => {
  const arr = Array.isArray(store.burndown) ? store.burndown : []
  return arr.slice(-6).map((p: any) => ({
    month: p.month || p.period || '—',
    budgetPct: p.initialBudget ? Number(((p.budget / p.initialBudget) * 100).toFixed(2)) : 0,
    actualPct: p.initialBudget ? Number(((p.actual / p.initialBudget) * 100).toFixed(2)) : 0
  }))
})
const coverage = ref(85)
const hitRate = ref(62)
const lift = ref(18)
const avgLatency = ref(120)

const goBackList = () => { router.push({ path: '/variable-hub/external-data/archive' }) }

/** 拿着落库目标表去特征台账登记新特征 */
const goLedgerRegister = () => {
  router.push({ path: '/variable-management', query: { action: 'register_from_external', table: header.value?.targetTable || '' } })
}

/** 档案上线后的下一环：到任务管理为该外数建常态性评估 */
const goTaskCenter = () => { router.push('/tasks/evaluation/create') }
/** 展示名/颜色统一取自 ARCHIVE_STATUS_META，改造前本页漏了 pending_tech_profile 分支导致徒标显示「—」 */
const statusMeta = (s?: string) => ARCHIVE_STATUS_META[s as ArchiveStatus]
const statusLabel = (s?: string) => statusMeta(s)?.label || s || '—'
const statusColor = (s?: string) => statusMeta(s)?.color || 'gray'
/** 生命周期阶段等通用小状态的展示名与色，与 Lifecycle 待办列表同一字典 */
const progressLabel = (s?: string) => progressStatusMeta(s)?.label || s || '—'
const progressColor = (s?: string) => progressStatusMeta(s)?.color || 'gray'
const interfaceStatusLabel = computed(() => INTERFACE_STATUS_LABEL[header.value.interfaceStatus as InterfaceStatus] || '—')
/** 在线实时调用：无落库环节 */
const isRealtime = computed(() => header.value.externalDataType === '在线实时调用')
/** 批量/回溯型：有落库环节 */
const hasPersist = computed(() => isPersistedType(header.value.externalDataType))
const formatDate = (d?: string | Date) => { try { return DateUtils.formatDateTime(d || '') } catch { return '—' } }
// 稳定散列统一取 mock/stableHash（全模块唯一一份），不再在本页私写一份
/** 最近 n 个自然月（含当月），YYYY-MM */
function recentMonths(n: number): string[] {
  const out: string[] = []
  const d = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1)
    out.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}
/**
 * 效果评估快照
 * 分组轴＝供应商（原为「渠道」，该轴已于 2026-11-03 并入供应商），候选只取**同一合作机构下**档案里实际
 * 登记过的供应商，避免把别家机构的厂商混进来。
 * 指标本身 owner 是效果评估任务（variable-hub），mock 阶段按（产品,供应商,月份）稳定散列派生，
 * 替代改造前的 Math.random()，刷新不会换数。
 */
function buildEvaluationSnapshot(base: ArchiveProduct) {
  const ownSupplier = base.supplier || ''
  const pool = Array.from(new Set(
    (store.products as ArchiveProduct[])
      .filter((p) => p.cooperationOrg === base.cooperationOrg)
      .map((p) => p.supplier)
      .filter((x) => !!x && x !== '—'),
  ))
  if (ownSupplier && !pool.includes(ownSupplier)) {pool.unshift(ownSupplier)}
  const suppliers = ['全部供应商', ...pool]
  const months = recentMonths(6)
  const sampleData: Record<string, Record<string, any>> = {}
  const effectData: Record<string, Record<string, any>> = {}
  for (const sp of suppliers) {
    sampleData[sp] = {}
    effectData[sp] = {}
    for (const m of months) {
      const monthIdx = parseInt(m.split('-')[1], 10) || 1
      const supplierFactor = sp === '全部供应商' ? 1 : 0.25 + (monthIdx / 12)
      const seed = `${base.id}|${sp}|${m}`
      const callCount = Math.floor(8000 * supplierFactor + hashUnit(`${seed}|call`) * 3000)
      const badRate = 6 + hashUnit(`${seed}|bad`) * 14
      const nullRate = 0.5 + hashUnit(`${seed}|null`) * 6
      const badCount = Math.floor((callCount * badRate) / 100)
      const goodCount = Math.floor(callCount * 0.72)
      sampleData[sp][m] = { callCount, goodCount, badCount, grayCount: callCount - badCount - goodCount, badRate, nullRate }
      effectData[sp][m] = {
        psi: 0.02 + hashUnit(`${seed}|psi`) * 0.35,
        ks: 0.15 + hashUnit(`${seed}|ks`) * 0.45,
        lift: 1.1 + hashUnit(`${seed}|lift`) * 3.2,
      }
    }
  }
  return { suppliers, months, sampleData, effectData }
}
const formatCurrency = (n?: number) => { try { if (n == null) return '—'; return Number(n).toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' }) } catch { return '—' } }

const productBasic = computed(() => [
  { label: '接口编号', value: header.value.interfaceNo || '待补充' },
  { label: '供应商', value: header.value.supplier || '—' },
  { label: '单价', value: header.value.price ? `${header.value.price}元/次` : '—' },
  { label: '档案负责人', value: header.value.archiveOwner || '待补充' },
  { label: '数据管理人', value: header.value.dataManager || '待补充' },
  { label: '接入时间', value: formatDate(header.value.createdAt) },
  { label: '上线时间', value: header.value.onlineTime ? formatDate(header.value.onlineTime) : '尚未上线' },
  { label: '接口状态', value: interfaceStatusLabel.value },
  { label: '接口标签', value: header.value.interfaceTag || '—' },
  { label: '更新频率', value: header.value.updateFrequency || '—' },
  { label: '数据来源', value: header.value.dataSource || '—' }
])
const productExtra = computed(() => [{ label: '描述信息', value: header.value.description || '—' },{ label: '标签', value: (header.value.tags || []).join('、') || '—' }])

// 在线实时调用：接口基本信息
const onlineApiInfo = computed(() => [
  { label: '测试环境', value: header.value.testEnvUrl || '—' },
  { label: '生产环境', value: header.value.prodEnvUrl || '—' },
  { label: '缓存时间', value: header.value.cacheTime ? `${header.value.cacheTime}分钟` : '—' },
  { label: '上线时间', value: header.value.onlineTime ? formatDate(header.value.onlineTime) : '尚未上线' },
  { label: '请求方式', value: header.value.requestMethod || '—' },
  { label: 'Headers', value: header.value.headers || '—' },
  { label: '说明', value: header.value.apiDescription || '—' }
])

// 批量/回溯型：离线调用信息
const offlineCallInfo = computed(() => [
  { label: '样本表名', value: header.value.sampleTableName || '—' },
  { label: '落库目标表', value: header.value.targetTable || '待补充' },
  { label: '关联周期任务', value: header.value.offlineTaskName || '—' }
])

const inputParams = ref<any[]>([])
const outputParams = ref<any[]>([])

const inputColumns = [{ title: '参数名称', dataIndex: 'name' },{ title: '参数类型', dataIndex: 'type' },{ title: '是否必填', dataIndex: 'required', render: ({ record }: any) => record.required ? '是' : '否' },{ title: '参数说明', dataIndex: 'description' }]
const outputColumns = [{ title: '参数名称', dataIndex: 'name' },{ title: '参数类型', dataIndex: 'type' },{ title: '参数说明', dataIndex: 'description' }]

// 离线落库表：直接由主数据上那张权威落库目标表派生（改造前不管有没有配表都凭空造出 main/detail 两张，R75）
const storageTables = computed(() => {
  const t = header.value.targetTable
  if (!t) {return []}
  return [{
    name: t,
    description: '外数调用结果按「落库字段映射」写入该标准底表',
    fieldsRange: `${outputParams.value.length} 个接口出参字段（详见落库字段映射页签）`,
    updateStrategy: `${header.value.updateFrequency || 'T+1'} 批量写入`,
  }]
})

// 离线样本准备条件 (服务校验模板) Mock 数据
const sampleTemplates = ref<any[]>([])
const getRuleTypeName = (type: string) => {
  const map: Record<string, string> = {
    regex: '正则表达式',
    range: '数值范围',
    enum: '枚举值',
    not_null: '非空检查',
    is_encrypted: '是否加密',
    is_unique: '是否唯一'
  }
  return map[type] || type
}

// ===== 效果评估 =====
const evalSelectedSuppliers = ref<string[]>([])
const evalMonthStart = ref('')
const evalMonthEnd = ref('')
const evaluationData = ref<any>({})

const evalSuppliers = computed(() => evaluationData.value.suppliers || [])
const evalMonths = computed(() => evaluationData.value.months || [])

// 选中区间内的月份
const evalSelectedMonths = computed(() => {
  const months = evalMonths.value
  if (!evalMonthStart.value || !evalMonthEnd.value) return months.slice(-1)
  const si = months.indexOf(evalMonthStart.value)
  const ei = months.indexOf(evalMonthEnd.value)
  if (si === -1 || ei === -1) return months.slice(-1)
  return months.slice(Math.min(si, ei), Math.max(si, ei) + 1)
})

// 当前生效的供应商（默认取第一个）
const activeSuppliers = computed(() =>
  evalSelectedSuppliers.value.length > 0
    ? evalSelectedSuppliers.value
    : (evalSuppliers.value.length > 0 ? [evalSuppliers.value[0]] : [])
)

// 全选供应商
const evalAllSuppliers = computed({
  get: () => evalSuppliers.value.length > 0 && evalSelectedSuppliers.value.length === evalSuppliers.value.length,
  set: (val: boolean) => { evalSelectedSuppliers.value = val ? [...evalSuppliers.value] : [] }
})

// 样本指标定义
const sampleMetricDefs = [
  { key: 'callCount', label: '调用人数', fmt: (v: number) => v.toLocaleString('zh-CN'), desc: '调用该外数的总客户数' },
  { key: 'goodCount', label: '好客户', fmt: (v: number) => v.toLocaleString('zh-CN'), desc: '好客户数量' },
  { key: 'badCount', label: '坏客户', fmt: (v: number) => v.toLocaleString('zh-CN'), desc: '坏客户数量' },
  { key: 'grayCount', label: '灰客户', fmt: (v: number) => v.toLocaleString('zh-CN'), desc: '灰度/不确定客户数量' },
  { key: 'badRate', label: '坏占比', fmt: (v: number) => `${v.toFixed(2)}%`, desc: '坏客户/总调用人数' },
  { key: 'nullRate', label: '空值率', fmt: (v: number) => `${v.toFixed(2)}%`, desc: '外数返回空值占比' },
]

// 效果指标定义
const effectMetricDefs = [
  { key: 'psi', label: 'PSI', fmt: (v: number) => v.toFixed(4), desc: '群体稳定性指标，<0.1稳定，0.1-0.25轻微偏移，>0.25不稳定' },
  { key: 'ks', label: 'KS', fmt: (v: number) => v.toFixed(4), desc: '区分好坏客户能力，>0.3良好，>0.5很强' },
  { key: 'lift', label: 'LIFT', fmt: (v: number) => v.toFixed(2), desc: '相比随机选择，坏客户识别效率的提升倍数' },
]

// 样本值颜色
function sampleColor(key: string, v: number): string {
  if (key === 'badRate' && v > 15) return 'rgb(var(--red-6))'
  if (key === 'nullRate' && v > 5) return 'rgb(var(--orange-6))'
  return 'var(--color-text-1)'
}

// 效果值颜色
function effectColor(key: string, v: number): string {
  if (key === 'psi') { if (v > 0.25) return 'rgb(var(--red-6))'; if (v > 0.1) return 'rgb(var(--orange-6))'; return 'rgb(var(--green-6))' }
  if (key === 'ks') { if (v < 0.3) return 'rgb(var(--orange-6))'; if (v < 0.5) return 'rgb(var(--arcoblue-6))'; return 'rgb(var(--green-6))' }
  if (key === 'lift') { if (v < 1.5) return 'rgb(var(--orange-6))'; if (v < 3) return 'rgb(var(--arcoblue-6))'; return 'rgb(var(--green-6))' }
  return 'var(--color-text-1)'
}

// 构建 render 函数
function makeSampleRender(sp: string, m: string) {
  return ({ record }: any) => {
    const raw = record[`${sp}__${m}`]
    if (raw == null) return '—'
    const def = sampleMetricDefs.find(d => d.key === record.metricKey)
    return h('span', { style: { color: sampleColor(record.metricKey, raw), fontWeight: 600 } }, def ? def.fmt(raw) : String(raw))
  }
}
function makeEffectRender(sp: string, m: string) {
  return ({ record }: any) => {
    const raw = record[`${sp}__${m}`]
    if (raw == null) return '—'
    const def = effectMetricDefs.find(d => d.key === record.metricKey)
    return h('span', { style: { color: effectColor(record.metricKey, raw), fontWeight: 600 } }, def ? def.fmt(raw) : String(raw))
  }
}

// 样本表格列（动态，供应商多月时分组表头）
const evalSampleColumns = computed(() => {
  const suppliers = activeSuppliers.value
  const months = evalSelectedMonths.value
  const cols: any[] = [{ title: '指标', dataIndex: 'metric', width: 100, fixed: 'left', render: ({ record }: any) => h('span', { title: record.metricDesc || '' }, record.metric) }]
  for (const sp of suppliers) {
    if (months.length <= 1) {
      const m = months[0] || ''
      cols.push({ title: sp, dataIndex: `${sp}__${m}`, width: 130, align: 'center', render: makeSampleRender(sp, m) })
    } else {
      cols.push({ title: sp, children: months.map((m: string) => ({ title: m, dataIndex: `${sp}__${m}`, width: 100, align: 'center', render: makeSampleRender(sp, m) })) })
    }
  }
  return cols
})

// 样本表格数据
const evalSampleTableData = computed(() => {
  const data = evaluationData.value
  if (!data.sampleData) return []
  const suppliers = activeSuppliers.value
  const months = evalSelectedMonths.value
  return sampleMetricDefs.map(def => {
    const row: any = { metric: def.label, metricKey: def.key, metricDesc: def.desc }
    for (const sp of suppliers) for (const m of months) {
      const s = data.sampleData[sp]?.[m]
      row[`${sp}__${m}`] = s ? s[def.key] : null
    }
    return row
  })
})

// 效果表格列
const evalEffectColumns = computed(() => {
  const suppliers = activeSuppliers.value
  const months = evalSelectedMonths.value
  const cols: any[] = [{ title: '指标', dataIndex: 'metric', width: 100, fixed: 'left', render: ({ record }: any) => h('span', { title: record.metricDesc || '' }, record.metric) }]
  for (const sp of suppliers) {
    if (months.length <= 1) {
      const m = months[0] || ''
      cols.push({ title: sp, dataIndex: `${sp}__${m}`, width: 130, align: 'center', render: makeEffectRender(sp, m) })
    } else {
      cols.push({ title: sp, children: months.map((m: string) => ({ title: m, dataIndex: `${sp}__${m}`, width: 100, align: 'center', render: makeEffectRender(sp, m) })) })
    }
  }
  return cols
})

// 效果表格数据
const evalEffectTableData = computed(() => {
  const data = evaluationData.value
  if (!data.effectData) return []
  const suppliers = activeSuppliers.value
  const months = evalSelectedMonths.value
  return effectMetricDefs.map(def => {
    const row: any = { metric: def.label, metricKey: def.key, metricDesc: def.desc }
    for (const sp of suppliers) for (const m of months) {
      const e = data.effectData[sp]?.[m]
      row[`${sp}__${m}`] = e ? e[def.key] : null
    }
    return row
  })
})

// 互斥限制：多供应商时强制单月，多月时强制单供应商
watch(evalSelectedSuppliers, (suppliers) => {
  if (suppliers.length > 1 && evalMonthStart.value && evalMonthEnd.value && evalMonthStart.value !== evalMonthEnd.value) {
    evalMonthEnd.value = evalMonthStart.value
  }
})
watch([evalMonthStart, evalMonthEnd], () => {
  if (evalMonthStart.value && evalMonthEnd.value && evalMonthStart.value !== evalMonthEnd.value && evalSelectedSuppliers.value.length > 1) {
    evalSelectedSuppliers.value = [evalSelectedSuppliers.value[0]]
  }
})

/**
 * 头部通用字段：全部取自产品主数据（唯一事实源），缺值就置空，不再由页面猜值。
 * 拆成函数是为了把「字段映射」与「加载流程」两件事分开（loadDetail 本身还要拉多个数据源）。
 */
const buildHeaderCore = (base: ArchiveProduct, tech: ReturnType<typeof techProfileOf>) => ({
  name: base.name,
  code: base.code,
  supplier: base.supplier,
  // 两轴口径：合作机构＝持牌征信机构四档，供应商＝实际供数/接入厂商（口径见 mock/orgDictionaries.ts）
  cooperationOrg: base.cooperationOrg || cooperationOrgOfProduct(base.id),
  // 外数类型直接取主数据，不再按 id 奇偶猜（猜出来的类型与列表、落库向导对不上）
  externalDataType: base.externalDataType || '在线实时调用',
  productCategory: PRODUCT_CATEGORY_LABEL[base.productCategory || ''] || '—',
  status: base.status,
  interfaceStatus: base.interfaceStatus,
  interfaceNo: base.interfaceNo || '',
  archiveOwner: base.archiveOwner || '',
  dataManager: base.dataManager || '',
  createdAt: base.createdAt,
  onlineTime: base.onlineTime || '',
  interfaceTag: base.interfaceNo ? '主接口' : '待补充',
  description: base.description || tech.description,
  tags: Array.isArray(base.tags) ? base.tags : ['外数', '风控'],
  price: base.unitPrice || 0,
  updateFrequency: tech.updateFrequency,
  dataSource: tech.dataSource,
  requestMethod: tech.requestMethod,
  apiUrl: tech.apiUrl,
  headers: 'Authorization, Content-Type',
  timeout: tech.timeoutSec,
  qpsLimit: tech.qpsLimit,
  // 落库表名只取主数据，不再编一个 dwd.external_table 顶上去
  targetTable: base.targetTable || '',
})

/** 头部类型专属字段：在线实时与离线/回溯各自一段 */
const buildHeaderTypeExtras = (base: ArchiveProduct, tech: ReturnType<typeof techProfileOf>) => ({
  // 在线实时独有
  testEnvUrl: 'https://test-api.provider.com/v1',
  prodEnvUrl: 'https://api.provider.com/v1',
  cacheTime: tech.cacheTimeSec,
  apiDescription: tech.description,
  // 离线/回溯型独有
  sampleTableName: base.sampleTable || '',
  interfaceName: base.interfaceName || '',
  offlineTaskName: tech.offlineTaskName || '',
})

const loadDetail = async () => {
  try {
    await store.fetchProducts()
    await store.fetchBurndown({ range: 'month', productId: dataId.value })
    await store.fetchLifecycleData({ productId: dataId.value })
    const fromStore = store.productById(dataId.value) as ArchiveProduct | undefined
    if (!fromStore) {
      Message.error(`未找到编号为 ${dataId.value} 的外数档案，请返回列表重新进入`)
      header.value = { name: '档案不存在' }
      return
    }
    const base = fromStore
    const tech = techProfileOf(base)

    header.value = { ...buildHeaderCore(base, tech), ...buildHeaderTypeExtras(base, tech) }
    // 入参/出参均取产品主数据解析结果（人工维护过则以档案为准），与落库映射候选源同一事实
    inputParams.value = resolveInputParams(base)
    outputParams.value = resolveOutputParams(base)

    // Load Sample Templates
    sampleTemplates.value = [
      {
        id: '1',
        name: '在线批量标准模版',
        serviceType: '在线批量调用',
        serviceProduct: header.value.name,
        updateTime: '2023-10-25 10:00:00',
        fieldRules: [
          { name: 'request_id', type: 'STRING', required: true },
          { name: 'id_no', type: 'STRING', required: true },
          { name: 'mobile', type: 'STRING', required: true }
        ],
        dataRules: [
          { targetField: 'mobile', ruleType: 'is_encrypted', ruleValue: '' },
          { targetField: 'id_no', ruleType: 'is_encrypted', ruleValue: '' }
        ]
      },
      {
        id: '2',
        name: '离线回溯通用模版',
        serviceType: '外数离线回溯申请',
        serviceProduct: '全部',
        updateTime: '2023-10-20 15:30:00',
        fieldRules: [
          { name: 'primary_key', type: 'STRING', required: true },
          { name: 'event_time', type: 'DATETIME', required: true }
        ],
        dataRules: [
          { targetField: 'primary_key', ruleType: 'is_unique', ruleValue: '' },
          { targetField: 'event_time', ruleType: 'not_null', ruleValue: '' }
        ]
      }
    ]

    // Load Contracts
    await contractStore.fetchContractList({ supplier: header.value.supplier })
    const contracts = contractStore.list.filter(c => c.supplier === header.value.supplier)
    const frameworks = contracts.filter(c => c.contractType === 'framework')
    const supplements = contracts.filter(c => c.contractType === 'supplement')
    
    contractInfo.value.frameworkAgreements = frameworks.map(c => ({
      id: c.id,
      name: c.contractName,
      signDate: c.startDate.split('T')[0],
      amount: c.amount,
      freeQuota: c.productCount ? c.productCount * 1000 : 0, // Mock free quota logic
      validPeriod: `${c.startDate.split('T')[0]} ~ ${c.endDate.split('T')[0]}`,
      remark: '无',
      deductedAmount: c.writtenOffAmount || 0
    }))
    contractInfo.value.supplementaryAgreements = supplements.map(c => ({
      id: c.id,
      name: c.contractName,
      signDate: c.startDate.split('T')[0],
      freeQuota: c.productCount ? c.productCount * 500 : 0, // Mock free quota logic
      validPeriod: `${c.startDate.split('T')[0]} ~ ${c.endDate.split('T')[0]}`,
      remark: '无',
      deductedAmount: c.writtenOffAmount || 0
    }))
    contractInfo.value.totalSupplementAmount = supplements.reduce((sum, c) => sum + (c.amount || 0), 0)
    
    // Load Writeoffs
    const writeoffList = []
    const prefix = `${header.value.supplier}-`
    for (const [key, snapshot] of Object.entries(settlementFlowStore.writeoffByKey)) {
      if (key.startsWith(prefix)) {
        const month = key.replace(prefix, '')
        if (snapshot && snapshot.records) {
          for (const record of snapshot.records) {
            const contract = contracts.find(c => c.id === record.contractId)
            writeoffList.push({
              month,
              amount: record.amount,
              discountAmount: record.discountAmount || 0,
              remark: record.remark || '',
              contractName: contract ? contract.contractName : record.contractId
            })
          }
        }
      }
    }
    contractInfo.value.writeoffs = writeoffList.sort((a, b) => b.month.localeCompare(a.month))

    // 效果评估快照：供应商口径、月份窗口与指标派生都收在 buildEvaluationSnapshot 里
    evaluationData.value = buildEvaluationSnapshot(base)
    evalSelectedSuppliers.value = [evaluationData.value.suppliers[0]]
    evalMonthStart.value = evaluationData.value.months[0]
    evalMonthEnd.value = evaluationData.value.months[evaluationData.value.months.length - 1]
  } catch { Message.error('加载详情失败') }
}
onMounted(loadDetail)

const saveEdit = async () => {
  const id = dataId.value
  const base = store.productById(id)
  if (!base) { Message.error('档案不存在，无法保存'); return }
  const name = editForm.value.name.trim()
  if (!name) { Message.warning('请填写外数名称'); currentStep.value = 1; return }
  // R15：合作机构、供应商为档案必填；负责人/数据管理人缺失不阻断，由状态位自然标识待补
  if (!editForm.value.cooperationOrg) { Message.warning('请选择合作机构'); currentStep.value = 1; return }
  if (!editForm.value.supplier) { Message.warning('请选择或输入供应商'); currentStep.value = 1; return }
  const targetTable = editForm.value.targetTable.trim()
  if (hasPersist.value && !targetTable) { Message.warning('批量/回溯型产品必须配置落库目标表'); currentStep.value = 3; return }
  const pick = (arr: InterfaceParam[]) => arr
    .map((x) => ({ name: String(x.name || '').trim(), type: x.type, required: x.required, description: x.description, isElement: x.isElement }))
    .filter((x) => x.name)
  const inputParams = pick(editForm.value.inputParams)
  const outputParams = pick(editForm.value.outputParams)
  // 出参是落库字段映射的候选源（R53），清空它会让映射页签无从生成
  if (!outputParams.length) { Message.warning('产品出参至少保留一个字段'); currentStep.value = 2; return }
  savingEdit.value = true
  try {
    await store.saveProduct({
      id,
      name,
      cooperationOrg: editForm.value.cooperationOrg,
      supplier: editForm.value.supplier,
      archiveOwner: editForm.value.archiveOwner.trim(),
      dataManager: editForm.value.dataManager.trim(),
      interfaceNo: editForm.value.interfaceNo.trim(),
      usageScene: editForm.value.usageScene.trim(),
      description: editForm.value.description.trim(),
      tags: editForm.value.tags.map((t) => t.trim()).filter(Boolean),
      inputParams,
      outputParams,
      targetTable,
    }, '详情页编辑档案')
    // 接口/落库表/映射三项齐备度变化后由同一入口校正状态，页面不自编流转规则
    await store.syncTechProfileStatus(id, '详情页编辑档案后校正技术档案齐备度')
    editVisible.value = false
    Message.success('档案已保存')
    await loadDetail()
  } catch (e: any) {
    Message.error(e?.message || '保存失败')
  } finally {
    savingEdit.value = false
  }
}
</script>

<style scoped>
.archive-detail { padding: 24px; min-height: calc(100vh - 64px); background-color: var(--color-fill-2); }
.breadcrumb { margin-bottom: 16px; }

/* 头部样式优化 */
.page-header { background: #fff; padding: 20px 24px; border-radius: 8px; margin-bottom: 16px; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
.header-content { display: flex; justify-content: space-between; align-items: flex-start; }
.title-section { flex: 1; margin-right: 24px; }
.title-wrapper { display: flex; align-items: center; margin-bottom: 16px; }
.title { margin: 0; font-size: 20px; font-weight: 600; color: var(--color-text-1); line-height: 1.4; }
.status-tag { margin-left: 12px; }
.header-info { margin-top: 8px; }
.description-text { color: var(--color-text-2); display: inline-block; max-width: 100%; white-space: normal; line-height: 1.5; }

.actions { flex-shrink: 0; }
.actions :deep(.arco-btn) { margin-left: 12px; }

/* 内容区样式优化 */
.detail-content { background: #fff; border-radius: 8px; padding: 20px 24px; min-height: 500px; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
.detail-tabs :deep(.arco-tabs-nav-tab) { justify-content: flex-start; }
.detail-card { margin-bottom: 20px; border-radius: 8px; border: 1px solid var(--color-border-2); }
.detail-card :deep(.arco-card-header) { border-bottom: 1px solid var(--color-border-1); padding: 12px 16px; background-color: var(--color-fill-1); border-top-left-radius: 8px; border-top-right-radius: 8px; }
.detail-card :deep(.arco-card-header-title) { font-size: 15px; font-weight: 600; color: var(--color-text-1); }
.detail-card :deep(.arco-card-body) { padding: 20px 16px; }

/* 描述列表基础间距 */
:deep(.arco-descriptions-item-label-inline) { color: var(--color-text-3); font-weight: 400; }
:deep(.arco-descriptions-item-value-inline) { color: var(--color-text-1); }

/* 效果评估 */
.eval-filter-bar { display: flex; align-items: center; }
</style>
