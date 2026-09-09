export const PROFILE_FIELD_SCHEMAS = {
  behavior: [
    { key: 'categoryLevel1', label: '一级分类' },
    { key: 'categoryLevel2', label: '二级分类' },
    { key: 'interfaceName', label: '接口名' },
    { key: 'originEnName', label: '原产英文名' },
    { key: 'changedEnName', label: '变更英文名' },
    { key: 'stdEnName', label: '标准化后英文名' },
    { key: 'cnName', label: '中文名' },
    { key: 'meaning', label: '特征含义' },
    { key: 'businessLogic', label: '业务逻辑' },
    { key: 'codeLogic', label: '代码逻辑' },
    { key: 'processingLogic', label: '加工逻辑（历史）' },
    { key: 'fieldType', label: '字段类型' },
    { key: 'defaultValue', label: '默认值' },
    { key: 'sourceTable', label: '来源表' },
    { key: 'sourceTableBigData', label: '来源表（大数据）' },
    { key: 'tags', label: '标签' },
    { key: 'dimensions', label: '维度' },
    { key: 'onlineTime', label: '上线时间' },
    { key: 'status', label: '当前状态' },
    { key: 'remark', label: '备注' }
  ],
  credit: [
    { key: 'categoryLevel1', label: '一级分类' },
    { key: 'categoryLevel2', label: '二级分类' },
    { key: 'interfaceName', label: '接口名' },
    { key: 'originEnName', label: '原产英文名' },
    { key: 'changedEnName', label: '变更英文名' },
    { key: 'stdVariableEnName', label: '标准化特征英文名' },
    { key: 'stdVariableCnName', label: '标准化特征中文名' },
    { key: 'businessLogic', label: '业务逻辑' },
    { key: 'codeLogic', label: '代码逻辑' },
    { key: 'processingLogic', label: '加工逻辑（历史）' },
    { key: 'fieldType', label: '字段类型' },
    { key: 'defaultValue', label: '默认值' },
    { key: 'sourceTable', label: '来源表' },
    { key: 'stdTable', label: '标准化表' },
    { key: 'tags', label: '标签' },
    { key: 'onlineTime', label: '上线时间' },
    { key: 'status', label: '当前状态' },
    { key: 'remark', label: '备注' },
    { key: 'orgList', label: '组织单' },
    { key: 'grayList', label: '灰名单' }
  ],
  external: [
    { key: 'dataType', label: '数据类型' },
    { key: 'dataTypeLevel2', label: '数据类型二级分类' },
    { key: 'apiNo', label: '接口号' },
    { key: 'tableField', label: '表字段' },
    { key: 'normalizedField', label: '规范后字段' },
    { key: 'fieldDesc', label: '字段描述' },
    { key: 'fieldType', label: '字段类型' },
    { key: 'tableName', label: '表名' },
    { key: 'onlineOfflineTime', label: '上下线时间' },
    { key: 'onlineStatus', label: '上下线状态' },
    { key: 'responseField', label: '响应字段' }
  ]
} as const

export const LIFECYCLE_SUPPLEMENT_GUIDE = {
  registration: '分类、命名、含义/口径、加工逻辑、字段类型/默认值、来源信息',
  evaluation: '评估得分、缺失率/覆盖率、标签/维度、关联分析报告',
  accompany: '陪跑计划信息、灰度/白名单、验收信息',
  publish: '上线时间、上下线状态、接口/表字段映射、发布说明',
  operation: '使用场景、效果监控、成本/预算、异常告警',
  archived: '下线时间、归档原因、影响范围确认'
} as const
