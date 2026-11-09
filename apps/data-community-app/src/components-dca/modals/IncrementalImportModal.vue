<template>
  <a-modal v-model:visible="incrementalModalVisible" title="新增指标" :footer="false" width="600px">
    <a-space direction="vertical" size="large" fill>
      <div style="text-align: center; margin-bottom: 16px">
        <h4>请下载模板文件，填写后上传</h4>
        <p style="color: var(--color-text-3); margin-top: 8px">按照模板格式填写指标数据，系统将自动检测：存在则更新，不存在则插入</p>
      </div>
      <a-button type="primary" @click="downloadTemplate('incremental')" long>
        <template #icon><IconDownload /></template>
        下载增量导入模板
      </a-button>
      <a-upload-dragger
        :show-file-list="false"
        :custom-request="handleIncrementalUpload"
        @change="handleFileChange('incremental', $event, incrementalFileCount)"
        @drop="handleDrop"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        accept=".xlsx,.xls"
        drag
        class="upload-area"
        :class="{ 'upload-area--dragover': isDragover }"
        style="height: 180px; margin: 16px 0"
      >
        <div class="upload-content">
          <IconUpload class="upload-icon" style="font-size: 32px; margin-bottom: 16px" />
          <p class="upload-text" style="font-size: 16px; margin-bottom: 8px">拖拽文件到此处或<span class="upload-highlight"> 点击上传</span></p>
          <p class="upload-hint" style="color: var(--color-text-3)">支持.xlsx和.xls格式文件，文件大小不超过5MB</p>
          <a-progress v-if="uploadProgress > 0" :percent="uploadProgress" :show-text="false" />
          <div v-if="currentFile" class="file-preview">
            <icon-file style="margin-right: 8px" />
            <span>{{ currentFile.name }}</span>
            <span style="color: var(--color-text-3); margin-left: 8px">
              {{ formatFileSize(currentFile.size) }}
            </span>
          </div>
        </div>
      </a-upload-dragger>
      <a-alert v-if="incrementalFileCount > 0" type="info" style="margin-top: 16px">
        检测到 {{ incrementalFileCount }} 条记录，确认导入？
        <a-space style="margin-top: 8px">
          <a-button type="primary" size="small" @click="confirmIncrementalUpload">确认导入</a-button>
          <a-button size="small" @click="incrementalFileCount = 0">取消</a-button>
        </a-space>
      </a-alert>
    </a-space>
  </a-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { IconUpload, IconDownload } from '@arco-design/web-vue/es/icon'
import { Upload } from '@arco-design/web-vue'
import metricsMock from '@/mock-dca/metrics'
import { useFileUpload, downloadTemplate } from '@/utils-dca/fileUploadUtils'

const incrementalModalVisible = ref(false)
const incrementalFileCount = ref(0)
const { 
  isDragover, 
  uploadProgress, 
  currentFile, 
  handleDragOver, 
  handleDragLeave, 
  handleDrop, 
  formatFileSize,
  handleFileChange,
  handleUpload
} = useFileUpload()

const showIncrementalModal = () => {
  incrementalModalVisible.value = true
}





const confirmIncrementalUpload = () => {


  incrementalFileCount.value = 0
  incrementalModalVisible.value = false
}

const handleIncrementalUpload = async (option: { fileItem: any }): Promise<any> => {
  return handleUpload(option, '/api/metrics/incremental-import', incrementalFileCount)
}

</script>