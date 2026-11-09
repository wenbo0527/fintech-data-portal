<template>
  <div class="asset-management">
    <div class="page-header">
      <h1>资产管理</h1>
      <p class="page-description">统一管理数据资产，包括表、指标、外数等各类数据资源</p>
    </div>

    <!-- 概览统计 -->
    <div class="overview-section">
      <a-row :gutter="24">
        <a-col :span="6">
          <a-card class="stat-card" hoverable @click="navigateTo('table-management')">
            <div class="stat-content">
              <div class="stat-icon table-icon">
                <IconStorage />
              </div>
              <div class="stat-info">
                <div class="stat-number">89</div>
                <div class="stat-label">表资产</div>
              </div>
            </div>
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card class="stat-card" hoverable @click="navigateTo('external-data-management')">
            <div class="stat-content">
              <div class="stat-icon external-icon">
                <IconLink />
              </div>
              <div class="stat-info">
                <div class="stat-number">22</div>
                <div class="stat-label">外数资产</div>
              </div>
            </div>
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card class="stat-card" hoverable @click="navigateTo('metric-management')">
            <div class="stat-content">
              <div class="stat-icon metric-icon">
                <IconBarChart />
              </div>
              <div class="stat-info">
                <div class="stat-number">45</div>
                <div class="stat-label">指标资产</div>
              </div>
            </div>
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card class="stat-card" hoverable @click="navigateTo('batch-asset-management')">
            <div class="stat-content">
              <div class="stat-icon batch-icon">
                <IconSettings />
              </div>
              <div class="stat-info">
                <div class="stat-number">156</div>
                <div class="stat-label">总资产</div>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- 功能模块 -->
    <div class="modules-section">
      <a-row :gutter="24">
        <a-col :span="12">
          <a-card class="module-card" hoverable @click="navigateTo('table-management')">
            <div class="module-header">
              <div class="module-icon table-icon">
                <IconStorage />
              </div>
              <div class="module-title">
                <h3>表管理</h3>
                <p>管理数据库表资产，包括表结构、字段信息、数据质量等</p>
              </div>
            </div>
            <div class="module-features">
              <a-tag>表结构管理</a-tag>
              <a-tag>数据质量监控</a-tag>
              <a-tag>血缘关系</a-tag>
            </div>
          </a-card>
        </a-col>
        
        <a-col :span="12">
          <a-card class="module-card" hoverable @click="navigateTo('external-data-management')">
            <div class="module-header">
              <div class="module-icon external-icon">
                <IconLink />
              </div>
              <div class="module-title">
                <h3>外数管理</h3>
                <p>管理外部数据源，包括API接口、文件数据、第三方数据库等</p>
              </div>
            </div>
            <div class="module-features">
              <a-tag>数据源配置</a-tag>
              <a-tag>连接测试</a-tag>
              <a-tag>数据同步</a-tag>
              <a-tag color="green" @click.stop="navigateTo('external-purchase-register')">采购登记</a-tag>
            </div>
          </a-card>
        </a-col>
      </a-row>
      
      <a-row :gutter="24" style="margin-top: 24px;">
        <a-col :span="12">
          <a-card class="module-card" hoverable @click="navigateTo('metric-management')">
            <div class="module-header">
              <div class="module-icon metric-icon">
                <IconBarChart />
              </div>
              <div class="module-title">
                <h3>指标管理</h3>
                <p>管理业务指标定义、计算规则、监控阈值等</p>
              </div>
            </div>
            <div class="module-features">
              <a-tag>指标定义</a-tag>
              <a-tag>计算规则</a-tag>
              <a-tag>监控告警</a-tag>
            </div>
          </a-card>
        </a-col>
        
        <a-col :span="12">
          <a-card class="module-card" hoverable @click="navigateTo('batch-asset-management')">
            <div class="module-header">
              <div class="module-icon batch-icon">
                <IconSettings />
              </div>
              <div class="module-title">
                <h3>资产批量管理</h3>
                <p>批量导入、导出、更新资产信息，提高管理效率</p>
              </div>
            </div>
            <div class="module-features">
              <a-tag>批量导入</a-tag>
              <a-tag>批量操作</a-tag>
              <a-tag>数据导出</a-tag>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <a-row :gutter="24" style="margin-top: 24px;">
        <a-col :span="12">
          <a-card class="module-card" hoverable @click="navigateTo('module-management')">
            <div class="module-header">
              <div class="module-icon batch-icon">
                <IconApps />
              </div>
              <div class="module-title">
                <h3>业务模块管理</h3>
                <p>按组织+场景创建多级模块与虚拟组，统一关联资产与资源</p>
              </div>
            </div>
            <div class="module-features">
              <a-tag>组织/场景分层</a-tag>
              <a-tag>虚拟组</a-tag>
              <a-tag>跨库关联</a-tag>
              <a-tag>权限联动</a-tag>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- 最近活动 -->
    <div class="activity-section">
      <a-card title="最近活动">
        <a-timeline>
          <a-timeline-item>
            <div class="activity-item">
              <span class="activity-user">张三</span>
              <span class="activity-action">创建了表资产</span>
              <span class="activity-target">user_profile</span>
              <span class="activity-time">2小时前</span>
            </div>
          </a-timeline-item>
          <a-timeline-item>
            <div class="activity-item">
              <span class="activity-user">李四</span>
              <span class="activity-action">更新了指标</span>
              <span class="activity-target">用户活跃度</span>
              <span class="activity-time">4小时前</span>
            </div>
          </a-timeline-item>
          <a-timeline-item>
            <div class="activity-item">
              <span class="activity-user">王五</span>
              <span class="activity-action">配置了外数源</span>
              <span class="activity-target">央行征信数据</span>
              <span class="activity-time">1天前</span>
            </div>
          </a-timeline-item>
        </a-timeline>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { 
  IconStorage, 
  IconLink, 
  IconBarChart, 
  IconSettings,
  IconApps
} from '@arco-design/web-vue/es/icon'

const router = useRouter()

const navigateTo = (path: string) => {
  if (path === 'module-management') {
    router.push('/management/asset-management/basic-management/module-management')
  } else if (['table-management', 'external-data-management', 'metric-management', 'variable-management'].includes(path)) {
    router.push(`/management/asset-management/listing-management/${path}`)
  } else {
    router.push(`/discovery/asset-management/${path}`)
  }
}
</script>

<style scoped>
.asset-management {
  padding: 24px;
  background: #f5f5f5;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 32px;
  text-align: center;
}

.page-header h1 {
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.page-description {
  margin: 0;
  font-size: 16px;
  color: var(--subapp-text-tertiary);
}

.overview-section {
  margin-bottom: 32px;
}

.stat-card {
  cursor: pointer;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.stat-content {
  display: flex;
  align-items: center;
  padding: 8px 0;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  color: white;
}

.table-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.external-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.metric-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.batch-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 28px;
  font-weight: 600;
  color: var(--subapp-text-primary);
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: var(--subapp-text-tertiary);
  margin-top: 4px;
}

.modules-section {
  margin-bottom: 32px;
}

.module-card {
  cursor: pointer;
  transition: all 0.3s;
  height: 160px;
}

.module-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.module-header {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
}

.module-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 20px;
  color: white;
  flex-shrink: 0;
}

.module-title {
  flex: 1;
}

.module-title h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.module-title p {
  margin: 0;
  font-size: 14px;
  color: var(--subapp-text-tertiary);
  line-height: 1.4;
}

.module-features {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.activity-section {
  max-width: 600px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.activity-user {
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.activity-action {
  color: var(--subapp-text-tertiary);
}

.activity-target {
  color: var(--subapp-primary);
  font-weight: 500;
}

.activity-time {
  color: #c9cdd4;
  font-size: 12px;
  margin-left: auto;
}
</style>
