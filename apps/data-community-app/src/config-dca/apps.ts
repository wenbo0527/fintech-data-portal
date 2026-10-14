/**
 * 跨 App 跳转地址配置(唯一事实源)
 *
 * 背景:P0 修复 —— 原 MainLayout.vue 中直接硬编码
 *   `window.location.href = 'http://localhost:5177/mkt/'`,
 *   端口/协议/base 三处写死,换环境即失效。
 *
 * 约定:
 * - 默认值对应当前 monorepo 各子应用的 vite dev 端口(见各自 vite.config.ts)
 * - 可通过 .env 的 VITE_<APP>_APP_URL 覆盖(如部署到演示机 / 换端口)
 * - 新增跨 App 出口时,只改这里,不要在页面里写死 URL
 */
export const APP_URLS = {
  /** 营销域子应用 mkt-app(dev 端口 5177,base '/mkt/',见 apps/mkt-app/vite.config.ts) */
  mkt: import.meta.env.VITE_MKT_APP_URL || 'http://localhost:5177/mkt/'
} as const

export type ExternalAppKey = keyof typeof APP_URLS

/** 整页跳转到外部子应用(浏览器级跳转,会离开 DCA 应用) */
export function goToExternalApp(app: ExternalAppKey): void {
  window.location.href = APP_URLS[app]
}
