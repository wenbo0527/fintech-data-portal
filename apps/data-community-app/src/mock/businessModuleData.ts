export type ModuleStatus = 'enabled' | 'disabled'
export type ModuleCategory = 'domain' | 'scenario' | 'virtual'

export interface ModuleNode {
  id: string
  name: string
  type: 'physical' | 'virtual'
  status: ModuleStatus
  category: ModuleCategory
  parentId?: string
  children?: ModuleNode[]
}

export const domainTree: ModuleNode[] = [
  { id: 'd-100', name: '风控业务域', type: 'physical', category: 'domain', status: 'enabled', children: [
    { id: 's-101', name: '贷前分析', type: 'physical', category: 'scenario', status: 'enabled', parentId: 'd-100' },
    { id: 's-102', name: '风险评估', type: 'physical', category: 'scenario', status: 'enabled', parentId: 'd-100' }
  ]},
  { id: 'd-200', name: '营销业务域', type: 'physical', category: 'domain', status: 'enabled', children: [
    { id: 's-201', name: '用户增长', type: 'physical', category: 'scenario', status: 'enabled', parentId: 'd-200' }
  ]}
]

export const buildCascaderOptions = (tree: ModuleNode[]) => {
  return tree.map(d => ({
    value: d.id,
    label: d.name,
    children: (d.children || []).map(s => ({
      value: s.id,
      label: s.name
    }))
  }))
}

export const findDomainNameById = (id: string) => {
  const d = domainTree.find(x => x.id === id)
  return d ? d.name : ''
}

export const findScenarioNameById = (id: string) => {
  for (const d of domainTree) {
    const s = (d.children || []).find(x => x.id === id)
    if (s) {return s.name}
  }
  return ''
}

