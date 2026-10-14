/**
 * 语义契约：内置指标基准数据（唯一事实源）。
 * 说明：本数组实例会被 semantic-app 就地变更（splice/push）以同步所有消费方，
 * 任何子应用都不得复制此数组或重新赋值，只能 import 后 re-export。
 * externalRefs：语义底座标准指标 ↔ 其他子应用（dfd-app / data-community-app / dmt-app）
 * mock 中真实存在的指标编码映射，仅在语义确实一致时建立，口径有差异时用 note 标注。
 */
import type { Metric } from '../types'

export const mockMetrics: Metric[] = [
  {
    id: 'metric_fpd30',
    name: '首逾率',
    code: 'fpd30',
    category: '风控指标',
    maintainedBy: '风控数据团队',
    updatedAt: '2026-09-01',
    status: 'published',
    aliases: ['首逾', 'FPD', '首期逾期率'],
    alertThreshold: 5,
    alertEnabled: true,
    definitions: [
      {
        id: 'def_fpd30_m1',
        caliberName: 'M1+口径',
        formula: '首次逾期发生在放款后30天内的贷款笔数 / 总放款笔数',
        sourceSystem: '风控系统',
        version: 'v2.1'
      },
      {
        id: 'def_fpd30_m3',
        caliberName: 'M3+口径',
        formula: '放款后90天内首次逾期的贷款笔数 / 总放款笔数',
        sourceSystem: '数仓报表',
        version: 'v1.8'
      },
      {
        id: 'def_fpd30_reg',
        caliberName: '监管口径',
        formula: '放款后60天内首次逾期的贷款笔数 / 总放款笔数',
        sourceSystem: '监管报送',
        version: 'v1.0'
      }
    ],
    tables: [
      {
        tableId: 'tbl_loan',
        tableName: 'loan_table',
        tableCnName: '贷款记录表',
        role: 'denominator',
        fields: ['fld_loan_amount', 'fld_issue_date']
      },
      {
        tableId: 'tbl_overdue',
        tableName: 'overdue_record',
        tableCnName: '逾期记录表',
        role: 'numerator',
        fields: ['fld_overdue_days', 'fld_record_date']
      }
    ],
    changeHistory: [
      { time: '2026-09-01', operator: '风控数据团队', action: '口径公式变更', description: 'M1+口径分子统计窗口由"放款后29天内首次逾期"调整为"放款后30天内"，版本 v2.0 → v2.1' },
      { time: '2026-07-15', operator: '风控数据团队', action: '新增口径', description: '上线监管口径（放款后60天内首次逾期），用于监管报送，版本 v1.0' },
      { time: '2026-06-02', operator: '风控数据团队', action: '预警阈值调整', description: '预警阈值由 6% 收紧至 5%' },
      { time: '2026-04-18', operator: '平台管理员', action: '指标发布', description: '通过口径评审，正式发布至语义底座并开放Agent问答' }
    ],
    externalRefs: [
      {
        app: 'data-community',
        code: 'FPD30_RATE',
        name: '首期逾期率',
        note: '社区口径按"首期逾期30天以上客户数 / 当期放款客户数"（客户维度、逾期门槛≥30天）；本契约 M1+口径为放款后30天内首次逾期的贷款笔数，统计对象与时窗均不同，不可直接等价'
      }
    ]
  },
  {
    id: 'metric_overdue_rate',
    name: '逾期率',
    code: 'overdue_rate',
    category: '风控指标',
    maintainedBy: '风控数据团队',
    updatedAt: '2026-09-05',
    status: 'published',
    aliases: ['当前逾期率', '逾期占比'],
    alertThreshold: 8,
    alertEnabled: true,
    definitions: [
      {
        id: 'def_overdue_m1',
        caliberName: 'M1+口径',
        formula: '当前逾期1-30天的贷款余额 / 总贷款余额',
        sourceSystem: '风控系统',
        version: 'v2.0'
      },
      {
        id: 'def_overdue_m3',
        caliberName: 'M3+口径',
        formula: '当前逾期61-90天的贷款余额 / 总贷款余额',
        sourceSystem: '数仓报表',
        version: 'v1.5'
      }
    ],
    tables: [
      {
        tableId: 'tbl_loan',
        tableName: 'loan_table',
        tableCnName: '贷款记录表',
        role: 'denominator',
        fields: ['fld_loan_amount']
      },
      {
        tableId: 'tbl_overdue',
        tableName: 'overdue_record',
        tableCnName: '逾期记录表',
        role: 'numerator',
        fields: ['fld_overdue_days', 'fld_record_date']
      }
    ]
    // 外部系统暂无与"逾期率（M1+/M3+ 贷款余额口径）"语义一致的指标：
    // 数据社区仅有首期逾期率（首逾概念）、dmt 仅有风险事件触发次数，均非同一指标，故不做映射
  },
  {
    id: 'metric_repurchase',
    name: '复购率',
    code: 'repurchase_rate',
    category: '业务指标',
    maintainedBy: '运营数据团队',
    updatedAt: '2026-08-20',
    status: 'published',
    aliases: ['复借率', '老客复购率'],
    alertThreshold: 15,
    alertEnabled: false,
    definitions: [
      {
        id: 'def_repurchase_90',
        caliberName: '90天复购口径',
        formula: '放款后90天内再次借款的客户数 / 总借款客户数',
        sourceSystem: '运营系统',
        version: 'v1.2'
      }
    ],
    tables: [
      {
        tableId: 'tbl_loan',
        tableName: 'loan_table',
        tableCnName: '贷款记录表',
        role: 'denominator',
        fields: ['fld_customer_id', 'fld_loan_amount']
      },
      {
        tableId: 'tbl_repayment',
        tableName: 'repayment_record',
        tableCnName: '还款记录表',
        role: 'dimension',
        fields: ['fld_actual_date', 'fld_amount_paid']
      }
    ],
    externalRefs: [
      {
        app: 'data-community',
        code: 'REPEAT_LOAN_RATE',
        name: '复贷率',
        note: '社区口径为"统计期内结清后再次申请贷款客户数 / 总放款客户数"（不含续贷与展期）；本契约限定放款后90天窗口，时间约束不同'
      }
    ]
  },
  {
    id: 'metric_apply_approval',
    name: '申请通过率',
    code: 'apply_approval_rate',
    category: '业务指标',
    maintainedBy: '信贷审批团队',
    updatedAt: '2026-09-10',
    status: 'pending',
    aliases: ['通过率', '放款通过率'],
    alertThreshold: 40,
    alertEnabled: false,
    definitions: [
      {
        id: 'def_approval_final',
        caliberName: '终审通过口径',
        formula: '终审通过的申请笔数 / 完成审批的申请笔数',
        sourceSystem: '信贷审批系统',
        version: 'v1.3'
      },
      {
        id: 'def_approval_pre',
        caliberName: '预授信口径',
        formula: '初审通过申请笔数 / 提交申请总笔数',
        sourceSystem: '风控系统',
        version: 'v1.0'
      }
    ],
    tables: [
      {
        tableId: 'tbl_apply',
        tableName: 'loan_apply',
        tableCnName: '贷款申请表',
        role: 'denominator',
        fields: ['fld_apply_id', 'fld_apply_date']
      },
      {
        tableId: 'tbl_approval',
        tableName: 'approval_record',
        tableCnName: '审批记录表',
        role: 'numerator',
        fields: ['fld_approval_result', 'fld_approval_date']
      }
    ],
    changeHistory: [
      { time: '2026-09-10', operator: '信贷审批团队', action: '提交审批', description: '状态：草稿 → 待审批，申请发布终审通过口径' },
      { time: '2026-09-08', operator: '信贷审批团队', action: '指标创建', description: '新建申请通过率指标，补充预授信口径以备比口径差异' }
    ],
    externalRefs: [
      {
        app: 'dfd',
        code: 'A00043',
        name: '当日风控授信通过笔数',
        note: '工厂侧为通过"笔数"绝对量（非比率），Agent 取数后需换算为比率才能与本指标比对'
      },
      {
        app: 'data-community',
        code: 'CREDIT_PASS_RATE',
        name: '授信通过率',
        note: '社区口径按自然人去重取最新审批结果、分母为授信申请笔数，接近本契约终审通过口径'
      },
      {
        app: 'dmt',
        code: 'loan_approval_rate',
        name: '贷款通过率',
        note: '数据地图已上架资产，描述为"贷款申请的通过率"，未区分终审/预授信口径'
      }
    ]
  },
  {
    id: 'metric_limit_usage',
    name: '额度使用率',
    code: 'limit_usage_rate',
    category: '业务指标',
    maintainedBy: '资产运营团队',
    updatedAt: '2026-09-08',
    status: 'published',
    aliases: ['额度占用率', '用信率'],
    alertThreshold: 85,
    alertEnabled: true,
    definitions: [
      {
        id: 'def_limit_all',
        caliberName: '全额度口径',
        formula: '在贷本金余额 / 已授予固定额度总额',
        sourceSystem: '数仓报表',
        version: 'v2.0'
      },
      {
        id: 'def_limit_active',
        caliberName: '有效额度口径',
        formula: '在贷本金余额 / 状态有效的授信额度',
        sourceSystem: '授信管理系统',
        version: 'v1.1'
      }
    ],
    tables: [
      {
        tableId: 'tbl_loan',
        tableName: 'loan_table',
        tableCnName: '贷款记录表',
        role: 'numerator',
        fields: ['fld_loan_balance', 'fld_issue_date']
      },
      {
        tableId: 'tbl_credit',
        tableName: 'credit_limit_table',
        tableCnName: '客户额度表',
        role: 'denominator',
        fields: ['fld_customer_id', 'fld_credit_limit']
      }
    ],
    changeHistory: [
      { time: '2026-09-08', operator: '资产运营团队', action: '口径公式变更', description: '全额度口径分母由"含临时额度"调整为"仅固定授信额度"，版本 v1.9 → v2.0' },
      { time: '2026-08-12', operator: '资产运营团队', action: '预警启用', description: '额度使用率阈值 85% 预警正式启用，对接日报推送' },
      { time: '2026-07-30', operator: '平台管理员', action: '指标发布', description: '双口径通过评审，发布至语义底座' }
    ]
    // dmt 侧 avg_credit_limit 是"平均授信额度"（额度绝对值），与本指标（余额/额度的比率）语义不同，不做映射
  },
  {
    id: 'metric_prepay',
    name: '提前还款率',
    code: 'prepay_rate',
    category: '业务指标',
    maintainedBy: '运营数据团队',
    updatedAt: '2026-08-28',
    status: 'draft',
    aliases: ['提前结清率'],
    alertThreshold: 20,
    alertEnabled: false,
    definitions: [
      {
        id: 'def_prepay_term',
        caliberName: '结清提前口径',
        formula: '实际还款日早于应还日期的笔数 / 已还款总笔数',
        sourceSystem: '支付系统',
        version: 'v1.4'
      }
    ],
    tables: [
      {
        tableId: 'tbl_repayment',
        tableName: 'repayment_record',
        tableCnName: '还款记录表',
        role: 'numerator',
        fields: ['fld_due_date', 'fld_actual_date']
      },
      {
        tableId: 'tbl_loan',
        tableName: 'loan_table',
        tableCnName: '贷款记录表',
        role: 'denominator',
        fields: ['fld_loan_amount', 'fld_issue_date']
      }
    ]
    // 三个外部系统 mock 中均无"提前还款/提前结清"语义的指标，故不做映射
  },
  {
    id: 'metric_npl',
    name: '不良贷款率',
    code: 'npl_rate',
    category: '风控指标',
    maintainedBy: '风控数据团队',
    updatedAt: '2026-09-12',
    status: 'published',
    aliases: ['不良率', 'NPL'],
    alertThreshold: 3,
    alertEnabled: true,
    definitions: [
      {
        id: 'def_npl_reg',
        caliberName: '监管口径',
        formula: '逾期90天以上贷款余额 / 总贷款余额',
        sourceSystem: '监管报送',
        version: 'v1.2'
      },
      {
        id: 'def_npl_internal',
        caliberName: '内部分类口径',
        formula: '次级、可疑、损失三类贷款余额 / 总贷款余额',
        sourceSystem: '风控系统',
        version: 'v1.6'
      }
    ],
    tables: [
      {
        tableId: 'tbl_overdue',
        tableName: 'overdue_record',
        tableCnName: '逾期记录表',
        role: 'numerator',
        fields: ['fld_overdue_days', 'fld_record_date']
      },
      {
        tableId: 'tbl_loan',
        tableName: 'loan_table',
        tableCnName: '贷款记录表',
        role: 'denominator',
        fields: ['fld_loan_balance', 'fld_loan_amount']
      }
    ],
    changeHistory: [
      { time: '2026-09-12', operator: '风控数据团队', action: '口径公式变更', description: '监管口径逾期分档由 60 天+ 对齐至 90 天+（银保监五级分类要求），版本 v1.1 → v1.2' },
      { time: '2026-08-25', operator: '风控数据团队', action: '新增口径', description: '上线内部分类口径（次级/可疑/损失），供内部风险委员会使用' },
      { time: '2026-08-01', operator: '平台管理员', action: '指标发布', description: '不良贷款率监管口径通过评审发布' }
    ],
    externalRefs: [
      {
        app: 'dfd',
        code: 'REG_005',
        name: '信贷资产质量不良率',
        note: '工厂侧为监管报送指标（不良贷款余额/贷款总额），与本契约监管口径一致'
      },
      {
        app: 'data-community',
        code: 'NPL_RATIO',
        name: '不良贷款率',
        note: '社区侧按银保监会G01五级分类口径，对应本契约内部分类口径（次级/可疑/损失）'
      }
    ]
  },
  {
    id: 'metric_recovery',
    name: '资金回收率',
    code: 'recovery_rate',
    category: '风控指标',
    maintainedBy: '催收管理团队',
    updatedAt: '2026-09-02',
    status: 'offline',
    aliases: ['催收回收率', '回款率'],
    alertThreshold: 70,
    alertEnabled: false,
    definitions: [
      {
        id: 'def_recovery_cash',
        caliberName: '现金回收口径',
        formula: '累计实还金额 / 应还总金额',
        sourceSystem: '催收系统',
        version: 'v1.0'
      }
    ],
    tables: [
      {
        tableId: 'tbl_repayment',
        tableName: 'repayment_record',
        tableCnName: '还款记录表',
        role: 'numerator',
        fields: ['fld_amount_paid', 'fld_actual_date']
      },
      {
        tableId: 'tbl_loan',
        tableName: 'loan_table',
        tableCnName: '贷款记录表',
        role: 'denominator',
        fields: ['fld_loan_amount', 'fld_issue_date']
      }
    ],
    changeHistory: [
      { time: '2026-09-02', operator: '催收管理团队', action: '指标下线', description: '现金回收口径与财务核销口径存在歧义，下线整改，待切换新口径后重新发布' },
      { time: '2026-06-18', operator: '平台管理员', action: '指标发布', description: '现金回收口径通过评审发布' }
    ],
    externalRefs: [
      {
        app: 'dmt',
        code: 'fund_repayment_rate',
        name: '资金回款率',
        note: '地图侧描述为"放款资金按时回款率"（强调按期回款），本契约按累计实还/应还的现金回收口径，分子时点不同；且本指标当前为已下线状态'
      }
    ]
  }
]
