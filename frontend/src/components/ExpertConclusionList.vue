<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useCanBusStore } from '../store/canbus';
import type { ExpertConclusion } from '../types';
import ExpertConclusionForm from './ExpertConclusionForm.vue';

const emit = defineEmits<{
  (e: 'locateFrame', frameId: string): void;
}>();

const store = useCanBusStore();
const showForm = ref(false);
const editingConclusion = ref<ExpertConclusion | null>(null);

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString('zh-CN', { hour12: false });
}

function formatHexId(id: number): string {
  return '0x' + id.toString(16).toUpperCase().padStart(3, '0');
}

function handleEdit(conclusion: ExpertConclusion) {
  editingConclusion.value = conclusion;
  showForm.value = true;
}

async function handleDelete(conclusion: ExpertConclusion) {
  if (confirm(`确定要删除这条结论吗？\n\n${conclusion.diagnosis}`)) {
    try {
      await store.deleteConclusion(conclusion.id);
    } catch (error) {
      alert('删除失败');
    }
  }
}

function handleLocateFrame(frameId: string) {
  if (frameId) {
    emit('locateFrame', frameId);
  }
}

function handleSaved() {
  editingConclusion.value = null;
}

function handleClose() {
  showForm.value = false;
  editingConclusion.value = null;
}

async function handleExport() {
  const csv = await store.exportConclusions();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `expert_conclusions_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

onMounted(() => {
  store.fetchConclusions();
});
</script>

<template>
  <div class="flex flex-col h-full bg-gray-900">
    <div class="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
      <h3 class="text-sm font-semibold text-gray-300">专家结论库</h3>
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-500">
          共 {{ store.filteredConclusions.length }} 条
        </span>
        <button
          @click="handleExport"
          class="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
          :disabled="store.conclusions.length === 0"
        >
          导出
        </button>
        <button
          @click="showForm = true; editingConclusion = null"
          class="px-2 py-1 text-xs bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
        >
          + 新增
        </button>
      </div>
    </div>

    <div class="px-4 py-2 bg-gray-800/50 border-b border-gray-700 flex items-center gap-2">
      <input
        v-model="store.conclusionFilter"
        type="text"
        placeholder="搜索诊断、建议、标签..."
        class="flex-1 px-3 py-1.5 bg-gray-900 border border-gray-600 rounded text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500"
      />
      <label class="flex items-center gap-1.5 cursor-pointer">
        <input
          v-model="store.showAnomalyOnly"
          type="checkbox"
          class="w-4 h-4 rounded border-gray-600 bg-gray-700 text-red-500 focus:ring-red-500"
        />
        <span class="text-xs text-gray-400">仅异常</span>
      </label>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div v-if="store.filteredConclusions.length === 0" class="flex flex-col items-center justify-center h-full text-gray-500">
        <svg class="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="text-sm">暂无专家结论</p>
        <p class="text-xs mt-1">点击"新增"或在帧详情中添加</p>
      </div>

      <div v-else class="divide-y divide-gray-800">
        <div
          v-for="conclusion in store.filteredConclusions"
          :key="conclusion.id"
          class="p-4 hover:bg-gray-800/50 transition-colors"
          :class="conclusion.isAnomaly ? 'border-l-2 border-l-red-500' : 'border-l-2 border-l-green-500'"
        >
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="flex items-center gap-2 flex-wrap">
              <span
                class="px-1.5 py-0.5 rounded text-xs font-medium"
                :class="conclusion.isAnomaly ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'"
              >
                {{ conclusion.anomalyType || (conclusion.isAnomaly ? '异常' : '正常') }}
              </span>
              <button
                v-if="conclusion.frameId"
                @click="handleLocateFrame(conclusion.frameId)"
                class="font-mono text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {{ formatHexId(conclusion.arbitrationId) }}
              </button>
              <span v-else class="font-mono text-xs text-cyan-400">
                {{ formatHexId(conclusion.arbitrationId) }}
              </span>
              <span class="text-xs text-gray-500">{{ conclusion.author }}</span>
            </div>
            <div class="flex items-center gap-1">
              <button
                @click="handleEdit(conclusion)"
                class="p-1 text-gray-400 hover:text-cyan-400 transition-colors"
                title="编辑"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                @click="handleDelete(conclusion)"
                class="p-1 text-gray-400 hover:text-red-400 transition-colors"
                title="删除"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          <div class="mb-2">
            <div class="text-xs text-gray-500 mb-1">排查判断</div>
            <p class="text-sm text-gray-300 whitespace-pre-wrap">{{ conclusion.diagnosis }}</p>
          </div>

          <div v-if="conclusion.suggestion" class="mb-2">
            <div class="text-xs text-gray-500 mb-1">处理建议</div>
            <p class="text-sm text-yellow-300 whitespace-pre-wrap">{{ conclusion.suggestion }}</p>
          </div>

          <div class="flex items-center justify-between">
            <div v-if="conclusion.tags.length > 0" class="flex flex-wrap gap-1">
              <span
                v-for="tag in conclusion.tags"
                :key="tag"
                class="px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded text-xs"
              >
                {{ tag }}
              </span>
            </div>
            <span class="text-xs text-gray-600">
              {{ formatTimestamp(conclusion.updatedAt) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <ExpertConclusionForm
      :visible="showForm"
      :edit-conclusion="editingConclusion"
      @close="handleClose"
      @saved="handleSaved"
    />
  </div>
</template>
