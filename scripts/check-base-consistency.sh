#!/usr/bin/env bash
# ============================================================
# base 一致性检查（BABA98B1）
#
# 背景：apps/horizontal-canvas 曾长期缺 vite base 字段（git log -S"base:"
# 对该文件 0 命中 → 从未设置过）。产物资源引用成根级 /assets/... → prod nginx
# location /assets/ alias 指向 portal-shell → entry chunk 404 → 页面 HTTP 200
# 但实际白屏。2026-10-27 上线时才发现（线上已存在数月）。
#
# 判据：每个已部署子应用的 vite base 必须等于它的 nginx 挂载前缀，
# 约定 = apps/<目录名> 去掉尾部 '-app' 后加斜杠：
#   risk-app            → '/risk/'
#   data-community-app  → '/data-community/'
#   horizontal-canvas   → '/horizontal-canvas/'
#
# 例外用 EXCLUDE 显式列出并注明原因，不静默跳过。
# 注意：macOS 自带 bash 3.2 不支持关联数组 → 用 case 而非 declare -A。
# ============================================================
set -uo pipefail
cd "$(dirname "$0")/.."

# 未部署 prod 的应用（无对应 nginx location），显式豁免并注明原因
exclude_reason() {
  case "$1" in
    report-monitor)
      echo "  ⏭️  report-monitor：未部署 prod（nginx 无 location /report-monitor/；"
      echo "      /report/ 是 proxy_pass 到 5187 端口的独立 Trae 项目，非本应用）"
      echo "      → 待其真正上线时必须先设 base，否则重演 HC 白屏"
      return 0 ;;
  esac
  return 1
}

fail=0
checked=0
for cfg in apps/*/vite.config.ts; do
  dir=$(basename "$(dirname "$cfg")")
  if exclude_reason "$dir"; then
    continue
  fi

  path="$dir"
  case "$path" in
    semantic-app) path="semantic-app" ;;   # nginx location 是 /semantic-app/（不剥 -app）
    *-app)       path="${path%-app}" ;;
  esac
  expected="/${path}/"
  actual=$(grep -oE "base: *'[^']+'" "$cfg" 2>/dev/null | head -1 | sed -e "s/base: *//" -e "s/^'//" -e "s/'$//")
  checked=$((checked+1))

  if [ -z "$actual" ]; then
    echo "  ❌ ${dir}：vite.config.ts 缺 base 字段（应为 '$expected'）"
    echo "     → 产物资源会引根级 /assets/ → 被 portal-shell 吞 → 白屏"
    fail=1
  elif [ "$actual" != "$expected" ]; then
    echo "  ❌ ${dir}：base='$actual' 与 nginx 挂载 '$expected' 不一致"
    fail=1
  else
    echo "  ✅ ${dir}：base='$actual'"
  fi
done

echo "  检查 $checked 个应用"
if [ "$fail" != "0" ]; then
  echo "❌ base 一致性检查未通过"
  exit 1
fi
echo "✅ base 一致性检查通过"
