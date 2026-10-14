/**
 * workflow-directory mock - 工作流目录(占位)
 */
import { ref } from 'vue'

export interface ApplicationRecord {
  id: string
  applicant: string
  resourceName: string
  permissionType: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'processing'
  createdAt: string
  description?: string
}

const SAMPLE_APPLICATIONS: ApplicationRecord[] = [
  { id: 'APP001', applicant: '张数据', resourceName: '客户姓名', permissionType: '字段', status: 'submitted', createdAt: '2026-08-01 10:00' },
  { id: 'APP002', applicant: '王分析', resourceName: '客户身份证', permissionType: '字段', status: 'approved', createdAt: '2026-07-28 14:30' },
  { id: 'APP003', applicant: '李建模', resourceName: '交易金额', permissionType: '字段', status: 'processing', createdAt: '2026-07-30 09:15' },
  { id: 'APP004', applicant: '陈运营', resourceName: '手机号', permissionType: '字段', status: 'draft', createdAt: '2026-08-02 11:20' },
  { id: 'APP005', applicant: '赵风控', resourceName: '征信分数', permissionType: '字段', status: 'rejected', createdAt: '2026-07-25 16:45' }
]

export const ApplicationStore = {
  list: ref([...SAMPLE_APPLICATIONS]),
  getById(id: string): ApplicationRecord | undefined {
    return this.list.value.find((a: ApplicationRecord) => a.id === id)
  },
  add(record: ApplicationRecord) {
    this.list.value.unshift(record)
  },
  update(id: string, patch: Partial<ApplicationRecord>) {
    const item = this.getById(id)
    if (item) Object.assign(item, patch)
  }
}

export default ApplicationStore