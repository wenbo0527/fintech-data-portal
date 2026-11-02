#!/usr/bin/env bash
#===============================================================================
# 数字社区原子部署脚本（符号链接切换 + 版本目录管理）
# 用法: ./deploy.sh <nginx_path> [<app_dir>] [--staging]
# 示例: ./deploy.sh mkt                    # 默认 app_dir = mkt-app
#       ./deploy.sh risk risk-app           # 显式指定
#       ./deploy.sh mkt --staging           # staging 端口 8444
#
# 命名约定:
#   - nginx_path: nginx location 路径，如 mkt/risk/dex/admin/dmt/dfd
#   - app_dir: 本地 apps/ 下的目录名，默认 "${nginx_path}-app"
#   - 远程路径: /var/www/html/${nginx_path} （与 nginx location 一致）
#
# 优势:
#   - 原子切换（ln -sfn）：切换瞬间完成，无中间状态
#   - 版本目录：每次部署独立目录，失败可回滚
#   - 5 版本回收：自动清理旧版本，节省磁盘
#   - 健康检查：切换前后必验证 200
#
# 前置: ssh key 已配置（root@118.196.79.130 无密码登录）
#===============================================================================
set -euo pipefail

NGINX_PATH="${1:-}"
STAGING=""
APP_DIR=""
shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --staging) STAGING=1 ;;
    *) APP_DIR="$1" ;;
  esac
  shift || true
done

if [[ -z "$NGINX_PATH" ]]; then
  echo "用法: $0 <nginx_path> [<app_dir>] [--staging]"
  echo "示例:"
  echo "    $0 mkt                  # 默认 app_dir=mkt-app"
  echo "    $0 risk risk-app        # 显式指定 app_dir"
  echo "    $0 mkt --staging        # staging 端口 8444"
  exit 1
fi

# 默认 app_dir = "${nginx_path}-app"（命名约定）
APP_DIR="${APP_DIR:-${NGINX_PATH}-app}"
APP="$NGINX_PATH"  # 用于日志输出

VERSION=$(git rev-parse --short HEAD)
REMOTE_BASE=""  # 根据 STAGING/非 STAGING 在下方赋值
REMOTE_DIR=""
REMOTE_VERSION_DIR=""
REMOTE_HOST="118.196.79.130"
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=10"

# staging 端口（8444）vs 生产（8443）
if [[ -n "$STAGING" ]]; then
  REMOTE_PORT=8444
  REMOTE_BASE="/var/www/staging"   # staging 独立路径（避免污染 prod）
  REMOTE_DIR="${REMOTE_BASE}/${NGINX_PATH}"
  REMOTE_VERSION_DIR="${REMOTE_BASE}/${NGINX_PATH}-${VERSION}"
  HEALTH_URL="https://${REMOTE_HOST}:${REMOTE_PORT}/${NGINX_PATH}/"
  
  # 🔴 关键安全门：staging 部署必填 STAGING_CONFIRM=yes
  if [[ "${STAGING_CONFIRM:-}" != "yes" ]]; then
    echo "❌ staging 部署需 STAGING_CONFIRM=yes 环境变量"
    echo "   示例: STAGING_CONFIRM=yes ./deploy.sh ${NGINX_PATH} --staging"
    exit 1
  fi
  
  echo "    ⚠️⚠️⚠️ STAGING 部署（端口 ${REMOTE_PORT} · 路径 ${REMOTE_BASE}）⚠️⚠️⚠️"
else
  REMOTE_PORT=8443
  REMOTE_BASE="/var/www/html"
  REMOTE_DIR="${REMOTE_BASE}/${NGINX_PATH}"
  REMOTE_VERSION_DIR="${REMOTE_BASE}/${NGINX_PATH}-${VERSION}"
  HEALTH_URL="https://${REMOTE_HOST}:${REMOTE_PORT}/${NGINX_PATH}/"
fi

# ============================================================
# 深度健康检查（DA0D2650）：SPA catch-all 下任何路径都 200，
# 只 curl index.html 的 HTTP 码是假绿（10/27 HC 白屏即此因：入口 200 但
# entry chunk 被 portal-shell 吞成 404/HTML → 页面白屏）。
# 判据 = 从 index.html 抓真实 entry chunk，按浏览器实际请求 URL 拉取，
# 要求 200 且 content-type 含 javascript。
# ============================================================
health_check_deep() {
  local url="$1" label="$2" origin
  origin="$(printf '%s' "$url" | sed -E 's#^(https?://[^/]+).*#\1#')"
  local page_code src chunk_url chunk_code chunk_ctype
  page_code=$(curl -sk -o /dev/null -w '%{http_code}' "$url")
  echo "    ${label}: HTTP ${page_code}"
  if [[ "${page_code}" != "200" ]]; then
    echo "    ❌ ${label}: 入口 HTTP 非 200"
    return 1
  fi
  src=$(curl -sk "$url" | grep -oE 'src="[^"]*\.js"' | head -1 | sed 's/^src="//; s/"$//')
  if [[ -z "$src" ]]; then
    echo "    ⚠️  ${label}: index.html 未找到 js entry，跳过 content-type 校验"
    return 0
  fi
  case "$src" in
    http*)  chunk_url="$src" ;;
    /*)     chunk_url="${origin}${src}" ;;
    *)      chunk_url="$(printf '%s' "$url" | sed 's#[^/]*$##')$src" ;;
  esac
  chunk_code=$(curl -sk -o /dev/null -w '%{http_code}' "$chunk_url")
  chunk_ctype=$(curl -sk -o /dev/null -w '%{content_type}' "$chunk_url")
  echo "    ${label} entry: ${chunk_url} -> HTTP ${chunk_code} ${chunk_ctype}"
  if [[ "${chunk_code}" != "200" ]] || [[ "${chunk_ctype}" != *javascript* ]]; then
    echo "    ❌ ${label}: entry chunk 不可用或 content-type 非 javascript"
    echo "       （base 缺失/资源被兜底吞掉 → 页面白屏，HTTP 200 查不出来）"
    return 1
  fi
  return 0
}

echo "==> [${NGINX_PATH}@${VERSION} · app=${APP_DIR}] 构建中..."
cd "$(dirname "$0")/../apps/${APP_DIR}" && npm run build

echo "==> [${APP}@${VERSION}] 首次部署迁移检查（远程）..."
# 首次部署时，APP 可能是真实目录（不是符号链接）
# 需要先迁移到 legacy 目录，再创建符号链接
ssh ${SSH_OPTS} root@${REMOTE_HOST} "
  set -e
  if [[ -d ${REMOTE_DIR} && ! -L ${REMOTE_DIR} ]]; then
    LEGACY_DIR='${REMOTE_BASE}/${APP}-legacy-'$(date +%Y%m%d-%H%M%S)
    echo '==> 首次部署：迁移 ${APP} → '\$LEGACY_DIR
    mv ${REMOTE_DIR} \$LEGACY_DIR
  fi
  mkdir -p ${REMOTE_VERSION_DIR}
"

echo "==> [${APP}@${VERSION}] rsync 版本目录（不带 --delete）..."
# 注意：不带 --delete，避免影响其他版本
# 注意：macOS BSD rsync 不支持 --chmod，权限修复由下方 chown/chmod 处理
rsync -av \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='dist/assets/*.map' \
  dist/ root@${REMOTE_HOST}:${REMOTE_VERSION_DIR}/

echo "==> [${APP}@${VERSION}] 修复权限..."
ssh ${SSH_OPTS} root@${REMOTE_HOST} "
  chown -R www-data:www-data ${REMOTE_VERSION_DIR}
  chmod -R a+rX ${REMOTE_VERSION_DIR}/
"

echo "==> [${APP}@${VERSION}] 切换前健康检查（指向旧版本）..."
health_check_deep "${HEALTH_URL}" "旧版本" || echo "    (旧版本不健康，继续切换)"

echo "==> [${APP}@${VERSION}] 原子切换符号链接（ln -sfn）..."
ssh ${SSH_OPTS} root@${REMOTE_HOST} "ln -sfn ${REMOTE_VERSION_DIR} ${REMOTE_DIR}"

echo "==> [${APP}@${VERSION}] 切换后健康检查..."
# 给 nginx 一点时间感知符号链接变化
sleep 2
if ! health_check_deep "${HEALTH_URL}" "新版本"; then
  echo "❌ 切换后健康检查失败！回滚..."
  # 找上一版本（按 mtime 倒序第一个非当前）
  PREV=$(ssh ${SSH_OPTS} root@${REMOTE_HOST} "ls -dt ${REMOTE_BASE}/${APP}-* 2>/dev/null | grep -v '${VERSION}' | head -1")
  if [[ -n "$PREV" ]]; then
    ssh ${SSH_OPTS} root@${REMOTE_HOST} "ln -sfn $PREV ${REMOTE_DIR}"
    echo "    已回滚到: $PREV"
  fi
  exit 1
fi

echo "==> [${APP}@${VERSION}] 清理 5 版本前的旧版本..."
ssh ${SSH_OPTS} root@${REMOTE_HOST} "
  # 列出所有版本目录，按 mtime 排序，保留最新 5 个
  ls -dt ${REMOTE_BASE}/${APP}-* 2>/dev/null | tail -n +6 | while read old; do
    if [[ -L \"\${old}\" ]]; then
      # 跳过符号链接（即当前的 ${APP} 链接）
      continue
    fi
    echo \"    删除: \${old}\"
    rm -rf \"\${old}\"
  done
"

echo ""
echo "==> [${APP}@${VERSION}] ✅ 部署完成"
echo "    远程版本: ${REMOTE_VERSION_DIR}"
echo "    符号链接: ${REMOTE_DIR} -> ${REMOTE_VERSION_DIR}"
echo "    健康检查: HTTP 200 + entry chunk content-type=application/javascript（深度校验通过）"
echo "    回滚命令: scripts/rollback.sh ${APP}"
if [[ -n "${STAGING}" ]]; then
  echo "    ⚠️ staging 部署（端口 ${REMOTE_PORT}）"
fi