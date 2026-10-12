<template>
  <div class="backtrack-persist">
    <a-page-header title="外数回溯落库申请" subtitle="回溯返回非标准数据经任务匹配与字段映射标准化落库 Hive">
      <template #extra>
        <a-space>
          <a-tag v-if="currentStatusText" :color="statusColor" bordered size="large">
            当前状态：{{ currentStatusText }}
          </a-tag>
          <a-button @click="goBack">返回</a-button>
        </a-space>
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
                <a-table-column title="状态" :width="110">
                  <template #cell="{ record }">
                    <a-tag :color="record.decrypted ? 'green' : 'orange'">
                      {{ record.decrypted ? '已解密' : '待解密' }}
                    </a-tag>
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
              百行 / 钱塘密钥不固定（钱塘随机生成），加密文件需人工解密。选择已解密文件行即可进入下一步。
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
                  <a-table-column title="name_hash" data-index="name_hash" />
                  <a-table-column title="query_date" data-index="query_date" />
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
              <a-table-column title="外数出参字段" data-index="sourceField" :width="220" />
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
            已映射 {{ mappedCount }} / {{ fieldMappings.length }} 项（其中非标准化透传 {{ nonStdCount }} 项）。可先自动碰撞，再上传映射表批量补齐，最后人工修正剩余字段；匹配后「待匹配」字段自动排在最前，便于逐页处理。
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
          <a-descriptions :column="2" bordered style="margin-bottom: 16px">
            <a-descriptions-item label="征信机构">{{ taskConfig.channel }}</a-descriptions-item>
            <a-descriptions-item label="来源文件">{{ selectedFile?.name }}</a-descriptions-item>
            <a-descriptions-item label="落库批次">
              <a-space wrap>
                <a-tag v-for="b in persistBatches" :key="b.backid" size="small" color="purple">{{ b.backid }}</a-tag>
              </a-space>
            </a-descriptions-item>
            <a-descriptions-item label="外数产品">
              {{ mappingProduct }}<template v-if="currentProduct?.interfaceId">（接口号 {{ currentProduct.interfaceId }}）</template><template v-else-if="isCustomProduct">（未收录，人工命名落库）</template>
            </a-descriptions-item>
            <a-descriptions-item label="目标 Hive 表">
              <a-select v-model="hiveTable" style="width: 300px" allow-search allow-create placeholder="选择已有表名，或输入命名新表">
                <a-option v-for="t in hiveTableOptions" :key="t" :value="t">{{ t }}</a-option>
              </a-select>
            </a-descriptions-item>
            <a-descriptions-item label="分区规则">按回溯日期按天分区（dt=yyyy-MM-dd），大表按月拆分存储</a-descriptions-item>
            <a-descriptions-item label="映射字段数">{{ mappedCount - nonStdCount }} 个标准字段 + {{ nonStdCount }} 个非标准化透传</a-descriptions-item>
            <a-descriptions-item label="一致性校验">已通过（一致率 {{ consistencyRate.toFixed(2) }}%）</a-descriptions-item>
          </a-descriptions>

          <a-alert v-if="nonStdCount" type="info" style="margin-bottom: 16px">
            {{ nonStdCount }} 个非标准化字段将序列化为 JSON 统一写入标准库 extra_param 列（key 为外数出参字段名），标准字段正常落表字段列。
          </a-alert>

          <a-space>
            <a-button type="primary" :loading="writing" @click="writeHive">确认落 Hive 标准库并通知需求方</a-button>
          </a-space>

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

      <div class="step-footer">
        <a-button v-if="currentStep > 0 && !hiveWritten" @click="prevStep">上一步</a-button>
        <span v-else />
        <a-space>
          <a-button @click="goBack">取消</a-button>
          <a-button v-if="currentStep < stepsList.length - 1" type="primary" @click="nextStep">下一步</a-button>
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
import { IconSearch, IconSave, IconUpload, IconSafe, IconFindReplace, IconFolder } from '@arco-design/web-vue/es/icon'

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

// 点击文件行 → 选中该文件并进入下一步（未解密则先提示解密）
const onFileRowClick = (record: RetroFile) => {
  if (!record.decrypted) {
    Message.warning('该文件尚未解密，请先「人工解密」')
    return
  }
  selectedFile.value = record
  // 联动默认外数产品与 Hive 表
  const product = productOptions.find(p => p.name.includes(record.channel))
  if (product && mappingProduct.value !== product.name) {
    mappingProduct.value = product.name
    loadProductFields()
  }
  if (record.channel === '百行') hiveTable.value = 'ods_ext_bh_retro_std'
  else if (record.channel === '普道') hiveTable.value = 'ods_ext_pd_retro_std'
  else hiveTable.value = 'ods_ext_qt_retro_std'
  Message.success(`已选择文件 ${record.name}，进入任务匹配`)
  currentStep.value = 1
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

const previewRows = ref([
  { rowNo: 1, q_id: 'Q88f2c...', name_hash: '3a91e0...', query_date: '2026-09-06', loan_cnt_12m: 7, max_overdue_amt: 12400.0 },
  { rowNo: 2, q_id: 'Q91ab7...', name_hash: 'c05d22...', query_date: '2026-09-07', loan_cnt_12m: 2, max_overdue_amt: 0.0 },
  { rowNo: 3, q_id: 'Qa04f9...', name_hash: '77be13...', query_date: '2026-09-07', loan_cnt_12m: 15, max_overdue_amt: 45800.5 }
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
  credit_score: 'std_credit_score',
  query_date: 'std_backtrack_date'
}

const sourceFieldCatalog: Record<string, { sourceField: string; comment: string }[]> = {
  '百行-多头借贷汇总 V4': [
    { sourceField: 'inst_cnt_1m', comment: '近1月申请机构数' },
    { sourceField: 'loan_cnt_1m', comment: '近1月贷款审批次数' },
    { sourceField: 'loan_cnt_3m', comment: '近3月贷款审批次数' },
    { sourceField: 'loan_cnt_12m', comment: '近12月贷款审批次数' },
    { sourceField: 'max_overdue_amt', comment: '最大逾期金额' },
    { sourceField: 'risk_band', comment: '风险分层档位' },
    { sourceField: 'query_date', comment: '查询回溯日期' }
  ],
  '普道-历史逾期明细': [
    { sourceField: 'overdue_cnt_24m', comment: '近24月逾期次数' },
    { sourceField: 'max_overdue_amt', comment: '最大逾期金额' },
    { sourceField: 'query_date', comment: '查询回溯日期' }
  ],
  '钱塘-授信评分回溯': [
    { sourceField: 'credit_score', comment: '授信评分' },
    { sourceField: 'risk_band', comment: '风险分层档位' },
    { sourceField: 'query_date', comment: '查询回溯日期' }
  ],
  // 未收录产品：直接以回溯返回文件的出参列为待映射字段
  '未收录外数产品': [
    { sourceField: 'q_id', comment: '查询流水号' },
    { sourceField: 'name_hash', comment: '姓名哈希' },
    { sourceField: 'query_date', comment: '查询回溯日期' },
    { sourceField: 'loan_cnt_12m', comment: '近12月贷款审批次数' },
    { sourceField: 'max_overdue_amt', comment: '最大逾期金额' },
    { sourceField: 'ext_score_v2', comment: '定制评分V2（非标）' },
    { sourceField: 'ext_tag_list', comment: '定制标签集（非标）' }
  ]
}

const stdFieldOptions = [
  'std_loan_cnt_1m', 'std_loan_cnt_3m', 'std_loan_cnt_12m', 'std_overdue_amt_max',
  'std_apply_inst_cnt_1m', 'std_overdue_cnt_24m', 'std_credit_score',
  'std_risk_level_code', 'std_backtrack_date'
]

// 标准库字段下拉中的特殊选项：无对应标准字段时按「非标准化字段」原样透传落库
const NON_STD_FIELD = '__non_standard__'

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
  const base = (sourceFieldCatalog[mappingProduct.value] || []).map(f => ({
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

// 切换外数产品：未收录产品需人工命名落库表
const onMappingProductChange = () => {
  loadProductFields()
  if (mappingProduct.value === CUSTOM_PRODUCT) hiveTable.value = ''
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
