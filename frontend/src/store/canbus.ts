import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import type { CanFrame, DbcMessage, BusStats, ExpertConclusion } from '../types';
import { parseDbc, decodeCanFrame, DEFAULT_DBC_CONTENT } from '../utils/dbc-parser';

const API_BASE = 'http://localhost:8080/api';

let frameIdCounter = 0;

export const useCanBusStore = defineStore('canbus', () => {
  const frames = ref<CanFrame[]>([]);
  const signals = ref<Map<string, { name: string; data: { time: number; value: number }[] }>>(new Map());
  const dbcMessages = ref<Map<number, DbcMessage>>(new Map());
  const filterId = ref('');
  const filterText = ref('');
  const isCapturing = ref(false);
  const pollInterval = ref<number | null>(null);

  const conclusions = ref<ExpertConclusion[]>([]);
  const conclusionFilter = ref('');
  const showAnomalyOnly = ref(false);

  const busStats = ref<BusStats>({
    totalFrames: 0,
    rxCount: 0,
    txCount: 0,
    errorCount: 0,
    busLoad: 0,
    lastUpdate: Date.now()
  });

  const filteredFrames = computed(() => {
    let result = frames.value;

    if (filterId.value.trim()) {
      const idFilter = filterId.value.trim().toLowerCase().replace(/^0x/, '');
      result = result.filter(f =>
        f.arbitrationId.toString(16).toLowerCase().includes(idFilter)
      );
    }

    if (filterText.value.trim()) {
      const textFilter = filterText.value.trim().toLowerCase();
      result = result.filter(f => {
        if (f.arbitrationId.toString(16).toLowerCase().includes(textFilter)) return true;
        if (f.data.toLowerCase().includes(textFilter)) return true;
        for (const key of Object.keys(f.decoded)) {
          if (key.toLowerCase().includes(textFilter)) return true;
        }
        return false;
      });
    }

    return result;
  });

  const busLoadPercent = computed(() => {
    return busStats.value.busLoad.toFixed(1);
  });

  const filteredConclusions = computed(() => {
    let result = conclusions.value;

    if (showAnomalyOnly.value) {
      result = result.filter(c => c.isAnomaly);
    }

    if (conclusionFilter.value.trim()) {
      const keyword = conclusionFilter.value.trim().toLowerCase();
      result = result.filter(c =>
        c.diagnosis.toLowerCase().includes(keyword) ||
        c.suggestion.toLowerCase().includes(keyword) ||
        c.anomalyType.toLowerCase().includes(keyword) ||
        c.author.toLowerCase().includes(keyword) ||
        c.tags.some(t => t.toLowerCase().includes(keyword))
      );
    }

    return result.sort((a, b) => b.updatedAt - a.updatedAt);
  });

  function getConclusionsForFrame(frameId: string): ExpertConclusion[] {
    return conclusions.value.filter(c => c.frameId === frameId);
  }

  function getConclusionsForArbitrationId(arbId: number): ExpertConclusion[] {
    return conclusions.value.filter(c => c.arbitrationId === arbId);
  }

  function hasAnomalyConclusion(frameId: string): boolean {
    return conclusions.value.some(c => c.frameId === frameId && c.isAnomaly);
  }

  async function fetchConclusions(params?: Record<string, any>) {
    try {
      const response = await axios.get(`${API_BASE}/conclusions`, { params });
      conclusions.value = response.data;
      return response.data;
    } catch (error) {
      console.error('Failed to fetch conclusions:', error);
      conclusions.value = [];
      return [];
    }
  }

  async function createConclusion(conclusion: Omit<ExpertConclusion, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const response = await axios.post(`${API_BASE}/conclusions`, conclusion);
      conclusions.value.push(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to create conclusion:', error);
      throw error;
    }
  }

  async function updateConclusion(id: string, conclusion: Partial<ExpertConclusion>) {
    try {
      const response = await axios.put(`${API_BASE}/conclusions/${id}`, conclusion);
      const index = conclusions.value.findIndex(c => c.id === id);
      if (index !== -1) {
        conclusions.value[index] = response.data;
      }
      return response.data;
    } catch (error) {
      console.error('Failed to update conclusion:', error);
      throw error;
    }
  }

  async function deleteConclusion(id: string) {
    try {
      await axios.delete(`${API_BASE}/conclusions/${id}`);
      conclusions.value = conclusions.value.filter(c => c.id !== id);
      return true;
    } catch (error) {
      console.error('Failed to delete conclusion:', error);
      throw error;
    }
  }

  async function exportConclusions(): string {
    const header = 'ID,FrameID,CAN_ID,异常类型,诊断结论,处理建议,作者,创建时间,标签\n';
    const rows = conclusions.value.map(c => {
      const date = new Date(c.createdAt).toLocaleString('zh-CN');
      const tags = c.tags.join(';');
      return `"${c.id}","${c.frameId}","0x${c.arbitrationId.toString(16).toUpperCase()}","${c.anomalyType}","${c.diagnosis.replace(/"/g, '""')}","${c.suggestion.replace(/"/g, '""')}","${c.author}","${date}","${tags}"`;
    }).join('\n');
    return header + rows;
  }

  function addFrame(frame: CanFrame) {
    frames.value.push(frame);
    if (frames.value.length > 500) {
      frames.value = frames.value.slice(-500);
    }

    busStats.value.totalFrames++;
    if (frame.direction === 'RX') busStats.value.rxCount++;
    else busStats.value.txCount++;
    busStats.value.lastUpdate = Date.now();

    // Update signal history
    const msgDef = dbcMessages.value.get(frame.arbitrationId);
    if (msgDef) {
      const decoded = decodeCanFrame(frame, msgDef);
      frame.decoded = decoded;
      for (const [name, value] of Object.entries(decoded)) {
        if (!signals.value.has(name)) {
          signals.value.set(name, { name, data: [] });
        }
        const sig = signals.value.get(name)!;
        sig.data.push({ time: frame.timestamp, value });
        if (sig.data.length > 100) {
          sig.data = sig.data.slice(-100);
        }
      }
    }

    // Simulate bus load (random 15-45%)
    busStats.value.busLoad = 15 + Math.random() * 30;
  }

  function clearFrames() {
    frames.value = [];
    signals.value = new Map();
    busStats.value = {
      totalFrames: 0,
      rxCount: 0,
      txCount: 0,
      errorCount: 0,
      busLoad: 0,
      lastUpdate: Date.now()
    };
    frameIdCounter = 0;
  }

  function loadMockDbc() {
    parseAndLoadDbc(DEFAULT_DBC_CONTENT);
  }

  function parseAndLoadDbc(text: string) {
    dbcMessages.value = parseDbc(text);
  }

  function generateMockFrame(): CanFrame {
    const messageIds = Array.from(dbcMessages.value.keys());
    const arbId = messageIds.length > 0
      ? messageIds[Math.floor(Math.random() * messageIds.length)]
      : 0x7DF;

    const msgDef = dbcMessages.value.get(arbId);

    // Generate realistic OBD-II values
    const rpm = Math.floor(800 + Math.random() * 5200);
    const speed = Math.floor(Math.random() * 120);
    const temp = Math.floor(70 + Math.random() * 35);
    const throttle = Math.floor(Math.random() * 100);
    const load = Math.floor(Math.random() * 100);

    // Encode values into bytes (simplified encoding for display)
    const rpmRaw = Math.round(rpm / 0.25);
    const rpmLow = rpmRaw & 0xFF;
    const rpmHigh = (rpmRaw >> 8) & 0xFF;
    const speedByte = speed & 0xFF;
    const tempByte = (temp + 40) & 0xFF;
    const throttleByte = Math.round(throttle / 0.392) & 0xFF;
    const loadByte = Math.round(load / 0.392) & 0xFF;

    const dataBytes = [rpmLow, rpmHigh, speedByte, tempByte, throttleByte, loadByte, 0x00, 0x00];
    const dataHex = dataBytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

    const frame: CanFrame = {
      id: `frame-${++frameIdCounter}`,
      timestamp: Date.now(),
      arbitrationId: arbId,
      dlc: 8,
      data: dataHex,
      decoded: {},
      direction: Math.random() > 0.3 ? 'RX' : 'TX'
    };

    if (msgDef) {
      frame.decoded = {
        EngineRPM: rpm,
        VehicleSpeed: speed,
        CoolantTemp: temp,
        ThrottlePosition: throttle,
        EngineLoad: load
      };
    }

    return frame;
  }

  function startCapture() {
    if (isCapturing.value) return;
    isCapturing.value = true;

    // Load mock DBC if not loaded
    if (dbcMessages.value.size === 0) {
      loadMockDbc();
    }

    pollInterval.value = window.setInterval(() => {
      const frame = generateMockFrame();
      addFrame(frame);
    }, 200);
  }

  function stopCapture() {
    isCapturing.value = false;
    if (pollInterval.value !== null) {
      clearInterval(pollInterval.value);
      pollInterval.value = null;
    }
  }

  function decodeFrame(frame: CanFrame): Record<string, number> {
    const msgDef = dbcMessages.value.get(frame.arbitrationId);
    if (!msgDef) return {};
    return decodeCanFrame(frame, msgDef);
  }

  function exportFrames(): string {
    const header = 'Timestamp,Direction,CAN_ID,DLC,Data,Decoded\n';
    const rows = frames.value.map(f => {
      const decodedStr = Object.entries(f.decoded)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
      return `${f.timestamp},${f.direction},0x${f.arbitrationId.toString(16).toUpperCase()},${f.dlc},"${f.data}","${decodedStr}"`;
    }).join('\n');
    return header + rows;
  }

  return {
    frames,
    signals,
    dbcMessages,
    filterId,
    filterText,
    busStats,
    isCapturing,
    filteredFrames,
    busLoadPercent,
    conclusions,
    conclusionFilter,
    showAnomalyOnly,
    filteredConclusions,
    addFrame,
    clearFrames,
    loadMockDbc,
    parseAndLoadDbc,
    startCapture,
    stopCapture,
    decodeFrame,
    exportFrames,
    getConclusionsForFrame,
    getConclusionsForArbitrationId,
    hasAnomalyConclusion,
    fetchConclusions,
    createConclusion,
    updateConclusion,
    deleteConclusion,
    exportConclusions
  };
});
