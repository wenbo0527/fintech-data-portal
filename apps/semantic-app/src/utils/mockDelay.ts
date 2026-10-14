/**
 * 统一mock延迟工具
 * 模拟API异步返回，让前端有loading效果
 */
export const mockDelay = <T>(data: T, ms = 150): Promise<T> =>
  new Promise(resolve => setTimeout(() => resolve(data), ms))
