<script setup lang="ts">
import { ref } from 'vue';
import { useCanBusStore } from './store/canbus';
import FrameTable from './components/FrameTable.vue';
import SignalChart from './components/SignalChart.vue';
import ExpertConclusionList from './components/ExpertConclusionList.vue';
import ExpertConclusionForm from './components/ExpertConclusionForm.vue';

const store = useCanBusStore();
const rightPanelTab = ref<'chart' | 'conclusions'>('chart');
const highlightFrameId = ref<string | null>(null);
const showQuickAddForm = ref(false);

function handleLoadDbc() {
  store.loadMockDbc();
  alert(`已加载 DBC 定义: ${store.dbcMessages.size} 条消息`);
}

function handleExport() {
  const csv = store.exportFrames();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `can_frames_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function handleLocateFrame(frameId: string) {
  highlightFrameId.value = frameId;
  setTimeout(() => {
    highlightFrameId.value = null;
  }, 3000);
}

function handleFrameSelected(frameId: string) {
  console.log('Frame selected:', frameId);
}
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-900 text-gray-100 overflow-hidden">
    <header class="flex items-center justify-between px-6 py-3 bg-gray-800 border-b border-gray-700 shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
        </div>
        <h1 class="text-lg font-bold text-gray-100">CAN 总线数据帧解析与诊断仪</h1>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="handleLoadDbc"
          class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded transition-colors border border-gray-600"
        >
          加载DBC
        </button>
        <button
          @click="showQuickAddForm = true"
          class="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition-colors flex items-center gap-1"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          录入结论
        </button>
        <button
          @click="store.isCapturing ? store.stopCapture() : store.startCapture()"
          class="px-3 py-1.5 text-sm rounded transition-colors font-medium"
          :class="store.isCapturing
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-green-600 hover:bg-green-700 text-white'"
        >
          {{ store.isCapturing ? '停止捕获' : '开始捕获' }}
        </button>
        <button
          @click="store.clearFrames()"
          class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded transition-colors border border-gray-600"
        >
          清除
        </button>
        <button
          @click="handleExport"
          class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded transition-colors border border-gray-600"
        >
          导出CSV
        </button>
      </div>
    </header>

    <main class="flex-1 flex overflow-hidden">
      <div class="w-3/5 border-r border-gray-700 flex flex-col overflow-hidden">
        <FrameTable
          :highlight-frame-id="highlightFrameId"
          @frame-selected="handleFrameSelected"
        />
      </div>

      <div class="w-2/5 flex flex-col overflow-hidden">
        <div class="flex border-b border-gray-700 bg-gray-800">
          <button
            @click="rightPanelTab = 'chart'"
            class="flex-1 px-4 py-2 text-sm font-medium transition-colors border-b-2"
            :class="rightPanelTab === 'chart'
              ? 'text-cyan-400 border-cyan-400 bg-gray-800'
              : 'text-gray-400 border-transparent hover:text-gray-300'"
          >
            信号趋势图
          </button>
          <button
            @click="rightPanelTab = 'conclusions'"
            class="flex-1 px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-1"
            :class="rightPanelTab === 'conclusions'
              ? 'text-purple-400 border-purple-400 bg-gray-800'
              : 'text-gray-400 border-transparent hover:text-gray-300'"
          >
            专家结论库
            <span
              v-if="store.conclusions.length > 0"
              class="px-1.5 py-0.5 bg-purple-900/50 text-purple-300 rounded text-xs"
            >
              {{ store.conclusions.length }}
            </span>
          </button>
        </div>

        <div class="flex-1 overflow-hidden">
          <SignalChart v-if="rightPanelTab === 'chart'" />
          <ExpertConclusionList
            v-else
            @locate-frame="handleLocateFrame"
          />
        </div>
      </div>
    </main>

    <footer class="flex items-center justify-between px-6 py-1.5 bg-gray-800 border-t border-gray-700 text-xs shrink-0">
      <div class="flex items-center gap-4 text-gray-500">
        <span>
          <span :class="store.isCapturing ? 'text-green-400' : 'text-gray-500'">
            ● {{ store.isCapturing ? '捕获中' : '已停止' }}
          </span>
        </span>
        <span>DBC消息: {{ store.dbcMessages.size }}</span>
        <span class="text-purple-400">专家结论: {{ store.conclusions.length }}</span>
      </div>
      <div class="flex items-center gap-4 text-gray-500">
        <span>帧数: {{ store.busStats.totalFrames }}</span>
        <span>RX: {{ store.busStats.rxCount }}</span>
        <span>TX: {{ store.busStats.txCount }}</span>
        <span>负载: {{ store.busLoadPercent }}%</span>
      </div>
    </footer>

    <ExpertConclusionForm
      :visible="showQuickAddForm"
      @close="showQuickAddForm = false"
      @saved="store.fetchConclusions"
    />
  </div>
</template>
