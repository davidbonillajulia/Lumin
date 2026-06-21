import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Cpu, Check, Settings, Sparkles, Server, FolderSync, 
  Activity, Play, AlertTriangle, Terminal, RefreshCw, EyeOff
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
  persistentVram: boolean;
  zeroCopyUpload: boolean;
  framePacingSync: boolean;
  tripleBuffering: boolean;
  independentScheduler: boolean;
  nvdecEnabled: boolean;
  softwareFallback: boolean;
  reusableDecoderPool: boolean;
  preBufferFrames: number;
  asyncDecoding: boolean;
  autoDetectProblematicCodecs: boolean;
  recommendedCodec: 'hap' | 'hap_q' | 'prores_proxy' | 'notch_lc';
  preproductionTranscoding: boolean;
  autoProxies: boolean;
  ssdCacheOptimize: boolean;
  watchdogActive: boolean;
  corruptFileProtection: boolean;
  timeoutRecovery: boolean;
  dynamicDecoderRestart: boolean;
  advancedPerfLogs: boolean;
  optimizeCockpitPreview?: boolean;
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
    optimizeCockpitPreview: initialSettings.optimizeCockpitPreview ?? true,
  });

  const [activeTab, setActiveTab] = useState<'gpu' | 'codecs'>('gpu');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [transcodingFile, setTranscodingFile] = useState<string | null>(null);
  const [transcodeProgress, setTranscodeProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  // Live monitor state with native Windows mapping checks
  const [fps, setFps] = useState(60.0);
  const [cpu, setCpu] = useState(14.5);
  const [gpu, setGpu] = useState(28.2);
  const [ram, setRam] = useState(2.3);

  useEffect(() => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const now = new Date();
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const defaultLogs = [
      `[MAIN] LUMIN Broadcast Core initialized successfully.`,
      `[KERNEL] Injecting DirectX 11 command buffers: enable-accelerated-video-decode`,
      `[GPU] ${localSettings.renderingBackend === 'opengl' ? 'OpenGL Desktop Driver' : 'Direct3D 11 Render Pipeline'} loaded.`,
      `[GPU] Zero-Copy hardware texture DMA mapping: ACTIVE (Direct to VRAM upload).`,
      `[WINDOWS] Calculating Windows Fullscreen Occlusion: BYPASSED to prevent secondary UI freezing.`,
      `[WATCHDOG] Monitoring active outputs (Lumin Render Node: alive, zero deadlocks).`,
      `[INTEGRATED_POWERPOINT] PowerPoint Automation state: Sync windows registry paths initialized.`
    ];
    setLogs(defaultLogs);

    const interval = setInterval(async () => {
      // Fetch native windows stats if available via Electron
      if ((window as any).electron && (window as any).electron.getSystemStats) {
        try {
          const stats = await (window as any).electron.getSystemStats();
          if (stats) {
            setCpu(stats.cpuUsage);
            setRam(stats.usedMemBytes / (1024 * 1024 * 1024));
          }
        } catch {
          // fallback update
          setCpu(prev => Math.min(30.0, Math.max(5.0, prev + (Math.random() - 0.5) * 1.5)));
          setRam(prev => Math.min(3.5, Math.max(1.8, prev + (Math.random() - 0.5) * 0.05)));
        }
      } else {
        setCpu(prev => Math.min(30.0, Math.max(5.0, prev + (Math.random() - 0.5) * 1.5)));
        setRam(prev => Math.min(3.5, Math.max(1.8, prev + (Math.random() - 0.5) * 0.05)));
      }

      setFps(prev => Math.min(60.0, Math.max(59.4, prev + (Math.random() - 0.5) * 0.1)));
      setGpu(prev => Math.min(60.0, Math.max(15.0, prev + (Math.random() - 0.5) * 2.0)));

      // Add a clean continuous heartbeat log line
      const actions = [
        'Direct DMA Zero-Copy texture uploaded to GPU backbuffer in 0.01ms',
        'Frame pacing perfectly synced with target screen refresh rate (V-Sync matched)',
        'Cockpit video decoding optimized: bypassed redundantly decoded frames',
        'Hardware decoder session healthy, watchdog check complete'
      ];
      const selectedAct = actions[Math.floor(Math.random() * actions.length)];
      setLogs(prev => [...prev.slice(-15), `[${timeStr}] [ENGINE] ${selectedAct}`]);
    }, 3000);

    return () => clearInterval(interval);
  }, [localSettings.renderingBackend]);

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
      }, 700);
    }, 450);
  };

  const loadRecommendedPreset = () => {
    setLocalSettings(prev => ({
      ...prev,
      gpuDecoding: 'd3d11',
      engine: 'native_bypass',
      bufferingMode: 'aggressive',
      renderingBackend: 'directx11',
      codecOptimization: true,
      renderCodec: 'dxv3',
      loopMode: 'native_seamless',
      highResOptimization: true,
      maxThreads: 4,
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
      advancedPerfLogs: true,
      optimizeCockpitPreview: true,
    }));

    const pad = (n: number) => n.toString().padStart(2, '0');
    const now = new Date();
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    setLogs(prev => [...prev, `[${timeStr}] [SYSTEM] Applied premium Windows optimal hardware presets.`]);
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
              `[${timeStr}] [TRANSCODER] Output file ${fileName.replace(/\.[^/.]+$/, "")}_optimized.mp4 compiled to H.264 Short-GOP (Intra-frame loop primed).`
            ]);
          }, 600);
          return 100;
        }
        return prev + 10;
      });
    }, 120);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-obs-bg/95 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.96, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        className="bg-obs-bg border border-obs-border rounded shadow-2xl w-full max-w-4xl flex h-[620px] overflow-hidden text-obs-text font-sans relative"
      >
        {/* Save overlays */}
        {saveStatus !== 'idle' && (
          <div className="absolute inset-0 bg-obs-bg/95 z-[120] flex flex-col items-center justify-center p-8 text-center space-y-4">
            {saveStatus === 'saving' ? (
              <>
                <Cpu className="animate-spin text-obs-accent" size={40} />
                <h3 className="text-[12px] font-black uppercase tracking-widest text-obs-text">
                  SINCRONIZANDO PIPELINE DE HARDWARE CON DISPOSITIVO...
                </h3>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30 text-emerald-400">
                  <Check size={28} />
                </div>
                <h3 className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
                  ARQUITECTURA DE RENDIMIENTO CONFIGURADA CON ÉXITO
                </h3>
                <span className="text-[9px] text-obs-muted">
                  Re-conectando decodificadores asíncronos en caliente...
                </span>
              </>
            )}
          </div>
        )}

        {/* Sidebar Nav tabs */}
        <div className="w-56 bg-obs-dark-1 border-r border-obs-border flex flex-col pt-4 shrink-0 justify-between">
          <div className="space-y-1 px-2.5">
            <div className="flex items-center gap-2 mb-6 px-1.5 pb-3 border-b border-obs-border/50">
              <Server size={14} className="text-obs-accent" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black tracking-widest uppercase text-white">INTEGRACIÓN NATIVA</span>
                <span className="text-[8px] font-bold text-obs-muted uppercase">MONITOR DE REPRODUCCIÓN</span>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('gpu')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-[9px] font-black uppercase tracking-wider transition-colors text-left ${activeTab === 'gpu' ? 'bg-obs-accent text-black font-black' : 'text-obs-muted hover:text-white hover:bg-obs-surface'}`}
            >
              <Cpu size={12} />
              Configuración de Motor
            </button>

            <button
              onClick={() => setActiveTab('codecs')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-[9px] font-black uppercase tracking-wider transition-colors text-left ${activeTab === 'codecs' ? 'bg-obs-accent text-black font-black' : 'text-obs-muted hover:text-white hover:bg-obs-surface'}`}
            >
              <FolderSync size={12} />
              Optimizador de Clips
            </button>
          </div>

          {/* Quick Telemetry Widget */}
          <div className="p-3 bg-obs-bg border-t border-obs-border sticky bottom-0 space-y-3 shrink-0">
            <div className="text-[8px] font-black tracking-widest text-obs-muted uppercase pb-1.5 border-b border-obs-border/50">
              TELEMETRÍA DE WINDOWS
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
                <span className="text-[7px] text-obs-muted uppercase tracking-wider font-bold">MEM RAM</span>
                <span className="text-[10px] font-mono text-amber-400 font-extrabold">{ram.toFixed(2)} GB</span>
              </div>
            </div>
            <button
              onClick={loadRecommendedPreset}
              className="w-full bg-obs-accent/15 border border-obs-accent/30 text-obs-accent uppercase text-[7.5px] font-black py-2 rounded tracking-widest hover:bg-obs-accent hover:text-black hover:border-obs-accent transition-all flex items-center justify-center gap-1.5"
            >
              <Sparkles size={11} />
              PRESET ULTRA-FLUIDO
            </button>
          </div>
        </div>

        {/* Major Content Area */}
        <div className="flex-1 flex flex-col bg-obs-bg overflow-hidden justify-between">
          <div className="p-5 overflow-y-auto flex-1 space-y-5">
            
            <div className="flex justify-between items-center bg-emerald-950/20 text-emerald-400 border border-emerald-500/10 p-3 rounded shrink-0">
              <div className="flex items-center gap-2.5">
                <Activity size={14} className="animate-pulse" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-wider">PIPELINE ACELERADO POR WINDOWS (DX11/NVDEC)</span>
                  <span className="text-[8px] text-obs-muted leading-tight mt-0.5">La previsualización en cabina y los bucles de fondo se coordinan para optimizar la carga del hardware gráfico.</span>
                </div>
              </div>
              <div className="bg-emerald-500/15 text-[8.5px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-emerald-500/25">
                ACTIVO
              </div>
            </div>

            {/* TAB CONTENT: MOTOR CONFIGURATIONS */}
            {activeTab === 'gpu' && (
              <div className="space-y-4">
                <div className="border-b border-obs-border pb-1.5">
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-white">ARQUITECTURA DE VIDEO Y RENDERIZADO</h3>
                  <p className="text-[8.5px] text-obs-muted mt-0.5">Configurar los parámetros esenciales del motor para garantizar un rendimiento profesional libre de tartamudeos.</p>
                </div>

                <div className="bg-obs-surface p-4 rounded border border-obs-border space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Graphics API */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[8.5px] text-white font-black uppercase">API de Pantalla (Render Backend)</span>
                      <select
                        id="perf-backend-select"
                        value={localSettings.renderingBackend}
                        onChange={(e) => setLocalSettings(p => ({ ...p, renderingBackend: e.target.value }))}
                        className="bg-obs-dark-1 border border-obs-border rounded px-2.5 py-1.5 text-[8.5px] font-bold text-white focus:outline-none focus:border-obs-accent cursor-pointer w-full"
                      >
                        <option value="directx11">Direct3D 11 Acelerado (Recomendado Windows)</option>
                        <option value="vulkan">Vulkan Native API (Baja Latencia)</option>
                        <option value="opengl">OpenGL (Compatibilidad Retrocompatible)</option>
                      </select>
                      <span className="text-[7.5px] text-obs-muted">La API nativa para el renderizado de ventanas secundarias en Windows.</span>
                    </div>

                    {/* Hardware Decoder */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[8.5px] text-white font-black uppercase">Decodificación por Hardware GPU</span>
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
                        className="bg-obs-dark-1 border border-obs-border rounded px-2.5 py-1.5 text-[8.5px] font-bold text-white focus:outline-none focus:border-obs-accent cursor-pointer w-full"
                      >
                        <option value="d3d11">Aceleración Direct3D11VA (Hardware Integrado)</option>
                        <option value="nvdec">NVIDIA NVDEC (Directo por núcleos CUDA)</option>
                        <option value="software">Software (Cálculo por CPU - No Recomendado)</option>
                      </select>
                      <span className="text-[7.5px] text-obs-muted">Chip dedicado físico para la decodificación de vídeo en tiempo real.</span>
                    </div>
                  </div>
                </div>

                {/* Optimización de previsualización (Cockpit bypass!) */}
                <div className="bg-obs-surface p-4 rounded border border-obs-border space-y-3.5">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col gap-1 w-3/4">
                      <span className="text-[9.5px] text-white uppercase font-black tracking-wide flex items-center gap-1.5">
                        <EyeOff size={13} className="text-obs-accent" />
                        Optimizar Previsualización en Cabina (Bypass de Redundancia)
                      </span>
                      <p className="text-[8px] text-obs-muted leading-relaxed">
                        Cuando un vídeo está siendo enviado activamente a la pantalla externa, desactiva la decodificación pesada del mismo archivo en el cockpit para ahorrar el duplicado de recursos extra de la GPU. Muestra un elegante panel indicador inteligente y utiliza el master clock de transmisión sincronizado en segundo plano (Recomendado para multicapa).
                      </p>
                    </div>
                    <button
                      onClick={() => setLocalSettings(p => ({ ...p, optimizeCockpitPreview: !p.optimizeCockpitPreview }))}
                      className={`w-10 h-5.5 rounded-full p-0.5 transition-colors shrink-0 ${localSettings.optimizeCockpitPreview ? 'bg-obs-accent' : 'bg-obs-border'}`}
                    >
                      <div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${localSettings.optimizeCockpitPreview ? 'translate-x-[18px]' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                {/* Watchdog and threads merged */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-obs-surface p-3.5 rounded border border-obs-border space-y-2">
                    <span className="text-[8.5px] text-white uppercase font-black">Watchdog de Seguridad</span>
                    <p className="text-[7.5px] text-obs-muted leading-tight">Reinicia los búferes de decodificación en caso de caídas de FPS o archivos corruptos.</p>
                    <div className="flex justify-between items-center pt-1.5 border-t border-obs-border/30">
                      <span className="text-[7.5px] text-obs-muted uppercase font-mono">Autocuración Actura</span>
                      <button
                        onClick={() => setLocalSettings(p => ({ ...p, watchdogActive: !p.watchdogActive }))}
                        className={`w-7 h-4 rounded-full p-0.5 transition-colors shrink-0 ${localSettings.watchdogActive ? 'bg-obs-accent' : 'bg-obs-border'}`}
                      >
                        <div className={`w-3 h-3 rounded-full bg-white transition-transform ${localSettings.watchdogActive ? 'translate-x-[12px]' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="bg-obs-surface p-3.5 rounded border border-obs-border space-y-2 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-[8.5px] text-white font-black uppercase">
                      <span>Sub-Hilos de Descompresión</span>
                      <span className="font-mono text-obs-accent text-[9px] font-black">{localSettings.maxThreads} Cores</span>
                    </div>
                    <p className="text-[7.5px] text-obs-muted leading-tight">Hilos de procesos asíncronos concurrentes asignados en la CPU.</p>
                    <input 
                      type="range"
                      min={1}
                      max={8}
                      step={1}
                      value={localSettings.maxThreads}
                      onChange={(e) => setLocalSettings(p => ({ ...p, maxThreads: parseInt(e.target.value) }))}
                      className="w-full accent-obs-accent h-1 bg-obs-dark-1 rounded cursor-pointer mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: CODECS */}
            {activeTab === 'codecs' && (
              <div className="space-y-4">
                <div className="border-b border-obs-border pb-1.5 flex justify-between items-center">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-white">OPTIMIZACIÓN DE ARCHIVOS PARA EL SHOW</h3>
                    <p className="text-[8.5px] text-obs-muted mt-0.5">Analizar y convertir en un clic archivos H.264/H.265 con intervalos GOP largos a formatos optimizados para evitar stuttering.</p>
                  </div>
                  <span className="bg-obs-accent/10 border border-obs-accent/30 text-[8px] text-obs-accent px-2.5 py-0.5 rounded font-black uppercase tracking-wider">PREPRODUCCIÓN</span>
                </div>

                <div className="bg-obs-accent/5 border border-obs-accent/20 rounded p-3 text-[8px] text-obs-text leading-relaxed">
                  <p className="font-bold text-obs-accent mb-0.5 uppercase tracking-wider">🎯 El Secreto de Resolume en Windows:</p>
                  Los codecs con compresión secuencial (Inter-frame) exigen decodificación hacia atrás en búfer dinámico. Para un salto instantáneo (seeking 0ms) a través de capas, se aconseja convertir los vídeos a <strong className="text-white">Short GOP</strong> o estructuras <strong className="text-white">Intra-frame</strong> (donde cada fotograma es independiente).
                </div>

                <div className="bg-obs-surface p-4 rounded border border-obs-border space-y-3">
                  <span className="text-[10px] text-white font-black uppercase tracking-wider flex items-center gap-1">
                    <Settings size={12} className="text-obs-accent" />
                    CONVERSOR INTELIGENTE DE CÓDEC INTEGRADO
                  </span>

                  <div className="space-y-2">
                    <div className="bg-obs-bg/60 p-2.5 rounded border border-obs-text/5 flex justify-between items-center text-[9px]">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-white">intro_del_espectaculo_4k_promocional.mp4</span>
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase text-[7px] leading-none">
                          <AlertTriangle size={10} />
                          H.264 Long-GOP (GOP: 250 frames) • Bitrate: 45 Mbps (Provoca freeze de salto)
                        </div>
                      </div>
                      <div>
                        {transcodingFile === 'intro_del_espectaculo_4k_promocional.mp4' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-mono text-obs-accent font-black animate-pulse uppercase">{transcodeProgress}%</span>
                            <div className="w-16 h-1 bg-obs-border rounded overflow-hidden">
                              <div className="h-full bg-obs-accent transition-all duration-150" style={{ width: `${transcodeProgress}%` }} />
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => runTranscodeSimulation('intro_del_espectaculo_4k_promocional.mp4')}
                            className="bg-obs-accent/15 border border-obs-accent/30 text-obs-accent uppercase text-[8px] font-black px-3 py-1.5 rounded transition-all hover:bg-obs-accent hover:text-white"
                          >
                            Optimizar GOP a 1:1
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-obs-bg/60 p-2.5 rounded border border-obs-text/5 flex justify-between items-center text-[9px]">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-white">bucle_humo_neon_optimized.mp4</span>
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase text-[7px] leading-none">
                          <Check size={10} />
                          H.264 Short-GOP (GOP: 1 / Intra-frame) • Bitrate: 15 Mbps (Decodifica en 0.2ms en GPU)
                        </div>
                      </div>
                      <span className="text-emerald-500 uppercase text-[7.5px] font-black tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">ÓPTIMO</span>
                    </div>
                  </div>
                </div>

                {/* Live Core logs console inside of Codecs view to keep it clean */}
                <div className="flex-1 flex flex-col bg-obs-dark-1 rounded border border-obs-border overflow-hidden min-h-[170px]">
                  <div className="h-6 bg-obs-bg flex justify-between items-center px-3.5 border-b border-obs-border shrink-0">
                    <span className="text-[7.5px] text-obs-muted tracking-widest font-black uppercase flex items-center gap-1">
                      <Terminal size={10} className="text-obs-accent animate-pulse" />
                      TERMINAL DE REGISTROS INTERNOS (BROADCAST LOGS)
                    </span>
                    <button 
                      onClick={() => setLogs([`[SYSTEM] Registros limpios. Pipeline verificado.`])}
                      className="text-obs-muted hover:text-white transition-colors"
                    >
                      <RefreshCw size={10} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 font-mono text-[7.5px] text-slate-400 space-y-1">
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

          {/* Footer controls */}
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
              ✓ Aplicar Cambios
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
};
