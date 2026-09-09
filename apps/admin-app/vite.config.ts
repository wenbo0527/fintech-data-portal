/**
 * ⚠️ 本子应用已归档（ARCHIVED 2026-09-09）
 * 业务能力已合并至 apps/data-community-app/（http://localhost:5185/data-community/）
 * 此配置文件保留作为历史参考，请勿再用于生产部署。
 * 详见 ./ARCHIVED.md
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(async () => {
  let logPlugin: any = null
  try {
    const mod = await import('../../vite-plugins/logServerPlugin.js')
    logPlugin = (mod as any)?.logServerPlugin?.()
  } catch {
    logPlugin = null
  }

  const plugins = [vue()]
  if (logPlugin) plugins.unshift(logPlugin)

  return {
    plugins,
    server: { host: '0.0.0.0', port: 5182, strictPort: true },
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
    base: '/admin/'
  }
})