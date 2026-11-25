<template>
  <div class="backtrack-create-page">
    <div class="page-header">
      <a-breadcrumb>
        <a-breadcrumb-item to="/model-offline-analysis/model-backtrack">模型回溯</a-breadcrumb-item>
        <a-breadcrumb-item>新建回溯</a-breadcrumb-item>
      </a-breadcrumb>
      <h1 class="page-title">新建回溯</h1>
      <div class="mode-selector" v-if="!routeParams.mode">
        <a-radio-group v-model="createMode" type="button" @change="handleModeChange">
          <a-radio v-for="option in modeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </a-radio>
        </a-radio-group>
      </div>
    </div>

    <div class="page-content">
      <!-- 顶部步骤进度条 -->
      <div class="step-progress-bar">
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: `${(stepStatus.doneCount / 6) * 100}%` }"></div>
        </div>
        <span class="progress-label">{{ stepStatus.doneCount }}/6 完成</span>
      </div>

      <!-- 步骤一：选择回溯模型 -->
      <a-collapse v-model:active-key="activeKeys" :bordered="false">
        <a-collapse-item key="model">
          <template #header>步骤一：选择回溯模型</template>
          <template #extra>
            <a-tag v-if="stepStatus.s1 === 'done'" color="green" size="small">已完成</a-tag>
            <a-tag v-else color="gray" size="small">待配置</a-tag>
          </template>
          <a-form :model="modelForm" layout="vertical">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="任务名称">
                  <a-input
                    v-model="modelForm.taskName"
                    placeholder="请输入任务名称（选填，最大50字符）"
                    :max-length="50"
                    show-word-limit
                  />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="模型与版本" required>
                  <a-cascader
                    v-model="modelForm.modelVersion"
                    :options="modelOptions"
                    allow-search
                    change-on-select
                    placeholder="请选择模型与版本"
                    @change="onModelVersionChange"
                  />
                </a-form-item>
              </a-col>
            </a-row>

            <!-- 模型产物文件：选定模型与版本后从平台拉取，支持 .pkl / .pb（TensorFlow frozen graph） -->
            <a-form-item
              v-if="modelForm.serviceName"
              label="模型文件"
              required
              :extra="`支持格式：${modelFileFormatHint}；拉取到的产物随任务配置下发执行引擎，版本变更后需重新拉取`"
            >
              <div class="model-file-row">
                <a-button
                  type="primary"
                  :loading="modelFileLoading"
                  :disabled="!modelForm.selectedVersion"
                  @click="handlePullModelFile"
                >
                  {{ modelFile ? '重新拉取模型文件' : '拉取模型文件' }}
                </a-button>
                <div v-if="modelFile" class="model-file-meta">
                  <icon-file />
                  <span class="model-file-name">{{ modelFile.fileName }}</span>
                  <a-tag size="small" color="arcoblue">.{{ modelFile.format }}（{{ modelFile.formatLabel }}）</a-tag>
                  <a-tag size="small" color="green">{{ modelFile.size }}</a-tag>
                  <span class="model-file-path">{{ modelFile.url }}</span>
                  <span class="model-file-time">{{ modelFile.pulledAt }} 拉取</span>
                </div>
                <div v-else class="field-hint">尚未拉取：执行回溯前需先拉取所选版本的模型产物</div>
              </div>
            </a-form-item>

            <!-- 模块A P0：推理入参特征文件落库勾选项 -->
            <!-- 回溯时间窗口不单独设项：样本数据在步骤三的 SQL 条件里用 dt 区间界定，重复录入只会两处不一致 -->
            <a-form-item v-if="createMode === CREATE_MODES.SINGLE">
              <a-checkbox v-model="observeForm.featurePersist">
                推理入参入库
              </a-checkbox>
              <div class="field-hint" style="margin-top:4px;">勾选后，本次回溯的推理入参特征文件将写入推理结果表，供后续追溯与复用</div>
            </a-form-item>
        </a-form>
        </a-collapse-item>

        <!-- 步骤二：落表目标与场景配置（新增） -->
        <a-collapse-item key="target">
          <template #header>步骤二：落表目标与场景配置</template>
          <template #extra>
            <a-tag v-if="stepStatus.s2 === 'done'" color="green" size="small">已完成</a-tag>
            <a-tag v-else color="gray" size="small">待配置</a-tag>
          </template>
          <a-form layout="vertical">
            <!-- 落库模式开关：标准化 vs 临时（备用） -->
            <a-form-item label="落库模式" extra="标准化落库写入治理表（dw.*），一个模型同时写多模型汇总表与模型标准表；临时落库写到临时表（不删表），仅供验证与应急取数">
              <a-radio-group v-model="landingForm.mode" @change="onLandingModeChange">
                <a-radio value="standard">标准化落库<span class="mode-hint">（默认，写入模型标准表 + 多模型汇总表）</span></a-radio>
                <a-radio value="temp">临时落库<span class="mode-hint">（备用，不删表、不进血缘与治理清单）</span></a-radio>
              </a-radio-group>
            </a-form-item>

            <!-- 落表目标选择（仅标准化模式） -->
            <a-form-item v-if="landingForm.mode === 'standard'" label="落表目标" extra="一个模型同时写入多模型汇总表与模型标准表（并行写入）">
              <div class="landing-block">
                <!-- 多模型汇总表 -->
                <div class="landing-group">
                  <a-checkbox v-model="landingForm.summary" @change="onSummaryToggle">
                    多模型汇总表
                  </a-checkbox>
                  <div class="landing-sub" v-if="landingForm.summary">
                    <a-radio-group v-model="landingForm.summaryType" @change="onSummaryTypeChange">
                      <a-radio value="general">通用汇总表（含 business_code 字段）</a-radio>
                      <a-radio value="channel">渠道专属汇总表</a-radio>
                    </a-radio-group>
                    <a-select
                      v-if="landingForm.summaryType === 'channel'"
                      v-model="landingForm.channelCode"
                      placeholder="选择具体渠道"
                      allow-search
                      style="width: 240px; margin-top: 8px;"
                    >
                      <a-option v-for="c in landingChannelOptions" :key="c.value" :value="c.value">{{ c.label }}</a-option>
                    </a-select>
                  </div>
                </div>
                <!-- 模型标准表 -->
                <div class="landing-group">
                  <a-checkbox v-model="landingForm.singleModel" @change="onSingleModelToggle">
                    模型标准表
                  </a-checkbox>
                  <div class="landing-sub" v-if="landingForm.singleModel">
                    <a-radio-group v-model="landingForm.singleTableType">
                      <a-radio value="realtime">实时表</a-radio>
                      <a-radio value="offline">离线表</a-radio>
                    </a-radio-group>
                  </div>
                </div>
              </div>
              <!-- 表名预览 -->
              <div class="landing-table-preview" v-if="landingTableNames.length">
                <div class="preview-title">将写入以下表：</div>
                <div class="preview-item" v-for="item in landingTableNames" :key="item.table">
                  <span class="preview-label">{{ item.label }}</span>
                  <span class="preview-table">{{ item.table }}</span>
                </div>
              </div>
            </a-form-item>

            <!-- 临时落库参数（仅 temp 模式） -->
            <template v-else>
              <a-form-item label="临时表名" required extra="建议以 tmp. 前缀；临时落库不删表，任务不会自动回收，如需清理请手工处理">
                <div class="temp-table-row">
                  <a-input
                    v-model="landingForm.tempTable"
                    placeholder="例如 tmp.risk_model_backtrack_xxx_20260101"
                    allow-clear
                    style="max-width: 460px;"
                  />
                  <a-button size="small" type="outline" @click="fillDefaultTempTable">生成默认名</a-button>
                </div>
              </a-form-item>
              <a-alert type="warning" :show-icon="true" style="margin-bottom: 12px;">
                临时落库只写这一张临时表，不会写入模型标准表与多模型汇总表；产物不进入血缘与治理清单，且任务不会自动删表
              </a-alert>
              <div v-if="landingTableNames.length" class="landing-table-preview">
                <div class="preview-title">将写入以下表：</div>
                <div class="preview-item" v-for="item in landingTableNames" :key="item.table">
                  <span class="preview-label">{{ item.label }}</span>
                  <span class="preview-table">{{ item.table }}</span>
                </div>
              </div>
            </template>

            <!-- 场景标签 -->
            <a-form-item label="场景标签" :extra="createMode === CREATE_MODES.PERIODIC ? '周期任务：首次配置选择，后续周期执行沿用' : '临时任务：每次配置时手动选择（仅展示标记，不参与校验）'">
              <a-select
                v-model="sceneTags"
                placeholder="选择场景标签"
                multiple
                allow-clear
                style="width: 100%; max-width: 480px;"
              >
                <a-option v-for="tag in sceneTagOptions" :key="tag" :value="tag">{{ tag }}</a-option>
              </a-select>
            </a-form-item>
          </a-form>
        </a-collapse-item>

        <!-- 步骤三：配置样本数据 / 周期回溯 -->
        <a-collapse-item key="sample">
          <template #header>{{ createMode === CREATE_MODES.SINGLE ? '步骤三：选择样本数据' : '步骤三：配置周期回溯' }}</template>
          <template #extra>
            <a-tag v-if="stepStatus.s3 === 'done'" color="green" size="small">已完成</a-tag>
            <a-tag v-else color="gray" size="small">待配置</a-tag>
          </template>
          <!-- 周期回溯专用配置区 -->
          <template v-if="createMode === CREATE_MODES.PERIODIC">
            <a-divider orientation="left">周期执行配置</a-divider>
            <a-row :gutter="16">
              <!-- 左：执行频率 -->
              <a-col :span="8">
                <a-form-item label="执行频率" required>
                  <a-radio-group v-model="sampleForm.periodicity" style="flex-direction: column; align-items: flex-start;">
                    <a-radio value="daily">每日</a-radio>
                    <a-radio value="weekly">每周</a-radio>
                    <a-radio value="monthly">每月</a-radio>
                  </a-radio-group>
                </a-form-item>
                <!-- 每周具体星期 -->
                <a-form-item v-if="sampleForm.periodicity === 'weekly'" label="选择星期" required>
                  <a-checkbox-group v-model="sampleForm.weekDays">
                    <a-checkbox value="1">周一</a-checkbox>
                    <a-checkbox value="2">周二</a-checkbox>
                    <a-checkbox value="3">周三</a-checkbox>
                    <a-checkbox value="4">周四</a-checkbox>
                    <a-checkbox value="5">周五</a-checkbox>
                    <a-checkbox value="6">周六</a-checkbox>
                    <a-checkbox value="0">周日</a-checkbox>
                  </a-checkbox-group>
                </a-form-item>
                <!-- 每月具体日期 -->
                <a-form-item v-if="sampleForm.periodicity === 'monthly'" label="选择日期" required>
                  <a-select v-model="sampleForm.monthDays" placeholder="选择日期" multiple allow-clear style="width: 100%;">
                    <a-option v-for="d in monthDayOptions" :key="d" :value="d">{{ d }}号</a-option>
                  </a-select>
                </a-form-item>
              </a-col>

              <!-- 中：触发方式 -->
              <a-col :span="8">
                <a-form-item label="触发方式" required>
                  <a-radio-group v-model="sampleForm.triggerType" style="flex-direction: column; align-items: flex-start;">
                    <a-radio value="schedule">定时触发</a-radio>
                    <a-radio value="subscribe">订阅袋鼠云任务</a-radio>
                  </a-radio-group>
                </a-form-item>
                <!-- 定时配置 -->
                <a-form-item v-if="sampleForm.triggerType === 'schedule'" label="执行时间">
                  <a-time-picker v-model="sampleForm.scheduleTime" format="HH:mm" placeholder="选择执行时间" style="width: 100%;" />
                </a-form-item>
                <!-- 订阅配置 -->
                <a-form-item v-if="sampleForm.triggerType === 'subscribe'" label="选择袋鼠云任务">
                  <a-select v-model="sampleForm.kangarooTaskId" placeholder="选择任务ID" allow-search style="width: 100%;">
                    <a-option value="">无</a-option>
                    <a-option value="task-001">Doris表插入任务ID-001</a-option>
                    <a-option value="task-002">Doris表插入任务ID-002</a-option>
                    <a-option value="task-003">Hive表插入任务ID-001</a-option>
                    <a-option value="task-004">Hive表插入任务ID-002</a-option>
                  </a-select>
                </a-form-item>
              </a-col>

              <!-- 右：执行时间窗口 -->
              <a-col :span="8">
                <a-form-item label="任务执行时间窗口" required>
                  <a-range-picker
                    :model-value="[sampleForm.taskStartDate, sampleForm.taskEndDate]"
                    @change="onTaskDateRangeChange"
                    @select="onTaskDateRangeSelect"
                    format="YYYY-MM-DD"
                    style="width: 100%; margin-bottom: 20px;"
                  />
                </a-form-item>
              </a-col>
            </a-row>
          </template>
          <!-- 样本表输入（共同部分）-->
          <a-divider orientation="left">样本表配置</a-divider>
          <a-form :model="sampleForm" layout="vertical">
            <div class="sample-table-row">
              <div class="field-label">
                <span class="label-text">样本表</span>
                <span class="required-star">*</span>
              </div>
              <div class="field-control">
                <div class="input-with-btn">
                  <a-input
                    v-model="sampleForm.tableNameInput"
                    placeholder="请输入表名，例如: dw.user"
                    :status="tableInputStatus === 'error' ? 'error' : undefined"
                    allow-clear
                    @keyup.enter="handleTableValidate"
                  />
                  <a-button type="primary" @click="handleTableValidate" :loading="tableLoading">
                    {{ tableInputStatus === 'success' ? '重新拉取' : '拉取数据' }}
                  </a-button>
                </div>
                <div v-if="tableInputStatus === 'success'" class="field-status success">
                  <icon-check-circle /> 表存在，共 {{ tableColumns.length }} 个字段
                </div>
                <div v-if="tableInputStatus === 'error'" class="field-status error">
                  <icon-close-circle /> 表不存在，请检查表名是否正确
                </div>
              </div>
            </div>

            <!-- 样本表字段：拉取成功后才展示 -->
            <a-form-item v-if="tableColumns.length > 0" label="样本表字段">
              <template #label>样本表字段（共 {{ tableColumns.length }} 个）</template>
              <a-table :data="tableColumns" :columns="tableColumnDefs" row-key="name" size="small" :pagination="false" />
            </a-form-item>

            <!-- SQL 条件 -->
            <div class="sql-where-row">
              <div class="field-label">
                <span class="label-text">WHERE 条件追加</span>
              </div>
              <div class="field-control">
                <div class="sql-input-wrap">
                  <a-input
                    v-model="sampleForm.sqlWhere"
                    placeholder="例如: user_id > 1000 AND status = 'active'"
                    allow-clear
                  />
                  <div class="field-hint">直接输入 WHERE 子句条件部分，无需写 WHERE 关键字</div>
                </div>
              </div>
            </div>

            <!-- SQL 预览 -->
            <a-form-item label="SQL 预览">
              <div class="sql-preview-box">
                <div class="sql-preview-label">原始 SQL</div>
                <div class="sql-text"><code>{{ baseSQL }}</code></div>
                <template v-if="sampleForm.sqlWhere">
                  <div class="sql-preview-label">追加条件后</div>
                  <div class="sql-text highlighted"><code>{{ fullSQL }}</code></div>
                </template>
              </div>
            </a-form-item>

            <!-- 关联方式选择（新增）：样本表无 flow_id 时自动提示可选 -->
            <a-form-item label="关联方式" :extra="associationHint">
              <a-radio-group v-model="associationMethod">
                <a-radio v-for="m in associationMethods" :key="m.value" :value="m.value">{{ m.label }}</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-form>
        </a-collapse-item>

        <!-- 步骤四：关联条件配置 -->
        <a-collapse-item key="required">
          <template #header>步骤四：关联条件配置</template>
          <template #extra>
            <a-tag v-if="stepStatus.s4 === 'done'" color="green" size="small">已完成</a-tag>
            <a-tag v-else-if="stepStatus.s4 === 'partial'" color="orange" size="small">{{ stepStatus.reqMatched }}/{{ stepStatus.reqTotal }}</a-tag>
            <a-tag v-else color="gray" size="small">待配置</a-tag>
          </template>
          <a-alert v-if="!sampleReady" type="info" :show-icon="true" style="margin-bottom: 12px;">
            请先完成步骤三：拉取样本表数据
          </a-alert>
          <div class="section-tip">
            为每个必填字段配置与来源表的关联条件：日期关联逻辑固定以样本观测日 <code>watch_dt</code> 为锚点往前推 X 天（只填 X），
            来源表为「外数类」（外数底表 / 外数宽表）时还需填写缓存天数——<b>外数底表按表统一、可批量覆盖；外数宽表按外数列独立</b>；样本字段即关联时样本侧的 join key
          </div>
          <div class="table-search-row">
            <a-input-search
              v-model="requiredSearch"
              placeholder="按字段名搜索"
              allow-clear
              style="width: 240px; margin-bottom: 8px;"
            />
          </div>
          <!-- 外数表缓存天数面板：底表按表统一批量覆盖；宽表按列独立，同时提供一键覆盖 N 行 -->
          <div v-if="externalCacheGroups.length" class="cache-days-panel">
            <div class="cache-days-head">
              <span class="cache-days-title">外数表缓存天数</span>
              <span class="cache-days-hint">外数底表一个值刷全表；外数宽表下方逐个外数列独立调整</span>
            </div>
            <div v-for="grp in externalCacheGroups" :key="grp.table" class="cache-days-group">
              <div class="cache-days-row">
                <span class="cache-days-table">{{ grp.table }}</span>
                <a-tag size="small" :color="grp.isWide ? 'arcoblue' : 'gray'">{{ grp.isWide ? '外数宽表 · 按列' : '外数底表 · 按表' }}</a-tag>
                <a-input-number
                  v-model="cacheDaysBulk[grp.table]"
                  size="mini"
                  :min="0"
                  :max="365"
                  :step="1"
                  :precision="0"
                  hide-button
                  placeholder="天数"
                  style="width: 96px;"
                >
                  <template #suffix>天</template>
                </a-input-number>
                <a-button
                  size="mini"
                  type="outline"
                  :disabled="isNil(cacheDaysBulk[grp.table])"
                  @click="applyCacheDaysToTable(grp)"
                >
                  应用到 {{ grp.rows.length }} 行
                </a-button>
              </div>
              <div v-if="grp.isWide" class="cache-days-cols">
                <div v-for="row in grp.rows" :key="row.name" class="cache-days-col">
                  <a-tooltip :content="`${row.name}（${row.label || ''}） 列级缓存天数`">
                    <span class="cache-days-col-name">{{ row.name }}</span>
                  </a-tooltip>
                  <a-input-number
                    :model-value="row.cacheDays"
                    size="mini"
                    :min="0"
                    :max="365"
                    :step="1"
                    :precision="0"
                    hide-button
                    placeholder="天数"
                    style="width: 92px;"
                    @change="(v) => { row.cacheDays = v; updateRequiredStatus(row); }"
                  >
                    <template #suffix>天</template>
                  </a-input-number>
                </div>
              </div>
            </div>
          </div>
          <a-table
            class="required-map-table"
            :data="filteredRequiredMappings"
            :columns="requiredColumns"
            row-key="name"
            size="small"
            :pagination="false"
            :scroll="{ x: requiredTableWidth }"
          >
            <template #nameCell="{ record }">
              <span class="field-name">{{ record.name }}</span>
              <a-tooltip v-if="record.required" content="必填字段，缺失将阻断提交">
                <span class="required-star">*</span>
              </a-tooltip>
            </template>
            <template #sourceCell="{ record }">
              <a-select
                :model-value="record.sourceTable"
                placeholder="选择来源表"
                size="small"
                allow-search
                allow-clear
                :trigger-props="dropdownFitContent"
                style="width: 100%;"
                @change="(v) => onSourceTableChange(record, v)"
              >
                <a-option v-for="t in sourceTables" :key="t.table" :value="t.table" :label="t.table">
                  {{ t.table }} <span class="col-type">{{ sourceTableTypeLabel(t.tableType) }}</span>
                </a-option>
              </a-select>
            </template>
            <template #dateFieldCell="{ record }">
              <a-select
                v-model="record.dateField"
                placeholder="选择日期字段"
                size="small"
                allow-search
                allow-clear
                :disabled="!record.sourceTable"
                :trigger-props="dropdownFitContent"
                :not-found-content="record.sourceTable ? '该表无日期字段' : '请先选来源表'"
                style="width: 100%;"
                @change="updateRequiredStatus(record)"
              >
                <a-option v-for="f in dateFieldsOf(record.sourceTable)" :key="f.name" :value="f.name" :label="f.name">
                  {{ f.name }} <span class="col-type">{{ f.comment }}</span>
                </a-option>
              </a-select>
            </template>
            <template #targetCell="{ record }">
              <a-select
                v-model="record.target"
                placeholder="选择样本字段"
                allow-search
                allow-clear
                size="small"
                :trigger-props="dropdownFitContent"
                style="width: 100%;"
                @change="updateRequiredStatus(record)"
              >
                <a-option v-for="c in tableColumns" :key="c.name" :value="c.name" :label="c.name">
                  {{ c.name }} <span class="col-type">{{ c.type }}</span>
                </a-option>
              </a-select>
            </template>
            <template #encryptedCell="{ record }">
              <a-tooltip content="关联时是否对该字段加密">
                <a-switch v-model="record.isEncrypted" size="small" />
              </a-tooltip>
            </template>
            <template #joinLogicCell="{ record }">
              <div class="date-expr">
                <a-tooltip content="固定锚点：样本观测日，不可改，只填往前推的天数">
                  <span class="expr-anchor">{{ watchDateField }} -</span>
                </a-tooltip>
                <a-input-number
                  v-model="record.dateOffsetDays"
                  size="small"
                  :min="0"
                  :max="365"
                  :step="1"
                  :precision="0"
                  hide-button
                  class="expr-input"
                  @change="updateRequiredStatus(record)"
                >
                  <template #suffix>天</template>
                </a-input-number>
              </div>
            </template>
            <template #cacheDaysCell="{ record }">
              <span v-if="!isExternalSource(record.sourceTable)" class="cell-na">—</span>
              <a-input-number
                v-else
                v-model="record.cacheDays"
                size="small"
                :min="0"
                :max="365"
                :step="1"
                :precision="0"
                hide-button
                :placeholder="isExternalWide(record.sourceTable) ? '按列' : '按表'"
                @change="updateRequiredStatus(record)"
              >
                <template #suffix>天</template>
              </a-input-number>
            </template>
            <template #statusCell="{ record }">
              <a-tooltip :content="requiredRowMissing(record).length ? '待补：' + requiredRowMissing(record).join('、') : '映射完整'">
                <a-tag :color="record.status === 'matched' ? 'green' : (record.required ? 'red' : 'orange')" class="status-tag">
                  {{ record.status === 'matched' ? '已匹配' : (record.required ? '未匹配' : '可空') }}
                </a-tag>
              </a-tooltip>
            </template>
          </a-table>
        </a-collapse-item>

        <!-- 步骤五：入参匹配 -->
        <a-collapse-item key="match">
          <template #header>步骤五：入参匹配</template>
          <template #extra>
            <a-tag v-if="stepStatus.s5 === 'done'" color="green" size="small">已完成</a-tag>
            <a-tag v-else-if="stepStatus.s5 === 'partial'" color="orange" size="small">{{ stepStatus.mapMatched }}/{{ stepStatus.mapTotal }}</a-tag>
            <a-tag v-else color="gray" size="small">待配置</a-tag>
          </template>
          <a-alert v-if="!sampleReady" type="info" :show-icon="true" style="margin-bottom: 12px;">
            请先完成步骤三：拉取样本表数据
          </a-alert>
          <div class="section-tip">
            模型入参的取值来源分两张表展示：<b>需手动匹配</b>——先看第一张表，系统命中不了的入参在这里人工选择或用「一键入参匹配」批量处理；命中「其他」大类特征后需确认关联方式：存在 data_dt 关联 → 选日期字段与缓存天数，无 → 全量关联；
            <b>系统后端自动匹配</b>——第二张表只读汇总由系统按样本表 / 特征底表同名字段直接命中的行（数量多，分页展示），特征类型统一按业务类别口径（外数 / 征信 / 行为 / 其他）标注；已匹配 {{ matchedCount }} / {{ inputMappings.length }}（系统 {{ autoRows.length }}、手动 {{ matchedCount - autoRows.length }}），待手动匹配 {{ manualUnmatchedCount }}
          </div>
          <div class="group-title">需手动匹配<span class="group-title-count">{{ manualRows.length }} 条（未匹配 {{ manualUnmatchedCount }} 置顶，完成后沉底）</span></div>
          <div class="table-search-row">
            <a-input-search
              v-model="mappingSearch"
              placeholder="按入参名搜索"
              allow-clear
              style="width: 240px; margin-bottom: 8px;"
            />
            <!-- 一键入参匹配：只碰未匹配行，N 为 0 或未拉取样本表时置灰 -->
            <a-tooltip
              :content="sampleReady ? (unmatchedInputCount ? '对未匹配入参按样本表同名字段批量匹配' : '所有入参均已匹配') : '请先完成步骤三：拉取样本表数据'"
            >
              <span>
                <a-button
                  type="outline"
                  size="small"
                  :disabled="!sampleReady || !unmatchedInputCount"
                  style="margin-bottom: 8px;"
                  @click="autoMatchFromSample"
                >
                  一键入参匹配（{{ unmatchedInputCount }}）
                </a-button>
              </span>
            </a-tooltip>
          </div>
          <a-table
            :data="filteredManualMappings"
            :columns="mappingDefs"
            row-key="rowKey"
            size="small"
            :pagination="{ defaultPageSize: 50, pageSizeOptions: [20, 50, 100, 200], showPageSize: true, showTotal: true, showJumper: true }"
          >
            <template #nameCell="{ record }">
              <a-tooltip :content="`入参来自模型服务：${record.from || '当前模型'}`">
                <span class="expr-anchor">{{ record.name }}</span>
              </a-tooltip>
            </template>
            <template #bizCell="{ record }">
              <span>{{ autoBizLabel(record) || '—' }}</span>
            </template>
            <template #sourceCell="{ record }">
              <a-select
                :model-value="record.source === 'sample' ? 'sample' : 'feature'"
                size="small"
                :trigger-props="dropdownFitContent"
                style="width: 100%;"
                @change="(v) => onInputSourceChange(record, v)"
              >
                <a-option v-for="(label, key) in inputSources" :key="key" :value="key" :label="label">{{ label }}</a-option>
              </a-select>
            </template>
            <template #targetCell="{ record }">
              <!-- 来源=样本表：直接列步骤三拉取的样本字段 -->
              <a-select
                v-if="record.source === 'sample'"
                :model-value="record.target"
                placeholder="选择样本表字段"
                allow-search
                allow-clear
                size="small"
                :disabled="!sampleReady"
                :trigger-props="dropdownFitContent"
                :not-found-content="sampleReady ? '样本表无字段' : '请先拉取样本表'"
                style="width: 100%;"
                @change="(v) => { record.target = v || ''; updateInputStatus(record); }"
              >
                <a-option v-for="c in tableColumns" :key="c.name" :value="c.name" :label="c.name">
                  {{ c.name }} <span class="col-type">{{ c.type }}</span>
                </a-option>
              </a-select>
              <!-- 来源=特征中心：打开下拉即列已配置特征，输入关键词后端模糊搜索（防抖 250ms） -->
              <a-select
                v-else
                :model-value="record.target"
                placeholder="选择/搜索特征"
                style="width: 100%;"
                allow-search
                :filter-option="false"
                :trigger-props="dropdownFitContent"
                :loading="featureSearchLoading && featureSearchActiveRowKey === record.rowKey"
                :not-found-content="featureSearchLoading && featureSearchActiveRowKey === record.rowKey ? '搜索中…' : '无匹配特征'"
                @popup-visible-change="(v) => v && triggerFeatureSearch(record.rowKey, '')"
                @search="(kw) => triggerFeatureSearch(record.rowKey, kw)"
                @change="(v) => { record.target = v; resetInputAssoc(record); updateInputStatus(record); }"
              >
                <a-option
                  v-for="f in (featureSearchActiveRowKey === record.rowKey ? featureSearchResults : (record.target ? [{ name: record.target, code: record.target, description: '当前已选' }] : []))"
                  :key="f.code || f.name"
                  :value="f.code || f.name"
                  :label="f.code || f.name"
                >
                  {{ f.name }} <span class="col-type">{{ bizLabelOfOption(f) }}</span>
                </a-option>
              </a-select>
              <!-- 「其他」大类（非标准）特征：系统不知道关联口径，必须由人工确认 data_dt 关联 or 全量关联 -->
              <div v-if="isOtherFeatureRow(record)" class="other-assoc">
                <a-radio-group
                  v-model="record.hasDataDt"
                  size="mini"
                  type="button"
                  @change="() => onHasDataDtChange(record)"
                >
                  <a-radio :value="true">存在 data_dt 关联</a-radio>
                  <a-radio :value="false">无 · 全量关联</a-radio>
                </a-radio-group>
                <template v-if="record.hasDataDt === true">
                  <a-select
                    v-model="record.dateField"
                    size="mini"
                    placeholder="关联日期字段"
                    :trigger-props="dropdownFitContent"
                    style="width: 148px;"
                    @change="() => updateInputStatus(record)"
                  >
                    <a-option v-for="d in OTHER_ASSOC_DATE_FIELDS" :key="d" :value="d">{{ d }}</a-option>
                  </a-select>
                  <a-input-number
                    v-model="record.cacheDays"
                    size="mini"
                    :min="0"
                    :max="365"
                    :precision="0"
                    hide-button
                    placeholder="缓存天数"
                    style="width: 118px;"
                    @change="() => updateInputStatus(record)"
                  >
                    <template #suffix>天</template>
                  </a-input-number>
                </template>
                <a-tag v-if="record.hasDataDt === false" color="gray" size="small">全量关联</a-tag>
              </div>
            </template>
            <template #statusCell="{ record }">
              <a-tooltip :content="inputRowMissing(record).length ? '待补：' + inputRowMissing(record).join('、') : '映射完整'">
                <a-tag :color="record.status === 'matched' ? 'green' : 'red'" class="status-tag">
                  {{ record.status === 'matched' ? '已匹配' : '未匹配' }}
                </a-tag>
              </a-tooltip>
            </template>
          </a-table>
          <!-- 系统同名命中行：命中量大，置于手动表之后，固定五列只读 + 分页汇总展示 -->
          <template v-if="autoRows.length">
            <div class="group-title" style="margin-top: 16px;">系统后端自动匹配（样本表 / 特征底表同名字段命中）<span class="group-title-count">{{ autoRows.length }} 条</span></div>
            <a-table
              :data="filteredAutoRows"
              :columns="autoMappingDefs"
              row-key="rowKey"
              size="small"
              :pagination="{ defaultPageSize: 50, pageSizeOptions: [20, 50, 100, 200], showPageSize: true, showTotal: true }"
            >
              <template #nameCell="{ record }">
                <a-tooltip :content="`入参来自模型服务：${record.from || '当前模型'}`">
                  <span class="expr-anchor">{{ record.name }}</span>
                </a-tooltip>
              </template>
              <template #autoBizCell="{ record }">
                <span>{{ autoBizLabel(record) || '—' }}</span>
              </template>
              <template #autoSourceCell="{ record }">
                <a-tag :color="record.source === 'sample' ? 'arcoblue' : 'green'" size="small">{{ inputSources[record.source] || record.source }}</a-tag>
              </template>
              <template #autoStatusCell>
                <a-tag color="green" class="status-tag">已匹配</a-tag>
              </template>
            </a-table>
          </template>
        </a-collapse-item>

        <!-- 步骤六：输出信息 -->
        <a-collapse-item key="output">
          <template #header>步骤六：输出信息</template>
          <template #extra>
            <a-tag v-if="stepStatus.s6 === 'done'" color="green" size="small">已完成</a-tag>
            <a-tag v-else color="gray" size="small">待配置</a-tag>
          </template>
          <!-- 主模型分指定（新增）：模型输出含多个分值时出现 -->
          <a-form-item
            v-if="modelOutputs.length > 1"
            label="主模型分指定"
            extra="指定哪个分值落入 model_score 固定字段"
            style="margin-bottom: 12px;"
          >
            <a-select
              v-model="mainScoreField"
              placeholder="选择主模型分字段"
              allow-search
              style="width: 100%; max-width: 360px;"
            >
              <a-option v-for="o in modelOutputs" :key="o.name" :value="o.name">
                {{ o.name }} <span class="col-type">{{ o.type }}</span>
              </a-option>
            </a-select>
          </a-form-item>
          <div class="table-search-row">
            <a-input-search
              v-model="outputSearch"
              placeholder="按出参名搜索"
              allow-clear
              style="width: 240px; margin-bottom: 8px;"
            />
          </div>
          <a-table :data="filteredModelOutputs" :columns="modelOutputDefs" row-key="name" size="small" :pagination="false" />
        </a-collapse-item>
      </a-collapse>
    </div>

    <!-- 底部操作栏 -->
    <div class="actions-bar">
      <div class="actions-inner">
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" :loading="submitting" @click="handleSubmit">创建回溯</a-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { backtrackAPI } from '@/modules/offline-model/api'
import { featureAPI } from '@/modules/offline-model/api'
import { modelAPI } from '@/modules/offline-model/api'
import {
  getBacktrackRouteParams,
  CREATE_MODES,
  isFromRiskModule
} from '@/modules/offline-model/utils/model-backtrack-router'

const router = useRouter()
const route = useRoute()
const submitting = ref(false)

// 折叠面板：默认全部展开，点击标题展开/收起
const activeKeys = ref(['model', 'target', 'sample', 'required', 'match', 'output'])

// 步骤完成状态
const stepStatus = computed(() => {
  const s1 = (modelForm.value.serviceName && modelFile.value) ? 'done' : 'pending'
  const s2 = landingForm.value.mode === LANDING_MODES.TEMP
    ? (landingForm.value.tempTable?.trim() ? 'done' : 'pending')
    : ((landingForm.value.summary || landingForm.value.singleModel) ? 'done' : 'pending')
  const s3 = tableInputStatus.value === 'success' ? 'done' : 'pending'
  const reqMatched = requiredMappings.value.filter(r => isRequiredRowComplete(r)).length
  const reqTotal = requiredMappings.value.length
  const s4 = reqTotal === 0 ? 'pending' : (reqMatched === reqTotal ? 'done' : 'partial')
  const mapMatched = inputMappings.value.filter(r => r.target).length
  const mapTotal = inputMappings.value.length
  const s5 = mapTotal === 0 ? 'pending' : (mapMatched === mapTotal ? 'done' : 'partial')
  const s6 = modelOutputs.value.length > 0 ? 'done' : 'pending'
  const doneCount = [s1, s2, s3, s4, s5, s6].filter(s => s === 'done').length
  return { s1, s2, s3, s4, s5, s6, reqMatched, reqTotal, mapMatched, mapTotal, doneCount }
})

// 步骤依赖检查：步骤四~六依赖步骤三样本表验证
const sampleReady = computed(() => tableInputStatus.value === 'success')

// 获取路由参数
const routeParams = getBacktrackRouteParams(route)
const isFromRisk = computed(() => isFromRiskModule(route))

// 模式选择
const createMode = ref(routeParams.mode || CREATE_MODES.SINGLE)
const modeOptions = [
  { label: '单次回溯', value: CREATE_MODES.SINGLE },
  { label: '周期回溯', value: CREATE_MODES.PERIODIC }
]

// 生成每月日期选项
const monthDayOptions = Array.from({ length: 31 }, (_, i) => (i + 1).toString())

// 样本表
const sampleForm = ref({
  mode: CREATE_MODES.SINGLE,
  sourceType: 'doris',
  tableNameInput: '',
  sqlWhere: '',
  periodicity: 'daily',
  weekDays: [],
  monthDays: [],
  triggerType: 'schedule',
  scheduleTime: null,
  kangarooTaskId: '',
  taskStartDate: null,
  taskEndDate: null
})
const tableColumns = ref([])
const tableColumnDefs = [
  { title: '字段名', dataIndex: 'name', width: 200 },
  { title: '类型', dataIndex: 'type', width: 160 }
]
const tableLoading = ref(false)
const tableInputStatus = ref('')
const requiredMappings = ref([])
// 来源表字典 / 表类型 / 日期关联锚点（步骤四：关联条件配置）
const sourceTables = ref([])
const sourceTableTypes = ref({})
const watchDateField = ref('watch_dt')
const sourceTableTypeLabel = (t) => sourceTableTypes.value[t] || t
const isExternalSource = (table) => !!table && backtrackAPI.isExternalSourceTable(table)
const isExternalWide = (table) => !!table && backtrackAPI.isExternalWideTable(table)
const dateFieldsOf = (table) => backtrackAPI.getDateFieldsOf(table) || []
const isNil = (v) => v === null || v === undefined || v === ''
// 下拉面板默认被锁成与选择框同宽，密排列里选项文案会被省略号截断，改为「不小于选择框宽度且随内容自适应」
const dropdownFitContent = { autoFitPopupWidth: false, autoFitPopupMinWidth: true }

// 列序：字段 / 来源表 / 日期字段 / 说明 / 样本字段 / 是否关联时加密 / 日期关联逻辑 /（外数底表）缓存天数 / 状态
// 缓存天数列仅在当前映射里存在外数底表行时出现
const requiredColumns = computed(() => {
  const cols = [
    { title: '字段', dataIndex: 'name', slotName: 'nameCell', width: 118 },
    { title: '来源表', dataIndex: 'sourceTable', slotName: 'sourceCell', width: 190 },
    { title: '日期字段', dataIndex: 'dateField', slotName: 'dateFieldCell', width: 142 },
    { title: '说明', dataIndex: 'label', width: 92, ellipsis: true, tooltip: true },
    { title: '样本字段', dataIndex: 'target', slotName: 'targetCell', width: 162 },
    { title: '是否关联时加密', dataIndex: 'isEncrypted', slotName: 'encryptedCell', width: 96, align: 'center' },
    { title: '日期关联逻辑', dataIndex: 'dateOffsetDays', slotName: 'joinLogicCell', width: 176 }
  ]
  if (requiredMappings.value.some(r => isExternalSource(r.sourceTable))) {
    cols.push({ title: '缓存天数', dataIndex: 'cacheDays', slotName: 'cacheDaysCell', width: 104 })
  }
  cols.push({ title: '状态', dataIndex: 'status', slotName: 'statusCell', width: 84, align: 'center' })
  return cols
})
const requiredTableWidth = computed(() => requiredColumns.value.reduce((sum, c) => sum + (c.width || 0), 0))

// 行完整性：来源表 + 样本字段 + 日期关联天数必齐（X 可以为 0）；来源表是外数类（底表/宽表）时，日期字段与缓存天数也必齐
const requiredRowMissing = (record) => {
  const missing = []
  if (!record.sourceTable) missing.push('来源表')
  if (!record.target) missing.push('样本字段')
  if (isNil(record.dateOffsetDays)) missing.push('日期关联天数')
  if (isExternalSource(record.sourceTable)) {
    if (!record.dateField) missing.push('日期字段')
    if (isNil(record.cacheDays)) missing.push('缓存天数')
  }
  return missing
}
const isRequiredRowComplete = (record) => requiredRowMissing(record).length === 0

// 外数表缓存天数面板：同一来源表归为一组；底表只需一个批量入口，宽表额外展示列级输入
const cacheDaysBulk = ref({}) // { [table]: number | null }
const externalCacheGroups = computed(() => {
  const map = new Map()
  requiredMappings.value.forEach((r) => {
    if (!isExternalSource(r.sourceTable)) return
    if (!map.has(r.sourceTable)) {
      map.set(r.sourceTable, {
        table: r.sourceTable,
        isWide: isExternalWide(r.sourceTable),
        rows: []
      })
    }
    map.get(r.sourceTable).rows.push(r)
  })
  return [...map.values()]
})
const applyCacheDaysToTable = (grp) => {
  const v = cacheDaysBulk.value[grp.table]
  if (isNil(v)) return
  grp.rows.forEach((r) => {
    r.cacheDays = v
    updateRequiredStatus(r)
  })
  Message.success(`已将 ${grp.table} 的缓存天数 ${v} 天覆盖到 ${grp.rows.length} 行`)
}

// 换来源表：已选的日期字段按新表字段清单校验，不适用则清空；切离外数底表后缓存天数不再适用
const onSourceTableChange = (record, val) => {
  record.sourceTable = val || ''
  const dates = dateFieldsOf(record.sourceTable)
  if (record.dateField && !dates.some(f => f.name === record.dateField)) record.dateField = ''
  if (!isExternalSource(record.sourceTable)) record.cacheDays = null
  updateRequiredStatus(record)
}

// ============ 步骤五：入参匹配（取值来源：特征中心 / 样本表） ============
const inputSources = ref({})
// 特征业务类别标准口径（外数 / 征信 / 行为 / 其他），由特征中心枚举接口下发
const featureBizTypes = ref({})
// 按映射目标反查特征业务类别：自动表来源标签与下拉选项共用同一口径
const bizLabelOfTarget = (target) => {
  const f = featureTargets.value.find(x => (x.code || x.name) === target)
  return f ? (featureBizTypes.value[f.featureType] || '') : ''
}
const bizLabelOfOption = (f) => (f && featureBizTypes.value[f.featureType]) || bizLabelOfTarget(f && (f.code || f.name))
// 自动表「特征类型」列：特征中心行按 code 反查业务类别，样本表行按样本字段元数据 featureType 口径
const autoBizLabel = (record) => {
  if (record.source === 'sample') {
    const c = tableColumns.value.find(x => x.name === record.target)
    return c?.featureType ? (featureBizTypes.value[c.featureType] || '') : ''
  }
  return bizLabelOfTarget(record.target)
}

// 「其他」大类（非标准）特征的关联口径：存在 data_dt 关联 → 选日期字段（watch_dt 锚点系）+ 缓存天数；无 → 全量关联
const OTHER_ASSOC_DATE_FIELDS = ['data_dt', 'watch_dt', 'report_dt', 'update_time']
const INPUT_ASSOC_DEFAULTS = { hasDataDt: null, dateField: '', cacheDays: null }
const isOtherFeatureRow = (record) => {
  if (record.source !== 'feature' || !record.target) return false
  const f = featureTargets.value.find(x => (x.code || x.name) === record.target)
  return f?.featureType === 'other'
}
// 换特征/换来源即重置关联配置：口径跟着具体特征走，不得残留旧值
const resetInputAssoc = (record) => {
  record.hasDataDt = null
  record.dateField = ''
  record.cacheDays = null
}
const onHasDataDtChange = (record) => {
  if (record.hasDataDt === false) {
    record.dateField = ''
    record.cacheDays = null
  }
  updateInputStatus(record)
}
// 行完整性：映射目标必选；「其他」大类特征还要关联口径闭环（未选 data_dt / 选了但缺日期字段或缓存天数均算待补）
const inputRowMissing = (record) => {
  if (!record.target) return ['映射目标']
  if (isOtherFeatureRow(record)) {
    if (record.hasDataDt !== true && record.hasDataDt !== false) return ['是否存在data_dt关联']
    if (record.hasDataDt === true) {
      const missing = []
      if (!record.dateField) missing.push('关联日期字段')
      if (isNil(record.cacheDays)) missing.push('缓存天数')
      return missing
    }
  }
  return []
}
// N = 未匹配入参数（按全量行统计，与搜索过滤无关）
const unmatchedInputCount = computed(() => inputMappings.value.filter(r => !r.target).length)

// 切换取值来源：两个通道取值空间不同，清空已选映射避免脏数据；人工介入即脱离系统自动口径
const onInputSourceChange = (record, val) => {
  record.source = val === 'sample' ? 'sample' : 'feature'
  record.target = ''
  record.autoMatched = false
  resetInputAssoc(record)
  updateInputStatus(record)
}

/**
 * 优先命中样本表：仅处理未匹配行，入参名与样本字段同名则自动将来源置为样本表 + 映射到同名字段；
 * 不触碰已人工选定的行，避免覆盖。无同名字段的行不做处理，交由一键入参匹配或人工选。
 */
const applySamplePriority = () => {
  if (!sampleReady.value || !tableColumns.value.length) return 0
  let hit = 0
  inputMappings.value.forEach((r) => {
    if (r.target) return
    const same = tableColumns.value.find(c => c.name === r.name)
    if (!same) return
    r.source = 'sample'
    r.target = same.name
    r.status = 'matched'
    r.autoMatched = true
    hit += 1
  })
  return hit
}

/**
 * 特征底表同名补漏：特征全量清单异步加载完成后，对未匹配行按入参名=特征 code 自动命中特征中心通道；
 * 不触碰已人工/已样本命中的行，覆盖列表晚于模型选择到达的竞态
 */
const applyFeaturePriority = () => {
  if (!featureTargets.value.length) return { hit: 0, other: 0 }
  let hit = 0
  let other = 0
  inputMappings.value.forEach((r) => {
    if (r.target) return
    const same = featureTargets.value.find(f => (f.code || f.name) === r.name)
    if (!same) return
    r.source = 'feature'
    r.target = same.code || same.name
    // 「其他」大类仅同名预填：关联口径待人工确认，留在手动表
    if (same.featureType === 'other') {
      r.autoMatched = false
      other += 1
    } else {
      r.autoMatched = true
      hit += 1
    }
    updateInputStatus(r)
  })
  return { hit, other }
}

/**
 * 入参行初始映射种子：优先样本表（已拉取且同名）→ 特征中心同名（入参为英文字段名，按特征 code 匹配）→ 空。
 * 与「优先匹配样本表字段，样本表存在则无需关联」的需求一致：
 * 样本表已有则直接取，不占特征中心通道
 */
const pickInitialInputMapping = (name) => {
  if (sampleReady.value) {
    const sampleCol = tableColumns.value.find(c => c.name === name)
    if (sampleCol) return { source: 'sample', target: sampleCol.name, status: 'matched', autoMatched: true, ...INPUT_ASSOC_DEFAULTS }
  }
  const feature = featureTargets.value.find(f => (f.code || f.name) === name)
  if (feature) {
    // 「其他」大类特征口径不确定：同名预填但留在手动表，需人工确认 data_dt 关联或全量关联
    if (feature.featureType === 'other') return { source: 'feature', target: feature.code || feature.name, status: 'unmatched', autoMatched: false, ...INPUT_ASSOC_DEFAULTS }
    return { source: 'feature', target: feature.code || feature.name, status: 'matched', autoMatched: true, ...INPUT_ASSOC_DEFAULTS }
  }
  return { source: 'feature', target: '', status: 'unmatched', autoMatched: false, ...INPUT_ASSOC_DEFAULTS }
}

/**
 * 一键入参匹配：只碰未匹配行——来源置为样本表，样本表（步骤三拉取）有同名字段的自动带入；
 * 已匹配行不动，无同名字段的仅置来源，交人工在下拉里选
 */
const autoMatchFromSample = () => {
  if (!sampleReady.value) {
    Message.warning('请先完成步骤三：拉取样本表数据')
    return
  }
  let hit = 0
  let miss = 0
  inputMappings.value.forEach((r) => {
    if (r.target) {
      return
    }
    r.source = 'sample'
    const same = tableColumns.value.find(c => c.name === r.name)
    if (same) {
      r.target = same.name
      r.autoMatched = true
      hit += 1
    } else {
      miss += 1
    }
    updateInputStatus(r)
  })
  const tips = [`已按同名字段匹配 ${hit} 个入参（移入「系统后端自动匹配」表）`]
  if (miss) {
    tips.push(`${miss} 个入参样本表无同名字段，来源已置为样本表，请手动选择`)
  }
  Message.success(tips.join('，'))
}

// ============ 回溯任务配置：新增字段 ============
// 落表目标（默认同时勾选 多模型汇总表 + 模型标准表）
// mode：'standard' 标准化落库（默认） / 'temp' 临时落库，后者写临时表且不删表，与治理链路解耦
const LANDING_MODES = { STANDARD: 'standard', TEMP: 'temp' }
const landingForm = ref({
  mode: LANDING_MODES.STANDARD,
  summary: true,
  summaryType: 'general',
  channelCode: '',
  singleModel: true,
  singleTableType: 'realtime',
  tempTable: ''
})

// 根据落库模式与落表目标生成对应表名预览（两种模式互斥，只展示当前模式对应的表）
const landingTableNames = computed(() => {
  if (landingForm.value.mode === LANDING_MODES.TEMP) {
    const t = landingForm.value.tempTable?.trim()
    return [{ label: '临时表（不删表，手工回收）', table: t || 'tmp.{待填写临时表名}' }]
  }
  const names = []
  if (landingForm.value.summary) {
    if (landingForm.value.summaryType === 'general') {
      names.push({ label: '多模型汇总表（通用）', table: 'dw.risk_model_summary' })
    } else if (landingForm.value.summaryType === 'channel') {
      const ch = landingForm.value.channelCode
      names.push({
        label: '多模型汇总表（渠道专属）',
        table: ch ? `dw.risk_model_summary_${ch}` : 'dw.risk_model_summary_{待选渠道}'
      })
    } else {
      names.push({ label: '多模型汇总表', table: 'dw.risk_model_summary' })
    }
  }
  if (landingForm.value.singleModel) {
    const type = landingForm.value.singleTableType
    if (type) {
      names.push({ label: '模型标准表', table: `dw.risk_model_single_${type}` })
    }
  }
  return names
})

// 切换落库模式：切到临时且无临时表名时自动预置默认名；切回标准化不需要额外处理
const onLandingModeChange = (val) => {
  if (val === LANDING_MODES.TEMP && !landingForm.value.tempTable) fillDefaultTempTable()
}

// 默认临时表名：tmp.risk_model_backtrack_{serviceName}_{yyyymmdd}，去掉非字子，末尾拼上日期保证唯一
const fillDefaultTempTable = () => {
  const svc = (modelForm.value.serviceName || 'anon').replace(/[^a-zA-Z0-9_]+/g, '_').toLowerCase()
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  landingForm.value.tempTable = `tmp.risk_model_backtrack_${svc}_${ymd}`
}

// 场景标签
const sceneTags = ref([])
const sceneTagOptions = ref([])
// 主模型分指定
const mainScoreField = ref('')
// 关联方式
const associationMethod = ref('flow_id')
const associationMethods = ref([])
const landingChannelOptions = ref([])
const requiredFieldDefs = ref([])
// 关联方式提示：样本表是否含 flow_id
const hasFlowIdInTable = ref(false)
const associationHint = computed(() =>
  hasFlowIdInTable.value
    ? '样本表含 flow_id 字段，默认 flow_id 关联'
    : '样本表无 flow_id 字段，建议改用身份证号关联'
)

// 落表目标交互：勾选/取消 多模型汇总表
const onSummaryToggle = (val) => {
  if (val) {
    if (!landingForm.value.summaryType) landingForm.value.summaryType = 'general'
  } else {
    landingForm.value.summaryType = ''
    landingForm.value.channelCode = ''
  }
}
const onSummaryTypeChange = (val) => {
  if (val !== 'channel') landingForm.value.channelCode = ''
}
// 落表目标交互：勾选/取消 模型标准表
const onSingleModelToggle = (val) => {
  if (val) {
    if (!landingForm.value.singleTableType) landingForm.value.singleTableType = 'realtime'
  } else {
    landingForm.value.singleTableType = ''
  }
}
// ============ 回溯任务配置：新增字段 END ============

// 观测配置（时间窗口由样本 SQL 的 dt 条件界定，不在此重复录入）
const observeForm = ref({ featurePersist: false })

// SQL 预览
const baseSQL = computed(() => {
  return sampleForm.value.tableNameInput ? `SELECT * FROM ${sampleForm.value.tableNameInput}` : ''
})
const fullSQL = computed(() => {
  return sampleForm.value.sqlWhere ? `${baseSQL.value} WHERE ${sampleForm.value.sqlWhere}` : baseSQL.value
})

// 模型
const modelForm = ref({ serviceName: '', selectedVersion: '', modelVersion: [], taskName: '' })
const platformServices = ref([])
const modelInputs = ref([])
const modelOutputs = ref([])
const modelOptions = ref([])
// 模型产物文件：步骤一拉取平台模型文件，格式白名单由 mock 下发（.pkl / .pb）
const modelFile = ref(null)
const modelFileLoading = ref(false)
const modelFileFormats = ref([])
const modelFileFormatHint = computed(() =>
  modelFileFormats.value.length
    ? modelFileFormats.value.map(f => `.${f.ext}`).join(' / ')
    : '.pkl / .pb'
)
const modelInputDefs = [
  { title: '入参名', dataIndex: 'name', width: 160 },
  { title: '类型', dataIndex: 'type', width: 140 },
  { title: '描述', dataIndex: 'description' }
]
const modelOutputDefs = [
  { title: '出参名', dataIndex: 'name', width: 160 },
  { title: '类型', dataIndex: 'type', width: 140 },
  { title: '描述', dataIndex: 'description' }
]

// 入参匹配
const inputMappings = ref([])
const featureTargets = ref([])
// 模块B P1：步骤五『映射到特征/字段』特征中心通道的后端模糊搜索
const featureSearchKeyword = ref('')        // 当前行输入框搜索关键词（行级隔离）
const featureSearchResults = ref([])        // 当前激活行的搜索结果
const featureSearchLoading = ref(false)
const featureSearchActiveRowKey = ref('')   // 当前展开搜索的行 rowKey
const featureSearchTimers = new Map()       // 防抖：每行一个 timer
// 手动表与系统表同口径五列：入参名 / 特征类型（随已选目标联动，未匹配显 —）/ 来源 / 映射目标 / 状态
const mappingDefs = [
  { title: '入参名', dataIndex: 'name', slotName: 'nameCell', width: 150 },
  { title: '特征类型', slotName: 'bizCell', width: 96, align: 'center' },
  { title: '来源', dataIndex: 'source', slotName: 'sourceCell', width: 120 },
  { title: '映射到特征/字段', dataIndex: 'target', slotName: 'targetCell', width: 300 },
  { title: '状态', dataIndex: 'status', slotName: 'statusCell', width: 90, align: 'center' }
]
// 系统自动匹配表只读五列：入参名 / 特征类型（外数·征信·行为·其他标准口径）/ 来源 / 映射目标 / 状态
const autoMappingDefs = [
  { title: '入参名', dataIndex: 'name', slotName: 'nameCell', width: 150 },
  { title: '特征类型', slotName: 'autoBizCell', width: 96, align: 'center' },
  { title: '来源', dataIndex: 'source', slotName: 'autoSourceCell', width: 110 },
  { title: '映射到特征/字段', dataIndex: 'target', width: 300, ellipsis: true, tooltip: true },
  { title: '状态', dataIndex: 'status', slotName: 'autoStatusCell', width: 90, align: 'center' }
]
const matchedCount = computed(() => inputMappings.value.filter(i => i.status === 'matched').length)
// 步骤五双表拆分：系统同名命中行（autoMatched 且已有映射）只读上表，其余进「需手动匹配」可编辑下表
const autoRows = computed(() => inputMappings.value.filter(r => r.autoMatched && !!r.target))
const manualRows = computed(() => inputMappings.value.filter(r => !(r.autoMatched && !!r.target)))
const manualUnmatchedCount = computed(() => manualRows.value.filter(r => r.status !== 'matched').length)

// 步骤三/四/五：按名称列前端搜索过滤（不区分大小写）
const requiredSearch = ref('')
const mappingSearch = ref('')
const outputSearch = ref('')
const filteredRequiredMappings = computed(() => {
  const kw = (requiredSearch.value || '').trim().toLowerCase()
  if (!kw) return requiredMappings.value
  return requiredMappings.value.filter(r => (r.name || '').toLowerCase().includes(kw))
})
// 搜索关键词对两张表同时生效；手动表保持待办队列式——未匹配置顶、已匹配沉底（组内原序），匹配完成瞬间离开视野由后续行补位
const byNameKw = (rows) => {
  const kw = (mappingSearch.value || '').trim().toLowerCase()
  return kw ? rows.filter(r => (r.name || '').toLowerCase().includes(kw)) : rows
}
const filteredAutoRows = computed(() => byNameKw(autoRows.value))
const filteredManualMappings = computed(() => {
  const rows = byNameKw(manualRows.value)
  return [...rows.filter(r => r.status !== 'matched'), ...rows.filter(r => r.status === 'matched')]
})
const filteredModelOutputs = computed(() => {
  const kw = (outputSearch.value || '').trim().toLowerCase()
  if (!kw) return modelOutputs.value
  return modelOutputs.value.filter(o => (o.name || '').toLowerCase().includes(kw))
})

// 模块B P1：触发后端模糊搜索（防抖 250ms）
const triggerFeatureSearch = async (rowKey, keyword) => {
  if (featureSearchTimers.has(rowKey)) {
    clearTimeout(featureSearchTimers.get(rowKey))
  }
  const t = setTimeout(async () => {
    featureSearchLoading.value = true
    featureSearchActiveRowKey.value = rowKey
    try {
      const res = await featureAPI.searchFeatures(keyword, 1, 50)
      if (res.success) {
        featureSearchResults.value = res.data || []
      } else {
        featureSearchResults.value = []
        Message.error(res.message || '搜索服务异常，请重试')
      }
    } catch (e) {
      featureSearchResults.value = []
      Message.error('搜索服务异常，请重试')
    } finally {
      featureSearchLoading.value = false
    }
  }, 250)
  featureSearchTimers.set(rowKey, t)
}

// v1.3: 样本表输入 + 拉取数据
const handleTableValidate = async () => {
  const tableName = sampleForm.value.tableNameInput?.trim()
  if (!tableName) {
    Message.warning('请输入表名')
    return
  }
  tableLoading.value = true
  tableInputStatus.value = ''
  tableColumns.value = []
  // Mock 样本表字段（正式环境替换为真实 API）
  const MOCK_TABLES = {
    'dw.user': [
      { name: 'user_id', type: 'bigint', comment: '用户ID' },
      { name: 'cert_no', type: 'varchar(18)', comment: '证件号码' },
      { name: 'mobile', type: 'varchar(11)', comment: '手机号' },
      { name: 'name', type: 'varchar(50)', comment: '姓名' },
      { name: 'gender', type: 'varchar(2)', comment: '性别' },
      { name: 'age', type: 'int', comment: '年龄' },
      { name: 'city', type: 'varchar(50)', comment: '城市' },
      { name: 'register_date', type: 'date', comment: '注册日期' },
      { name: 'status', type: 'varchar(10)', comment: '账户状态' },
      { name: 'update_time', type: 'datetime', comment: '更新时间' }
    ],
    'dw.user_credit': [
      { name: 'user_id', type: 'bigint', comment: '用户ID' },
      { name: 'cert_no', type: 'varchar(18)', comment: '证件号码' },
      { name: 'mobile', type: 'varchar(11)', comment: '手机号' },
      { name: 'credit_limit', type: 'decimal(18,2)', comment: '授信额度' },
      { name: 'used_limit', type: 'decimal(18,2)', comment: '已用额度' },
      { name: 'open_date', type: 'date', comment: '开户日期' },
      { name: 'level', type: 'varchar(10)', comment: '信用等级' },
      { name: 'risk_score', type: 'int', comment: '风险评分' },
      { name: 'overdue_count', type: 'int', comment: '逾期次数' },
      { name: 'loan_count', type: 'int', comment: '历史贷款笔数' },
      { name: 'update_time', type: 'datetime', comment: '更新时间' }
    ],
    'dw.transaction': [
      { name: 'trans_id', type: 'varchar(32)', comment: '交易流水号' },
      { name: 'user_id', type: 'bigint', comment: '用户ID' },
      { name: 'amount', type: 'decimal(18,2)', comment: '交易金额' },
      { name: 'trans_type', type: 'varchar(20)', comment: '交易类型' },
      { name: 'product_name', type: 'varchar(50)', comment: '产品名称' },
      { name: 'channel', type: 'varchar(20)', comment: '渠道来源' },
      { name: 'trans_date', type: 'date', comment: '交易日期' },
      { name: 'status', type: 'varchar(10)', comment: '交易状态' },
      { name: 'merchant_name', type: 'varchar(100)', comment: '商户名称' },
      { name: 'create_time', type: 'datetime', comment: '创建时间' }
    ],
    // 含 flow_id / product_id / data_dt 等回溯必填字段的样本表
    'dw.risk_sample': [
      { name: 'flow_id', type: 'varchar(32)', comment: '流水号' },
      { name: 'product_id', type: 'varchar(20)', comment: '产品ID' },
      { name: 'data_dt', type: 'date', comment: '数据日期' },
      { name: 'business_code', type: 'varchar(20)', comment: '业务编码' },
      { name: 'session_number', type: 'varchar(32)', comment: '会话编号' },
      { name: 'cert_no', type: 'varchar(18)', comment: '证件号码', featureType: 'other' },
      { name: 'user_id', type: 'bigint', comment: '用户ID', featureType: 'other' },
      { name: 'mobile', type: 'varchar(11)', comment: '手机号', featureType: 'other' },
      { name: 'age', type: 'int', comment: '年龄', featureType: 'other' },
      { name: 'income', type: 'decimal(18,2)', comment: '收入', featureType: 'other' },
      { name: 'credit_history', type: 'varchar(10)', comment: '信用历史', featureType: 'credit' },
      { name: 'status', type: 'varchar(10)', comment: '状态' },
      { name: 'update_time', type: 'datetime', comment: '更新时间' }
    ]
  }
  try {
    const mockCols = MOCK_TABLES[tableName]
    const cols = mockCols || []
    if (cols.length > 0) {
      tableColumns.value = cols
      tableInputStatus.value = 'success'
      // 关联方式探测：样本表是否含 flow_id
      hasFlowIdInTable.value = tableColumns.value.some(c => c.name === 'flow_id')
      if (!hasFlowIdInTable.value) {
        associationMethod.value = 'cert_no'
      } else if (associationMethod.value !== 'cert_no') {
        associationMethod.value = 'flow_id'
      }
      requiredMappings.value = requiredMappings.value.map(r => {
        const same = tableColumns.value.find(c => c.name === r.name)
        const target = r.target || (same ? same.name : '')
        const row = { ...r, target, isEncrypted: r.isEncrypted || false }
        row.status = isRequiredRowComplete(row) ? 'matched' : 'unmatched'
        return row
      })
      // 优先样本表：入参名与样本字段同名时自动命中，无需人工匹配
      const prioHits = applySamplePriority()
      if (prioHits) Message.info(`优先命中样本表：已自动匹配 ${prioHits} 个入参，无需关联`)
    } else {
      tableInputStatus.value = 'error'
    }
  } catch {
    tableInputStatus.value = 'error'
  } finally {
    tableLoading.value = false
  }
}

const onModelVersionChange = async (value) => {
  let serviceName = ''
  let version = ''
  if (Array.isArray(value) && value.length) {
    serviceName = value[0]
    version = value[1] || ''
  } else if (typeof value === 'string') {
    const parentOpt = (modelOptions.value || []).find(o => (o.children || []).some(c => c.value === value))
    if (parentOpt) {
      serviceName = parentOpt.value
      version = value
      modelForm.value.modelVersion = [serviceName, version]
    } else {
      serviceName = value
      const opt = (modelOptions.value || []).find(o => o.value === serviceName)
      version = opt?.children?.[0]?.value || ''
      modelForm.value.modelVersion = version ? [serviceName, version] : [serviceName]
    }
  }
  if (!serviceName) return
  // 模型或版本变更后旧产物失效，需重新拉取
  modelFile.value = null
  modelForm.value.serviceName = serviceName
  modelForm.value.selectedVersion = version
  Message.info(`选择模型: ${serviceName}${version ? ' / ' + version : ''}`)
  await onServiceChange(serviceName)
}

/**
 * 拉取模型文件：按选中的服务+版本向平台取产物，格式不在白名单（如非 .pkl / .pb）时由接口拒绝并回错
 */
const handlePullModelFile = async () => {
  if (!modelForm.value.serviceName) {
    Message.warning('请先选择模型与版本')
    return
  }
  modelFileLoading.value = true
  try {
    const res = await modelAPI.downloadPlatformModelFile(modelForm.value.serviceName, modelForm.value.selectedVersion)
    if (res.success) {
      modelFile.value = res.data
      Message.success(`已拉取模型文件：${res.data.fileName}（.${res.data.format}）`)
    } else {
      modelFile.value = null
      Message.error(res.message || '拉取模型文件失败')
    }
  } catch (e) {
    modelFile.value = null
    Message.error(e?.message || '拉取模型文件失败')
  } finally {
    modelFileLoading.value = false
  }
}

const loadServices = async () => {
  try {
    const listRes = await modelAPI.listPlatformModels()
    platformServices.value = listRes.data || []
    modelOptions.value = (platformServices.value || []).map(p => ({
      value: p.serviceName,
      label: p.name,
      children: [{ value: p.version, label: p.version }]
    }))
  } catch {}
}
loadServices()

// 格式白名单（步骤一提示文案与校验口径的唯一来源）
const loadModelFileFormats = async () => {
  try {
    const res = await modelAPI.listModelFileFormats()
    modelFileFormats.value = res.data || []
  } catch {}
}
loadModelFileFormats()

// 加载回溯配置枚举（场景标签 / 渠道 / 关联字段定义 / 关联方式 / 来源表字典 / 日期关联锚点 / 入参来源字典）
const loadEnumOptions = () => {
  sceneTagOptions.value = backtrackAPI.getSceneTags() || []
  landingChannelOptions.value = backtrackAPI.getLandingChannels() || []
  associationMethods.value = backtrackAPI.getAssociationMethods() || []
  requiredFieldDefs.value = backtrackAPI.getRequiredFieldDefs() || []
  sourceTables.value = backtrackAPI.getSourceTables() || []
  sourceTableTypes.value = backtrackAPI.getSourceTableTypes() || {}
  watchDateField.value = backtrackAPI.getWatchDateField() || 'watch_dt'
  inputSources.value = backtrackAPI.getInputMatchSources() || { feature: '特征中心', sample: '样本表' }
  featureBizTypes.value = featureAPI.getFeatureBizTypes() || { external: '外数', credit: '征信', behavior: '行为', other: '其他' }
  // 特征中心已配置特征全量清单：步骤五「特征底表同名自动命中」的种子数据源；异步到达后对已选模型的未匹配行做同名补漏
  featureAPI.getFeatures({ status: 'active', pageSize: 200 }).then((res) => {
    featureTargets.value = res?.success ? (res.data?.data || []) : []
    const { hit, other } = applyFeaturePriority()
    if (hit + other) Message.info(`特征底表同名命中 ${hit + other} 个入参${other ? `，其中 ${other} 个「其他」大类需确认关联口径` : ''}`)
  })
}
loadEnumOptions()

const prefillFromCopy = async (copyFromId) => {
  try {
    const res = await backtrackAPI.getBacktrackDetail(copyFromId)
    const detail = res.data
    const cfg = detail?.config || {}
    const mode = cfg.mode || CREATE_MODES.SINGLE

    modelForm.value.taskName = ''
    createMode.value = mode
    sampleForm.value.mode = mode

    sampleForm.value.tableNameInput = cfg.table || ''
    sampleForm.value.sqlWhere = cfg.sqlWhere || ''

    if (sampleForm.value.tableNameInput) {
      await handleTableValidate()
    }

    if (cfg.serviceName) {
      modelForm.value.modelVersion = cfg.version ? [cfg.serviceName, cfg.version] : [cfg.serviceName]
      await onModelVersionChange(modelForm.value.modelVersion)
      // 沿用源任务的模型产物（版本未变则无需重复拉取）；历史任务无产物时留空，由人工重新拉取
      modelFile.value = cfg.modelFile || null
    }

    if (Array.isArray(cfg.inputMappings) && cfg.inputMappings.length) {
      inputMappings.value = (inputMappings.value || []).map(m => {
        const fromSvc = m.from === '当前模型' ? modelForm.value.serviceName : m.from
        const found = cfg.inputMappings.find(x => x.input === m.name && (!x.serviceName || x.serviceName === fromSvc))
        const target = found?.target || ''
        // 历史数据无 source 时按特征中心口径回填；复制任务映射来自历史配置，不算本次系统同名命中，一律进手动表
        const row = {
          ...m,
          target,
          source: found?.source === 'sample' ? 'sample' : 'feature',
          autoMatched: false,
          // 「其他」大类关联配置随源任务回填；历史数据无此字段时回到待确认态
          hasDataDt: found?.hasDataDt ?? null,
          dateField: found?.dateField || '',
          cacheDays: isNil(found?.cacheDays) ? null : found.cacheDays
        }
        row.status = inputRowMissing(row).length ? 'unmatched' : 'matched'
        return row
      })
    }
    if (Array.isArray(cfg.requiredFieldMappings) && cfg.requiredFieldMappings.length) {
      requiredMappings.value = (requiredMappings.value || []).map(r => {
        const found = cfg.requiredFieldMappings.find(x => x.field === r.name)
        const target = found?.target || ''
        const row = {
          ...r,
          target,
          isEncrypted: !!found?.isEncrypted,
          sourceTable: found?.sourceTable || r.sourceTable,
          dateField: found?.dateField ?? r.dateField,
          dateOffsetDays: found?.dateOffsetDays ?? r.dateOffsetDays,
          cacheDays: found?.cacheDays ?? r.cacheDays
        }
        row.status = isRequiredRowComplete(row) ? 'matched' : 'unmatched'
        return row
      })
    }

    // 回填落表目标（兼容历史无 mode 的旧任务 → 默认标准化）
    if (cfg.landingForm) {
      landingForm.value = {
        mode: cfg.landingForm.mode === LANDING_MODES.TEMP ? LANDING_MODES.TEMP : LANDING_MODES.STANDARD,
        summary: !!cfg.landingForm.summary,
        summaryType: cfg.landingForm.summaryType || '',
        channelCode: cfg.landingForm.channelCode || '',
        singleModel: cfg.landingForm.singleModel !== false,
        singleTableType: cfg.landingForm.singleTableType || (cfg.landingForm.singleModel !== false ? 'realtime' : ''),
        tempTable: cfg.landingForm.tempTable || ''
      }
    }
    // 回填场景标签
    sceneTags.value = Array.isArray(cfg.sceneTags) ? [...cfg.sceneTags] : []
    // 回填主模型分
    if (cfg.mainScoreField) mainScoreField.value = cfg.mainScoreField
    // 回填关联方式
    if (cfg.associationMethod) associationMethod.value = cfg.associationMethod

    if (mode === CREATE_MODES.PERIODIC) {
      sampleForm.value.periodicity = ''
      sampleForm.value.weekDays = []
      sampleForm.value.monthDays = []
      sampleForm.value.triggerType = ''
      sampleForm.value.scheduleTime = null
      sampleForm.value.kangarooTaskId = ''
      sampleForm.value.taskStartDate = null
      sampleForm.value.taskEndDate = null
    }
  } catch (e) {
    Message.error('复制任务初始化失败')
  }
}

onMounted(async () => {
  if (routeParams.copyFrom) {
    await prefillFromCopy(routeParams.copyFrom)
    return
  }
  if (routeParams.mode && (routeParams.mode === CREATE_MODES.SINGLE || routeParams.mode === CREATE_MODES.PERIODIC)) {
    createMode.value = routeParams.mode
    sampleForm.value.mode = routeParams.mode
  }
})

watch(() => modelForm.value.modelVersion, async (val) => {
  if (Array.isArray(val) && val.length >= 2) {
    await onModelVersionChange(val)
  }
})

const onServiceChange = async (serviceName) => {
  try {
    const res = await modelAPI.getPlatformModel(serviceName)
    if (res.success) {
      const p = res.data
      modelInputs.value = (p.inputs || []).map(i => ({ name: i.name, type: i.type, description: i.description || '' }))
      modelOutputs.value = (p.outputs || []).map(o => ({ name: o.name, type: o.type, description: o.description || '' }))
      const baseInputs = modelInputs.value.map(i => {
        const init = pickInitialInputMapping(i.name)
        return { rowKey: `${p.serviceName}|${i.name}`, name: i.name, type: i.type, from: '当前模型', ...init }
      })
      let childInputs = []
      const depends = Array.isArray(p.dependsOn) ? p.dependsOn : []
      for (const d of depends) {
        try {
          const childRes = await modelAPI.getPlatformModel(d.serviceName)
          if (childRes.success) {
            const c = childRes.data
            const ci = (c.inputs || []).map(i => {
              const init = pickInitialInputMapping(i.name)
              return { rowKey: `${c.serviceName}|${i.name}`, name: i.name, type: i.type, from: c.serviceName, ...init }
            })
            childInputs = childInputs.concat(ci)
          }
        } catch {}
      }
      const merged = [...baseInputs, ...childInputs]
      const seen = new Set()
      inputMappings.value = merged.filter(r => {
        const k = r.rowKey
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
      // 优先样本表：模型入参拉到后，若样本表已拉取且存在同名字段，自动命中样本表
      const prioHits = applySamplePriority()
      if (prioHits) Message.info(`优先命中样本表：已自动匹配 ${prioHits} 个入参，无需关联`)
      // 关联条件配置（步骤四）：固定枚举（product_id/flow_id/data_dt 强制 + business_code/session_number 选填）
      const defs = (requiredFieldDefs.value && requiredFieldDefs.value.length)
        ? requiredFieldDefs.value
        : [
          { field: 'product_id', label: '产品ID', required: true },
          { field: 'flow_id', label: '流水号', required: true },
          { field: 'data_dt', label: '数据日期', required: true },
          { field: 'business_code', label: '业务编码', required: false },
          { field: 'session_number', label: '会话编号', required: false }
        ]
      requiredMappings.value = defs.map(d => {
        const same = tableColumns.value.find(c => c.name === d.field)
        const target = same ? same.name : ''
        const row = {
          name: d.field,
          label: d.label,
          required: d.required,
          target,
          isEncrypted: false,
          // 默认口径来自字段定义（枚举回退时为空，由人工填写）
          sourceTable: d.sourceTable || '',
          dateField: d.dateField || '',
          dateOffsetDays: isNil(d.dateOffsetDays) ? null : d.dateOffsetDays,
          cacheDays: isNil(d.cacheDays) ? null : d.cacheDays
        }
        row.status = isRequiredRowComplete(row) ? 'matched' : 'unmatched'
        return row
      })
      // 主模型分初始化：默认取第一个分类型输出
      if (modelOutputs.value.length > 1) {
        if (!modelOutputs.value.some(o => o.name === mainScoreField.value)) {
          mainScoreField.value = modelOutputs.value[0]?.name || ''
        }
      } else {
        mainScoreField.value = modelOutputs.value[0]?.name || ''
      }
      Message.info(`关联条件 ${requiredMappings.value.length} 项，入参 ${modelInputs.value.length} 项`)
    }
  } catch (e) {}
}

const updateRequiredStatus = (record) => {
  record.status = isRequiredRowComplete(record) ? 'matched' : 'unmatched'
}
const updateInputStatus = (record) => {
  record.status = inputRowMissing(record).length ? 'unmatched' : 'matched'
}

const onTaskDateRangeChange = (dateString, date) => {
  sampleForm.value.taskStartDate = date[0]
  sampleForm.value.taskEndDate = date[1]
}
const onTaskDateRangeSelect = (dateString, date) => {
  sampleForm.value.taskStartDate = date[0]
  sampleForm.value.taskEndDate = date[1]
}

const handleSubmit = async () => {
  try {
    submitting.value = true
    const errors = []
    if (!sampleForm.value.tableNameInput) errors.push('请输入样本表名')
    if (!modelForm.value.serviceName) errors.push('请选择回溯模型')
    else if (!modelFile.value) errors.push('请拉取模型文件（支持 ' + modelFileFormatHint.value + '）')
    if (routeParams.copyFrom && !modelForm.value.taskName) errors.push('请输入任务名称')
    // 关联条件校验（步骤四）：仅强制项关联不完整时阻断提交（红色报错）
    const missingRequired = (requiredMappings.value || []).filter(r => r.required && !isRequiredRowComplete(r))
    if (missingRequired.length) {
      errors.push(`关联条件未完成: ${missingRequired.map(r => `${r.name}（待补${requiredRowMissing(r).join('、')}）`).join('；')}`)
    }
    // 选填字段缺失仅弱提示，不阻断
    const missingOptional = (requiredMappings.value || []).filter(r => !r.required && !isRequiredRowComplete(r))
    if (missingOptional.length) {
      Message.info(`选填字段关联条件未完成（可忽略）: ${missingOptional.map(r => r.name).join('、')}`)
    }
    if (createMode.value === CREATE_MODES.PERIODIC) {
      if (!sampleForm.value.taskStartDate) errors.push('请选择任务执行开始时间')
      if (!sampleForm.value.taskEndDate) errors.push('请选择任务执行结束时间')
    }
    // 落库模式校验：临时落库必须有临时表名；标准化落库至少选中一个目标（与既往行为一致）
    if (landingForm.value.mode === LANDING_MODES.TEMP) {
      if (!landingForm.value.tempTable?.trim()) errors.push('临时落库需填写临时表名')
    } else if (!landingForm.value.summary && !landingForm.value.singleModel) {
      errors.push('标准化落库需至少选中一个落表目标')
    }
    if (errors.length > 0) {
      errors.forEach(error => Message.warning(error))
      return
    }
    const mappings = inputMappings.value.map(m => ({
      input: m.name,
      target: m.target,
      // 取值来源：feature=特征中心已配置特征，sample=直接取样本表字段；无来源历史数据按 feature 口径
      source: m.source === 'sample' ? 'sample' : 'feature',
      from: m.from,
      // 「其他」大类特征的关联口径（data_dt 关联 + 缓存 / 全量），其余行为默认空值
      hasDataDt: m.hasDataDt ?? null,
      dateField: m.dateField || '',
      cacheDays: isNil(m.cacheDays) ? null : m.cacheDays
    }))
    const payload = {
      table: sampleForm.value.tableNameInput,
      sourceType: sampleForm.value.sourceType,
      mode: sampleForm.value.mode,
      serviceName: modelForm.value.serviceName,
      version: modelForm.value.selectedVersion,
      // 模型产物文件：拉取成功后随任务下发，详情页只读回显
      modelFile: modelFile.value ? { ...modelFile.value } : null,
      taskName: modelForm.value.taskName,
      copiedFrom: routeParams.copyFrom ? Number(routeParams.copyFrom) : undefined,
      status: routeParams.copyFrom ? 'draft' : 'running',
      // 模块A P0：推理入参特征文件落库开关
      featurePersist: !!observeForm.value.featurePersist,
      inputMappings: mappings,
      outputs: modelOutputs.value,
      requiredFieldMappings: requiredMappings.value.map(r => ({
        field: r.name,
        label: r.label,
        target: r.target,
        isEncrypted: !!r.isEncrypted,
        required: !!r.required,
        sourceTable: r.sourceTable || '',
        dateField: r.dateField || '',
        // 日期关联逻辑：固定 watch_dt - dateOffsetDays 天
        dateOffsetDays: isNil(r.dateOffsetDays) ? null : r.dateOffsetDays,
        cacheDays: isNil(r.cacheDays) ? null : r.cacheDays
      })),
      // 落表目标
      landingForm: { ...landingForm.value },
      // 场景标签
      sceneTags: [...sceneTags.value],
      // 主模型分指定
      mainScoreField: mainScoreField.value,
      // 关联方式
      associationMethod: associationMethod.value,
      periodicity: sampleForm.value.periodicity,
      weekDays: sampleForm.value.weekDays || [],
      monthDays: sampleForm.value.monthDays || [],
      triggerType: sampleForm.value.triggerType || '',
      scheduleTime: sampleForm.value.scheduleTime || null,
      kangarooTaskId: sampleForm.value.kangarooTaskId,
      sqlWhere: sampleForm.value.sqlWhere,
      taskStartDate: sampleForm.value.taskStartDate,
      taskEndDate: sampleForm.value.taskEndDate,
    }
    const res = await backtrackAPI.createBacktrack(payload)
    if (res.success) {
      Message.success(routeParams.copyFrom ? '草稿已保存' : '回溯任务创建成功')
      router.push(isFromRisk.value ? '/risk/model-offline-analysis/model-backtrack' : '/model-offline-analysis/model-backtrack')
    } else {
      Message.error(res.message || '创建失败')
    }
  } catch (e) {
    if (e?.message) Message.error(e.message)
  } finally {
    submitting.value = false
  }
}

const handleModeChange = (mode) => {
  sampleForm.value.mode = mode
}

const handleCancel = () => {
  router.push(isFromRisk.value ? '/risk/model-offline-analysis/model-backtrack' : '/model-offline-analysis/model-backtrack')
}
</script>

<style scoped>
.backtrack-create-page {
  padding: 16px;
  background-color: #fff;
  min-height: 100%;
}
.page-header { margin-bottom: 16px; }
.page-title { margin: 0 0 12px; font-size: 18px; font-weight: 600; }
.mode-selector { margin-bottom: 4px; }
.page-content { max-width: 1280px; margin: 0 auto; }

/* 操作栏 */
.actions-bar {
  position: sticky;
  bottom: 0;
  background: rgba(255,255,255,0.97);
  border-top: 1px solid var(--color-neutral-3);
  padding: 12px 0;
  margin-top: 16px;
  z-index: 10;
}
.actions-inner {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 16px;
}

/* 折叠面板标题数字对齐 */
:deep(.arco-collapse-item-header) { font-weight: 500; }

/* 样本表输入 */
.table-input-row { display: flex; gap: 8px; align-items: center; }
.table-input-row .arco-input-wrapper { flex: 1; }

/* 样本表 & SQL 条件：标签+输入框同一行右侧对齐 */
.sample-table-row,
.sql-where-row {
  display: flex;
  align-items: flex-start;
  gap: 0;
  margin-bottom: 16px;
}
.field-label {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 100px;
  padding-top: 2px;
  font-size: 14px;
  color: var(--color-text-2);
}
.label-text { font-weight: 500; }
.required-star { color: rgb(var(--red-6)); margin-left: 2px; }
.field-control { flex: 1; }
.input-with-btn { display: flex; gap: 8px; align-items: center; }
.input-with-btn .arco-input-wrapper { flex: 1; }
.sql-input-wrap .field-hint { font-size: 12px; color: var(--color-text-3); margin-top: 4px; }

/* 字段状态 */
.field-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  margin-top: 6px;
}
.field-status.success { color: rgb(var(--green-6)); }
.field-status.error { color: rgb(var(--red-6)); }
.field-hint { color: var(--color-text-3); font-size: 12px; }

/* 模型产物文件 */
.model-file-row { display: flex; flex-direction: column; gap: 8px; }
.model-file-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text-2);
}
.model-file-name { font-weight: 500; }
.model-file-path { color: var(--color-text-3); font-family: monospace; font-size: 12px; }
.model-file-time { color: var(--color-text-3); font-size: 12px; }

/* SQL 预览 */
.sql-preview-box {
  background: var(--color-fill-relaxed);
  border: 1px solid var(--color-neutral-3);
  border-radius: 6px;
  padding: 12px;
}
.sql-preview-label {
  font-size: 12px;
  color: var(--color-text-3);
  margin-bottom: 4px;
}
.sql-preview-label + .sql-text { margin-top: 0; }
.sql-preview-label:not(:first-child) { margin-top: 8px; }
.sql-text {
  background: #fff;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
  word-break: break-all;
}
.sql-text.highlighted {
  color: rgb(var(--arcoblue-6));
  border: 1px solid rgb(var(--arcoblue-3));
}
.sql-text code {
  margin: 0;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
}

/* section tip */
.section-tip {
  font-size: 13px;
  color: var(--color-text-3);
  margin-bottom: 10px;
}

/* 步骤五双表分组标题 */
.group-title { font-size: 13px; font-weight: 600; color: var(--color-text-1); margin: 4px 0 8px; }
.group-title-count { font-weight: 400; color: var(--color-text-3); margin-left: 6px; }

/* 「其他」大类特征的关联口径配置行 */
.other-assoc { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 6px; }

/* 表格上方工具行：搜索框居左，快捷按钮居右（两者高度不同，按垂直居中对齐） */
.table-search-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

/* 状态标签 */
.status-tag { font-size: 12px; }

/* 关联条件配置表（步骤四）：9 列密排，收紧单元格内边距避免文本裁切 */
.required-map-table :deep(.arco-table-cell) { padding-left: 8px; padding-right: 8px; }
.required-map-table .field-name { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; }
.required-map-table .cell-na { color: var(--color-text-4); }
/* 日期关联逻辑：watch_dt - X 天，锚点只读，只有 X 可输入 */
.date-expr { display: flex; align-items: center; gap: 6px; }
.expr-anchor {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  color: var(--color-text-2);
  white-space: nowrap;
}
.date-expr .expr-input { flex: 1; min-width: 0; }

/* select option 类型 */
.col-type { color: var(--color-text-3); font-size: 12px; margin-left: 6px; }

/* 落表目标选择 */
.landing-block {
  display: flex;
  flex-direction: row;
  gap: 16px;
}
.landing-group {
  flex: 1;
  min-width: 0;
  padding: 12px 16px;
  background: var(--color-fill-1);
  border: 1px solid var(--color-neutral-3);
  border-radius: 6px;
}
.landing-sub {
  margin-top: 8px;
  padding-left: 28px;
}
.landing-sub .arco-radio-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 表名预览 */
.landing-table-preview {
  margin-top: 12px;
  padding: 10px 12px;
  background: var(--color-fill-1);
  border-radius: 6px;
  border: 1px dashed var(--color-neutral-3);
}
.preview-title {
  font-size: 12px;
  color: var(--color-text-3);
  margin-bottom: 6px;
}
.preview-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
}
.preview-item + .preview-item {
  margin-top: 4px;
}
.preview-label {
  font-size: 12px;
  color: var(--color-text-2);
  white-space: nowrap;
}
.preview-table {
  font-size: 13px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: rgb(var(--arcoblue-6));
  font-weight: 500;
}
.preview-table.pending {
  color: var(--color-text-3);
  font-style: italic;
}

/* 顶部步骤进度条 */
.step-progress-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 8px 0;
}
.progress-track {
  flex: 1;
  height: 8px;
  background: var(--color-fill-2);
  border-radius: 4px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, rgb(var(--arcoblue-5)), rgb(var(--green-5)));
  border-radius: 4px;
  transition: width 0.3s ease;
}
.progress-label {
  font-size: 13px;
  color: var(--color-text-2);
  white-space: nowrap;
  font-weight: 500;
}

/* 落库模式开关提示、临时表名行 */
.mode-hint { color: var(--color-text-3); font-size: 12px; margin-left: 4px; }
.temp-table-row { display: flex; align-items: center; gap: 8px; }

/* collapse extra slot 状态标签对齐 */
:deep(.arco-collapse-item-header-extra) {
  margin-right: 8px;
}

/* 外数表缓存天数面板 */
.cache-days-panel {
  margin: 4px 0 12px;
  padding: 10px 12px;
  background: var(--color-fill-1);
  border: 1px solid var(--color-neutral-3);
  border-radius: 6px;
}
.cache-days-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 8px;
}
.cache-days-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-1);
}
.cache-days-hint {
  font-size: 12px;
  color: var(--color-text-3);
}
.cache-days-group + .cache-days-group {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--color-neutral-3);
}
.cache-days-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.cache-days-table {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  color: var(--color-text-2);
  min-width: 160px;
}
.cache-days-cols {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-top: 8px;
  padding-left: 24px;
}
.cache-days-col {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.cache-days-col-name {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  color: var(--color-text-2);
}
</style>
