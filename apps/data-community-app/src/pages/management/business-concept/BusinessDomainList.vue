<template>
  <div class="domain-list">
    <!-- 头部操作栏 -->
    <div class="grid-header">
      <div class="header-left">
        <span class="collection-count">共 {{ domains.length }} 个业务域</span>
      </div>
      <div class="header-right">
        <a-button type="primary" disabled>
          <template #icon>
            <IconPlus />
          </template>
          新增业务域
        </a-button>
      </div>
    </div>

    <!-- 业务域卡片网格 -->
    <a-row :gutter="[16, 16]">
      <a-col 
        v-for="domain in domains" 
        :key="domain.code" 
        :xs="24" :sm="12" :md="12" :lg="8" :xl="6"
      >
        <a-card 
          class="collection-card" 
          hoverable 
          @click="viewDetail(domain)"
        >
          <div class="card-content">
            <!-- 卡片标题与标识 -->
            <div class="card-title">
              <h4 class="title-text" :title="domain.name">
                {{ domain.name }}
              </h4>
              <div class="title-actions">
                <a-tooltip content="查看详情">
                  <a-button 
                    type="text" 
                    size="mini" 
                    @click.stop="viewDetail(domain)"
                    class="action-btn"
                  >
                    <IconEye />
                  </a-button>
                </a-tooltip>
                <a-dropdown @select="(value: any) => handleActionSelect(value, domain)" @click.stop>
                  <a-button type="text" size="mini" @click.stop>
                    <IconMore />
                  </a-button>
                  <template #content>
                    <a-doption value="edit">
                      <template #icon><IconEdit /></template>
                      编辑
                    </a-doption>
                    <a-doption value="delete" class="danger-option">
                      <template #icon><IconDelete /></template>
                      删除
                    </a-doption>
                  </template>
                </a-dropdown>
              </div>
            </div>
            
            <!-- 统计信息/负责人 -->
            <div class="collection-stats">
              <a-tag size="small" :color="getDomainColor(domain.name)">
                {{ domain.code }}
              </a-tag>
              <span class="table-count">
                <IconUser style="margin-right: 4px"/>{{ domain.owner }}
              </span>
            </div>
          
            <!-- 描述信息 -->
            <p class="card-description" :title="domain.description">
              {{ domain.description || '暂无描述' }}
            </p>
            
            <!-- 底部覆盖率信息 (额外补充，为了不丢失信息) -->
            <div class="card-footer-info">
              <span class="coverage-text" :title="domain.coverage">覆盖: {{ domain.coverage }}</span>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { 
  IconPlus, IconEye, IconEdit, IconUser, IconMore, IconDelete
} from '@arco-design/web-vue/es/icon';
import { Message } from '@arco-design/web-vue';
import { BusinessConceptStore } from '@mock-shared/business-concept-store';

const domains = ref(BusinessConceptStore.getDomains());

const getDomainColor = (name: string) => {
  if (name.includes('客户') || name.includes('账户')) return 'blue';
  if (name.includes('风险') || name.includes('贷后')) return 'red';
  if (name.includes('产品')) return 'orange';
  if (name.includes('还款') || name.includes('支用')) return 'cyan';
  return 'green';
};

const viewDetail = (domain: any) => {
  // TODO: 后续可联动跳转到实体列表并选中该域
  console.log('View detail:', domain);
  Message.info(`查看业务域: ${domain.name}`);
};

const handleActionSelect = (value: any, domain: any) => {
  if (value === 'edit') {
    Message.info('编辑功能开发中');
  } else if (value === 'delete') {
    Message.warning('删除功能暂未开放');
  }
};
</script>

<style scoped>
.domain-list {
  padding: 0;
}

.grid-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px 0;
  border-bottom: 1px solid var(--subapp-border);
}

.collection-count {
  font-size: 14px;
  color: var(--color-text-2);
  font-weight: 500;
}

/* 复用 TableCollectionGrid 的卡片样式 */
.collection-card {
  position: relative;
  border-radius: 8px;
  border: 1px solid var(--subapp-border);
  transition: all 0.2s ease;
  cursor: pointer;
  height: 100%;
  min-height: 180px; /* 稍微调整高度 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  background: #fff;
}

.collection-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: var(--subapp-primary);
}

.collection-card :deep(.arco-card-body) {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-content {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.card-title {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
}

.title-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--subapp-text-primary);
  margin: 0;
  line-height: 1.4;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.title-actions {
  display: flex;
  gap: 4px;
  opacity: 1;
  flex-shrink: 0;
}

.title-actions :deep(.arco-btn) {
  padding: 4px;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  color: var(--subapp-text-tertiary);
  border: 1px solid var(--subapp-border);
}

.title-actions :deep(.arco-btn:hover) {
  color: var(--subapp-primary);
  border-color: var(--subapp-primary);
  background: #e8f3ff;
}

.collection-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.collection-stats :deep(.arco-tag) {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
}

.table-count {
  font-size: 13px;
  font-weight: 500;
  color: var(--subapp-text-tertiary);
  display: flex;
  align-items: center;
}

.card-description {
  font-size: 14px;
  color: var(--subapp-text-tertiary);
  line-height: 1.57;
  margin-bottom: 12px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  min-height: 44px;
}

.card-footer-info {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px dashed var(--subapp-bg-secondary);
  font-size: 12px;
  color: var(--subapp-text-tertiary);
}

.coverage-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.danger-option {
  color: var(--subapp-danger) !important;
}

.danger-option:hover {
  background: #ffece8 !important;
}
</style>
