import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'
import { MetricType, RegulatoryCategory, RegulatoryCategories } from '@/types/metrics'

/**
 * 生成并下载Excel模板
 * @param type 指标类型
 */
export function generateExcelTemplate(type: MetricType) {
  const workbook = XLSX.utils.book_new()
  createBusinessMetricTemplate(workbook)
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const fileName = '指标批量注册模板.xlsx'
  saveAs(blob, fileName)
}

/**
 * 创建业务核心指标模板
 */
function createBusinessMetricTemplate(workbook: XLSX.WorkBook) {
  const exampleData = [
    {
      '指标名称': 'DAU',
      '指标编码': 'USER_DAU',
      '指标域': '业务域\\监管域',
      '归属场景': '留存域',
      '计算时效': '日更新',
      '业务负责人': '张三',
      '技术负责人': '李四',
      '业务口径': '每日登录系统的去重用户数',
      '使用场景': '用户活跃度分析',
      '技术口径': 'SELECT COUNT(DISTINCT user_id) FROM dwd_user_login_detail WHERE dt = ${bizdate}',
      '技术口径使用说明': 'bizdate 为业务日期',
      '结果表': 'ads_user_metrics',
      '报表': '用户活跃度日报:{https://reports.example.com/user-dau}',
      '查询代码': 'SELECT dau FROM ads_user_metrics WHERE dt = ${bizdate}',
      '版本号': 1,
      '版本说明': '初始版本'
    }
  ]
  const worksheet = XLSX.utils.json_to_sheet(exampleData)
  const colWidths = [
    { wch: 20 },
    { wch: 20 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 30 },
    { wch: 24 },
    { wch: 50 },
    { wch: 28 },
    { wch: 20 },
    { wch: 40 },
    { wch: 40 },
    { wch: 10 },
    { wch: 20 }
  ]
  worksheet['!cols'] = colWidths
  XLSX.utils.book_append_sheet(workbook, worksheet, '指标注册')
  addInstructionSheet(workbook, MetricType.BUSINESS_CORE)
}

/**
 * 创建监管指标模板
 */
function createRegulatoryMetricTemplate(workbook: XLSX.WorkBook) {
  // 创建示例数据
  const exampleData = [
    {
      '指标名称': '资本充足率',
      '指标编码': 'REG_CAPITAL_ADEQUACY_RATIO',
      '指标分类': 'risk',
      '监管报表大类': 'cbirc_banking',
      '统计周期': '季度更新',
      '业务负责人': '李四',
      '技术负责人': '王五',
      '报表名称': '资本充足率报表',
      '业务定义': '核心资本与风险加权资产之比',
      '来源表': 'dwd_capital_adequacy',
      '技术逻辑': 'SELECT core_capital / risk_weighted_assets FROM dwd_capital_adequacy WHERE period = ${quarter}',
      '技术口径使用说明': 'quarter 为季度末日期',
      '字段说明': '百分比，保留2位小数',
      '报表链接': 'https://reports.example.com/cbirc-capital',
      '查询代码': 'SELECT * FROM ads_regulatory_metrics WHERE metric_code = \'REG_CAPITAL_ADEQUACY_RATIO\''
    }
  ]
  
  // 创建工作表
  const worksheet = XLSX.utils.json_to_sheet(exampleData)
  
  // 设置列宽
  const colWidths = [
    { wch: 20 }, // 指标名称
    { wch: 25 }, // 指标编码
    { wch: 10 }, // 指标分类
    { wch: 20 }, // 监管报表大类
    { wch: 10 }, // 统计周期
    { wch: 12 }, // 业务负责人
    { wch: 12 }, // 技术负责人
    { wch: 20 }, // 报表名称
    { wch: 30 }, // 业务定义
    { wch: 20 }, // 来源表
    { wch: 50 }, // 技术逻辑
    { wch: 28 }, // 技术口径使用说明
    { wch: 20 }, // 字段说明
    { wch: 40 }, // 报表链接
    { wch: 40 }  // 查询代码
  ]
  worksheet['!cols'] = colWidths
  
  // 添加到工作簿
  XLSX.utils.book_append_sheet(workbook, worksheet, '监管指标')
  
  // 添加监管报表大类说明
  addRegulatoryCategories(workbook)
  
  // 添加说明页
  addInstructionSheet(workbook, MetricType.REGULATORY)
}

/**
 * 添加监管报表大类说明
 */
function addRegulatoryCategories(workbook: XLSX.WorkBook) {
  const categories = Object.entries(RegulatoryCategories).map(([key, value]) => ({
    '编码': key,
    '名称': value
  }))
  
  const worksheet = XLSX.utils.json_to_sheet(categories)
  worksheet['!cols'] = [{ wch: 25 }, { wch: 40 }]
  
  XLSX.utils.book_append_sheet(workbook, worksheet, '监管报表大类')
}

/**
 * 添加说明页
 */
function addInstructionSheet(workbook: XLSX.WorkBook, type: MetricType) {
  const instructions = [
    ['批量注册指标说明'],
    [''],
    ['1. 请按照模板格式填写指标信息，不要修改表头'],
    ['2. 带*的字段为必填项（以平台实际要求为准）'],
    ['3. 指标编码必须唯一，建议使用有意义的前缀'],
    ['4. 上传前请检查数据的完整性和准确性'],
    [''],
    ['字段统一：指标域、归属场景、计算时效为通用字段'],
    ['版本信息：版本号为整数，从1开始递增；版本说明建议≤100字符']
  ]
  const worksheet = XLSX.utils.aoa_to_sheet(instructions)
  worksheet['!cols'] = [{ wch: 80 }]
  worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }]
  XLSX.utils.book_append_sheet(workbook, worksheet, '使用说明')
}

/**
 * 解析上传的Excel文件
 * @param file 上传的文件
 * @param type 指标类型
 * @returns Promise<解析结果>
 */
export function parseExcelFile(file: File, type: MetricType): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        
        // 获取第一个工作表
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        
        // 转换为JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        
        // 根据指标类型处理数据
        const processedData = processExcelData(jsonData, type)
        resolve(processedData)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = (error) => reject(error)
    reader.readAsArrayBuffer(file)
  })
}

/**
 * 处理Excel数据
 * @param data Excel解析的JSON数据
 * @param type 指标类型
 * @returns 处理后的数据
 */
function processExcelData(data: any[], type: MetricType) {
  return data.map((row, index) => {
    const reportRaw = String(row['报表'] || '').trim()
    let reportName = ''
    let reportUrl = ''
    if (reportRaw) {
      const m = reportRaw.match(/^(.+?):\{(https?:\/\/[^}]+)\}$/)
      if (m) {
        reportName = m[1]
        reportUrl = m[2]
      } else {
        reportName = reportRaw
      }
    }
    return {
      rowIndex: index + 2,
      type,
      name: row['指标名称'],
      code: row['指标编码'],
      category: row['指标域'],
      scene: row['归属场景'],
      businessDefinition: row['业务口径'],
      useCase: row['使用场景'],
      statisticalPeriod: row['计算时效'],
      technicalCaliber: row['技术口径'],
      technicalUsageNote: row['技术口径使用说明'],
      resultTable: row['结果表'],
      reportName,
      reportUrl,
      queryCode: row['查询代码'],
      businessOwner: row['业务负责人'],
      technicalOwner: row['技术负责人'],
      version: typeof row['版本号'] === 'number' ? row['版本号'] : parseInt(String(row['版本号'] || '1'), 10),
      versionDescription: row['版本说明']
    }
  })
}

/**
 * 导出错误数据到Excel
 * @param errorData 错误数据
 * @param type 指标类型
 */
export function exportErrorData(errorData: any[], type: MetricType) {
  const workbook = XLSX.utils.book_new()
  
  // 转换数据格式
  const formattedData = errorData.map(item => ({
    '指标名称': item.name,
    '指标编码': item.code,
    '指标域': item.category,
    '归属场景': item.scene,
    '计算时效': item.statisticalPeriod,
    '业务负责人': item.businessOwner,
    '技术负责人': item.technicalOwner,
    '业务定义': item.businessDefinition,
    '使用场景': item.useCase,
    '结果表': item.resultTable,
    '技术口径': item.technicalCaliber || item.processingLogic,
    '技术口径使用说明': item.technicalUsageNote,
    '报表': (item.reportName && item.reportUrl) ? `${item.reportName}:{${item.reportUrl}}` : (item.reportName || ''),
    '查询代码': item.queryCode,
    '版本号': item.version,
    '版本说明': item.versionDescription,
    '错误信息': (item.errors || []).join('\n')
  }))
  
  // 创建工作表
  const worksheet = XLSX.utils.json_to_sheet(formattedData)
  
  // 添加到工作簿
  const sheetName = type === MetricType.BUSINESS_CORE ? '业务核心指标错误数据' : '监管指标错误数据'
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  
  // 生成二进制数据
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  
  // 下载文件
  const fileName = type === MetricType.BUSINESS_CORE ? '业务核心指标错误数据.xlsx' : '监管指标错误数据.xlsx'
  saveAs(blob, fileName)
}
