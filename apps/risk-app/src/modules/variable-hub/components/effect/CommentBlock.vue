<template>
  <div class="comment-block">
    <div class="comment-head">
      <div class="head-left">
        <span class="comment-title">社区意见</span>
        <span class="comment-count">{{ opinions.length }} 条</span>
      </div>
      <!-- 点赞是变量粒度：一个变量一票，本机只能点一次（可再点取消） -->
      <a-link class="vote-var" :class="{ voted }" @click="voteVariable">
        <icon-thumb-up /> {{ likeCount }}
        <span class="vote-tip">{{ voted ? '已赞该变量' : '点赞该变量' }}</span>
      </a-link>
    </div>

    <!-- 发表区：无 COMMENT_EFFECT 权限时只隐藏输入，列表仍可查看 -->
    <div v-if="canComment" class="comment-editor">
      <a-textarea
        v-model="draft"
        :auto-size="{ minRows: 2, maxRows: 5 }"
        :max-length="300"
        show-word-limit
        placeholder="以当前身份发表意见：口径疑问、场景结论、上下线建议"
      />
      <div class="editor-foot">
        <span class="editor-identity">
          {{ me.name }} · {{ me.roleLabel }}
        </span>
        <a-button type="primary" size="small" :disabled="!draft.trim()" @click="publish">
          发表
        </a-button>
      </div>
    </div>
    <a-alert v-else type="normal" class="no-perm">当前角色无发表评论权限，仅可查看历史意见。</a-alert>

    <!-- 意见列表：赞数与条数均来自 effectOpinionStore，与推荐列表列同源 -->
    <ul v-if="opinions.length" class="comment-list">
      <li v-for="op in opinions" :key="op.id" class="comment-item">
        <div class="item-head">
          <span class="author">{{ op.author }}</span>
          <a-tag size="small" class="role-badge">{{ op.roleLabel }}</a-tag>
          <span class="time">{{ op.createdAt }}</span>
        </div>
        <div class="item-text">{{ op.text }}</div>
      </li>
    </ul>
    <a-empty v-else :image="false" description="还没有意见" class="comment-empty" />
  </div>
</template>

<script setup>
/**
 * 变量意见区（详情页效果 Tab / 展开行共用）
 * 赞数与评论条数的唯一来源是 effectOpinionStore，
 * 推荐列表的「赞 / 评论」列调用同一套 likesOf / commentsOf，不会出现两处数字打架。
 * 点赞是变量粒度：一个变量一票（本机可取消），不对单条意见点赞。
 */
import { computed, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconThumbUp } from '@arco-design/web-vue/es/icon'
import { effectOpinionStore } from '@/modules/variable-hub/mock/effect-evaluation/opinion-store'
import { UserContext, ROLE_LABELS, PERMISSIONS } from '@/modules/variable-hub/mock/risk-feature/permissions'

const props = defineProps({
  variableId: { type: String, required: true }
})

const emit = defineEmits(['changed'])

const draft = ref('')
const opinions = ref([])
/** 变量级赞数与本机票态（与意见条数无关） */
const likeCount = ref(0)
const voted = ref(false)

/** 当前身份与徽章文案（角色切换由布局层重新挂载本组件生效） */
const me = computed(() => {
  const u = UserContext.get()
  return { name: u.name, roleLabel: ROLE_LABELS[u.role] || u.role }
})

/** 发表评论需要的权限 */
const canComment = computed(() => UserContext.has(PERMISSIONS.COMMENT_EFFECT))

/**
 * 重新拉取意见列表与变量级赞数
 */
function reload() {
  opinions.value = effectOpinionStore.listOpinions(props.variableId)
  likeCount.value = effectOpinionStore.likesOf(props.variableId)
  voted.value = effectOpinionStore.variableVoted(props.variableId)
}

/** 切换变量时刷新 */
watch(() => props.variableId, reload, { immediate: true })

/** 发表评论：走 store 入库后刷新，并通知父级同步列表列 */
function publish() {
  const text = draft.value.trim()
  if (!text) return
  effectOpinionStore.addOpinion(props.variableId, text)
  draft.value = ''
  reload()
  emit('changed')
  Message.success('意见已发表')
}

/**
 * 变量级点赞 / 取消点赞（赞数与票态以 store 返回为准）
 */
function voteVariable() {
  const res = effectOpinionStore.toggleVariableVote(props.variableId)
  likeCount.value = res.likes
  voted.value = res.voted
  emit('changed')
}

defineExpose({ reload })
</script>

<style scoped>
.comment-block {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--color-neutral-3);
}
.comment-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.head-left {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.comment-title {
  font-size: 13px;
  font-weight: 600;
}
.comment-count {
  font-size: 12px;
  color: var(--color-text-3);
}
.comment-editor {
  background: var(--color-fill-1);
  padding: 10px;
  border-radius: 4px;
}
.editor-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}
.editor-identity {
  font-size: 12px;
  color: var(--color-text-3);
}
.no-perm {
  font-size: 12px;
}
.comment-list {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
}
.comment-item {
  padding: 8px 0;
  border-bottom: 1px dashed var(--color-neutral-3);
}
.item-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.author {
  font-weight: 600;
}
.time {
  color: var(--color-text-3);
  margin-left: auto;
}
.item-text {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-2);
}
.vote-var {
  font-size: 12px;
  color: var(--color-text-3);
}
.vote-var.voted {
  color: rgb(var(--primary-6));
}
.vote-tip {
  font-size: 12px;
  color: var(--color-text-4);
}
.comment-empty {
  padding: 12px 0;
}
</style>
