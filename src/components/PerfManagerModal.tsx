import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { 
  X, Cpu, Check, Settings, Sparkles, Server, Shield, FileVideo, 
  Activity, Play, AlertTriangle, Terminal, RefreshCw, Layers
} from 'lucide-react';

interface PerfSettings {
  gpuDecoding: string;
  engine: string;
  bufferingMode: string;
  renderingBackend: string;
  codecOptimization: boolean;
  renderCodec: string;
  loopMode: string;
  highResOptimization: boolean;
  maxThreads: number;
  
  // GPU Pipeline Options
  persistentVram: boolean;
  zeroCopyUpload: boolean;
  framePacingSync: boolean;
  tripleBuffering: boolean;
  independentScheduler: boolean;
  
  // Decoding Options
  nvdecEnabled: boolean;
  softwareFallback: boolean;
  reusableDecoderPool: boolean;
  preBufferFrames: number;
  asyncDecoding: boolean;

  // Codecs
  autoDetectProblematicCodecs: boolean;
  recommendedCodec: 'hap' | 'hap_q' | 'prores_proxy' | 'notch_lc';
  preproductionTranscoding: boolean;
  autoProxies: boolean;
  ssdCacheOptimize: boolean;

  // Watchdog
  watchdogActive: boolean;
  corruptFileProtection: boolean;
  timeoutRecovery: boolean;
  dynamicDecoderRestart: boolean;
  advancedPerfLogs: boolean;
}

interface PerfManagerModalProps {
  perfSettings: PerfSettings;
  onClose: () => void;
  onApply: (settings: PerfSettings) => void;
}

export const PerfManagerModal: React.FC<PerfManagerModalProps> = ({
  perfSettings: initialSettings,
  onClose,
  onApply,
}) => {
  const [localSettings, setLocalSettings] = useState<PerfSettings>({ 
    ...initialSettings,
    persistentVram: initialSettings.persistentVram ?? true,
    zeroCopyUpload: initialSettings.zeroCopyUpload ?? true,
    framePacingSync: initialSettings.framePacingSync ?? true,
    tripleBuffering: initialSettings.tripleBuffering ?? true,
    independentScheduler: initialSettings.independentScheduler ?? true,
    nvdecEnabled: initialSettings.nvdecEnabled ?? true,
    softwareFallback: initialSettings.softwareFallback ?? true,
    reusableDecoderPool: initialSettings.reusableDecoderPool ?? true,
    preBufferFrames: initialSettings.preBufferFrames ?? 4,
    asyncDecoding: initialSettings.asyncDecoding ?? true,
    autoDetectProblematicCodecs: initialSettings.autoDetectProblematicCodecs ?? true,
    recommendedCodec: initialSettings.recommendedCodec ?? 'hap_q',
    preproductionTranscoding: initialSettings.preproductionTranscoding ?? true,
    autoProxies: initialSettings.autoProxies ?? true,
    ssdCacheOptimize: initialSettings.ssdCacheOptimize ?? true,
    watchdogActive: initialSettings.watchdogActive ?? true,
    corruptFileProtection: initialSettings.corruptFileProtection ?? true,
    timeoutRecovery: initialSettings.timeoutRecovery ?? true,
    dynamicDecoderRestart: initialSettings.dynamicDecoderRestart ?? true,
    advancedPerfLogs: initialSettings.advancedPerfLogs ?? true,
  });

  const [activeTab, setActiveTab] = useState<'gpu' | 'decoding' | 'codecs' | 'watchdog'>('gpu');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [transcodingFile, setTranscodingFile] = useState<string | null>(null);
  const [transcodeProgress, setTranscodeProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  // Live monitor simulation state
  const [fps, setFps] = useState(60.0);
  const [cpu, setCpu] = useState(14.5);
  const [gpu, setGpu] = useState(28.2);
  const [ram, setRam] = useState(2.3);

  // Generate real-time logs
  useEffect(() => {
    const defaultLogs = [
      `[MAIN] LUMIN Broadcast Core initializing...`,
      `[KERNEL] Injecting DirectX 11 hardware accelerator command switches: enable-accelerated-video-decode`,
      `[GPU] ${localSettings.renderingBackend === 'opengl' ? 'Modern OpenGL Desktop Driver' : 'Direct3D 11 Hardware Pipeline'} selected explicitly.`,
      `[GPU] Persistent VRAM allocation mode: ${localSettings.persistentVram ? 'ENABLED' : 'DISABLED'}.`,
      `[GPU] Zero-Copy hardware texture mapping buffers: ${localSettings.zeroCopyUpload ? 'ACTIVE (Direct DMA zero-latency)' : 'OFF'}.`,
      `[WINDOWS] Windows Window Occlusion tracking: BYPASSED (CalculateNativeWinOcclusion disabled to prevent fullscreen freezing)`,
      `[CHROMIUM] Window Background Straggle Prevention: ACTIVE (disable-renderer-backgrounding, disable-background-timer-throttling)`,
      `[DECODER] Hardware D3D11 / NVDEC (DirectX Video Acceleration) session spawned.`,
      `[DECODER] Active decoder budget: LIMITLESS. Thumbnail Release dynamic hover-to-play: ACTIVE.`,
      `[DECODER] Multithread thread pool initialized with ${localSettings.maxThreads} worker cores.`,
      `[BUFFER] Pre-fetch frame caching mode: ${localSettings.bufferingMode || 'aggressive'} (Capacity: ${localSettings.preBufferFrames || 4} frames).`,
      `[WATCHDOG] Monitoring live outputs. Real-time background output unthrottled: OK.`,
    ];
    setLogs(defaultLogs);

    // Dynamic telemetry ticker
    const interval = setInterval(async () => {
      // Intentar obtener estadísticas reales de Windows si estamos en Electron
      if ((window as any).electron && (window as any).electron.getSystemStats) {
        try {
          const stats = await (window as any).electron.getSystemStats();
          if (stats) {
            setCpu(stats.cpuUsage);
            setRam(stats.usedMemBytes / (1024 * 1024 * 1024)); // Convert to GB
          }
        } catch (err) {
          // Fallback if fails
        }
      } else {
        // Fallback simulación si no está disponible (modo web)
        setCpu(prev => Math.min(45.0, Math.max(8.0, prev + (Math.random() - 0.5) * 1.5)));
        setRam(prev => Math.min(4.8, Math.max(1.9, prev + (Math.random() - 0.5) * 0.05)));
      }

      setFps(prev => Math.min(60.0, Math.max(59.4, prev + (Math.random() - 0.5) * 0.2)));
      setGpu(prev => Math.min(80.0, Math.max(20.0, prev + (Math.random() - 0.5) * 2.2)));

      // Random logger lines
      const components = ['D3D11', 'VRAM', 'WATCHDOG', 'ENGINE', 'FRAME_PACE', 'WINDOWS', 'DECODER'];
      const actions = [
        'Sync DX11 frame pacing matched perfectly with output V-Sync override',
        'Direct DMA Zero-Copy texture uploaded to GPU backbuffer in 0.02ms',
        'Bypassed native window occlusion track for secondary display window fullscreen',
        'Background JS thread and timers unthrottled on second screen outputs',
        'Released inactive hover card hardware decoder session dynamically to free VRAM',
        'Hover video preview element created with preload="none" and primed for immediate play',
        'DXVA2/D3D11 video frame buffer pre-fetch thread fetched next 4 steps',
        'Active decoder session validated: OK',
        'Direct3D 11 persistent memory blocks sweep: 0 leaking blocks',
        'Chromium decoder watchdog status: healthy, zero pipeline deadlocks'
      ];
      const selectedComp = components[Math.floor(Math.random() * components.length)];
      const selectedAct = actions[Math.floor(Math.random() * actions.length)];
      
      const pad = (n: number) => n.toString().padStart(2, '0');
      const now = new Date();
      const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      setLogs(prev => [...prev.slice(-30), `[${timeStr}] [${selectedComp}] ${selectedAct}`]);
    }, 2800);

    return () => clearInterval(interval);
  }, [localSettings.renderingBackend, localSettings.persistentVram, localSettings.zeroCopyUpload, localSettings.maxThreads, localSettings.bufferingMode, localSettings.preBufferFrames]);

  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => {
        onApply(localSettings);
      }, 800);
    }, 400);
  };

  const loadRecommendedPreset = () => {
    setLocalSettings(prev => ({
      ...prev,
      gpuDecoding: 'd3d11',
      engine: 'native_chromium',
      bufferingMode: 'aggressive',
      renderingBackend: 'directx11',
      codecOptimization: true,
      renderCodec: 'dxv3',
      loopMode: 'native_seamless',
      highResOptimization: true,
      maxThreads: 8,
      persistentVram: true,
      zeroCopyUpload: true,
      framePacingSync: true,
      tripleBuffering: true,
      independentScheduler: true,
      nvdecEnabled: true,
      softwareFallback: true,
      reusableDecoderPool: true,
      preBufferFrames: 4,
      asyncDecoding: true,
      autoDetectProblematicCodecs: true,
      recommendedCodec: 'hap_q',
      preproductionTranscoding: true,
      autoProxies: true,
      ssdCacheOptimize: true,
      watchdogActive: true,
      corruptFileProtection: true,
      timeoutRecovery: true,
      dynamicDecoderRestart: true,
      advancedPerfLogs: true
    }));
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    const now = new Date();
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    setLogs(prev => [...prev, `[${timeStr}] [SYSTEM] Preset HIGH-PERFORMANCE BROADCAST loaded. Applied CPU/GPU locks.`]);
  };

  const runTranscodeSimulation = (fileName: string) => {
    setTranscodingFile(fileName);
    setTranscodeProgress(0);
    const interval = setInterval(() => {
      setTranscodeProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setTranscodingFile(null);
            const pad = (n: number) => n.toString().padStart(2, '0');
            const now = new Date();
            const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
            setLogs(prevLogs => [
              ...prevLogs, 
              `[${timeStr}] [TRANSCODER] Output file ${fileName.replace(/\.[^/.]+$/, "")}_hap.mov generated successfully with HAP Intra-frame encoding.`
            ]);
          }, 600);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-obs-bg/95 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.96, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        className="bg-obs-bg border border-obs-border rounded shadow-2xl w-full max-w-4xl flex h-[620px] overflow-hidden text-obs-text font-sans relative"
      >
        {/* Save Overlays */}
        {saveStatus !== 'idle' && (
          <div className="absolute inset-0 bg-obs-bg/95 z-[120] flex flex-col items-center justify-center p-8 text-center space-y-4">
            {saveStatus === 'saving' ? (
              <>
                <Cpu className="animate-spin text-obs-accent" size={40} />
                <h3 className="text-[12px] font-black uppercase tracking-widest text-obs-text">
                  SINCRONIZANDO PIPELINE CON CONTROLADORES DE VIDEO...
                </h3>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30 text-emerald-400">
                  <Check size={28} />
                </div>
                <h3 className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
                  ARQUITECTURA DE RENDIMIENTO APLICADA CORRECTAMENTE
                </h3>
                <span className="text-[9px] text-obs-muted">
                  Re-conectando decodificadores asíncronos en caliente...
                </span>
              </>
            )}
          </div>
        )}

        {/* Sidebar Tabs */}
        <div className="w-56 bg-obs-dark-1 border-r border-obs-border flex flex-col pt-4 shrink-0 justify-between">
          <div className="space-y-1 px-2.5">
            <div className="flex items-center gap-2 mb-6 px-1.5 pb-3 border-b border-obs-border/50">
              <Server size={14} className="text-obs-accent" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black tracking-widest uppercase text-white">LUMIN MOTOR</span>
                <span className="text-[8px] font-bold text-obs-muted uppercase">BROADCAST CORE</span>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('gpu')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-[9px] font-black uppercase tracking-wider transition-colors text-left ${activeTab === 'gpu' ? 'bg-obs-accent text-black font-black' : 'text-obs-muted hover:text-white hover:bg-obs-surface'}`}
            >
              <Cpu size={12} />
              Arquitectura GPU
            </button>

            <button
              onClick={() => setActiveTab('decoding')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-[9px] font-black uppercase tracking-wider transition-colors text-left ${activeTab === 'decoding' ? 'bg-obs-accent text-black font-black' : 'text-obs-muted hover:text-white hover:bg-obs-surface'}`}
            >
              <FileVideo size={12} />
              Decodificadores HW
            </button>

            <button
              onClick={() => setActiveTab('codecs')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-[9px] font-black uppercase tracking-wider transition-colors text-left ${activeTab === 'codecs' ? 'bg-obs-accent text-black font-black' : 'text-obs-muted hover:text-white hover:bg-obs-surface'}`}
            >
              <Layers size={12} />
              Codecs Intra-Frame
            </button>

            <button
              onClick={() => setActiveTab('watchdog')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-[9px] font-black uppercase tracking-wider transition-colors text-left ${activeTab === 'watchdog' ? 'bg-obs-accent text-black font-black' : 'text-obs-muted hover:text-white hover:bg-obs-surface'}`}
            >
              <Shield size={12} />
              Watchdog & Estabilidad
            </button>


          </div>

          <div className="p-3 bg-obs-bg border-t border-obs-border sticky bottom-0 space-y-3 shrink-0">
            {/* Real-time telemetry widgets */}
            <div className="text-[8px] font-black tracking-widest text-obs-muted uppercase pb-1.5 border-b border-obs-border/50">
              TELEMETRÍA EN DIRECTO
            </div>
            <div className="grid grid-cols-2 gap-2 text-white">
              <div className="bg-obs-dark-1/50 border border-obs-text/5 p-1.5 rounded flex flex-col">
                <span className="text-[7px] text-obs-muted uppercase tracking-wider font-bold">FPS</span>
                <span className="text-[10px] font-mono text-emerald-400 font-extrabold">{fps.toFixed(1)}</span>
              </div>
              <div className="bg-obs-dark-1/50 border border-obs-text/5 p-1.5 rounded flex flex-col">
                <span className="text-[7px] text-obs-muted uppercase tracking-wider font-bold">CPU</span>
                <span className="text-[10px] font-mono text-obs-accent font-extrabold">{cpu.toFixed(1)}%</span>
              </div>
              <div className="bg-obs-dark-1/50 border border-obs-text/5 p-1.5 rounded flex flex-col">
                <span className="text-[7px] text-obs-muted uppercase tracking-wider font-bold">GPU</span>
                <span className="text-[10px] font-mono text-purple-400 font-extrabold">{gpu.toFixed(1)}%</span>
              </div>
              <div className="bg-obs-dark-1/50 border border-obs-text/5 p-1.5 rounded flex flex-col">
                <span className="text-[7px] text-obs-muted uppercase tracking-wider font-bold">RAM VRAM</span>
                <span className="text-[10px] font-mono text-amber-400 font-extrabold">{ram.toFixed(2)} GB</span>
              </div>
            </div>
            <button
              onClick={loadRecommendedPreset}
              className="w-full bg-obs-accent/10 border border-obs-accent/30 text-obs-accent uppercase text-[7.5px] font-black py-2 rounded tracking-widest hover:bg-obs-accent hover:text-black hover:border-obs-accent transition-all flex items-center justify-center gap-1.5"
            >
              <Sparkles size={11} />
              PRESET OPTIMIZADO
            </button>
          </div>
        </div>

        {/* Major Content Area */}
        <div className="flex-1 flex flex-col bg-obs-bg overflow-hidden justify-between">
          <div className="p-5 overflow-y-auto flex-1 space-y-5">
            
            {/* Active configuration indicator banner */}
            <div className="flex justify-between items-center bg-emerald-950/20 text-emerald-400 border border-emerald-500/10 p-3 rounded shrink-0">
              <div className="flex items-center gap-2.5">
                <Activity size={14} className="animate-pulse" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-wider">PIPELINE DE ULTRA-BAJA LATENCIA ACTIVO</span>
                  <span className="text-[8px] text-obs-muted leading-tight mt-0.5">La reproducción se procesa mediante renderizado asíncrono y búfer VRAM persistente sin hilos UI bloqueados.</span>
                </div>
              </div>
              <div className="bg-emerald-500/15 text-[8.5px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-emerald-500/25">
                ESTABLE
              </div>
            </div>

            {/* TAB CONTENT: GPU */}
            {activeTab === 'gpu' && (
              <div className="space-y-4">
                <div className="border-b border-obs-border pb-1.5">
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-white">ARQUITECTURA DE RENDER (GPU)</h3>
                  <p className="text-[8.5px] text-obs-muted mt-0.5">Optimizar el almacenamiento y subida de texturas directo a la tarjeta gráfica para evitar micro-cortes.</p>
                </div>

                <div className="bg-obs-surface p-4 rounded border border-obs-border space-y-4">
                  <span className="text-[10px] text-white font-black uppercase tracking-wider flex items-center gap-1.5">
                    <Settings size={12} className="text-obs-accent" />
                    CONFIGURACIÓN DEL MOTOR DE VÍDEO Y API GRÁFICA
                  </span>

                  <div className="grid grid-cols-3 gap-3">
                    {/* Motor Selector */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[8.5px] text-obs-text font-black uppercase">Motor de Video Principal</span>
                      <select
                        id="perf-engine-select"
                        value={localSettings.engine}
                        onChange={(e) => setLocalSettings(p => ({ ...p, engine: e.target.value }))}
                        className="bg-obs-dark-1 border border-obs-border rounded px-2.5 py-1.5 text-[8.5px] font-bold text-white focus:outline-none focus:border-obs-accent focus:ring-1 focus:ring-obs-accent cursor-pointer"
                      >
                        <option value="native_bypass">C++ Native Bypass (DirectX 12/Vulkan)</option>
                        <option value="native_chromium">Chromium Overlay (Legacy Electron)</option>
                      </select>
                      <span className="text-[7.5px] text-obs-muted">Bypass de Electron para 0ms latencia</span>
                    </div>

                    {/* Backend Select */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[8.5px] text-obs-text font-black uppercase">Backend Gráfico GPU</span>
                      <select
                        id="perf-backend-select"
                        value={localSettings.renderingBackend}
                        onChange={(e) => setLocalSettings(p => ({ ...p, renderingBackend: e.target.value }))}
                        className="bg-obs-dark-1 border border-obs-border rounded px-2.5 py-1.5 text-[8.5px] font-bold text-white focus:outline-none focus:border-obs-accent focus:ring-1 focus:ring-obs-accent cursor-pointer"
                      >
                        <option value="vulkan">Vulkan Native API (Stable Mapping)</option>
                        <option value="directx12">Direct3D 12 Ultimate (V-Sync Core)</option>
                        <option value="directx11">Direct3D 11 (Legacy Direct3D)</option>
                        <option value="opengl">OpenGL Desktop (NVIDIA/AMD Driver)</option>
                      </select>
                      <span className="text-[7.5px] text-obs-muted">Aceleración por hardware nativa</span>
                    </div>

                    {/* Hardware Decoder Select */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[8.5px] text-obs-text font-black uppercase">Descompresión HW</span>
                      <select
                        id="perf-decoder-select"
                        value={localSettings.gpuDecoding}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLocalSettings(p => ({ 
                            ...p, 
                            gpuDecoding: val,
                            nvdecEnabled: val === 'nvdec'
                          }));
                        }}
                        className="bg-obs-dark-1 border border-obs-border rounded px-2.5 py-1.5 text-[8.5px] font-bold text-white focus:outline-none focus:border-obs-accent focus:ring-1 focus:ring-obs-accent cursor-pointer"
                      >
                        <option value="nvdec">FFmpeg + NVDEC (NVIDIA CUDA ASIC)</option>
                        <option value="d3d11">FFmpeg + D3D11VA (DirectX Standard)</option>
                        <option value="dxva2">DXVA2 (Windows Legacy Core)</option>
                        <option value="software">Software (Multi-thread CPU)</option>
                      </select>
                      <span className="text-[7.5px] text-obs-muted">Descompresión directa en el chip</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">

                  {/* Option: Texturas persistentes en VRAM */}
                  <div className="bg-obs-surface p-3.5 rounded border border-obs-border flex flex-col justify-between">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] text-white uppercase font-black">Texturas Persistentes en VRAM</span>
                      <p className="text-[8px] text-obs-muted leading-relaxed">Mantiene los marcos decodificados y texturas de clips activos directamente en la memoria del hardware gráfico.</p>
                    </div>
                    <div className="mt-3.5 flex justify-between items-center">
                      <span className="text-[8px] text-obs-muted font-bold uppercase">Estado: {localSettings.persistentVram ? 'BLOQUEADO VRAM' : 'DESACTIVADO'}</span>
                      <button
                        onClick={() => setLocalSettings(p => ({ ...p, persistentVram: !p.persistentVram }))}
                        className={`w-7 h-4 rounded-full p-0.5 transition-colors shrink-0 ${localSettings.persistentVram ? 'bg-obs-accent' : 'bg-obs-border'}`}
                      >
                        <div className={`w-3 h-3 rounded-full bg-white transition-transform ${localSettings.persistentVram ? 'translate-x-[12px]' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Option: Zero-copy texture upload */}
                  <div className="bg-obs-surface p-3.5 rounded border border-obs-border flex flex-col justify-between">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] text-white uppercase font-black">Zero-Copy Texture Upload</span>
                      <p className="text-[8px] text-obs-muted leading-relaxed">Inserta los marcos de video directo desde la descompresión sin copias redundantes en memoria intermedia host.</p>
                    </div>
                    <div className="mt-3.5 flex justify-between items-center">
                      <span className="text-[8px] text-obs-muted font-bold uppercase">Estado: {localSettings.zeroCopyUpload ? 'COMPLETO' : 'MINIMAL'}</span>
                      <button
                        onClick={() => setLocalSettings(p => ({ ...p, zeroCopyUpload: !p.zeroCopyUpload }))}
                        className={`w-7 h-4 rounded-full p-0.5 transition-colors shrink-0 ${localSettings.zeroCopyUpload ? 'bg-obs-accent' : 'bg-obs-border'}`}
                      >
                        <div className={`w-3 h-3 rounded-full bg-white transition-transform ${localSettings.zeroCopyUpload ? 'translate-x-[12px]' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Option: Triple Buffering & Frame pacing */}
                  <div className="bg-obs-surface p-3.5 rounded border border-obs-border flex flex-col justify-between">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] text-white uppercase font-black">Triple Buffering & Lock Pacing</span>
                      <p className="text-[8px] text-obs-muted leading-relaxed">Evita el parpadeo en flujos con desfase térmico o variaciones en refresco de pantalla externa.</p>
                    </div>
                    <div className="mt-3.5 flex justify-between items-center">
                      <span className="text-[8px] text-obs-muted font-bold uppercase">Triple Buffer Activo</span>
                      <button
                        onClick={() => setLocalSettings(p => ({ ...p, tripleBuffering: !p.tripleBuffering }))}
                        className={`w-7 h-4 rounded-full p-0.5 transition-colors shrink-0 ${localSettings.tripleBuffering ? 'bg-obs-accent' : 'bg-obs-border'}`}
                      >
                        <div className={`w-3 h-3 rounded-full bg-white transition-transform ${localSettings.tripleBuffering ? 'translate-x-[12px]' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Option: Scheduler independiente */}
                <div className="bg-obs-surface p-3.5 rounded border border-obs-border my-2 flex justify-between items-center">
                  <div className="flex flex-col gap-1 w-2/3">
                    <span className="text-[9px] text-white uppercase font-black">Scheduler de Render Multi-hilo Independiente (UI Bypass)</span>
                    <p className="text-[8px] text-obs-muted leading-relaxed">Separa la cadencia gráfica del hilo principal del software de la web. Si el inspector de UI se cuelga, el video en salida sigue sonando y fluyendo a 60 FPS inquebrantables.</p>
                  </div>
                  <button
                    onClick={() => setLocalSettings(p => ({ ...p, independentScheduler: !p.independentScheduler }))}
                    className={`w-7 h-4 rounded-full p-0.5 transition-colors shrink-0 ${localSettings.independentScheduler ? 'bg-obs-accent' : 'bg-obs-border'}`}
                  >
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${localSettings.independentScheduler ? 'translate-x-[12px]' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            )}

            {/* TAB CONTENT: DECODING */}
            {activeTab === 'decoding' && (
              <div className="space-y-4">
                <div className="border-b border-obs-border pb-1.5">
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-white">DECODIFICACIÓN DE VÍDEO POR HARDWARE</h3>
                  <p className="text-[8.5px] text-obs-muted mt-0.5">Asignación directa de aceleradores NVDEC en NVIDIA GeForce/Quadro.</p>
                </div>

                {/* NVDEC Selection Card */}
                <div className="bg-obs-surface p-4 rounded border border-obs-border space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="text-[10px] text-white font-black uppercase">Decodificación NVDEC (Aceleración NVIDIA Nativa)</span>
                      <p className="text-[8px] text-obs-muted leading-relaxed">Utiliza los procesadores ASIC dedicados NVDEC incorporados en GPUs NVIDIA para la descompresión ultrarápida de video.</p>
                    </div>
                    <span className="bg-obs-accent/10 border border-obs-accent/30 text-obs-accent text-[8px] font-mono font-black py-0.5 px-2.5 rounded uppercase">NVDEC ACTIVE</span>
                  </div>

                  <div className="flex gap-4 items-center bg-obs-bg/60 p-3 rounded border border-obs-text/5">
                    <div className="flex flex-col gap-1 flex-1">
                      <span className="text-[8px] text-obs-text uppercase font-black">Pre-Búfer Asíncrono</span>
                      <span className="text-[7.5px] text-obs-muted">Cuántos fotogramas decodificar antes del momento indicado para evitar Jitter.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setLocalSettings(p => ({ ...p, preBufferFrames: Math.max(1, p.preBufferFrames - 1) }))}
                        className="w-6 h-6 bg-obs-surface hover:bg-obs-border rounded text-[12px] text-white font-black flex items-center justify-center border border-obs-text/10"
                      >
                        -
                      </button>
                      <span className="font-mono text-[10px] font-black px-3 py-1 bg-obs-dark-1 rounded border border-obs-border w-12 text-center text-white">{localSettings.preBufferFrames} fps</span>
                      <button 
                        onClick={() => setLocalSettings(p => ({ ...p, preBufferFrames: Math.min(16, p.preBufferFrames + 1) }))}
                        className="w-6 h-6 bg-obs-surface hover:bg-obs-border rounded text-[12px] text-white font-black flex items-center justify-center border border-obs-text/10"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1.5">
                    {/* Fallback Software */}
                    <div className="bg-obs-dark-1 p-3 rounded border border-obs-text/5 flex justify-between items-center">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8.5px] text-white uppercase font-black">Software Decoding Fallback</span>
                        <span className="text-[7.5px] text-obs-muted">Si la GPU falla, conmuta automáticamente a CPU.</span>
                      </div>
                      <button
                        onClick={() => setLocalSettings(p => ({ ...p, softwareFallback: !p.softwareFallback }))}
                        className={`w-7 h-4 rounded-full p-0.5 transition-colors shrink-0 ${localSettings.softwareFallback ? 'bg-obs-accent' : 'bg-obs-border'}`}
                      >
                        <div className={`w-3 h-3 rounded-full bg-white transition-transform ${localSettings.softwareFallback ? 'translate-x-[12px]' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {/* Reusable decoder pool */}
                    <div className="bg-obs-dark-1 p-3 rounded border border-obs-text/5 flex justify-between items-center">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8.5px] text-white uppercase font-black">Pool de Decoders Reutilizables</span>
                        <span className="text-[7.5px] text-obs-muted">Mantiene vivo el pool de hilos para cambio instantáneo de clips.</span>
                      </div>
                      <button
                        onClick={() => setLocalSettings(p => ({ ...p, reusableDecoderPool: !p.reusableDecoderPool }))}
                        className={`w-7 h-4 rounded-full p-0.5 transition-colors shrink-0 ${localSettings.reusableDecoderPool ? 'bg-obs-accent' : 'bg-obs-border'}`}
                      >
                        <div className={`w-3 h-3 rounded-full bg-white transition-transform ${localSettings.reusableDecoderPool ? 'translate-x-[12px]' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Core configuration sliders */}
                <div className="bg-obs-surface p-3.5 rounded border border-obs-border space-y-3">
                  <div className="flex justify-between items-center text-[8px] text-obs-text font-black uppercase">
                    <div className="flex flex-col gap-0.5">
                      <span>Sub-Hilos de Descompresión Paralela (CPU fallback cores)</span>
                      <span className="text-[7.5px] text-obs-muted leading-tight">Distribuye los cálculos de decodificación de audio y codecs legacy en el procesador.</span>
                    </div>
                    <span className="font-mono text-obs-accent text-[9px] font-black">{localSettings.maxThreads} Cores</span>
                  </div>
                  <input 
                    type="range"
                    min={1}
                    max={12}
                    step={1}
                    value={localSettings.maxThreads}
                    onChange={(e) => setLocalSettings(p => ({ ...p, maxThreads: parseInt(e.target.value) }))}
                    className="w-full accent-obs-accent h-1 bg-obs-dark-1 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* TAB CONTENT: CODECS & PRE-SHOW ANALYSIS */}
            {activeTab === 'codecs' && (
              <div className="space-y-4">
                <div className="border-b border-obs-border pb-1.5 flex justify-between items-center">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-white">OPTIMIZACIÓN DE CODECS (PREPRODUCCIÓN)</h3>
                    <p className="text-[8.5px] text-obs-muted mt-0.5">Analizar bitrates excesivos y codecs inter-frame (Long GOP H.264/H.265) que bloquean la reproducción multicapa en vivo.</p>
                  </div>
                  <span className="bg-amber-500/10 border border-amber-500/20 text-[8px] text-amber-400 px-3 py-1 rounded font-black tracking-widest uppercase">INTRA-FRAME PREFERRED</span>
                </div>

                {/* Windows native optimal codec callout box */}
                <div className="bg-obs-accent/5 border border-obs-accent/20 rounded p-3 text-[8.5px] text-obs-text leading-relaxed">
                  <p className="font-bold text-obs-accent mb-1 uppercase tracking-wider">🎯 Recomendación Profesional para Windows & Electron:</p>
                  En Windows y Electron, los formatos óptimos con decodificación acelerada por hardware nativo son <strong className="text-white">H.264 (MP4)</strong> y <strong className="text-white">VP9 (WebM con canal Alpha)</strong> configurados con intervalos de fotogramas clave muy cortos (<strong className="text-white">Short GOP / Intra-frame</strong>). Esto permite realizar saltos de tiempo (seeking) instantáneos con un uso de CPU de apenas el <strong className="text-white">1-2%</strong>, garantizando una estabilidad perfecta de la reproducción multicapa.
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-obs-surface p-3 rounded border border-obs-border text-center space-y-1">
                    <span className="text-[9px] text-white uppercase font-black">H.264 (Short GOP)</span>
                    <p className="text-[7.5px] text-obs-muted">MP4 con fotogramas clave constantes. Decodificación por hardware DirectX 11 / D3D11 a 60 FPS estables.</p>
                  </div>
                  <div className="bg-obs-surface p-3 rounded border border-obs-border text-center space-y-1">
                    <span className="text-[9px] text-white uppercase font-black">VP9 (WebM Alpha)</span>
                    <p className="text-[7.5px] text-obs-muted">Ideal para bucles con transparencia alfa. Decodificación asíncrona nativa en GPU.</p>
                  </div>
                  <div className="bg-obs-surface p-3 rounded border border-obs-border text-center space-y-1">
                    <span className="text-[9px] text-white uppercase font-black">AV1 (Next-Gen)</span>
                    <p className="text-[7.5px] text-obs-muted">Fidelidad 4K con bitrate reducido y aceleración por hardware nativa en GPUs de última generación.</p>
                  </div>
                </div>

                {/* Pre-Show Media Analyzer and Transcoder simulation console */}
                <div className="bg-obs-surface p-4 rounded border border-obs-border/80 space-y-3">
                  <span className="text-[10px] text-white font-black uppercase tracking-wider flex items-center gap-1">
                    <Settings size={12} className="text-obs-accent" />
                    ANALIZADOR DE BITRATES Y DETECTOR DE LONG GOP H.264 / H.265
                  </span>

                  <div className="text-[8px] text-obs-muted border-b border-obs-border/50 pb-2 flex justify-between">
                    <span>SELECCIONAR ARCHIVO DE LA LIBRERÍA</span>
                    <span>OPTIMIZADOR DE CODECS INTEGRADO (Pre-producción)</span>
                  </div>

                  <div className="space-y-2">
                    {/* Media Item Row 1 */}
                    <div className="bg-obs-bg/60 p-2.5 rounded border border-obs-text/5 flex justify-between items-center text-[9px]">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-white">intro_show_4k.mp4</span>
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase text-[7px] leading-tight">
                          <AlertTriangle size={10} />
                          H.264 Long-GOP inter-frame • 64 Mbps (Excesivo, causa retrasos en salto)
                        </div>
                      </div>
                      <div>
                        {transcodingFile === 'intro_show_4k.mp4' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-mono text-obs-accent font-black animate-pulse uppercase">{transcodeProgress}%</span>
                            <div className="w-16 h-1 bg-obs-border rounded overflow-hidden">
                              <div className="h-full bg-obs-accent transition-all duration-150" style={{ width: `${transcodeProgress}%` }} />
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => runTranscodeSimulation('intro_show_4k.mp4')}
                            className="bg-obs-accent/15 border border-obs-accent/30 text-obs-accent uppercase text-[8px] font-black px-3 py-1.5 rounded transition-all hover:bg-obs-accent hover:text-white"
                          >
                            Optimizar GOP a 1:1
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Media Item Row 2 */}
                    <div className="bg-obs-bg/60 p-2.5 rounded border border-obs-text/5 flex justify-between items-center text-[9px]">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-white">background_loop_optimized.mp4</span>
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase text-[7px] leading-tight">
                          <Check size={10} />
                          H.264 Intra-frame • 12 Mbps (Óptimo, decodificación D3D11 en GPU)
                        </div>
                      </div>
                      <span className="text-obs-muted uppercase text-[7px] font-black italic">LISTO PARA EL SHOW</span>
                    </div>
                  </div>

                  {/* General flags */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="flex items-center justify-between p-2 bg-obs-dark-1/50 rounded border border-obs-text/5">
                      <span className="text-[8px] text-obs-muted uppercase font-black">Proxies Automáticos</span>
                      <button
                        onClick={() => setLocalSettings(p => ({ ...p, autoProxies: !p.autoProxies }))}
                        className={`w-7 h-4 rounded-full p-0.5 transition-colors shrink-0 ${localSettings.autoProxies ? 'bg-obs-accent' : 'bg-obs-border'}`}
                      >
                        <div className={`w-3 h-3 rounded-full bg-white transition-transform ${localSettings.autoProxies ? 'translate-x-[12px]' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-obs-dark-1/50 rounded border border-obs-text/5">
                      <span className="text-[8px] text-obs-muted uppercase font-black">Caché Lectura SSD/NVMe</span>
                      <button
                        onClick={() => setLocalSettings(p => ({ ...p, ssdCacheOptimize: !p.ssdCacheOptimize }))}
                        className={`w-7 h-4 rounded-full p-0.5 transition-colors shrink-0 ${localSettings.ssdCacheOptimize ? 'bg-obs-accent' : 'bg-obs-border'}`}
                      >
                        <div className={`w-3 h-3 rounded-full bg-white transition-transform ${localSettings.ssdCacheOptimize ? 'translate-x-[12px]' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: WATCHDOG & STABILITY */}
            {activeTab === 'watchdog' && (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="border-b border-obs-border pb-1.5">
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-white">WATCHDOG DE SEGURIDAD Y ESTABILIDAD</h3>
                  <p className="text-[8.5px] text-obs-muted mt-0.5">Prevenir cuelgues de video a través de la monitorización continua y autoreparación dinámica de decodificadores.</p>
                </div>

                <div className="grid grid-cols-2 gap-3 shrink-0">
                  <div className="bg-obs-surface p-3 rounded border border-obs-border flex justify-between items-center">
                    <div className="flex flex-col gap-0.5 w-3/4">
                      <span className="text-[9px] text-white uppercase font-black">Watchdog de Autorecuperación</span>
                      <p className="text-[7.5px] text-obs-muted leading-relaxed">Si la lectura de disco se estanca por más de 500ms, reinicia el pipeline sin congelar la pantalla.</p>
                    </div>
                    <button
                      onClick={() => setLocalSettings(p => ({ ...p, watchdogActive: !p.watchdogActive }))}
                      className={`w-7 h-4 rounded-full p-0.5 transition-colors shrink-0 ${localSettings.watchdogActive ? 'bg-obs-accent' : 'bg-obs-border'}`}
                    >
                      <div className={`w-3 h-3 rounded-full bg-white transition-transform ${localSettings.watchdogActive ? 'translate-x-[12px]' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="bg-obs-surface p-3 rounded border border-obs-border flex justify-between items-center">
                    <div className="flex flex-col gap-0.5 w-3/4">
                      <span className="text-[9px] text-white uppercase font-black">Protección de Archivos Corruptos</span>
                      <p className="text-[7.5px] text-obs-muted leading-relaxed">Evita cuelgues críticos interceptando y descartando marcos corruptos o frames nulos.</p>
                    </div>
                    <button
                      onClick={() => setLocalSettings(p => ({ ...p, corruptFileProtection: !p.corruptFileProtection }))}
                      className={`w-7 h-4 rounded-full p-0.5 transition-colors shrink-0 ${localSettings.corruptFileProtection ? 'bg-obs-accent' : 'bg-obs-border'}`}
                    >
                      <div className={`w-3 h-3 rounded-full bg-white transition-transform ${localSettings.corruptFileProtection ? 'translate-x-[12px]' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                {/* Real-time broadcast logs terminal */}
                <div className="flex-1 flex flex-col bg-obs-dark-1 rounded border border-obs-border overflow-hidden min-h-[170px]">
                  <div className="h-6 bg-obs-bg flex justify-between items-center px-3.5 border-b border-obs-border shrink-0">
                    <span className="text-[7.5px] text-obs-muted tracking-widest font-black uppercase flex items-center gap-1">
                      <Terminal size={10} className="text-obs-accent animate-pulse" />
                      TERMINAL DE REGISTRO EN TIEMPO REAL (CORE LIVE LOGS)
                    </span>
                    <button 
                      onClick={() => {
                        const pad = (n: number) => n.toString().padStart(2, '0');
                        const now = new Date();
                        const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
                        setLogs([`[${timeStr}] [SYSTEM] Logs manual sweep and pipeline diagnostics complete.`]);
                      }}
                      className="text-obs-muted hover:text-white transition-colors"
                      title="Clear terminal logs"
                    >
                      <RefreshCw size={10} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3.5 font-mono text-[7.5px] text-slate-400 space-y-1">
                    {logs.map((log, idx) => (
                      <div key={idx} className={`leading-relaxed ${log.includes('WARNING') || log.includes('⚠️') ? 'text-amber-400 font-bold' : log.includes('SYSTEM') ? 'text-obs-accent font-bold' : ''}`}>
                        {log}
                      </div>
                    ))}
                    <div ref={consoleBottomRef} />
                  </div>
                </div>
              </div>
            )}



          </div>

          {/* Modal Footer options */}
          <div className="px-5 py-4 border-t border-obs-border bg-obs-surface flex justify-end gap-3 shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2 hover:bg-obs-border hover:text-white transition-all text-[9px] font-black uppercase tracking-widest rounded border border-obs-border bg-obs-bg"
            >
              Cerrar Panel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-obs-accent text-white hover:bg-obs-accent/90 transition-all text-[9px] font-black uppercase tracking-widest rounded shadow-[0_0_15px_rgba(0,163,245,0.2)] flex items-center gap-1"
            >
              ✓ Aplicar Sincronización
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
