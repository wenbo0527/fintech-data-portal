import { inject, provide } from 'vue'

/**
 * 内联模式标识（Symbol 作为 key，避免与业务字段冲突）
 * 说明：配置抽屉组件据此判断是否脱离弹层、以内联只读方式渲染
 */
export const CONFIG_INLINE_KEY = Symbol('node-config-inline')

/**
 * 声明当前子树以「内联只读」方式渲染配置表单
 * 返回：void
 * 用途：节点统计抽屉的「配置」TAB 复用新建节点的配置抽屉组件时调用
 */
export function provideConfigInline() {
  provide(CONFIG_INLINE_KEY, true)
}

/**
 * 读取当前子树是否处于内联只读模式
 * 返回：boolean
 * 说明：BaseDrawer / 独立抽屉组件据此切换渲染形态
 */
export function useConfigInline() {
  return inject(CONFIG_INLINE_KEY, false)
}
