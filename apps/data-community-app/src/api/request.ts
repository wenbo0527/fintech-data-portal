/**
 * dfd-app request 入口
 * 已迁移到 @app/shared-api/request (链 B P1 B1 任务 TASK-20260712-423A9170)
 * 
 * 拦截器变更:
 * - 业务错误: 现在弹 Message.error (dfd-app 旧版本不弹)
 * - 401 跳转延迟: 300ms → 1000ms
 * - Network Error: 现在弹提示
 * - HTTP 错误分类: 新增 400/403/404/500/502/503 分类处理
 *
 * 如果 dfd-app 业务流不接受 UX 微调, 回滚 .legacy 文件 + 报 PM 评估
 */
import request from '@app/shared-api/request'

export default request
