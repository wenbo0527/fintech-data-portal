import { ref } from 'vue'
import request from '../api/request'
import * as XLSX from 'xlsx'

export const useFileUpload = () => {
  const isDragover = ref(false)
  const uploadProgress = ref(0)
  const currentFile = ref<File | null>(null)

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    isDragover.value = true
  }

  const handleDragLeave = () => {
    isDragover.value = false
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    isDragover.value = false
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) {return '0 Bytes'}
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleFileChange = (type: string, event: any, countRef: any) => {
    const file = event.file
    if (file) {
      currentFile.value = file

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(firstSheet)
          console.log(`[${type}上传] 解析成功，共${jsonData.length}条记录`, jsonData.slice(0, 3))
          countRef.value = jsonData.length
        } catch (error) {

        }
      }
      reader.readAsArrayBuffer(file)
    }
  }

  const handleUpload = async (option: { fileItem: any }, apiUrl: string, countRef: any) => {
    const formData = new FormData()
    formData.append('file', option.fileItem.file as Blob)

    try {
      const res = await request.post<{success: boolean, count: number}>(apiUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (res.data.success) {
        countRef.value = res.data.count
      }
    } catch (error) {

    }
    return {
      abort: () => {}
    }
  }

  return {
    isDragover,
    uploadProgress,
    currentFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    formatFileSize,
    handleFileChange,
    handleUpload
  }
}

export const downloadTemplate = (type: string) => {
  const link = document.createElement('a')
  link.href = `/templates/metrics-${type}-template.xlsx`
  link.download = `指标${type === 'incremental' ? '增量' : '批量'}导入模板.xlsx`
  link.click()
}