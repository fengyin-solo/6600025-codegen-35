<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useCanBusStore } from '../store/canbus';
import type { ExpertConclusion } from '../types';
import ExpertConclusionForm from './ExpertConclusionForm.vue';

const props = defineProps<{
  highlightFrameId?: string | null;
}>();

const emit = defineEmits<{
  (e: 'frameSelected', frameId: string): void;
}>();

const store = useCanBusStore();
const selectedFrameId = ref<string | null>(null);
const showConclusionForm = ref(false);

const selectedFrame = computed(() => {
  if (!selectedFrameId.value) return null;
  return store.frames.find(f => f.id === selectedFrameId.value) || null;
});

const selectedFrameConclusions = computed(() => {
  if (!selectedFrameId.value) return [];
  return store.getConclusionsForFrame(selectedFrameId.value);
});

const matchedPatternConclusions = computed(() => {
  if (!selectedFrame.value) return [];
  return store.getConclusionsForArbitrationId(selectedFrame.value.arbitrationId)
    .filter(c => c.frameId !== selectedFrameId.value);
});

function selectFrame(id: string) {
  selectedFrameId.value = selectedFrameId.value === id ? null : id;
  if (selectedFrameId.value) {
    emit('frameSelected', selectedFrameId.value);
  }
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('zh-CN', { hour12: false }) + '.' + d.getMilliseconds().toString().padStart(3, '0');
}

function formatHexId(id: number): string {
  return '0x' + id.toString(16).toUpperCase().padStart(3, '0');
}

function getSignalPercent(name: string, value: number): number {
  const ranges: Record<string, { min: number; max: number }> = {
    EngineRPM: { min: 0, max: 16383 },
    VehicleSpeed: { min: 0, max: 255 },
    CoolantTemp: { min: -40, max: 215 },
    ThrottlePosition: { min: 0, max: 100 },
    EngineLoad: { min: 0, max: 100 }
  };
  const range = ranges[name];
  if (!range) return 50;
  return Math.max(0, Math.min(100, ((value - range.min) / (range.max - range.min)) * 100));
}

function getSignalColor(name: string): string {
  const colors: Record<string, string> = {
    EngineRPM: 'bg-blue-500',
    VehicleSpeed: 'bg-green-500',
    CoolantTemp: 'bg-red-500',
    ThrottlePosition: 'bg-yellow-500',
    EngineLoad: 'bg-purple-500'
  };
  return colors[name] || 'bg-cyan-500';
}

function getSignalUnit(name: string): string {
  const units: Record<string, string> = {
    EngineRPM: 'rpm',
    VehicleSpeed: 'km/h',
    CoolantTemp: '°C',
    ThrottlePosition: '%',
    EngineLoad: '%'
  };
  return units[name] || '';
}

function getFrameConclusionCount(frameId: string): number {
  return store.getConclusionsForFrame(frameId).length;
}

function hasAnomaly(frameId: string): boolean {
  return store.hasAnomalyConclusion(frameId);
}

function openConclusionForm() {
  showConclusionForm.value = true;
}

function handleConclusionSaved() {
  store.fetchConclusions();
}

onMounted(() => {
  store.fetchConclusions();
});
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center gap-4 px-4 py-2 bg-gray-800 border-b border-gray-700 text-sm">
      <div class="flex items-center gap-1">
        <span class="text-gray-400">总帧数:</span>
        <span class="text-cyan-400 font-mono font-bold">{{ store.busStats.totalFrames }}</span>
      </div>
      <div class="flex items-center gap-1">
        <span class="text-gray-400">RX:</span>
        <span class="text-green-400 font-mono font-bold">{{ store.busStats.rxCount }}</span>
      </div>
      <div class="flex items-center gap-1">
        <span class="text-gray-400">TX:</span>
        <span class="text-blue-400 font-mono font-bold">{{ store.busStats.txCount }}</span>
      </div>
      <div class="flex items-center gap-1">
        <span class="text-gray-400">总线负载:</span>
        <span class="text-yellow-400 font-mono font-bold">{{ store.busLoadPercent }}%</span>
      </div>
      <div class="flex items-center gap-1 ml-auto">
        <span class="text-gray-400">专家结论:</span>
        <span class="text-purple-400 font-mono font-bold">{{ store.conclusions.length }}</span>
      </div>
    </div>

    <div class="px-4 py-2 bg-gray-800 border-b border-gray-700">
      <input
        v-model="store.filterText"
        type="text"
        placeholder="搜索 CAN ID 或信号名称..."
        class="w-full px-3 py-1.5 bg-gray-900 border border-gray-600 rounded text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500"
      />
    </div>

    <div class="flex-1 overflow-auto">
      <table class="w-full text-sm font-mono">
        <thead class="sticky top-0 bg-gray-800 z-10">
          <tr class="text-gray-400 text-left">
            <th class="px-2 py-2 font-medium w-8"></th>
            <th class="px-3 py-2 font-medium">时间戳</th>
            <th class="px-3 py-2 font-medium w-12">方向</th>
            <th class="px-3 py-2 font-medium w-20">CAN ID</th>
            <th class="px-3 py-2 font-medium w-10">DLC</th>
            <th class="px-3 py-2 font-medium">数据 (Hex)</th>
            <th class="px-3 py-2 font-medium">解码信号</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="frame in store.filteredFrames"
            :key="frame.id"
            @click="selectFrame(frame.id)"
            class="border-b border-gray-800 cursor-pointer transition-colors"
            :class="[
              selectedFrameId === frame.id
                ? 'bg-cyan-900/30 border-l-2 border-l-cyan-500'
                : highlightFrameId === frame.id
                  ? 'bg-yellow-900/20 border-l-2 border-l-yellow-500'
                  : 'hover:bg-gray-800/50'
            ]"
          >
            <td class="px-2 py-1.5">
              <div class="flex items-center gap-1">
                <span
                  v-if="hasAnomaly(frame.id)"
                  class="inline-block w-2 h-2 bg-red-500 rounded-full"
                  title="存在异常结论"
                ></span>
                <span
                  v-else-if="getFrameConclusionCount(frame.id) > 0"
                  class="inline-block w-2 h-2 bg-green-500 rounded-full"
                  title="存在专家结论"
                ></span>
              </div>
            </td>
            <td class="px-3 py-1.5 text-gray-300 whitespace-nowrap">{{ formatTimestamp(frame.timestamp) }}</td>
            <td class="px-3 py-1.5">
              <span
                class="px-1.5 py-0.5 rounded text-xs font-bold"
                :class="frame.direction === 'RX' ? 'bg-green-900/50 text-green-400' : 'bg-blue-900/50 text-blue-400'"
              >
                {{ frame.direction }}
              </span>
            </td>
            <td class="px-3 py-1.5 text-cyan-400 font-bold">{{ formatHexId(frame.arbitrationId) }}</td>
            <td class="px-3 py-1.5 text-gray-400">{{ frame.dlc }}</td>
            <td class="px-3 py-1.5 text-gray-300 whitespace-nowrap">{{ frame.data }}</td>
            <td class="px-3 py-1.5 text-gray-400">
              <span v-for="(val, key) in frame.decoded" :key="String(key)" class="inline-block mr-2">
                <span class="text-gray-500">{{ key }}:</span>
                <span class="text-yellow-300">{{ typeof val === 'number' ? val.toFixed(1) : val }}</span>
              </span>
              <span
                v-if="getFrameConclusionCount(frame.id) > 0"
                class="inline-block px-1.5 py-0.5 bg-purple-900/50 text-purple-300 rounded text-xs"
              >
                {{ getFrameConclusionCount(frame.id) }} 条结论
              </span>
            </td>
          </tr>
          <tr v-if="store.filteredFrames.length === 0">
            <td colspan="7" class="px-3 py-8 text-center text-gray-500">
              暂无数据 — 点击"开始捕获"以模拟接收CAN帧
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="selectedFrame"
      class="border-t border-gray-700 max-h-[45vh] overflow-y-auto"
      style="background-color: #1a2234;"
    >
      <div class="p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold text-gray-300">
            帧详情 — {{ formatHexId(selectedFrame.arbitrationId) }}
            <span class="text-gray-500 font-normal ml-2">{{ selectedFrame.id }}</span>
          </h3>
          <button
            @click.stop="openConclusionForm"
            class="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors flex items-center gap-1"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            添加结论
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div
            v-for="(value, name) in selectedFrame.decoded"
            :key="String(name)"
            class="bg-gray-800 rounded-lg p-3"
          >
            <div class="flex justify-between items-center mb-1.5">
              <span class="text-sm text-gray-400">{{ name }}</span>
              <span class="text-sm font-bold text-gray-100">
                {{ typeof value === 'number' ? value.toFixed(1) : value }} {{ getSignalUnit(String(name)) }}
              </span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-2">
              <div
                class="h-2 rounded-full transition-all duration-300"
                :class="getSignalColor(String(name))"
                :style="{ width: getSignalPercent(String(name), value as number) + '%' }"
              ></div>
            </div>
          </div>
        </div>
        <div v-if="Object.keys(selectedFrame.decoded).length === 0" class="text-gray-500 text-sm mb-4">
          无DBC定义 — 无法解码此帧信号
        </div>

        <div v-if="selectedFrameConclusions.length > 0" class="mb-4">
          <h4 class="text-xs font-medium text-purple-400 mb-2 flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            绑定的专家结论 ({{ selectedFrameConclusions.length }})
          </h4>
          <div class="space-y-2">
            <div
              v-for="conclusion in selectedFrameConclusions"
              :key="conclusion.id"
              class="bg-gray-800 rounded-lg p-3 border"
              :class="conclusion.isAnomaly ? 'border-red-800' : 'border-green-800'"
            >
              <div class="flex items-center gap-2 mb-1">
                <span
                  class="px-1.5 py-0.5 rounded text-xs font-medium"
                  :class="conclusion.isAnomaly ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'"
                >
                  {{ conclusion.anomalyType }}
                </span>
                <span class="text-xs text-gray-500">{{ conclusion.author }}</span>
              </div>
              <p class="text-sm text-gray-300 mb-1"><span class="text-gray-500">诊断:</span> {{ conclusion.diagnosis }}</p>
              <p v-if="conclusion.suggestion" class="text-sm text-yellow-300"><span class="text-yellow-600">建议:</span> {{ conclusion.suggestion }}</p>
              <div v-if="conclusion.tags.length > 0" class="flex flex-wrap gap-1 mt-2">
                <span
                  v-for="tag in conclusion.tags"
                  :key="tag"
                  class="px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded text-xs"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="matchedPatternConclusions.length > 0">
          <h4 class="text-xs font-medium text-blue-400 mb-2 flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            同 CAN ID 历史结论 ({{ matchedPatternConclusions.length }})
          </h4>
          <div class="space-y-2">
            <div
              v-for="conclusion in matchedPatternConclusions"
              :key="conclusion.id"
              class="bg-gray-800/50 rounded-lg p-3 border border-gray-700"
            >
              <div class="flex items-center gap-2 mb-1">
                <span
                  class="px-1.5 py-0.5 rounded text-xs font-medium"
                  :class="conclusion.isAnomaly ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'"
                >
                  {{ conclusion.anomalyType }}
                </span>
                <span class="text-xs text-gray-500">{{ conclusion.author }}</span>
              </div>
              <p class="text-sm text-gray-400">{{ conclusion.diagnosis }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ExpertConclusionForm
      :visible="showConclusionForm"
      :frame="selectedFrame"
      @close="showConclusionForm = false"
      @saved="handleConclusionSaved"
    />
  </div>
</template>
