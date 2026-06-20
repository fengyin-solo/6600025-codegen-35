<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useCanBusStore } from '../store/canbus';
import type { CanFrame, ExpertConclusion } from '../types';

const props = defineProps<{
  frame?: CanFrame | null;
  editConclusion?: ExpertConclusion | null;
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved'): void;
}>();

const store = useCanBusStore();

const form = ref({
  isAnomaly: true,
  anomalyType: '',
  diagnosis: '',
  suggestion: '',
  author: '',
  tags: ''
});

const tagInput = ref('');
const tagsList = ref<string[]>([]);

const anomalyTypes = [
  '信号异常',
  '数据超限',
  '通信中断',
  '总线错误',
  '时序异常',
  '校验失败',
  '未知异常',
  '正常'
];

const isEdit = computed(() => !!props.editConclusion);
const title = computed(() => isEdit.value ? '编辑专家结论' : '添加专家结论');

watch(() => props.visible, (val) => {
  if (val) {
    resetForm();
    if (props.editConclusion) {
      form.value = {
        isAnomaly: props.editConclusion.isAnomaly,
        anomalyType: props.editConclusion.anomalyType,
        diagnosis: props.editConclusion.diagnosis,
        suggestion: props.editConclusion.suggestion,
        author: props.editConclusion.author,
        tags: props.editConclusion.tags.join(', ')
      };
      tagsList.value = [...props.editConclusion.tags];
    } else if (props.frame) {
      form.value.author = localStorage.getItem('canbus_author') || '';
    }
  }
});

function resetForm() {
  form.value = {
    isAnomaly: true,
    anomalyType: '',
    diagnosis: '',
    suggestion: '',
    author: localStorage.getItem('canbus_author') || '',
    tags: ''
  };
  tagsList.value = [];
  tagInput.value = '';
}

function addTag() {
  const tag = tagInput.value.trim();
  if (tag && !tagsList.value.includes(tag)) {
    tagsList.value.push(tag);
  }
  tagInput.value = '';
}

function removeTag(tag: string) {
  tagsList.value = tagsList.value.filter(t => t !== tag);
}

function handleTagKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    addTag();
  }
}

async function handleSubmit() {
  if (!form.value.diagnosis.trim()) {
    alert('请输入诊断结论');
    return;
  }
  if (!form.value.author.trim()) {
    alert('请输入作者名称');
    return;
  }

  const targetFrame = props.editConclusion ? null : props.frame;
  const conclusionData = {
    frameId: props.editConclusion ? props.editConclusion.frameId : (targetFrame?.id || ''),
    arbitrationId: props.editConclusion ? props.editConclusion.arbitrationId : (targetFrame?.arbitrationId || 0),
    dataPattern: props.editConclusion ? props.editConclusion.dataPattern : (targetFrame?.data || ''),
    isAnomaly: form.value.isAnomaly,
    anomalyType: form.value.anomalyType || (form.value.isAnomaly ? '未知异常' : '正常'),
    diagnosis: form.value.diagnosis.trim(),
    suggestion: form.value.suggestion.trim(),
    author: form.value.author.trim(),
    tags: tagsList.value
  };

  try {
    if (props.editConclusion) {
      await store.updateConclusion(props.editConclusion.id, conclusionData);
    } else {
      await store.createConclusion(conclusionData as any);
    }
    localStorage.setItem('canbus_author', form.value.author.trim());
    emit('saved');
    emit('close');
  } catch (error) {
    alert('保存失败，请检查后端服务是否启动');
  }
}
</script>

<template>
  <div v-if="visible" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div class="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
      <div class="px-6 py-4 bg-gray-750 border-b border-gray-700 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-100">{{ title }}</h2>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-white transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-6 space-y-4">
        <div v-if="frame && !isEdit" class="bg-gray-900 rounded-lg p-3 border border-gray-700">
          <div class="text-xs text-gray-500 mb-1">绑定帧信息</div>
          <div class="flex items-center gap-4 text-sm font-mono">
            <span class="text-cyan-400">0x{{ frame.arbitrationId.toString(16).toUpperCase().padStart(3, '0') }}</span>
            <span class="text-gray-400">{{ frame.data }}</span>
            <span class="text-gray-500">{{ frame.id }}</span>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="form.isAnomaly"
              type="checkbox"
              class="w-4 h-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500"
            />
            <span class="text-sm text-gray-300">标记为异常</span>
          </label>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1.5">异常类型</label>
          <select
            v-model="form.anomalyType"
            class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-gray-100 text-sm focus:outline-none focus:border-cyan-500"
          >
            <option value="">请选择异常类型</option>
            <option v-for="type in anomalyTypes" :key="type" :value="type">{{ type }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1.5">
            排查判断 <span class="text-red-400">*</span>
          </label>
          <textarea
            v-model="form.diagnosis"
            rows="3"
            placeholder="请输入对该异常的排查判断和分析结论..."
            class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-gray-100 text-sm focus:outline-none focus:border-cyan-500 resize-none"
          ></textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1.5">处理建议</label>
          <textarea
            v-model="form.suggestion"
            rows="3"
            placeholder="请输入针对该问题的处理建议和解决方案..."
            class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-gray-100 text-sm focus:outline-none focus:border-cyan-500 resize-none"
          ></textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1.5">
            作者 <span class="text-red-400">*</span>
          </label>
          <input
            v-model="form.author"
            type="text"
            placeholder="请输入专家姓名或工号"
            class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-gray-100 text-sm focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1.5">标签</label>
          <div class="flex items-center gap-2 mb-2">
            <input
              v-model="tagInput"
              type="text"
              placeholder="输入标签后按回车添加"
              @keydown="handleTagKeydown"
              class="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded text-gray-100 text-sm focus:outline-none focus:border-cyan-500"
            />
            <button
              @click="addTag"
              class="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded transition-colors"
            >
              添加
            </button>
          </div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="tag in tagsList"
              :key="tag"
              class="inline-flex items-center gap-1 px-2 py-1 bg-cyan-900/50 text-cyan-300 rounded text-xs"
            >
              {{ tag }}
              <button
                @click="removeTag(tag)"
                class="hover:text-white transition-colors"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          </div>
        </div>
      </div>

      <div class="px-6 py-4 bg-gray-750 border-t border-gray-700 flex items-center justify-end gap-3">
        <button
          @click="$emit('close')"
          class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded transition-colors"
        >
          取消
        </button>
        <button
          @click="handleSubmit"
          class="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded transition-colors"
        >
          {{ isEdit ? '更新' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>
