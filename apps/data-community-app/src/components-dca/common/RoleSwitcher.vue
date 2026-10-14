<template>
  <a-popover
    v-model:visible="popoverVisible"
    trigger="click"
    position="br"
    :width="420"
  >
    <template #content>
      <div class="role-switcher">
        <div class="switcher-header">
          <icon-user class="header-icon" />
          <span class="header-title">切换身份</span>
          <a-tag size="small" color="gray">dev 工具</a-tag>
        </div>

        <a-divider style="margin: 8px 0;" />

        <a-input-search
          v-model="searchKeyword"
          placeholder="搜索角色..."
          style="margin-bottom: 12px;"
        />

        <a-list :data="filteredRoles" :bordered="false" :max-height="320" style="overflow-y: auto;">
          <template #item="item">
            <a-list-item
              class="role-item"
              :class="{ 'role-active': item.item.key === roleStore.currentRole }"
              :data-testid="`role-${item.item.key}`"
              @click="onSelect(item.item.key)"
            >
              <a-list-item-meta>
                <template #avatar>
                  <a-avatar :style="{ background: item.item.color }" class="role-avatar">
                    {{ item.item.avatar }}
                  </a-avatar>
                </template>
                <template #title>
                  <div class="role-title">
                    <span class="role-name">{{ item.item.label }}</span>
                    <a-tag v-if="item.item.key === roleStore.currentRole" size="small" color="green">当前</a-tag>
                  </div>
                </template>
                <template #description>
                  <div class="role-desc">
                    <span class="role-dept">{{ item.item.department }}</span>
                    <span class="role-dot">·</span>
                    <span class="role-summary">{{ item.item.description }}</span>
                  </div>
                </template>
              </a-list-item-meta>
              <template #actions>
                <span class="role-shortcut-count">{{ item.item.shortcuts.length }} 个作业</span>
              </template>
            </a-list-item>
          </template>
        </a-list>

        <a-divider style="margin: 8px 0;" />

        <div class="switcher-footer">
          <span class="footer-tip">切换角色会改变工作台内容</span>
          <a-button size="small" @click="onReset">
            <template #icon><icon-refresh /></template>
            重置
          </a-button>
        </div>
      </div>
    </template>

    <a-button shape="round" size="small" class="trigger-button" data-testid="role-switcher-trigger" @click="popoverVisible = !popoverVisible">
      <a-avatar :size="20" :style="{ background: roleStore.currentRoleDef.color }" class="trigger-avatar">
        {{ roleStore.currentRoleDef.avatar }}
      </a-avatar>
      <span class="trigger-name">{{ roleStore.currentRoleDef.label }}</span>
      <icon-down class="trigger-arrow" />
    </a-button>
  </a-popover>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  IconUser,
  IconDown,
  IconRefresh
} from '@arco-design/web-vue/es/icon'
import { Message } from '@arco-design/web-vue'
import { useRouter } from 'vue-router'
import { useRoleStore } from '@/stores-dca/role'
import { ROLE_DEFINITIONS, type UserRole } from '@/types-dca/roles'

const roleStore = useRoleStore()
const router = useRouter()

const popoverVisible = ref(false)
const searchKeyword = ref('')

const filteredRoles = computed(() => {
  const kw = searchKeyword.value.toLowerCase().trim()
  const all = Object.values(ROLE_DEFINITIONS).map(def => ({
    key: def.role,
    label: def.label,
    department: def.department,
    description: def.description,
    avatar: def.avatar,
    color: def.color,
    shortcuts: def.shortcuts
  }))
  if (!kw) return all
  return all.filter(r =>
    r.label.toLowerCase().includes(kw) ||
    r.department.toLowerCase().includes(kw) ||
    r.description.toLowerCase().includes(kw)
  )
})

const onSelect = (role: UserRole) => {
  const ok = roleStore.switchRole(role)
  if (ok) {
    const def = ROLE_DEFINITIONS[role]
    Message.success(`已切换到 ${def.label}`)
    popoverVisible.value = false
    // 跳转到该角色的默认着陆页
    if (def.defaultLanding) {
      // 子应用 base 兼容
      const path = def.defaultLanding.startsWith('/')
        ? def.defaultLanding.substring(1)
        : def.defaultLanding
      router.push(path)
    }
  }
}

const onReset = () => {
  roleStore.reset()
  Message.info('已重置为数据工程师')
  popoverVisible.value = false
}

onMounted(() => {
  roleStore.initFromStorage()
})
</script>

<style lang="scss" scoped>
.role-switcher {
  .switcher-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 4px;

    .header-icon {
      color: #165dff;
      font-size: 16px;
    }

    .header-title {
      font-size: 14px;
      font-weight: 600;
      color: #1d2129;
    }
  }

  .role-item {
    cursor: pointer;
    transition: background-color 0.15s;
    border-radius: 6px;
    padding: 8px 4px;

    &:hover {
      background-color: #f7f8fa;
    }

    &.role-active {
      background-color: #e8f3ff;
      border-left: 3px solid #165dff;
    }

    .role-avatar {
      color: #fff;
      font-size: 16px;
    }

    .role-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .role-name {
      font-size: 13px;
      font-weight: 600;
      color: #1d2129;
    }

    .role-desc {
      font-size: 11px;
      color: #86909c;

      .role-dept {
        font-weight: 500;
        color: #4e5969;
      }

      .role-dot {
        margin: 0 4px;
      }
    }

    .role-shortcut-count {
      font-size: 11px;
      color: #165dff;
      background: #f0f7ff;
      padding: 2px 6px;
      border-radius: 3px;
    }
  }

  .switcher-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 4px;

    .footer-tip {
      font-size: 11px;
      color: #86909c;
    }
  }
}

.trigger-button {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e5e6eb;

  .trigger-avatar {
    color: #fff;
    font-size: 12px;
  }

  .trigger-name {
    font-size: 13px;
    color: #1d2129;
    font-weight: 500;
  }

  .trigger-arrow {
    color: #86909c;
    font-size: 12px;
  }

  &:hover {
    border-color: #165dff;
  }
}
</style>