/**
 * 优惠券模板提交 Composable
 * TASK-20260618-11640CE4 (chain-#6)
 *
 * 职责：
 * - handleSubmit / handleSubmitAndCreate
 * - saving / submitting 状态
 * - saveDraft 草稿保存
 */

import { ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useRouter } from 'vue-router'
import { goBack } from '@/router/utils'
import { templateAPI } from '@/api/coupon'
import type { TemplateFormData } from './useTemplateForm'

export function useTemplateSubmit(
  formData: any,
  formRef: any
) {
  const router = useRouter()
  const saving = ref(false)
  const submitting = ref(false)

  const goBackAction = () => {
    goBack(router)
  }

  const handleCancel = () => {
    goBack(router)
  }

  const saveDraft = async () => {
    saving.value = true
    try {
      // mock 保存草稿
      await new Promise(resolve => setTimeout(resolve, 300))
      Message.success('草稿已保存')
    } catch (error) {
      Message.error('保存草稿失败')
    } finally {
      saving.value = false
    }
  }

  const submitTemplate = async () => {
    if (!formRef.value) return

    try {
      await formRef.value.validate()
      submitting.value = true

      // mock 提交
      await new Promise(resolve => setTimeout(resolve, 500))
      Message.success('模板创建成功')
      goBack(router)
    } catch (errors) {
      Message.error('请检查表单填写')
    } finally {
      submitting.value = false
    }
  }

  const handleSubmitAndCreate = async () => {
    // 提交并继续创建
    await submitTemplate()
  }

  return {
    saving,
    submitting,
    goBackAction,
    handleCancel,
    saveDraft,
    submitTemplate,
    handleSubmitAndCreate
  }
}
