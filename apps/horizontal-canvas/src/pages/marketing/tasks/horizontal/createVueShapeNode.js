import { NODE_DIMENSIONS } from './styles/nodeStyles.js'
import { createHorizontalPortConfig } from './utils/portConfigFactoryHorizontal.js'
import { getNodeLabel } from '@/utils/nodeTypes.js'
import { buildDisplayLines } from './nodeDisplayLines.js'

/**
 * 节点视图规格工厂（横版 Vue Shape）
 * 入参：{ id, x, y, label, data }
 * 返回：X6 Node 规格（含 shape/ports/data/size/zIndex）
 * 边界：不做持久化；起始节点仅出端口 out-0；结束节点无出端口；复制节点自动偏移避免被菜单遮挡。
 */
export function createVueShapeNode({ id, x, y, label, data = {} }) {
  const nodeType = data?.nodeType || data?.type
  const cfg = data?.config || {}
  const rowsRaw = buildDisplayLines(nodeType, cfg)
  const labelFallback = getNodeLabel(nodeType) || '节点'
  const rows = (rowsRaw.length === 1 && rowsRaw[0] === labelFallback) ? [] : rowsRaw
  const headerTitle = (cfg?.nodeName) || getNodeLabel(nodeType) || label || '节点'
  const headerHeight = NODE_DIMENSIONS.HEADER_HEIGHT
  const rowHeight = NODE_DIMENSIONS.ROW_HEIGHT
  const contentPadding = NODE_DIMENSIONS.CONTENT_PADDING
  const rowGapHeight = (Math.max(1, rows.length) - 1) * NODE_DIMENSIONS.ROW_GAP
  const width = NODE_DIMENSIONS.WIDTH
  const height = Math.max(NODE_DIMENSIONS.MIN_HEIGHT, headerHeight + contentPadding + rowGapHeight + Math.max(1, rows.length) * rowHeight)
  const componentData = {
    id, nodeType, headerTitle, displayLines: rows,
    disabled: data?.disabled || false, selected: false, hover: false,
    config: { ...data?.config, displayLines: rows }
  }
  const isStart = nodeType === 'start'
  const hasConfigLines = rows.length > 0
  const computedOutCount = isStart ? 1 : (hasConfigLines ? rows.length : 1)
  const outIds = isStart
    ? ['out-0']
    : Array.from({ length: Math.max(1, rows.length || 1) }, (_, i) => `out-${i}`)
  // 复制节点偏移：避免新节点的头部菜单落在当前鼠标位置
  let nx = x
  let ny = y
  try { if (typeof id === 'string' && id.includes('-copy-')) { nx = x + 160; ny = y + 200 } } catch {}
  return {
    id, x: nx, y: ny, width, height,
    shape: 'horizontal-node',
    data: { ...data, ...componentData },
    ports: createHorizontalPortConfig(computedOutCount, {
      includeIn: nodeType !== 'start',
      includeOut: nodeType !== 'end',
      outIds,
      verticalOffsets: null,
      evenDistribution: true,
      nodeHeight: height,
      nodeWidth: width,
      contentStart: headerHeight + (contentPadding / 2),
      contentEnd: headerHeight + (contentPadding / 2) + rowGapHeight + Math.max(1, (hasConfigLines ? rows.length : 1)) * rowHeight,
      contentLines: hasConfigLines ? rows : null,
      enableValidation: hasConfigLines
    }),
    zIndex: 10
  }
}
/*
用途：节点视图规格工厂（横版 Vue Shape）
说明：根据节点类型与配置生成渲染规格（尺寸/端口/显示行）；显示行文本由 nodeDisplayLines.js 提供。
边界：不做持久化；起始节点仅出端口；结束节点无出端口；复制节点自动偏移。
*/