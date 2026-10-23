<template>
  <div class="backtrack-persist">
    <!-- 步骤条：对应文档 B1~B5 -->
    <a-steps :current="currentStep" size="small" class="step-header">
      <a-step title="选择机构与文件获取" description="SFTP 拉取 / 手动上传" />
      <a-step title="任务匹配与字段映射" description="前置任务 + 字段碰撞" />
      <a-step title="解析落库" description="落临时库 → 落 Hive" />
      <a-step title="行数验证与一致性校验" description="三重行数 + 抽样比对" />
      <a-step title="落库文件通知" description="双渠道通知需求方" />
    </a-steps>

    <!-- 落库状态机（3.1 九态） -->
    <a-card class="status-card" size="small">
      <a-space align="center" wrap style="margin-bottom: 8px">
        <span class="status-label">当前落库状态</span>
        <a-tag :color="statusColor" size="medium">{{ currentStatus }}</a-tag>
        <a-tag v-if="currentBackid" size="medium" color="arcoblue">
          <template #icon><icon-storage /></template>
          backid：{{ currentBackid }}
        </a-tag>
      </a-space>
      <div class="status-flow">
        <template v-for="(s, i) in PERSIST_STATUS_FLOW" :key="s">
          <span
            class="status-node"
            :class="{
              'is-done': statusIndex > i,
              'is-current': statusIndex === i,
            }"
          >{{ s }}</span>
          <span v-if="i < PERSIST_STATUS_FLOW.length - 1" class="status-arrow">→</span>
        </template>
      </div>
    </a-card>

    <a-card class="persist-card">
      <div class="step-content">
        <!-- ============ 步骤1：B1 选择机构与文件获取 ============ -->
        <div v-show="currentStep === 0">
          <a-divider orientation="left" style="margin-top: 0">1.1 选择征信机构</a-divider>
          <a-form :model="formModel" layout="vertical">
            <a-row :gutter="16">
              <a-col :span="8">
                <a-form-item label="征信机构" required help="仅展示征信机构管理中状态为「启用」的机构">
                  <a-select v-model="selectedAgencyId" placeholder="请选择征信机构" @change="onAgencyChange">
                    <a-option v-for="a in agencies" :key="a.id" :value="a.id">
                      {{ a.agencyName }}（{{ a.agencyCode }} · {{ a.agencyType }}）
                    </a-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="文件获取方式" required>
                  <a-radio-group v-model="dataSourceMode" @change="onDataSourceModeChange">
                    <a-radio value="sftp">SFTP 拉取</a-radio>
                    <a-radio value="upload">手动上传</a-radio>
                  </a-radio-group>
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="SFTP 连接参数" help="选择机构后自动带入，无需手动填写">
                  <a-descriptions :column="1" size="small" bordered v-if="sftpParams">
                    <a-descriptions-item label="地址">
                      <span class="mono">{{ sftpParams.host }}:{{ sftpParams.port }}</span>
                    </a-descriptions-item>
                    <a-descriptions-item label="用户名">
                      <span class="mono">{{ sftpParams.username }}</span>
                    </a-descriptions-item>
                    <a-descriptions-item label="目录">
                      <span class="mono">{{ sftpParams.directory }}</span>
                    </a-descriptions-item>
                  </a-descriptions>
                  <span v-else class="table-tip">请先选择机构</span>
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>

          <!-- R15：路径清理提醒 -->
          <a-alert v-if="pathCleanupNotice" type="warning" style="margin-bottom: 12px" closable>
            <template #icon><icon-exclamation-circle-fill /></template>
            {{ pathCleanupNotice }}
          </a-alert>

          <!-- SFTP 模式 -->
          <template v-if="dataSourceMode === 'sftp'">
            <a-divider orientation="left">1.2 SFTP 拉取文件</a-divider>
            <a-form :model="formModel" layout="vertical">
              <a-row :gutter="16">
                <a-col :span="8">
                  <a-form-item label="SFTP 目录路径" required help="末尾自动补 /">
                    <a-input v-model="sftpDir" placeholder="如 /sftp/external_retro/baihang/download/" allow-clear />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item label="子目录">
                    <a-select v-model="sftpSubDir" placeholder="可选" allow-clear>
                      <a-option v-for="d in dirOptions" :key="d" :value="d">{{ d }}</a-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item label="文件名" required help="目录路径 + 文件名 = 完整文件路径">
                    <a-input v-model="sftpFileName" placeholder="如 BH_RETRO_20260928_01.csv" allow-clear />
                  </a-form-item>
                </a-col>
                <a-col :span="4">
                  <a-form-item label=" ">
                    <a-button type="primary" :loading="querying" @click="queryFiles">
                      <template #icon><icon-search /></template>
                      拉取文件
                    </a-button>
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>
            <a-alert type="info" style="margin-bottom: 12px">
              完整文件路径：<span class="mono">{{ fullFilePath }}</span>
            </a-alert>

            <a-table
              v-if="fileList.length"
              :data="fileList"
              :pagination="false"
              row-key="id"
              size="small"
              class="clickable-table"
              :row-class="rowClass"
              @row-click="onFileSelect"
            >
              <template #columns>
                <a-table-column title="文件名" data-index="name" ellipsis tooltip />
                <a-table-column title="大小" :width="110">
                  <template #cell="{ record }">{{ formatFileSize(record.size) }}</template>
                </a-table-column>
                <a-table-column title="数据行数" :width="110">
                  <template #cell="{ record }">{{ record.rows.toLocaleString() }}</template>
                </a-table-column>
                <a-table-column title="更新时间" data-index="updateTime" :width="160" />
                <a-table-column title="加密" :width="80">
                  <template #cell="{ record }">
                    <a-tag size="small" :color="record.encrypted ? 'orange' : 'green'">
                      {{ record.encrypted ? '已加密' : '未加密' }}
                    </a-tag>
                  </template>
                </a-table-column>
                <a-table-column title="操作" :width="110">
                  <template #cell="{ record }">
                    <a-button v-if="record.encrypted" type="text" size="small" @click.stop="openDecrypt(record)">
                      人工解密
                    </a-button>
                    <span v-else class="table-tip">—</span>
                  </template>
                </a-table-column>
              </template>
            </a-table>
          </template>

          <!-- 上传模式 -->
          <template v-else>
            <a-divider orientation="left">1.2 手动上传文件</a-divider>
            <a-upload
              draggable
              :auto-upload="false"
              :limit="1"
              :show-file-list="true"
              accept=".csv"
              @change="onUploadChange"
              @remove="onUploadRemove"
            >
              <div class="upload-drop">
                <p class="arco-upload-drag-icon"><icon-upload /></p>
                <div style="margin-top: 8px; font-weight: 500">点击或拖拽 CSV 文件到此处上传</div>
                <div class="table-tip" style="margin-top: 4px">仅支持 CSV 格式，单文件上限 1GB</div>
              </div>
            </a-upload>
            <div v-if="uploadedFile" class="upload-summary">
              <a-descriptions :column="4" size="small" bordered style="margin-top: 16px">
                <a-descriptions-item label="文件名">{{ uploadedFile.name }}</a-descriptions-item>
                <a-descriptions-item label="大小">{{ formatFileSize(uploadedFile.size) }}</a-descriptions-item>
                <a-descriptions-item label="预估行数">{{ uploadedFile.rows.toLocaleString() }}</a-descriptions-item>
                <a-descriptions-item label="机构">{{ selectedAgency?.agencyName || '—' }}</a-descriptions-item>
              </a-descriptions>
            </div>
          </template>

          <!-- R20：文件结构识别 + 前 5 行预览 -->
          <template v-if="activeFile">
            <a-divider orientation="left">1.3 文件结构识别与前 5 行预览</a-divider>
            <a-descriptions :column="4" size="small" bordered style="margin-bottom: 12px">
              <a-descriptions-item label="编码格式">{{ fileStructure.encoding || '—' }}</a-descriptions-item>
              <a-descriptions-item label="分隔符">{{ fileStructure.delimiter || '—' }}</a-descriptions-item>
              <a-descriptions-item label="字段数">{{ fileStructure.fieldCount || '—' }}</a-descriptions-item>
              <a-descriptions-item label="总行数">{{ activeFile.rows.toLocaleString() }}</a-descriptions-item>
            </a-descriptions>
            <a-table :data="previewRows" :pagination="false" size="small" row-key="rowNo">
              <template #columns>
                <a-table-column title="行号" :width="70">
                  <template #cell="{ rowIndex }">{{ rowIndex + 1 }}</template>
                </a-table-column>
                <a-table-column v-for="c in previewColumns" :key="c" :title="c" ellipsis tooltip>
                  <template #cell="{ record }">
                    <span class="mono">{{ record[c] }}</span>
                  </template>
                </a-table-column>
              </template>
            </a-table>
            <div class="table-tip">
              预览数据不写入目标库，仅供人工确认；厂商返回文件名可能被修改，请人工核对数据量后关联对应的原外发任务。
            </div>
          </template>
        </div>

        <!-- ============ 步骤2：B2 任务匹配与字段映射 ============ -->
        <div v-show="currentStep === 1">
          <a-divider orientation="left" style="margin-top: 0">2.1 匹配前置外发任务（可选）</a-divider>
          <div v-if="activeFile" class="match-file-head">
            <span class="match-file-name">{{ activeFile.name }}</span>
            <a-tag size="small" color="arcoblue">{{ selectedAgency?.agencyName }}</a-tag>
            <a-tag size="small">{{ activeFile.rows.toLocaleString() }} 行</a-tag>
            <a-tag size="small" color="green">已预览确认</a-tag>
          </div>
          <a-form :model="formModel" layout="vertical">
            <a-form-item label="关联原外发任务（支持多对多，非强制）">
              <a-select v-model="matchedTaskIds" multiple allow-search placeholder="可选择关联一个或多个原外发任务，也可跳过">
                <a-option v-for="t in outboundTasks" :key="t.id" :value="t.id">
                  {{ t.id }} · {{ t.product }}（{{ t.sampleCount.toLocaleString() }} 条 · {{ t.requester }}）
                </a-option>
              </a-select>
            </a-form-item>
          </a-form>

          <a-divider orientation="left">2.2 外数产品选择</a-divider>
          <a-form :model="formModel" layout="vertical">
            <a-row :gutter="16" style="margin-bottom: 12px">
              <a-col :span="8">
                <a-form-item label="外数产品" layout="vertical">
                  <a-select v-model="mappingProduct" @change="onMappingProductChange">
                    <a-option v-for="p in productOptions" :key="p.name" :value="p.name">
                      {{ p.name }}<template v-if="p.interfaceId">｜接口号 {{ p.interfaceId }}</template>
                    </a-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="16">
                <a-form-item label=" ">
                  <a-space style="margin-top: 30px">
                    <a-button :disabled="!fieldMappings.length" @click="applyAutoCollision(true)">
                      <template #icon><icon-find-replace /></template>
                      执行自动字段碰撞
                    </a-button>
                    <a-button :disabled="!fieldMappings.length" @click="applyMappingFile">
                      <template #icon><icon-upload /></template>
                      上传映射表批量匹配
                    </a-button>
                    <a-tag color="gray">
                      {{ isCustomProduct ? '未收录产品：标准库字段为输入框，字段说明显示「—」' : '外数出参字段 → 标准库字段（字段顺序无关）' }}
                    </a-tag>
                  </a-space>
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>

          <!-- R32：强制绑定 IDMD5 + review date -->
          <a-alert v-if="!isCustomProduct" :type="requiredTwoPassed ? 'success' : 'warning'" style="margin-bottom: 12px">
            <template #title>必选字段映射（2 项）：标准字段固定，下拉选择文件中等同的出参字段</template>
            <a-space :size="24" wrap align="start" style="margin-bottom: 4px">
              <div v-for="r in requiredMappingStatus" :key="r.std" class="required-mapping-item">
                <div class="required-mapping-label">
                  标准字段 <b>{{ r.std }}</b>（{{ r.stdLabel }}）
                  <a-tag :color="r.ok ? 'green' : 'red'" size="small">
                    {{ r.ok ? `等同字段：${r.sel}` : r.sel ? `「${r.sel}」非等同字段` : '未选择等同字段' }}
                  </a-tag>
                </div>
                <a-select
                  v-model="requiredSourceSelection[r.std]"
                  size="small"
                  allow-search
                  placeholder="选择文件中等同的出参字段"
                  style="width: 240px"
                  @change="onRequiredSourceChange"
                >
                  <a-option v-for="f in catalogSourceFields" :key="f" :value="f">{{ f }}（{{ sourceFieldComment(f) }}）</a-option>
                </a-select>
                <div class="table-tip" style="margin-top: 2px">等同判定：{{ r.rule }}</div>
              </div>
            </a-space>
            <div class="table-tip">id_md5 与 review_date 两项标准字段必须绑定，否则无法进入下一步。</div>
          </a-alert>

          <!-- 字段映射列表 -->
          <a-table
            v-if="fieldMappings.length"
            :data="pagedFieldMappings"
            :pagination="mappingPagination"
            row-key="sourceField"
            size="small"
            @page-change="onMappingPageChange"
            @page-size-change="onMappingPageSizeChange"
          >
            <template #columns>
              <a-table-column title="CSV 列名" data-index="sourceField" :width="220" ellipsis tooltip />
              <a-table-column title="标准库字段名" :width="260">
                <template #cell="{ record }">
                  <a-input
                    v-if="isCustomProduct"
                    :model-value="record.targetField === NON_STD_FIELD ? '' : record.targetField"
                    placeholder="输入落库字段名"
                    size="small"
                    @change="(v: string) => setMappingTarget(record, v)"
                  />
                  <a-select
                    v-else
                    :model-value="record.targetField"
                    placeholder="选择标准库字段"
                    allow-search
                    allow-clear
                    size="small"
                    @change="(v: string) => setMappingTarget(record, v)"
                  >
                    <a-option :value="NON_STD_FIELD">非标准化字段（原样透传）</a-option>
                    <a-option v-for="f in stdFieldOptions" :key="f" :value="f">{{ f }}</a-option>
                  </a-select>
                </template>
              </a-table-column>
              <a-table-column title="字段说明" data-index="comment" :width="220" ellipsis tooltip />
              <a-table-column title="匹配方式" :width="140">
                <template #cell="{ record }">
                  <a-tag v-if="record.targetField === NON_STD_FIELD" color="gray" size="small">非标准化</a-tag>
                  <a-tag v-else-if="record.matchedBy === 'auto'" color="green" size="small">自动匹配</a-tag>
                  <a-tag v-else-if="record.matchedBy === 'file'" color="blue" size="small">映射表批量</a-tag>
                  <a-tag v-else-if="record.matchedBy === 'manual'" color="orange" size="small">人工调整</a-tag>
                  <a-tag v-else-if="record.matchedLabel === '默认保留原始字段名'" color="cyan" size="small">保留原字段名</a-tag>
                  <a-tag v-else color="red" size="small">待匹配</a-tag>
                </template>
              </a-table-column>
            </template>
          </a-table>
          <div v-if="fieldMappings.length" class="table-tip">
            映射列表已映射 {{ mappedCount }} / {{ fieldMappings.length }} 项（其中非标准化 {{ nonStdCount }} 项，另含必选独立区 {{ requiredPassedCount }} / {{ REQUIRED_FIELD_MATCH.length }} 项）。
            未匹配字段已排在列表最前方，便于优先处理；映射规则版本 <b>{{ mappingVersion }}</b> 将写入落库记录。
          </div>
        </div>

        <!-- ============ 步骤3：B3 解析落库 ============ -->
        <div v-show="currentStep === 2">
          <a-divider orientation="left" style="margin-top: 0">3.1 落临时库</a-divider>
          <a-space style="margin-bottom: 12px">
            <a-button type="primary" :loading="persisting" @click="persistToTemp">
              <template #icon><icon-save /></template>
              落临时库并生成 backid
            </a-button>
            <span v-if="persisting" class="persist-progress">{{ persistPercent }}%</span>
            <a-button v-if="persistBatches.length" @click="openTempPreview">
              <template #icon><icon-eye /></template>
              查看临时库数据
            </a-button>
          </a-space>

          <a-table v-if="persistBatches.length" :data="persistBatches" :pagination="false" row-key="backid" size="small">
            <template #columns>
              <a-table-column title="backid 批次标识" data-index="backid" :width="180">
                <template #cell="{ record }"><span class="mono">{{ record.backid }}</span></template>
              </a-table-column>
              <a-table-column title="来源文件" data-index="fileName" ellipsis tooltip />
              <a-table-column title="关联外发任务" data-index="taskIds">
                <template #cell="{ record }">
                  <a-space wrap>
                    <a-tag v-for="tid in record.taskIds" :key="tid" size="small" color="arcoblue">{{ tid }}</a-tag>
                    <span v-if="!record.taskIds.length" class="table-tip">未关联（前置任务匹配非强制）</span>
                  </a-space>
                </template>
              </a-table-column>
              <a-table-column title="落库行数" :width="110">
                <template #cell="{ record }">{{ record.rows.toLocaleString() }}</template>
              </a-table-column>
              <a-table-column title="临时库表" data-index="tempTable" :width="180">
                <template #cell="{ record }"><span class="mono">{{ record.tempTable }}</span></template>
              </a-table-column>
            </template>
          </a-table>
          <div class="table-tip">
            先将回溯数据全量落临时库并生成 backid 批次标识，落库记录、验证报告、通知记录三处均通过 backid 关联。
          </div>

          <a-divider orientation="left">3.2 落 Hive 标准库</a-divider>
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="源表">
              <a-space wrap :size="4">
                <a-tag v-for="t in persistBatches.map(b => b.tempTable)" :key="t" size="small" color="orangered">{{ t }}</a-tag>
                <span v-if="!persistBatches.length" class="table-tip">上一步未落临时库，暂无源表</span>
              </a-space>
            </a-descriptions-item>
            <a-descriptions-item label="目标表">
              <a-select
                v-model="hiveTable"
                allow-search
                placeholder="在固定外数库中搜索并选择 Hive 表"
                style="width: 420px"
                :disabled="!persistBatches.length"
              >
                <a-option v-for="t in hiveTableOptions" :key="t.fullName" :value="t.fullName">
                  {{ t.fullName }}（{{ t.description }}）
                </a-option>
              </a-select>
              <div class="table-tip">
                当前未做数据档案，标准表无统一维护入口，落库目标表由用户在固定外数库中手动搜索选择，不支持新建。
              </div>
            </a-descriptions-item>
            <a-descriptions-item label="回溯日期（review date）">
              <a-date-picker
                v-model="reviewDate"
                style="width: 220px"
                placeholder="选择回溯日期"
                value-format="YYYY-MM-DD"
              />
              <div class="table-tip">回溯日期写入分区字段 datax，格式转换为 yyyy-MM-dd。</div>
            </a-descriptions-item>
            <a-descriptions-item label="写入条数">
              <span class="std-write-count">{{ totalWriteRows.toLocaleString() }}</span> 条
              <div class="table-tip">
                来源文件 {{ activeFile?.name || '—' }} · 回溯返回 {{ (activeFile?.rows || 0).toLocaleString() }} 行
                · 写入策略：主键（身份证号+review_date）直接覆盖
              </div>
            </a-descriptions-item>
            <a-descriptions-item label="字段匹配情况">
              <a-space wrap :size="4">
                <a-tag size="small" color="green">标准字段落表列 {{ mappedCount - nonStdCount + requiredPassedCount }}</a-tag>
                <a-tag size="small" color="orange">非标 JSON 透传 {{ nonStdCount }}</a-tag>
                <a-tag size="small" color="gray">
                  映射总数 {{ mappedCount + requiredPassedCount }} / {{ fieldMappings.length + REQUIRED_FIELD_MATCH.length }}
                </a-tag>
                <a-tag size="small" color="cyan">映射版本 {{ mappingVersion }}</a-tag>
              </a-space>
              <div class="table-tip">
                非标准化字段统一序列化写入 extraParam 列（key 为外数出参字段名）；
                临时库清理策略：进入下一步即清理 / 定时 1 小时清理；上传文件落库完成后 24 小时清理。
              </div>
            </a-descriptions-item>
            <a-descriptions-item label="分区字段">
              <a-space wrap :size="4">
                <a-tag size="small" color="arcoblue">datax（回溯日期）</a-tag>
                <a-tag v-if="partitionValue" size="small" color="purple">datax={{ partitionValue }}</a-tag>
                <a-tag v-else size="small" color="gray">未选择回溯日期</a-tag>
              </a-space>
              <div class="table-tip">标准表分区字段固定为 datax，按回溯日期按天分区。</div>
            </a-descriptions-item>
          </a-descriptions>

          <a-button
            type="primary"
            style="margin-top: 16px"
            :loading="writing"
            :disabled="!persistBatches.length || !hiveTable || !partitionValue"
            @click="writeHive"
          >
            <template #icon><icon-save /></template>
            确认落 Hive 标准库
          </a-button>
        </div>

        <!-- ============ 步骤4：B4 三重行数验证与一致性校验 ============ -->
        <div v-show="currentStep === 3">
          <a-divider orientation="left" style="margin-top: 0">4.1 三重行数验证</a-divider>
          <a-space align="end" wrap style="margin-bottom: 12px">
            <div class="inline-field">
              <span class="inline-field-label">原样本文件（R62）</span>
              <a-upload :auto-upload="false" :limit="1" :show-file-list="true" accept=".csv" @change="onSampleUpload">
                <a-button>
                  <template #icon><icon-upload /></template>
                  上传原样本文件
                </a-button>
              </a-upload>
            </div>
            <a-button type="primary" :disabled="!persistBatches.length" @click="runTripleRowCheck">
              <template #icon><icon-safe /></template>
              执行三重行数验证
            </a-button>
            <a-button v-if="tripleRowCheck" @click="openReport">
              <template #icon><icon-file /></template>
              查看验证报告
            </a-button>
          </a-space>

          <a-table v-if="tripleRowCheck" :data="[tripleRowCheck]" :pagination="false" size="small" row-key="loadedRows">
            <template #columns>
              <a-table-column title="入库行数" :width="130">
                <template #cell="{ record }">{{ record.loadedRows.toLocaleString() }}</template>
              </a-table-column>
              <a-table-column title="源文件行数" :width="130">
                <template #cell="{ record }">{{ record.sourceFileRows.toLocaleString() }}</template>
              </a-table-column>
              <a-table-column title="原样本文件行数" :width="150">
                <template #cell="{ record }">{{ record.sampleFileRows.toLocaleString() }}</template>
              </a-table-column>
              <a-table-column title="差值" :width="100">
                <template #cell="{ record }">
                  <span :class="record.matched ? 'ok-text' : 'err-text'">
                    {{ record.loadedRows - record.sourceFileRows }}
                  </span>
                </template>
              </a-table-column>
              <a-table-column title="必填字段非空校验" :width="160">
                <template #cell="{ record }">
                  <a-tag size="small" :color="record.requiredFieldPass ? 'green' : 'red'">
                    {{ record.requiredFieldPass ? '通过' : `异常 ${record.requiredFieldErrorCount} 条` }}
                  </a-tag>
                </template>
              </a-table-column>
              <a-table-column title="比对结果" :width="130">
                <template #cell="{ record }">
                  <a-tag size="small" :color="record.matched ? 'green' : 'red'">
                    {{ record.matched ? '一致' : '不一致' }}
                  </a-tag>
                </template>
              </a-table-column>
            </template>
          </a-table>
          <div class="table-tip">三重行数 = 入库行数 + 源文件行数 + 原样本文件行数，三者一致方为通过；不一致时给出差值并标记异常行。</div>

          <a-divider orientation="left">4.2 一致性抽样校验</a-divider>
          <a-space align="end" :wrap="false" style="margin-bottom: 12px">
            <div class="inline-field">
              <span class="inline-field-label">一致性校验目标表</span>
              <a-select
                v-model="consistencyTargetTable"
                allow-search
                :disabled="!persistBatches.length"
                placeholder="选择用于对比的线上样本表"
                style="width: 340px"
              >
                <a-option v-for="t in consistencyTargetOptions" :key="t.fullName" :value="t.fullName">
                  {{ t.fullName }}（{{ t.description }}）
                </a-option>
              </a-select>
            </div>
            <a-button type="primary" :loading="validating" :disabled="!persistBatches.length" @click="runConsistencyCheck">
              <template #icon><icon-safe /></template>
              执行抽样一致性对比
            </a-button>
          </a-space>
          <div class="table-tip" style="margin-bottom: 12px">
            关联条件为 SM4 加密身份证号 + review date 双条件；抽样规模 50~100 条；结果存临时表后分页展示，不匹配项排在最前；页面不提供导出。
          </div>

          <a-alert v-if="consistencySummary" :type="consistencySummary.inconsistentTotal ? 'warning' : 'success'" style="margin-bottom: 12px">
            <template #title>{{ consistencySummary.diffSummary }}</template>
            <a-space :size="16" wrap>
              <span>抽样总数 {{ consistencySummary.sampleTotal }}</span>
              <span>关联成功 {{ consistencySummary.matchedTotal }}</span>
              <span>关联失败 {{ consistencySummary.unmatchedTotal }}</span>
              <span>不一致 {{ consistencySummary.inconsistentTotal }}</span>
            </a-space>
          </a-alert>

          <a-table
            v-if="consistencyDetails.length"
            :data="pagedConsistencyDetails"
            :pagination="consistencyPagination"
            row-key="sampleId"
            size="small"
            @page-change="onConsistencyPageChange"
          >
            <template #columns>
              <a-table-column title="抽样ID（SM4身份证号）" data-index="sampleId" :width="200">
                <template #cell="{ record }"><span class="mono">{{ record.sampleId }}</span></template>
              </a-table-column>
              <a-table-column title="review date" data-index="reviewDate" :width="120" />
              <a-table-column title="对比字段" data-index="field" :width="200" />
              <a-table-column title="线上值" data-index="onlineValue" />
              <a-table-column title="回溯值" data-index="retroValue" />
              <a-table-column title="结果" :width="90">
                <template #cell="{ record }">
                  <a-tag size="small" :color="record.consistent ? 'green' : 'red'">{{ record.consistent ? 'true' : 'false' }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column title="差异分布标注" :width="260">
                <template #cell="{ record }">
                  <span v-if="record.diffDistribution" class="table-tip">{{ record.diffDistribution }}</span>
                  <span v-else class="table-tip">—</span>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </div>

        <!-- ============ 步骤5：B5 落库文件通知 ============ -->
        <div v-show="currentStep === 4">
          <a-divider orientation="left" style="margin-top: 0">5.1 通知配置</a-divider>
          <a-form :model="formModel" layout="vertical">
            <a-row :gutter="16">
              <a-col :span="8">
                <a-form-item label="通知渠道（双渠道可同时开启）">
                  <a-checkbox-group v-model="notifyConfig.channels">
                    <a-checkbox value="数据服务公众号">数据服务公众号</a-checkbox>
                    <a-checkbox value="数字社区">数字社区</a-checkbox>
                  </a-checkbox-group>
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="通知接收人（按机构 / 外数类型配置）">
                  <a-select v-model="notifyConfig.receivers" multiple allow-search placeholder="选择接收人">
                    <a-option value="风险数据团队值班">风险数据团队值班</a-option>
                    <a-option value="风控数据组">风控数据组</a-option>
                    <a-option value="模型算法组">模型算法组</a-option>
                    <a-option value="贷中管理团队">贷中管理团队</a-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="敏感信息脱敏">
                  <a-switch v-model="notifyConfig.maskEnabled" />
                  <span class="table-tip" style="margin-left: 8px">脱敏后身份证号等敏感字段仅展示前 4 位</span>
                </a-form-item>
              </a-col>
            </a-row>
            <a-form-item label="失败重试次数">
              <a-input-number v-model="notifyConfig.maxRetry" :min="0" :max="3" />
              <span class="table-tip" style="margin-left: 8px">发送失败最多重试 3 次，超过后标记发送失败并保留记录</span>
            </a-form-item>
            <a-alert type="info">{{ notifyConfig.configDesc }}</a-alert>
          </a-form>

          <a-divider orientation="left">5.2 通知内容（8 要素）</a-divider>
          <a-descriptions :column="2" bordered size="small">
            <a-descriptions-item label="机构名称">{{ selectedAgency?.agencyName || '—' }}</a-descriptions-item>
            <a-descriptions-item label="文件名">{{ activeFile?.name || '—' }}</a-descriptions-item>
            <a-descriptions-item label="backid">
              <span class="mono">{{ currentBackid || '—' }}</span>
            </a-descriptions-item>
            <a-descriptions-item label="落库时间">{{ currentBackid ? '本次落库时间' : '—' }}</a-descriptions-item>
            <a-descriptions-item label="入库行数">{{ totalWriteRows.toLocaleString() }}</a-descriptions-item>
            <a-descriptions-item label="验证结果">
              {{ tripleRowCheck?.matched ? '三重行数验证通过' : tripleRowCheck ? '三重行数验证未通过' : '未执行' }}
            </a-descriptions-item>
            <a-descriptions-item label="异常摘要" :span="2">
              {{ tripleRowCheck?.matched ? '无异常行' : `入库 ${tripleRowCheck?.loadedRows ?? 0} 行，源文件 ${tripleRowCheck?.sourceFileRows ?? 0} 行` }}
            </a-descriptions-item>
            <a-descriptions-item label="一致性摘要" :span="2">
              {{ consistencySummary?.diffSummary || '未执行一致性校验' }}
            </a-descriptions-item>
          </a-descriptions>

          <a-button type="primary" style="margin-top: 16px" :disabled="!persistBatches.length" @click="sendNotify">
            <template #icon><icon-send /></template>
            发送落库通知
          </a-button>

          <a-divider orientation="left">5.3 通知记录</a-divider>
          <a-table v-if="notifyRecords.length" :data="notifyRecords" :pagination="false" row-key="notifyId" size="small">
            <template #columns>
              <a-table-column title="通知编号" data-index="notifyId" :width="180">
                <template #cell="{ record }"><span class="mono">{{ record.notifyId }}</span></template>
              </a-table-column>
              <a-table-column title="渠道" data-index="channel" :width="140" />
              <a-table-column title="接收人" :width="220" ellipsis tooltip>
                <template #cell="{ record }">{{ record.receivers.join('、') }}</template>
              </a-table-column>
              <a-table-column title="脱敏" :width="80">
                <template #cell="{ record }">
                  <a-tag size="small" :color="record.maskEnabled ? 'green' : 'gray'">
                    {{ record.maskEnabled ? '已脱敏' : '未脱敏' }}
                  </a-tag>
                </template>
              </a-table-column>
              <a-table-column title="发送状态" :width="110">
                <template #cell="{ record }">
                  <a-tag size="small" :color="record.sendStatus === '发送成功' ? 'green' : 'red'">{{ record.sendStatus }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column title="重试次数" data-index="retryCount" :width="90" />
              <a-table-column title="发送时间" data-index="sentAt" :width="170" />
              <a-table-column title="失败原因" :width="220" ellipsis tooltip>
                <template #cell="{ record }">
                  <span v-if="record.failReason" class="err-text">{{ record.failReason }}</span>
                  <span v-else class="table-tip">—</span>
                </template>
              </a-table-column>
            </template>
          </a-table>
          <a-empty v-else description="尚未发送通知" />
        </div>
      </div>

      <!-- 操作区：3.1 状态机要求落 Hive 后仍需走「行数验证 + 一致性校验 → 待通知 → 已完成」，
           故以 notifySent（通知是否已发送）作为完成态判据，而非 hiveWritten -->
      <div v-if="!notifySent" class="step-footer">
        <a-button v-if="currentStep > 0" @click="prevStep">上一步</a-button>
        <span v-else />
        <a-space>
          <a-button @click="goBack">取消申请</a-button>
          <a-button v-if="currentStep < stepsList.length - 1" type="primary" @click="nextStep">下一步</a-button>
          <a-button v-else type="primary" :loading="writing" :disabled="!persistBatches.length" @click="finishAll">
            <template #icon><icon-check-circle /></template>
            完成落库流程
          </a-button>
        </a-space>
      </div>
      <div v-else class="step-footer">
        <a-button @click="goBack">返回服务场景</a-button>
        <a-space>
          <a-button @click="openPersistRecord">查看落库记录</a-button>
          <a-button type="primary" @click="goTaskList">查看服务任务列表</a-button>
        </a-space>
      </div>
    </a-card>

    <!-- 解密弹窗（R19/E11） -->
    <a-modal v-model:visible="decryptVisible" title="人工解密" :ok-loading="decrypting" @ok="confirmDecrypt" @cancel="decrypting = false">
      <a-form :model="formModel" layout="vertical">
        <a-form-item label="密钥（线下获取后填入）">
          <a-input-password v-model="decryptKey" placeholder="请输入人工线下获取的解密密钥" allow-clear />
        </a-form-item>
        <a-alert type="warning">百行 / 钱塘密钥不固定，钱塘为随机生成；解密失败需通知渠道对接方重新获取密钥。</a-alert>
        <a-alert v-if="decryptFailed" type="error" style="margin-top: 12px">{{ decryptFailed }}</a-alert>
      </a-form>
    </a-modal>

    <!-- 已落库文件提醒弹窗（R26/R27） -->
    <a-modal v-model:visible="processedModalVisible" title="该文件已落库" :width="680" @cancel="processedModalVisible = false">
      <a-alert type="warning">
        该回溯返回文件此前已完成落库处理。继续操作将对其「重新写入」，并生成新的 backid 批次。
      </a-alert>
      <a-table :data="processedRecords" :pagination="false" size="small" row-key="backid" style="margin-top: 12px">
        <template #columns>
          <a-table-column title="处理文件名" data-index="fileName" ellipsis tooltip />
          <a-table-column title="处理时间" data-index="processTime" :width="160" />
          <a-table-column title="操作人" data-index="operator" :width="150" ellipsis tooltip />
          <a-table-column title="backid" data-index="backid" :width="170">
            <template #cell="{ record }"><span class="mono">{{ record.backid }}</span></template>
          </a-table-column>
        </template>
      </a-table>
      <template #footer>
        <a-button @click="processedModalVisible = false">取消</a-button>
        <a-button type="primary" status="warning" @click="confirmRewrite">
          <template #icon><icon-refresh /></template>
          重新写入并继续
        </a-button>
      </template>
    </a-modal>

    <!-- 临时库数据预览（R47） -->
    <a-modal v-model:visible="tempPreviewVisible" title="临时库数据查看" :width="900" :footer="false">
      <a-alert type="info" style="margin-bottom: 12px">
        临时库表 {{ persistBatches[0]?.tempTable || 'tmp_ext_retro_raw' }}，批次 {{ currentBackid || '—' }}，共 {{ totalWriteRows.toLocaleString() }} 行。以下展示前 10 行样例。
      </a-alert>
      <a-table :data="tempPreviewRows" :pagination="false" size="small" row-key="_rowNo">
        <template #columns>
          <a-table-column title="行号" data-index="_rowNo" :width="70" />
          <a-table-column v-for="c in tempPreviewColumns" :key="c" :title="c" ellipsis tooltip>
            <template #cell="{ record }"><span class="mono">{{ record[c] }}</span></template>
          </a-table-column>
        </template>
      </a-table>
    </a-modal>

    <!-- 验证报告（R64） -->
    <a-modal v-model:visible="reportVisible" title="验证报告" :width="780" :footer="false">
      <a-descriptions :column="2" bordered size="small">
        <a-descriptions-item label="报告编号">
          <span class="mono">VR{{ currentBackid || 'NA' }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="关联backid">
          <span class="mono">{{ currentBackid || '—' }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="验证类型">三重行数验证 + 一致性校验</a-descriptions-item>
        <a-descriptions-item label="生成时间">{{ reportTime }}</a-descriptions-item>
        <a-descriptions-item label="操作人">当前用户（风控数据组）</a-descriptions-item>
        <a-descriptions-item label="差异摘要">{{ consistencySummary?.diffSummary || '—' }}</a-descriptions-item>
      </a-descriptions>
      <a-table v-if="tripleRowCheck" :data="[tripleRowCheck]" :pagination="false" size="small" style="margin-top: 12px" row-key="loadedRows">
        <template #columns>
          <a-table-column title="入库行数" data-index="loadedRows" />
          <a-table-column title="源文件行数" data-index="sourceFileRows" />
          <a-table-column title="原样本行数" data-index="sampleFileRows" />
          <a-table-column title="差值" :width="90">
            <template #cell="{ record }">{{ record.loadedRows - record.sourceFileRows }}</template>
          </a-table-column>
          <a-table-column title="比对结果" :width="100">
            <template #cell="{ record }">
              <a-tag size="small" :color="record.matched ? 'green' : 'red'">{{ record.matched ? '一致' : '不一致' }}</a-tag>
            </template>
          </a-table-column>
        </template>
      </a-table>
      <a-empty v-else style="margin-top: 12px" description="尚未执行验证" />
    </a-modal>

    <!-- 落库记录抽屉（R54） -->
    <a-drawer v-model:visible="recordVisible" title="落库记录" :width="780" :footer="false">
      <a-descriptions v-if="persistRecord" :column="2" bordered size="small">
        <a-descriptions-item label="backid 批次标识">
          <span class="mono">{{ persistRecord.backid }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="落库状态">
          <a-tag size="small" color="arcoblue">{{ persistRecord.baseInfo.status }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="操作人">{{ persistRecord.baseInfo.operator }}</a-descriptions-item>
        <a-descriptions-item label="操作时间">{{ persistRecord.baseInfo.operateTime }}</a-descriptions-item>
        <a-descriptions-item label="征信机构">{{ persistRecord.agencyInfo.agencyName }}</a-descriptions-item>
        <a-descriptions-item label="机构类型">{{ persistRecord.agencyInfo.agencyType }}</a-descriptions-item>
        <a-descriptions-item label="牌照编号">{{ persistRecord.agencyInfo.licenseNo }}</a-descriptions-item>
        <a-descriptions-item label="获取方式">{{ persistRecord.fileInfo.acquireMode }}</a-descriptions-item>
        <a-descriptions-item label="文件名" :span="2">{{ persistRecord.fileInfo.fileName }}</a-descriptions-item>
        <a-descriptions-item label="文件行数">{{ persistRecord.fileInfo.fileRows.toLocaleString() }}</a-descriptions-item>
        <a-descriptions-item label="文件大小">{{ formatFileSize(persistRecord.fileInfo.fileSize) }}</a-descriptions-item>
        <a-descriptions-item label="编码格式">{{ persistRecord.fileInfo.encoding }}</a-descriptions-item>
        <a-descriptions-item label="分隔符">{{ persistRecord.fileInfo.delimiter }}</a-descriptions-item>
        <a-descriptions-item label="外数产品">{{ persistRecord.mappingInfo.product }}</a-descriptions-item>
        <a-descriptions-item label="接口号">{{ persistRecord.mappingInfo.interfaceId || '—' }}</a-descriptions-item>
        <a-descriptions-item label="映射版本">{{ persistRecord.mappingInfo.mappingVersion }}</a-descriptions-item>
        <a-descriptions-item label="标准 / 非标字段数">
          {{ persistRecord.mappingInfo.stdFieldCount }} / {{ persistRecord.mappingInfo.nonStdFieldCount }}
        </a-descriptions-item>
        <a-descriptions-item label="Hive 目标表" :span="2">
          <span class="mono">{{ persistRecord.storageInfo.hiveTable }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="临时库表">{{ persistRecord.storageInfo.tempTable }}</a-descriptions-item>
        <a-descriptions-item label="入库行数">{{ persistRecord.storageInfo.loadedRows.toLocaleString() }}</a-descriptions-item>
        <a-descriptions-item label="分区字段">
          <span class="mono">{{ persistRecord.storageInfo.partitionField }}={{ persistRecord.storageInfo.partitionValue }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="写入策略">{{ persistRecord.storageInfo.writeStrategy }}</a-descriptions-item>
        <a-descriptions-item label="临时库清理">{{ persistRecord.storageInfo.tempTableCleanup }}</a-descriptions-item>
        <a-descriptions-item label="上传文件清理">{{ persistRecord.storageInfo.uploadFileCleanup }}</a-descriptions-item>
        <a-descriptions-item label="计费主体">{{ persistRecord.billing.billingSubject }}</a-descriptions-item>
        <a-descriptions-item label="计费类型">{{ persistRecord.billing.billingType }}</a-descriptions-item>
        <a-descriptions-item label="计费条数">{{ persistRecord.billing.billingRows.toLocaleString() }}</a-descriptions-item>
        <a-descriptions-item label="预估费用">¥ {{ persistRecord.billing.estimatedAmount.toFixed(2) }}</a-descriptions-item>
      </a-descriptions>
      <a-empty v-else description="尚未生成落库记录" />
    </a-drawer>

    <!-- 完成弹窗 -->
    <a-modal v-model:visible="successVisible" title="回溯落库完成" :footer="false">
      <a-result status="success" title="全链路完成：已落库并通知">
        <template #subtitle>
          状态流转：{{ PERSIST_STATUS_FLOW.join(' → ') }}。Hive 表 {{ hiveTable }}，需求方可取数。
        </template>
        <template #extra>
          <a-space>
            <a-button @click="openPersistRecord">查看落库记录</a-button>
            <a-button type="primary" @click="goTaskList">查看服务任务列表</a-button>
          </a-space>
        </template>
      </a-result>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import {
  IconSearch, IconSave, IconUpload, IconSafe, IconFindReplace, IconRefresh,
  IconEye, IconFile, IconSend, IconStorage, IconCheckCircle, IconExclamationCircleFill,
} from '@arco-design/web-vue/es/icon'
import { useBacktrackPersist } from '../composables/useBacktrackPersist'
import { formatFileSize } from '../mock/retroFiles'

const router = useRouter()
const currentStep = ref(0)

/** 表单容器模型（Arco Form 要求 model prop，本页表单项不走 field 校验，仅用于布局） */
const formModel = reactive<Record<string, unknown>>({})

/** 步骤定义（对应文档 B1~B5） */
const stepsList = [
  { title: '选择机构与文件获取', description: 'SFTP 拉取 / 手动上传' },
  { title: '任务匹配与字段映射', description: '前置任务 + 字段碰撞' },
  { title: '解析落库', description: '落临时库 → 落 Hive' },
  { title: '行数验证与一致性校验', description: '三重行数 + 抽样比对' },
  { title: '落库文件通知', description: '双渠道通知需求方' },
]

/** 落库流程共享状态与业务逻辑 */
const flow = useBacktrackPersist()

/* ---------- 解构暴露给模板的成员 ---------- */
const {
  currentStatus, setStatus, PERSIST_STATUS_FLOW,
  agencies, selectedAgencyId, selectedAgency, pathCleanupNotice,
  dataSourceMode, sftpDir, sftpSubDir, sftpFileName, dirOptions, fullFilePath, sftpParams,
  fileList, querying, selectedFile, uploadFileList, uploadedFile,
  fileStructure, previewRows, previewColumns, activeFile,
  loadAgencies, onAgencyChange, queryFiles, onFileSelect,
  onUploadChange, onUploadRemove, onDataSourceModeChange,
  decryptVisible, decrypting, decryptKey, decryptFailed, openDecrypt, confirmDecrypt,
  processedModalVisible, processedRecords, confirmRewrite,
  productOptions, mappingProduct, currentProduct, isCustomProduct, stdFieldOptions, fieldMappings,
  REQUIRED_FIELD_MATCH, requiredSourceSelection, catalogSourceFields, sourceFieldComment,
  requiredMappingStatus, requiredTwoPassed, requiredPassedCount,
  loadProducts, onMappingProductChange, onRequiredSourceChange,
  applyAutoCollision, applyMappingFile, setMappingTarget,
  mappedCount, nonStdCount, nonStdFieldNames,
  mappingPagination, pagedFieldMappings, onMappingPageChange, onMappingPageSizeChange,
  mappingVersion, buildMappingVersion, NON_STD_FIELD,
  outboundTasks, matchedTaskIds, loadOutboundTasks,
  hiveTableOptions, hiveTable, loadHiveTables, reviewDate, partitionValue,
  persistBatches, persisting, persistPercent, persistToTemp,
  tempPreviewVisible, openTempPreview, tempPreviewRows, tempPreviewColumns,
  sampleFile, onSampleUpload, tripleRowCheck,
  consistencyTargetOptions, consistencyTargetTable, consistencyDetails, consistencySummary,
  validating, consistencyPagination, pagedConsistencyDetails, onConsistencyPageChange,
  loadConsistencyTables, runTripleRowCheck, runConsistencyCheck, reportVisible, openReport,
  notifyConfig, loadNotifyConfig, notifyRecords, notifySent, sendNotify,
  persistRecord, recordVisible, buildPersistRecord, openPersistRecord,
} = flow

/* ---------- 派生状态 ---------- */
/** 当前 backid（R51） */
const currentBackid = computed(() => persistBatches.value[0]?.backid || '')

/** 写入总行数 */
const totalWriteRows = computed(() => persistBatches.value.reduce((sum, b) => sum + b.rows, 0))

/** 状态标签色 */
const statusColor = computed(() => {
  if (currentStatus.value === '已完成') return 'green'
  if (currentStatus.value === 'Hive已落库' || currentStatus.value === '待通知') return 'cyan'
  if (currentStatus.value === '临时库已落库') return 'purple'
  return 'arcoblue'
})

/** 当前状态在 9 态流转中的序号（用于状态条高亮） */
const statusIndex = computed(() => PERSIST_STATUS_FLOW.indexOf(currentStatus.value))

/** 表格行高亮 */
const rowClass = (record: any) => (record.id === selectedFile.value?.id ? 'row-selected' : '')

/** 报告生成时间 */
const reportTime = computed(() => new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'))

/* ---------- 落 Hive ---------- */
const writing = ref(false)
const hiveWritten = ref(false)
const successVisible = ref(false)

/** 落 Hive 标准库（R46 两阶段落库的第二阶段） */
const writeHive = async () => {
  if (writing.value) return
  if (!persistBatches.value.length) {
    Message.warning('请先落临时库生成 backid 批次')
    return
  }
  if (!hiveTable.value) {
    Message.warning('请选择落库目标 Hive 表')
    return
  }
  if (!partitionValue.value) {
    Message.warning('请选择回溯日期，分区字段 datax 需由回溯日期转换得到')
    return
  }
  writing.value = true
  await new Promise((r) => setTimeout(r, 1200))
  writing.value = false
  hiveWritten.value = true
  setStatus('Hive已落库')
  await buildPersistRecord()
  Message.success(`已落 Hive 标准库 ${hiveTable.value}，分区 datax=${partitionValue.value}`)
}

/** 完成整个流程（落库 + 通知） */
const finishAll = async () => {
  if (!notifySent.value) {
    await sendNotify()
  }
  successVisible.value = true
}

/* ---------- 步骤流转 ---------- */
/** 进入下一步并做各环节校验 */
const nextStep = async () => {
  if (currentStep.value === 0) {
    if (!selectedAgency.value) {
      Message.warning('请先选择征信机构')
      return
    }
    if (!activeFile.value) {
      Message.warning('请拉取或上传回溯返回文件')
      return
    }
    if (!previewRows.value.length) {
      Message.warning('请先完成文件解密并确认前 5 行预览')
      return
    }
    setStatus('预览已确认')
  } else if (currentStep.value === 1) {
    if (!fieldMappings.value.length) {
      Message.warning('请选择外数产品并完成字段映射')
      return
    }
    if (!isCustomProduct.value && !requiredTwoPassed.value) {
      const miss = requiredMappingStatus.value.filter((r) => !r.ok)
      Message.warning(`必须绑定 IDMD5 和 review date 两个必填字段：${miss.map((m) => `${m.std}（${m.stdLabel}）`).join('、')}`)
      return
    }
    // R36：每个字段都必须完成选择
    const unmapped = fieldMappings.value.filter((m) => !m.targetField)
    if (unmapped.length) {
      const preview = unmapped.slice(0, 10).map((m) => m.sourceField).join('、')
      Message.warning(`存在未完成选择的字段（${unmapped.length} 个）：${preview}${unmapped.length > 10 ? ' 等' : ''}`)
      return
    }
    if (!matchedTaskIds.value.length) {
      Message.info('前置外发任务匹配为可选环节，未关联也可继续落库')
    }
    setStatus('任务已匹配')
    buildMappingVersion()
  } else if (currentStep.value === 2) {
    if (!persistBatches.value.length) {
      Message.warning('请先「落临时库并生成 backid」')
      return
    }
    if (!hiveTable.value) {
      Message.warning('请选择落库目标 Hive 表')
      return
    }
    if (!partitionValue.value) {
      Message.warning('请选择回溯日期')
      return
    }
    if (!hiveWritten.value) {
      Message.warning('请先执行「确认落 Hive 标准库」')
      return
    }
  } else if (currentStep.value === 3) {
    if (!tripleRowCheck.value) {
      Message.warning('请先执行三重行数验证')
      return
    }
    // 3.1：进入「待通知」前，行数验证与一致性抽样校验均需执行完成
    if (!consistencySummary.value) {
      Message.warning('请先执行抽样一致性对比')
      return
    }
  }
  currentStep.value = Math.min(currentStep.value + 1, stepsList.length - 1)
}

/** 上一步 */
const prevStep = () => {
  currentStep.value = Math.max(currentStep.value - 1, 0)
}

/* ---------- 导航 ---------- */
/** 返回服务场景入口 */
const goBack = () => {
  router.push({ name: 'RiskExternalDataServiceScene' })
}

/** 跳转服务任务列表 */
const goTaskList = () => {
  successVisible.value = false
  router.push({ name: 'RiskExternalDataTaskList' })
}

onMounted(async () => {
  await loadAgencies()
  await onAgencyChange()
  await Promise.all([loadProducts(), loadOutboundTasks()])
  await Promise.all([loadHiveTables(), loadConsistencyTables()])
  await loadNotifyConfig()
})
</script>

<style scoped>
.backtrack-persist {
  padding: 0 16px;
}

.step-header {
  margin-top: 16px;
  padding: 16px 20px;
  background: var(--color-fill-1);
  border-radius: 6px;
}

.status-card {
  margin-top: 12px;
}

.status-label {
  font-size: 13px;
  color: var(--color-text-3);
}

.status-flow {
  font-size: 12px;
  color: var(--color-text-3);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.status-node {
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--color-fill-2);
  color: var(--color-text-3);
  white-space: nowrap;
}

.status-node.is-done {
  background: rgba(var(--green-6), 0.12);
  color: rgb(var(--green-6));
}

.status-node.is-current {
  background: rgb(var(--primary-6));
  color: #fff;
  font-weight: 600;
}

.status-arrow {
  color: var(--color-text-4);
}

.inline-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.inline-field-label {
  font-size: 13px;
  color: var(--color-text-2);
}

.persist-card {
  margin-top: 12px;
}

.step-content {
  min-height: 320px;
  padding: 16px 0;
}

.step-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid var(--color-neutral-3);
}

.table-tip {
  margin-top: 10px;
  font-size: 12px;
  color: var(--color-text-3);
}

.required-mapping-item {
  min-width: 240px;
}

.required-mapping-label {
  margin-bottom: 4px;
  font-size: 13px;
  color: var(--color-text-1);
}

.selected-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding: 10px 14px;
  border: 1px dashed rgb(var(--arcoblue-6));
  border-radius: 6px;
  background: var(--color-primary-lightest);
}

.std-write-count {
  font-size: 18px;
  font-weight: 600;
  color: rgb(var(--arcoblue-6));
}

.upload-drop {
  padding: 24px 16px;
  text-align: center;
  color: var(--color-text-2);
}

.upload-summary {
  margin-top: 4px;
}

.mono {
  font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 12px;
}

.match-file-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.match-file-name {
  font-weight: 500;
}

.persist-progress {
  font-weight: 600;
  color: rgb(var(--arcoblue-6));
}

.ok-text {
  color: rgb(var(--green-6));
}

.err-text {
  color: rgb(var(--danger-6));
}

.clickable-table :deep(.arco-table-tr) {
  cursor: pointer;
}

.clickable-table :deep(.row-selected) {
  background: var(--color-primary-lightest);
}
</style>
