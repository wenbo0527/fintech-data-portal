/**
 * @data-community/semantic-contract —— 语义底座契约包（语义层唯一事实源）
 *
 * 职责：
 * 1. 集中定义指标 / 术语 / 部门语境等语义层类型与标签常量；
 * 2. 提供内置基准 mock 数据（mockMetrics / mockBusinessStages / mockTerms），
 *    以模块级单例数组导出，供各子应用就地变更（splice/push）后全仓同步可见；
 * 3. 提供只读查询 API（按编码/别名/部门检索、跨系统编码映射解析）；
 * 4. 维护 externalRefs 跨系统指标编码映射：语义底座标准指标 ↔ dfd-app /
 *    data-community-app / dmt-app 各自 mock 中真实存在的指标编码，仅在语义一致时建立。
 *
 * 约定：本包为"源码直出"包（package.json main/exports 直指 ./src/index.ts），无构建产物；
 * 消费方通过 workspace 依赖 + tsconfig paths / vite alias 解析到源码。
 * 任何子应用都不得复制本包数组或对其重新赋值。
 */
export * from './types'
export * from './data/metrics'
export * from './data/knowledge'
export * from './query'
