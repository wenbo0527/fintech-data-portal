<template>
  <div class="coupon-template-create" :data-readonly="mode === 'view' || readonly || props.readonly">
    <div class="page-header">
      <div class="page-container">
        <div class="header-content">
          <div class="header-left">
            <a-button v-if="!props.hideBackButton" type="text" @click="goBackAction" class="back-btn">
              <IconLeft />
              返回
            </a-button>
            <h2 class="page-title">{{ mode === 'view' ? '优惠券模板详情' : '创建优惠券模板' }}</h2>
          </div>
          <div class="header-right" v-if="mode !== 'view' && !readonly && !props.disableOperations">
            <a-button @click="saveDraft" :loading="saving">保存草稿</a-button>
            <a-button type="primary" @click="submitTemplate" :loading="submitting">创建模板</a-button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="content-layout">
      <div class="page-container">
        <a-form
          ref="formRef"
          :model="formData"
          :rules="rules"
          layout="vertical"
          :disabled="mode === 'view' || readonly || props.readonly"
        >
        <!-- 分组表单 -->
        <a-collapse :default-active-key="formData.type === 'PRICED_DISCOUNT' ? ['template-config'] : ['template-config', 'display-config']" :bordered="false">
          <!-- 券模板配置 -->
          <a-collapse-item key="template-config" header="券模板配置">
            <template #extra>
              <a-tag color="blue">基础配置</a-tag>
            </template>
        <!-- 基础信息 -->
        <a-divider>基础信息</a-divider>
        
        <a-grid :cols="{ xs: 1, sm: 2, md: 3, lg: 4, xl: 4, xxl: 6 }" :col-gap="16" :row-gap="12">
          <a-grid-item :span="{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2, xxl: 3 }">
            <a-form-item field="name" label="优惠券名称" required>
              <a-input v-model="formData.name" placeholder="请输入优惠券名称" />
            </a-form-item>
          </a-grid-item>

          <a-grid-item :span="{ xs: 1, sm: 1, md: 1, lg: 2, xl: 2, xxl: 3 }">
            <a-form-item field="type" label="优惠券类型" required>
              <a-radio-group v-model="formData.type">
                <a-radio value="interest_free">免息券</a-radio>
                <a-radio value="discount">折扣券</a-radio>
                <a-radio value="PRICED_DISCOUNT">临价折扣券</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-grid-item>

          <!-- 临价折扣券：产品选择 -->
          <a-grid-item v-if="formData.type === 'PRICED_DISCOUNT'" :span="{ xs: 1, sm: 1, md: 1, lg: 2, xl: 2, xxl: 3 }">
            <a-form-item field="product_id" label="产品" required>
              <a-select
                v-model="formData.product_id"
                :placeholder="productLocked ? '产品已锁定' : '请选择产品（京东/美团）'"
                :disabled="productLocked"
                :style="{ width: '100%' }"
                @change="handleProductChange"
              >
                <a-option value="JD_001">京东大额低息</a-option>
                <a-option value="MT_001">美团大额低息</a-option>
              </a-select>
            </a-form-item>
          </a-grid-item>
        </a-grid>

        <a-form-item v-if="formData.type !== 'PRICED_DISCOUNT'" field="validityPeriodType" label="有效期" required>
          <a-radio-group v-model="formData.validityPeriodType">
            <a-radio value="limited">有期限</a-radio>
            <a-radio value="unlimited">无期限</a-radio>
          </a-radio-group>
          <div v-if="formData.validityPeriodType === 'limited'" style="margin-top: 8px">
            <a-range-picker
              v-model="formData.validityPeriod"
              style="width: 100%"
            />
          </div>
        </a-form-item>

        <!-- 优惠券参数配置（PRICED_DISCOUNT 隐藏） -->
        <template v-if="formData.type !== 'PRICED_DISCOUNT'">
          <a-divider>优惠券参数配置</a-divider>
          
          <InterestFreeForm v-if="formData.type === 'interest_free'" :form-data="formData" />
          <DiscountForm v-if="formData.type === 'discount'" :form-data="formData" />
        </template>

        <!-- 临价折扣券参数配置 -->
        <div v-if="formData.type === 'PRICED_DISCOUNT'" class="priced-discount-form">
          <a-divider>临价折扣券参数</a-divider>
          <a-grid :cols="{ xs: 1, sm: 2, md: 3, lg: 4, xl: 4, xxl: 6 }" :col-gap="16" :row-gap="12">
            <a-grid-item :span="{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2, xxl: 3 }">
              <a-form-item field="discount_value" label="折扣值" required>
                <a-input-number
                  v-model="formData.discount_value"
                  :min="1"
                  :max="100"
                  :precision="2"
                  placeholder="如: 80 表示8折"
                  style="width: 100%"
                />
              </a-form-item>
            </a-grid-item>
          </a-grid>
          <div style="margin-top: 12px; color: var(--color-text-3); font-size: 12px">
            <!-- v1.2.4 业务模型修正: 临价折扣券正常扣减库存(控总成本),不是"不扣库存"
                 v1.2.7 中文化: 「未使用」/「已作废」/「已过期」对应原 received/invalidated/expired
                 v1.2.8 文博拍板: 无主动作废入口(作废=MA 节点重新触发新发) -->
            <span style="color: var(--color-warning);">⚠️ 正常扣减库存(控总成本) / 无核销 / 同用户同时间 1 张「未使用」状态唯一</span>
            <div style="margin-top: 4px; color: var(--color-text-3); font-size: 12px">
              📌 库存用于控制发放总成本(跟其他券类型一致),同用户同产品再次新发时旧券自动「已作废」
            </div>
          </div>
        </div>

        <!-- 锁定期配置 -->
        <LockForm v-if="formData.type !== 'PRICED_DISCOUNT'" :form-data="formData" />

        <!-- 使用条件配置（PRICED_DISCOUNT 隐藏） -->
        <template v-if="formData.type !== 'PRICED_DISCOUNT'">
          <a-divider>使用条件配置</a-divider>
          
          <a-grid :cols="{ xs: 1, sm: 2, md: 3, lg: 4, xl: 5, xxl: 6 }" :col-gap="16" :row-gap="12">
            <a-grid-item :span="{ xs: 1, sm: 1, md: 1, lg: 1, xl: 1, xxl: 2 }">
              <a-form-item field="firstUseOnly" label="是否仅限首次支用" required>
                <a-radio-group v-model="formData.firstUseOnly">
                  <a-radio :value="true">是</a-radio>
                  <a-radio :value="false">否</a-radio>
                </a-radio-group>
              </a-form-item>
            </a-grid-item>

            <a-grid-item :span="{ xs: 1, sm: 1, md: 1, lg: 1, xl: 1, xxl: 2 }">
              <a-form-item field="stackable" label="是否支持叠加" required>
                <a-radio-group v-model="formData.stackable">
                  <a-radio :value="true">是</a-radio>
                  <a-radio :value="false">否</a-radio>
                </a-radio-group>
              </a-form-item>
            </a-grid-item>
          </a-grid>

          <a-form-item field="repaymentMethods" label="还款方式" required>
            <a-select
              v-model="formData.repaymentMethods"
              placeholder="请选择还款方式"
              multiple
              allow-clear
              style="width: 100%"
            >
              <a-option value="unlimited">不限</a-option>
              <a-option value="equal_principal">等额本金</a-option>
              <a-option value="equal_installment">等额本息</a-option>
              <a-option value="interest_first">先息后本</a-option>
              <a-option value="flexible">随借随还</a-option>
            </a-select>
          </a-form-item>

          <a-grid :cols="{ xs: 1, sm: 2, md: 2, lg: 3, xl: 4, xxl: 4 }" :col-gap="16" :row-gap="12">
            <a-grid-item :span="{ xs: 1, sm: 1, md: 1, lg: 2, xl: 2, xxl: 2 }">
              <a-form-item field="loanPeriod" label="借款期数" required>
                <a-radio-group v-model="formData.loanPeriodType">
                  <a-radio value="unlimited">不限</a-radio>
                  <a-radio value="gte">≥</a-radio>
                  <a-radio value="lte">≤</a-radio>
                  <a-radio value="range">区间</a-radio>
                </a-radio-group>
                <div v-if="formData.loanPeriodType !== 'unlimited'" style="margin-top: 8px">
                  <a-space v-if="formData.loanPeriodType === 'range'">
                    <a-input-number
                      v-model="formData.loanPeriodMin"
                      :min="1"
                      placeholder="最小期数"
                      style="width: 120px"
                    />
                    <span>-</span>
                    <a-input-number
                      v-model="formData.loanPeriodMax"
                      :min="formData.loanPeriodMin || 1"
                      placeholder="最大期数"
                      style="width: 120px"
                    />
                  </a-space>
                  <a-input-number
                    v-else
                    v-model="formData.loanPeriodValue"
                    :min="1"
                    placeholder="期数"
                    style="width: 120px"
                  />
                </div>
              </a-form-item>
            </a-grid-item>

            <a-grid-item :span="{ xs: 1, sm: 1, md: 1, lg: 1, xl: 2, xxl: 2 }">
              <a-form-item field="loanAmount" label="适用金额" required>
                <a-space>
                  <a-input-number
                    v-model="formData.loanAmountMin"
                    :min="0"
                    :precision="0"
                    placeholder="最低金额"
                    style="width: 120px"
                  />
                  <span>-</span>
                  <a-input-number
                    v-model="formData.loanAmountMax"
                    :min="formData.loanAmountMin || 0"
                    :precision="0"
                    placeholder="最高金额"
                    style="width: 120px"
                  />
                  <span>元</span>
                </a-space>
              </a-form-item>
            </a-grid-item>
          </a-grid>

          <!-- 渠道配置 -->
          <a-divider>渠道配置</a-divider>
          
          <a-grid :cols="{ xs: 1, sm: 2, md: 3, lg: 4, xl: 5, xxl: 6 }" :col-gap="16" :row-gap="12">
            <a-grid-item>
              <a-form-item field="useChannels" label="使用渠道" required>
                <a-select
                  v-model="formData.useChannels"
                  placeholder="请选择使用渠道"
                  multiple
                  allow-clear
                  style="width: 100%"
                >
                  <a-option value="unlimited">不限</a-option>
                  <a-option value="app">APP</a-option>
                  <a-option value="miniprogram">微信小程序</a-option>
                  <a-option value="alipay_miniprogram">支付宝小程序</a-option>
                  <a-option value="h5">H5页面</a-option>
                  <a-option value="web">PC网页</a-option>
                  <a-option value="offline">线下网点</a-option>
                </a-select>
              </a-form-item>
            </a-grid-item>

            <a-grid-item>
              <a-form-item field="creditChannels" label="授信渠道" required>
                <a-select
                  v-model="formData.creditChannels"
                  placeholder="请选择授信渠道"
                  multiple
                  allow-clear
                  style="width: 100%"
                >
                  <a-option value="unlimited">不限</a-option>
                  <a-option value="app">APP</a-option>
                  <a-option value="miniprogram">微信小程序</a-option>
                  <a-option value="alipay_miniprogram">支付宝小程序</a-option>
                  <a-option value="h5">H5页面</a-option>
                  <a-option value="web">PC网页</a-option>
                  <a-option value="offline">线下网点</a-option>
                  <a-option value="third_party">第三方渠道</a-option>
                </a-select>
              </a-form-item>
            </a-grid-item>
          </a-grid>
        </template>

          </a-collapse-item>


          <!-- 展示配置 -->
          <a-collapse-item v-if="formData.type !== 'PRICED_DISCOUNT'" key="display-config" header="展示配置">
            <template #extra>
              <a-tag color="green">展示设置</a-tag>
            </template>

            <!-- 左右布局容器 -->
            <div class="display-config-layout">
              <!-- 左侧：优惠券预览 -->
              <div class="preview-section">
                <div class="section-header">
                  <h4>实时预览</h4>
                  <a-button size="small" @click="refreshPreview" v-if="!(mode === 'view' || readonly || props.readonly)">
                    <template #icon><IconRefresh /></template>
                    刷新预览
                  </a-button>
                </div>
                <div class="preview-content">
                  <CouponPreview 
                    :key="previewKey" 
                    :coupon-data="previewData"
                    :usage-description="formData.usageDescription"
                    :is-rendered="isPreviewRendered"
                  />
                </div>
              </div>

              <!-- 右侧：配置项 -->
              <div class="config-section">
                <!-- 展示内容配置 -->
                <div class="config-group">
                  <h4 class="config-title">展示内容配置</h4>
                  
                  <a-grid :cols="2" :col-gap="16" :row-gap="12">
                    <a-grid-item>
                      <a-form-item field="displayName" label="显示名称">
                        <a-input
                          v-model="formData.displayName"
                          placeholder="请输入显示名称"
                          style="width: 100%"
                        />
                      </a-form-item>
                    </a-grid-item>

                    <a-grid-item>
                      <a-form-item field="cornerText" label="角标文字">
                        <a-input
                          v-model="formData.cornerText"
                          placeholder="请输入角标文字"
                          style="width: 100%"
                        />
                      </a-form-item>
                    </a-grid-item>

                    <a-grid-item>
                      <a-form-item field="categoryText" label="类别">
                        <a-input
                          v-model="formData.categoryText"
                          placeholder="请输入类别（如：免息、折扣）"
                          style="width: 100%"
                        />
                      </a-form-item>
                    </a-grid-item>

                    <a-grid-item>
                      <a-form-item field="reductionValue" label="减免值">
                        <a-input
                          v-model="formData.reductionValue"
                          placeholder="请输入减免值（如：3期、100元）"
                          style="width: 100%"
                        />
                      </a-form-item>
                    </a-grid-item>

                    <a-grid-item>
                      <a-form-item field="showExpiryDate" label="显示到期日期">
                        <a-switch v-model="formData.showExpiryDate" />
                      </a-form-item>
                    </a-grid-item>

                    <a-grid-item>
                      <a-form-item field="expiryReminderThreshold" label="到期提醒阈值">
                        <a-space>
                          <a-input-number
                            v-model="formData.expiryReminderThreshold"
                            :min="1"
                            :max="30"
                            placeholder="天数"
                            style="width: 100px"
                          />
                          <span>天</span>
                        </a-space>
                      </a-form-item>
                    </a-grid-item>
                  </a-grid>
                </div>

                <!-- 使用说明配置 -->
                <div class="config-group">
                  <h4 class="config-title">使用说明配置</h4>
                  
                  <a-form-item field="usageDescription" label="使用说明">
                    <div class="markdown-editor-container" style="width: 100%;">
                      <a-tabs :default-active-key="(mode === 'view' || readonly || props.readonly) ? 'preview' : 'edit'" size="small">
                        <a-tab-pane key="edit" title="编辑" v-if="!(mode === 'view' || readonly || props.readonly)">
                          <QuillEditor
                            v-model:content="formData.usageDescription"
                            content-type="html"
                            :options="quillOptions"
                            style="height: 200px; width: 100%;"
                          />
                        </a-tab-pane>
                        <a-tab-pane key="preview" title="预览">
                          <div class="markdown-preview" v-html="formData.usageDescription" style="width: 100%; min-height: 200px; padding: 12px; border: 1px solid var(--subapp-border); border-radius: 6px; background-color: #f7f8fa;"></div>
                        </a-tab-pane>
                      </a-tabs>
                    </div>
                  </a-form-item>
                </div>
              </div>
            </div>

          </a-collapse-item>
        </a-collapse>

        <div class="footer-actions" v-if="!(mode === 'view' || readonly || props.readonly || props.disableOperations)">
          <a-space>
            <a-button @click="handleCancel">取消</a-button>
            <a-button type="primary" @click="handleSubmit">确定</a-button>
            <a-button type="primary" status="success" @click="handleSubmitAndCreate">上线并创建库存</a-button>
          </a-space>
        </div>
        </a-form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  mode: {
    type: String,
    default: 'create'
  },
  id: {
    type: String,
    default: ''
  },
  readonly: {
    type: Boolean,
    default: false
  },
  disableOperations: {
    type: Boolean,
    default: false
  },
  hideBackButton: {
    type: Boolean,
    default: false
  }
})
import { ref, onMounted, computed } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconLeft, IconRefresh } from '@arco-design/web-vue/es/icon'
import { useRouter, useRoute } from 'vue-router'
import { goBack } from '@/router/utils'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import { templateAPI } from '@/api/coupon'
import { templateMockData } from '@/mock/coupon'
import InterestFreeForm from './components/InterestFreeForm.vue'
import DiscountForm from './components/DiscountForm.vue'
import LockForm from './components/LockForm.vue'
import CouponPreview from './components/CouponPreview.vue'

const router = useRouter()
const route = useRoute()
const mode = ref(props.mode || route.query.mode || 'create')
const readonly = ref(props.readonly || route.query.readonly === 'true')

// 预览刷新key
const previewKey = ref(0)

// 预览渲染状态
const isPreviewRendered = computed(() => {
  // 当有基本信息时认为可以渲染
  return !!(formData.value.name || formData.value.displayName || formData.value.type)
})

// Quill编辑器配置
const quillOptions = {
  theme: 'snow',
  modules: {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['clean']
    ]
  },
  placeholder: '请输入优惠券使用说明，支持富文本格式...'
}

// 刷新预览
const refreshPreview = () => {
  previewKey.value++
}

// 预览数据计算属性
const previewData = computed(() => {
  return {
    id: formData.value.id,
    name: formData.value.displayName || formData.value.name,
    displayName: formData.value.displayName || formData.value.name,
    type: formData.value.type,
    cornerText: formData.value.cornerText,
    categoryText: formData.value.categoryText,
    reductionValue: formData.value.reductionValue,
    showExpiryDate: formData.value.showExpiryDate,
    validityPeriod: formData.value.validityPeriod,
    validityPeriodType: formData.value.validityPeriodType,
    expiryReminderThreshold: formData.value.expiryReminderThreshold,
    // 添加免息券和折扣券的参数
    interestFreeDays: formData.value.interestFreeDays,
    maxInterestFreeAmount: formData.value.maxInterestFreeAmount,
    uniformDiscount: formData.value.uniformDiscount,
    // 临价折扣券参数
    product_name: formData.value.product_name,
    discount_value: formData.value.discount_value,
    usageInstructions: formData.value.usageDescription
  }
})


const formRef = ref()

// 产品选项（用于 SUD001 贷产品）
const productOptions = [
  { label: '自营APP', value: 'SELF_APP' }
]

// 临价折扣券专用产品选项
const pricedProductOptions = [
  { label: '京东大额低息', value: 'JD_001' },
  { label: '美团大额低息', value: 'MT_001' },
]

/** 产品是否已锁定（一旦选择不可修改） */
const productLocked = computed(() => {
  // 有 product_id 且不为空 → 锁定
  return !!(formData.value.product_id)
})

/** 临价折扣券场景下切换产品 */
const handleProductChange = (value: string) => {
  formData.value.product_id = value
  formData.value.product_name = pricedProductOptions.find(p => p.value === value)?.label || ''
}

// 表单数据
const formData = ref<{
  id: string
  name: string
  type: string
  description: string
  validityPeriodType: string
  validityPeriod: [Date, Date] | undefined
  firstUseOnly: boolean
  stackable: boolean
  repaymentMethods: string[]
  loanPeriodType: string
  loanPeriodMin: number | undefined
  loanPeriodMax: number | undefined
  loanPeriodValue: number | undefined
  loanAmountMin: number | undefined
  loanAmountMax: number | undefined
  useChannels: string[]
  creditChannels: string[]
  interestFreeDays: number | undefined
  maxInterestFreeAmount: number | undefined
  discountType: string
  uniformDiscount: number | undefined
  frontPeriods: number | undefined
  frontDiscount: number | undefined
  backPeriods: number | undefined
  backDiscount: number | undefined
  fixedFrontPeriods: number | undefined
  fixedFrontValue: number | undefined
  fixedBackPeriods: number | undefined
  fixedBackDiscount: number | undefined
  // 锁定期配置
  hasLockPeriod: boolean
  lockPeriodType: string
  lockPeriodValue: number | undefined
  lockLimitType: string
  // 展示内容配置
  displayName: string
  cornerText: string
  categoryText: string
  reductionValue: string
  showExpiryDate: boolean
  expiryReminderThreshold: number | undefined
  // 使用说明配置
  usageDescription: string
  // 临价折扣券字段
  product_id: string
  product_name: string
  discount_value: number | undefined
}>({  
  id: '',
  name: '',
  type: 'interest_free',
  description: '',
  validityPeriodType: 'limited',
  validityPeriod: undefined,
  firstUseOnly: false,
  stackable: false,
  repaymentMethods: [],
  loanPeriodType: 'unlimited',
  loanPeriodMin: undefined,
  loanPeriodMax: undefined,
  loanPeriodValue: undefined,
  loanAmountMin: undefined,
  loanAmountMax: undefined,
  useChannels: [],
  creditChannels: [],
  interestFreeDays: undefined,
  maxInterestFreeAmount: undefined,
  discountType: 'uniform',
  uniformDiscount: undefined,
  frontPeriods: undefined,
  frontDiscount: undefined,
  backPeriods: undefined,
  backDiscount: undefined,
  fixedFrontPeriods: undefined,
  fixedFrontValue: undefined,
  fixedBackPeriods: undefined,
  fixedBackDiscount: undefined,
  // 锁定期配置
  hasLockPeriod: false,
  lockPeriodType: 'period',
  lockPeriodValue: undefined,
  lockLimitType: 'restrict_repayment',
  // 展示内容配置
  displayName: '',
  cornerText: '',
  categoryText: '',
  reductionValue: '',
  showExpiryDate: true,
  expiryReminderThreshold: 3,
  // 使用说明配置
  usageDescription: '',
  // 临价折扣券字段
  product_id: '',
  product_name: '',
  discount_value: undefined,
})

// 表单验证规则
const rules = {
  name: [{ required: true, message: '请输入优惠券名称' }],
  type: [{ required: true, message: '请选择优惠券类型' }],
  validityPeriodType: [{ required: true, message: '请选择有效期类型' }],
  validityPeriod: [{ required: true, message: '请选择有效期', trigger: 'change' }],
  products: [{ required: false, message: '请选择贷款产品' }],
  stackable: [{ required: true, message: '请选择是否支持叠加' }],
  repaymentMethods: [{ required: true, message: '请选择还款方式' }],
  useChannels: [{ required: true, message: '请选择使用渠道' }],
  creditChannels: [{ required: true, message: '请选择授信渠道' }],
  // 免息券参数验证
  interestFreeDays: [{
    required: true,
    message: '请输入免息天数',
    trigger: 'blur',
    validator: (value: number | null) => {
      if (value === null) return true;
      return value >= 0 && value <= 1000;
    }
  }],
  maxInterestFreeAmount: [{
    required: true,
    message: '请输入最大免息金额',
    trigger: 'blur',
    validator: (value: number | null) => {
      if (value === null) return true;
      return value >= 0;
    }
  }],
  // 折扣券参数验证
  discountType: [{ required: true, message: '请选择折扣类型' }],
  uniformDiscount: [{
    required: true,
    message: '请输入折扣率',
    trigger: 'blur',
    validator: (value: number | null) => {
      if (value === null) return true;
      return value >= 0 && value <= 1;
    }
  }],
  frontPeriods: [{
    required: true,
    message: '请输入前期期数',
    trigger: 'blur',
    validator: (value: number | null) => {
      if (value === null) return true;
      return value >= 1;
    }
  }],
  frontDiscount: [{
    required: true,
    message: '请输入前期折扣率',
    trigger: 'blur',
    validator: (value: number | null) => {
      if (value === null) return true;
      return value >= 0 && value <= 1;
    }
  }],
  backPeriods: [{
    required: true,
    message: '请输入后期期数',
    trigger: 'blur',
    validator: (value: number | null) => {
      if (value === null) return true;
      return value >= 1;
    }
  }],
  backDiscount: [{
    required: true,
    message: '请输入后期折扣率',
    trigger: 'blur',
    validator: (value: number | null) => {
      if (value === null) return true;
      return value >= 0 && value <= 1;
    }
  }],
  fixedFrontPeriods: [{
    required: true,
    message: '请输入前期期数',
    trigger: 'blur',
    validator: (value: number | null) => {
      if (value === null) return true;
      return value >= 1;
    }
  }],
  fixedFrontRate: [{
    required: true,
    message: '请输入前期固定利率',
    trigger: 'blur',
    validator: (value: number | null) => {
      if (value === null) return true;
      return value >= 0 && value <= 1;
    }
  }],
  fixedBackPeriods: [{
    required: true,
    message: '请输入后期期数',
    trigger: 'blur',
    validator: (value: number | null) => {
      if (value === null) return true;
      return value >= 1;
    }
  }],
  fixedBackDiscount: [{
    required: true,
    message: '请输入后期折扣率',
    trigger: 'blur',
    validator: (value: number | null) => {
      if (value === null) return true;
      return value >= 0 && value <= 1;
    }
  }],
  // 锁定期配置验证
  lockPeriodValue: [{
    required: true,
    message: '请输入锁定期限值',
    trigger: 'blur',
    validator: (value: number | null) => {
      if (value === null) return true;
      return value >= 1;
    }
  }],
  // 展示内容配置验证
  displayName: [{ required: false, message: '请输入对客展示名称' }],
  cornerText: [{ required: false, message: '请输入角标文字' }],
  categoryText: [{ required: false, message: '请输入类别文字' }],
  expiryReminderThreshold: [{
    required: false,
    message: '请输入到期提醒阈值',
    trigger: 'blur',
    validator: (value: number | null) => {
      if (value === null) return true;
      return value >= 1 && value <= 30;
    }
  }],
  // 使用说明配置验证
  usageDescription: [{ 
    required: false, 
    maxLength: 500,
    message: '使用说明不能超过500个字符'
  }],
  // 临价折扣券参数验证
  product_id: [{
    required: true,
    message: '请选择产品',
    validator: (value: any) => {
      if (formData.value.type !== 'PRICED_DISCOUNT') return true;
      return !!value;
    }
  }],
  discount_value: [{
    required: true,
    message: '请输入折扣值',
    trigger: 'blur',
    validator: (value: number | null) => {
      if (formData.value.type !== 'PRICED_DISCOUNT') return true;
      if (value === null || value === undefined) return false;
      return value >= 1 && value <= 100;
    }
  }],
}

// 取消创建
const goBackAction = () => {
  goBack(router, '/marketing/benefit/template')
}
const handleCancel = () => {
  goBack(router, '/marketing/benefit/template')
}





// 表单提交处理
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    // P0-模板-#1 BUG-1: 调 templateAPI.createTemplate 接口 + 同步 push 到 mock 立即可见
    const submitData = { ...formData.value, status: 'draft' }
    const res = await templateAPI.createTemplate(submitData)
    if (res.code === 200) {
      // demo 范围: 同步 push 到 mock, 跳列表可看到
      const newTemplate = { id: res.data.id, templateId: res.data.id, ...submitData, createTime: new Date().toISOString().slice(0, 19).replace('T', ' '), updateTime: new Date().toISOString().slice(0, 19).replace('T', ' ') }
      templateMockData.unshift(newTemplate)
      Message.success('创建成功')
      router.push('/marketing/benefit/template')
    } else {
      Message.error(res.message || '创建失败')
    }
  } catch (error) {
    console.error('表单验证/提交失败:', error)
  }
}

// 提交并创建券
const handleSubmitAndCreate = async () => {
  try {
    await formRef.value.validate()
    // P0-模板-#1 BUG-3: 调 templateAPI.createTemplate 接口, 状态置 online
    const submitData = {
      ...formData.value,
      status: 'online' // 设置状态为已上线
    }
    const res = await templateAPI.createTemplate(submitData)
    if (res.code === 200) {
      // demo 范围: 同步 push 到 mock
      const newTemplate = { id: res.data.id, templateId: res.data.id, ...submitData, createTime: new Date().toISOString().slice(0, 19).replace('T', ' '), updateTime: new Date().toISOString().slice(0, 19).replace('T', ' ') }
      templateMockData.unshift(newTemplate)
      Message.success('创建并上线成功')
      // 跳转到库存管理页面并传递参数以触发创建库存弹窗
      // P0-模板-#2 BUG-2: 路径从 /marketing/coupon/management 改为 /marketing/benefit/management (与 router/modules/marketing.ts 一致)
      router.push({
        path: '/marketing/benefit/management',
        query: {
          createCoupon: 'true',
          templateId: res.data.id, // 传递模板ID (用接口返回的)
          templateName: formData.value.name, // 传递模板名称
          showCreateModal: 'true', // 控制创建券库存弹窗的显示
          _t: Date.now() // 添加时间戳确保每次跳转都会触发参数变化
        }
      })
    } else {
      Message.error(res.message || '创建并上线失败')
    }
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}
</script>

<style scoped>
.coupon-template-create {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.page-header {
  background: white;
  padding: 12px 0;
  border-bottom: 1px solid var(--subapp-border);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  padding: 4px 8px;
  color: var(--subapp-text-secondary);
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.header-right {
  display: flex;
  gap: 12px;
}

.content-layout {
  flex: 1;
  padding: 16px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 分组表单样式 */
.content-layout :deep(.arco-collapse) {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  border: 1px solid var(--subapp-border);
  margin-bottom: 16px;
}

.content-layout :deep(.arco-collapse-item) {
  border: none;
}

.content-layout :deep(.arco-collapse-item-header) {
  padding: 16px 20px;
  background: #f7f8fa;
  font-weight: 600;
  font-size: 16px;
  color: var(--subapp-text-primary);
}

.content-layout :deep(.arco-collapse-item-content) {
  padding: 20px;
  background: white;
}

/* 全屏布局优化 */
.page-container {
  width: 100%;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  box-sizing: border-box;
}

/* 展示配置全屏布局 */
.display-config-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  min-height: 600px;
  width: 100%;
  overflow-x: hidden;
}

.preview-section {
  flex: 0 0 min(380px, 35%);
  min-width: 300px;
  max-width: 380px;
  position: sticky;
  top: 20px;
}

.config-section {
  flex: 1;
  min-width: 0;
  width: 100%;
  overflow-x: hidden;
}

/* 优化表单布局 */
.config-section .arco-form-item {
  margin-bottom: 18px;
}

.config-section .arco-collapse-item-content {
  padding: 20px 24px;
}

/* 表单项间距优化 */
.content-layout .arco-form-item {
  margin-bottom: 16px;
}

.content-layout .arco-divider {
  margin: 24px 0 20px 0;
}

.content-layout .arco-grid {
  margin-bottom: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--subapp-border);
}

.section-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.config-group {
  margin-bottom: 32px;
}

.config-group:last-child {
  margin-bottom: 0;
}

.config-title {
  margin: 0 0 20px 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--subapp-text-primary);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--subapp-bg-secondary);
}

.preview-content {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 优惠券预览区域样式 */
.coupon-preview-section {
  margin-top: 16px;
  padding: 16px;
  background: #f7f8fa;
  border-radius: 8px;
  border: 1px solid var(--subapp-border);
}

.coupon-preview-section .preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.coupon-preview-section .preview-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.coupon-preview-section .preview-content {
  display: flex;
  justify-content: center;
}

/* Markdown编辑器样式 */
.markdown-editor-container {
  border: 1px solid var(--subapp-border);
  border-radius: 6px;
  overflow: hidden;
  width: 100%;
  max-width: 100%;
}

.markdown-editor-container :deep(.arco-tabs-nav) {
  background: #f7f8fa;
  margin: 0;
  padding: 0 12px;
}

.markdown-editor-container :deep(.arco-tabs-content) {
  padding: 0;
  width: 100%;
}

.markdown-editor-container :deep(.arco-tabs-pane) {
  padding: 0;
  width: 100%;
}

.markdown-preview {
  min-height: 200px;
  padding: 12px;
  background: white;
  border-top: 1px solid var(--subapp-border);
  width: 100%;
  box-sizing: border-box;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

/* Quill编辑器样式优化 */
.markdown-editor-container :deep(.ql-toolbar) {
  border: none;
  border-bottom: 1px solid var(--subapp-border);
  background: #fafafa;
  width: 100%;
  box-sizing: border-box;
}

.markdown-editor-container :deep(.ql-container) {
  border: none;
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
}

.markdown-editor-container :deep(.ql-editor) {
  width: 100%;
  box-sizing: border-box;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

/* 底部操作按钮样式 */
.footer-actions {
  margin-top: 20px;
  padding: 16px 20px;
  background: white;
  border-top: 1px solid var(--subapp-border);
  border-radius: 0 0 8px 8px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.preview-content {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  background: #f7f8fa;
  border-radius: 6px;
  border: 1px dashed #c9cdd4;
}



/* 表单优化样式 */
.form-card :deep(.arco-form-item) {
  margin-bottom: 12px;
}

.form-card :deep(.arco-form-item-label) {
  font-weight: 500;
  color: var(--subapp-text-primary);
  margin-bottom: 4px;
  font-size: 13px;
}

.form-card :deep(.arco-divider) {
  margin: 16px 0 12px 0;
  font-weight: 600;
  color: var(--subapp-text-primary);
  font-size: 14px;
}

.form-card :deep(.arco-grid) {
  margin-bottom: 6px;
}

.form-card :deep(.arco-grid-item) {
  padding: 0;
}

.form-card :deep(.arco-input),
.form-card :deep(.arco-select),
.form-card :deep(.arco-input-number) {
  font-size: 13px;
}

.form-card :deep(.arco-radio-group) {
  font-size: 13px;
}

/* 响应式设计 */
@media (max-width: 1400px) {
  .page-container {
    max-width: 1200px;
    padding: 0 20px;
    overflow-x: hidden;
  }
  
  .display-config-layout {
    gap: 20px;
    overflow-x: hidden;
  }
  
  .preview-section {
    flex: 0 0 min(350px, 35%);
    min-width: 280px;
    max-width: 350px;
  }
  
  .config-section {
    overflow-x: hidden;
  }
}

/* 超宽屏优化 (>2560px) */
@media (min-width: 2560px) {
  .page-container {
    padding: 0 40px;
  }
  
  .display-config-layout {
    gap: 40px;
  }
  
  .preview-section {
    flex: 0 0 480px;
    min-width: 480px;
  }
  
  .content-layout :deep(.arco-collapse-item-content) {
    padding: 24px 32px;
  }
}

/* 大屏优化 (1920px-2560px) */
@media (min-width: 1920px) and (max-width: 2559px) {
  .page-container {
    padding: 0 32px;
    overflow-x: hidden;
  }
  
  .display-config-layout {
    gap: 32px;
    overflow-x: hidden;
  }
  
  .preview-section {
    flex: 0 0 min(420px, 35%);
    min-width: 350px;
    max-width: 420px;
  }
  
  .config-section {
    overflow-x: hidden;
  }
}

/* 中等屏幕优化 (1200px-1919px) */
@media (min-width: 1200px) and (max-width: 1919px) {
  .page-container {
    padding: 0 24px;
    overflow-x: hidden;
  }
  
  .display-config-layout {
    gap: 20px;
    overflow-x: hidden;
  }
  
  .preview-section {
    flex: 0 0 min(360px, 35%);
    min-width: 300px;
    max-width: 360px;
  }
  
  .config-section {
    overflow-x: hidden;
  }
}

/* 小屏幕适配 (768px-1199px) */
@media (max-width: 1199px) {
  .page-container {
    overflow-x: hidden;
  }
  
  .content-layout {
    flex-direction: column;
    gap: 16px;
    overflow-x: hidden;
  }
  
  .preview-card {
    width: 100%;
    position: static;
    max-height: none;
  }
  
  .page-header {
    padding: 12px 16px;
  }
  
  .content-layout {
    padding: 12px;
  }
  
  /* 在中等屏幕上调整网格布局 */
  .form-card :deep(.arco-grid[data-cols="4"]) {
    grid-template-columns: repeat(2, 1fr) !important;
  }
  
  .form-card :deep(.arco-grid[data-cols="3"]) {
    grid-template-columns: repeat(2, 1fr) !important;
  }
  
  /* 展示配置响应式 */
  .display-config-layout {
    flex-direction: column;
    gap: 20px;
    min-height: auto;
    overflow-x: hidden;
  }
  
  .preview-section {
    flex: none;
    width: 100%;
    position: static;
    max-width: 100%;
    overflow-x: hidden;
  }
  
  .config-section {
    flex: none;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }
}

@media (max-width: 768px) {
  .page-container {
    padding: 0 16px;
    overflow-x: hidden;
  }
  
  .page-header {
    padding: 10px 12px;
  }
  
  .page-title {
    font-size: 16px;
  }
  
  .content-layout {
    padding: 8px;
    gap: 12px;
    overflow-x: hidden;
  }
  
  .form-card :deep(.arco-card-body) {
    padding: 12px 16px;
  }
  
  .preview-card :deep(.arco-card-body) {
    padding: 12px;
  }
  
  /* 在小屏幕上所有网格都变为单列 */
  .form-card :deep(.arco-grid) {
    grid-template-columns: 1fr !important;
  }
  
  /* 展示配置小屏幕响应式 */
  .display-config-layout {
    gap: 16px;
    overflow-x: hidden;
  }
  
  .preview-content {
    padding: 16px;
    min-height: 300px;
  }
  
  .config-group {
    margin-bottom: 24px;
  }
  
  /* 确保所有表单元素不会溢出 */
  .config-section * {
    max-width: 100%;
    box-sizing: border-box;
  }
  
  /* 使用说明编辑器在小屏幕上的优化 */
  .markdown-editor-container {
    overflow-x: hidden;
  }
  
  .markdown-editor-container :deep(.ql-toolbar) {
    flex-wrap: wrap;
  }
}

/* 滚动条优化 */
.preview-card::-webkit-scrollbar {
  width: 4px;
}

.preview-card::-webkit-scrollbar-track {
  background: #f7f8fa;
}

.preview-card::-webkit-scrollbar-thumb {
  background: #c9cdd4;
  border-radius: 2px;
}

.preview-card::-webkit-scrollbar-thumb:hover {
  background: #a9aeb8;
}

/* 只读模式样式优化 */
.coupon-template-create[data-readonly="true"] :deep(.arco-input),
.coupon-template-create[data-readonly="true"] :deep(.arco-select),
.coupon-template-create[data-readonly="true"] :deep(.arco-textarea),
.coupon-template-create[data-readonly="true"] :deep(.arco-input-number),
.coupon-template-create[data-readonly="true"] :deep(.arco-radio),
.coupon-template-create[data-readonly="true"] :deep(.arco-checkbox),
.coupon-template-create[data-readonly="true"] :deep(.arco-date-picker),
.coupon-template-create[data-readonly="true"] :deep(.arco-range-picker) {
  background-color: #f7f8fa !important;
  border-color: var(--subapp-border) !important;
  color: var(--subapp-text-tertiary) !important;
  cursor: not-allowed !important;
}

.coupon-template-create[data-readonly="true"] :deep(.arco-input:hover),
.coupon-template-create[data-readonly="true"] :deep(.arco-select:hover),
.coupon-template-create[data-readonly="true"] :deep(.arco-textarea:hover),
.coupon-template-create[data-readonly="true"] :deep(.arco-input-number:hover) {
  border-color: var(--subapp-border) !important;
}

.coupon-template-create[data-readonly="true"] :deep(.arco-form-item-label)::after {
  content: " (只读)";
  color: var(--subapp-text-tertiary);
  font-size: 12px;
  font-weight: normal;
}

.coupon-template-create[data-readonly="true"] .config-title::after {
  content: " - 只读模式";
  color: var(--subapp-text-tertiary);
  font-size: 12px;
  font-weight: normal;
}
</style>
