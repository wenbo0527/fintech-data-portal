<template>
  <div class="cdp-rule-builder">
    <!-- ============ 顶部摘要区（重设计） ============ -->
    <div class="summary-bar">
      <div class="summary-left">
        <div class="summary-icon">
          <icon-filter />
        </div>
        <div class="summary-info">
          <div class="summary-label">圈选规则</div>
          <div class="summary-text">{{ logicSummary }}</div>
        </div>
      </div>
      <div class="summary-right">
        <div class="estimate-count">
          <icon-user class="estimate-icon" />
          <span class="estimate-label">预估人群</span>
          <span class="estimate-value">{{ estimatedCount.toLocaleString() }}</span>
          <span class="estimate-unit">人</span>
        </div>
        <a-divider direction="vertical" />
        <a-dropdown trigger="hover">
          <a-button type="text" size="small" class="example-btn">
            <template #icon><icon-thunderbolt /></template>
            示例填充
            <icon-down class="example-caret" />
          </a-button>
          <template #content>
            <a-doption v-for="(ex, idx) in examples" :key="idx" @click="applyExample(ex)">
              <div class="example-option">
                <span class="example-name">{{ ex.name }}</span>
                <span class="example-desc">{{ ex.desc }}</span>
              </div>
            </a-doption>
          </template>
        </a-dropdown>
      </div>
    </div>

    <!-- ============ 客群逻辑 容器 ============ -->
    <div class="rule-section">
      <div class="section-header">
        <span class="section-title">
          <icon-check-circle class="section-icon" />
          客群逻辑（满足以下条件的人群）
        </span>
        <a-tooltip content="满足区：从全量人群中圈选的目标人群">
          <icon-question-circle class="section-tip" />
        </a-tooltip>
      </div>

      <!-- 条件组列表 -->
      <div
        class="cross-group-wrapper"
        :data-cross-op="ruleData.crossGroupOperator"
        :data-multi="ruleData.ruleGroups.length > 1 ? 'true' : 'false'"
      >
        <!-- 组间贯通连接器：左侧独立列 -->
        <div
          v-if="ruleData.ruleGroups.length > 1"
          class="cross-group-operator"
          :title="`点击切换组间关系：${ruleData.crossGroupOperator === 'AND' ? '且 → 或' : '或 → 且'}`"
          @click="toggleCrossGroupOperator"
        >
          <div class="cross-group-badge">
            {{ ruleData.crossGroupOperator === 'AND' ? '且' : '或' }}
          </div>
        </div>

        <!-- 右侧条件组列表列 -->
        <div class="groups-column">
          <template v-for="(group, groupIndex) in ruleData.ruleGroups" :key="group.id">
            <div class="rule-group-card" :class="{ 'is-only': ruleData.ruleGroups.length === 1 }">
            <!-- 组头部 -->
            <div class="group-header">
              <div class="group-header-left">
                <span class="group-index">组 {{ groupIndex + 1 }}</span>
                <a-input
                  v-model="group.name"
                  class="group-name-input"
                  placeholder="给条件组起个名字（可选）"
                  size="small"
                  allow-clear
                />
              </div>
              <div class="group-header-right">
                <a-tooltip content="复制此条件组">
                  <a-button type="text" size="mini" @click="duplicateGroup(groupIndex)">
                    <template #icon><icon-copy /></template>
                  </a-button>
                </a-tooltip>
                <a-tooltip content="删除条件组">
                  <a-button
                    type="text"
                    status="danger"
                    size="mini"
                    :disabled="ruleData.ruleGroups.length === 1"
                    @click="removeGroup(groupIndex)"
                  >
                    <template #icon><icon-delete /></template>
                  </a-button>
                </a-tooltip>
              </div>
            </div>

            <!-- 条件组内容区 -->
            <div class="group-content" :data-group-op="group.groupOperator">
              <!-- 组内且或（左轨道 + 胶囊）：仅当条件 ≥ 2 时显示 -->
              <div v-if="group.conditions.length >= 2" class="group-operator">
                <div class="group-operator-line" />
                <div
                  class="group-operator-badge"
                  :title="`点击切换组内关系：${group.groupOperator === 'AND' ? '且 → 或' : '或 → 且'}`"
                  @click="group.groupOperator = group.groupOperator === 'AND' ? 'OR' : 'AND'"
                >
                  {{ group.groupOperator === 'AND' ? '且' : '或' }}
                </div>
              </div>

              <!-- 条件列表 -->
              <div class="conditions-list">
                <div
                  v-for="(condition, condIndex) in group.conditions"
                  :key="condition.id"
                  class="condition-row"
                  :data-condition-type="getConditionType(condition)"
                >
                  <!-- 类型标识（可点击切换标签/事件） -->
                  <div class="condition-type">
                    <a-tooltip :content="`点击切换为${isEventField(condition.fieldId) ? '标签' : '事件'}条件`">
                      <span
                        class="type-badge clickable"
                        :class="{ 'is-event': isEventField(condition.fieldId) }"
                        @click="onConditionTypeChange(groupIndex, condIndex, isEventField(condition.fieldId) ? 'tag' : 'event', false)"
                      >
                        <icon-tag v-if="!isEventField(condition.fieldId)" />
                        <icon-thunderbolt v-else />
                        {{ !isEventField(condition.fieldId) ? '标签' : '事件' }}
                      </span>
                    </a-tooltip>
                  </div>

                  <!-- 字段选择 -->
                  <div class="condition-field">
                    <a-select
                      v-model="condition.fieldId"
                      :style="{ width: '160px' }"
                      placeholder="选择字段"
                      size="small"
                      filterable
                      @change="(val) => onFieldChange(groupIndex, condIndex, val)"
                    >
                      <a-optgroup label="🏷️ 标签字段">
                        <a-option v-for="f in tagFields" :key="f.id" :value="f.id">
                          {{ f.name }}
                        </a-option>
                      </a-optgroup>
                      <a-optgroup label="⚡ 事件字段">
                        <a-option v-for="e in eventFields" :key="e.id" :value="e.id">
                          {{ e.name }}
                        </a-option>
                      </a-optgroup>
                    </a-select>
                  </div>

                  <!-- 关系选择 -->
                  <div class="condition-operator">
                    <a-select
                      v-model="condition.operator"
                      :style="{ width: '110px' }"
                      placeholder="关系"
                      size="small"
                    >
                      <a-option
                        v-for="op in getOperatorsForCondition(groupIndex, condIndex)"
                        :key="op.value"
                        :value="op.value"
                      >
                        {{ op.label }}
                      </a-option>
                    </a-select>
                  </div>

                  <!-- 值输入 -->
                  <div class="condition-value">
                    <template v-if="!condition.fieldId">
                      <span class="empty-hint">请先选择字段</span>
                    </template>
                    <template v-else-if="isEventField(condition.fieldId)">
                      <a-input-number
                        v-if="condition.operator === 'at_least_n'"
                        v-model="condition.value"
                        :min="1"
                        :style="{ width: '90px' }"
                        size="small"
                        placeholder="次数"
                      />
                      <span v-else class="event-hint">是 / 否</span>

                      <!-- 时间筛选：模式切换（最近 N 天/小时/分钟 | 自定义区间） -->
                      <a-radio-group
                        v-model="condition.timeWindowMode"
                        type="button"
                        size="small"
                        :style="{ marginLeft: '6px' }"
                        @change="(val) => onTimeWindowModeChange(condition, val)"
                      >
                        <a-radio value="recent">最近</a-radio>
                        <a-radio value="custom">自定义</a-radio>
                      </a-radio-group>

                      <!-- 模式 1：最近 N 天/小时/分钟 -->
                      <template v-if="!condition.timeWindowMode || condition.timeWindowMode === 'recent'">
                        <a-input-number
                          v-model="condition.recentValue"
                          :min="1"
                          :style="{ width: '80px', marginLeft: '6px' }"
                          size="small"
                          placeholder="数量"
                        />
                        <a-select
                          v-model="condition.recentUnit"
                          :style="{ width: '90px', marginLeft: '6px' }"
                          size="small"
                        >
                          <a-option value="minute">分钟</a-option>
                          <a-option value="hour">小时</a-option>
                          <a-option value="day">天</a-option>
                        </a-select>
                        <span class="time-window-hint" style="margin-left: 4px;">内发生</span>
                      </template>

                      <!-- 模式 2：自定义区间（含日期+时间） -->
                      <template v-else>
                        <a-range-picker
                          v-model:model-value="condition.timeWindowCustom"
                          :style="{ width: '320px', marginLeft: '6px' }"
                          size="small"
                          show-time
                          format="YYYY-MM-DD HH:mm"
                        />
                      </template>
                    </template>
                    <template v-else-if="isTextField(condition.fieldId)">
                      <a-select
                        v-model="condition.values"
                        :style="{ minWidth: '180px' }"
                        multiple
                        placeholder="选择值（可多选）"
                        size="small"
                        :max-tag-count="2"
                      >
                        <a-option
                          v-for="v in getFieldValues(condition.fieldId)"
                          :key="v.value"
                          :value="v.value"
                        >
                          {{ v.label }}
                        </a-option>
                      </a-select>
                    </template>
                    <template v-else>
                      <a-input-number
                        v-model="condition.value"
                        :style="{ width: '120px' }"
                        size="small"
                        placeholder="输入数值"
                      />
                    </template>
                  </div>

                  <!-- 删除条件 -->
                  <div class="condition-delete">
                    <a-tooltip content="删除条件">
                      <a-button
                        type="text"
                        status="danger"
                        size="mini"
                        :disabled="group.conditions.length === 1"
                        @click="removeCondition(groupIndex, condIndex)"
                      >
                        <template #icon><icon-close /></template>
                      </a-button>
                    </a-tooltip>
                  </div>
                <!-- /condition-row 移除原 L286 的 </div>：condition-row 与 event-properties 整体作为 v-for 子节点 -->

                <!-- 事件属性筛选（事件类型才显示） -->
                <div
                  v-if="isEventField(condition.fieldId) && getEventProperties(condition.fieldId).length > 0"
                  class="event-properties"
                >
                  <div class="event-properties-header">
                    <span class="event-properties-label">事件属性</span>
                    <span class="event-properties-hint">所有属性条件同时满足（AND）</span>
                    <a-button
                      v-if="(condition.eventProperties || []).length < getEventProperties(condition.fieldId).length"
                      type="outline"
                      size="mini"
                      @click="addEventProperty(groupIndex, condIndex)"
                    >
                      <template #icon><icon-plus /></template>
                      添加属性
                    </a-button>
                  </div>
                  <div
                    v-for="(prop, propIdx) in (condition.eventProperties || [])"
                    :key="prop.id"
                    class="event-property-row"
                  >
                    <a-select
                      :model-value="prop.propertyId"
                      :style="{ width: '130px' }"
                      size="small"
                      placeholder="选择属性"
                      @change="(val: any) => onEventPropertyChange(groupIndex, condIndex, propIdx, 'propertyId', val)"
                    >
                      <a-option
                        v-for="p in getEventProperties(condition.fieldId)"
                        :key="p.id"
                        :value="p.id"
                      >
                        {{ p.name }}
                      </a-option>
                    </a-select>
                    <a-select
                      :model-value="prop.operator"
                      :style="{ width: '120px' }"
                      size="small"
                      @change="(val: any) => onEventPropertyChange(groupIndex, condIndex, propIdx, 'operator', val)"
                    >
                      <a-option value="equals">等于</a-option>
                      <a-option value="not_equals">不等于</a-option>
                      <a-option value="contains">包含</a-option>
                    </a-select>
                    <a-select
                      v-if="getEventPropertyField(condition.fieldId, prop.propertyId)?.subType === 'text' && getEventPropertyValues(condition.fieldId, prop.propertyId).length > 0"
                      :model-value="prop.values"
                      :style="{ minWidth: '180px', flex: 1 }"
                      multiple
                      size="small"
                      placeholder="选择值"
                      @change="(val: any) => onEventPropertyChange(groupIndex, condIndex, propIdx, 'values', val)"
                    >
                      <a-option
                        v-for="v in getEventPropertyValues(condition.fieldId, prop.propertyId)"
                        :key="v.value"
                        :value="v.value"
                      >
                        {{ v.label }}
                      </a-option>
                    </a-select>
                    <a-input-number
                      v-else-if="getEventPropertyField(condition.fieldId, prop.propertyId)?.subType === 'number'"
                      :model-value="prop.value"
                      :style="{ width: '120px' }"
                      size="small"
                      placeholder="输入数值"
                      @change="(val: any) => onEventPropertyChange(groupIndex, condIndex, propIdx, 'value', val)"
                    />
                    <a-button
                      type="text"
                      status="danger"
                      size="mini"
                      @click="removeEventProperty(groupIndex, condIndex, propIdx)"
                    >
                      <template #icon><icon-close /></template>
                    </a-button>
                  </div>
                </div>
                </div>
                <!-- /v-for(condition) 闭合（原 L286 上移到 L370 后，使 event-properties 块进入 v-for 作用域） -->

                <!-- 添加条件按钮行 -->
                <div class="add-condition-row">
                  <a-dropdown trigger="click">
                    <a-button type="outline" size="small">
                      <template #icon><icon-plus /></template>
                      添加条件
                      <icon-down />
                    </a-button>
                    <template #content>
                      <a-doption @click="addTagCondition(groupIndex)">
                        <icon-tag class="add-icon" /> 添加标签条件
                      </a-doption>
                      <a-doption @click="addEventCondition(groupIndex)">
                        <icon-thunderbolt class="add-icon" /> 添加事件条件
                      </a-doption>
                    </template>
                  </a-dropdown>
                </div>
              </div>
            </div>
          </div>
        </template>
        </div>
      </div>

      <!-- 添加条件组 -->
      <div class="add-group-row">
        <a-button type="outline" size="small" @click="addGroup">
          <template #icon><icon-plus /></template>
          添加条件组
        </a-button>
        <span class="add-group-hint">同一组内条件默认"且"关系，多组之间默认"且"关系，点击胶囊可切换</span>
      </div>
    </div>

    <!-- ============ 排除逻辑 容器 ============ -->
    <div class="rule-section exclude-section">
      <div class="section-header">
        <span class="section-title exclude-title">
          <icon-minus-circle class="section-icon" />
          排除逻辑（从圈选人群中排除）
        </span>
        <a-tooltip content="排除区：从满足区中剔除的人群，多个排除组之间默认'或'关系">
          <icon-question-circle class="section-tip" />
        </a-tooltip>
      </div>

      <!-- 排除组 + 排除组间贯通竖线 -->
      <div
        class="cross-group-wrapper"
        :data-cross-op="ruleData.crossExcludeGroupOperator"
        :data-section="'exclude'"
        :data-multi="ruleData.excludeGroups.length > 1 ? 'true' : 'false'"
      >
        <!-- 排除组间贯通连接器：左侧独立列 -->
        <div
          v-if="ruleData.excludeGroups.length > 1"
          class="cross-group-operator"
          data-section="exclude"
          :title="`点击切换组间关系：${ruleData.crossExcludeGroupOperator === 'AND' ? '且 → 或' : '或 → 且'}`"
          @click="toggleCrossExcludeGroupOperator"
        >
          <div class="cross-group-badge">
            {{ ruleData.crossExcludeGroupOperator === 'AND' ? '且' : '或' }}
          </div>
        </div>

        <!-- 右侧排除组列表列 -->
        <div class="groups-column">
          <template v-for="(group, groupIndex) in ruleData.excludeGroups" :key="group.id">
            <div class="rule-group-card exclude-card">
            <div class="group-header">
              <div class="group-header-left">
                <span class="group-index exclude-index">排除 {{ groupIndex + 1 }}</span>
                <a-input
                  v-model="group.name"
                  class="group-name-input"
                  placeholder="给排除条件组起个名字（可选）"
                  size="small"
                  allow-clear
                />
              </div>
              <div class="group-header-right">
                <a-tooltip content="复制此排除条件组">
                  <a-button type="text" size="mini" @click="duplicateExcludeGroup(groupIndex)">
                    <template #icon><icon-copy /></template>
                  </a-button>
                </a-tooltip>
                <a-tooltip content="删除排除条件组">
                  <a-button
                    type="text"
                    status="danger"
                    size="mini"
                    :disabled="ruleData.excludeGroups.length === 1"
                    @click="removeExcludeGroup(groupIndex)"
                  >
                    <template #icon><icon-delete /></template>
                  </a-button>
                </a-tooltip>
              </div>
            </div>

            <div class="group-content" :data-group-op="group.groupOperator">
              <div v-if="group.conditions.length >= 2" class="group-operator">
                <div class="group-operator-line" />
                <div
                  class="group-operator-badge"
                  :title="`点击切换组内关系：${group.groupOperator === 'AND' ? '且 → 或' : '或 → 且'}`"
                  @click="group.groupOperator = group.groupOperator === 'AND' ? 'OR' : 'AND'"
                >
                  {{ group.groupOperator === 'AND' ? '且' : '或' }}
                </div>
              </div>

              <div class="conditions-list">
                <div
                  v-for="(condition, condIndex) in group.conditions"
                  :key="condition.id"
                  class="condition-row"
                  :data-condition-type="getConditionType(condition)"
                >
                  <div class="condition-type">
                    <a-tooltip :content="`点击切换为${isEventField(condition.fieldId) ? '标签' : '事件'}条件`">
                      <span
                        class="type-badge clickable"
                        :class="{ 'is-event': isEventField(condition.fieldId) }"
                        @click="onConditionTypeChange(groupIndex, condIndex, isEventField(condition.fieldId) ? 'tag' : 'event', true)"
                      >
                        <icon-tag v-if="!isEventField(condition.fieldId)" />
                        <icon-thunderbolt v-else />
                        {{ !isEventField(condition.fieldId) ? '标签' : '事件' }}
                      </span>
                    </a-tooltip>
                  </div>

                  <div class="condition-field">
                    <a-select
                      v-model="condition.fieldId"
                      :style="{ width: '160px' }"
                      placeholder="选择字段"
                      size="small"
                      filterable
                      @change="(val) => onExcludeFieldChange(groupIndex, condIndex, val)"
                    >
                      <a-optgroup label="🏷️ 标签字段">
                        <a-option v-for="f in tagFields" :key="f.id" :value="f.id">
                          {{ f.name }}
                        </a-option>
                      </a-optgroup>
                      <a-optgroup label="⚡ 事件字段">
                        <a-option v-for="e in eventFields" :key="e.id" :value="e.id">
                          {{ e.name }}
                        </a-option>
                      </a-optgroup>
                    </a-select>
                  </div>

                  <div class="condition-operator">
                    <a-select
                      v-model="condition.operator"
                      :style="{ width: '110px' }"
                      placeholder="关系"
                      size="small"
                    >
                      <a-option
                        v-for="op in getOperatorsForExcludeCondition(groupIndex, condIndex)"
                        :key="op.value"
                        :value="op.value"
                      >
                        {{ op.label }}
                      </a-option>
                    </a-select>
                  </div>

                  <div class="condition-value">
                    <template v-if="!condition.fieldId">
                      <span class="empty-hint">请先选择字段</span>
                    </template>
                    <template v-else-if="isEventField(condition.fieldId)">
                      <a-input-number
                        v-if="condition.operator === 'at_least_n'"
                        v-model="condition.value"
                        :min="1"
                        :style="{ width: '90px' }"
                        size="small"
                        placeholder="次数"
                      />
                      <span v-else class="event-hint">是 / 否</span>

                      <!-- 时间筛选：模式切换（最近 N 天/小时/分钟 | 自定义区间） -->
                      <a-radio-group
                        v-model="condition.timeWindowMode"
                        type="button"
                        size="small"
                        :style="{ marginLeft: '6px' }"
                      >
                        <a-radio value="recent">最近</a-radio>
                        <a-radio value="custom">自定义</a-radio>
                      </a-radio-group>

                      <!-- 模式 1：最近 N 天/小时/分钟 -->
                      <template v-if="!condition.timeWindowMode || condition.timeWindowMode === 'recent'">
                        <a-input-number
                          v-model="condition.recentValue"
                          :min="1"
                          :style="{ width: '80px', marginLeft: '6px' }"
                          size="small"
                          placeholder="数量"
                        />
                        <a-select
                          v-model="condition.recentUnit"
                          :style="{ width: '90px', marginLeft: '6px' }"
                          size="small"
                        >
                          <a-option value="minute">分钟</a-option>
                          <a-option value="hour">小时</a-option>
                          <a-option value="day">天</a-option>
                        </a-select>
                        <span class="time-window-hint" style="margin-left: 4px;">内发生</span>
                      </template>

                      <!-- 模式 2：自定义区间（含日期+时间） -->
                      <template v-else>
                        <a-range-picker
                          v-model:model-value="condition.timeWindowCustom"
                          :style="{ width: '320px', marginLeft: '6px' }"
                          size="small"
                          show-time
                          format="YYYY-MM-DD HH:mm"
                        />
                      </template>
                    </template>
                    <template v-else-if="isTextField(condition.fieldId)">
                      <a-select
                        v-model="condition.values"
                        :style="{ minWidth: '180px' }"
                        multiple
                        placeholder="选择值（可多选）"
                        size="small"
                        :max-tag-count="2"
                      >
                        <a-option
                          v-for="v in getFieldValues(condition.fieldId)"
                          :key="v.value"
                          :value="v.value"
                        >
                          {{ v.label }}
                        </a-option>
                      </a-select>
                    </template>
                    <template v-else>
                      <a-input-number
                        v-model="condition.value"
                        :style="{ width: '120px' }"
                        size="small"
                        placeholder="输入数值"
                      />
                    </template>
                  </div>

                  <div class="condition-delete">
                    <a-tooltip content="删除条件">
                      <a-button
                        type="text"
                        status="danger"
                        size="mini"
                        :disabled="group.conditions.length === 1"
                        @click="removeExcludeCondition(groupIndex, condIndex)"
                      >
                        <template #icon><icon-close /></template>
                      </a-button>
                    </a-tooltip>
                  </div>
                <!-- /exCondition-row v3.3 修复：保留开标签未闭，将下方 event-properties 段移入此 v-for 块 -->

                <!-- 排除条件的事件属性筛选 -->
                <div
                  v-if="isEventField(condition.fieldId) && getEventProperties(condition.fieldId).length > 0"
                  class="event-properties"
                >
                  <div class="event-properties-header">
                    <span class="event-properties-label">事件属性</span>
                    <span class="event-properties-hint">所有属性条件同时满足（AND）</span>
                    <a-button
                      v-if="(condition.eventProperties || []).length < getEventProperties(condition.fieldId).length"
                      type="outline"
                      size="mini"
                      @click="addExcludeEventProperty(groupIndex, condIndex)"
                    >
                      <template #icon><icon-plus /></template>
                      添加属性
                    </a-button>
                  </div>
                  <div
                    v-for="(prop, propIdx) in (condition.eventProperties || [])"
                    :key="prop.id"
                    class="event-property-row"
                  >
                    <a-select
                      :model-value="prop.propertyId"
                      :style="{ width: '130px' }"
                      size="small"
                      placeholder="选择属性"
                      @change="(val: any) => onExcludeEventPropertyChange(groupIndex, condIndex, propIdx, 'propertyId', val)"
                    >
                      <a-option
                        v-for="p in getEventProperties(condition.fieldId)"
                        :key="p.id"
                        :value="p.id"
                      >
                        {{ p.name }}
                      </a-option>
                    </a-select>
                    <a-select
                      :model-value="prop.operator"
                      :style="{ width: '120px' }"
                      size="small"
                      @change="(val: any) => onExcludeEventPropertyChange(groupIndex, condIndex, propIdx, 'operator', val)"
                    >
                      <a-option value="equals">等于</a-option>
                      <a-option value="not_equals">不等于</a-option>
                    </a-select>
                    <a-select
                      v-if="getEventPropertyField(condition.fieldId, prop.propertyId)?.subType === 'text' && getEventPropertyValues(condition.fieldId, prop.propertyId).length > 0"
                      :model-value="prop.values"
                      :style="{ minWidth: '180px', flex: 1 }"
                      multiple
                      size="small"
                      placeholder="选择值"
                      @change="(val: any) => onExcludeEventPropertyChange(groupIndex, condIndex, propIdx, 'values', val)"
                    >
                      <a-option
                        v-for="v in getEventPropertyValues(condition.fieldId, prop.propertyId)"
                        :key="v.value"
                        :value="v.value"
                      >
                        {{ v.label }}
                      </a-option>
                    </a-select>
                    <a-input-number
                      v-else-if="getEventPropertyField(condition.fieldId, prop.propertyId)?.subType === 'number'"
                      :model-value="prop.value"
                      :style="{ width: '120px' }"
                      size="small"
                      placeholder="输入数值"
                      @change="(val: any) => onExcludeEventPropertyChange(groupIndex, condIndex, propIdx, 'value', val)"
                    />
                    <a-button
                      type="text"
                      status="danger"
                      size="mini"
                      @click="removeExcludeEventProperty(groupIndex, condIndex, propIdx)"
                    >
                      <template #icon><icon-close /></template>
                    </a-button>
                  </div>
                </div>
                </div>
                <!-- /v-for(exCondition) 闭合（原 L647 上移到 L730 后） -->

                <div class="add-condition-row">
                  <a-dropdown trigger="click">
                    <a-button type="outline" size="small" status="danger">
                      <template #icon><icon-plus /></template>
                      添加排除条件
                      <icon-down />
                    </a-button>
                    <template #content>
                      <a-doption @click="addExcludeTagCondition(groupIndex)">
                        <icon-tag class="add-icon" /> 添加标签条件
                      </a-doption>
                      <a-doption @click="addExcludeEventCondition(groupIndex)">
                        <icon-thunderbolt class="add-icon" /> 添加事件条件
                      </a-doption>
                    </template>
                  </a-dropdown>
                </div>
              </div>
            </div>
          </div>
        </template>
        </div>
      </div>

      <div class="add-group-row">
        <a-button type="outline" size="small" status="danger" @click="addExcludeGroup">
          <template #icon><icon-plus /></template>
          添加排除条件组
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import {
  IconFilter,
  IconUser,
  IconThunderbolt,
  IconTag,
  IconCheckCircle,
  IconMinusCircle,
  IconQuestionCircle,
  IconCopy,
  IconDelete,
  IconClose,
  IconPlus,
  IconDown,
} from '@arco-design/web-vue/es/icon'
import { Message } from '@arco-design/web-vue'

// ============ 字段数据 ============
const tagFields = [
  { id: 'f1', name: '城市', subType: 'text', values: [{ label: '北京', value: 'beijing' }, { label: '上海', value: 'shanghai' }, { label: '广州', value: 'guangzhou' }, { label: '深圳', value: 'shenzhen' }] },
  { id: 'f2', name: '性别', subType: 'text', values: [{ label: '男', value: 'male' }, { label: '女', value: 'female' }, { label: '未知', value: 'unknown' }] },
  { id: 'f3', name: '年龄', subType: 'number' },
  { id: 'f4', name: 'VIP 等级', subType: 'number' },
  { id: 'f5', name: '注册渠道', subType: 'text', values: [{ label: 'App', value: 'app' }, { label: 'H5', value: 'h5' }, { label: '小程序', value: 'mini' }] },
]

const eventFields = [
  {
    id: 'e1',
    name: '加购',
    subType: 'event',
    properties: [
      { id: 'e1p1', name: '产品类目', subType: 'text', values: [
        { label: '美妆个护', value: 'beauty' },
        { label: '服饰鞋帽', value: 'apparel' },
        { label: '数码家电', value: 'digital' },
        { label: '食品生鲜', value: 'grocery' },
        { label: '母婴玩具', value: 'baby' },
        { label: '运动户外', value: 'sports' }
      ]},
      { id: 'e1p2', name: '产品名称', subType: 'text', values: [
        { label: 'YSL 圣罗兰小金条', value: 'ysl-gold' },
        { label: '雅诗兰黛小棕瓶', value: 'estee-brown' },
        { label: '兰蔻菁纯眼霜', value: 'lancome-eye' },
        { label: 'SK-II 神仙水', value: 'sk2-water' },
        { label: '海蓝之谜面霜', value: 'lamer-cream' }
      ]},
      { id: 'e1p3', name: '加购数量', subType: 'number' },
      { id: 'e1p4', name: '加购金额', subType: 'number' },
      { id: 'e1p5', name: '加购渠道', subType: 'text', values: [
        { label: '商品详情页', value: 'pdp' },
        { label: '购物车', value: 'cart' },
        { label: '搜索结果', value: 'search' },
        { label: '首页推荐', value: 'home-rec' }
      ]}
    ]
  },
  {
    id: 'e2',
    name: '下单',
    subType: 'event',
    properties: [
      { id: 'e2p1', name: '产品类目', subType: 'text', values: [
        { label: '美妆个护', value: 'beauty' },
        { label: '服饰鞋帽', value: 'apparel' },
        { label: '数码家电', value: 'digital' }
      ]},
      { id: 'e2p2', name: '订单金额', subType: 'number' },
      { id: 'e2p3', name: '订单商品数', subType: 'number' },
      { id: 'e2p4', name: '使用优惠券', subType: 'text', values: [
        { label: '是', value: 'yes' },
        { label: '否', value: 'no' }
      ]},
      { id: 'e2p5', name: '支付方式', subType: 'text', values: [
        { label: '微信支付', value: 'wechat' },
        { label: '支付宝', value: 'alipay' },
        { label: '银联', value: 'unionpay' },
        { label: '货到付款', value: 'cod' }
      ]}
    ]
  },
  {
    id: 'e3',
    name: '支付',
    subType: 'event',
    properties: [
      { id: 'e3p1', name: '产品类目', subType: 'text', values: [
        { label: '美妆个护', value: 'beauty' },
        { label: '服饰鞋帽', value: 'apparel' }
      ]},
      { id: 'e3p2', name: '支付金额', subType: 'number' },
      { id: 'e3p3', name: '支付方式', subType: 'text', values: [
        { label: '微信支付', value: 'wechat' },
        { label: '支付宝', value: 'alipay' }
      ]},
      { id: 'e3p4', name: '使用积分', subType: 'text', values: [
        { label: '是', value: 'yes' },
        { label: '否', value: 'no' }
      ]}
    ]
  },
  {
    id: 'e4',
    name: '退款',
    subType: 'event',
    properties: [
      { id: 'e4p1', name: '产品类目', subType: 'text', values: [
        { label: '美妆个护', value: 'beauty' },
        { label: '服饰鞋帽', value: 'apparel' },
        { label: '数码家电', value: 'digital' }
      ]},
      { id: 'e4p2', name: '退款原因', subType: 'text', values: [
        { label: '不想要了', value: 'no-want' },
        { label: '质量问题', value: 'quality' },
        { label: '与描述不符', value: 'mismatch' },
        { label: '物流问题', value: 'logistics' }
      ]},
      { id: 'e4p3', name: '退款金额', subType: 'number' }
    ]
  },
  {
    id: 'e5',
    name: '登录',
    subType: 'event',
    properties: [
      { id: 'e5p1', name: '登录设备', subType: 'text', values: [
        { label: 'iOS', value: 'ios' },
        { label: 'Android', value: 'android' },
        { label: 'H5', value: 'h5' },
        { label: '小程序', value: 'mini' }
      ]},
      { id: 'e5p2', name: '登录方式', subType: 'text', values: [
        { label: '手机号', value: 'phone' },
        { label: '微信', value: 'wechat' },
        { label: 'Apple ID', value: 'apple' }
      ]}
    ]
  }
]

// ============ 类型定义 ============
interface EventProperty {
  id: string
  propertyId: string | null
  operator: string
  values: any[]
  value: any
}

interface Condition {
  id: string
  fieldId: string | null
  operator: string | null
  values: any[]
  value: any
  // 时间窗口（旧字段保留兼容）
  timeWindowType: string | null
  timeWindowCustom: any
  // 时间窗口（新字段）
  timeWindowMode: 'recent' | 'custom' | null  // 'recent' = 最近 N 天/小时/分钟；'custom' = 自定义区间
  recentValue: number | null                    // 最近 N 数量
  recentUnit: 'minute' | 'hour' | 'day' | null  // 最近单位
  // 事件属性（事件类型条件的二级筛选维度）
  eventProperties?: EventProperty[]
}

interface Group {
  id: string
  name: string
  conditions: Condition[]
  groupOperator: 'AND' | 'OR'
}

interface RuleData {
  ruleGroups: Group[]
  excludeGroups: Group[]
  crossGroupOperator: 'AND' | 'OR'
  crossExcludeGroupOperator: 'AND' | 'OR'
}

// ============ 顶层数据结构 ============
const ruleData = reactive<RuleData>({
  ruleGroups: [],
  excludeGroups: [],
  crossGroupOperator: 'AND',
  crossExcludeGroupOperator: 'OR',
})

// ============ ID生成 ============
const genId = (): string => `cond_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`

// ============ 初始化 ============
const initGroup = (isExclude = false): Group => ({
  id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
  name: isExclude ? '排除条件组' : '条件组',
  conditions: [],
  groupOperator: 'AND',
})

ruleData.ruleGroups = [initGroup()]
ruleData.excludeGroups = [initGroup(true)]

const resetAll = () => {
  ruleData.ruleGroups = [initGroup()]
  ruleData.excludeGroups = [initGroup(true)]
}

// ============ 示例填充（依赖 ruleData / initGroup / genId） ============
const examples = [
  {
    name: '高价值活跃用户',
    desc: '一线城市 + VIP≥3 + 近 30 天加购',
    apply: () => {
      resetAll()
      ruleData.ruleGroups[0].name = '高价值活跃用户'
      ruleData.ruleGroups[0].groupOperator = 'AND'
      ruleData.ruleGroups[0].conditions = [
        { id: genId(), fieldId: 'f1', operator: 'contains', values: ['beijing', 'shanghai'], value: null, timeWindowType: null, timeWindowCustom: null, timeWindowMode: null, recentValue: null, recentUnit: null, eventProperties: [] },
        { id: genId(), fieldId: 'f4', operator: '>=', values: [], value: 3, timeWindowType: null, timeWindowCustom: null, timeWindowMode: null, recentValue: null, recentUnit: null, eventProperties: [] },
        { id: genId(), fieldId: 'e1', operator: 'happened', values: [], value: null, timeWindowType: null, timeWindowCustom: null, timeWindowMode: 'recent', recentValue: 30, recentUnit: 'day', eventProperties: [] },
      ]
    },
  },
  {
    name: '流失挽回候选',
    desc: '近 7 天未登录 + 近 30 天加购过',
    apply: () => {
      resetAll()
      ruleData.ruleGroups[0].name = '流失挽回候选'
      ruleData.ruleGroups[0].groupOperator = 'AND'
      ruleData.ruleGroups[0].conditions = [
        { id: genId(), fieldId: 'e5', operator: 'not_happened', values: [], value: null, timeWindowType: null, timeWindowCustom: null, timeWindowMode: 'recent', recentValue: 7, recentUnit: 'day', eventProperties: [] },
        { id: genId(), fieldId: 'e1', operator: 'happened', values: [], value: null, timeWindowType: null, timeWindowCustom: null, timeWindowMode: 'recent', recentValue: 30, recentUnit: 'day', eventProperties: [] },
      ]
    },
  },
  {
    name: '女性年轻用户',
    desc: '性别女 + 年龄 18-30',
    apply: () => {
      resetAll()
      ruleData.ruleGroups[0].name = '女性年轻用户'
      ruleData.ruleGroups[0].groupOperator = 'AND'
      ruleData.ruleGroups[0].conditions = [
        { id: genId(), fieldId: 'f2', operator: 'equals', values: ['female'], value: null, timeWindowType: null, timeWindowCustom: null, timeWindowMode: null, recentValue: null, recentUnit: null, eventProperties: [] },
        { id: genId(), fieldId: 'f3', operator: '>=', values: [], value: 18, timeWindowType: null, timeWindowCustom: null, timeWindowMode: null, recentValue: null, recentUnit: null, eventProperties: [] },
      ]
    },
  },
]

const applyExample = (ex: any) => {
  ex.apply()
  Message && Message.success?.(`已应用示例：${ex.name}`)
}

// ============ 初始化条件 ============
const initCondition = (fieldId: string | null = null, operator: string | null = null): Condition => ({
  id: genId(),
  fieldId,
  operator,
  values: [],
  value: null,
  timeWindowType: null,
  timeWindowCustom: null,
  timeWindowMode: 'recent',
  recentValue: 30,
  recentUnit: 'day',
  eventProperties: [],
})

// ============ 复制条件组 ============
const duplicateGroup = (groupIndex: number) => {
  const src = ruleData.ruleGroups[groupIndex]
  const newGroup: Group = {
    id: genId(),
    name: src.name + '（副本）',
    groupOperator: src.groupOperator,
    conditions: src.conditions.map(c => ({
      id: genId(),
      fieldId: c.fieldId,
      operator: c.operator,
      values: Array.isArray(c.values) ? [...c.values] : [],
      value: c.value,
      timeWindowType: c.timeWindowType,
      timeWindowCustom: c.timeWindowCustom,
      timeWindowMode: c.timeWindowMode,
      recentValue: c.recentValue,
      recentUnit: c.recentUnit,
      eventProperties: (c.eventProperties || []).map((p: any) => ({ ...p })),
    })),
  }
  ruleData.ruleGroups.splice(groupIndex + 1, 0, newGroup)
}

const duplicateExcludeGroup = (groupIndex: number) => {
  const src = ruleData.excludeGroups[groupIndex]
  const newGroup: Group = {
    id: genId(),
    name: src.name + '（副本）',
    groupOperator: src.groupOperator,
    conditions: src.conditions.map(c => ({
      id: genId(),
      fieldId: c.fieldId,
      operator: c.operator,
      values: Array.isArray(c.values) ? [...c.values] : [],
      value: c.value,
      timeWindowType: c.timeWindowType,
      timeWindowCustom: c.timeWindowCustom,
      timeWindowMode: c.timeWindowMode,
      recentValue: c.recentValue,
      recentUnit: c.recentUnit,
      eventProperties: (c.eventProperties || []).map((p: any) => ({ ...p })),
    })),
  }
  ruleData.excludeGroups.splice(groupIndex + 1, 0, newGroup)
}

// ============ 字段变化时重置 ============
const onFieldChange = (groupIndex: number, condIndex: number, fieldId: string) => {
  const condition = ruleData.ruleGroups[groupIndex]?.conditions?.[condIndex]
  if (!condition) return
  condition.values = []
  condition.value = null
  condition.operator = null
  condition.timeWindowType = null
  condition.timeWindowCustom = null
  // 切换为事件字段时，自动启用 recent 模式
  condition.timeWindowMode = 'recent'
  condition.recentValue = 30
  condition.recentUnit = 'day'
}

const onExcludeFieldChange = (groupIndex: number, condIndex: number, fieldId: string) => {
  const condition = ruleData.excludeGroups[groupIndex].conditions[condIndex]
  condition.values = []
  condition.value = null
  condition.operator = null
  condition.timeWindowType = null
  condition.timeWindowCustom = null
  condition.timeWindowMode = 'recent'
  condition.recentValue = 30
  condition.recentUnit = 'day'
}

// ============ 时间窗口模式切换 ============
const onTimeWindowModeChange = (condition: any, mode: string) => {
  if (mode === 'custom') {
    condition.timeWindowCustom = condition.timeWindowCustom || []
  } else {
    condition.recentValue = condition.recentValue ?? 30
    condition.recentUnit = condition.recentUnit ?? 'day'
  }
}

// ============ 条件类型：tag / event ============
const getConditionType = (condition: any) => {
  if (!condition || !condition.fieldId) return 'tag'
  if (isEventField(condition.fieldId)) return 'event'
  return 'tag'
}

// 条件类型变化：清空字段+值，应用新类型默认值
const onConditionTypeChange = (groupIndex: number, condIndex: number, newType: string, isExclude = false) => {
  const groups = isExclude ? ruleData.excludeGroups : ruleData.ruleGroups
  const condition = groups[groupIndex]?.conditions[condIndex]
  if (!condition) return

  if (newType === 'tag') {
    // 切到标签：选第一个标签字段
    const field = tagFields[0]
    condition.fieldId = field?.id || null
    condition.values = []
    condition.value = null
    condition.operator = field ? getTagOperators(field)[0]?.value || null : null
    // 清掉时间字段（标签不显示时间）
    condition.timeWindowMode = null
    condition.recentValue = null
    condition.recentUnit = null
    condition.timeWindowCustom = null
    condition.timeWindowType = null
  } else if (newType === 'event') {
    // 切到事件：选第一个事件字段 + 默认 recent 时间
    const field = eventFields[0]
    condition.fieldId = field?.id || null
    condition.values = []
    condition.value = null
    condition.operator = getEventOperators()[0]?.value || null
    // 默认最近 30 天
    condition.timeWindowMode = 'recent'
    condition.recentValue = 30
    condition.recentUnit = 'day'
    condition.timeWindowCustom = null
    condition.timeWindowType = null
  }
}

// ============ 添加条件组 ============
const addGroup = () => {
  ruleData.ruleGroups.push(initGroup())
}

const addExcludeGroup = () => {
  ruleData.excludeGroups.push(initGroup(true))
}

// ============ 删除条件组 ============
const removeGroup = (groupIndex: number) => {
  if (ruleData.ruleGroups.length === 1) return
  ruleData.ruleGroups.splice(groupIndex, 1)
}

const removeExcludeGroup = (groupIndex: number) => {
  if (ruleData.excludeGroups.length === 1) return
  ruleData.excludeGroups.splice(groupIndex, 1)
}

// ============ 添加条件 ============
const addTagCondition = (groupIndex: number) => {
  const group = ruleData.ruleGroups[groupIndex]
  const field = tagFields[0]
  if (field) {
    const ops = getTagOperators(field)
    group.conditions.push(initCondition(field.id, ops[0]?.value || null))
  } else {
    group.conditions.push(initCondition())
  }
}

const addEventCondition = (groupIndex: number) => {
  const group = ruleData.ruleGroups[groupIndex]
  const field = eventFields[0]
  if (field) {
    const ops = getEventOperators()
    group.conditions.push(initCondition(field.id, ops[0]?.value || null))
  } else {
    group.conditions.push(initCondition())
  }
}

const addExcludeTagCondition = (groupIndex: number) => {
  const group = ruleData.excludeGroups[groupIndex]
  const field = tagFields[0]
  if (field) {
    const ops = getTagOperators(field)
    group.conditions.push(initCondition(field.id, ops[0]?.value || null))
  } else {
    group.conditions.push(initCondition())
  }
}

const addExcludeEventCondition = (groupIndex: number) => {
  const group = ruleData.excludeGroups[groupIndex]
  const field = eventFields[0]
  if (field) {
    const ops = getEventOperators()
    group.conditions.push(initCondition(field.id, ops[0]?.value || null))
  } else {
    group.conditions.push(initCondition())
  }
}

// ============ 删除条件 ============
const removeCondition = (groupIndex: number, condIndex: number) => {
  if (ruleData.ruleGroups[groupIndex].conditions.length === 1) return
  ruleData.ruleGroups[groupIndex].conditions.splice(condIndex, 1)
}

const removeExcludeCondition = (groupIndex: number, condIndex: number) => {
  if (ruleData.excludeGroups[groupIndex].conditions.length === 1) return
  ruleData.excludeGroups[groupIndex].conditions.splice(condIndex, 1)
}

// ============ 切换组间关系 ============
const toggleCrossGroupOperator = () => {
  ruleData.crossGroupOperator = ruleData.crossGroupOperator === 'AND' ? 'OR' : 'AND'
}

const toggleCrossExcludeGroupOperator = () => {
  ruleData.crossExcludeGroupOperator = ruleData.crossExcludeGroupOperator === 'AND' ? 'OR' : 'AND'
}

// ============ 操作符获取 ============
const getTagOperators = (field: any) => {
  const ops: any = {
    text: [
      { value: 'contains', label: '包含' },
      { value: 'not_contains', label: '不包含' },
      { value: 'equals', label: '等于' },
      { value: 'not_equals', label: '不等于' },
      { value: 'is_null', label: '为空' },
      { value: 'not_null', label: '不为空' },
    ],
    number: [
      { value: '=', label: '等于' },
      { value: '>', label: '大于' },
      { value: '>=', label: '大于等于' },
      { value: '<', label: '小于' },
      { value: '<=', label: '小于等于' },
      { value: '!=', label: '不等于' },
    ],
  }
  return ops[field.subType] || ops.text
}

const getEventOperators = () => [
  { value: 'happened', label: '发生过' },
  { value: 'not_happened', label: '未发生' },
  { value: 'at_least_n', label: '至少 N 次' },
]

const getOperatorsForCondition = (groupIndex: number, condIndex: number) => {
  const condition = ruleData.ruleGroups[groupIndex]?.conditions?.[condIndex]
  if (!condition || !condition.fieldId) {
    return []
  }
  const field = tagFields.find(f => f.id === condition.fieldId) || eventFields.find(e => e.id === condition.fieldId)
  if (!field) return []
  if (field.subType === 'event') return getEventOperators()
  return getTagOperators(field)
}

const getOperatorsForExcludeCondition = (groupIndex: number, condIndex: number) => {
  const condition = ruleData.excludeGroups[groupIndex]?.conditions[condIndex]
  if (!condition || !condition.fieldId) return []
  const field = tagFields.find(f => f.id === condition.fieldId) || eventFields.find(e => e.id === condition.fieldId)
  if (!field) return []
  if (field.subType === 'event') return getEventOperators()
  return getTagOperators(field)
}

// ============ 字段类型判断 ============
const isTextField = (fieldId: string) => {
  if (!fieldId) return false
  const field = tagFields.find(f => f.id === fieldId)
  return field?.subType === 'text'
}

const isEventField = (fieldId: any) => {
  if (!fieldId) return false
  if (!Array.isArray(eventFields) || eventFields.length === 0) return false
  return eventFields.some(e => e && e.id === fieldId)
}

const getFieldValues = (fieldId: string) => {
  if (!fieldId) return []
  const field = tagFields.find(f => f.id === fieldId)
  return field?.values || []
}

// 事件字段属性（事件下的二级筛选维度：产品类目/价格/数量/渠道等）
const getEventProperties = (fieldId: string) => {
  if (!fieldId) return []
  const field = eventFields.find(e => e.id === fieldId)
  return field?.properties || []
}

// 事件属性的可选值
const getEventPropertyValues = (fieldId: string, propertyId: string) => {
  if (!fieldId || !propertyId) return []
  const props = getEventProperties(fieldId)
  return props.find((p: any) => p.id === propertyId)?.values || []
}

// 事件属性的字段元信息（用于判断 subType）
const getEventPropertyField = (fieldId: string, propertyId: string) => {
  if (!fieldId || !propertyId) return null
  const props = getEventProperties(fieldId)
  return props.find((p: any) => p.id === propertyId) || null
}

// 事件属性条件 CRUD
const addEventProperty = (groupIndex: number, condIndex: number) => {
  const cond: any = ruleData.ruleGroups[groupIndex]?.conditions[condIndex]
  if (!cond) return
  cond.eventProperties = cond.eventProperties || []
  const used = new Set(cond.eventProperties.map((p: any) => p.propertyId))
  const props = getEventProperties(cond.fieldId)
  const next = props.find((p: any) => !used.has(p.id))
  if (!next) return
  const newProp: any = {
    id: `ep_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    propertyId: next.id,
    operator: 'equals',
    values: [],
    value: null
  }
  cond.eventProperties.push(newProp)
}

const removeEventProperty = (groupIndex: number, condIndex: number, propIdx: number) => {
  const cond: any = ruleData.ruleGroups[groupIndex]?.conditions[condIndex]
  if (!cond?.eventProperties) return
  cond.eventProperties.splice(propIdx, 1)
}

const onEventPropertyChange = (groupIndex: number, condIndex: number, propIdx: number, key: string, val: any) => {
  const cond: any = ruleData.ruleGroups[groupIndex]?.conditions[condIndex]
  if (!cond?.eventProperties?.[propIdx]) return
  const prop = cond.eventProperties[propIdx]
  prop[key] = val
  // 切换属性时重置 value/values
  if (key === 'propertyId') {
    const field = getEventPropertyField(cond.fieldId, val)
    if (field?.subType === 'number') {
      prop.value = null
      prop.values = []
    } else {
      prop.values = []
      prop.value = null
    }
  }
}

// 排除条件的事件属性 CRUD
const addExcludeEventProperty = (groupIndex: number, condIndex: number) => {
  const cond: any = ruleData.excludeGroups[groupIndex]?.conditions[condIndex]
  if (!cond) return
  cond.eventProperties = cond.eventProperties || []
  const used = new Set(cond.eventProperties.map((p: any) => p.propertyId))
  const props = getEventProperties(cond.fieldId)
  const next = props.find((p: any) => !used.has(p.id))
  if (!next) return
  cond.eventProperties.push({
    id: `ep_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    propertyId: next.id,
    operator: 'equals',
    values: [],
    value: null
  })
}

const removeExcludeEventProperty = (groupIndex: number, condIndex: number, propIdx: number) => {
  const cond: any = ruleData.excludeGroups[groupIndex]?.conditions[condIndex]
  if (!cond?.eventProperties) return
  cond.eventProperties.splice(propIdx, 1)
}

const onExcludeEventPropertyChange = (groupIndex: number, condIndex: number, propIdx: number, key: string, val: any) => {
  const cond: any = ruleData.excludeGroups[groupIndex]?.conditions[condIndex]
  if (!cond?.eventProperties?.[propIdx]) return
  const prop = cond.eventProperties[propIdx]
  prop[key] = val
  if (key === 'propertyId') {
    const field = getEventPropertyField(cond.fieldId, val)
    if (field?.subType === 'number') {
      prop.value = null
      prop.values = []
    } else {
      prop.values = []
      prop.value = null
    }
  }
}

// ============ 预估人数 ============
const estimatedCount = computed(() => {
  let base = 50000
  ruleData.ruleGroups.forEach((group: any) => {
    group.conditions.forEach((cond: any) => {
      if (cond.fieldId) base -= 3000
      if (cond.values && cond.values.length > 0) base -= 2000
      if (cond.operator === 'at_least_n') base -= 4000
      if (cond.operator === 'not_contains' || cond.operator === 'not_equals') base -= 5000
    })
  })
  ruleData.excludeGroups.forEach((group: any) => {
    group.conditions.forEach(() => {
      base -= 2000
    })
  })
  return Math.max(base, 500)
})

// ============ 逻辑摘要 ============
const logicSummary = computed(() => {
  const parts: string[] = []
  const crossOp = ruleData.crossGroupOperator === 'AND' ? '且' : '或'

  const fmtGroup = (group: any) => {
    const condParts: string[] = []
    group.conditions.forEach((cond: any) => {
      if (!cond.fieldId) {
        condParts.push('（未配置）')
        return
      }
      const field = tagFields.find(f => f.id === cond.fieldId) || eventFields.find(e => e.id === cond.fieldId)
      const fieldName = field?.name || '未选'
      const ops = field?.subType === 'event' ? getEventOperators() : getTagOperators(field)
      const opLabel = ops.find(o => o.value === cond.operator)?.label || cond.operator || '?'
      let valueStr = ''
      if (field?.subType === 'event') {
        if (cond.operator === 'at_least_n') {
          valueStr = `${cond.value || '?'}次`
        }
        // 时间窗口：新格式 (timeWindowMode + recentValue/recentUnit/timeWindowCustom)
        if (cond.timeWindowMode === 'custom' && cond.timeWindowCustom?.length === 2) {
          valueStr += ` · 自定义区间`
        } else if (cond.recentValue && cond.recentUnit) {
          const unitMap: any = { minute: '分钟', hour: '小时', day: '天' }
          valueStr += ` · 近${cond.recentValue}${unitMap[cond.recentUnit] || cond.recentUnit}`
        }
      } else if (field?.subType === 'text') {
        valueStr = cond.values?.length > 0 ? cond.values.join('/') : '（未选）'
      } else {
        valueStr = cond.value !== null && cond.value !== undefined ? String(cond.value) : '（未填）'
      }
      condParts.push(`${fieldName} ${opLabel} ${valueStr}`)
    })
    if (condParts.length === 0) return ''
    const joinOp = group.groupOperator === 'AND' ? ' 且 ' : ' 或 '
    return `(${condParts.join(joinOp)})`
  }

  ruleData.ruleGroups.forEach((group: any) => {
    const str = fmtGroup(group)
    if (str) parts.push(str)
  })

  const excludeParts: string[] = []
  ruleData.excludeGroups.forEach((group: any) => {
    const str = fmtGroup(group)
    if (str) excludeParts.push(str)
  })

  let summary = ''
  if (parts.length > 0) {
    summary = parts.join(` ${crossOp} `)
  } else {
    summary = '请添加条件组'
  }
  if (excludeParts.length > 0) {
    const excJoinOp = ruleData.crossExcludeGroupOperator === 'AND' ? ' 且 ' : ' 或 '
    summary += ` ｜ 排除 ${excludeParts.join(excJoinOp)}`
  }
  return summary
})

// ============ Props & Emits ============
// 架构修复（v3.3 上线失败复盘）
// - 此组件是数据 source-of-truth：内部 reactive(ruleData) 全权维护。
// - 不再用 v-model + deep watch 同步（那是一条回环路径：arco 内部 watch -> v-model 回写 -> 我们 watch -> emit -> 父级 reactive 替换 -> 子组件 re-render）。
// - 改为：完全不自驱同步。所有写动作完成后调用同步函数 syncToParent()（在内部封装）。
// - 父组件可在 preCalculate / saveAudience 时通过 ref 拿当前 ruleData；不强制实时同步。
const props = defineProps<{
  modelValue?: any
}>()

const emit = defineEmits(['update:modelValue'])

// 暴露给父级：获得内部快照（用于保存接口）
defineExpose({
  getRuleData: () => JSON.parse(JSON.stringify(ruleData))
})

// 节流：把同一帧内的多次写合并为单次 emit
let _syncing = false
let _pendingSync: number | null = null
function syncToParent() {
  if (_syncing) {
    _pendingSync = (_pendingSync ?? 0) + 1
    return
  }
  _syncing = true
  emit('update:modelValue', JSON.parse(JSON.stringify(ruleData)))
  // 在下一 microtask 释放，允许新一次 emit 排队
  queueMicrotask(() => {
    _syncing = false
    if (_pendingSync && _pendingSync > 0) {
      _pendingSync = null
      syncToParent()
    }
  })
}

</script>

<style scoped>
.cdp-rule-builder {
  padding: 16px;
  font-size: 14px;
}

/* ===================== 顶部摘要区 ===================== */
.summary-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  background: linear-gradient(135deg, #f0f7ff 0%, #f7f0ff 100%);
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #e8efff;
}

.summary-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.summary-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #165dff;
  font-size: 18px;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(22, 93, 255, 0.08);
}

.summary-info {
  flex: 1;
  min-width: 0;
}

.summary-label {
  font-size: 12px;
  color: #86909c;
  margin-bottom: 2px;
}

.summary-text {
  color: #1d2129;
  font-weight: 500;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.summary-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.estimate-count {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 2px 4px rgba(22, 93, 255, 0.06);
}

.estimate-icon {
  color: #165dff;
  font-size: 14px;
}

.estimate-label {
  color: #86909c;
  font-size: 12px;
}

.estimate-value {
  color: #0fc6c2;
  font-weight: 700;
  font-size: 18px;
}

.estimate-unit {
  color: #86909c;
  font-size: 12px;
}

.example-btn {
  color: #165dff;
}

.example-btn:hover {
  background: #fff;
}

.example-caret {
  margin-left: 2px;
  font-size: 10px;
}

.example-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0;
  min-width: 200px;
}

.example-name {
  font-weight: 600;
  color: #1d2129;
  font-size: 13px;
}

.example-desc {
  color: #86909c;
  font-size: 12px;
}

.add-icon {
  margin-right: 6px;
}

/* ===================== 容器区域 ===================== */
.rule-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 14px;
  padding-left: 4px;
}

.section-icon {
  font-size: 16px;
  color: #165dff;
}

.section-title {
  font-weight: 600;
  font-size: 14px;
  color: #1d2129;
}

.exclude-title .section-icon {
  color: #f53f3f;
}

.section-tip {
  font-size: 14px;
  color: #c9cdd4;
  cursor: help;
}

/* ===================== 组间且或 wrapper（左侧独立列布局） ===================== */
.cross-group-wrapper {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 16px;                        /* 左列与组卡片列之间的间距 */
  padding-left: 0;
}

/* 多组时给 wrapper 增加左列空间（仅多组时显示左列） */
.cross-group-wrapper[data-multi="true"] {
  padding-left: 0;
}

/* 右侧条件组列表列 */
.groups-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* ===================== 组间贯通连接器（左侧独立列） ===================== */
.cross-group-operator {
  /* 作为 wrapper 的第一个 flex 子项，独立成列 */
  position: relative;
  flex-shrink: 0;
  width: 32px;
  z-index: 5;
  cursor: pointer;
  user-select: none;
}

/* 竖线背景：上下两段，中间被胶囊遮挡 */
.cross-group-operator::before {
  content: '';
  position: absolute;
  left: 15px;                       /* 居中：32/2 = 16，向左偏 1px 视觉中心 */
  top: 0;
  bottom: 0;
  width: 2px;
  background: #c9cdd4;
  transition: background 0.2s;
}

/* 主区色调 */
.cross-group-wrapper[data-multi="true"][data-cross-op="AND"]:not([data-section="exclude"]) .cross-group-operator::before {
  background: #165dff;
}

.cross-group-wrapper[data-multi="true"][data-cross-op="OR"]:not([data-section="exclude"]) .cross-group-operator::before {
  background: #722ed1;
}

/* 排除区色调 */
.cross-group-wrapper[data-section="exclude"][data-multi="true"][data-cross-op="AND"] .cross-group-operator::before {
  background: #f53f3f;
}

.cross-group-wrapper[data-section="exclude"][data-multi="true"][data-cross-op="OR"] .cross-group-operator::before {
  background: #ff7d00;
}

/* 左列底部的"接地"小圆点：让左列有终点感 */
.cross-group-operator::after {
  content: '';
  position: absolute;
  left: 11px;
  bottom: 0;
  width: 10px;
  height: 10px;
  background: #fff;
  border: 2px solid #165dff;
  border-radius: 50%;
  transition: all 0.2s;
}

.cross-group-wrapper[data-multi="true"][data-cross-op="OR"]:not([data-section="exclude"]) .cross-group-operator::after {
  border-color: #722ed1;
}

.cross-group-wrapper[data-section="exclude"][data-multi="true"][data-cross-op="AND"] .cross-group-operator::after {
  border-color: #f53f3f;
}

.cross-group-wrapper[data-section="exclude"][data-multi="true"][data-cross-op="OR"] .cross-group-operator::after {
  border-color: #ff7d00;
}

/* 旧的 line 元素（保留 DOM 兼容，不显示） */
.cross-group-line {
  display: none;
}

/* 胶囊：垂直居中于左列中部 */
.cross-group-badge {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 6;
  background: #fff;
  width: 30px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 0 0 2px #165dff, 0 2px 6px rgba(0, 0, 0, 0.06);
  color: #165dff;
  transition: all 0.2s;
}

/* 主区 OR 紫色 */
.cross-group-wrapper[data-multi="true"][data-cross-op="OR"]:not([data-section="exclude"]) .cross-group-badge {
  box-shadow: 0 0 0 2px #722ed1, 0 2px 6px rgba(0, 0, 0, 0.06);
  color: #722ed1;
}

/* 排除区 AND 红 / OR 橙 */
.cross-group-wrapper[data-section="exclude"][data-multi="true"][data-cross-op="AND"] .cross-group-badge {
  box-shadow: 0 0 0 2px #f53f3f, 0 2px 6px rgba(0, 0, 0, 0.06);
  color: #f53f3f;
}

.cross-group-wrapper[data-section="exclude"][data-multi="true"][data-cross-op="OR"] .cross-group-badge {
  box-shadow: 0 0 0 2px #ff7d00, 0 2px 6px rgba(0, 0, 0, 0.06);
  color: #ff7d00;
}

.cross-group-badge:hover {
  transform: translate(-50%, -50%) scale(1.12);
  box-shadow: 0 0 0 2px currentColor, 0 4px 10px rgba(0, 0, 0, 0.12);
}

/* ===================== 条件组卡片 ===================== */
.rule-group-card {
  position: relative;
  background: #fff;
  border: 1px dashed #c9cdd4;
  border-radius: 8px;
  margin-bottom: 12px;
  padding-left: 12px;
  overflow: visible;
  transition: all 0.2s ease;
}

.rule-group-card:last-child {
  margin-bottom: 0;
}

.rule-group-card:hover {
  border-color: #165dff;
  box-shadow: 0 2px 12px rgba(22, 93, 255, 0.08);
}

/* 排除卡片 */
.rule-group-card.exclude-card {
  border-color: #ffccc7;
  background: linear-gradient(180deg, #fff8f8 0%, #ffffff 60%);
}

.rule-group-card.exclude-card:hover {
  border-color: #f53f3f;
  box-shadow: 0 2px 12px rgba(245, 63, 63, 0.08);
}

/* 组头部 */
.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: transparent;
  border-bottom: 1px dashed #e5e6e8;
  gap: 8px;
}

.rule-group-card.exclude-card .group-header {
  border-bottom-color: #ffd6d6;
}

.group-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.group-header-right {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.group-index {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  background: #e8f3ff;
  color: #165dff;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.exclude-index {
  background: #ffece8;
  color: #f53f3f;
}

.group-name-input {
  flex: 1;
  max-width: 280px;
  min-width: 0;
}

.group-name-input :deep(.arco-input) {
  background: transparent;
  font-weight: 500;
}

/* 组内容区 */
.group-content {
  display: flex;
  padding: 12px;
  gap: 0;
}

/* 单条件时无左轨道：左边距收紧，让条件行更靠近卡片左边缘 */
.group-content:not(:has(.group-operator)) {
  padding-left: 4px;
}

/* 组内且或：左轨道（容器更紧凑，让胶囊和竖线轨道精确对齐） */
.group-operator {
  position: relative;
  width: 40px;                     /* 容器宽度：从 60 缩到 40，更紧凑 */
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;         /* 胶囊水平居中 */
}

/* 左轨道线：居中贯穿容器 */
.group-operator-line {
  position: absolute;
  left: 50%;                       /* 容器中央 = 胶囊中心 */
  top: -10px;
  bottom: -10px;
  width: 2px;
  transform: translateX(-50%);     /* 修正居中 */
  background: #c9cdd4;
  transition: background 0.2s;
}

.rule-group-card:hover .group-operator-line {
  background: #165dff;
}

/* 排除卡片的轨道线 */
.rule-group-card.exclude-card .group-operator-line {
  background: #ffccc7;
}

.rule-group-card.exclude-card:hover .group-operator-line {
  background: #f53f3f;
}

/* group-content 标记是 AND 时（蓝色） */
.group-content[data-group-op="AND"] .group-operator-line {
  background: #165dff;
}

/* group-content 标记是 OR 时（紫色） */
.group-content[data-group-op="OR"] .group-operator-line {
  background: #722ed1;
}

/* 排除卡片的组内 OR/AND 颜色 */
.rule-group-card.exclude-card .group-content[data-group-op="AND"] .group-operator-line {
  background: #f53f3f;
}

.rule-group-card.exclude-card .group-content[data-group-op="OR"] .group-operator-line {
  background: #ff7d00;
}

/* 上下两端短横线（贴在轨道顶端和底端） */
.rule-group-card .group-operator::before,
.rule-group-card .group-operator::after {
  content: '';
  position: absolute;
  left: 50%;                       /* 与轨道中心对齐 */
  width: 10px;
  height: 2px;
  transform: translateX(-50%);
  background: inherit;
  z-index: 1;
}

.rule-group-card .group-operator::before {
  top: -10px;
}

.rule-group-card .group-operator::after {
  bottom: -10px;
}

/* 组内且/或 徽标（与组间胶囊视觉一致：圆角描边 + 阴影 + hover 缩放） */
.group-operator-badge {
  position: relative;
  z-index: 2;
  background: #fff;
  padding: 2px 10px;
  min-width: 32px;
  text-align: center;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  box-shadow: 0 0 0 2px #165dff, 0 2px 6px rgba(0, 0, 0, 0.06);
  color: #165dff;
  transition: all 0.2s;
}

.group-content[data-group-op="OR"] .group-operator-badge {
  box-shadow: 0 0 0 2px #722ed1, 0 2px 6px rgba(0, 0, 0, 0.06);
  color: #722ed1;
}

/* 排除卡片组内胶囊颜色 */
.rule-group-card.exclude-card .group-operator-badge {
  box-shadow: 0 0 0 2px #f53f3f, 0 2px 6px rgba(0, 0, 0, 0.06);
  color: #f53f3f;
}

.rule-group-card.exclude-card .group-content[data-group-op="OR"] .group-operator-badge {
  box-shadow: 0 0 0 2px #ff7d00, 0 2px 6px rgba(0, 0, 0, 0.06);
  color: #ff7d00;
}

.group-operator-badge:hover {
  transform: scale(1.08);
  box-shadow: 0 0 0 2px currentColor, 0 4px 10px rgba(0, 0, 0, 0.12);
}

/* 条件列表 */
.conditions-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-left: 14px;
  border-left: 1px solid #e5e6e8;
}

/* 单条件时无左轨道：去掉条件列表的左边框 + 内边距，让其与卡片左边缘对齐 */
.group-content:not(:has(.group-operator)) .conditions-list {
  padding-left: 0;
  border-left: none;
}

.rule-group-card.exclude-card .conditions-list {
  border-left-color: #ffd6d6;
}

/* 排除卡片单条件时也要去掉左边框 */
.rule-group-card.exclude-card .group-content:not(:has(.group-operator)) .conditions-list {
  border-left-color: transparent;
}

/* 条件行 */
.condition-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  margin: 0 -10px;
  border-radius: 6px;
  transition: background 0.15s ease;
  border: 1px solid transparent;
}

.condition-row:hover {
  background: #f0f7ff;
  border-color: #d6e8ff;
}

.rule-group-card.exclude-card .condition-row:hover {
  background: #fff5f5;
  border-color: #ffd6d6;
}

/* 条件类型徽章（不可点击，标识用） */
.condition-type {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.type-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  background: #f0fff5;
  color: #00b42a;
  border: 1px solid #d4f7df;
  white-space: nowrap;
  user-select: none;
  transition: all 0.15s ease;
}

.type-badge.is-event {
  background: #fff7e8;
  color: #ff7d00;
  border-color: #ffe1ad;
}

.type-badge :deep(.arco-icon) {
  font-size: 11px;
}

.type-badge.clickable {
  cursor: pointer;
}

.type-badge.clickable:hover {
  transform: scale(1.06);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  filter: brightness(0.97);
}

/* 时间窗口提示文案 */
.time-window-hint {
  color: #86909c;
  font-size: 12px;
  white-space: nowrap;
}

.condition-field,
.condition-operator,
.condition-value {
  display: flex;
  align-items: center;
}

.condition-value {
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
  gap: 4px;
}

.empty-hint {
  color: #c9cdd4;
  font-size: 12px;
  padding: 0 8px;
}

.event-hint {
  color: #646a73;
  font-size: 12px;
  padding: 0 4px;
}

/* 事件属性筛选（加购产品、加购数量等二级条件） */
.event-properties {
  margin: 6px 0 6px 28px;
  padding: 8px 10px;
  background: #f7f8fa;
  border-radius: 6px;
  border-left: 3px solid #165dff;
}

.event-properties-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 12px;
}

.event-properties-label {
  color: #1d2129;
  font-weight: 600;
}

.event-properties-hint {
  color: #86909c;
  font-size: 11px;
  flex: 1;
}

.event-property-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

/* 删除按钮 */
.condition-delete {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.condition-row:hover .condition-delete {
  opacity: 1;
}

/* 添加条件按钮行 */
.add-condition-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  margin-top: 4px;
}

.add-condition-row .arco-btn {
  border-style: dashed;
  border-radius: 6px;
  color: #165dff;
  transition: all 0.15s ease;
}

.add-condition-row .arco-btn:hover {
  background: #f0f7ff;
  border-color: #165dff;
  color: #165dff;
}

/* 排除区添加按钮色调 */
.exclude-card .add-condition-row .arco-btn {
  color: #f53f3f;
}

.exclude-card .add-condition-row .arco-btn:hover {
  background: #fff5f5;
  border-color: #f53f3f;
  color: #f53f3f;
}

/* 添加条件组按钮行 */
.add-group-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0 0 24px;
}

.add-group-row .arco-btn {
  border-style: dashed;
  border-radius: 6px;
  color: #165dff;
  transition: all 0.15s ease;
}

.add-group-row .arco-btn:hover {
  background: #f0f7ff;
  border-color: #165dff;
  color: #165dff;
}

.add-group-row .arco-btn[status="danger"] {
  color: #f53f3f;
}

.add-group-row .arco-btn[status="danger"]:hover {
  background: #fff5f5;
  border-color: #f53f3f;
  color: #f53f3f;
}

.add-group-hint {
  font-size: 12px;
  color: #86909c;
}

/* 响应式 */
@media (max-width: 1200px) {
  .condition-row {
    flex-wrap: wrap;
  }
  .condition-value {
    flex-basis: 100%;
    margin-top: 4px;
  }
}
</style>