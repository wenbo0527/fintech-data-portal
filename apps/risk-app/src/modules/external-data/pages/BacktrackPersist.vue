<template>
  <div class="backtrack-persist">
    <!-- 流程定位条：对应文档 B1~B5，编号与页面内 x.y 子区块一一对应 -->
    <div class="step-header">
      <div class="step-header-main">
        <span class="step-header-index">{{ currentStep + 1 }} / {{ stepsList.length }}</span>
        <span class="step-header-title">{{ stepsList[currentStep].title }}</span>
        <div class="step-header-dots">
          <span
            v-for="(s, i) in stepsList"
            :key="s.title"
            class="step-header-dot"
            :class="{ 'is-done': i < currentStep, 'is-current': i === currentStep }"
            :title="`${i + 1} ${s.title}`"
          />
        </div>
      </div>
      <!-- 当前步骤的子区块清单 -->
      <div class="step-sections">
        <span class="step-sections-label">当前步骤</span>
        <a-tag v-for="s in stepsList[currentStep].sections" :key="s" size="small" color="arcoblue">{{ s }}</a-tag>
      </div>
    </div>

    <!-- 批次上下文条：从服务任务列表点击 backid 进入时，展示该批次的定位信息 -->
    <a-card v-if="batchContext" class="batch-card" size="small">
      <a-space align="center" wrap>
        <span class="status-label">当前批次</span>
        <a-tag color="arcoblue" size="medium">
          <template #icon><icon-storage /></template>
          {{ batchContext.backid }}
        </a-tag>
        <a-tag color="purple" size="medium">定位环节：{{ batchContext.sectionTitle }}</a-tag>
        <a-tag v-if="batchContext.pendingTask" color="orange" size="medium">
          待处理任务：{{ batchContext.pendingTask.taskType }}（{{ batchContext.pendingTask.status }}）
        </a-tag>
        <a-tag v-else color="green" size="medium">批次任务已全部完成</a-tag>
        <span class="batch-meta">
          {{ batchContext.agencyName }} · {{ batchContext.fileName }} · 关联任务 {{ batchContext.tasks.length }} 条
        </span>
      </a-space>
    </a-card>

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
                <a-col :span="14">
                  <a-form-item label="SFTP 目录路径" required help="R13：选择机构后自动带入，末尾自动补 /">
                    <a-input v-model="sftpDir" placeholder="如 /sftp/external_retro/baihang/download/" allow-clear />
                  </a-form-item>
                </a-col>
                <a-col :span="10">
                  <a-form-item label=" ">
                    <a-space>
                      <a-button :loading="querying" @click="loadRetroTree">
                        <template #icon><icon-refresh /></template>
                        刷新目录
                      </a-button>
                      <a-tag v-if="extractedArchive" color="purple" size="medium">
                        已解压：{{ extractedArchive.name }}
                      </a-tag>
                    </a-space>
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>

            <a-row :gutter="16">
              <!-- 左：SFTP 目录树 -->
              <a-col :span="9">
                <div class="tree-panel">
                  <div class="tree-panel-title">
                    <icon-folder /> 机构返回目录
                  </div>
                  <a-spin :loading="querying" style="width: 100%">
                    <a-tree
                      v-if="retroTree.length"
                      :data="treeData"
                      :expanded-keys="expandedKeys"
                      :selected-keys="selectedTreeNode ? [selectedTreeNode.key] : []"
                      block-node
                      @select="onTreeSelect"
                      @expand="onTreeExpand"
                    >
                      <template #title="node">
                        <icon-folder v-if="node.data.nodeType === 'folder'" />
                        <icon-archive v-else-if="node.data.nodeType === 'archive'" />
                        <icon-file v-else />
                        <span class="tree-node-name">{{ node.title }}</span>
                        <icon-lock
                          v-if="node.data.nodeType === 'archive' && node.data.encrypted"
                          class="tree-node-lock"
                          size="small"
                        />
                        <a-tag
                          v-if="node.data.nodeType === 'archive' && isArchiveExtracted(node.data)"
                          size="small"
                          color="purple"
                          style="margin-left: 4px"
                        >
                          已解压
                        </a-tag>
                      </template>
                    </a-tree>
                    <a-empty v-else description="该机构目录下暂无返回文件" />
                  </a-spin>
                </div>
              </a-col>

              <!-- 右：选中节点详情 -->
              <a-col :span="15">
                <div class="tree-panel">
                  <div class="tree-panel-title">
                    <icon-file /> 选中节点详情
                  </div>
                  <template v-if="selectedTreeNode">
                    <a-descriptions :column="2" size="small" bordered style="margin-bottom: 12px">
                      <a-descriptions-item label="节点类型">
                        <a-tag size="small" :color="nodeTypeColor(selectedTreeNode.nodeType)">
                          {{ nodeTypeLabel(selectedTreeNode.nodeType) }}
                        </a-tag>
                      </a-descriptions-item>
                      <a-descriptions-item label="名称">{{ selectedTreeNode.name }}</a-descriptions-item>
                      <a-descriptions-item label="相对路径">
                        <span class="mono">{{ selectedTreeNode.path }}</span>
                      </a-descriptions-item>
                      <a-descriptions-item label="完整路径">
                        <span class="mono">{{ fullFilePath }}</span>
                      </a-descriptions-item>
                      <a-descriptions-item label="大小">
                        {{ formatFileSize(selectedTreeNode.size || 0) }}
                      </a-descriptions-item>
                      <a-descriptions-item label="更新时间">
                        {{ selectedTreeNode.updateTime || '—' }}
                      </a-descriptions-item>
                      <a-descriptions-item v-if="selectedTreeNode.nodeType === 'csv'" label="数据行数">
                        {{ (selectedTreeNode.rows || 0).toLocaleString() }}
                      </a-descriptions-item>
                      <a-descriptions-item v-if="selectedTreeNode.nodeType === 'csv'" label="字段数">
                        {{ selectedTreeNode.fieldCount || 0 }}
                      </a-descriptions-item>
                      <a-descriptions-item v-if="selectedTreeNode.nodeType === 'csv'" label="编码 / 分隔符">
                        {{ selectedTreeNode.encoding }} / {{ selectedTreeNode.delimiter }}
                      </a-descriptions-item>
                      <a-descriptions-item v-if="selectedTreeNode.nodeType === 'csv'" label="是否加密">
                        <a-tag size="small" :color="selectedTreeNode.encrypted ? 'orange' : 'green'">
                          {{ selectedTreeNode.encrypted ? '已加密' : '未加密' }}
                        </a-tag>
                      </a-descriptions-item>
                    </a-descriptions>

                    <a-button
                      v-if="selectedTreeNode.nodeType === 'csv' && selectedTreeNode.encrypted && selectedFile?.encrypted"
                      type="primary"
                      size="small"
                      style="margin-bottom: 12px"
                      @click="openDecrypt(selectedFile)"
                    >
                      <template #icon><icon-lock /></template>
                      人工解密
                    </a-button>

                    <!-- 压缩包：解密 / 解压 / 包内文件 -->
                    <template v-if="selectedTreeNode.nodeType === 'archive'">
                      <!-- 加密包：需先解密才能解压 -->
                      <a-alert
                        v-if="selectedTreeNode.encrypted && !isArchiveDecrypted(selectedTreeNode)"
                        type="warning"
                        style="margin-bottom: 8px"
                      >
                        该压缩包已加密，请线下获取压缩包密码后解密；解密成功后即可解压查看包内文件。
                        <template #action>
                          <a-button size="small" type="primary" @click="openArchiveDecrypt(selectedTreeNode)">
                            <template #icon><icon-lock /></template>
                            解密压缩包
                          </a-button>
                        </template>
                      </a-alert>

                      <!-- 未解压：提供解压入口 -->
                      <a-alert
                        v-else-if="!isArchiveExtracted(selectedTreeNode)"
                        type="info"
                        style="margin-bottom: 8px"
                      >
                        压缩包尚未解压，解压后包内文件为 R17 允许的 CSV 格式，可在左侧目录树选择拉取。
                        <template #action>
                          <a-button
                            size="small"
                            type="primary"
                            :loading="extractingArchive"
                            @click="extractArchive(selectedTreeNode)"
                          >
                            <template #icon><icon-archive /></template>
                            解压压缩包
                          </a-button>
                        </template>
                      </a-alert>

                      <!-- 已解压：列出包内文件 -->
                      <template v-else>
                        <a-alert type="success" style="margin-bottom: 8px">
                          压缩包已解压，包内文件为 R17 允许的 CSV 格式，请展开左侧目录树选择包内文件拉取。
                        </a-alert>
                        <a-table :data="selectedTreeNode.children || []" :pagination="false" row-key="key" size="small">
                          <template #columns>
                            <a-table-column title="包内文件" data-index="name" />
                            <a-table-column title="大小" :width="110">
                              <template #cell="{ record }">{{ formatFileSize(record.size || 0) }}</template>
                            </a-table-column>
                            <a-table-column title="数据行数" :width="110">
                              <template #cell="{ record }">{{ (record.rows || 0).toLocaleString() }}</template>
                            </a-table-column>
                            <a-table-column title="加密" :width="90">
                              <template #cell="{ record }">
                                <a-tag size="small" :color="record.encrypted ? 'orange' : 'green'">
                                  {{ record.encrypted ? '已加密' : '未加密' }}
                                </a-tag>
                              </template>
                            </a-table-column>
                          </template>
                        </a-table>
                      </template>
                    </template>

                    <!-- 文件夹：仅导航 -->
                    <a-alert v-else-if="selectedTreeNode.nodeType === 'folder'" type="info">
                      文件夹为导航节点，内含 {{ (selectedTreeNode.children || []).length }} 项，请展开选择具体文件或压缩包。
                    </a-alert>
                  </template>
                  <a-empty v-else description="请在左侧目录树中选择文件、压缩包或文件夹" />
                </div>
              </a-col>
            </a-row>

            <div v-if="selectedFile" class="table-tip" style="margin-top: 8px">
              已获取文件：<strong>{{ selectedFile.name }}</strong>（{{ formatFileSize(selectedFile.size) }}，
              {{ selectedFile.rows.toLocaleString() }} 行{{ selectedFile.encrypted ? '，已加密待解密' : '' }}）
            </div>
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

          <!-- 已获取文件摘要（结构识别与前 5 行预览在步骤 2 展示） -->
          <template v-if="activeFile">
            <a-divider orientation="left">1.3 已获取文件</a-divider>
            <a-descriptions :column="4" size="small" bordered>
              <a-descriptions-item label="文件名">{{ activeFile.name }}</a-descriptions-item>
              <a-descriptions-item label="数据行数">{{ activeFile.rows.toLocaleString() }}</a-descriptions-item>
              <a-descriptions-item label="文件大小">{{ formatFileSize(activeFile.size) }}</a-descriptions-item>
              <a-descriptions-item label="加密状态">
                <a-tag size="small" :color="activeFile.encrypted ? 'orange' : 'green'">
                  {{ activeFile.encrypted ? '已加密' : '未加密' }}
                </a-tag>
              </a-descriptions-item>
            </a-descriptions>
            <a-alert v-if="activeFile.encrypted" type="warning" style="margin-top: 8px">
              该文件已加密，请线下获取密钥后在页面输入解密；解密成功后可在下一步查看文件结构与前 5 行预览。
              <template #action>
                <a-button size="small" type="primary" @click="openDecrypt(activeFile)">人工解密</a-button>
              </template>
            </a-alert>
          </template>
        </div>

        <!-- ============ 步骤2：B2 任务匹配与字段映射 ============ -->
        <div v-show="currentStep === 1">
          <!-- R20：文件结构识别 + 前 5 行预览（与字段映射同处一步，便于对照样例数据） -->
          <template v-if="activeFile">
            <a-divider orientation="left" style="margin-top: 0">2.1 文件结构识别与前 5 行预览</a-divider>
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

          <a-divider orientation="left">2.2 匹配前置外发任务（可选）</a-divider>
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

          <a-divider orientation="left">2.3 外数产品选择与字段映射</a-divider>
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

          <!-- R32：强制绑定 IDMD5 + review date + phone_md5 -->
          <a-alert v-if="!isCustomProduct" :type="requiredAllPassed ? 'success' : 'warning'" style="margin-bottom: 12px">
            <template #title>必选字段映射（{{ activeRequiredFieldMatch.length }} 项）：标准字段固定，下拉选择文件中等同的出参字段</template>
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
            <div class="table-tip">
              {{ activeRequiredFieldMatch.map((r) => r.std).join('、') }}
              {{ activeRequiredFieldMatch.length }} 项标准字段必须绑定，否则无法进入下一步。
            </div>
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
            映射列表已映射 {{ mappedCount }} / {{ fieldMappings.length }} 项（其中非标准化 {{ nonStdCount }} 项，另含必选独立区 {{ requiredPassedCount }} / {{ activeRequiredFieldMatch.length }} 项）。
            未匹配字段已排在列表最前方，便于优先处理；映射规则版本 <b>{{ mappingVersion }}</b> 将写入落库记录。
          </div>
        </div>

        <!-- ============ 步骤3：B3 解析落库 ============ -->
        <div v-show="currentStep === 2">
          <a-divider id="sec-3-1" :class="{ 'section-active': batchContext?.sectionKey === 'sec-3-1' }" orientation="left" style="margin-top: 0">3.1 落临时库</a-divider>
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
            先将回溯数据全量落临时库并生成 backid 批次标识，落库记录、验证报告、后台通知三处均通过 backid 关联。
          </div>

          <a-divider id="sec-3-2" :class="{ 'section-active': batchContext?.sectionKey === 'sec-3-2' }" orientation="left">3.2 一致性抽样校验</a-divider>
          <a-space align="end" wrap style="margin-bottom: 12px">
            <div class="inline-field">
              <span class="inline-field-label">回溯日期（review date，R68 关联条件之一）</span>
              <a-tag color="arcoblue" size="medium">{{ reviewDate || '—' }}</a-tag>
              <div class="table-tip">由回溯文件名自动解析，页面无需输入</div>
            </div>
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
            <a-button
              v-if="!consistencyReady"
              status="warning"
              :disabled="!persistBatches.length"
              @click="skipVisible = true"
            >
              <template #icon><icon-forward /></template>
              跳过一致性校验
            </a-button>
            <a-tag v-if="consistencyChecked" color="green" size="medium">校验已完成，可推进 Hive</a-tag>
            <a-tag v-else-if="consistencySkipped" color="orange" size="medium">已跳过校验，可推进 Hive</a-tag>
          </a-space>
          <div class="table-tip" style="margin-bottom: 12px">
            回溯值取自临时库 <span class="mono">tmp_ext_retro_raw</span>，线上值取自所选样本表；关联条件为 SM4 加密身份证号 + review date 双条件，
            其中 review date 由回溯文件名自动解析；抽样规模 50~100 条；结果存临时表后分页展示，不匹配项排在最前；页面不提供导出。
            <strong>未上线产品无线上数据可对比时可跳过校验</strong>，跳过后仍可推进 Hive 标准库，验证报告中标注「未执行」。
          </div>

          <a-alert v-if="consistencySkipped" type="warning" style="margin-bottom: 12px">
            <template #title>已跳过一致性抽样校验：{{ consistencySkipReason }}</template>
            跳过后验证报告中一致性校验结果标注「未执行」。
          </a-alert>

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
              <a-table-column title="回溯值（临时库）" data-index="retroValue" />
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

          <a-divider id="sec-3-3" :class="{ 'section-active': batchContext?.sectionKey === 'sec-3-3' }" orientation="left">3.3 落 Hive 标准库</a-divider>
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
              <a-tag color="arcoblue" size="medium">{{ reviewDate || '—' }}</a-tag>
              <div class="table-tip">
                由回溯文件名自动解析（与 3.2 关联条件同源），写入分区字段 datax，格式转换为 yyyy-MM-dd。
              </div>
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
                  映射总数 {{ mappedCount + requiredPassedCount }} / {{ fieldMappings.length + activeRequiredFieldMatch.length }}
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
            :disabled="!persistBatches.length || !hiveTable || !partitionValue || !consistencyReady"
            @click="writeHive"
          >
            <template #icon><icon-save /></template>
            确认落 Hive 标准库
          </a-button>
          <div v-if="!consistencyReady" class="table-tip" style="margin-top: 8px">
            需先完成 3.2 一致性抽样校验，或在无线上数据可对比时选择跳过，方可推进 Hive 标准库。
          </div>

          <!-- 落库结果：行数验证与通知由后台任务自动执行，落 Hive 后在此展示结果 -->
          <a-divider id="sec-3-4" :class="{ 'section-active': batchContext?.sectionKey === 'sec-3-4' }" orientation="left">3.4 落库结果（后台任务）</a-divider>
          <a-alert type="info" style="margin-bottom: 12px">
            落 Hive 成功后，行数验证与落库通知均由后台任务自动执行，完成后经站内信和数据服务公众号推送，无需手工触发。
            执行进度可在「服务任务列表」中查看。
          </a-alert>

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
              重新执行三重行数验证
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
          <a-empty v-else description="尚未落 Hive，后台行数验证任务未启动" />
          <div class="table-tip">三重行数 = 入库行数 + 源文件行数 + 原样本文件行数，三者一致方为通过；不一致时给出差值并标记异常行。</div>
        </div>
      </div>

      <!-- 操作区：落库主流程终点为「Hive已落库」，落 Hive 成功后即完成；
           行数验证与通知由后台任务自动执行，进度在服务任务列表中跟踪 -->
      <div v-if="!hiveWritten" class="step-footer">
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

    <!-- 压缩包解密弹窗（R19：压缩包密码由机构线下提供） -->
    <a-modal
      v-model:visible="archiveDecryptVisible"
      title="解密压缩包"
      :ok-loading="archiveDecrypting"
      @before-ok="confirmArchiveDecrypt"
      @cancel="archiveDecrypting = false"
    >
      <a-form :model="formModel" layout="vertical">
        <a-form-item label="压缩包密码（线下获取后填入）">
          <a-input-password v-model="archivePassword" placeholder="请输入线下获取的压缩包密码" allow-clear />
        </a-form-item>
        <a-alert type="warning">
          压缩包密码由机构渠道对接方线下提供，密码错误时解压会被阻断；解密成功后自动继续解压并展开包内文件。
        </a-alert>
        <a-alert v-if="archiveDecryptFailed" type="error" style="margin-top: 12px">{{ archiveDecryptFailed }}</a-alert>
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

    <!-- 跳过一致性抽样校验弹窗（未上线产品无线上数据可对比） -->
    <a-modal
      v-model:visible="skipVisible"
      title="跳过一致性校验"
      :ok-loading="skipping"
      @before-ok="confirmSkipConsistency"
      @cancel="skipVisible = false"
    >
      <a-form :model="formModel" layout="vertical">
        <a-form-item label="跳过原因">
          <a-select v-model="skipReason" style="width: 100%">
            <a-option value="未上线产品无线上数据可对比">未上线产品无线上数据可对比</a-option>
            <a-option value="线上样本表暂不可用，暂无法比对">线上样本表暂不可用，暂无法比对</a-option>
            <a-option value="本次回溯范围无需一致性比对">本次回溯范围无需一致性比对</a-option>
          </a-select>
        </a-form-item>
        <a-alert type="warning">
          跳过后不阻断落 Hive 标准库，验证报告与落库通知中一致性校验结果标注「未执行」，跳过后仍可重新执行校验。
        </a-alert>
      </a-form>
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
        <a-descriptions-item label="一致性校验">
          <a-tag v-if="consistencyChecked" size="small" color="green">已执行</a-tag>
          <a-tag v-else-if="consistencySkipped" size="small" color="orange">未执行</a-tag>
          <span v-else class="table-tip">未执行</span>
        </a-descriptions-item>
        <a-descriptions-item label="差异摘要">
          {{ consistencySummary?.diffSummary || (consistencySkipped ? `未执行（已跳过：${consistencySkipReason}）` : '—') }}
        </a-descriptions-item>
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
      <a-result status="success" title="落库完成：已落 Hive 标准库">
        <template #subtitle>
          状态流转：{{ PERSIST_STATUS_FLOW.join(' → ') }}。Hive 表 {{ hiveTable }}，需求方可取数。
          行数验证与落库通知由后台任务自动执行并推送。
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
import { ref, computed, reactive, watch, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import {
  IconSearch, IconSave, IconUpload, IconSafe, IconFindReplace, IconRefresh,
  IconEye, IconFile, IconSend, IconStorage, IconCheckCircle, IconExclamationCircleFill,
  IconFolder, IconArchive, IconLock, IconForward,
} from '@arco-design/web-vue/es/icon'
import { useBacktrackPersist } from '../composables/useBacktrackPersist'
import { fetchAsyncTask } from '../api/backtrack'
import { formatFileSize } from '../mock/retroFiles'
import type { RetroNodeType } from '../mock/retroFiles'
import type { AsyncTask } from '../mock/backtrackPersist'

const router = useRouter()
const route = useRoute()
const currentStep = ref(0)

/** 表单容器模型（Arco Form 要求 model prop，本页表单项不走 field 校验，仅用于布局） */
const formModel = reactive<Record<string, unknown>>({})

/**
 * 步骤定义（对应文档 B1~B4；sections 与页面内 x.y 子区块一一对应）
 * 落库主流程终点为「落 Hive 标准库」，行数验证与通知由后台任务自动完成，
 * 进度统一在服务任务列表中跟踪
 */
const stepsList = [
  {
    title: '选择机构与文件获取',
    sections: ['1.1 选择征信机构', '1.2 SFTP 拉取 / 手动上传', '1.3 已获取文件'],
  },
  {
    title: '预览与字段映射',
    sections: ['2.1 文件结构识别与前 5 行预览', '2.2 匹配前置外发任务', '2.3 外数产品选择与字段映射'],
  },
  {
    title: '解析落库',
    sections: ['3.1 落临时库', '3.2 一致性抽样校验', '3.3 落 Hive 标准库', '3.4 落库结果（后台任务）'],
  },
]

/** 落库流程共享状态与业务逻辑 */
const flow = useBacktrackPersist()

/* ---------- 解构暴露给模板的成员 ---------- */
const {
  currentStatus, setStatus, PERSIST_STATUS_FLOW,
  agencies, selectedAgencyId, selectedAgency, pathCleanupNotice,
  dataSourceMode, sftpDir, retroTree, selectedTreeNode, extractedArchive, expandedKeys, onTreeExpand, fullFilePath, sftpParams,
  extractingArchive, archiveDecryptVisible, archiveDecrypting, archivePassword, archiveDecryptFailed,
  openArchiveDecrypt, confirmArchiveDecrypt, isArchiveDecrypted, isArchiveExtracted, extractArchive,
  querying, selectedFile, uploadFileList, uploadedFile,
  fileStructure, previewRows, previewColumns, activeFile,
  loadAgencies, onAgencyChange, loadRetroTree, onTreeSelect, onFileSelect,
  onUploadChange, onUploadRemove, onDataSourceModeChange,
  decryptVisible, decrypting, decryptKey, decryptFailed, openDecrypt, confirmDecrypt,
  processedModalVisible, processedRecords, confirmRewrite,
  productOptions, mappingProduct, currentProduct, isCustomProduct, stdFieldOptions, fieldMappings,
  REQUIRED_FIELD_MATCH, activeRequiredFieldMatch, requiredSourceSelection, catalogSourceFields, sourceFieldComment,
  requiredMappingStatus, requiredAllPassed, requiredPassedCount,
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
  consistencyChecked, consistencySkipped, consistencySkipReason, consistencyReady,
  consistencyTargetOptions, consistencyTargetTable, consistencyDetails, consistencySummary,
  validating, consistencyPagination, pagedConsistencyDetails, onConsistencyPageChange,
  loadConsistencyTables, runTripleRowCheck, runConsistencyCheck, skipConsistencyCheck, reportVisible, openReport,
  notifyConfig, loadNotifyConfig, notifySent, sendNotify,
  persistRecord, recordVisible, buildPersistRecord, openPersistRecord,
  createdTasks, createPersistTask, finishPersistTask, restoreFromResumeContext, restoreFromBackid,
} = flow

/**
 * 批次上下文（从服务任务列表点击 backid 进入时填充）
 * backid 是落库批次标识，页面据此回填流程状态并定位到该批次所处环节
 */
interface BatchContext {
  /** 批次标识 */
  backid: string
  /** 定位到的环节标题 */
  sectionTitle: string
  /** 定位到的环节锚点 key（用于高亮） */
  sectionKey: string
  /** 征信机构 */
  agencyName: string
  /** 来源文件 */
  fileName: string
  /** 该批次关联的任务 */
  tasks: AsyncTask[]
  /** 待处理任务（批次内最早未成功的任务） */
  pendingTask?: AsyncTask
}

/** 批次上下文（未通过 backid 进入时为空） */
const batchContext = ref<BatchContext | null>(null)

/* ---------- 派生状态 ---------- */
/** 当前 backid（R51） */
const currentBackid = computed(() => persistBatches.value[0]?.backid || '')

/** 写入总行数 */
const totalWriteRows = computed(() => persistBatches.value.reduce((sum, b) => sum + b.rows, 0))

/** 状态标签色 */
const statusColor = computed(() => {
  if (currentStatus.value === 'Hive已落库') return 'green'
  if (currentStatus.value === '临时库已落库') return 'purple'
  return 'arcoblue'
})

/** 当前状态在状态流转中的序号（用于状态条高亮） */
const statusIndex = computed(() => PERSIST_STATUS_FLOW.indexOf(currentStatus.value))

/** 表格行高亮 */
const rowClass = (record: any) => (record.id === selectedFile.value?.id ? 'row-selected' : '')

/* ---------- SFTP 目录树 ---------- */
/** 目录树渲染数据：把业务节点转换为 a-tree 结构 */
const treeData = computed(() => {
  const build = (nodes: RetroTreeNode[]): any[] =>
    nodes.map((n) => ({
      key: n.key,
      title: n.name,
      data: n,
      children: n.children ? build(n.children) : undefined,
    }))
  return build(retroTree.value)
})

/** 节点类型中文名 */
const nodeTypeLabel = (type: RetroNodeType) =>
  ({ folder: '文件夹', csv: 'CSV 文件', archive: '压缩包' })[type] || type

/** 节点类型标签色 */
const nodeTypeColor = (type: RetroNodeType) =>
  ({ folder: 'arcoblue', csv: 'green', archive: 'purple' })[type] || 'gray'

/** 报告生成时间 */
const reportTime = computed(() => new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'))

/* ---------- 落 Hive ---------- */
const writing = ref(false)
const hiveWritten = ref(false)
const successVisible = ref(false)

/* ---------- 跳过一致性校验 ---------- */
/** 跳过一致性校验弹窗可见性 */
const skipVisible = ref(false)
/** 跳过一致性校验提交中 */
const skipping = ref(false)
/** 跳过原因（默认：未上线产品无线上数据可对比） */
const skipReason = ref('未上线产品无线上数据可对比')

/**
 * 确认跳过一致性抽样校验
 * 未上线产品无线上数据可对比时允许跳过，跳过后不阻断落 Hive 标准库，验证报告标注「未执行」
 * @returns 是否跳过成功（用于关闭弹窗）
 */
const confirmSkipConsistency = async (): Promise<boolean> => {
  if (!skipReason.value) {
    Message.warning('请选择跳过原因')
    return false
  }
  skipping.value = true
  try {
    await skipConsistencyCheck(skipReason.value)
    skipVisible.value = false
    return true
  } finally {
    skipping.value = false
  }
}

/** 落 Hive 标准库（R46 两阶段落库的第二阶段；落 Hive 即完成落库主流程） */
const writeHive = async () => {
  if (writing.value) return
  if (!persistBatches.value.length) {
    Message.warning('请先落临时库生成 backid 批次')
    return
  }
  // 落 Hive 标准库前的准入门槛：一致性抽样校验需已完成或已跳过，避免异常数据进入正式库
  if (!consistencyReady.value) {
    Message.warning('请先执行 3.2 抽样一致性对比，或在无对比数据时选择跳过')
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
  // R86：推进 Hive 属写操作类执行动作，创建异步任务后再执行
  const task = await createPersistTask('推进Hive', persistBatches.value[0]?.backid ?? '', true, 2)
  writing.value = true
  await new Promise((r) => setTimeout(r, 1200))
  writing.value = false
  hiveWritten.value = true
  // 落 Hive 即为流程终点；任务置为成功后状态由批次任务推导为「Hive已落库」
  await finishPersistTask(task.taskId, '成功', `已落 Hive 标准库 ${hiveTable.value}，分区 datax=${partitionValue.value}`)
  await buildPersistRecord()
  Message.success(`已落 Hive 标准库 ${hiveTable.value}，分区 datax=${partitionValue.value}`)
  // 行数验证与落库通知交由后台任务自动执行，页面不需手工触发
  await triggerBackgroundTasks()
}

/**
 * 落 Hive 成功后触发后台自动任务：行数验证 + 落库通知
 * 行数验证为只读类任务（R90 允许并发），通知按后台默认渠道推送（R76）
 */
const triggerBackgroundTasks = async () => {
  try {
    await runTripleRowCheck()
  } catch {
    // 行数验证失败不阻断落库主流程，失败原因由任务列表跟踪
  }
  await sendNotify()
}

/** 完成落库流程（落 Hive 成功后即完成） */
const finishAll = async () => {
  if (!hiveWritten.value) {
    Message.warning('请先执行「确认落 Hive 标准库」，落库成功后流程即完成')
    return
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
      Message.warning('请先完成文件解密，解密成功后即可进入下一步查看文件结构与前 5 行预览')
      return
    }
    setStatus('预览已确认')
  } else if (currentStep.value === 1) {
    if (!previewRows.value.length) {
      Message.warning('请先在 2.1 确认文件前 5 行预览')
      return
    }
    if (!fieldMappings.value.length) {
      Message.warning('请选择外数产品并完成字段映射')
      return
    }
    if (!isCustomProduct.value && !requiredAllPassed.value) {
      const miss = requiredMappingStatus.value.filter((r) => !r.ok)
      Message.warning(
        `必须绑定 ${activeRequiredFieldMatch.value.map((m) => m.std).join('、')} ${activeRequiredFieldMatch.value.length} 个必填字段：${miss.map((m) => `${m.std}（${m.stdLabel}）`).join('、')}`
      )
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
    setStatus('前置任务已匹配')
    buildMappingVersion()
  } else if (currentStep.value === 2) {
    if (!persistBatches.value.length) {
      Message.warning('请先「落临时库并生成 backid」')
      return
    }
    // 一致性抽样校验为推进 Hive 标准库前的准入门槛（已执行或已跳过均放行）
    if (!consistencyReady.value) {
      Message.warning('请先执行 3.2 抽样一致性对比，或在无对比数据时选择跳过')
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
  // 从服务任务列表「继续下一步」跳转时，按任务续做上下文回填已完成的环节
  await applyResumeFromRoute()
})

/**
 * 按路由参数回填续做状态
 * 支持两种入口：
 *   1. taskId：从服务任务列表「继续下一步」跳转，回到落库流程对应步骤继续处理
 *   2. backid：从服务任务列表点击 backid 跳转，按批次标识回填并定位到该批次所处环节
 */
const applyResumeFromRoute = async () => {
  const backid = String(route.query.backid ?? '')
  if (backid) {
    await applyBatchFromRoute(backid)
    return
  }
  const taskId = String(route.query.taskId ?? '')
  if (!taskId) return
  const task = await fetchAsyncTask(taskId)
  if (!task?.resumeContext) {
    Message.warning('该任务没有可续做的上下文，请重新发起落库流程')
    return
  }
  const step = await restoreFromResumeContext(task.resumeContext)
  currentStep.value = Math.min(Math.max(step, 0), stepsList.length - 1)
  Message.success(`已回填任务 ${taskId} 的上下文，继续第 ${currentStep.value + 1} 步：${stepsList[currentStep.value].title}`)
}

/**
 * 按 backid 回填批次上下文并滚动定位到对应环节
 * backid 为落库批次标识（一个批次可关联多条任务），批次所处环节由任务状态推导
 * @param backid 批次标识
 */
const applyBatchFromRoute = async (backid: string) => {
  const result = await restoreFromBackid(backid)
  if (!result) {
    Message.warning(`未找到批次 ${backid} 的关联任务`)
    return
  }
  const { stage, tasks } = result
  currentStep.value = Math.min(Math.max(stage.stepIndex, 0), stepsList.length - 1)
  // 待处理任务：批次内最早未成功的任务，即流程卡点
  const pendingTask = tasks
    .filter((t) => t.status !== '成功')
    .reduce<AsyncTask | undefined>((min, t) => (!min || t.createTime < min.createTime ? t : min), undefined)
  batchContext.value = {
    backid,
    sectionTitle: stage.sectionTitle,
    sectionKey: stage.sectionKey,
    agencyName: selectedAgency.value?.agencyName ?? '',
    fileName: activeFile.value?.name ?? tasks[0]?.fileName ?? '',
    tasks,
    pendingTask,
  }
  Message.success(`已定位批次 ${backid}：${stage.sectionTitle}`)
  // 等待步骤区块渲染后滚动定位
  await nextTick()
  const anchor = document.getElementById(stage.sectionKey)
  if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<style scoped>
.backtrack-persist {
  padding: 0 16px;
}

.step-header {
  margin-top: 16px;
  padding: 12px 20px;
  background: var(--color-fill-1);
  border-radius: 6px;
}

/* 批次上下文条 */
.batch-card {
  margin-top: 12px;
}

.batch-meta {
  font-size: 13px;
  color: var(--color-text-3);
}

/* 批次定位环节高亮 */
.section-active :deep(.arco-divider-text) {
  color: rgb(var(--primary-6));
  background: rgb(var(--primary-1));
  font-weight: 600;
}

/* a-divider 的 class 落在内部 text 节点上时也能命中 */
:deep(.arco-divider.section-active .arco-divider-text) {
  color: rgb(var(--primary-6));
  background: rgb(var(--primary-1));
  font-weight: 600;
}

/* 定位条主体：步骤序号 + 步骤名 + 进度点 */
.step-header-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.step-header-index {
  font-size: 13px;
  font-weight: 600;
  color: rgb(var(--primary-6));
}

.step-header-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1);
}

/* 进度点：已完成 / 当前 / 未到达 */
.step-header-dots {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 4px;
}

.step-header-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-fill-3);
}

.step-header-dot.is-done {
  background: rgb(var(--primary-6));
}

.step-header-dot.is-current {
  width: 10px;
  height: 10px;
  background: rgb(var(--primary-6));
  box-shadow: 0 0 0 3px rgba(var(--primary-6), 0.15);
}

/* 当前步骤的子区块清单 */
.step-sections {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.step-sections-label {
  font-size: 13px;
  color: var(--color-text-3);
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

/* ---------- SFTP 目录树面板 ---------- */
.tree-panel {
  border: 1px solid var(--color-border-2);
  border-radius: 4px;
  padding: 12px;
  background: var(--color-fill-1);
  min-height: 260px;
}

.tree-panel-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 10px;
  color: var(--color-text-1);
}

.tree-node-name {
  margin-left: 6px;
}

/* 压缩包加密锁标记 */
.tree-node-lock {
  margin-left: 4px;
  color: var(--orange-6);
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
