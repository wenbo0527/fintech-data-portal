import { ref } from 'vue'
import { BusinessConceptStore } from '@mock-shared/business-concept-store'
import { deriveEntities, deriveRelations, type DemoRelation } from './derive'

const STORAGE_KEY = 'dca-datamap-demo-relations'

const BASE: DemoRelation[] = deriveRelations()

function load (): DemoRelation[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {return null}
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function persist () {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(relations.value))
  } catch {
    // 无痕模式/配额不足时静默降级为仅内存
  }
}

export const relations = ref<DemoRelation[]>(load() ?? BASE.map(r => ({ ...r })))

export function isDirty () {
  return relations.value.length !== BASE.length ||
    JSON.stringify(relations.value) !== JSON.stringify(BASE)
}

export function addRelation (input: Pick<DemoRelation, 'src' | 'dst' | 'type' | 'label' | 'description'>) {
  const id = `REL-LOCAL-${Date.now().toString(36)}`
  relations.value = [...relations.value, { id, ...input }]
  persist()
  return id
}

export function updateRelation (id: string, patch: Partial<DemoRelation>) {
  relations.value = relations.value.map(r => (r.id === id ? { ...r, ...patch } : r))
  persist()
}

export function removeRelation (id: string) {
  relations.value = relations.value.filter(r => r.id !== id)
  persist()
}

export function resetRelations () {
  relations.value = BASE.map(r => ({ ...r }))
  persist()
}

export function exportedJson () {
  return JSON.stringify(relations.value, null, 2)
}

export interface RelationCandidate {
  src: string
  dst: string
  label: string
  sourceText: string
}

const NAME_TO_CODE = new Map(deriveEntities().map(e => [e.name, e.id]))

/**
 * 候选关系：来自实体自带的 coreRelations（业务侧已声明过的关系清单），
 * 与当前 relations 求差集。不新增任何编造的关系，只是把「已声明但未建边」的补上。
 */
export function relationCandidates (): RelationCandidate[] {
  const entities = BusinessConceptStore.getEntities()
  const existing = new Set(
    relations.value.map(r => [r.src, r.dst].sort().join('|'))
  )
  const out: RelationCandidate[] = []
  const seen = new Set<string>()
  for (const e of entities) {
    for (const name of e.coreRelations) {
      const other = NAME_TO_CODE.get(name)
      if (!other || other === e.code) {continue}
      const key = [e.code, other].sort().join('|')
      if (existing.has(key) || seen.has(key)) {continue}
      seen.add(key)
      out.push({
        src: e.code,
        dst: other,
        label: '关联',
        sourceText: `${e.name} 的 coreRelations 声明`
      })
    }
  }
  return out
}

export function pairExists (src: string, dst: string) {
  const key = [src, dst].sort().join('|')
  return relations.value.some(r => [r.src, r.dst].sort().join('|') === key)
}