<template>
  <div v-if="$route.name === 'TagSystem'" class="tag-system-index">
    <a-card title="标签系统" :bordered="false">
      <a-row :gutter="[24, 24]">
        <a-col :span="8">
          <a-card 
            class="nav-card"
            hoverable
            @click="navigateTo('table-management')"
          >
            <div class="nav-card-content">
              <div class="nav-icon">
                <IconStorage style="font-size: 48px; color: #165dff" />
              </div>
              <div class="nav-info">
                <h3>标签表管理</h3>
                <p>管理标签相关的数据表，支持表的注册、配置和ID映射设置</p>
                <div class="nav-stats">
                  <span>已注册表: 4</span>
                  <span>已配置映射: 2</span>
                </div>
              </div>
            </div>
          </a-card>
        </a-col>
        
        <a-col :span="8">
          <a-card 
            class="nav-card"
            hoverable
            @click="navigateTo('tag-management')"
          >
            <div class="nav-card-content">
              <div class="nav-icon">
                <IconTags style="font-size: 48px; color: #14c9c9" />
              </div>
              <div class="nav-info">
                <h3>标签管理</h3>
                <p>创建和管理标签，定义标签的分类、属性和使用规则</p>
                <div class="nav-stats">
                  <span>标签总数: 156</span>
                  <span>活跃标签: 128</span>
                </div>
              </div>
            </div>
          </a-card>
        </a-col>
        
        <a-col :span="8">
          <a-card 
            class="nav-card"
            hoverable
            @click="navigateTo('attribute-management')"
          >
            <div class="nav-card-content">
              <div class="nav-icon">
                <IconList style="font-size: 48px; color: #ff7d00" />
              </div>
              <div class="nav-info">
                <h3>属性管理</h3>
                <p>管理标签属性，定义属性的类型、约束和计算规则</p>
                <div class="nav-stats">
                  <span>属性总数: 89</span>
                  <span>支持映射: 45</span>
                </div>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <!-- 快速操作 -->
      <div class="quick-actions">
        <h3>快速操作</h3>
        <a-space>
          <a-button type="primary" @click="navigateTo('table-management')">
            <template #icon><IconPlus /></template>
            注册新表
          </a-button>
          <a-button @click="navigateTo('tag-management')">
            <template #icon><IconTag /></template>
            创建标签
          </a-button>
          <a-button @click="showImportDialog = true">
            <template #icon><IconUpload /></template>
            批量导入
          </a-button>
        </a-space>
      </div>

      <!-- 最近操作 -->
      <div class="recent-activities">
        <h3>最近操作</h3>
        <a-timeline>
          <a-timeline-item>
            <template #dot>
              <IconCheckCircle style="color: #00b42a" />
            </template>
            <div class="activity-content">
              <div class="activity-title">成功注册标签表</div>
              <div class="activity-desc">user_profile_table - 用户画像标签表</div>
              <div class="activity-time">2024-01-20 14:25:00</div>
            </div>
          </a-timeline-item>
          <a-timeline-item>
            <template #dot>
              <IconEdit style="color: #165dff" />
            </template>
            <div class="activity-content">
              <div class="activity-title">更新标签属性</div>
              <div class="activity-desc">用户活跃度标签 - 添加了新的计算规则</div>
              <div class="activity-time">2024-01-20 11:30:00</div>
            </div>
          </a-timeline-item>
          <a-timeline-item>
            <template #dot>
              <IconSettings style="color: #ff7d00" />
            </template>
            <div class="activity-content">
              <div class="activity-title">配置ID映射</div>
              <div class="activity-desc">enterprise_customer_table - 企业客户标签表</div>
              <div class="activity-time">2024-01-19 16:45:00</div>
            </div>
          </a-timeline-item>
        </a-timeline>
      </div>
    </a-card>

    <!-- 批量导入对话框 -->
    <a-modal
      v-model:visible="showImportDialog"
      title="批量导入"
      @ok="handleImport"
      @cancel="showImportDialog = false"
    >
      <div class="import-content">
        <a-upload
          drag
          :file-list="fileList"
          :show-file-list="true"
          @change="handleFileChange"
        >
          <template #upload-button>
            <div class="upload-content">
              <IconPlus style="font-size: 32px; color: #165dff" />
              <p>点击或拖拽文件到此处上传</p>
              <p class="upload-tip">支持 .xlsx, .csv 格式，最大 10MB</p>
            </div>
          </template>
        </a-upload>
      </div>
    </a-modal>
  </div>
  <router-view v-else />
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { 
  IconStorage, 
  IconTags, 
  IconList, 
  IconPlus, 
  IconTag, 
  IconUpload,
  IconCheckCircle,
  IconEdit,
  IconSettings
} from '@arco-design/web-vue/es/icon'

const router = useRouter()

// 对话框状态
const showImportDialog = ref(false)
const fileList = ref([])

// 导航方法
const navigateTo = (routeName) => {
  router.push(`/exploration/customer-center/tag-system/${routeName}`)
}

// 文件上传处理
const handleFileChange = (fileListInfo) => {
  fileList.value = fileListInfo
}

// 批量导入处理
const handleImport = () => {
  if (fileList.value.length === 0) {
    Message.warning('请先选择要导入的文件')
    return
  }
  
  Message.success('批量导入任务已提交')
  showImportDialog.value = false
  fileList.value = []
}
</script>

<style scoped lang="less">
.tag-system-index {
  padding: 16px;
  
  .nav-card {
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    .nav-card-content {
      display: flex;
      align-items: center;
      padding: 16px;
      
      .nav-icon {
        margin-right: 16px;
      }
      
      .nav-info {
        flex: 1;
        
        h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 500;
        }
        
        p {
          margin: 0 0 12px 0;
          color: var(--color-text-2);
          font-size: 14px;
          line-height: 1.5;
        }
        
        .nav-stats {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: var(--color-text-3);
          
          span {
            &::before {
              content: '•';
              margin-right: 4px;
              color: var(--color-primary-light-4);
            }
          }
        }
      }
    }
  }
  
  .quick-actions {
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid var(--color-border-2);
    
    h3 {
      margin-bottom: 16px;
      font-size: 16px;
      font-weight: 500;
    }
  }
  
  .recent-activities {
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid var(--color-border-2);
    
    h3 {
      margin-bottom: 16px;
      font-size: 16px;
      font-weight: 500;
    }
    
    .activity-content {
      .activity-title {
        font-weight: 500;
        margin-bottom: 4px;
      }
      
      .activity-desc {
        color: var(--color-text-2);
        font-size: 14px;
        margin-bottom: 4px;
      }
      
      .activity-time {
        color: var(--color-text-3);
        font-size: 12px;
      }
    }
  }
  
  .import-content {
    .upload-content {
      padding: 40px 0;
      text-align: center;
      
      p {
        margin: 8px 0 0 0;
        color: var(--color-text-2);
      }
      
      .upload-tip {
        font-size: 12px;
        color: var(--color-text-3);
      }
    }
  }
}
</style>
