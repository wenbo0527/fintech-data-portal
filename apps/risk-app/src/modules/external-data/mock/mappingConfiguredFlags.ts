/**
 * 「是否已配置落库字段映射」的唯一登记处
 *
 * 【为什么单独一个文件】
 * 这个事实的 owner 是落库字段映射模块（映射保存成功即视为已配置），不是档案本身。
 * 改造前它被抄在 mock/archiveProducts.ts 的 21 条种子里（mappingConfigured: true/false），
 * 于是出现两类互相矛盾的展示：档案列表说「已配置」，打开映射页签却是空表待匹配；
 * 反之映射模块里存着产品级默认映射，档案列表却显示「未配置」。
 * 现在档案侧不再存这个字段，统一由 loadArchiveProducts 读本登记处派生。
 *
 * 本文件刻意零依赖：archiveProducts 与 interfaceFieldMapping 互相需要这个事实，
 * 若由其中任意一方导出就会产生循环引用，故抽成第三方模块让两边都能 import。
 */

const configuredCodes = new Set<string>()

/** 登记/取消登记某产品已配置默认映射（由映射模块在保存时调用） */
export function markMappingConfigured(productCode: string, on = true): void {
  const code = String(productCode || '')
  if (!code) {return}
  if (on) {
    configuredCodes.add(code)
  } else {
    configuredCodes.delete(code)
  }
}

/** 读取某产品是否已配置默认映射（档案侧只读） */
export function isMappingConfigured(productCode: string): boolean {
  return configuredCodes.has(String(productCode || ''))
}

/** 全部已配置的产品编码（供一致性校验与调试使用） */
export function mappingConfiguredCodes(): string[] {
  return [...configuredCodes]
}
