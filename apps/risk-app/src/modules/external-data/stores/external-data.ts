import { defineStore } from 'pinia'
import { getEvaluationReports, getEvaluationReportDetail, createEvaluationReport, getRegisteredProducts, publishReport, archiveReport } from '@/modules/external-data/api/evaluation'
import { getTasks, getTaskDetail, createTask, updateTaskProgress } from '@/modules/external-data/api/task'
import type { Task, TaskConfig } from '@/modules/external-data/api/task'
import { getBurndown, getWarnings } from '@/modules/external-data/api/monitor'

export interface Pagination { page: number; pageSize: number; total: number }
export interface EvaluationReport { id: string | number; supplier?: string; reportType?: string; status?: string; createdAt?: string; score?: number; title?: string }
export interface EvaluationDetail { id: string | number; title?: string; status?: string; score?: number; content?: unknown; fields?: Record<string, unknown> }
export interface ProductSummary { id: string | number; name: string; supplier?: string; status?: string; interfaces?: number; channel?: string; unitPrice?: number; frameworkAgreements?: Array<{ id: string; name: string; signDate: string; amount: number }>; totalSupplementAmount?: number }
export interface BurndownPoint { granularity?: 'month' | 'quarter'; month?: string; period?: string; budget?: number; actual?: number; initialBudget?: number; cumulativeBudget?: number; cumulativeActual?: number }
export interface WarningItem { id: string | number; level: 'info' | 'warning' | 'critical'; message: string; createdAt?: string; tag?: string; businessType?: string; platform?: string; year?: string | number; targetLoan?: number; estimatedLoan?: number; actualLoan?: number; estimatedCost?: number; actualCost?: number; estimatedAnnualCost?: number; actualAnnualCost?: number; estimatedRiskFreeReturn?: number; actualRiskFreeReturn?: number; externalDataCost?: number; budgetStatus?: string }

export const useExternalDataStore = defineStore('externalData', {
  state: () => ({
    evaluationList: [] as EvaluationReport[],
    evaluationLoading: false as boolean,
    evaluationPagination: { page: 1, pageSize: 10, total: 0 } as Pagination,
    evaluationDetail: null as EvaluationDetail | null,
    products: [] as ProductSummary[],
    productsLoading: false as boolean,
    burndown: [] as BurndownPoint[],
    burndownLoading: false as boolean,
    warnings: [] as WarningItem[],
    warningsLoading: false as boolean,
    tasks: [] as Task[],
    tasksLoading: false as boolean,
    taskDetail: null as Task | null,
    creatingTask: false as boolean,
    error: null as string | null,
    targetLoanOptions: [] as number[],
    lifecycleStages: [] as any[],
    lifecycle: {} as any,
    lifecycleList: [] as any[],
    currentProductId: null as string | number | null,
    services: [] as any[],
  }),

  actions: {
    async fetchEvaluationList(params?: { page?: number; pageSize?: number; reportType?: string; keyword?: string; status?: string; startDate?: string; endDate?: string }) {
      this.evaluationLoading = true
      this.error = null
      try {
        const query = { page: params?.page ?? this.evaluationPagination.page, pageSize: params?.pageSize ?? this.evaluationPagination.pageSize, reportType: params?.reportType, keyword: params?.keyword, status: params?.status, startDate: params?.startDate, endDate: params?.endDate }
        const res = await getEvaluationReports(query as any)
        const list: EvaluationReport[] = (res?.list ?? []) as EvaluationReport[]
        const total: number = Number(res?.total ?? list.length)
        this.evaluationList = list
        this.evaluationPagination = { page: query.page, pageSize: query.pageSize, total }
      } catch (e: any) { this.error = e?.message ?? '获取评估列表失败' } finally { this.evaluationLoading = false }
    },
    async fetchEvaluationDetail(id: string | number) {
      this.evaluationLoading = true
      this.error = null
      try { const res = await getEvaluationReportDetail(id); this.evaluationDetail = (res ?? null) as EvaluationDetail | null } catch (e: any) { this.error = e?.message ?? '获取评估详情失败' } finally { this.evaluationLoading = false }
    },
    async createEvaluation(payload: Record<string, unknown>) {
      this.evaluationLoading = true
      this.error = null
      try {
        const created = await createEvaluationReport(payload)
        const item: EvaluationReport = {
          id: (created as any)?.id,
          title: (created as any)?.title,
          reportType: (created as any)?.type,
          status: (created as any)?.status,
          score: (created as any)?.score,
          createdAt: (created as any)?.createdAt
        }
        this.evaluationList = [item, ...(this.evaluationList || [])]
        this.evaluationPagination = {
          ...this.evaluationPagination,
          total: Number(this.evaluationPagination.total || 0) + 1,
          page: 1
        }
        return true
      } catch (e: any) {
        this.error = e?.message ?? '创建评估报告失败'
        return false
      } finally {
        this.evaluationLoading = false
      }
    },
    async publishEvaluation(id: string | number) { this.evaluationLoading = true; this.error = null; try { await publishReport(id); await this.fetchEvaluationList(); return true } catch (e: any) { this.error = e?.message ?? '发布评估报告失败'; return false } finally { this.evaluationLoading = false } },
    async archiveEvaluation(id: string | number) { this.evaluationLoading = true; this.error = null; try { await archiveReport(id); await this.fetchEvaluationList(); return true } catch (e: any) { this.error = e?.message ?? '归档评估报告失败'; return false } finally { this.evaluationLoading = false } },
    async fetchProducts() {
      this.productsLoading = true
      this.error = null
      try {
        console.log('[Store Debug] 开始 fetchProducts...')
        const res: any = await getRegisteredProducts()
        console.log('[Store Debug] API 返回结果:', res)
        
        // 统一处理标准 Mock 响应结构 { code: 200, data: [...] }
        // 兼容 res.data 为数组的情况
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
        
        console.log('[Store Debug] 解析后的产品列表长度:', list?.length)
        if (list.length > 0) {
           console.log('[Store Debug] 首个产品示例:', list[0].name, list[0].supplier)
        }
        
        this.products = [...list] as ProductSummary[]
        console.log('[Store Debug] Store state products updated, length:', this.products.length)
      } catch (e: any) {
        console.error('[Store Debug] fetchProducts 失败:', e)
        this.error = e?.message ?? '获取产品列表失败'
      } finally {
        this.productsLoading = false
      }
    },
    async fetchBurndown(params?: { range?: 'month' | 'quarter'; productId?: string | number; businessType?: string; platform?: string; year?: string; targetLoan?: number }) {
      this.burndownLoading = true
      this.error = null
      try {
        const payload = await getBurndown(params)
        const payloadAny: any = payload as any
        const list = Array.isArray(payloadAny) ? payloadAny : (payloadAny?.list ?? payloadAny?.data ?? [])
        const normalized = Array.isArray(list) ? list : []
        this.burndown = normalized as BurndownPoint[]
      } catch (e: any) {
        this.error = e?.message ?? '获取燃尽数据失败'
        this.burndown = []
      } finally {
        this.burndownLoading = false
      }
    },
    async fetchWarnings(params?: { level?: string; productId?: string | number; businessType?: string; platform?: string; year?: string; targetLoan?: number }) { this.warningsLoading = true; this.error = null; try { const list = await getWarnings(params); this.warnings = (list ?? []) as WarningItem[] } catch (e: any) { this.error = e?.message ?? '获取预警数据失败' } finally { this.warningsLoading = false } },
    async fetchTasks() { this.tasksLoading = true; this.error = null; try { const res = await getTasks({}); this.tasks = (res?.data?.list ?? []) as Task[] } catch (e: any) { this.error = e?.message ?? '获取任务列表失败' } finally { this.tasksLoading = false } },
    async fetchTaskDetail(id: string | number) { this.tasksLoading = true; this.error = null; try { const res = await getTaskDetail(Number(id)); this.taskDetail = (res?.data ?? null) as Task | null } catch (e: any) { this.error = e?.message ?? '获取任务详情失败' } finally { this.tasksLoading = false } },
    async createTaskAction(payload: { taskName: string; config?: Partial<TaskConfig> }) { this.creatingTask = true; this.error = null; try { await createTask(payload); await this.fetchTasks(); return true } catch (e: any) { this.error = e?.message ?? '创建任务失败'; return false } finally { this.creatingTask = false } },
    async updateTaskProgressAction(id: string | number, progress: number) { this.tasksLoading = true; this.error = null; try { await updateTaskProgress(Number(id), progress); await this.fetchTaskDetail(Number(id)); return true } catch (e: any) { this.error = e?.message ?? '更新任务进度失败'; return false } finally { this.tasksLoading = false } },
    async fetchTargetLoanOptions() { const set = new Set<number>(); (this.burndown || []).forEach((p: any) => { if (typeof p.targetLoan === 'number') set.add(p.targetLoan) }); (this.warnings || []).forEach((w: any) => { if (typeof w.targetLoan === 'number') set.add(w.targetLoan) }); this.targetLoanOptions = Array.from(set).sort((a, b) => a - b) },
    async fetchLifecycleData(params?: { productId?: string | number }) {
      this.error = null
      try {
        const now = new Date()
        const fmt = (d: Date) => d.toISOString().slice(0, 10)
        if (params?.productId != null) {
          const s = [
            { stage: 'registration', status: 'completed', startDate: fmt(new Date(now.getFullYear(), 0, 2)), endDate: fmt(new Date(now.getFullYear(), 0, 5)), description: '完成注册与资产归档' },
            { stage: 'evaluation', status: 'completed', startDate: fmt(new Date(now.getFullYear(), 0, 6)), endDate: fmt(new Date(now.getFullYear(), 0, 18)), description: '完成质量与性能评估' },
            { stage: 'approval', status: 'completed', startDate: fmt(new Date(now.getFullYear(), 0, 19)), endDate: fmt(new Date(now.getFullYear(), 0, 22)), description: '审批通过' },
            { stage: 'deployment', status: 'in_progress', startDate: fmt(new Date(now.getFullYear(), 0, 23)), description: '上线发布中' },
            { stage: 'operation', status: 'pending', description: '运维监控准备' }
          ]
          this.lifecycleStages = s
          this.lifecycle = { currentStage: 'deployment', currentStatus: 'in_progress', stages: s }
          this.currentProductId = params.productId as any
        } else {
          const platforms = ['字节','京东','美团','百度','腾讯']
          const base = (this.products && this.products.length > 0 ? this.products : Array.from({ length: 6 }, (_, i) => ({
            id: i + 1,
            name: `平台产品-${i + 1}`,
            supplier: platforms[i % platforms.length]
          }))) as any[]
          this.lifecycleList = base.map((p: any, i: number) => {
            const s = [
              { stage: 'registration', status: 'completed', startDate: fmt(new Date(now.getFullYear(), 0, 2)), endDate: fmt(new Date(now.getFullYear(), 0, 5)) },
              { stage: 'evaluation', status: 'completed', startDate: fmt(new Date(now.getFullYear(), 0, 6)), endDate: fmt(new Date(now.getFullYear(), 0, 18)) },
              { stage: 'approval', status: i % 3 === 0 ? 'completed' : 'in_progress', startDate: fmt(new Date(now.getFullYear(), 0, 19)) },
              { stage: 'deployment', status: i % 3 === 0 ? 'in_progress' : 'pending', startDate: fmt(new Date(now.getFullYear(), 0, 23)) },
              { stage: 'operation', status: 'pending' }
            ]
            const current = s.find((x: any) => x.status === 'in_progress')?.stage || 'approval'
            const status = s.find((x: any) => x.status === 'in_progress')?.status || 'completed'
            return { productId: p.id, name: p.name, supplier: p.supplier || '—', stages: s, currentStage: current, currentStatus: status }
          })
          this.lifecycleStages = []
          this.lifecycle = {}
          this.currentProductId = null
        }
      } catch (e: any) { this.error = e?.message ?? '获取生命周期数据失败' }
    },
    async fetchServices() {
      this.error = null
      try {
        const types = ['在线批量调用', '外数离线回溯申请', '周期跑批任务申请', '全量特征回溯申请', '风险合规离线回溯申请', '外数线上调用服务申请', '外数回溯落库申请']
        const statuses = ['draft', 'approving', 'executing', 'completed']
        const creators = ['张三', '李四', '王五', '赵六', '孙七']
        
        const base = (this.products || []).map((p: any, idx: number) => {
          const now = new Date()
          const createTime = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
          
          return {
            id: String(p.id ?? idx + 1),
            name: p.name ? `${p.name}-服务` : `外数服务-${idx + 1}`,
            serviceType: types[idx % types.length],
            relatedProduct: p.name || `外数产品-${idx + 1}`,
            description: p.description || '自动生成的服务描述',
            status: statuses[idx % statuses.length],
            creator: creators[idx % creators.length],
            createdAt: createTime
          }
        })
        this.services = base
      } catch (e: any) {
        this.error = e?.message ?? '获取服务列表失败'
      }
    },
    async createService(payload: { name: string; serviceType?: string; description?: string; relatedProduct?: string; accompanyPlan?: any; workflow?: any; templateKey?: string; templateTitle?: string; applyData?: any; currentStage?: string; stages?: any[] }) {
      this.error = null
      try {
        const id = Date.now().toString()
        const item = {
          id,
          name: payload.name,
          serviceType: payload.serviceType || '在线批量调用',
          relatedProduct: payload.relatedProduct || '',
          description: payload.description || '',
          status: 'draft',
          creator: '当前用户',
          createdAt: new Date().toISOString(),
          accompanyPlan: payload.accompanyPlan || {},
          workflow: Array.isArray(payload.workflow) ? payload.workflow : [],
          templateKey: payload.templateKey,
          templateTitle: payload.templateTitle,
          applyData: payload.applyData || {},
          currentStage: payload.currentStage || 'preparation',
          stages: payload.stages || [
            { key: 'preparation', title: '样本表准备', status: 'process' },
            { key: 'validation', title: '样本表校验', status: 'wait' },
            { key: 'approval', title: '审批发起', status: 'wait' },
            { key: 'execution', title: '调用发起', status: 'wait' },
            { key: 'collection', title: '结果回收', status: 'wait' }
          ]
        }
        this.services = [item, ...(this.services || [])]
        return true
      } catch (e: any) {
        this.error = e?.message ?? '创建服务失败'
        return false
      }
    },
    async updateService(id: string, payload: Partial<{ name: string; serviceType?: string; description?: string; relatedProduct?: string; accompanyPlan?: any; workflow?: any; templateKey?: string; templateTitle?: string; applyData?: any; status?: string; currentStage?: string; stages?: any[] }>) {
      this.error = null
      try {
        const idx = (this.services || []).findIndex((x: any) => String(x.id) === String(id))
        if (idx < 0) { this.error = '未找到服务'; return false }
        const prev = (this.services as any[])[idx] || {}
        const next = {
          ...prev,
          ...payload,
          workflow: Array.isArray(payload?.workflow) ? payload?.workflow : (prev.workflow || [])
        }
        ;(this.services as any[]).splice(idx, 1, next)
        return true
      } catch (e: any) {
        this.error = e?.message ?? '更新服务失败'
        return false
      }
    },
  },
})
