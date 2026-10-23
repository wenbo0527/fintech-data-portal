import { ref } from 'vue'

/**
 * 人群分流节点日志器
 * 用途：收集节点配置过程中的行为日志（校验/选择/层级操作等），供抽屉日志面板与调试面板展示
 * 说明：单例导出，logs 为原始日志数组，version 为响应式版本号（每次写入自增，用于驱动 UI 刷新）
 * 边界：仅内存存储，不做持久化；日志上限由 maxLogs 控制，超出后丢弃最旧记录
 */
class CrowdSplitLogger {
  constructor() {
    this.logs = []
    this.sessionId = String(Date.now())
    this.maxLogs = 1000
    // 响应式版本号：写入日志后自增，UI 通过读取它建立依赖从而自动刷新
    this.version = ref(0)
  }

  /**
   * 写入一条日志
   * @param {string} level 日志级别 debug/info/warn/error
   * @param {string} category 日志分类
   * @param {string|object} message 日志内容
   * @param {object} extra 附加信息
   */
  _push(level, category, message, extra) {
    this.logs.push({ level, category, message: typeof message === 'string' ? message : JSON.stringify(message), extra, timestamp: Date.now() })
    if (this.logs.length > this.maxLogs) this.logs.splice(0, this.logs.length - this.maxLogs)
    this.version.value++
  }

  /** 记录调试级日志 */
  debug(c, m, e) { this._push('debug', c, m, e) }

  /** 记录信息级日志 */
  info(c, m, e) { this._push('info', c, m, e) }

  /** 记录警告级日志 */
  warn(c, m, e) { this._push('warn', c, m, e) }

  /** 记录错误级日志 */
  error(c, m, e) { this._push('error', c, m, e) }

  /**
   * 记录表单校验结果
   * @param {boolean} isValid 是否通过
   * @param {string[]} errors 错误信息列表
   * @param {object} formData 当前表单数据
   */
  logValidation(isValid, errors, formData) { this._push(isValid ? 'info' : 'warn', 'VALIDATION', isValid ? 'valid' : (errors || []).join(', '), { formData }) }

  /**
   * 记录接口调用
   * @param {string} url 请求地址
   * @param {string} method 请求方法
   * @param {number|string} status 响应状态
   * @param {number} time 耗时
   */
  logApiCall(url, method, status, time) { this._push('info', 'API_CALL', `${method} ${url} [${status}]`, { time }) }

  /**
   * 记录表单数据变化
   * @param {string} title 变化描述
   * @param {object} data 变化后的数据
   */
  logFormDataChange(title, data) { this._push('debug', 'FORM_CHANGE', title, { data }) }

  /**
   * 记录人群选择
   * @param {number} index 层级下标
   * @param {number|string} id 人群 ID
   * @param {string} name 人群名称
   */
  logCrowdSelection(index, id, name) { this._push('info', 'CROWD_SELECT', `index=${index} id=${id} name=${name}`) }

  /**
   * 记录层级操作（新增/移除）
   * @param {string} op 操作名
   * @param {number} index 层级下标
   * @param {object} extra 附加信息
   */
  logLayerOperation(op, index, extra) { this._push('info', 'LAYER_OP', `${op} index=${index}`, extra) }

  /** 导出全部日志（结构化快照） */
  exportLogs() { return { sessionId: this.sessionId, exportTime: Date.now(), logs: this.logs } }

  /** 清空全部日志 */
  clearLogs() { this.logs = []; this.version.value++ }

  /**
   * 统计日志汇总信息
   * @returns {{totalLogs:number, logsByLevel:object}} 日志总数与各级别数量
   */
  getLogSummary() {
    const s = { debug: 0, info: 0, warn: 0, error: 0 }
    this.logs.forEach(l => { s[l.level] = (s[l.level] || 0) + 1 })
    return { totalLogs: this.logs.length, logsByLevel: s }
  }
}

export default new CrowdSplitLogger()
/*
用途：人群分流节点日志器（单例）
说明：_push 统一写入并自增 version（响应式版本号）供 UI 刷新；getLogSummary/exportLogs/clearLogs 对齐归档版能力
边界：仅内存存储，不持久化；超出 maxLogs 丢弃最旧日志
*/
