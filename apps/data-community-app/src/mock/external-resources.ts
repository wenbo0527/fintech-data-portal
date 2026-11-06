/**
 * 外部数据(三方数据源)资源列表 mock 数据
 * 被 searchApi(全局搜索) 与 discovery/external 页面共享,保持单一数据源避免漂移
 */
export interface ExternalResource {
  interfaceId: string
  dataName: string
  dataType: string
  subType: string
  supplier: string
  dataManagement: string
  onlineTime: string
  isFavorite: boolean
}

export const externalResources: ExternalResource[] = [
  { interfaceId: 'IF001', dataName: '身份证二要素核验', dataType: '核验类', subType: '', supplier: '公安系统', dataManagement: '实时', onlineTime: '2024-01-15', isFavorite: true },
  { interfaceId: 'IF002', dataName: '手机号三要素核验', dataType: '核验类', subType: '', supplier: '运营商', dataManagement: '实时', onlineTime: '2024-01-20', isFavorite: false },
  { interfaceId: 'IF003', dataName: '人行征信评分', dataType: '评分类', subType: '信用分', supplier: '人行征信', dataManagement: 'T+1', onlineTime: '2024-02-01', isFavorite: true },
  { interfaceId: 'IF004', dataName: '同盾欺诈分', dataType: '评分类', subType: '欺诈分', supplier: '同盾科技', dataManagement: '实时', onlineTime: '2024-02-10', isFavorite: false },
  { interfaceId: 'IF005', dataName: '银联消费标签', dataType: '标签类', subType: '消费能力', supplier: '银联', dataManagement: 'T+1', onlineTime: '2024-03-01', isFavorite: false },
  { interfaceId: 'IF006', dataName: '黑名单核查', dataType: '名单类', subType: '多头借贷', supplier: '百融', dataManagement: '实时', onlineTime: '2024-03-15', isFavorite: true },
  { interfaceId: 'IF007', dataName: '房产评估价', dataType: '价格评估类', subType: '抵押估值', supplier: '中估联', dataManagement: 'T+1', onlineTime: '2024-04-01', isFavorite: false },
  { interfaceId: 'IF008', dataName: '车辆评估价', dataType: '价格评估类', subType: '车辆估值', supplier: '车300', dataManagement: '实时', onlineTime: '2024-04-10', isFavorite: false }
]
