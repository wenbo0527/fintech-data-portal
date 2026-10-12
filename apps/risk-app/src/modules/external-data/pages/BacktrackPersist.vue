<template>
  <div class="backtrack-persist">
    <a-page-header title="外数回溯落库申请" subtitle="回溯返回非标准数据经任务匹配与字段映射标准化落库 Hive">
      <template #extra>
        <a-tag v-if="currentStatusText" :color="statusColor" bordered size="large">
          当前状态：{{ currentStatusText }}
        </a-tag>
      </template>
    </a-page-header>

    <a-card class="persist-card">
      <a-steps :current="currentStep" style="margin-bottom: 24px">
        <a-step v-for="(s, i) in stepsList" :key="i" :title="s.title" :description="s.description" />
      </a-steps>

      <div class="step-content">
        <!-- 步骤1：任务配置（数据来源：SFTP 目录读取 或 本地文件导入 → 选择/导入文件进入下一步） -->
        <div v-show="currentStep === 0">
          <a-form :model="taskConfig" layout="vertical">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="数据来源方式">
                  <a-radio-group v-model="dataSourceMode" type="button" @change="onDataSourceModeChange">
                    <a-radio value="sftp">
                      <template #icon><icon-search /></template>
                      SFTP 文件读取
                    </a-radio>
                    <a-radio value="upload">
                      <template #icon><icon-upload /></template>
                      本地文件导入
                    </a-radio>
                  </a-radio-group>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="征信机构" field="channel">
                  <a-select v-model="taskConfig.channel">
                    <a-option v-for="c in channelOptions" :key="c" :value="c">{{ c }}</a-option>
                  </a-select>
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>

          <!-- 方式一：从 SFTP 渠道目录定期拉取并选择返回文件 -->
          <div v-show="dataSourceMode === 'sftp'">
            <a-form :model="taskConfig" layout="vertical">
              <a-form-item label="文件目录" field="dir">
                <a-input-group style="width: 100%">
                  <a-select v-model="taskConfig.dir" placeholder="选择返回文件所在目录" style="flex: 1">
                    <a-option v-for="d in dirOptions" :key="d.value" :value="d.value">
                      {{ d.value }}
                    </a-option>
                  </a-select>
                  <a-button type="primary" :loading="querying" @click="queryFiles">
                    <template #icon><icon-search /></template>
                    查询文件
                  </a-button>
                </a-input-group>
              </a-form-item>
            </a-form>

            <a-table
              v-if="fileList.length"
              :data="fileList"
              :pagination="false"
              row-key="id"
              :row-class="rowClass"
              class="clickable-table"
              @row-click="onFileRowClick"
            >
              <template #columns>
                <a-table-column title="文件名" data-index="name" ellipsis tooltip />
                <a-table-column title="大小" data-index="size" :width="100" />
                <a-table-column title="数据行数" :width="110">
                  <template #cell="{ record }">{{ record.rows.toLocaleString() }}</template>
                </a-table-column>
                <a-table-column title="更新时间" data-index="updateTime" :width="170" />
                <a-table-column title="状态" :width="180">
                  <template #cell="{ record }">
                    <a-space size="mini">
                      <a-tag :color="record.decrypted ? 'green' : 'orange'">
                        {{ record.decrypted ? '已解密' : '待解密' }}
                      </a-tag>
                      <a-tag v-if="getProcessRecords(record.id).length" color="purple">已处理</a-tag>
                    </a-space>
                  </template>
                </a-table-column>
                <a-table-column title="操作" :width="110" align="center">
                  <template #cell="{ record }">
                    <a-button type="text" size="small" :disabled="record.decrypted" @click.stop="openDecrypt(record)">
                      {{ record.decrypted ? '已完成' : '人工解密' }}
                    </a-button>
                  </template>
                </a-table-column>
              </template>
            </a-table>

            <div v-else class="table-tip" style="margin-top: 24px">
              定期拉取任务（一天 / 半天一次）会将厂商回溯返回文件落到对应渠道 SFTP 目录；
              百行 / 钱塘密钥不固定（钱塘随机生成），加密文件需人工解密。选择已解密文件行即可进入下一步；
              标记「已处理」的文件再次点击时会弹窗展示历史处理记录，确认后可选择重新写入。
            </div>
          </div>

          <!-- 方式二：直接导入本地回溯返回文件（前端登记，自动视为已解密） -->
          <div v-show="dataSourceMode === 'upload'">
            <a-upload
              draggable
              :auto-upload="false"
              :limit="1"
              :file-list="uploadFileList"
              tip="支持 .csv / .txt / .zip 等回溯返回文件；导入后自动登记为可处理数据源"
              @change="onUploadChange"
              @remove="onUploadRemove"
            >
              <template #upload-button>
                <div class="upload-drop">
                  <icon-folder style="font-size: 28px; color: var(--color-text-3)" />
                  <div style="margin-top: 8px; font-weight: 500">点击或拖拽回溯返回文件到此处导入</div>
                  <div class="table-tip" style="margin-top: 4px">适用于厂商通过邮件 / 离线介质交付、未落 SFTP 目录的场景</div>
                </div>
              </template>
            </a-upload>

            <div v-if="uploadedFile" class="upload-summary">
              <a-descriptions :column="4" size="small" bordered style="margin-top: 16px">
                <a-descriptions-item label="文件名">{{ uploadedFile.name }}</a-descriptions-item>
                <a-descriptions-item label="渠道">{{ uploadedFile.channel }}</a-descriptions-item>
                <a-descriptions-item label="大小">{{ uploadedFile.size }}</a-descriptions-item>
                <a-descriptions-item label="预估行数">{{ uploadedFile.rows.toLocaleString() }}</a-descriptions-item>
              </a-descriptions>
              <a-button type="primary" style="margin-top: 12px" @click="enterFromUpload">
                <template #icon><icon-save /></template>
                使用此文件进入下一步
              </a-button>
            </div>
          </div>

          <div v-if="selectedFile" class="selected-tip">
            已选择：<span class="selected-name">{{ selectedFile.name }}</span>
            <a-tag size="small" color="arcoblue">{{ selectedFile.channel }}</a-tag>
            <a-tag size="small">{{ selectedFile.rows.toLocaleString() }} 行</a-tag>
          </div>
        </div>

        <!-- 步骤2：匹配外数任务 + 字段映射 -->
        <div v-show="currentStep === 1">
          <a-divider orientation="left" style="margin-top: 0">匹配外数任务</a-divider>
          <div v-if="selectedFile" class="match-file-head">
            <span class="match-file-name">{{ selectedFile.name }}</span>
            <a-tag size="small" color="arcoblue">{{ selectedFile.channel }}</a-tag>
            <a-tag size="small">{{ selectedFile.rows.toLocaleString() }} 行</a-tag>
          </div>

          <a-collapse :default-active-key="[]" class="preview-collapse">
            <a-collapse-item header="人工预览文件内容（非标准出参样例）" key="preview">
              <a-table :data="previewRows" :pagination="false" size="small" row-key="rowNo">
                <template #columns>
                  <a-table-column title="行号" data-index="rowNo" :width="70" />
                  <a-table-column title="q_id" data-index="q_id" />
                  <a-table-column title="id_md5" ellipsis tooltip>
                    <template #cell="{ record }">
                      <span style="font-family: monospace">{{ idMd5Display(record.id_md5) }}</span>
                      <a-tag v-if="idMd5ConvertedMap[record.id_md5]" color="green" size="small">已转换MD5</a-tag>
                    </template>
                  </a-table-column>
                  <a-table-column title="review_data" data-index="review_data" />
                  <a-table-column title="loan_cnt_12m" data-index="loan_cnt_12m" />
                  <a-table-column title="max_overdue_amt" data-index="max_overdue_amt" />
                </template>
              </a-table>
              <div class="table-tip">厂商返回文件名可能被修改，请人工核对数据量后关联对应的原外发任务。</div>
            </a-collapse-item>
          </a-collapse>

          <a-form layout="vertical">
            <a-form-item label="关联原外发任务（支持多对多，可选）">
              <a-select v-model="matchedTaskIds" multiple allow-search placeholder="可选择关联一个或多个原外发任务，也可跳过">
                <a-option v-for="t in outboundTasks" :key="t.id" :value="t.id">
                  {{ t.id }} · {{ t.product }}（{{ t.sampleCount.toLocaleString() }} 条）
                </a-option>
              </a-select>
            </a-form-item>
          </a-form>

          <a-divider orientation="left">字段映射</a-divider>
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
              <a-space style="margin-top: 30px">
                <a-button type="outline" :disabled="!fieldMappings.length || isCustomProduct" @click="autoCollision">
                  <template #icon><icon-find-replace /></template>
                  执行自动字段碰撞
                </a-button>
                <a-button type="outline" :disabled="!fieldMappings.length || isCustomProduct" @click="applyMappingFile">
                  <template #icon><icon-upload /></template>
                  上传映射表批量匹配
                </a-button>
                <a-tag color="gray">{{ isCustomProduct ? '未收录产品：字段以输入框人工命名落库' : '外数出参字段 → 标准库字段（字段顺序无关）' }}</a-tag>
              </a-space>
            </a-col>
          </a-row>

          <a-alert v-if="fieldMappings.length" :type="requiredTwoPassed ? 'success' : 'warning'" style="margin-bottom: 12px">
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
                  @change="onRequiredSourceChange(r.std)"
                >
                  <a-option v-for="f in catalogSourceFields" :key="f" :value="f">{{ f }}（{{ sourceFieldComment(f) }}）</a-option>
                </a-select>
                <div class="table-tip" style="margin-top: 2px">等同判定：{{ r.rule }}；选中字段说明：{{ sourceFieldComment(r.sel) }}</div>
                <!-- id_md5 解析转换：源 SM3/SHA256 密文统一转换为 MD5 后落库 -->
                <template v-if="r.std === 'id_md5'">
                  <div class="idmd5-convert-row">
                    <a-select v-model="idMd5SourceAlgo" size="small" style="width: 210px" @change="resetIdMd5Convert">
                      <a-option value="AUTO">源加密算法：自动识别</a-option>
                      <a-option value="MD5">MD5（32 位·无需转换）</a-option>
                      <a-option value="SHA256">SHA256（64 位）</a-option>
                      <a-option value="SM3">SM3（64 位·国密）</a-option>
                    </a-select>
                    <a-button
                      v-if="idMd5NeedConvert"
                      type="outline"
                      size="small"
                      :disabled="idMd5ConvertDone"
                      @click="runIdMd5Convert"
                    >
                      <template #icon><icon-refresh /></template>
                      {{ idMd5ConvertDone ? '已解析转换为 MD5' : '解析转换为 MD5' }}
                    </a-button>
                    <a-tag v-if="idMd5ConvertDone" color="green" size="small">已转换 {{ Object.keys(idMd5ConvertedMap).length }} 行 → MD5（32 位）</a-tag>
                    <a-tag v-else-if="idMd5NeedConvert" color="orange" size="small">待转换 {{ idMd5NeedConvertPendingRows.length }} 行</a-tag>
                  </div>
                  <div class="table-tip" style="margin-top: 4px">{{ idMd5DetectText }}</div>
                  <div v-if="idMd5ConvertDone" class="table-tip" style="margin-top: 2px">
                    转换样例：{{ previewRows[0]?.id_md5.slice(0, 12) }}… → {{ idMd5ConvertedMap[previewRows[0]?.id_md5]?.slice(0, 12) }}…
                    （哈希不可逆，实际由加密平台按密文映射/原文重加密转换）
                  </div>
                </template>
              </div>
            </a-space>
            <div class="table-tip">id_md5（加密MD5字段）与 review_date（回溯日期）为固定标准字段，需从文件出参中选到含义等同的字段（默认 id_md5 / review_data，源密文为 SM3/SHA256 时还须先解析转换为 MD5），未满足时无法进入下一步；其余字段照旧在下方列表中碰撞/映射。</div>
          </a-alert>

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
              <a-table-column title="外数出参字段" data-index="sourceField" :width="220" ellipsis tooltip />
              <a-table-column title="字段说明" data-index="comment" :width="200" ellipsis tooltip />
              <a-table-column title="标准库字段" :width="260">
                <template #cell="{ record }">
                  <a-input
                    v-if="isCustomProduct"
                    :model-value="record.targetField"
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
              <a-table-column title="匹配方式" :width="130">
                <template #cell="{ record }">
                  <a-tag v-if="record.targetField === NON_STD_FIELD" color="gray" size="small">非标准化</a-tag>
                  <a-tag v-else-if="record.matchedBy === 'auto'" color="green" size="small">已匹配</a-tag>
                  <a-tag v-else-if="record.matchedBy === 'file'" color="blue" size="small">映射表批量</a-tag>
                  <a-tag v-else-if="record.matchedBy === 'manual'" color="orange" size="small">人工修正</a-tag>
                  <a-tag v-else color="red" size="small">待匹配</a-tag>
                </template>
              </a-table-column>
            </template>
          </a-table>
          <div v-if="fieldMappings.length" class="table-tip">
            映射列表已映射 {{ mappedCount }} / {{ fieldMappings.length }} 项（另有 id_md5 / review_date 两项标准字段在上方独立区选定文件中等同的出参字段；其中非标准化透传 {{ nonStdCount }} 项）。可先自动碰撞，再上传映射表批量补齐，最后人工修正剩余字段；匹配后「待匹配」字段自动排在最前，便于逐页处理。
          </div>
        </div>

        <!-- 步骤3：校验环节（先落临时库 → 再一致性对比） -->
        <div v-show="currentStep === 2">
          <a-divider orientation="left" style="margin-top: 0">3.1 落临时库</a-divider>
          <a-space style="margin-bottom: 12px">
            <a-button type="primary" :loading="persisting" @click="persistToTemp">
              <template #icon><icon-save /></template>
              直接落临时库
            </a-button>
            <span v-if="persisting" class="persist-progress">{{ persistPercent }}%</span>
          </a-space>

          <a-table v-if="persistBatches.length" :data="persistBatches" :pagination="false" row-key="backid" size="small">
            <template #columns>
              <a-table-column title="backid 批次标识" data-index="backid" :width="180" />
              <a-table-column title="来源文件" data-index="fileName" ellipsis tooltip />
              <a-table-column title="关联外发任务" data-index="taskIds">
                <template #cell="{ record }">
                  <a-space wrap>
                    <a-tag v-for="tid in record.taskIds" :key="tid" size="small" color="arcoblue">{{ tid }}</a-tag>
                  </a-space>
                </template>
              </a-table-column>
              <a-table-column title="落库行数" :width="110">
                <template #cell="{ record }">{{ record.rows.toLocaleString() }}</template>
              </a-table-column>
              <a-table-column title="临时库表" data-index="tempTable" :width="200" />
            </template>
          </a-table>
          <div class="table-tip">先将回溯数据全量落临时库并生成 backid 批次标识，不需要的数据可自行下载处理，避免落错后删数据；落库后即可对临时库数据做一致性校验。</div>

          <a-divider orientation="left">3.2 一致性校验</a-divider>
          <a-alert v-if="!persistBatches.length" type="warning" style="margin-bottom: 12px">请先「落临时库」生成 backid 批次，再执行一致性校验。</a-alert>
          <a-space align="end" :wrap="false" style="margin-bottom: 12px">
            <a-form-item label="一致性校验目标表" style="margin-bottom: 0">
              <a-select
                v-model="consistencyTargetTable"
                :loading="loadingTargetTables"
                allow-search
                allow-create
                :disabled="!persistBatches.length"
                placeholder="选择用于对比的线上样本表"
                style="width: 300px"
                @visible-change="onTargetTableVisible"
                @change="onTargetTableChange"
              >
                <a-option v-for="t in consistencyTargetTableOptions" :key="t" :value="t">{{ t }}</a-option>
              </a-select>
            </a-form-item>
            <a-button type="primary" :loading="validating" :disabled="!persistBatches.length" @click="runConsistencyCheck">
              <template #icon><icon-safe /></template>
              执行抽样一致性对比
            </a-button>
            <template v-if="consistencyDone">
              <a-statistic title="一致率" :value="consistencyRate" :precision="2" suffix="%" show-group-separator />
              <a-tag :color="checkPassed ? 'green' : 'orange'">
                {{ checkPassed ? '校验通过（≥98%），可落标准库' : '低于阈值：异常已标记，仅提示不阻断，仍可继续落标准库' }}
              </a-tag>
            </template>
          </a-space>
          <div class="table-tip" style="margin-bottom: 12px">
            以临时库批次中已映射的标准字段，与所选目标表 <b>{{ consistencyTargetTable || '（未选择）' }}</b> 的线上样本做 SQL 值相等判断（true / false）；未上线产品无对比数据直接通过。一致性校验仅作提示、<b>不强制阻断</b>：即使低于阈值或未执行，仍可继续落 Hive 标准库，异常随数据标记后通知需求方人工核查。
          </div>

          <a-table v-if="consistencyResults.length" :data="consistencyResults" :pagination="false" row-key="sampleId" size="small">
            <template #columns>
              <a-table-column title="抽样ID" data-index="sampleId" :width="160" />
              <a-table-column title="对比字段" data-index="field" :width="200" />
              <a-table-column title="线上值" data-index="onlineValue" />
              <a-table-column title="回溯值" data-index="retroValue" />
              <a-table-column title="结果" :width="100">
                <template #cell="{ record }">
                  <a-tag :color="record.consistent ? 'green' : 'red'">{{ record.consistent ? 'true' : 'false' }}</a-tag>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </div>

        <!-- 步骤4：落 Hive 标准库 -->
        <div v-show="currentStep === 3">
          <a-descriptions :column="1" bordered style="margin-bottom: 16px">
            <a-descriptions-item label="源表">
              <a-space wrap :size="4">
                <template v-if="sourceTables.length">
                  <a-tag v-for="t in sourceTables" :key="t" size="small" color="orangered">{{ t }}</a-tag>
                  <span class="table-tip">（临时库批次表，共 {{ persistBatches.length }} 个）</span>
                </template>
                <span v-else class="table-tip">上一步未落临时库，暂无源表</span>
              </a-space>
            </a-descriptions-item>
            <a-descriptions-item label="目标表">
              <a-select v-model="hiveTable" style="width: 320px" allow-search allow-create placeholder="选择已有表名，或输入命名新表">
                <a-option v-for="t in hiveTableOptions" :key="t" :value="t">{{ t }}</a-option>
              </a-select>
              <div class="table-tip">
                征信机构 {{ taskConfig.channel }} · 外数产品 {{ mappingProduct }}
                <template v-if="currentProduct?.interfaceId">（接口号 {{ currentProduct.interfaceId }}）</template>
                <template v-else-if="isCustomProduct">（未收录，人工命名落库）</template>
              </div>
            </a-descriptions-item>
            <a-descriptions-item label="写入条数">
              <span class="std-write-count">{{ totalWriteRows.toLocaleString() }}</span> 条
              <div class="table-tip">
                来源文件 {{ selectedFile?.name || '—' }} · 回溯返回 {{ (selectedFile?.rows || 0).toLocaleString() }} 行
                · 一致性校验{{ checkPassed ? `已通过（一致率 ${consistencyRate.toFixed(2)}%）` : '未通过 / 未执行（不阻断，异常随数据落库）' }}
              </div>
            </a-descriptions-item>
            <a-descriptions-item label="字段匹配情况">
              <a-space wrap :size="4">
                <a-tag size="small" color="green">标准字段落表列 {{ mappedCount - nonStdCount + requiredPassedCount }}</a-tag>
                <a-tag size="small" color="orange">非标 JSON 透传 {{ nonStdCount }}</a-tag>
                <a-tag size="small" color="gray">映射总数 {{ mappedCount + requiredPassedCount }} / {{ fieldMappings.length + REQUIRED_FIELD_MATCH.length }}（含必选独立区 {{ requiredPassedCount }} / {{ REQUIRED_FIELD_MATCH.length }}）</a-tag>
                <a-tag v-if="idMd5ConvertDone" size="small" color="cyan">id_md5 已由 {{ idMd5SourceAlgo === 'AUTO' ? 'SM3/SHA256' : idMd5SourceAlgo }} 解析转换为 MD5（{{ Object.keys(idMd5ConvertedMap).length }} 行/样例）</a-tag>
              </a-space>
              <div class="table-tip">非标准化字段统一序列化写入 extra_param 列（key 为外数出参字段名）；id_md5 / review_date 两项标准字段以独立区选定的文件等同出参字段随标准列落库<template v-if="idMd5ConvertDone">，id_md5 以转换后的 32 位 MD5 值写入</template></div>
            </a-descriptions-item>
            <a-descriptions-item label="分区字段">
              <a-space wrap :size="4">
                <a-tag size="small" color="arcoblue">dt（回溯日期）</a-tag>
                <a-tag v-for="p in partitionPreview" :key="p" size="small" color="purple">{{ p }}</a-tag>
              </a-space>
              <div class="table-tip">按回溯日期按天分区（dt=yyyy-MM-dd），大表按月拆分存储</div>
            </a-descriptions-item>
          </a-descriptions>

          <a-result v-if="hiveWritten" status="success" title="已落库 Hive 标准库，通知已发送" class="hive-result">
            <template #subtitle>
              数据已写入 {{ hiveTable }}（分区：{{ hiveWrittenPartitions.join('、') }}）<template v-if="nonStdCount">，{{ nonStdCount }} 个非标字段已以 JSON 写入 extra_param 列</template>，已通过公共平台通知需求方
              在指定 Hive 表中取数；如需分析，后续手动同步 Doris 并开通权限。
            </template>
            <template #extra>
              <a-button type="primary" @click="goBack">返回服务场景</a-button>
              <a-button @click="goServiceList">查看服务列表</a-button>
            </template>
          </a-result>
        </div>
      </div>

      <!-- 统一操作区：落库前 左=上一步，右=取消申请 + 主操作；落库成功后 footer 隐藏，出口只剩结果区 -->
      <div v-if="!hiveWritten" class="step-footer">
        <a-button v-if="currentStep > 0" @click="prevStep">上一步</a-button>
        <span v-else />
        <a-space>
          <a-button @click="goBack">取消申请</a-button>
          <a-button v-if="currentStep < stepsList.length - 1" type="primary" @click="nextStep">下一步</a-button>
          <a-button v-else type="primary" :loading="writing" @click="writeHive">
            <template #icon><icon-save /></template>
            确认落 Hive 标准库并通知需求方
          </a-button>
        </a-space>
      </div>
    </a-card>

    <!-- 解密弹窗 -->
    <a-modal v-model:visible="decryptVisible" title="人工解密" :ok-loading="decrypting" @ok="confirmDecrypt" @cancel="decrypting = false">
      <a-form layout="vertical">
        <a-form-item label="密钥（线下获取后填入）">
          <a-input-password v-model="decryptKey" placeholder="请输入人工线下获取的解密密钥" allow-clear />
        </a-form-item>
        <a-alert type="warning">百行 / 钱塘密钥不固定，钱塘为随机生成；解密失败需通知渠道对接方重新获取密钥。</a-alert>
      </a-form>
    </a-modal>

    <!-- 已处理文件提醒弹窗（展示历史处理记录，确认后可重新写入） -->
    <a-modal v-model:visible="processedModalVisible" title="该文件已处理过" :width="680" @cancel="pendingProcessedFile = null">
      <a-alert type="warning">
        该回溯返回文件此前已完成落库处理。继续操作将对其「重新写入」，并生成新的 backid 批次，请确认是否需要重跑。
      </a-alert>
      <a-table :data="processedRecords" :pagination="false" size="small" row-key="backid" style="margin-top: 12px">
        <template #columns>
          <a-table-column title="处理文件名" data-index="fileName" ellipsis tooltip />
          <a-table-column title="处理时间" data-index="processTime" :width="160" />
          <a-table-column title="操作人" data-index="operator" :width="150" ellipsis tooltip />
          <a-table-column title="backid" data-index="backid" :width="160" />
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

    <!-- 完成弹窗 -->
    <a-modal v-model:visible="successVisible" title="回溯落库完成" :footer="false">
      <a-result status="success" title="全链路完成：已落库并通知">
        <template #subtitle>
          状态流转：任务配置 → 待匹配 → 校验通过 → 已落库 → 完成。Hive 表 {{ hiveTable }}，需求方可取数。
        </template>
        <template #extra>
          <a-button type="primary" @click="goBack">返回服务场景</a-button>
        </template>
      </a-result>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import type { UploadFile } from '@arco-design/web-vue'
import { IconSearch, IconSave, IconUpload, IconSafe, IconFindReplace, IconFolder, IconRefresh } from '@arco-design/web-vue/es/icon'

const router = useRouter()
const currentStep = ref(0)

const stepsList = [
  { title: '任务配置', description: 'SFTP 读取 或 本地导入文件' },
  { title: '任务匹配与字段映射', description: '关联外发任务+字段碰撞' },
  { title: '落临时库 + 校验', description: '先落临时库批次，再一致性对比' },
  { title: '落标准库', description: 'Hive 分区落库+通知' }
]

/* ---------- 步骤1：任务配置 ---------- */
const channelOptions = ['百行', '普道', '钱塘']

const dirOptions = [
  { value: '/sftp/external_retro/baihang/2026-09', channel: '百行' },
  { value: '/sftp/external_retro/pudao/2026-09', channel: '普道' },
  { value: '/sftp/external_retro/qiantang/2026-09', channel: '钱塘' }
]

const taskConfig = reactive({
  channel: '百行',
  dir: ''
})

// mock：各目录下定期拉取到的返回文件
interface RetroFile {
  id: string
  name: string
  channel: string
  size: string
  rows: number
  updateTime: string
  decrypted: boolean
}

const dirFileCatalog: Record<string, RetroFile[]> = {
  '/sftp/external_retro/baihang/2026-09': [
    { id: 'f1', name: 'BH_RETRO_20260928_01.csv.enc', channel: '百行', size: '86.4 MB', rows: 128450, updateTime: '2026-09-29 08:00:12', decrypted: false },
    { id: 'f2', name: 'BH_RETRO_20260922_01.csv', channel: '百行', size: '61.2 MB', rows: 96210, updateTime: '2026-09-23 08:00:09', decrypted: true }
  ],
  '/sftp/external_retro/pudao/2026-09': [
    { id: 'f3', name: 'PD_BACK_0929_2.zip', channel: '普道', size: '45.7 MB', rows: 45320, updateTime: '2026-09-29 12:00:31', decrypted: true }
  ],
  '/sftp/external_retro/qiantang/2026-09': [
    { id: 'f4', name: 'QT_resp_20260930.txt.enc', channel: '钱塘', size: '22.8 MB', rows: 30210, updateTime: '2026-09-30 08:00:05', decrypted: false },
    { id: 'f5', name: 'QT_resp_20260916.txt', channel: '钱塘', size: '19.3 MB', rows: 26880, updateTime: '2026-09-16 08:00:02', decrypted: true }
  ]
}

/* mock：历史处理记录——部分 SFTP 文件此前已完成落库，点击时需弹窗提醒并支持选择重新写入 */
interface ProcessRecord {
  fileName: string
  processTime: string
  operator: string
  backid: string
}

const processedFileRecords: Record<string, ProcessRecord[]> = {
  f2: [
    { fileName: 'BH_RETRO_20260922_01.csv', processTime: '2026-09-24 10:32:05', operator: '王琳（风控数据组）', backid: 'BACK20260924-017' }
  ],
  f3: [
    { fileName: 'PD_BACK_0929_2.zip', processTime: '2026-09-30 09:15:42', operator: '陈昊（模型算法组）', backid: 'BACK20260930-003' },
    { fileName: 'PD_BACK_0929_2.zip', processTime: '2026-10-02 14:20:11', operator: '陈昊（模型算法组）', backid: 'BACK20261002-011' }
  ],
  f5: [
    { fileName: 'QT_resp_20260916.txt', processTime: '2026-09-18 11:05:36', operator: '李思远（贷中管理团队）', backid: 'BACK20260918-006' }
  ]
}

const getProcessRecords = (fileId: string): ProcessRecord[] => processedFileRecords[fileId] || []

const querying = ref(false)
const fileList = ref<RetroFile[]>([])
const selectedFile = ref<RetroFile | null>(null)
const rowClass = (record: RetroFile) => (record.id === selectedFile.value?.id ? 'row-selected' : '')
let queryTimer: ReturnType<typeof setTimeout> | null = null

const queryFiles = () => {
  if (!taskConfig.dir) {
    Message.warning('请先选择文件目录')
    return
  }
  querying.value = true
  selectedFile.value = null
  queryTimer = setTimeout(() => {
    querying.value = false
    fileList.value = (dirFileCatalog[taskConfig.dir] || []).map(f => ({ ...f }))
    if (!fileList.value.length) Message.info('该目录暂无返回文件')
  }, 600)
}

/* 数据来源方式：SFTP 目录读取 或 本地文件导入（两者同时支持，切换选择其一进入下一步） */
const dataSourceMode = ref<'sftp' | 'upload'>('sftp')
const uploadFileList = ref<UploadFile[]>([])
const uploadedFile = ref<RetroFile | null>(null)

// 本地导入：仅在前端登记文件信息（mock，不真正上传），自动视为已解密可直接使用
const onUploadChange = (files: UploadFile[]) => {
  uploadFileList.value = files
  const f = files[files.length - 1]
  if (!f || !f.name) return
  const bytes = f.size ?? Math.round((18 + Math.random() * 60) * 1024 * 1024)
  uploadedFile.value = {
    id: `up_${Date.now()}`,
    name: f.name,
    channel: taskConfig.channel,
    size: `${(bytes / 1024 / 1024).toFixed(1)} MB`,
    rows: Math.max(1, Math.round(bytes / 900)),
    updateTime: new Date().toLocaleString('zh-CN', { hour12: false }),
    decrypted: true
  }
  selectedFile.value = null
}

const onUploadRemove = () => {
  uploadFileList.value = []
  uploadedFile.value = null
}

// 切换数据来源方式时清空已选/已导入文件，避免两种来源串用
const onDataSourceModeChange = () => {
  selectedFile.value = null
  uploadedFile.value = null
  uploadFileList.value = []
  fileList.value = []
}

// 由导入文件进入下一步（复用与 SFTP 选中相同的联动逻辑）
const enterFromUpload = () => {
  if (!uploadedFile.value) {
    Message.warning('请先导入回溯返回文件')
    return
  }
  selectedFile.value = uploadedFile.value
  const channel = uploadedFile.value.channel
  const product = productOptions.find(p => p.name.includes(channel))
  if (product && mappingProduct.value !== product.name) {
    mappingProduct.value = product.name
    loadProductFields()
  }
  if (channel === '百行') hiveTable.value = 'ods_ext_bh_retro_std'
  else if (channel === '普道') hiveTable.value = 'ods_ext_pd_retro_std'
  else hiveTable.value = 'ods_ext_qt_retro_std'
  Message.success(`已导入文件 ${uploadedFile.value.name}，进入任务匹配`)
  currentStep.value = 1
}

/* 已处理文件弹窗提醒 */
const processedModalVisible = ref(false)
const processedRecords = ref<ProcessRecord[]>([])
let pendingProcessedFile: RetroFile | null = null

// 选中文件并联动默认外数产品与 Hive 表，进入下一步（reWrite=true 表示对已处理文件重新写入）
const proceedWithFile = (record: RetroFile, reWrite = false) => {
  selectedFile.value = record
  const product = productOptions.find(p => p.name.includes(record.channel))
  if (product && mappingProduct.value !== product.name) {
    mappingProduct.value = product.name
    loadProductFields()
  }
  if (record.channel === '百行') hiveTable.value = 'ods_ext_bh_retro_std'
  else if (record.channel === '普道') hiveTable.value = 'ods_ext_pd_retro_std'
  else hiveTable.value = 'ods_ext_qt_retro_std'
  Message.success(
    reWrite
      ? `文件 ${record.name} 已处理过，本次将重新写入并生成新的 backid 批次`
      : `已选择文件 ${record.name}，进入任务匹配`
  )
  currentStep.value = 1
}

// 点击文件行 → 未解密先提示解密；已处理过则弹窗展示处理记录，确认后支持重新写入
const onFileRowClick = (record: RetroFile) => {
  if (!record.decrypted) {
    Message.warning('该文件尚未解密，请先「人工解密」')
    return
  }
  const records = getProcessRecords(record.id)
  if (records.length) {
    pendingProcessedFile = record
    processedRecords.value = records
    processedModalVisible.value = true
    return
  }
  proceedWithFile(record)
}

// 弹窗确认：对该文件重新写入，继续进入任务匹配
const confirmRewrite = () => {
  processedModalVisible.value = false
  if (pendingProcessedFile) {
    proceedWithFile(pendingProcessedFile, true)
    pendingProcessedFile = null
  }
}

/* ---------- 解密 ---------- */
const decryptVisible = ref(false)
const decrypting = ref(false)
const decryptKey = ref('')
let decryptTarget: (typeof fileList)['value'][number] | null = null

const openDecrypt = (record: (typeof fileList)['value'][number]) => {
  decryptTarget = record
  decryptKey.value = ''
  decryptVisible.value = true
}

const confirmDecrypt = () => {
  if (!decryptKey.value.trim()) {
    Message.warning('请输入线下获取的密钥')
    return
  }
  decrypting.value = true
  setTimeout(() => {
    decrypting.value = false
    decryptVisible.value = false
    if (decryptTarget) {
      const row = fileList.value.find(f => f.id === decryptTarget!.id)
      if (row) row.decrypted = true
      Message.success(`文件 ${decryptTarget.name} 解密成功，可点击该行进入任务匹配`)
    }
  }, 800)
}

/* ---------- 步骤2：任务匹配 + 字段映射 ---------- */
const outboundTasks = ref([
  { id: 'OUT20260905', product: '百行-多头借贷汇总 V4', requester: '风控策略组', sendDate: '2026-09-05', sampleCount: 128000 },
  { id: 'OUT20260912', product: '普道-历史逾期明细', requester: '贷中管理团队', sendDate: '2026-09-12', sampleCount: 45000 },
  { id: 'OUT20260918', product: '钱塘-授信评分回溯', requester: '模型算法组', sendDate: '2026-09-18', sampleCount: 46000 }
])

const matchedTaskIds = ref<string[]>([])

// mock：厂商出参 id_md5 实际为 SM3/SHA256 加密的 64 位十六进制密文，落库前需解析转换为 32 位 MD5
const previewRows = ref([
  { rowNo: 1, q_id: 'Q88f2c...', id_md5: 'b1e4f2c9a7d3805c6f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f70', review_data: '2026-09-06', loan_cnt_12m: 7, max_overdue_amt: 12400.0 },
  { rowNo: 2, q_id: 'Q91ab7...', id_md5: 'd3a9c1e7f5b2048a6c9d1e2f3a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d', review_data: '2026-09-07', loan_cnt_12m: 2, max_overdue_amt: 0.0 },
  { rowNo: 3, q_id: 'Qa04f9...', id_md5: '7c2f5a9d1e3b6c8f0a2d4e6f8b1c3d5a79e2c4f6a8b0d1e3f5a7c9b2d4e6f8a1', review_data: '2026-09-07', loan_cnt_12m: 15, max_overdue_amt: 45800.5 }
])

const mappingProduct = ref('百行-多头借贷汇总 V4')
// 未收录产品：平台外数产品清单之外的回溯数据，需人工命名表名并手工指定落库字段
const CUSTOM_PRODUCT = '未收录外数产品'
const productOptions = [
  { name: '百行-多头借贷汇总 V4', interfaceId: 'BH1023' },
  { name: '普道-历史逾期明细', interfaceId: 'PD2048' },
  { name: '钱塘-授信评分回溯', interfaceId: 'QT3015' },
  { name: CUSTOM_PRODUCT, interfaceId: '' }
]
const isCustomProduct = computed(() => mappingProduct.value === CUSTOM_PRODUCT)
const currentProduct = computed(() => productOptions.find(p => p.name === mappingProduct.value))

interface FieldMapping {
  sourceField: string
  comment: string
  targetField: string
  matchedBy: 'auto' | 'file' | 'manual' | ''
}

// 外数出参字段 → 标准库字段的自动碰撞字典（mock）
const collisionDict: Record<string, string> = {
  loan_cnt_1m: 'std_loan_cnt_1m',
  loan_cnt_3m: 'std_loan_cnt_3m',
  loan_cnt_12m: 'std_loan_cnt_12m',
  max_overdue_amt: 'std_overdue_amt_max',
  overdue_cnt_24m: 'std_overdue_cnt_24m',
  credit_score: 'std_credit_score'
}

const sourceFieldCatalog: Record<string, { sourceField: string; comment: string }[]> = {
  '百行-多头借贷汇总 V4': [
    { sourceField: 'id_md5', comment: '主体标识（MD5加密）' },
    { sourceField: 'inst_cnt_1m', comment: '近1月申请机构数' },
    { sourceField: 'loan_cnt_1m', comment: '近1月贷款审批次数' },
    { sourceField: 'loan_cnt_3m', comment: '近3月贷款审批次数' },
    { sourceField: 'loan_cnt_12m', comment: '近12月贷款审批次数' },
    { sourceField: 'max_overdue_amt', comment: '最大逾期金额' },
    { sourceField: 'risk_band', comment: '风险分层档位' },
    { sourceField: 'review_data', comment: '回溯日期' }
  ],
  '普道-历史逾期明细': [
    { sourceField: 'id_md5', comment: '主体标识（MD5加密）' },
    { sourceField: 'overdue_cnt_24m', comment: '近24月逾期次数' },
    { sourceField: 'max_overdue_amt', comment: '最大逾期金额' },
    { sourceField: 'review_data', comment: '回溯日期' }
  ],
  '钱塘-授信评分回溯': [
    { sourceField: 'id_md5', comment: '主体标识（MD5加密）' },
    { sourceField: 'credit_score', comment: '授信评分' },
    { sourceField: 'risk_band', comment: '风险分层档位' },
    { sourceField: 'review_data', comment: '回溯日期' }
  ],
  // 未收录产品：直接以回溯返回文件的出参列为待映射字段
  '未收录外数产品': [
    { sourceField: 'q_id', comment: '查询流水号' },
    { sourceField: 'id_md5', comment: '主体标识（MD5加密）' },
    { sourceField: 'review_data', comment: '回溯日期' },
    { sourceField: 'loan_cnt_12m', comment: '近12月贷款审批次数' },
    { sourceField: 'max_overdue_amt', comment: '最大逾期金额' },
    { sourceField: 'ext_score_v2', comment: '定制评分V2（非标）' },
    { sourceField: 'ext_tag_list', comment: '定制标签集（非标）' }
  ]
}

const stdFieldOptions = [
  'id_md5', 'review_date',
  'std_loan_cnt_1m', 'std_loan_cnt_3m', 'std_loan_cnt_12m', 'std_overdue_amt_max',
  'std_apply_inst_cnt_1m', 'std_overdue_cnt_24m', 'std_credit_score',
  'std_risk_level_code'
]

// 标准库字段下拉中的特殊选项：无对应标准字段时按「非标准化字段」原样透传落库
const NON_STD_FIELD = '__non_standard__'

/* 字段映射必选项（2 项）：标准库字段固定为 id_md5 / review_date，
   下拉从当前文件出参中选择「含义等同」的字段（厂商命名可能不同，默认 id_md5 / review_data） */
const REQUIRED_FIELD_MATCH = [
  {
    std: 'id_md5',
    stdLabel: '加密MD5字段',
    defaultSource: 'id_md5',
    rule: '主体标识密文字段（字段名含 md5 / hash）',
    matcher: (f: string) => /md5|hash/i.test(f)
  },
  {
    std: 'review_date',
    stdLabel: '回溯日期',
    defaultSource: 'review_data',
    rule: '回溯基准日期字段（字段名含 date / time / review_data）',
    matcher: (f: string) => /date|time/i.test(f) || f === 'review_data'
  }
]
// key = 标准字段，value = 选中的文件出参字段
const requiredSourceSelection = reactive<Record<string, string>>({
  id_md5: 'id_md5',
  review_date: 'review_data'
})
// 当前产品文件出参字段清单（含被必选区占用的字段）
const catalogSourceFields = computed(() => (sourceFieldCatalog[mappingProduct.value] || []).map(f => f.sourceField))
const sourceFieldComment = (f: string) =>
  (sourceFieldCatalog[mappingProduct.value] || []).find(x => x.sourceField === f)?.comment || '—'
// 必选区已占用的出参字段：不再进入下方映射列表
const occupiedSourceFields = computed(() => Object.values(requiredSourceSelection).filter(Boolean))
const requiredMappingStatus = computed(() =>
  REQUIRED_FIELD_MATCH.map(r => {
    const sel = requiredSourceSelection[r.std]
    return { ...r, sel, ok: !!sel && catalogSourceFields.value.includes(sel) && r.matcher(sel) }
  })
)
const requiredTwoPassed = computed(() => requiredMappingStatus.value.every(r => r.ok))
const requiredPassedCount = computed(() => requiredMappingStatus.value.filter(r => r.ok).length)
// 切换产品后校验已选字段是否存在，不存在则回退到该产品中首个含义等同字段
const ensureRequiredSelection = () => {
  REQUIRED_FIELD_MATCH.forEach(r => {
    const opts = catalogSourceFields.value
    const cur = requiredSourceSelection[r.std]
    if (!opts.includes(cur)) {
      requiredSourceSelection[r.std] = opts.find(f => r.matcher(f)) || r.defaultSource
      resetIdMd5Convert()
    }
  })
}

/* ---------- id_md5 解析转换（SM3 / SHA256 → MD5） ----------
   哈希不可逆，真实场景由加密平台按「原文重新加密 / 密文映射表」转换；此处 mock 稳定生成 32 位 MD5 */
type IdMd5Algo = 'AUTO' | 'MD5' | 'SHA256' | 'SM3'
const idMd5SourceAlgo = ref<IdMd5Algo>('AUTO')
// 源密文 → 转换后 MD5 的映射（执行解析转换后填充）
const idMd5ConvertedMap = ref<Record<string, string>>({})

// mock：按源密文稳定生成 32 位十六进制 MD5（同一密文多次转换结果一致）
const mockMd5FromCipher = (src: string): string => {
  let seed = 5381
  for (let i = 0; i < src.length; i++) seed = ((seed << 5) + seed + src.charCodeAt(i)) >>> 0
  let out = ''
  for (let i = 0; i < 32; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0
    out += '0123456789abcdef'[(seed >>> (i % 16)) % 16]
  }
  return out
}

// 按预览文件 id_md5 实际长度自动识别源算法
const idMd5LenSet = computed(() => new Set(previewRows.value.map(r => r.id_md5.length)))
const idMd5AutoAlgo = computed(() => {
  const lens = idMd5LenSet.value
  if (lens.size === 1 && lens.has(32)) return 'MD5'
  if (lens.size === 1 && lens.has(64)) return 'SHA256/SM3'
  return 'MIXED'
})
// 生效算法：手动指定优先，AUTO 时取识别结果
const idMd5EffectiveAlgo = computed(() =>
  idMd5SourceAlgo.value !== 'AUTO' ? idMd5SourceAlgo.value : idMd5AutoAlgo.value
)
const idMd5NeedConvert = computed(() => idMd5EffectiveAlgo.value !== 'MD5')
const idMd5ConvertExecuted = ref(false)
const idMd5NeedConvertPendingRows = computed(() => previewRows.value.filter(r => r.id_md5.length !== 32 && !idMd5ConvertedMap.value[r.id_md5]))
const idMd5ConvertDone = computed(() => idMd5ConvertExecuted.value && idMd5NeedConvertPendingRows.value.length === 0)
const idMd5DetectText = computed(() => {
  if (idMd5SourceAlgo.value !== 'AUTO') return `已指定源算法：${idMd5SourceAlgo.value}`
  if (idMd5AutoAlgo.value === 'MD5') return '自动识别：32 位十六进制 → MD5，无需转换'
  if (idMd5AutoAlgo.value === 'SHA256/SM3') return '自动识别：64 位十六进制 → SHA256 或 SM3（长度无法区分，请与数据源确认）'
  return '自动识别：密文长度混杂（32/64 位并存），请人工确认源算法'
})

const resetIdMd5Convert = () => {
  idMd5ConvertedMap.value = {}
  idMd5ConvertExecuted.value = false
}

const runIdMd5Convert = () => {
  const map: Record<string, string> = {}
  previewRows.value.forEach(r => {
    if (r.id_md5.length !== 32) map[r.id_md5] = mockMd5FromCipher(r.id_md5)
  })
  idMd5ConvertedMap.value = map
  idMd5ConvertExecuted.value = true
  const n = Object.keys(map).length
  if (n) Message.success(`已解析转换 ${n} 行 SM3/SHA256 密文为 MD5（32 位），落库时替换写入 id_md5 列`)
  else Message.info('源密文均已是 32 位 MD5，无需转换')
}

// 预览展示值：已转换的显示 MD5，否则显示源密文
const idMd5Display = (raw: string) => idMd5ConvertedMap.value[raw] || raw

const fieldMappings = ref<FieldMapping[]>([])

// 字段量大的产品（上千匹配项）自动补齐 mock 特征字段，演示分页 + 待映射置顶场景
const bulkFieldCount: Record<string, number> = {
  '百行-多头借贷汇总 V4': 1193,
  '普道-历史逾期明细': 256,
  '钱塘-授信评分回溯': 0
}

// 生成特征字段说明的 mock 类别池
const featCommentPool = ['多头申请次数', '放款金额汇总', '逾期发生次数', '授信额度使用率', '查询机构数']

const loadProductFields = () => {
  // 必选区已占用的出参字段不进入表格，其余字段照旧碰撞/映射
  const base = (sourceFieldCatalog[mappingProduct.value] || [])
    .filter(f => !occupiedSourceFields.value.includes(f.sourceField))
    .map(f => ({
      sourceField: f.sourceField,
      comment: f.comment,
      targetField: '',
      matchedBy: '' as FieldMapping['matchedBy']
    }))
  const extra = bulkFieldCount[mappingProduct.value] || 0
  for (let i = 1; i <= extra; i++) {
    const code = String(base.length + i).padStart(4, '0')
    base.push({
      sourceField: `feat_${code}`,
      comment: `${featCommentPool[i % featCommentPool.length]}（近${((i % 4) + 1) * 3}月·窗口${Math.floor(i / 400) + 1}）`,
      targetField: '',
      matchedBy: ''
    })
  }
  fieldMappings.value = base
  if (mappingProduct.value === CUSTOM_PRODUCT) {
    // 未收录产品：落库字段默认取左侧出参字段名，输入框可改
    base.forEach(m => {
      m.targetField = m.sourceField
      m.matchedBy = 'manual'
    })
  } else {
    // mock 预置：按碰撞字典预匹配一部分字段，初始即呈现「已匹配 / 待匹配置顶 + 分页」状态
    base.forEach(m => {
      const t = collisionDict[m.sourceField] || featCollision(m.sourceField)
      if (t) {
        m.targetField = t
        m.matchedBy = 'auto'
      }
    })
  }
  sortMappingsPendingFirst()
  mappingPagination.current = 1
  mappingPagination.total = base.length
}

// 切换外数产品：未收录产品需人工命名落库表；先校正必选区已选字段再刷新映射列表
const onMappingProductChange = () => {
  ensureRequiredSelection()
  loadProductFields()
  if (mappingProduct.value === CUSTOM_PRODUCT) hiveTable.value = ''
}

// 必选区改选等同字段：重置转换并按新占用关系刷新映射列表
const onRequiredSourceChange = (std: string) => {
  if (std === 'id_md5') resetIdMd5Convert()
  loadProductFields()
}

// 匹配方式标签统一展示为「已匹配」，排序时待映射字段置顶，便于逐页处理剩余项
const sortMappingsPendingFirst = () => {
  fieldMappings.value.sort((a, b) => Number(!!a.targetField) - Number(!!b.targetField))
}

// feat_ 类字段的部分自动碰撞规则（mock）：编号能被 5 整除视为可命中标准库
const featCollision = (sourceField: string): string => {
  const m = /^feat_(\d+)$/.exec(sourceField)
  if (!m) return ''
  const num = Number(m[1])
  return num % 5 === 0 ? `std_feat_${m[1]}` : ''
}

const autoCollision = () => {
  let hit = 0
  fieldMappings.value.forEach(m => {
    const target = collisionDict[m.sourceField] || featCollision(m.sourceField)
    if (target) {
      m.targetField = target
      m.matchedBy = 'auto'
      hit++
    } else {
      m.targetField = ''
      m.matchedBy = ''
    }
  })
  sortMappingsPendingFirst()
  mappingPagination.current = 1
  Message.success(`自动字段碰撞完成：已匹配 ${hit} / ${fieldMappings.value.length}，待匹配字段已置顶，请逐页人工修正或上传映射表`)
}

const applyMappingFile = () => {
  // 模拟上传自定义映射表（别名表方案）批量匹配剩余字段
  const fileDict: Record<string, string> = {
    inst_cnt_1m: 'std_apply_inst_cnt_1m',
    risk_band: 'std_risk_level_code'
  }
  let filled = 0
  fieldMappings.value.forEach(m => {
    if (m.targetField) return
    const fm = /^feat_(\d+)$/.exec(m.sourceField)
    const target = fileDict[m.sourceField] || (fm && Number(fm[1]) % 3 === 1 ? `std_feat_${fm[1]}` : '')
    if (target) {
      m.targetField = target
      m.matchedBy = 'file'
      filled++
    }
  })
  if (filled) {
    sortMappingsPendingFirst()
    mappingPagination.current = 1
    Message.success(`已按映射表批量匹配 ${filled} 个字段，待匹配字段已置顶`)
  } else {
    Message.info('映射表未命中新的待匹配字段')
  }
}

const mappedCount = computed(() => fieldMappings.value.filter(m => !!m.targetField).length)
const nonStdCount = computed(() => fieldMappings.value.filter(m => m.targetField === NON_STD_FIELD).length)

/* 字段映射分页（上千匹配项场景） */
const mappingPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showTotal: true,
  showJumper: true,
  showPageSize: true,
  pageSizeOptions: [10, 20, 50, 100]
})

const pagedFieldMappings = computed(() => {
  const start = (mappingPagination.current - 1) * mappingPagination.pageSize
  return fieldMappings.value.slice(start, start + mappingPagination.pageSize)
})

const onMappingPageChange = (page: number) => {
  mappingPagination.current = page
}
const onMappingPageSizeChange = (size: number) => {
  mappingPagination.pageSize = size
  mappingPagination.current = 1
}

// 人工修正：仅首次人工改动标记为「人工修正」，不覆盖自动碰撞 / 映射表来源
const setMappingTarget = (record: FieldMapping, value: string) => {
  record.targetField = value || ''
  if (!record.targetField) {
    record.matchedBy = ''
  } else if (record.matchedBy !== 'auto' && record.matchedBy !== 'file') {
    record.matchedBy = 'manual'
  }
}

// 初始加载默认产品的出参字段（含上千匹配项 mock，直接进入步骤 2 即可看到分页效果）
loadProductFields()

/* ---------- 步骤3：一致性校验 + 落临时库 ---------- */
const validating = ref(false)
const consistencyDone = ref(false)
const consistencyResults = ref<{ sampleId: string; field: string; onlineValue: string; retroValue: string; consistent: boolean }[]>([])
let validateTimer: ReturnType<typeof setTimeout> | null = null

/* 一致性校验目标表：可选择的线上样本表，回溯落库的标准字段将与该表做值相等对比 */
const consistencyTargetTable = ref('')
const loadingTargetTables = ref(false)
const onlineSampleTables = [
  'dwd_credit_query_snapshot',
  'dws_risk_feature_online',
  'ods_ext_retro_online_std',
  'dm_customer_score_daily'
]
// 候选目标表 = 通用线上样本表 + 当前所选 Hive 标准表（未上线产品可无对比表）
const consistencyTargetTableOptions = computed(() => {
  const set = new Set(onlineSampleTables)
  if (hiveTable.value) set.add(hiveTable.value)
  return Array.from(set)
})

// 下拉展开时模拟拉取可选目标表
const onTargetTableVisible = (visible: boolean) => {
  if (!visible) return
  loadingTargetTables.value = true
  setTimeout(() => { loadingTargetTables.value = false }, 300)
}

// 切换目标表后之前的一致性结果失效，需重新执行对比
const onTargetTableChange = () => {
  consistencyDone.value = false
  consistencyResults.value = []
}

const consistencyRate = computed(() => {
  if (!consistencyResults.value.length) return 0
  const ok = consistencyResults.value.filter(r => r.consistent).length
  return (ok / consistencyResults.value.length) * 100
})
const checkPassed = computed(() => consistencyDone.value && consistencyRate.value >= 98)

const runConsistencyCheck = () => {
  if (validating.value) return
  if (!persistBatches.value.length) {
    Message.warning('请先「落临时库」生成 backid 批次，再执行一致性校验')
    return
  }
  if (!consistencyTargetTable.value) {
    Message.warning('请先选择一致性校验的目标表')
    return
  }
  validating.value = true
  validateTimer = setTimeout(() => {
    validating.value = false
    consistencyDone.value = true
    consistencyResults.value = [
      { sampleId: 'S20260905000123', field: 'std_loan_cnt_12m', onlineValue: '7', retroValue: '7', consistent: true },
      { sampleId: 'S20260905000241', field: 'std_loan_cnt_12m', onlineValue: '2', retroValue: '2', consistent: true },
      { sampleId: 'S20260905000355', field: 'std_overdue_amt_max', onlineValue: '12400.0', retroValue: '12400.0', consistent: true },
      { sampleId: 'S20260905000488', field: 'std_overdue_amt_max', onlineValue: '8600.0', retroValue: '8600.5', consistent: false },
      { sampleId: 'S20260905000517', field: 'std_credit_score', onlineValue: '632', retroValue: '632', consistent: true },
      { sampleId: 'S20260905000602', field: 'std_risk_level_code', onlineValue: 'B', retroValue: 'B', consistent: true },
      { sampleId: 'S20260905000745', field: 'std_loan_cnt_1m', onlineValue: '1', retroValue: '1', consistent: true },
      { sampleId: 'S20260905000863', field: 'std_loan_cnt_3m', onlineValue: '4', retroValue: '4', consistent: true }
    ]
    Message.info(`已对临时库批次与目标表 ${consistencyTargetTable.value} 完成抽样一致性对比；校验不阻断流程，异常数据已标记，仍可继续落 Hive 标准库并通知需求方核查`)
  }, 1200)
}

const persisting = ref(false)
const persistPercent = ref(0)
const persistBatches = ref<{ backid: string; fileName: string; taskIds: string[]; rows: number; tempTable: string }[]>([])
let persistTimer: ReturnType<typeof setInterval> | null = null

const persistToTemp = () => {
  if (persisting.value || !selectedFile.value) return
  persisting.value = true
  persistPercent.value = 0
  persistTimer = setInterval(() => {
    persistPercent.value = Math.min(persistPercent.value + 20, 100)
    if (persistPercent.value >= 100) {
      if (persistTimer) clearInterval(persistTimer)
      persistTimer = null
      persisting.value = false
      persistBatches.value = [{
        backid: 'BACK20260930001',
        fileName: selectedFile.value!.name,
        taskIds: [...matchedTaskIds.value],
        rows: selectedFile.value!.rows,
        tempTable: 'tmp_ext_retro_raw'
      }]
      Message.success('已全量落临时库，生成 backid 批次 BACK20260930001')
    }
  }, 300)
}

/* ---------- 步骤4：落 Hive 标准库 ---------- */
const hiveTableOptions = ['ods_ext_bh_retro_std', 'ods_ext_pd_retro_std', 'ods_ext_qt_retro_std']
const hiveTable = ref('ods_ext_bh_retro_std')

/* 落库信息五项：源表 / 目标表 / 写入条数 / 字段匹配情况 / 分区字段 */
const sourceTables = computed(() => Array.from(new Set(persistBatches.value.map(b => b.tempTable))))
const totalWriteRows = computed(() => persistBatches.value.reduce((sum, b) => sum + b.rows, 0))
const partitionPreview = computed(() => {
  if (!persistBatches.value.length) return ['dt=—']
  const dates = persistBatches.value.map(b => b.backid.match(/\d{8}/)?.[0] || '20260930')
  return Array.from(new Set(dates)).map(d => `dt=${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`)
})
const writing = ref(false)
const hiveWritten = ref(false)
const hiveWrittenPartitions = ref<string[]>([])
const successVisible = ref(false)

const writeHive = () => {
  if (writing.value) return
  if (!hiveTable.value) {
    Message.warning('请填写目标 Hive 表名（未收录产品需人工命名）')
    return
  }
  writing.value = true
  setTimeout(() => {
    writing.value = false
    hiveWritten.value = true
    hiveWrittenPartitions.value = persistBatches.value.map(b => 'dt=2026-09-30')
    successVisible.value = true
  }, 1500)
}

/* ---------- 状态机展示 ---------- */
const currentStatusText = computed(() => {
  if (hiveWritten.value) return '完成'
  if (currentStep.value === 3) return '已落库'
  if (currentStep.value === 2) return checkPassed.value ? '校验通过' : persistBatches.value.length ? '已落临时库' : '待落临时库'
  if (currentStep.value === 1) return '待匹配'
  return selectedFile.value ? '待匹配' : '等待返回'
})
const statusColor = computed(() => (hiveWritten.value ? 'green' : 'arcoblue'))

/* ---------- 步骤流转 ---------- */
const nextStep = () => {
  if (currentStep.value === 0) {
    if (!selectedFile.value) {
      Message.warning('请查询并点击选择一个已解密的返回文件')
      return
    }
  } else if (currentStep.value === 1) {
    if (!fieldMappings.value.length) {
      Message.warning('请选择外数产品并完成字段映射')
      return
    }
    /* 必选项校验：标准字段 id_md5 / review_date 需在下拉中选到文件中等同的出参字段，否则阻断 */
    if (!requiredTwoPassed.value) {
      const miss = requiredMappingStatus.value.filter(r => !r.ok)
      Message.warning(`必选映射未完成：${miss.map(m => `${m.std}（${m.stdLabel}）未选到等同出参字段，判定：${m.rule}`).join('；')}`)
      return
    }
    /* id_md5 解析转换校验：源密文为 SM3/SHA256 时必须先转换为 MD5 再进入下一步 */
    if (idMd5NeedConvert.value && !idMd5ConvertDone.value) {
      Message.warning(`id_md5 源密文（${idMd5EffectiveAlgo.value}）有 ${idMd5NeedConvertPendingRows.value.length} 行尚未解析转换为 MD5，请先在必选字段映射区执行「解析转换为 MD5」`)
      return
    }
    const unmapped = fieldMappings.value.filter(m => !m.targetField)
    if (unmapped.length) {
      const preview = unmapped.slice(0, 10).map(m => m.sourceField).join('、')
      Message.warning(`还有 ${unmapped.length} 个字段未匹配：${preview}${unmapped.length > 10 ? ' 等' : ''}`)
      return
    }
  } else if (currentStep.value === 2) {
    if (!persistBatches.value.length) {
      Message.warning('请先「直接落临时库」生成 backid 批次')
      return
    }
    if (!checkPassed.value) {
      Message.warning('一致性校验未通过或未执行：异常已随数据落库，不阻断流程，请通知需求方人工核查')
    }
  }
  currentStep.value = Math.min(currentStep.value + 1, stepsList.length - 1)
}

const prevStep = () => {
  if (hiveWritten.value) {
    hiveWritten.value = false
    return
  }
  currentStep.value = Math.max(currentStep.value - 1, 0)
}

/* ---------- 导航 ---------- */
const goBack = () => {
  router.push({ name: 'RiskExternalDataServiceScene' })
}
const goServiceList = () => {
  successVisible.value = false
  router.push({ name: 'RiskExternalDataService' })
}

onBeforeUnmount(() => {
  if (queryTimer) clearTimeout(queryTimer)
  if (persistTimer) clearInterval(persistTimer)
  if (validateTimer) clearTimeout(validateTimer)
})
</script>

<style scoped>
.backtrack-persist {
  padding: 0 16px;
}

.persist-card {
  margin-top: 20px;
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

.idmd5-convert-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  flex-wrap: wrap;
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

.selected-name {
  font-weight: 600;
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

.preview-collapse {
  margin-bottom: 12px;
}

.persist-progress {
  font-weight: 600;
  color: rgb(var(--arcoblue-6));
}

.hive-result {
  margin-top: 16px;
  padding: 16px;
  background: var(--color-fill-1);
  border-radius: 6px;
}

.clickable-table :deep(.arco-table-tr) {
  cursor: pointer;
}

.clickable-table :deep(.row-selected) {
  background: var(--color-primary-lightest);
}
</style>
