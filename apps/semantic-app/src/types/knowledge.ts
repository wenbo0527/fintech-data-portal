/**
 * 知识（业务阶段 / 部门语境 / 术语）相关类型：类型事实源已上移到
 * @data-community/semantic-contract，本文件仅做 re-export，保持既有 `@/types/knowledge` 导入路径不变。
 */
export type {
  Department,
  BusinessStage,
  StageContext,
  StageMetric,
  Term,
  StageTreeNode
} from '@data-community/semantic-contract'

export { departmentLabelMap, departmentColorMap } from '@data-community/semantic-contract'
