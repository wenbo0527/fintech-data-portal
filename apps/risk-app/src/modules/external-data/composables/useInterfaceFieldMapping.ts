import { ref, computed, unref, type Ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  fetchProductFieldMapping,
  saveProductFieldMapping,
  fetchStdFieldCandidates,
  fetchArchiveApiFields,
  stdFieldComment,
  buildMappingTemplate,
  parseMappingText,
  validateProductMapping,
  autoMatchStdField,
  NON_STD_FIELD,
  NON_STD_FIELD_LABEL,
  type InterfaceFieldMappingRow,
  type MappingValidation,
} from '../api/interfaceFieldMapping'
import { useExternalDataStore } from '../stores/external-data'

/**
 * 分产品「API 接口字段 ↔ 标准落库字段」映射的共享状态与业务逻辑
 * 供档案详情页「落库字段映射」Tab 面板使用，一行只关心两件事：
 *   接口字段名、标准落库字段（标准字段说明由落库底表 comment 自动带出）。
 */
export interface InterfaceMappingOptions {
  /** 产品编码（与档案详情路由参数 :id 同口径） */
  productCode: Ref<string>
  productName: Ref<string>
  supplier: Ref<string>
  /** 落库目标表，仅随映射一起留档 */
  targetTable: Ref<string>
}

export function useInterfaceFieldMapping(options: InterfaceMappingOptions) {
  const loading = ref(false)
  const saving = ref(false)
  const rows = ref<InterfaceFieldMappingRow[]>([])
  const stdCandidates = ref<Array<{ field: string; comment: string; group: string }>>([])
  /** 最近一次上传的映射表文件名 */
  const sourceFileName = ref('')
  /** 最近一次保存时间（ISO） */
  const savedAt = ref('')
  /** 保存成功后的快照，用于脏数据判定 */
  const savedSnapshot = ref('')

  /**
   * 右列下拉选项：落库底表列 + 非标准化透传
   * label 只放字段名（避免选中态把注释挤成截断），字段说明由「标准字段说明」列从底表 comment 带出；
   * comment 挂在选项上供 filterStdOption 检索，输入中文含义也能命中。
   * 选项保持平铺：Arco 下拉分组需 isGroup 嵌套结构，与自定义检索配合不好，23 列也不需分组。
   */
  const stdFieldOptions = computed(() => [
    ...stdCandidates.value.map((f) => ({ label: f.field, value: f.field, comment: f.comment })),
    { label: NON_STD_FIELD_LABEL, value: NON_STD_FIELD, comment: '' },
  ])

  /** 标准字段下拉检索：字段名、选项文案、底表注释任一命中即可 */
  const filterStdOption = (inputValue: string, option: any) => {
    const kw = inputValue.trim().toLowerCase()
    if (!kw) {return true}
    const haystack = `${option?.value || ''} ${option?.label || ''} ${option?.comment || ''}`.toLowerCase()
    return haystack.includes(kw)
  }

  /** 校验结果 */
  const validation = computed<MappingValidation>(() => validateProductMapping(rows.value))

  /** 是否有未保存修改 */
  const dirty = computed(() => JSON.stringify(rows.value) !== savedSnapshot.value)

  /** 加载本产品映射与落库底表字段 */
  const load = async () => {
    loading.value = true
    try {
      const [mapping, candidates] = await Promise.all([fetchProductFieldMapping(unref(options.productCode)), fetchStdFieldCandidates()])
      stdCandidates.value = candidates
      rows.value = mapping?.rows ? mapping.rows.map((r) => ({ ...r })) : []
      sourceFileName.value = mapping?.sourceFileName || ''
      savedAt.value = mapping?.savedAt || ''
      savedSnapshot.value = JSON.stringify(rows.value)
    } catch {
      Message.error('加载落库字段映射失败')
    } finally {
      loading.value = false
    }
  }

  /** 下载映射表模板：左两列已按本产品档案出参预填 */
  const downloadTemplate = () => {
    const name = unref(options.productCode)
    downloadCsv(buildMappingTemplate(name), `${name}_接口字段落库映射_模板.csv`)
    Message.success('模板已下载，填写「标准落库字段(std_field)」列后回传即可')
  }

  /** 上传映射表：解析后覆盖当前编辑区（未保存可放弃）；恒返回 false，阻止 Arco 把文件加入上传队列 */
  const onUpload = (fileItem: any) => {
    // before-upload 直接给原生 File，兼容传入 FileItem 的写法
    const file: File | undefined = fileItem?.file ?? fileItem
    const fileName = String(file?.name || '')
    if (!/\.csv$/i.test(fileName)) { Message.error('仅支持 UTF-8 编码的 CSV 映射表'); return false }
    const reader = new FileReader()
    reader.onload = () => {
      const result = parseMappingText(String(reader.result || ''), unref(options.productCode))
      if (result.error) { Message.error(result.error); return }
      rows.value = result.rows
      sourceFileName.value = fileName
      const tips: string[] = [`已导入 ${result.rows.length} 行映射`]
      if (result.autoMatched) {tips.push(`其中 ${result.autoMatched} 行按字段名自动匹配`)}
      if (result.skippedOtherProduct) {tips.push(`忽略非本产品行 ${result.skippedOtherProduct} 行`)}
      if (result.ignoredRows) {tips.push(`忽略无效行 ${result.ignoredRows} 行`)}
      if (result.unknownStdFields.length) {tips.push(`${result.unknownStdFields.length} 个字段在落库底表不存在，已按透传处理`)}
      Message.success(tips.join('，'))
    }
    reader.onerror = () => Message.error('映射表读取失败，请确认文件未被占用')
    reader.readAsText(file as File, 'utf-8')
    return false
  }

  /** 对待匹配行按字段名与说明再碰撞一次（已映射的行不动） */
  const applyAutoCollision = (notify = true) => {
    let hit = 0
    rows.value.forEach((r) => {
      if (r.stdField || !r.apiField) {return}
      const target = autoMatchStdField(r.apiField)
      if (!target) {return}
      r.stdField = target
      hit++
    })
    if (notify) {Message.success(hit ? `自动碰撞命中 ${hit} 行，其余仍需人工匹配` : '没有新的字段可自动碰撞，请人工选择标准字段')}
    return hit
  }

  /** 按档案已有的接口出参生成行，右列先自动碰撞、撞不上的留待匹配 */
  const generateFromArchive = () => {
    const fields = fetchArchiveApiFields(unref(options.productCode))
    if (!fields.length) { Message.warning('档案暂无接口出参字段，请直接上传映射表或手工新增'); return }
    rows.value = fields.map((name) => ({ apiField: name, stdField: '' }))
    applyAutoCollision(false)
    Message.success(`已按档案接口出参生成 ${rows.value.length} 行，未匹配的字段可点「重新自动碰撞」或人工选择`)
  }

  /** 新增一行 */
  const addRow = () => { rows.value.push({ apiField: '', stdField: '' }) }

  /** 删除一行 */
  const removeRow = (index: number) => { rows.value.splice(index, 1) }

  /** 人工改选标准字段 */
  const setStdField = (record: InterfaceFieldMappingRow, value: string) => {
    record.stdField = value || ''
  }

  /** 放弃未保存修改，回到最近一次保存结果 */
  const discard = async () => {
    await load()
    Message.success('已还原为最近一次保存的映射')
  }

  /** 保存映射：校验不通过则阻断 */
  const save = async () => {
    const v = validation.value
    if (!v.canSave) { Message.error(v.errors[0] || '映射校验未通过'); return }
    saving.value = true
    try {
      const saved = await saveProductFieldMapping({
        productCode: unref(options.productCode),
        productName: unref(options.productName),
        supplier: unref(options.supplier),
        targetTable: unref(options.targetTable),
        sourceFileName: sourceFileName.value,
        rows: rows.value.map((r) => ({ ...r })),
      })
      savedAt.value = saved.savedAt
      savedSnapshot.value = JSON.stringify(rows.value)
      Message.success(`已保存 ${rows.value.length} 行映射，落库服务将按此匹配写入 ${saved.targetTable}`)
      // 「是否已配置映射」的唯一 owner 是本模块：upsertProductFieldMapping 保存时已登记到
      // mock/mappingConfiguredFlags.ts，档案侧只读派生，因此不再往档案写该字段（避免双写），
      // 只回灌产品列表拿到新齐备度；后续状态流转统一走 store.syncTechProfileStatus
      const store = useExternalDataStore()
      const pid = unref(options.productCode)
      await store.fetchProducts()
      await store.syncTechProfileStatus(pid, '落库字段映射已保存，技术档案已齐备')
    } catch (e: any) {
      Message.error(e?.message || '保存失败')
    } finally {
      saving.value = false
    }
  }

  return {
    loading,
    saving,
    rows,
    stdFieldOptions,
    filterStdOption,
    stdFieldComment,
    sourceFileName,
    savedAt,
    validation,
    dirty,
    load,
    downloadTemplate,
    onUpload,
    generateFromArchive,
    applyAutoCollision,
    addRow,
    removeRow,
    setStdField,
    discard,
    save,
  }
}

/** 触发浏览器下载 */
function downloadCsv(content: string, fileName: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
