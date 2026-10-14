/**
 * 语义契约：只读查询 API。
 * 所有查询都基于契约包内的单例数组（mockMetrics / mockBusinessStages），
 * 因此消费方对数组做的就地变更（新增/修改/下线指标）会立即反映在查询结果中。
 */
import type { Department, ExternalAppId, ExternalMetricRef, Metric } from './types'
import { mockMetrics } from './data/metrics'
import { mockBusinessStages } from './data/knowledge'

/** 按标准编码精确查找指标 */
export function findByCode(code: string): Metric | undefined {
  return mockMetrics.find(m => m.code === code)
}

/** 按指标 id 查找 */
export function findById(id: string): Metric | undefined {
  return mockMetrics.find(m => m.id === id)
}

/**
 * 按自然语言文本检索指标：命中 名称 / 编码 / 别名（大小写不敏感）。
 * 返回全部命中项，按"完全匹配优先"排序，便于 Agent 侧做歧义提示。
 */
export function findByAlias(text: string): Metric[] {
  const kw = (text || '').trim().toLowerCase()
  if (!kw) return []
  return mockMetrics
    .map(m => {
      const name = m.name.toLowerCase()
      const code = m.code.toLowerCase()
      const hitExact = name === kw || code === kw || m.aliases.some(a => a.toLowerCase() === kw)
      const hitPart =
        name.includes(kw) ||
        code.includes(kw) ||
        m.aliases.some(a => a.toLowerCase().includes(kw))
      return { metric: m, score: hitExact ? 2 : hitPart ? 1 : 0 }
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(r => r.metric)
}

/** 已发布指标列表 */
export function listPublished(): Metric[] {
  return mockMetrics.filter(m => m.status === 'published')
}

/** 全部指标（契约当前态，非拷贝，供只读遍历） */
export function listAllMetrics(): Metric[] {
  return mockMetrics
}

/**
 * 解析标准指标在各外部系统（dfd / data-community / dmt）中的指标编码引用。
 * 入参既支持标准编码（code），也兼容指标 id；无映射时返回空数组。
 */
export function resolveExternalRefs(canonicalCode: string): ExternalMetricRef[] {
  const metric = findByCode(canonicalCode) ?? findById(canonicalCode)
  return metric?.externalRefs ?? []
}

/** 反向映射：由外部系统的指标编码找到语义底座对应的标准指标 */
export function findCanonicalByExternal(app: ExternalAppId, code: string): Metric | undefined {
  const target = (code || '').trim().toLowerCase()
  return mockMetrics.find(m =>
    m.externalRefs?.some(r => r.app === app && r.code.toLowerCase() === target)
  )
}

/**
 * 按业务部门列出该部门语境下挂载的指标（从业务阶段 → 部门语境反查，按编码去重）。
 * 指标本体仍取自 mockMetrics 单例，语境中仅登记了编码的悬空引用会被忽略。
 */
export function listByDepartment(department: Department): Metric[] {
  const codes = new Set<string>()
  mockBusinessStages.forEach(stage => {
    stage.contexts
      .filter(ctx => ctx.department === department)
      .forEach(ctx => ctx.metrics.forEach(m => codes.add(m.metricCode)))
  })
  return mockMetrics.filter(m => codes.has(m.code))
}

/** 按业务部门列出其部门语境（阶段 + 语境原文，供 Agent 做语境化回答） */
export function listContextsByDepartment(department: Department) {
  return mockBusinessStages.flatMap(stage =>
    stage.contexts
      .filter(ctx => ctx.department === department)
      .map(ctx => ({ stageId: stage.stageId, stageName: stage.stageName, context: ctx }))
  )
}
