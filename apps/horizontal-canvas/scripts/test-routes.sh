#!/usr/bin/env bash
# 用法：bash scripts/test-routes.sh
# 用途：对开发服务器（默认 http://localhost:5175/horizontal-canvas）的所有关键模块做 HTTP 200 transform 校验
# 退出码：0 全部 200；非 0 存在 4xx/5xx
set -uo pipefail
BASE="${BASE:-http://localhost:5175/horizontal-canvas}"

ROUTES=(
  "/src/pages/marketing/tasks/index.vue"
  "/src/pages/marketing/tasks/horizontal/index.vue"
  "/src/pages/marketing/tasks/horizontal/HorizontalNode.vue"
  "/src/pages/marketing/tasks/horizontal/composables/useCanvasMenus.js"
  "/src/pages/marketing/tasks/horizontal/composables/useNodeInsertion.ts"
  "/src/composables/canvas/useCanvasMenus.js"
  "/src/composables/canvas/useConfigDrawers.js"
  "/src/composables/canvas/useGraphInstance.js"
  "/src/composables/canvas/useCanvasPersistence.js"
  "/src/composables/canvas/useCanvasDrop.js"
  "/src/composables/canvas/useCanvasQuickLayout.js"
  "/src/components/analytics/CanvasAnalyticsPanel.vue"
  "/src/components/task/TaskFlowConfigDrawers.vue"
  "/src/components/task/drawerRegistry.ts"
  "/src/components/task/StartNodeConfigDrawer.vue"
  "/src/utils/taskStorage.js"
  "/src/utils/migrateCanvasData.js"
  "/src/utils/logger.js"
  "/src/utils/trackerService.js"
  "/src/utils/canvasFunnel.js"
  "/src/utils/approvalService.js"
  "/src/utils/runtimeStatsMock.js"
  "/src/utils/nodeTypes.js"
  "/src/pages/marketing/tasks/horizontal/services/EventService.js"
  "/src/pages/marketing/tasks/horizontal/graph/GraphService.ts"
  "/src/pages/marketing/tasks/horizontal/layout/LayoutService.ts"
  "/src/pages/marketing/tasks/horizontal/node/NodeService.ts"
  "/src/pages/marketing/tasks/horizontal/persistence/PersistenceService.ts"
  "/src/pages/marketing/tasks/horizontal/state/useCanvasState.ts"
  "/src/pages/marketing/tasks/horizontal/utils/quickLayout.js"
  "/src/pages/marketing/tasks/horizontal/createVueShapeNode.js"
  "/src/types/graph.ts"
  "/src/main.ts"
)

FAIL=0
PASS=0
for r in "${ROUTES[@]}"; do
  code=$(curl -sS -o /dev/null -w "%{http_code}" "${BASE}${r}" || echo "000")
  if [[ "$code" == "200" ]]; then
    echo "[PASS] $code $r"
    PASS=$((PASS+1))
  else
    echo "[FAIL] $code $r"
    FAIL=$((FAIL+1))
  fi
done
echo ""
echo "Summary: PASS=$PASS FAIL=$FAIL TOTAL=${#ROUTES[@]}"
exit $FAIL
/*
用途：批量测试 dev transform 路由
说明：对开发服务器所有关键模块路径做 HTTP 200 校验；CI 可调用。
边界：依赖 dev 服务器运行在指定端口；不验证运行时正确性。
*/