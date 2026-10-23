<template>
  <div class="service-scene-container">
    <a-page-header title="服务场景入口" subtitle="选择适合您的外数服务场景" />
    
    <div class="scene-grid">
      <a-card v-for="scene in scenes" :key="scene.id" hoverable class="scene-card" @click="handleSceneClick(scene)">
        <a-card-meta :title="scene.title">
          <template #avatar>
            <div class="scene-avatar" :style="{ backgroundColor: scene.color }">
              <component :is="scene.icon" />
            </div>
          </template>
          <template #description>
            <div class="scene-desc">{{ scene.description }}</div>
            <div class="scene-tags">
              <a-tag v-for="tag in scene.tags" :key="tag" size="small" style="margin-right: 4px; margin-top: 8px">{{ tag }}</a-tag>
            </div>
          </template>
        </a-card-meta>
        <template #actions>
          <a-button type="text" size="small" @click.stop="handleSceneClick(scene)">立即申请</a-button>
          <a-button type="text" size="small" @click.stop="showDocs(scene)">查看文档</a-button>
        </template>
      </a-card>
    </div>

    <ServiceApplicationDrawer
      v-model:visible="drawerVisible"
      :edit-mode="false"
      :initial-service-type="currentServiceType"
      @success="handleSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconCloud, IconStorage, IconClockCircle, IconFindReplace, IconSafe, IconImport, IconSave } from '@arco-design/web-vue/es/icon'
import ServiceApplicationDrawer from '../components/ServiceApplicationDrawer.vue'

const router = useRouter()
const drawerVisible = ref(false)
const currentServiceType = ref('')

const scenes = [
  {
    id: 'online-detail',
    title: '在线批量调用',
    description: '适用于实时业务场景，通过API接口进行高并发数据查询。',
    icon: IconCloud,
    color: 'var(--subapp-primary)',
    tags: ['实时API', '高并发', '低延迟'],
    serviceType: '在线批量调用'
  },
  {
    id: 'offline-task',
    title: '外数离线回溯申请',
    description: '适用于历史数据分析，支持上传样本文件进行批量回溯。',
    icon: IconStorage,
    color: 'var(--subapp-info)',
    tags: ['历史回溯', '文件上传', '离线处理'],
    serviceType: '外数离线回溯申请'
  },
  {
    id: 'periodic-task',
    title: '周期跑批任务申请',
    description: '适用于定期数据更新，支持配置Cron表达式进行自动化调度。',
    icon: IconClockCircle,
    color: 'var(--subapp-success)',
    tags: ['定时任务', '自动化', '周期执行'],
    serviceType: '周期跑批任务申请'
  },
  {
    id: 'variable-backtrack',
    title: '全量特征回溯申请',
    description: '适用于模型训练与验证，支持全量特征特征的历史数据回溯。',
    icon: IconFindReplace,
    color: 'var(--subapp-warning)',
    tags: ['特征工程', '全量特征', '模型训练'],
    serviceType: '全量特征回溯申请'
  },
  {
    id: 'risk-compliance',
    title: '风险合规离线回溯申请',
    description: '适用于合规审计与风险排查，提供敏感数据的安全查询通道。',
    icon: IconSafe,
    color: 'var(--subapp-danger)',
    tags: ['风险合规', '安全查询', '审计支持'],
    serviceType: '风险合规离线回溯申请'
  },
  {
    id: 'batch-external',
    title: '外数线上调用服务申请',
    description: '针对风险贷中单次或周期发起文件交互形式的样本传输、调用、落库，并在线上业务进行调用。',
    icon: IconImport,
    color: '#14C9C9',
    tags: ['文件交互', '线上调用', '样本传输'],
    serviceType: '外数线上调用服务申请'
  },
  {
    id: 'backtrack-persist',
    title: '外数回溯落库申请',
    description: '将厂商回溯返回的非标准数据，经任务匹配与字段映射标准化落库Hive。',
    icon: IconSave,
    color: '#722ED1',
    tags: ['文件任务匹配', '字段映射', '一致性校验', 'backid批次'],
    serviceType: '外数回溯落库申请'
  }
]

const handleSceneClick = (scene: any) => {
  if (scene.serviceType === '外数线上调用服务申请') {
    router.push({ name: 'RiskExternalDataOnlineCallApplication' })
  } else if (scene.serviceType === '外数回溯落库申请') {
    router.push({ name: 'RiskExternalDataBacktrackPersist' })
  } else {
    currentServiceType.value = scene.serviceType
    drawerVisible.value = true
  }
}

const handleSuccess = () => {
  // 服务申请入口统一收敛到「服务场景入口」：申请已提交，关闭抽屉并停留在当前场景页
  drawerVisible.value = false
}

const showDocs = (scene: any) => {
  Message.info(`正在查看【${scene.title}】的使用文档...`)
}
</script>

<style scoped>
.service-scene-container {
  padding: 0 16px;
}

.scene-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.scene-card {
  transition: all 0.3s;
}

.scene-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.scene-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.scene-desc {
  height: 40px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  margin-bottom: 8px;
  margin-top: 8px;
}
</style>