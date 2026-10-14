<template>
  <div class="inventory-detail-panel">
    <!-- 库存统计卡片（数据 = 点击行的券库存实例，非硬编码） -->
    <div class="stats-cards">
      <a-card class="stat-card">
        <a-statistic title="总库存" :value="record.stock ?? 0" />
      </a-card>
      <a-card class="stat-card">
        <a-statistic title="未领取" :value="record.unclaimed ?? 0" />
      </a-card>
      <a-card class="stat-card">
        <a-statistic title="已领取" :value="record.claimed ?? 0" />
      </a-card>
      <a-card class="stat-card">
        <a-statistic title="已核销" :value="record.used ?? 0" />
      </a-card>
    </div>

    <!-- 失败态提示（PRD v1.2.8 §11.3.1 失败码 1001-1005） -->
    <a-alert v-if="isFailedStatus" :type="failureAlertType" style="margin-bottom: 16px">
      <template #title>
        <span style="font-weight: 500">{{ failureCodeText }}（错误码: {{ record.failure_code }}）</span>
      </template>
      <div>失败原因: {{ record.failure_reason || '系统异常，请联系客服' }}</div>
      <div v-if="record.timeout_time" style="margin-top: 4px">超时时间: {{ record.timeout_time }}</div>
    </a-alert>

    <!-- ==================== 券库存信息 / 券模版参数（分 TAB 展示） ==================== -->
    <a-card class="form-card">
      <a-tabs default-active-key="stock">
        <!-- 券库存信息：仅创建时的库存配置项（与"创建券库存"表单字段对齐） -->
        <a-tab-pane key="stock" title="券库存信息">
      <!-- 分组结构与"创建券库存"抽屉对齐：基本信息 + 券库存下发限制 -->
      <div class="section-title"><span>基本信息</span></div>
      <a-form layout="vertical" :disabled="true">
        <a-grid :cols="2" :col-gap="16" :row-gap="0">
          <a-grid-item>
            <a-form-item label="券库存ID">
              <template #help><span class="help-text">券库存记录主键</span></template>
              <a-input :model-value="record.id" />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item label="券名称">
              <template #help><span class="help-text">设置便于识别的券名称</span></template>
              <a-input :model-value="record.couponName" />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item label="关联券模版">
              <template #help><span class="help-text">基础配置来源的券模版</span></template>
              <a-input :model-value="record.templateId" />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item label="券类型">
              <template #help><span class="help-text">继承自关联券模版</span></template>
              <a-input :model-value="couponTypeText(record.couponType)" />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item label="发放数量">
              <template #help><span class="help-text">本次创建的券的发放数量</span></template>
              <a-input :model-value="`${record.stock ?? 0} 张`" />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item label="券使用场景">
              <template #help><span class="help-text">创建时勾选的券使用场景</span></template>
              <a-input :model-value="usageScenarioText" />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item label="有效期类型">
              <template #help><span class="help-text">绝对有效期 / 相对有效期</span></template>
              <a-input :model-value="validityTypeText" />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item label="有效期">
              <template #help><span class="help-text">设置券的可用时间范围</span></template>
              <a-input :model-value="validityText" />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item label="录入员 / 审核员">
              <template #help><span class="help-text">创建录入与审批人员</span></template>
              <a-input :model-value="`${record.operator || '-'} / ${record.auditor || '-'}`" />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item label="审批状态">
              <template #help><span class="help-text">券库存创建审批流转状态</span></template>
              <div class="status-value">
                <StatusTag :status="record.approvalStatus" dict-key="approvalStatus" />
              </div>
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item label="创建时间">
              <template #help><span class="help-text">券库存创建时刻</span></template>
              <a-input :model-value="record.createTime" />
            </a-form-item>
          </a-grid-item>
          <a-grid-item :span="2">
            <a-form-item label="使用规则">
              <template #help><span class="help-text">券核销时校验的使用规则</span></template>
              <a-textarea :model-value="record.rules || '-'" :auto-size="{ minRows: 3, maxRows: 6 }" />
            </a-form-item>
          </a-grid-item>
        </a-grid>
      </a-form>

      <div class="section-title" style="margin-top: 8px">
        <span>券库存下发限制</span>
        <a-space v-if="editingLimit">
          <a-button size="mini" @click="cancelEditLimit">取消</a-button>
          <a-button type="primary" size="mini" @click="saveEditLimit">保存</a-button>
        </a-space>
        <a-button v-else type="outline" size="mini" @click="startEditLimit">编辑</a-button>
      </div>
      <a-alert type="info" style="margin-bottom: 16px">
        以上发放频率限制为券库存粒度的限制，针对单一用户的下发限制请在全局规则中控制
      </a-alert>
      <!-- 只读态 -->
      <a-form v-if="!editingLimit" layout="vertical" :disabled="true">
        <a-grid :cols="2" :col-gap="16" :row-gap="0">
          <a-grid-item>
            <a-form-item label="单日发放上限">
              <template #help><span class="help-text">选填项：设置每日最大发放数量</span></template>
              <a-input :model-value="record.dailyLimit != null ? `${record.dailyLimit} 张/日` : '未设置'" />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item label="单周发放上限">
              <template #help><span class="help-text">选填项：设置每周最大发放数量</span></template>
              <a-input :model-value="record.weeklyLimit != null ? `${record.weeklyLimit} 张/周` : '未设置'" />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item label="单月发放上限">
              <template #help><span class="help-text">选填项：设置每月最大发放数量</span></template>
              <a-input :model-value="record.monthlyLimit != null ? `${record.monthlyLimit} 张/月` : '未设置'" />
            </a-form-item>
          </a-grid-item>
        </a-grid>
      </a-form>
      <!-- 编辑态：字段口径与"创建券库存"抽屉的下发限制分组一致 -->
      <a-form v-else layout="vertical">
        <a-grid :cols="2" :col-gap="16" :row-gap="0">
          <a-grid-item>
            <a-form-item label="单日发放上限">
              <template #help><span class="help-text">选填项：设置每日最大发放数量</span></template>
              <a-input-number v-model="limitForm.dailyLimit" :min="1" :max="limitMax" :precision="0" hide-button placeholder="不限制">
                <template #suffix><span class="unit-text">张/日</span></template>
              </a-input-number>
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item label="单周发放上限">
              <template #help><span class="help-text">选填项：设置每周最大发放数量</span></template>
              <a-input-number v-model="limitForm.weeklyLimit" :min="1" :max="limitMax" :precision="0" hide-button placeholder="不限制">
                <template #suffix><span class="unit-text">张/周</span></template>
              </a-input-number>
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item label="单月发放上限">
              <template #help><span class="help-text">选填项：设置每月最大发放数量</span></template>
              <a-input-number v-model="limitForm.monthlyLimit" :min="1" :max="limitMax" :precision="0" hide-button placeholder="不限制">
                <template #suffix><span class="unit-text">张/月</span></template>
              </a-input-number>
            </a-form-item>
          </a-grid-item>
        </a-grid>
      </a-form>
        </a-tab-pane>

        <a-tab-pane key="template" title="券模版参数">
      <a-alert v-if="!template" type="info" style="margin-bottom: 16px">
        模版库中未找到该模版记录，以下展示券库存实例上沉淀的模版快照参数。
      </a-alert>
      <a-form layout="vertical" :disabled="true">
        <a-grid :cols="2" :col-gap="16" :row-gap="0">
          <!-- 命中模版库：展示模版配置 -->
          <template v-if="template">
            <a-grid-item>
              <a-form-item label="模版ID">
                <template #help><span class="help-text">券模版唯一编号</span></template>
                <a-input :model-value="template.templateId" />
              </a-form-item>
            </a-grid-item>
            <a-grid-item>
              <a-form-item label="模版名称">
                <template #help><span class="help-text">券模版名称</span></template>
                <a-input :model-value="template.name" />
              </a-form-item>
            </a-grid-item>
            <a-grid-item>
              <a-form-item label="券类型">
                <template #help><span class="help-text">模版定义的券类型</span></template>
                <a-input :model-value="couponTypeText(template.type)" />
              </a-form-item>
            </a-grid-item>
            <a-grid-item>
              <a-form-item label="模版状态">
                <template #help><span class="help-text">券模版生命周期状态</span></template>
                <div class="status-value">
                  <StatusTag :status="template.status" dict-key="templateStatus" />
                </div>
              </a-form-item>
            </a-grid-item>
            <!-- 普通券参数 -->
            <template v-if="template.type !== 'PRICED_DISCOUNT'">
              <a-grid-item v-if="template.denomination != null">
                <a-form-item label="面额 / 优惠">
                  <template #help><span class="help-text">模版定义的优惠力度</span></template>
                  <a-input :model-value="`${template.denomination} 元`" />
                </a-form-item>
              </a-grid-item>
              <a-grid-item v-if="template.threshold != null">
                <a-form-item label="使用门槛">
                  <template #help><span class="help-text">订单需满足的金额门槛</span></template>
                  <a-input :model-value="`满 ${template.threshold} 元可用`" />
                </a-form-item>
              </a-grid-item>
              <a-grid-item v-if="template.validDays != null">
                <a-form-item label="有效天数">
                  <template #help><span class="help-text">领取后可使用天数</span></template>
                  <a-input :model-value="`${template.validDays} 天`" />
                </a-form-item>
              </a-grid-item>
              <a-grid-item v-if="template.validityPeriodType">
                <a-form-item label="有效期类型">
                  <template #help><span class="help-text">相对 / 绝对有效期</span></template>
                  <a-input
                    :model-value="template.validityPeriodType === 'unlimited' ? '长期有效' : '固定有效期'"
                  />
                </a-form-item>
              </a-grid-item>
            </template>
            <!-- 临价折扣券参数 -->
            <template v-else>
              <a-grid-item>
                <a-form-item label="关联产品">
                  <template #help><span class="help-text">临价券绑定的分期产品</span></template>
                  <a-input
                    :model-value="`${template.product_name || '-'}（${template.product_id || '-'}）`"
                  />
                </a-form-item>
              </a-grid-item>
              <a-grid-item>
                <a-form-item label="折扣力度">
                  <template #help><span class="help-text">临价折扣费率折数</span></template>
                  <a-input
                    :model-value="template.discount_value != null ? formatDiscount(template.discount_value) : '-'"
                  />
                </a-form-item>
              </a-grid-item>
              <a-grid-item :span="2">
                <a-form-item label="模版有效期">
                  <template #help><span class="help-text">模版允许发放的时间区间</span></template>
                  <a-input :model-value="`${template.valid_from || '-'} 至 ${template.valid_to || '-'}`" />
                </a-form-item>
              </a-grid-item>
            </template>
            <a-grid-item v-if="template.creator">
              <a-form-item label="创建人">
                <template #help><span class="help-text">模版创建人员</span></template>
                <a-input :model-value="template.creator" />
              </a-form-item>
            </a-grid-item>
            <a-grid-item v-if="template.useChannels?.length">
              <a-form-item label="适用渠道">
                <template #help><span class="help-text">模版限定的发放渠道</span></template>
                <a-input :model-value="template.useChannels.map(channelText).join('、')" />
              </a-form-item>
            </a-grid-item>
            <a-grid-item v-if="template.products?.length">
              <a-form-item label="适用产品">
                <template #help><span class="help-text">模版关联的分期产品</span></template>
                <a-input :model-value="template.products.join('、')" />
              </a-form-item>
            </a-grid-item>
            <a-grid-item>
              <a-form-item label="模版创建 / 更新时间">
                <template #help><span class="help-text">模版维护记录</span></template>
                <a-input :model-value="`${template.createTime} / ${template.updateTime}`" />
              </a-form-item>
            </a-grid-item>
            <a-grid-item v-if="template.description" :span="2">
              <a-form-item label="模版描述">
                <template #help><span class="help-text">模版用途说明</span></template>
                <a-textarea :model-value="template.description" :auto-size="{ minRows: 2, maxRows: 4 }" />
              </a-form-item>
            </a-grid-item>
          </template>
          <!-- 未命中模版库：实例上的模版快照字段兜底 -->
          <template v-else>
            <a-grid-item>
              <a-form-item label="模版ID">
                <template #help><span class="help-text">实例记录的关联模版编号</span></template>
                <a-input :model-value="record.templateId || '-'" />
              </a-form-item>
            </a-grid-item>
            <a-grid-item>
              <a-form-item label="券名称">
                <template #help><span class="help-text">实例沉淀的模版券名称</span></template>
                <a-input :model-value="record.couponName" />
              </a-form-item>
            </a-grid-item>
            <a-grid-item>
              <a-form-item label="券类型">
                <template #help><span class="help-text">实例沉淀的券类型</span></template>
                <a-input :model-value="couponTypeText(record.couponType)" />
              </a-form-item>
            </a-grid-item>
            <a-grid-item>
              <a-form-item label="有效天数">
                <template #help><span class="help-text">领取后可使用天数</span></template>
                <a-input :model-value="record.validity ? (String(record.validity).includes('天') ? record.validity : `${record.validity} 天`) : '-'" />
              </a-form-item>
            </a-grid-item>
            <a-grid-item>
              <a-form-item label="关联产品">
                <template #help><span class="help-text">实例绑定的分期产品</span></template>
                <a-input
                  :model-value="
                    record.product_name ? `${record.product_name}（${record.product_id || '-'}）` : '-'
                  "
                />
              </a-form-item>
            </a-grid-item>
            <a-grid-item>
              <a-form-item label="券有效期">
                <template #help><span class="help-text">实例可用时间范围</span></template>
                <a-input :model-value="`${record.startTime || '-'} 至 ${record.endTime || '-'}`" />
              </a-form-item>
            </a-grid-item>
            <a-grid-item :span="2">
              <a-form-item label="使用规则（快照）">
                <template #help><span class="help-text">实例上沉淀的核销校验规则</span></template>
                <a-textarea :model-value="record.rules || '-'" :auto-size="{ minRows: 3, maxRows: 6 }" />
              </a-form-item>
            </a-grid-item>
          </template>
        </a-grid>
      </a-form>

          <!-- 券预览：仅与券模版参数相关，随本 TAB 展示（复用模版页预览组件） -->
          <div class="section-title" style="margin-top: 8px">
            <span>券预览</span>
            <a-select v-model="previewDevice" size="mini" style="width: 100px" :disabled="false">
              <a-option value="mobile">移动端</a-option>
              <a-option value="desktop">桌面端</a-option>
            </a-select>
          </div>
          <div class="preview-content">
            <CouponPreview
              :coupon-data="previewData"
              :usage-description="record.rules || ''"
              :device-type="previewDevice"
              :is-rendered="true"
            />
          </div>
        </a-tab-pane>

        <!-- 券实例信息：发放后的运行时数据（不属于创建配置） -->
        <a-tab-pane key="instance" title="券实例信息">
      <a-form layout="vertical" :disabled="true">
        <a-grid :cols="2" :col-gap="16" :row-gap="0">
          <a-grid-item>
            <a-form-item label="券实例ID">
              <template #help><span class="help-text">发放侧券实例编号</span></template>
              <a-input :model-value="record.instanceId" />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item label="券状态">
              <template #help><span class="help-text">PRD §11.3 券实例九态</span></template>
              <div class="status-value">
                <StatusTag :status="record.status" dict-key="couponStatus" />
              </div>
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item label="发放渠道">
              <template #help><span class="help-text">券实例的下发渠道</span></template>
              <a-input :model-value="channelText(record.grantChannel)" />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item label="当前持券用户">
              <template #help><span class="help-text">领取该券实例的用户</span></template>
              <a-input :model-value="record.userName ? `${record.userName}（${record.userId}）` : '-'" />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item label="领取 / 核销">
              <template #help><span class="help-text">已领取与已核销（含京东回调计数）</span></template>
              <a-input :model-value="`${record.claimed ?? 0} / ${record.used ?? 0}`" />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item label="下发比例">
              <template #help><span class="help-text">已领取占总库存比例</span></template>
              <a-input :model-value="`${issuedRatio}%`" />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item label="已锁定 / 已过期 / 已作废">
              <template #help><span class="help-text">占用、过期与作废数量</span></template>
              <a-input :model-value="`${record.locked ?? 0} / ${record.expired ?? 0} / ${record.invalid ?? 0}`" />
            </a-form-item>
          </a-grid-item>
          <a-grid-item v-if="record.invalidated_time">
            <a-form-item label="作废时间">
              <template #help><span class="help-text">券实例被作废的时刻</span></template>
              <a-input :model-value="record.invalidated_time" />
            </a-form-item>
          </a-grid-item>
        </a-grid>
      </a-form>
        </a-tab-pane>
      </a-tabs>
    </a-card>

  </div>
</template>

<script setup lang="ts">
/**
 * 券库存详情面板（可复用）
 * 用途：券管理列表详情抽屉 + /benefit/management/detail 路由页共用同一展示组件
 * 样式：与"创建券库存"表单页同款视觉（分组卡片 + 蓝竖条 section-title + 两列 vertical 表单 + disabled 控件 + help 文案）
 * 数据：直接接收列表点击行 record（couponMockData 实例），
 *      模版参数按 record.templateId 在 templateMockData 中匹配，无匹配时用实例快照字段兜底
 */
import { computed, h, ref, watch } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import { templateMockData } from '@/mock/coupon'
import StatusTag from '@/components/common/StatusTag.vue'
import CouponPreview from '../../template/components/CouponPreview.vue'

const props = defineProps<{
  record: Record<string, any>
}>()

const record = computed(() => props.record || {})

// 模版匹配：实例携带的是 templateId 口径（如 'TPL-PRICED-001' / 'T001'）
const template = computed(() =>
  templateMockData.find((t) => t.templateId === record.value.templateId) || null
)

const previewDevice = ref('mobile')

const couponTypeTextMap: Record<string, string> = {
  interest_free: '免息券',
  discount: '折扣券',
  reduction: '满减券',
  cash: '立减券',
  gift: '礼品券',
  PRICED_DISCOUNT: '临价折扣券',
}
const couponTypeText = (type: string) => couponTypeTextMap[type] || type || '-'

const channelTextMap: Record<string, string> = {
  simulate_jd: '模拟京东',
  simulate_mt: '模拟美团',
  manual: '手动录入',
}
const channelText = (ch: string) => channelTextMap[ch] || ch || '-'

const formatDiscount = (v: number) => `${Math.round(v * 100) / 10}折`

const issuedRatio = computed(() => {
  const r = record.value
  return r.stock ? (((r.claimed ?? 0) / r.stock) * 100).toFixed(2) : '0.00'
})

const validityText = computed(() => {
  const r = record.value
  if (r.validityType === 'relative') {
    const days = r.relativeDays ?? String(r.validity ?? '').replace(/\D/g, '')
    return days ? `领取后 ${days} 天内有效` : '相对有效期'
  }
  const range = `${r.startTime || '-'} 至 ${r.endTime || '-'}`
  if (!r.validity) return range
  const v = String(r.validity).includes('天') ? r.validity : `${r.validity} 天`
  return `${range}（${v}）`
})

// 券使用场景 / 有效期类型：与"创建券库存"表单选项口径一致
const usageScenarioMap: Record<string, string> = {
  batch_distribution: '批量下发',
  telemarketing: '电销使用',
}
const usageScenarioText = computed(() => {
  const list = record.value.usageScenarios || []
  return list.map((s) => usageScenarioMap[s] || s).join('、') || '-'
})
const validityTypeText = computed(() =>
  record.value.validityType === 'relative' ? '相对有效期' : '绝对有效期'
)

// PRD v1.2.8 §11.3.1 失败码文案
const failureReasonTextMap: Record<number, string> = {
  1001: '资质审核未通过',
  1002: '系统繁忙，请稍后重试',
  1003: '系统异常，已自动回滚',
  1004: '系统异常，请联系客服',
  1005: '系统异常，请联系客服',
}

const isFailedStatus = computed(() => {
  const s = record.value.status
  return typeof s === 'string' && s.startsWith('failed_')
})

const failureCodeText = computed(() => {
  const code = record.value.failure_code
  if (typeof code === 'number' && failureReasonTextMap[code]) return failureReasonTextMap[code]
  return '发放失败'
})

const failureAlertType = computed<'error' | 'warning'>(() => {
  const code = record.value.failure_code
  return code === 1002 || code === 1003 ? 'warning' : 'error'
})

/* ==================== 券库存下发限制：详情内编辑（保存前弹窗二次确认） ==================== */
const editingLimit = ref(false)
const limitForm = ref<{ dailyLimit?: number; weeklyLimit?: number; monthlyLimit?: number }>({})
// 与"创建券库存"表单口径一致：上限不得超过发放总量
const limitMax = computed(() => record.value.totalCount ?? record.value.stock ?? undefined)

const limitLabelMap: Record<string, string> = {
  dailyLimit: '单日发放上限',
  weeklyLimit: '单周发放上限',
  monthlyLimit: '单月发放上限',
}
const limitUnitMap: Record<string, string> = {
  dailyLimit: '张/日',
  weeklyLimit: '张/周',
  monthlyLimit: '张/月',
}
const fmtLimitVal = (v: number | null, key: string) =>
  v != null ? `${v} ${limitUnitMap[key]}` : '未设置'

const startEditLimit = () => {
  const r = record.value
  limitForm.value = {
    dailyLimit: r.dailyLimit ?? undefined,
    weeklyLimit: r.weeklyLimit ?? undefined,
    monthlyLimit: r.monthlyLimit ?? undefined,
  }
  editingLimit.value = true
}
const cancelEditLimit = () => {
  editingLimit.value = false
}

const saveEditLimit = () => {
  const r = record.value
  const keys = ['dailyLimit', 'weeklyLimit', 'monthlyLimit'] as const
  const changes = keys
    .map((k) => ({ key: k, from: (r[k] ?? null) as number | null, to: (limitForm.value[k] ?? null) as number | null }))
    .filter((c) => c.from !== c.to)
  if (!changes.length) {
    Message.info('未检测到任何修改')
    return
  }
  Modal.warning({
    title: '确认更新下发限制？',
    content: h(
      'div',
      null,
      changes.map((c) =>
        h(
          'div',
          { style: 'line-height: 22px' },
          `${limitLabelMap[c.key]}：${fmtLimitVal(c.from, c.key)} → ${fmtLimitVal(c.to, c.key)}`
        )
      )
    ),
    okText: '确认更新',
    cancelText: '返回修改',
    onOk: () => {
      // 纯前端 mock：直接回写当前券库存实例记录，列表页同源数据同步生效
      changes.forEach((c) => {
        r[c.key] = c.to
      })
      editingLimit.value = false
      Message.success('下发限制已更新')
    },
  })
}

// 切换查看其它券库存记录时重置编辑态
watch(
  () => record.value.id,
  () => {
    editingLimit.value = false
  }
)

// 预览数据：仅与券模版参数相关，优先取模版配置，未命中模版库时回落实例上的模版快照字段
const previewData = computed(() => {
  const t = template.value
  const r = record.value
  return {
    id: r.id,
    name: t?.name || r.couponName,
    displayName: t?.name || r.couponName,
    type: t?.type || r.couponType,
    product_name: t?.product_name || r.product_name,
    discount_value: t?.discount_value != null ? t.discount_value * 100 : undefined,
    validityPeriodType: t?.validityPeriodType,
    validityPeriod: [r.startTime, r.endTime],
  }
})

</script>

<style scoped>
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.stat-card {
  text-align: center;
}

.form-card {
  margin-bottom: 16px;
}

/* 与创建页（template/create.vue、inventory/batch-create.vue）一致的蓝竖条分组标题 */
.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1);
  border-left: 3px solid rgb(var(--primary-6, 22, 93, 255));
  padding-left: 8px;
}

.help-text {
  font-size: 12px;
  color: var(--color-text-3);
}

.unit-text {
  font-size: 12px;
  color: var(--color-text-3);
}

.status-value {
  display: flex;
  align-items: center;
  min-height: 32px;
}

.preview-content {
  background: #f7f8fa;
  padding: 20px;
  border-radius: 8px;
  display: flex;
  justify-content: center;
}
</style>
