/**
 * 画布数据迁移（兼容旧字段、补齐 AB 分支 id、AB 分支边的 branchId）
 * 入参：canvasData({ nodes: CanvasNodeRecord[]; connections: CanvasConnectionRecord[] })
 * 返回：迁移后的 canvasData（若格式异常原样返回）
 * 细节：
 *  - 节点 config 扁平化兜底（n.config ?? n.data?.config）
 *  - isConfigured 兼容（n.isConfigured ?? n.data?.isConfigured ?? config 非空）
 *  - AB 实验分支按 index 补齐 id/name/label
 *  - AB 实验边按 sourcePort 中的 out-N 推断 branchId
 *  - 在 canvasData 上打标 _migrationVersion = MIGRATION_VERSION，便于缓存跳过
 */
export const MIGRATION_VERSION = 1

export function migrateCanvasData(canvasData) {
  try {
    if (!canvasData || !Array.isArray(canvasData.nodes) || !Array.isArray(canvasData.connections)) return canvasData
    const idToNode = new Map()
    const nodes = canvasData.nodes.map(n => {
      const cfg = n.config || (n.data && n.data.config) || {}
      const type = n.type || (n.data && n.data.type) || ''
      const isConfigured = (n.isConfigured === true) || (n.data && n.data.isConfigured === true) || (cfg && Object.keys(cfg).length > 0)
      const migrated = { ...n, isConfigured, config: cfg }
      idToNode.set(migrated.id, migrated)
      // 为 AB 实验补齐分支 id/label
      if (type === 'ab-test' && Array.isArray(migrated.config?.branches)) {
        migrated.config.branches = migrated.config.branches.map((b, i) => ({ id: b?.id || `branch_${i + 1}`, name: b?.name || `分支${i + 1}`, label: b?.label || (b?.name || `分支${i + 1}`), percentage: b?.percentage }))
      }
      return migrated
    })
    const connections = canvasData.connections.map(e => {
      const srcNode = idToNode.get(e.source)
      let branchId = e.branchId || null
      // 为 AB 实验边补齐 branchId（根据 sourcePort 中的 out-N）
      try {
        // 'out' 为"未指定"哨兵值：不匹配 out-N 正则，branchId 留空由加载期按实际端口回填
        const sp = e.sourcePort || e.sourcePortId || 'out'
        if (srcNode && srcNode.type === 'ab-test' && !branchId) {
          const match = /^out-(\d+)$/.exec(sp)
          const branches = Array.isArray(srcNode.config?.branches) ? srcNode.config.branches : []
          if (match) {
            const idx = Number(match[1])
            branchId = branches[idx]?.id || null
          }
        }
      } catch {}
      return { ...e, branchId }
    })
    return { ...canvasData, nodes, connections, _migrationVersion: MIGRATION_VERSION }
} catch { return canvasData }
}
/*
用途：画布数据迁移（兼容旧字段、AB 分支补齐）
说明：原 taskStorage.js 中的内部函数，独立后可被多处复用；输入格式异常时原样返回避免破坏。
边界：不触发持久化；只对结构做规范化，不做业务校验。
*/